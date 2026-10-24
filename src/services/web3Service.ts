import { createPublicClient, http, formatUnits, parseUnits, parseAbi, isAddress, Hex, toHex } from 'viem';
import { privateKeyToAccount, generateMnemonic, mnemonicToAccount, english } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { PaymasterService, Eip3009Authorization } from './paymasterService';
import { encryptData, decryptData, setSessionPassphrase, getSessionPassphrase, needsVaultEnvelopeUpgrade } from '../utils/cryptoVault';

// Current generation of self-custodial HD wallet standard (BIP-39 12-words + AES-GCM idb:v3 / v2)
// If a future version (e.g. v4+) introduces a new cryptographic or derivation standard,
// incrementing CURRENT_WALLET_GENERATION triggers the automatic rotation and sweep engine.
export const CURRENT_WALLET_GENERATION = 3;

export interface PendingWalletMigration {
  previousAddress: string;
  previousPrivateKey: Hex;
  usdcBalance: number;
  ethBalance: number;
  targetGeneration: number;
}

// Official Native Circle USDC contract addresses on BASE
export const BASE_USDC_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
export const BASE_USDC_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

// 100% Free, official, public RPC endpoints directly from Base
export const BASE_PUBLIC_RPC = 'https://mainnet.base.org';
export const BASE_SEPOLIA_PUBLIC_RPC = 'https://sepolia.base.org';

// Strict fixed list of authorized infrastructure addresses on client (Paymaster spoofing protection)
export const ALLOWED_DEV_FEE_RECIPIENTS: readonly string[] = [
  '0xD4875cCF87Efb7DDD8dF7787aE4094d5CD2C71De'.toLowerCase(),
];

export const ALLOWED_RELAYERS: readonly string[] = [
  '0x31b7BafB5Bf4ab3D892610Ae7C9cA45BdBc45233'.toLowerCase(),
];

// Strict maximum limits accepted by client before signing any EIP-3009 authorization
export const MAX_ALLOWED_GAS_FEE_USDC = 0.10; // Relayer gas fee ceiling of $0.10 USDC
export const MAX_PROTOCOL_FEE_PERCENT = 0.002; // 0.2%
export const MIN_PROTOCOL_FEE_USD = 0.05;      // $0.05 minimum

// Standard ERC-20 ABI
export const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

export type Web3Network = 'base' | 'base-sepolia';

export interface WalletBalances {
  usdc: number;
  eth: number;
  totalUsd: number;
  formattedUsdc: string;
  formattedEth: string;
}

export interface SyncedOnChainTx {
  txHash: string;
  timestamp: string;
  blockNumber?: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  tokenSymbol: string;
  type: 'receive' | 'send';
  gasFee?: number;
  network: Web3Network;
  status: 'confirmed' | 'pending' | 'failed';
  contractAddress?: string;
  tokenName?: string;
}

export interface ConnectWalletResult {
  address: string;
  privateKey: string;
  isSmartWallet: boolean;
  isNewlyCreated?: boolean;
  mnemonic?: string;
  isLocked?: boolean;
  needsMigration?: boolean;
}

export class Web3Service {
  /**
   * Returns a lightweight, zero-cost public viem client for the selected Base network
   */
  public static getPublicClient(network: Web3Network = 'base') {
    const isMainnet = network === 'base';
    return createPublicClient({
      chain: isMainnet ? base : baseSepolia,
      transport: http(isMainnet ? BASE_PUBLIC_RPC : BASE_SEPOLIA_PUBLIC_RPC, {
        batch: true,
        retryCount: 3,
        retryDelay: 1000,
      }),
    });
  }

  /**
   * Returns all candidate normalized identity keys for a user,
   * avoiding discrepancies across `google_...`, `user_...`, `authId` and `email`.
   */
  public static getIdentityCandidates(
    userEmail?: string,
    userUid?: string,
    provider?: 'google' | 'discord'
  ): string[] {
    const candidates = new Set<string>();

    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const sanitizedEmail = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Determines strict scope to prevent collisions between Google and Discord even with identical emails
    const isDiscord = provider === 'discord' || (userUid && userUid.startsWith('discord_'));
    const isGoogle = provider === 'google' || (userUid && userUid.startsWith('google_')) || (!isDiscord && Boolean(userEmail));

    if (isDiscord) {
      if (userUid) {
        candidates.add(userUid);
        if (!userUid.startsWith('discord_')) {
          candidates.add(`discord_${userUid}`);
        } else {
          candidates.add(userUid.slice('discord_'.length));
        }
      }
      if (sanitizedEmail) {
        candidates.add(`discord_${sanitizedEmail}`);
        candidates.add(sanitizedEmail);
      }
      if (cleanEmail) {
        candidates.add(`discord_${cleanEmail}`);
        candidates.add(cleanEmail);
      }
      return Array.from(candidates).filter(Boolean);
    }

    if (isGoogle) {
      if (userUid) {
        candidates.add(userUid);
        if (!userUid.startsWith('google_')) {
          candidates.add(`google_${userUid}`);
        }
      }
      if (sanitizedEmail) {
        candidates.add(`google_${sanitizedEmail}`);
        candidates.add(sanitizedEmail);
      }
      if (cleanEmail) {
        candidates.add(`google_${cleanEmail}`);
        candidates.add(cleanEmail);
      }
      return Array.from(candidates).filter(Boolean);
    }

    if (userUid) candidates.add(userUid);
    if (sanitizedEmail) candidates.add(sanitizedEmail);
    return Array.from(candidates).filter(Boolean);
  }

