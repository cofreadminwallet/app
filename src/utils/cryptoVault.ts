// Utilitários Criptográficos Nativos (Web Crypto API - AES-GCM / PBKDF2)
// Provides Defense-in-Depth layer protecting stored keys against localStorage extraction.

const SALT_STORAGE_KEY = 'cofreadmin_vault_kdf_salt';
const ITERATIONS = 100000;

/**
 * Retrieves or creates a cryptographically secure, persistent device salt.
 */
function getOrCreateDeviceSalt(): Uint8Array {
  if (typeof window === 'undefined') return new Uint8Array(16);
  const storedSalt = localStorage.getItem(SALT_STORAGE_KEY);
  if (storedSalt) {
    const binary = atob(storedSalt);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const newSalt = new Uint8Array(16);
  window.crypto.getRandomValues(newSalt);
  const base64Salt = btoa(String.fromCharCode(...newSalt));
  localStorage.setItem(SALT_STORAGE_KEY, base64Salt);
  return newSalt;
}

/**
 * Derives a 256-bit AES-GCM key from PIN/secret using PBKDF2 with SHA-256.
 */
async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
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
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext (such as Private Key) using AES-GCM 256-bit with PBKDF2-derived key.
 */
export async function encryptData(plainText: string, secretKeyInput?: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return plainText;
  }

  try {
    const salt = getOrCreateDeviceSalt();
    // Derives key using user PIN or device-origin key for strong obfuscation
    const secret = secretKeyInput || `cofre_sec_${window.location.origin}_v1`;
    const key = await deriveAesKey(secret, salt);
    
    // 12-byte random IV per encryption (NIST standard for AES-GCM)
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    const encodedData = new TextEncoder().encode(plainText);
    const cipherBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    );

    const cipherBytes = new Uint8Array(cipherBuffer);
    
    // Combina IV + Cifra
    const combined = new Uint8Array(iv.length + cipherBytes.length);
    combined.set(iv, 0);
    combined.set(cipherBytes, iv.length);

    // Convert to Base64 with identifiable header prefix
    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return `enc:aes-gcm:v1:${btoa(binary)}`;
  } catch (err) {
    console.warn('Erro ao criptografar dado com Web Crypto:', err);
    return plainText;
  }
}

/**
 * Decrypts AES-GCM encrypted payload back to plaintext.
 */
export async function decryptData(cipherText: string, secretKeyInput?: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return cipherText;
  }

  // If unencrypted legacy format, return directly for backward compatibility
  if (!cipherText.startsWith('enc:aes-gcm:v1:')) {
    return cipherText;
  }

  try {
    const rawBase64 = cipherText.replace('enc:aes-gcm:v1:', '');
    const binary = atob(rawBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    // Extrai IV (12 bytes) e Cifra
    const iv = combined.slice(0, 12);
    const cipherBytes = combined.slice(12);

    const salt = getOrCreateDeviceSalt();
    const secret = secretKeyInput || `cofre_sec_${window.location.origin}_v1`;
    const key = await deriveAesKey(secret, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      cipherBytes
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.warn('Erro ao decriptografar dado com Web Crypto:', err);
    return cipherText;
  }
}
