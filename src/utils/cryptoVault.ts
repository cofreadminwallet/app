// Native Cryptographic Utilities (Web Crypto API - AES-GCM 256-bit / PBKDF2)
// Encryption-at-Rest protection for private keys against localStorage extraction

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12;

// Strictly kept in-memory during active session (NEVER written to localStorage)
let inMemorySessionPassphrase: string | null = null;

export function setSessionPassphrase(passphrase: string): void {
  inMemorySessionPassphrase = passphrase.trim();
}

export function getSessionPassphrase(): string | null {
  return inMemorySessionPassphrase;
}

export function clearSessionPassphrase(): void {
  inMemorySessionPassphrase = null;
}

export function hasSessionPassphrase(): boolean {
  return Boolean(inMemorySessionPassphrase && inMemorySessionPassphrase.length > 0);
}

const IDB_DB_NAME = 'cofreadmin_keystore_db';
const IDB_STORE_NAME = 'keystore';
const IDB_MASTER_KEY_ID = 'master_aes_gcm_256_v3';

let cachedDeviceCryptoKey: CryptoKey | null = null;

/**
 * Retrieves or generates a NON-EXTRACTABLE (extractable: false) AES-GCM 256-bit CryptoKey
 * persisted within browser's secure IndexedDB.
 * - Survives page reloads (F5) and browser restarts on the same device.
 * - Impossible to export raw key bytes via exportKey() (protected by native WebCrypto engine).
 * - Never stores plaintext secrets in localStorage.
 */
async function getOrCreateDeviceCryptoKey(): Promise<CryptoKey> {
  if (cachedDeviceCryptoKey) {
    return cachedDeviceCryptoKey;
  }

  if (typeof window === 'undefined' || !window.crypto?.subtle || !window.indexedDB) {
    throw new Error('Ambiente seguro (Web Crypto API / IndexedDB) indisponível neste navegador.');
  }

  return new Promise<CryptoKey>((resolve, reject) => {
    const request = window.indexedDB.open(IDB_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };

    request.onerror = () => {
      reject(new Error('Falha ao acessar o cofre criptográfico IndexedDB do navegador.'));
    };

    request.onsuccess = () => {
      const db = request.result;
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = tx.objectStore(IDB_STORE_NAME);
        const getReq = store.get(IDB_MASTER_KEY_ID);

        getReq.onsuccess = async () => {
          const existingKey = getReq.result as CryptoKey | undefined;
          if (existingKey && typeof existingKey === 'object' && 'type' in existingKey) {
            cachedDeviceCryptoKey = existingKey;
            db.close();
            resolve(existingKey);
            return;
          }

          try {
            // Generates AES-GCM 256-bit key with extractable = false (browser-shielded)
            const newKey = await window.crypto.subtle.generateKey(
              { name: 'AES-GCM', length: 256 },
              false, // NON-EXTRACTABLE
              ['encrypt', 'decrypt']
            );

            const writeTx = db.transaction(IDB_STORE_NAME, 'readwrite');
            const writeStore = writeTx.objectStore(IDB_STORE_NAME);
            writeStore.put(newKey, IDB_MASTER_KEY_ID);

            writeTx.oncomplete = () => {
              cachedDeviceCryptoKey = newKey;
              db.close();
              resolve(newKey);
            };

            writeTx.onerror = () => {
              db.close();
              reject(new Error('Não foi possível persistir a chave mestra no IndexedDB.'));
            };
          } catch (genErr) {
            db.close();
            reject(genErr);
          }
        };

        getReq.onerror = () => {
          db.close();
          reject(new Error('Erro ao ler chave mestra do IndexedDB.'));
        };
      } catch (txErr) {
        db.close();
        reject(txErr);
      }
    };
  });
}

/**
 * Derives a 256-bit AES-GCM cryptographic key from a passphrase and salt using PBKDF2 with SHA-256.
 */
async function deriveAesGcmKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext (e.g., Private Key or Mnemonic) using AES-GCM 256-bit:
 * - If passphrase is provided (customPassphrase or session): uses PBKDF2 100k iterations -> enc:aes-gcm:v2:<base64(salt[16] + iv[12] + ciphertext)>
 * - If no manual passphrase set: uses non-extractable IndexedDB CryptoKey -> enc:aes-gcm:idb:v3:<base64(iv[12] + ciphertext)>
 * If encryption fails, THROWS ERROR and NEVER returns or saves plaintext.
 */
