// Self-custodial Web3 Wallet Utilities (Base / EVM Standard)
// Protected with Encryption-at-Rest layer (AES-GCM 256-bit with PBKDF2)
// Storage persisted exclusively through the Service Layer (`db` in `src/services/index.ts`)

import { encryptData, decryptData, getSessionPassphrase } from './cryptoVault';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { Hex } from 'viem';
import { db } from '../services';

/**
 * Returns the isolated primary storage key for the user
 */
function getStorageKey(userEmailOrId: string): string {
  if (!userEmailOrId) {
    throw new Error('Invalid user identifier for wallet access.');
  }
  const cleanId = userEmailOrId.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `cofreadmin_pk_${cleanId}`;
}

/**
 * Returns all candidate storage keys for a user identifier or email
 */
function getCandidateStorageKeys(userEmailOrId: string): string[] {
  if (!userEmailOrId) return [];
  const raw = userEmailOrId.trim().toLowerCase();
  const sanitized = raw.replace(/[^a-zA-Z0-9_-]/g, '_');
  const candidates = new Set<string>([
    `cofreadmin_pk_${sanitized}`,
    `cofreadmin_pk_google_${sanitized}`,
    `cofreadmin_pk_user_${sanitized}`,
    `cofreadmin_pk_${raw}`,
  ]);
  return Array.from(candidates);
}

/**
 * Retrieves or generates a cryptographically secure random private key.
 * NEVER uses a deterministic seed or default fallback key.
 */
export async function getOrCreatePrivateKey(
  userEmailOrId: string,
  preferredKey?: string,
  customPassphrase?: string
): Promise<string> {
  if (typeof window === 'undefined') return '';
  if (!userEmailOrId) {
    throw new Error('Missing user identity. Operation blocked.');
  }

  const storageKey = getStorageKey(userEmailOrId);
  const passphrase = customPassphrase || getSessionPassphrase() || undefined;

  // If a valid key is provided (e.g., import or backup), save encrypted and return
  if (preferredKey && preferredKey.startsWith('0x') && preferredKey.length === 66) {
    const cipher = await encryptData(preferredKey, passphrase);
    await db.saveWalletKeyCipher(storageKey, cipher);
    return preferredKey;
  }

  let existingRaw: string | null = null;
  for (const key of getCandidateStorageKeys(userEmailOrId)) {
    const val = await db.getWalletKeyCipher(key);
    if (val) {
      existingRaw = val;
      break;
    }
  }

  if (existingRaw) {
    if (existingRaw.startsWith('enc:aes-gcm:')) {
      try {
        return await decryptData(existingRaw, passphrase);
      } catch {
        // Locked by passphrase: NEVER generate a new key or overwrite
        return '';
      }
    }
    if (existingRaw.startsWith('0x') && existingRaw.length === 66) {
      try {
        const cipher = await encryptData(existingRaw, passphrase);
        await db.saveWalletKeyCipher(storageKey, cipher);
      } catch {}
      return existingRaw;
    }
    return '';
  }

  // Generates cryptographically secure key with system entropy and protects with IndexedDB CryptoKey or passphrase
  const newPk = generatePrivateKey();
  const cipher = await encryptData(newPk, passphrase);
  await db.saveWalletKeyCipher(storageKey, cipher);

  return newPk;
}

/**
 * Decrypts and returns the wallet private key using the IndexedDB vault or user passphrase
 */
export async function getDecryptedPrivateKey(
  userEmailOrId: string,
  customPassphrase?: string
): Promise<string> {
  if (typeof window === 'undefined' || !userEmailOrId) return '';
  let stored: string | null = null;
  for (const key of getCandidateStorageKeys(userEmailOrId)) {
    const val = await db.getWalletKeyCipher(key);
    if (val) {
      stored = val;
      break;
    }
  }
  if (!stored) {
    return '';
  }
  if (stored.startsWith('0x') && stored.length === 66) {
    return stored;
  }
  try {
    return await decryptData(stored, customPassphrase);
  } catch {
    return '';
  }
}

/**
 * Returns the encrypted cipher payload of the stored key
 */
export function getStoredPrivateKeyPayload(userEmailOrId: string): string | null {
  if (typeof window === 'undefined' || !userEmailOrId) return null;
  for (const key of getCandidateStorageKeys(userEmailOrId)) {
    const val = db.getWalletKeyCipherSync(key);
    if (val) return val;
  }
  return null;
}

/**
 * Allows the user to import an existing external private key
 */
export async function importCustomPrivateKey(
  userEmailOrId: string,
  privateKeyHex: string,
  customPassphrase?: string
): Promise<boolean> {
  if (typeof window === 'undefined' || !userEmailOrId) return false;
  let cleanKey = privateKeyHex.trim();
  if (!cleanKey.startsWith('0x')) {
    cleanKey = '0x' + cleanKey;
  }

  const isValidHex = /^0x[0-9a-fA-F]{64}$/.test(cleanKey);
  if (!isValidHex) {
    return false;
  }

  const storageKey = getStorageKey(userEmailOrId);
  const cipher = await encryptData(cleanKey, customPassphrase);
  await db.saveWalletKeyCipher(storageKey, cipher);
  return true;
}

/**
 * Derives the Ethereum public address from the private key
 */
export function getAddressFromPrivateKey(privateKey: string): string {
  try {
    if (!privateKey || !privateKey.startsWith('0x') || privateKey.length !== 66) {
      return '';
    }
    const formatted = privateKey.trim() as Hex;
    const account = privateKeyToAccount(formatted);
    return account.address;
  } catch {
    return '';
  }
}

/**
 * Resets and generates a new random wallet from scratch
 */
export async function resetRealAccount(
  userEmailOrId: string,
  customPassphrase?: string
): Promise<{ address: string; privateKey: string }> {
  if (typeof window === 'undefined' || !userEmailOrId) return { address: '', privateKey: '' };
  const storageKey = getStorageKey(userEmailOrId);
  const newPk = generatePrivateKey();
  const cipher = await encryptData(newPk, customPassphrase);
  await db.saveWalletKeyCipher(storageKey, cipher);
  const address = getAddressFromPrivateKey(newPk);
  return { address, privateKey: newPk };
}
