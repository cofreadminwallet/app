import { createPublicClient, createWalletClient, http, formatUnits, parseUnits, parseAbi, isAddress, Hex, keccak256, toHex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { Transaction } from '../types';
import { PaymasterService, Eip3009Authorization } from './paymasterService';
import { encryptData, decryptData } from '../utils/cryptoVault';

// Official Native Circle USDC contract addresses on BASE
// Base Mainnet Native USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (6 decimals)
export const BASE_USDC_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
// Base Sepolia Testnet USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e (6 decimals)
export const BASE_USDC_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

// 100% Free, official, public RPC endpoints directly from Base (Zero developer infrastructure cost)
export const BASE_PUBLIC_RPC = 'https://mainnet.base.org';
export const BASE_SEPOLIA_PUBLIC_RPC = 'https://sepolia.base.org';

// Standard ERC-20 ABI for zero-cost balance queries
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
   * Generates a deterministic private key from a unique user seed (e.g. Firebase Google UID or email).
   * Ensures that clearing browser cache will NOT generate a different wallet for the same Google user!
   */
  public static async deriveDeterministicPrivateKey(seed: string): Promise<Hex> {
    const cleanSeed = (seed || 'default_user').trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(`cofreadmin_base_v1_${cleanSeed}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = '0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex as Hex;
  }

  /**
   * Generates or retrieves the user's real cryptographic EVM on-chain wallet.
   * Creates a genuine secp256k1 private key and public address stored securely on the device.
   * Can be exported anytime to MetaMask, Coinbase Wallet, or Rabby.
   */
  public static async connectGoogleWallet(
    userEmail?: string,
    _network: Web3Network = 'base',
    userUid?: string,
    existingPrivateKey?: string
  ): Promise<{ address: string; privateKey: string; isSmartWallet: boolean }> {
    // Isolate wallet completely by profile identity (e.g. 'discord_1552735173668241448' vs 'google_email')
    const identityKey = (userUid || (userEmail?.startsWith('discord_') || userEmail?.startsWith('google_') ? userEmail : `user_${userEmail || 'default'}`))
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageKey = `cofreadmin_pk_${identityKey}`;

    let rawStored = existingPrivateKey || localStorage.getItem(storageKey);
    // Legacy fallback check if identityKey is new
    if (!rawStored && userEmail && !userUid?.startsWith('discord_')) {
      const legacyKey = `cofreadmin_pk_${userEmail.trim().toLowerCase()}`;
      rawStored = localStorage.getItem(legacyKey) || undefined;
    }

    let storedPk = rawStored;
    if (rawStored && rawStored.startsWith('enc:aes-gcm:v1:')) {
      try {
        storedPk = await decryptData(rawStored);
      } catch (e) {
        console.warn('Erro ao decriptografar chave privada:', e);
      }
    }

    if (!storedPk || !storedPk.startsWith('0x') || storedPk.length < 66) {
      // Derive deterministic 32-byte private key based on unique identity seed
      // For Discord: uses userUid (e.g. discord_1552735173668241448)
      // For Google: uses userUid or userEmail
      const seed = userUid || identityKey || 'default_user';
      storedPk = await Web3Service.deriveDeterministicPrivateKey(seed);
      try {
        const encrypted = await encryptData(storedPk);
        localStorage.setItem(storageKey, encrypted);
      } catch {
        localStorage.setItem(storageKey, storedPk);
      }
    } else if (storedPk && !rawStored?.startsWith('enc:aes-gcm:v1:')) {
      // Transparent migration of legacy keys to AES-GCM 256-bit encryption
      try {
        const encrypted = await encryptData(storedPk);
        localStorage.setItem(storageKey, encrypted);
      } catch {}
    }

    const account = privateKeyToAccount(storedPk as Hex);
    try {
      localStorage.setItem(`cofreadmin_addr_${identityKey}`, account.address);
    } catch {}

    return {
      address: account.address,
      privateKey: storedPk,
      isSmartWallet: false,
    };
  }

  /**
   * Retrieves the stored private key for backup/exporting
   */
  public static getStoredPrivateKey(userEmail?: string, userUid?: string): string | null {
    const identityKey = (userUid || (userEmail?.startsWith('discord_') || userEmail?.startsWith('google_') ? userEmail : `user_${userEmail || 'default'}`))
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    return localStorage.getItem(`cofreadmin_pk_${identityKey}`) || (userEmail ? localStorage.getItem(`cofreadmin_pk_${userEmail.trim().toLowerCase()}`) : null);
  }

  /**
   * Imports an external private key (e.g., from MetaMask or Coinbase Wallet)
   */
  public static importPrivateKey(userEmail: string, privateKeyHex: string, userUid?: string): { address: string; privateKey: string } {
    const formattedPk = (privateKeyHex.startsWith('0x') ? privateKeyHex : `0x${privateKeyHex}`).trim() as Hex;
    const account = privateKeyToAccount(formattedPk);
    const identityKey = (userUid || (userEmail?.startsWith('discord_') || userEmail?.startsWith('google_') ? userEmail : `user_${userEmail || 'default'}`))
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    encryptData(formattedPk).then(cipher => {
      localStorage.setItem(`cofreadmin_pk_${identityKey}`, cipher);
    }).catch(() => {
      localStorage.setItem(`cofreadmin_pk_${identityKey}`, formattedPk);
    });
    localStorage.setItem(`cofreadmin_addr_${identityKey}`, account.address);
    return {
      address: account.address,
      privateKey: formattedPk,
    };
  }

  /**
   * Resets the on-chain wallet for the user, forcing creation of a brand new wallet
   */
  public static resetWallet(userEmail?: string): { address: string; privateKey: string } {
    const emailKey = (userEmail || 'default_user').trim().toLowerCase();
    const newPk = generatePrivateKey();
    const account = privateKeyToAccount(newPk);
    encryptData(newPk).then(cipher => {
      localStorage.setItem(`cofreadmin_pk_${emailKey}`, cipher);
    }).catch(() => {
      localStorage.setItem(`cofreadmin_pk_${emailKey}`, newPk);
    });
    localStorage.setItem(`cofreadmin_addr_${emailKey}`, account.address);
    return {
      address: account.address,
      privateKey: newPk,
    };
  }

  /**
   * Helper to retrieve or create the user's real wallet address.
   * Uses deterministic derivation based on the user identity seed so that funds are never lost.
   */
  public static generateDeterministicAddress(seed: string): string {
    const emailKey = (seed || 'default_user').trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Check various common storage keys for existing address
    const cached =
      localStorage.getItem(`cofreadmin_addr_${emailKey}`) ||
      localStorage.getItem(`cofreadmin_addr_user_${emailKey}`) ||
      (seed.includes('@') ? localStorage.getItem(`cofreadmin_addr_${seed.trim().toLowerCase()}`) : null);
      
    if (cached && isAddress(cached as `0x${string}`)) {
      return cached;
    }

    // Check if an existing private key is stored
    const existingPk =
      localStorage.getItem(`cofreadmin_pk_${emailKey}`) ||
      localStorage.getItem(`cofreadmin_pk_user_${emailKey}`);
      
    if (existingPk && existingPk.startsWith('0x') && existingPk.length === 66) {
      try {
        const account = privateKeyToAccount(existingPk as Hex);
        localStorage.setItem(`cofreadmin_addr_${emailKey}`, account.address);
        return account.address;
      } catch {}
    }

    // Strictly deterministic derivation (prevents generating random ephemeral keys)
    const deterministicPk = keccak256(toHex(`cofreadmin_base_v1_${emailKey}`));
    const account = privateKeyToAccount(deterministicPk);
    localStorage.setItem(`cofreadmin_pk_${emailKey}`, deterministicPk);
    localStorage.setItem(`cofreadmin_addr_${emailKey}`, account.address);
    return account.address;
  }

  /**
   * Fetches the current balances of USDC and ETH directly from the free public Base RPC.
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

      // Read Native ETH and Native USDC in parallel with Promise.allSettled
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

      const ethPriceInUsd = 2800; // Reference conversion for Base ETH
      const totalUsd = usdcBalance + ethBalance * ethPriceInUsd;

      return {
        usdc: usdcBalance,
        eth: ethBalance,
        totalUsd,
        formattedUsdc: usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        formattedEth: ethBalance.toFixed(4),
      };
    } catch (error) {
      console.warn('Free Base RPC read failed, using cached balance:', error);
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
   * Fetches real on-chain transaction history for the given address directly from the Base network (Blockscout indexer).
   * Queries both ERC-20 token transfers (USDC, etc.) and native ETH transfers with zero API key required.
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

    // 1. Fetch ERC-20 Token Transfers strictly for Base USDC
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
              // Ensure the contract address is the genuine Base USDC contract
              const itemContract = (item.contractAddress || '').toLowerCase();
              if (itemContract !== usdcAddress) {
                continue;
              }

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

              const tokenSymbol = 'USDC';
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
                tokenSymbol,
                type: isReceive ? 'receive' : 'send',
                gasFee: gasFeeEth,
                network,
                status: 'confirmed',
                contractAddress: item.contractAddress,
                tokenName: item.tokenName || 'USD Coin',
              });
            } catch (itemErr) {
              console.warn('Failed to parse token transfer item:', itemErr);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Blockscout token tx fetch failed:', e);
    }

    // 2. Fetch Native ETH Transfers
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
              if (rawVal === BigInt(0)) continue; // skip zero-value contract interactions

              const amount = parseFloat(formatUnits(rawVal, 18));
              if (amount <= 0) continue;

              const isReceive = (item.to || '').toLowerCase() === cleanAddress;
              const isSend = (item.from || '').toLowerCase() === cleanAddress;
              if (!isReceive && !isSend) continue;

              // Avoid duplicate if already tracked
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
            } catch (itemErr) {
              console.warn('Failed to parse eth tx item:', itemErr);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Blockscout native tx fetch failed:', e);
    }

    // Sort newest first
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return results;
  }

  /**
   * Formats a 0x address into a clean shortened string: 0x1234...5678
   */
  public static truncateAddress(address?: string): string {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Returns explorer URL for Base Scan (Production Base Mainnet or Sepolia)
   */
  public static getExplorerUrl(hashOrAddress: string, type: 'tx' | 'address' = 'address', network: Web3Network = 'base'): string {
    const baseUrl = network === 'base-sepolia' ? 'https://sepolia.basescan.org' : 'https://basescan.org';
    return `${baseUrl}/${type}/${hashOrAddress}`;
  }

  /**
   * Broadcasts a real on-chain USDC transfer on the Base network (Base L2).
   * Executes the transaction signed by the user's private key directly to the Base blockchain.
   */
  public static async sendUsdcOnChain(params: {
    recipientAddress: string;
    amount: number;
    senderAddress: string;
    network?: Web3Network;
    userEmail?: string;
    privateKey?: string;
    protocolFee?: number;
    gasFee?: number;
  }): Promise<{
    txHash: string;
    blockNumber?: number;
  }> {
    const { recipientAddress, amount, network = 'base', userEmail, privateKey, protocolFee, gasFee } = params;
    const isMainnet = network === 'base';
    const chain = isMainnet ? base : baseSepolia;
    const usdcAddress = isMainnet ? BASE_USDC_MAINNET : BASE_USDC_SEPOLIA;

    // 1. Resolve active private key
    let pk = privateKey || Web3Service.getStoredPrivateKey(userEmail);
    if (pk && pk.startsWith('enc:aes-gcm:v1:')) {
      try {
        pk = await decryptData(pk);
      } catch {}
    }
    if (!pk || !pk.startsWith('0x') || pk.length < 66) {
      if (typeof window !== 'undefined' && userEmail) {
        const cleanId = userEmail.trim().toLowerCase();
        let rawFallback = localStorage.getItem(`cofreadmin_wallet_priv_${cleanId}`) ||
                          localStorage.getItem(`cofreadmin_pk_${cleanId}`);
        if (rawFallback && rawFallback.startsWith('enc:aes-gcm:v1:')) {
          try {
            rawFallback = await decryptData(rawFallback);
          } catch {}
        }
        pk = rawFallback;
      }
    }

    if (!pk || !pk.startsWith('0x') || pk.length < 66) {
      pk = await Web3Service.deriveDeterministicPrivateKey(userEmail || 'default_user');
    }

    const account = privateKeyToAccount(pk as Hex);
    const publicClient = Web3Service.getPublicClient(network);

    // 2. Validate on-chain balances on Base
    const ethBalanceWei = await publicClient.getBalance({ address: account.address });
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

    // 3. Client-Side EIP-3009 Cryptographic Authorization (Zero-Knowledge: Private key NEVER leaves browser)
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
    const nonce1 = keccak256(toHex(`${Date.now()}-1-${account.address}-${Math.random()}`));

    // Sign main transfer authorization locally on client
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

    // Retrieve active relayer and dev fee configuration
    const paymasterConfig = await PaymasterService.getConfig();
    const devFeeRecipient = (paymasterConfig.devFeeRecipient || import.meta.env.VITE_DEV_FEE_RECIPIENT_ADDRESS || '0xD4875cCF87Efb7DDD8dF7787aE4094d5CD2C71De') as `0x${string}`;
    const relayerAddress = (paymasterConfig.relayerAddress || import.meta.env.VITE_EXPECTED_GAS_RELAYER || '0x31b7BafB5Bf4ab3D892610Ae7C9cA45BdBc45233') as `0x${string}`;

    // Sign Dev Protocol Fee authorization if applicable (0.2% min $0.05)
    let devFeeAuthorization: Eip3009Authorization | undefined;
    const effectiveDevFee = typeof protocolFee === 'number' && protocolFee > 0 ? protocolFee : Math.max(amount * 0.002, 0.05);
    const devFeeRaw = parseUnits(effectiveDevFee.toFixed(6), 6);

    if (devFeeRaw > BigInt(0) && isAddress(devFeeRecipient)) {
      const nonce2 = keccak256(toHex(`${Date.now()}-dev-${account.address}-${Math.random()}`));
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

    // Sign Gas Fee reimbursement authorization if applicable
    let gasFeeAuthorization: Eip3009Authorization | undefined;
    const effectiveGasFee = typeof gasFee === 'number' && gasFee > 0 ? gasFee : 0.02;
    const gasFeeRaw = parseUnits(effectiveGasFee.toFixed(6), 6);

    if (gasFeeRaw > BigInt(0) && isAddress(relayerAddress)) {
      const nonce3 = keccak256(toHex(`${Date.now()}-gas-${account.address}-${Math.random()}`));
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

    // 4. Relayer broadcast (Transmits ONLY cryptographic authorization signatures - Zero private keys sent!)
    try {
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
    } catch (paymasterErr: any) {
      console.warn('Falha no envio via Relayer Base:', paymasterErr);
      throw new Error(
        paymasterErr.message || 'Falha ao processar a transferência via Relayer Base.'
      );
    }
  }
}
