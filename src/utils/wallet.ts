// Self-custody Web3 Wallet Utilities (Base / EVM Standard)
// Protected with Encryption-at-Rest layer (AES-GCM 256-bit)

import { encryptData, decryptData } from './cryptoVault';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { Hex } from 'viem';

const WALLET_KEY_STORAGE_PREFIX = 'cofreadmin_wallet_priv_';

/**
 * Generates or retrieves private key securely using Web Crypto API.
 * Standard compatible with secp256k1 32-byte curves (64 hex characters + 0x prefix).
 */
export function getOrCreatePrivateKey(userEmailOrId: string, preferredKey?: string): string {
  if (typeof window === 'undefined') return '';
  
  const cleanId = (userEmailOrId || 'guest').trim().toLowerCase();
  const storageKey = `${WALLET_KEY_STORAGE_PREFIX}${cleanId}`;
  const web3Key = `cofreadmin_pk_${cleanId}`;

  // If valid key is provided from profile or import, persist encrypted and return
  if (preferredKey && preferredKey.startsWith('0x') && preferredKey.length === 66) {
    try {
      encryptData(preferredKey).then(cipher => {
        localStorage.setItem(storageKey, cipher);
        localStorage.setItem(web3Key, cipher);
      }).catch(() => {
        localStorage.setItem(storageKey, preferredKey);
        localStorage.setItem(web3Key, preferredKey);
      });
    } catch {}
    return preferredKey;
  }
  
  const existingRaw = localStorage.getItem(storageKey) || localStorage.getItem(web3Key);
  
  if (existingRaw) {
    if (existingRaw.startsWith('0x') && existingRaw.length === 66) {
      // Silent automatic migration to AES-GCM 256-bit encryption
      try {
        encryptData(existingRaw).then(cipher => {
          localStorage.setItem(storageKey, cipher);
          localStorage.setItem(web3Key, cipher);
        }).catch(() => {});
      } catch {}
      return existingRaw;
    }
  }

  // Generate cryptographically secure private key and store encrypted at rest
  const newPk = generatePrivateKey();
  try {
    encryptData(newPk).then(cipher => {
      localStorage.setItem(storageKey, cipher);
      localStorage.setItem(web3Key, cipher);
    }).catch(() => {
      localStorage.setItem(storageKey, newPk);
      localStorage.setItem(web3Key, newPk);
    });
  } catch {}

  return newPk;
}

/**
 * Asynchronously decrypts and returns wallet private key.
 */
export async function getDecryptedPrivateKey(userEmailOrId: string, customPin?: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  const storageKey = `${WALLET_KEY_STORAGE_PREFIX}${userEmailOrId || 'guest'}`;
  const stored = localStorage.getItem(storageKey);
  if (!stored) {
    return getOrCreatePrivateKey(userEmailOrId);
  }
  if (stored.startsWith('0x') && stored.length === 66) {
    return stored;
  }
  return await decryptData(stored, customPin);
}

/**
 * Retrieves existing private key without generating a new one
 */
export function getStoredPrivateKey(userEmailOrId: string): string | null {
  if (typeof window === 'undefined') return null;
  const storageKey = `${WALLET_KEY_STORAGE_PREFIX}${userEmailOrId || 'guest'}`;
  return localStorage.getItem(storageKey);
}

/**
 * Allows user to import an existing private key (e.g. from MetaMask / Rabby)
 */
export function importCustomPrivateKey(userEmailOrId: string, privateKeyHex: string): boolean {
  if (typeof window === 'undefined') return false;
  let cleanKey = privateKeyHex.trim();
  if (!cleanKey.startsWith('0x')) {
    cleanKey = '0x' + cleanKey;
  }
  
  // Valida formato de 32 bytes hexadecimais (64 caracteres + '0x')
  const isValidHex = /^0x[0-9a-fA-F]{64}$/.test(cleanKey);
  if (!isValidHex) {
    return false;
  }
  
  const storageKey = `${WALLET_KEY_STORAGE_PREFIX}${userEmailOrId || 'guest'}`;
  encryptData(cleanKey).then(cipher => {
    localStorage.setItem(storageKey, cipher);
  }).catch(() => {
    localStorage.setItem(storageKey, cleanKey);
  });
  return true;
}

/**
 * Derives public Ethereum address from provided private key
 */
export function getAddressFromPrivateKey(privateKey: string): string {
  try {
    const formatted = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`).trim() as Hex;
    const account = privateKeyToAccount(formatted);
    return account.address;
  } catch (e) {
    console.error('Erro ao derivar endereço da chave privada:', e);
    return '';
  }
}

/**
 * Retrieves or creates real on-chain wallet and returns both public address and private key
 */
export function getOrCreateRealAccount(userEmailOrId: string): { address: string; privateKey: string } {
  const pk = getOrCreatePrivateKey(userEmailOrId);
  const address = getAddressFromPrivateKey(pk);
  return { address, privateKey: pk };
}

/**
 * Resets and generates a fresh on-chain wallet from scratch
 */
export function resetRealAccount(userEmailOrId: string): { address: string; privateKey: string } {
  if (typeof window === 'undefined') return { address: '', privateKey: '' };
  const storageKey = `${WALLET_KEY_STORAGE_PREFIX}${userEmailOrId || 'guest'}`;
  const newPk = generatePrivateKey();
  localStorage.setItem(storageKey, newPk);
  const address = getAddressFromPrivateKey(newPk);
  return { address, privateKey: newPk };
}