  /**
   * Generates a new random, cryptographically secure wallet with BIP-39 mnemonic phrase (12 words).
   * Throws an explicit error if derivation fails (no arbitrary disconnected fallbacks).
   */
  public static generateMnemonicWallet(): { mnemonic: string; privateKey: Hex; address: string } {
    const mnemonic = generateMnemonic(english);
    const account = mnemonicToAccount(mnemonic);
    const hdKey = account.getHdKey();
    if (!hdKey.privateKey) {
      throw new Error('Falha crítica na derivação da chave privada a partir da mnemônica BIP-39.');
    }
    const privateKey = toHex(hdKey.privateKey) as Hex;
    return {
      mnemonic,
      privateKey,
      address: account.address,
    };
  }

  /**
   * Architecture for Future Wallet Migrations / Rotations (`v3` -> `v4+`):
   * Stores the previous generation key encrypted at `cofreadmin_prev_pk_<idKey>`
   * prior to rotating to a new wallet standard, enabling safe fund sweeping.
   */
  public static async stageWalletForMigration(params: {
    userEmail?: string;
    userUid?: string;
    previousPrivateKey: string;
    passphrase?: string;
  }): Promise<void> {
    const { userEmail, userUid, previousPrivateKey, passphrase } = params;
    if (!userEmail && !userUid) return;
    const formattedPk = (previousPrivateKey.startsWith('0x') ? previousPrivateKey : `0x${previousPrivateKey}`).trim() as Hex;
    const activePassphrase = passphrase || getSessionPassphrase() || undefined;
    const encryptedPrevPk = await encryptData(formattedPk, activePassphrase);

    const candidates = Web3Service.getIdentityCandidates(userEmail, userUid);
    for (const idKey of candidates) {
      try {
        localStorage.setItem(`cofreadmin_prev_pk_${idKey}`, encryptedPrevPk);
      } catch {}
    }
  }

  /**
   * Checks for a pending future migration/rotation (`cofreadmin_prev_pk_<idKey>`).
   * If no previous key is staged, returns `null` instantly (zero RPC calls).
   * If present, decrypts and queries on-chain balance on Base to trigger the sweep modal.
   */
  public static async getPendingMigrationWallet(
    userEmail?: string,
    userUid?: string,
    passphrase?: string,
    currentAddress?: string,
    network: Web3Network = 'base'
  ): Promise<PendingWalletMigration | null> {
    if (!userEmail && !userUid) return null;
    const candidates = Web3Service.getIdentityCandidates(userEmail, userUid);

    let rawPrevStored: string | null = null;
    for (const idKey of candidates) {
      const found = localStorage.getItem(`cofreadmin_prev_pk_${idKey}`);
      if (found) {
        rawPrevStored = found;
        break;
      }
    }

    if (!rawPrevStored) return null;

    const activePassphrase = passphrase || getSessionPassphrase() || undefined;
    try {
      const decryptedPrevPk = rawPrevStored.startsWith('enc:aes-gcm:')
        ? await decryptData(rawPrevStored, activePassphrase)
        : rawPrevStored;

      if (!decryptedPrevPk || !decryptedPrevPk.startsWith('0x') || decryptedPrevPk.length !== 66) {
        return null;
      }

      const prevAccount = privateKeyToAccount(decryptedPrevPk as Hex);
      if (currentAddress && prevAccount.address.toLowerCase() === currentAddress.toLowerCase()) {
        Web3Service.clearPendingMigrationWallet(userEmail, userUid);
        return null;
      }

      const balances = await Web3Service.getWalletBalances(prevAccount.address, network);
      if (balances.usdc <= 0 && balances.eth <= 0) {
        // Zero balance in previous generation wallet: automatically clear staging
        Web3Service.clearPendingMigrationWallet(userEmail, userUid);
        return null;
      }

      return {
        previousAddress: prevAccount.address,
        previousPrivateKey: decryptedPrevPk as Hex,
        usdcBalance: balances.usdc,
        ethBalance: balances.eth,
        targetGeneration: CURRENT_WALLET_GENERATION,
      };
    } catch {
      return null;
    }
  }