export async function encryptData(plainText: string, customPassphrase?: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Ambiente de criptografia seguro (Web Crypto API) indisponível. Operação bloqueada.');
  }

  const passphrase = (customPassphrase || inMemorySessionPassphrase || '').trim();

  try {
    // MODE A: Explicit user passphrase protection (PBKDF2 + AES-GCM v2)
    if (passphrase) {
      const salt = new Uint8Array(SALT_LENGTH_BYTES);
      window.crypto.getRandomValues(salt);

      const key = await deriveAesGcmKey(passphrase, salt);

      const iv = new Uint8Array(IV_LENGTH_BYTES);
      window.crypto.getRandomValues(iv);

      const encodedData = new TextEncoder().encode(plainText);
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      const cipherBytes = new Uint8Array(cipherBuffer);
      const combined = new Uint8Array(salt.length + iv.length + cipherBytes.length);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(cipherBytes, salt.length + iv.length);

      let binary = '';
      for (let i = 0; i < combined.length; i++) {
        binary += String.fromCharCode(combined[i]);
      }
      return `enc:aes-gcm:v2:${btoa(binary)}`;
    }

    // MODE B: Default protection with non-extractable IndexedDB CryptoKey (AES-GCM idb:v3)
    const deviceKey = await getOrCreateDeviceCryptoKey();
    const iv = new Uint8Array(IV_LENGTH_BYTES);
    window.crypto.getRandomValues(iv);

    const encodedData = new TextEncoder().encode(plainText);
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      deviceKey,
      encodedData
    );

    const cipherBytes = new Uint8Array(cipherBuffer);
    const combined = new Uint8Array(iv.length + cipherBytes.length);
    combined.set(iv, 0);
    combined.set(cipherBytes, iv.length);

    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return `enc:aes-gcm:idb:v3:${btoa(binary)}`;
  } catch (err: any) {
    // ABSOLUTE SECURITY RULE: If encryption fails, NEVER return plaintext.
    throw new Error(err?.message || 'Falha na criptografia: a chave não pode ser salva desprotegida.');
  }
}

export const CURRENT_VAULT_ENVELOPE_VERSION = 'v3' as const;

/**
 * Checks whether an encrypted payload requires upgrade for a future vault generation
 */
export function needsVaultEnvelopeUpgrade(cipherText: string, hasCustomPassphrase = false): boolean {
  if (!cipherText) return false;
  if (!cipherText.startsWith('enc:aes-gcm:')) return true;
  if (hasCustomPassphrase) {
    return !cipherText.startsWith('enc:aes-gcm:v2:');
  }
  return !cipherText.startsWith(`enc:aes-gcm:idb:${CURRENT_VAULT_ENVELOPE_VERSION}:`) && !cipherText.startsWith('enc:aes-gcm:v2:');
}

/**
 * Decrypts AES-GCM envelope back to plaintext.
 * Supports versioned envelopes for future cryptographic standard migrations:
 * - enc:aes-gcm:idb:v3: (Non-extractable CryptoKey in IndexedDB)
 * - enc:aes-gcm:v2: (PBKDF2 with embedded 16-byte Salt)
 */
export async function decryptData(cipherText: string, customPassphrase?: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto API indisponível.');
  }

  if (!cipherText || !cipherText.startsWith('enc:aes-gcm:')) {
    throw new Error('Formato de chave inválido: exigido envelope criptografado AES-GCM.');
  }

  const passphrase = (customPassphrase || inMemorySessionPassphrase || '').trim();

  // Format v3: Non-extractable CryptoKey in IndexedDB (persists after reload without exposing secrets in localStorage)
  if (cipherText.startsWith('enc:aes-gcm:idb:v3:')) {
    const rawBase64 = cipherText.replace('enc:aes-gcm:idb:v3:', '');
    const binary = atob(rawBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    if (combined.length < IV_LENGTH_BYTES) {
      throw new Error('Payload criptografado v3 corrompido ou incompleto.');
    }

    const iv = combined.slice(0, IV_LENGTH_BYTES);
    const cipherBytes = combined.slice(IV_LENGTH_BYTES);
    const deviceKey = await getOrCreateDeviceCryptoKey();

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      deviceKey,
      cipherBytes
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  // Format v2: PBKDF2 with embedded random Salt
  if (cipherText.startsWith('enc:aes-gcm:v2:')) {
    if (!passphrase) {
      throw new Error('Senha de segurança do usuário necessária para decriptografar a carteira.');
    }

    const rawBase64 = cipherText.replace('enc:aes-gcm:v2:', '');
    const binary = atob(rawBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    if (combined.length < SALT_LENGTH_BYTES + IV_LENGTH_BYTES) {
      throw new Error('Payload criptografado corrompido ou incompleto.');
    }

    const salt = combined.slice(0, SALT_LENGTH_BYTES);
    const iv = combined.slice(SALT_LENGTH_BYTES, SALT_LENGTH_BYTES + IV_LENGTH_BYTES);
    const cipherBytes = combined.slice(SALT_LENGTH_BYTES + IV_LENGTH_BYTES);

    const key = await deriveAesGcmKey(passphrase, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      cipherBytes
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  throw new Error('Versão de envelope criptográfico não reconhecida.');
}

/**
 * Creates a secure salted hash for user password/PIN validation
 */
export async function hashSecurityPin(pinOrPassword: string, customSalt?: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  let saltBytes: Uint8Array;

  if (customSalt) {
    const binary = atob(customSalt);
    saltBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) saltBytes[i] = binary.charCodeAt(i);
  } else {
    saltBytes = new Uint8Array(16);
    window.crypto.getRandomValues(saltBytes);
  }

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pinOrPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  const salt = btoa(String.fromCharCode(...saltBytes));

  return { hash, salt };
}

/**
 * Constant-time string comparison to prevent side-channel timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || a.length === 0) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validates whether the provided password/PIN matches the stored hash using constant-time comparison
 */
export async function verifySecurityPin(pinOrPassword: string, expectedHash: string, salt: string): Promise<boolean> {
  try {
    const { hash } = await hashSecurityPin(pinOrPassword, salt);
    return constantTimeEqual(hash, expectedHash);
  } catch {
    return false;
  }
}
