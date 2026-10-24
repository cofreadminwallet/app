import { Web3Network } from './web3Service';

/**
 * Official Circle Paymaster (ERC-4337) addresses on Base.
 * Permissionless: Allows users to pay transaction gas fees directly with USDC balance.
 * Does not require Policy ID or developer billing card.
 */
export const CIRCLE_PAYMASTER_CONTRACTS = {
  BASE_MAINNET_V07: '0x6C973eBe80dCD8660841D4356bf15c32460271C9',
  BASE_MAINNET_V08: '0x0578cFB241215b77442a541325d6A4E6dFE700Ec',
  BASE_SEPOLIA: '0x31BE08D380A21fc740883c0BC434FcFc88740b58',
} as const;

export interface PaymasterConfig {
  enabled: boolean;
  provider: string;
  network: Web3Network;
  circlePaymasterActive?: boolean;
  isPermissionless?: boolean;
  circlePaymasterContract?: string;
  allowlist?: string[];
  security?: {
    proxyActive: boolean;
    allowlistEnforced: boolean;
    rateLimitEnforced: boolean;
    noEthRequired: boolean;
    contract?: string;
    description?: string;
  };
  relayerAddress: string;
  expectedGasWallet?: string;
  devFeeRecipient?: string;
  isOfficialGasWalletLoaded?: boolean;
  relayerEthBalance: string;
  targetGasWalletEthBalance?: string;
  hasEthBalance: boolean;
  feeUsdc: number;
  gasToken: 'USDC';
  message: string;
}

export interface Eip3009Authorization {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: `0x${string}`;
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
}

export interface PaymasterSendParams {
  recipientAddress: string;
  amount: number;
  senderAddress: string;
  network?: Web3Network;
  protocolFee?: number;
  gasFee?: number;
  authorization?: Eip3009Authorization;
  devFeeAuthorization?: Eip3009Authorization;
  gasFeeAuthorization?: Eip3009Authorization;
  privateKey?: string;
  userEmail?: string;
}

export interface PaymasterReceipt {
  success: boolean;
  txHash: string;
  feeTxHash?: string | null;
  blockNumber: number;
  amount: number;
  feeUsdc: number;
  token: 'USDC';
  recipientAddress: string;
  senderAddress: string;
  relayerAddress: string;
  gasPaidInUsdc: boolean;
  provider: string;
}

export class PaymasterService {
  /**
   * Checks if Relayer Paymaster backend is active, configured and funded
   */
  public static async getConfig(): Promise<PaymasterConfig> {
    try {
      const res = await fetch('/api/paymaster/config');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    return {
      enabled: true,
      provider: 'relayer_eip3009',
      network: 'base',
      relayerAddress: '',
      relayerEthBalance: '0',
      hasEthBalance: false,
      feeUsdc: 0.02,
      gasToken: 'USDC',
      message: 'Relayer ativo no backend.',
    };
  }

  /**
   * Estimates the gas fee directly in USDC
   */
  public static async estimateGasUsdc(network: Web3Network = 'base'): Promise<number> {
    try {
      const res = await fetch('/api/paymaster/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.gasFeeUsdc === 'number') {
          return data.gasFeeUsdc;
        }
      }
    } catch (err) {
      console.warn('Fallback estimation of gas fee in USDC:', err);
    }
    return 0.02; // Default conservative Base L2 gas fee in USDC ($0.02)
  }

  /**
   * Sends USDC on Base using Relayer, deducting gas fee directly in USDC from user
   */
  public static async sendUsdc(params: PaymasterSendParams): Promise<{
    txHash: string;
    blockNumber: number;
    feeTxHash?: string | null;
  }> {
    // Zero-Knowledge Guard: Ensure privateKey is never transmitted across the network
    const sanitizedParams = { ...params };
    delete (sanitizedParams as any).privateKey;

    const res = await fetch('/api/paymaster/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedParams),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Falha ao processar transferência via Relayer.');
    }

    return {
      txHash: data.txHash,
      blockNumber: data.blockNumber || 0,
      feeTxHash: data.feeTxHash || null,
    };
  }
}