  /**
   * Completes and clears pending migration record following transfer or activation of new wallet.
   */
  public static clearPendingMigrationWallet(userEmail?: string, userUid?: string): void {
    if (!userEmail && !userUid) return;
    const candidates = Web3Service.getIdentityCandidates(userEmail, userUid);
    for (const idKey of candidates) {
      try {
        localStorage.removeItem(`cofreadmin_prev_pk_${idKey}`);
        localStorage.setItem(`cofreadmin_gen_${idKey}`, String(CURRENT_WALLET_GENERATION));
      } catch {}
    }
  }

  /**
   * Persists private key, mnemonic phrase, and public address encrypted (AES-GCM via IndexedDB CryptoKey or PBKDF2)
   * across all identity keys associated with the user.
   * Essential after wallet creation, import, or future rotation.
   */
  public static async saveWalletCredentials(params: {
    userEmail?: string;
    userUid?: string;
    privateKey: string;
    mnemonic?: string;
    passphrase?: string;
  }): Promise<string> {
    const { userEmail, userUid, privateKey, mnemonic, passphrase } = params;
    if (!userEmail && !userUid) {
      throw new Error('Identidade do usuário necessária para salvar credenciais da carteira.');
    }

    const formattedPk = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`).trim() as Hex;
    const account = privateKeyToAccount(formattedPk);
    const activePassphrase = passphrase || getSessionPassphrase() || undefined;

    const encryptedPk = await encryptData(formattedPk, activePassphrase);
    const encryptedMnemonic = mnemonic ? await encryptData(mnemonic, activePassphrase) : null;

    if (activePassphrase) {
      setSessionPassphrase(activePassphrase);
    }

    const candidates = Web3Service.getIdentityCandidates(userEmail, userUid);
    for (const idKey of candidates) {
      try {
        localStorage.setItem(`cofreadmin_pk_${idKey}`, encryptedPk);
        localStorage.setItem(`cofreadmin_addr_${idKey}`, account.address);
        localStorage.setItem(`cofreadmin_gen_${idKey}`, String(CURRENT_WALLET_GENERATION));
        if (encryptedMnemonic) {
          localStorage.setItem(`cofreadmin_mnem_${idKey}`, encryptedMnemonic);
        }
      } catch {}
    }

    return account.address;
  }

  /**
   * Connects or recovers the user's wallet.
   * Creates new keys STRICTLY with generateMnemonicWallet() (BIP-39 + CSPRNG).
   * Encrypts at rest with 256-bit AES-GCM via cryptoVault (non-extractable IndexedDB CryptoKey or PBKDF2).
   */
  public static async connectGoogleWallet(
    userEmail?: string,
    _network: Web3Network = 'base',
    userUid?: string,
    existingPrivateKey?: string,
    passphrase?: string
  ): Promise<ConnectWalletResult> {
    if (!userUid && !userEmail) {
      throw new Error('Identidade do usuário ausente. É necessário efetuar login para acessar a carteira.');
    }

    const candidates = Web3Service.getIdentityCandidates(userEmail, userUid);

    let rawStored: string | undefined = existingPrivateKey || undefined;
    if (!rawStored) {
      for (const idKey of candidates) {
        const found = localStorage.getItem(`cofreadmin_pk_${idKey}`);
        if (found) {
          rawStored = found;
          break;
        }
      }
    }

    let cachedAddr = '';
    for (const idKey of candidates) {
      const addr = localStorage.getItem(`cofreadmin_addr_${idKey}`);
      if (addr) {
        cachedAddr = addr;
        break;
      }
    }

    const activePassphrase = passphrase || getSessionPassphrase() || undefined;

    let resolvedPk = '';
    let isNewlyCreated = false;
    let generatedMnemonic: string | undefined = undefined;

    // CASE 1: Key already exists in storage and is protected with AES-GCM
    if (rawStored && rawStored.startsWith('enc:aes-gcm:')) {
      // If format v2 (protected by manual PBKDF2 passphrase) and no passphrase was provided:
      if (rawStored.startsWith('enc:aes-gcm:v2:') && !activePassphrase) {
        return {
          address: cachedAddr,
          privateKey: '',
          isSmartWallet: false,
          isNewlyCreated: false,
          isLocked: true,
        };
      }

      try {
        // decryptData automatically supports enc:aes-gcm:idb:v3: (via IndexedDB CryptoKey) and v2
        resolvedPk = await decryptData(rawStored, activePassphrase);
        if (activePassphrase) {
          setSessionPassphrase(activePassphrase);
        }
        // If cryptographic envelope requires upgrade to current vault version, re-encrypts transparently
        if (needsVaultEnvelopeUpgrade(rawStored, Boolean(activePassphrase))) {
          await Web3Service.saveWalletCredentials({
            userEmail,
            userUid,
            privateKey: resolvedPk,
            passphrase: activePassphrase,
          });
        }
      } catch {
        // CRITICAL SECURITY RULE: Incorrect passphrase or failed decryption.
        // NEVER falls through to create a new wallet or overwrite existing key!
        throw new Error(
          'CARTEIRA_BLOQUEADA: A carteira existente está protegida e não pôde ser desbloqueada. Operação cancelada para proteger seus fundos.'
        );
      }
    }
    // CASE 2: Key directly provided for immediate local import/sync
    else if (rawStored && rawStored.startsWith('0x') && rawStored.length === 66) {
      resolvedPk = rawStored;
      try {
        await Web3Service.saveWalletCredentials({
          userEmail,
          userUid,
          privateKey: resolvedPk,
          passphrase: activePassphrase,
        });
      } catch {}
    }

    // SECURITY RULE: If wallet record was present but key could not be unlocked,
    // ABORT to prevent overwriting user data.
    if (rawStored && (!resolvedPk || !resolvedPk.startsWith('0x') || resolvedPk.length < 66)) {
      throw new Error(
        'CARTEIRA_BLOQUEADA: A carteira existente está inacessível. A geração de uma nova chave foi bloqueada para prevenir perda de fundos.'
      );
    }

    // CASE 3: No key exists locally (e.g. new user or new device)
    if (!resolvedPk) {
      // Generates 100% new, random and secure wallet (BIP-39 + CSPRNG)
      const newWallet = Web3Service.generateMnemonicWallet();
      resolvedPk = newWallet.privateKey;
      generatedMnemonic = newWallet.mnemonic;
      isNewlyCreated = true;

      // Mandatory encryption (via PBKDF2 if passphrase provided, or non-extractable IndexedDB CryptoKey)
      try {
        await Web3Service.saveWalletCredentials({
          userEmail,
          userUid,
          privateKey: resolvedPk,
          mnemonic: generatedMnemonic,
          passphrase: activePassphrase,
        });
      } catch {
        throw new Error('Falha crítica na criptografia da carteira. A chave privada não pode ser gravada desprotegida.');
      }
    } else {
      // Ensures synchronization of public address and encrypted cipher across all user profile keys
      const existingMnemonic = await Web3Service.getStoredMnemonic(userEmail, userUid, activePassphrase);
      if (existingMnemonic) {
        generatedMnemonic = existingMnemonic;
      }
      try {
        await Web3Service.saveWalletCredentials({
          userEmail,
          userUid,
          privateKey: resolvedPk,
          mnemonic: generatedMnemonic,
          passphrase: activePassphrase,
        });
      } catch {}
    }

    const account = privateKeyToAccount(resolvedPk as Hex);

    return {
      address: account.address,
      privateKey: resolvedPk,
      isSmartWallet: false,
      isNewlyCreated,
      mnemonic: generatedMnemonic,
      isLocked: false,
      needsMigration: false,
    };
  }

  /**
   * Obtains decrypted private key for authorized backup / export
   */
  public static async getStoredDecryptedPrivateKey(
    userEmail?: string,
    userUid?: string,
    passphrase?: string
  ): Promise<string | null> {
    if (!userUid && !userEmail) return null;
    const candidates = Web3Service.getIdentityCandidates(userEmail, userUid);
    let stored: string | null = null;
    for (const idKey of candidates) {
      const val = localStorage.getItem(`cofreadmin_pk_${idKey}`);
      if (val) {
        stored = val;
        break;
      }
    }

    if (!stored) return null;
    if (stored.startsWith('0x') && stored.length === 66) return stored;

    try {
      return await decryptData(stored, passphrase);
    } catch {
      return null;
    }
  }

  /**
   * Obtains stored BIP-39 mnemonic recovery phrase (if generated on this device)
   */
  public static async getStoredMnemonic(
    userEmail?: string,
    userUid?: string,
    passphrase?: string
  ): Promise<string | null> {
    if (!userUid && !userEmail) return null;
    const candidates = Web3Service.getIdentityCandidates(userEmail, userUid);
    let stored: string | null = null;
    for (const idKey of candidates) {
      const val = localStorage.getItem(`cofreadmin_mnem_${idKey}`);
      if (val) {
        stored = val;
        break;
      }
    }

    if (!stored) return null;
    if (!stored.startsWith('enc:aes-gcm:')) return stored;
    try {
      return await decryptData(stored, passphrase);
    } catch {
      return null;
    }
  }

  /**
   * Imports an external private key and saves encrypted with AES-GCM
   */
  public static async importPrivateKey(
    userEmail: string,
    privateKeyHex: string,
    userUid?: string,
    passphrase?: string
  ): Promise<{ address: string; privateKey: string }> {
    if (!userEmail && !userUid) {
      throw new Error('Identidade do usuário necessária para importar carteira.');
    }
    const formattedPk = (privateKeyHex.startsWith('0x') ? privateKeyHex : `0x${privateKeyHex}`).trim() as Hex;
    const account = privateKeyToAccount(formattedPk);
    const candidates = Web3Service.getIdentityCandidates(userEmail, userUid);

    try {
      const cipher = await encryptData(formattedPk, passphrase);
      for (const idKey of candidates) {
        localStorage.setItem(`cofreadmin_pk_${idKey}`, cipher);
        localStorage.setItem(`cofreadmin_addr_${idKey}`, account.address);
        // Removes any legacy mnemonic since imported via direct private key
        localStorage.removeItem(`cofreadmin_mnem_${idKey}`);
      }
    } catch {
      throw new Error('Falha ao proteger a chave privada com AES-GCM. Importação cancelada por segurança.');
    }

    return {
      address: account.address,
      privateKey: formattedPk,
    };
  }

  /**
   * Resets wallet by generating a new random and secure key.
   * SECURITY: If active on-chain balance exists on current wallet, blocks reset to prevent fund loss.
   */
  public static async resetWallet(
    userEmail?: string,
    userUid?: string,
    passphrase?: string,
    options?: { forceResetWithBalanceLost?: boolean; network?: Web3Network }
  ): Promise<{ address: string; privateKey: string; mnemonic: string }> {
    if (!userEmail && !userUid) {
      throw new Error('Identidade do usuário necessária para resetar a carteira.');
    }
    const candidates = Web3Service.getIdentityCandidates(userEmail, userUid);

    // SECURITY: If current wallet has active balance on Base, blocks reset without explicit confirmation
    let currentAddr: string | null = null;
    for (const idKey of candidates) {
      const addr = localStorage.getItem(`cofreadmin_addr_${idKey}`);
      if (addr) {
        currentAddr = addr;
        break;
      }
    }

    if (currentAddr && !options?.forceResetWithBalanceLost) {
      try {
        const balances = await Web3Service.getWalletBalances(currentAddr, options?.network || 'base');
        if (balances.usdc > 0 || balances.eth > 0) {
          throw new Error(
            `A carteira atual possui saldo ativo ($${balances.usdc.toFixed(2)} USDC / ${balances.eth.toFixed(4)} ETH). Faça o backup obrigatório da chave privada ou transfira seus fundos antes de resetar a carteira.`
          );
        }
      } catch (balErr: any) {
        if (balErr?.message?.includes('possui saldo ativo')) {
          throw balErr;
        }
      }
    }

    const newWallet = Web3Service.generateMnemonicWallet();
    const activePassphrase = passphrase || getSessionPassphrase() || undefined;

    await Web3Service.saveWalletCredentials({
      userEmail,
      userUid,
      privateKey: newWallet.privateKey,
      mnemonic: newWallet.mnemonic,
      passphrase: activePassphrase,
    });

    return {
      address: newWallet.address,
      privateKey: newWallet.privateKey,
      mnemonic: newWallet.mnemonic,
    };
  }

  /**
   * Consulta saldos reais na blockchain Base
   */
  public static async getWalletBalances(
    address: string,
    network: Web3Network = 'base'
  ): Promise<WalletBalances> {
    if (!address || !isAddress(address as `0x${string}`)) {
      return {
        usdc: 0,
        eth: 0,
        totalUsd: 0,
        formattedUsdc: '0.00',
        formattedEth: '0.0000',
      };
    }

    try {
      const client = this.getPublicClient(network);
      const usdcTokenAddress = network === 'base' ? BASE_USDC_MAINNET : BASE_USDC_SEPOLIA;

      const [ethResult, usdcResult] = await Promise.allSettled([
        client.getBalance({
          address: address as `0x${string}`,
        }),
        (client as any).readContract({
          address: usdcTokenAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        }),
      ]);

      const ethBalance = ethResult.status === 'fulfilled' ? parseFloat(formatUnits(ethResult.value, 18)) || 0 : 0;
      const usdcBalance = usdcResult.status === 'fulfilled' ? parseFloat(formatUnits(usdcResult.value as bigint, 6)) || 0 : 0;
      const ethPriceInUsd = 2800;
      const totalUsd = usdcBalance + ethBalance * ethPriceInUsd;

      return {
        usdc: usdcBalance,
        eth: ethBalance,
        totalUsd,
        formattedUsdc: usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        formattedEth: ethBalance.toFixed(4),
      };
    } catch {
      return {
        usdc: 0,
        eth: 0,
        totalUsd: 0,
        formattedUsdc: '0.00',
        formattedEth: '0.0000',
      };
    }
  }

  /**
   * Fetches on-chain transaction history
   */
  public static async fetchOnChainTransactions(
    address: string,
    network: Web3Network = 'base'
  ): Promise<SyncedOnChainTx[]> {
    if (!address || !isAddress(address as `0x${string}`)) {
      return [];
    }

    const cleanAddress = address.trim().toLowerCase();
    const isMainnet = network === 'base';
    const baseUrl = isMainnet
      ? 'https://base.blockscout.com/api'
      : 'https://base-sepolia.blockscout.com/api';
    const usdcAddress = (isMainnet ? BASE_USDC_MAINNET : BASE_USDC_SEPOLIA).toLowerCase();

    const results: SyncedOnChainTx[] = [];

    try {
      const tokenUrl = `${baseUrl}?module=account&action=tokentx&contractaddress=${usdcAddress}&address=${cleanAddress}&sort=desc&offset=50`;
      const res = await fetch(tokenUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === '1' && Array.isArray(json.result)) {
          for (const item of json.result) {
            try {
              const itemContract = (item.contractAddress || '').toLowerCase();
              if (itemContract !== usdcAddress) continue;

              const decimals = parseInt(item.tokenDecimal || '6', 10);
              const rawVal = BigInt(item.value || '0');
              const amount = parseFloat(formatUnits(rawVal, decimals));
              if (amount <= 0) continue;

              const isReceive = (item.to || '').toLowerCase() === cleanAddress;
              const isSend = (item.from || '').toLowerCase() === cleanAddress;
              if (!isReceive && !isSend) continue;

              const rawTimestampSec = parseInt(item.timeStamp || '0', 10);
              const timestamp = rawTimestampSec > 0
                ? new Date(rawTimestampSec * 1000).toISOString()
                : new Date(0).toISOString();

              const gasUsed = BigInt(item.gasUsed || '0');
              const gasPrice = BigInt(item.gasPrice || '0');
              const gasFeeEth = parseFloat(formatUnits(gasUsed * gasPrice, 18)) || 0;

              results.push({
                txHash: item.hash,
                timestamp,
                blockNumber: item.blockNumber ? parseInt(item.blockNumber, 10) : undefined,
                fromAddress: item.from,
                toAddress: item.to,
                amount,
                tokenSymbol: 'USDC',
                type: isReceive ? 'receive' : 'send',
                gasFee: gasFeeEth,
                network,
                status: 'confirmed',
                contractAddress: item.contractAddress,
                tokenName: item.tokenName || 'USD Coin',
              });
            } catch {}
          }
        }
      }
    } catch {}

    try {
      const ethUrl = `${baseUrl}?module=account&action=txlist&address=${cleanAddress}&sort=desc&offset=25`;
      const res = await fetch(ethUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === '1' && Array.isArray(json.result)) {
          for (const item of json.result) {
            try {
              if (item.isError === '1') continue;
              const rawVal = BigInt(item.value || '0');
              if (rawVal === BigInt(0)) continue;

              const amount = parseFloat(formatUnits(rawVal, 18));
              if (amount <= 0) continue;

              const isReceive = (item.to || '').toLowerCase() === cleanAddress;
              const isSend = (item.from || '').toLowerCase() === cleanAddress;
              if (!isReceive && !isSend) continue;

              if (results.some((r) => r.txHash.toLowerCase() === item.hash.toLowerCase())) {
                continue;
              }

              const timestamp = item.timeStamp
                ? new Date(parseInt(item.timeStamp, 10) * 1000).toISOString()
                : new Date().toISOString();

              const gasUsed = BigInt(item.gasUsed || '0');
              const gasPrice = BigInt(item.gasPrice || '0');
              const gasFeeEth = parseFloat(formatUnits(gasUsed * gasPrice, 18)) || 0;

              results.push({
                txHash: item.hash,
                timestamp,
                blockNumber: item.blockNumber ? parseInt(item.blockNumber, 10) : undefined,
                fromAddress: item.from,
                toAddress: item.to,
                amount,
                tokenSymbol: 'ETH',
                type: isReceive ? 'receive' : 'send',
                gasFee: gasFeeEth,
                network,
                status: 'confirmed',
                tokenName: 'Ethereum (Base)',
              });
            } catch {}
          }
        }
      }
    } catch {}

    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return results;
  }

  public static truncateAddress(address?: string): string {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  public static getExplorerUrl(hashOrAddress: string, type: 'tx' | 'address' = 'address', network: Web3Network = 'base'): string {
    const baseUrl = network === 'base-sepolia' ? 'https://sepolia.basescan.org' : 'https://basescan.org';
    return `${baseUrl}/${type}/${hashOrAddress}`;
  }

  /**
   * Executes USDC on-chain transfer via EIP-3009 with security shielding:
   * 1. Validates devFeeRecipient and relayer against client fixed allowlist.
   * 2. Caps maximum acceptable protocolFee and gasFee on client side.
   * 3. Generates cryptographically secure nonces via crypto.getRandomValues (Zero Math.random).
   * 4. Private key NEVER leaves browser and is never logged to console.
   */
  public static async sendUsdcOnChain(params: {
    recipientAddress: string;
    amount: number;
    senderAddress: string;
    network?: Web3Network;
    userEmail?: string;
    userUid?: string;
    privateKey?: string;
    protocolFee?: number;
    gasFee?: number;
    passphrase?: string;
  }): Promise<{
    txHash: string;
    blockNumber?: number;
  }> {
    const { recipientAddress, amount, network = 'base', userEmail, userUid, privateKey, protocolFee, gasFee, passphrase } = params;

    // STRICT INPUT VALIDATION: Recipient and Amount
    if (!recipientAddress || typeof recipientAddress !== 'string') {
      throw new Error('Endereço de destinatário não informado.');
    }
    const cleanRecipient = recipientAddress.trim();
    if (!isAddress(cleanRecipient as `0x${string}`)) {
      throw new Error(`Endereço de destinatário inválido ou malformado na rede Base: ${recipientAddress}`);
    }
    if (cleanRecipient.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      throw new Error('Transferência para o endereço de queima (0x0000...0000) não é permitida.');
    }

    if (typeof amount !== 'number' || isNaN(amount) || !Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Valor de transferência inválido: ${amount}. O montante deve ser um número positivo e finito maior que zero.`);
    }

    const isMainnet = network === 'base';
    const usdcAddress = isMainnet ? BASE_USDC_MAINNET : BASE_USDC_SEPOLIA;

    // 1. Resolves active private key
    let pk = privateKey;
    const activePassphrase = passphrase || getSessionPassphrase() || undefined;
    if (!pk) {
      pk = await Web3Service.getStoredDecryptedPrivateKey(userEmail, userUid, activePassphrase) || undefined;
    }
    if (pk && pk.startsWith('enc:aes-gcm:')) {
      pk = await decryptData(pk, activePassphrase);
    }

    if (!pk || !pk.startsWith('0x') || pk.length < 66) {
      throw new Error('Chave privada não encontrada ou bloqueada por senha. Desbloqueie a carteira antes de continuar.');
    }

    const account = privateKeyToAccount(pk as Hex);
    const publicClient = Web3Service.getPublicClient(network);

    // 2. Validates on-chain balances on Base
    const usdcBalanceRaw = await (publicClient as any).readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    const usdcBalance = parseFloat(formatUnits(usdcBalanceRaw as bigint, 6));

    if (usdcBalance < amount) {
      throw new Error(
        `Saldo insuficiente de USDC na blockchain Base. Saldo na carteira (${account.address.slice(0, 6)}...${account.address.slice(-4)}): $${usdcBalance.toFixed(2)} USDC, valor a transferir: $${amount.toFixed(2)} USDC.`
      );
    }

    // 3. SECURITY: Server Validation and Relayer / devFeeRecipient Allowlist
    const paymasterConfig = await PaymasterService.getConfig();
    const rawDevFeeRecipient = (paymasterConfig.devFeeRecipient || '0xD4875cCF87Efb7DDD8dF7787aE4094d5CD2C71De').toLowerCase();
    const rawRelayerAddress = (paymasterConfig.relayerAddress || '0x31b7BafB5Bf4ab3D892610Ae7C9cA45BdBc45233').toLowerCase();

    if (!ALLOWED_DEV_FEE_RECIPIENTS.includes(rawDevFeeRecipient)) {
      throw new Error(`Endereço de destino da taxa devFeeRecipient não autorizado pelo cliente: ${rawDevFeeRecipient}`);
    }
    if (!ALLOWED_RELAYERS.includes(rawRelayerAddress)) {
      throw new Error(`Endereço de relayer despachante não autorizado pelo cliente: ${rawRelayerAddress}`);
    }

    const devFeeRecipient = rawDevFeeRecipient as `0x${string}`;
    const relayerAddress = rawRelayerAddress as `0x${string}`;

    // 4. SECURITY: Maximum fee threshold before signing
    const maxCalculatedProtocolFee = Math.max(amount * MAX_PROTOCOL_FEE_PERCENT, MIN_PROTOCOL_FEE_USD);
    const effectiveDevFee = typeof protocolFee === 'number' && protocolFee > 0 ? protocolFee : maxCalculatedProtocolFee;

    // If provided fee exceeds regulatory ceiling (with max 5% rounding tolerance)
    if (effectiveDevFee > maxCalculatedProtocolFee * 1.05) {
      throw new Error(`Taxa de protocolo solicitada ($${effectiveDevFee.toFixed(4)} USDC) excede o teto máximo permitido.`);
    }

    const effectiveGasFee = typeof gasFee === 'number' && gasFee > 0 ? gasFee : 0.02;
    if (effectiveGasFee > MAX_ALLOWED_GAS_FEE_USDC) {
      throw new Error(`Taxa de gás estimada ($${effectiveGasFee.toFixed(4)} USDC) excede o teto de segurança ($${MAX_ALLOWED_GAS_FEE_USDC} USDC). Transação cancelada para proteger seus fundos.`);
    }

    const totalRequiredUsdc = amount + effectiveDevFee + effectiveGasFee;
    if (usdcBalance + 0.000001 < totalRequiredUsdc) {
      throw new Error(
        `Saldo insuficiente para cobrir valor + taxas na rede Base. Saldo atual: $${usdcBalance.toFixed(4)} USDC | Necessário: $${totalRequiredUsdc.toFixed(4)} USDC ($${amount.toFixed(4)} envio + $${effectiveDevFee.toFixed(4)} protocolo + $${effectiveGasFee.toFixed(4)} gás).`
      );
    }

    // 5. EIP-3009 Configuration
    const chainId = isMainnet ? 8453 : 84532;
    const domain = {
      name: 'USD Coin',
      version: '2',
      chainId,
      verifyingContract: usdcAddress,
    } as const;

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    } as const;

    const validAfter = BigInt(0);
    const validBefore = BigInt(Math.floor(Date.now() / 1000) + 7200); // 2 hours
    const amountRaw = parseUnits(amount.toFixed(6), 6);

    // SECURITY: Cryptographic Nonce generation with crypto.getRandomValues (ZERO Math.random)
    const generateSecureNonce = (): `0x${string}` => {
      const bytes = new Uint8Array(32);
      window.crypto.getRandomValues(bytes);
      return toHex(bytes);
    };

    const nonce1 = generateSecureNonce();

    // Signs primary transfer authorization
    const sig1 = await account.signTypedData({
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message: {
        from: account.address,
        to: recipientAddress as `0x${string}`,
        value: amountRaw,
        validAfter,
        validBefore,
        nonce: nonce1,
      },
    });

    const r1 = `0x${sig1.slice(2, 66)}` as `0x${string}`;
    const s1 = `0x${sig1.slice(66, 130)}` as `0x${string}`;
    let v1 = parseInt(sig1.slice(130, 132), 16);
    if (v1 < 27) v1 += 27;

    const authorization: Eip3009Authorization = {
      from: account.address,
      to: recipientAddress as `0x${string}`,
      value: amountRaw.toString(),
      validAfter: validAfter.toString(),
      validBefore: validBefore.toString(),
      nonce: nonce1,
      v: v1,
      r: r1,
      s: s1,
    };

    // Signs developer fee authorization (if devFeeRaw > 0)
    let devFeeAuthorization: Eip3009Authorization | undefined;
    const devFeeRaw = parseUnits(effectiveDevFee.toFixed(6), 6);

    if (devFeeRaw > BigInt(0) && isAddress(devFeeRecipient)) {
      const nonce2 = generateSecureNonce();
      const sig2 = await account.signTypedData({
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message: {
          from: account.address,
          to: devFeeRecipient,
          value: devFeeRaw,
          validAfter,
          validBefore,
          nonce: nonce2,
        },
      });

      const r2 = `0x${sig2.slice(2, 66)}` as `0x${string}`;
      const s2 = `0x${sig2.slice(66, 130)}` as `0x${string}`;
      let v2 = parseInt(sig2.slice(130, 132), 16);
      if (v2 < 27) v2 += 27;

      devFeeAuthorization = {
        from: account.address,
        to: devFeeRecipient,
        value: devFeeRaw.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce: nonce2,
        v: v2,
        r: r2,
        s: s2,
      };
    }

    // Signs Relayer gas reimbursement authorization
    let gasFeeAuthorization: Eip3009Authorization | undefined;
    const gasFeeRaw = parseUnits(effectiveGasFee.toFixed(6), 6);

    if (gasFeeRaw > BigInt(0) && isAddress(relayerAddress)) {
      const nonce3 = generateSecureNonce();
      const sig3 = await account.signTypedData({
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message: {
          from: account.address,
          to: relayerAddress,
          value: gasFeeRaw,
          validAfter,
          validBefore,
          nonce: nonce3,
        },
      });

      const r3 = `0x${sig3.slice(2, 66)}` as `0x${string}`;
      const s3 = `0x${sig3.slice(66, 130)}` as `0x${string}`;
      let v3 = parseInt(sig3.slice(130, 132), 16);
      if (v3 < 27) v3 += 27;

      gasFeeAuthorization = {
        from: account.address,
        to: relayerAddress,
        value: gasFeeRaw.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce: nonce3,
        v: v3,
        r: r3,
        s: s3,
      };
    }

    // Broadcasts to Relayer via backend
    const paymasterRes = await PaymasterService.sendUsdc({
      senderAddress: account.address,
      recipientAddress,
      amount,
      network,
      protocolFee: effectiveDevFee,
      gasFee: effectiveGasFee,
      authorization,
      devFeeAuthorization,
      gasFeeAuthorization,
    });

    return {
      txHash: paymasterRes.txHash,
      blockNumber: paymasterRes.blockNumber,
    };
  }
}
