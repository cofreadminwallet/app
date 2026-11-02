import { isAddress, getAddress } from 'viem';

export interface ParsedCryptoData {
  address: string;
  amount?: number;
  token?: 'USDC';
  label?: string;
  chainId?: number;
  rawString: string;
  ensName?: string;
  contactName?: string;
  isPaymentRequest?: boolean;
}

export interface CryptoValidationResult {
  isValid: boolean;
  data?: ParsedCryptoData;
  error?: string;
}

/**
 * Sanitizes incoming payment memo/label strings from QR codes or URLs
 * to prevent XSS, HTML injection, or control-character spoofing.
 */
export function sanitizePaymentLabel(rawLabel?: string | null): string | undefined {
  if (!rawLabel || typeof rawLabel !== 'string') return undefined;
  const cleaned = rawLabel
    .replace(/[<>"'`\\]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .trim()
    .slice(0, 50);
  return cleaned.length > 0 ? cleaned : undefined;
}

export const BASE_CHAIN_IDS = [8453, 84532];

/**
 * Known token contracts from foreign EVM networks (BSC, Ethereum Mainnet, Polygon, Arbitrum, etc.)
 * that users frequently paste by accident instead of a Base recipient address.
 */
export const KNOWN_FOREIGN_CONTRACTS: Record<string, string> = {
  // BSC / BNB Chain (chainId 56)
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 'Binance-Peg USD Coin (USDC na rede BSC / BNB Chain)',
  '0x55d398326f99059ff775485246999027b3197955': 'Binance-Peg BSC-USD (USDT na rede BSC / BNB Chain)',
  '0xe9e7cea3dedca5984780bafc599bd69add087d56': 'Binance USD (BUSD na rede BSC / BNB Chain)',
  '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3': 'Dai Token (DAI na rede BSC / BNB Chain)',
  '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': 'Wrapped BNB (WBNB na rede BSC / BNB Chain)',
  '0x2170ed0880ac9a755fd29b2688956bd959f933f8': 'Ethereum Token (ETH na rede BSC / BNB Chain)',
  '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': 'Bitcoin BEP2 (BTCB na rede BSC / BNB Chain)',

  // Ethereum Mainnet (chainId 1)
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USD Coin (USDC na rede Ethereum Mainnet)',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'Tether USD (USDT na rede Ethereum Mainnet)',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'Dai Stablecoin (DAI na rede Ethereum Mainnet)',
  '0x4fabb145d64652a948d72533023f6e7a623c7c53': 'Binance USD (BUSD na rede Ethereum Mainnet)',

  // Polygon PoS (chainId 137)
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': 'USD Coin (USDC nativo na rede Polygon)',
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'USD Coin Bridged (USDC.e na rede Polygon)',
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'Tether USD (USDT na rede Polygon)',
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': 'Dai Stablecoin (DAI na rede Polygon)',

  // Arbitrum One (chainId 42161)
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'USD Coin (USDC nativo na rede Arbitrum)',
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 'USD Coin Bridged (USDC.e na rede Arbitrum)',
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'Tether USD (USDT na rede Arbitrum)',

  // Optimism Mainnet (chainId 10)
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85': 'USD Coin (USDC na rede Optimism)',
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': 'Tether USD (USDT na rede Optimism)',

  // Avalanche C-Chain (chainId 43114)
  '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e': 'USD Coin (USDC na rede Avalanche)',
  '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7': 'Tether USD (USDT na rede Avalanche)',

  // Base Token Contracts (should NEVER be the recipient of a user-to-user payment)
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'Contrato oficial do token USDC na Base',
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 'Contrato USDbC Bridged na Base',
  '0x4200000000000000000000000000000000000006': 'Contrato WETH na Base',

  // Burn and Zero Addresses (Irreversible destruction of assets)
  '0x0000000000000000000000000000000000000000': 'Endereço nulo / zero (Destruição irreversível de ativos)',
  '0x000000000000000000000000000000000000dead': 'Endereço de queima (Burn Address)',
};

/**
 * Validates whether a string is a valid EVM / Base 0x address.
 */
export function isValidEvmAddress(address: string): boolean {
  if (!address) return false;
  const clean = address.trim().toLowerCase();
  if (KNOWN_FOREIGN_CONTRACTS[clean]) return false;
  if (clean === '0x0000000000000000000000000000000000000000' || clean === '0x000000000000000000000000000000000000dead') return false;
  return isAddress(clean as `0x${string}`);
}

/**
 * Validates and parses raw scanned QR code or typed input specifically for the Base network.
 * If the payload is from another network (Bitcoin, Solana, Tron, Ethereum Mainnet, Polygon, Arbitrum, etc.)
 * or has an invalid/incompatible format, returns a friendly error tailored for QR codes or manual addresses.
 */
export function validateCryptoInput(
  input: string,
  mode: 'qr' | 'address' = 'qr'
): CryptoValidationResult {
  const defaultError =
    mode === 'qr'
      ? 'QR Code não compatível. Solicite um QR Code da rede/Base.'
      : 'Endereço não compatível. Solicite um Endereço da rede/Base.';

  if (!input || !input.trim()) {
    return {
      isValid: false,
      error: mode === 'qr' ? defaultError : 'Cole ou digite um endereço da rede/Base.',
    };
  }

  const raw = input.trim();
  const lowerRaw = raw.toLowerCase();

  // 1. Explicitly check for non-Base protocols / blockchain schemes
  const incompatibleSchemes = [
    'bitcoin:',
    'btc:',
    'lightning:',
    'solana:',
    'tron:',
    'trx:',
    'polygon:',
    'binance:',
    'bsc:',
    'arbitrum:',
    'optimism:',
    'avalanche:',
    'avax:',
    'ton:',
    'doge:',
    'dogecoin:',
    'litecoin:',
    'ltc:',
    'ripple:',
    'xrp:',
    'cardano:',
    'ada:',
    'pix:',
    'near:',
    'aptos:',
    'sui:',
  ];

  if (incompatibleSchemes.some((s) => lowerRaw.startsWith(s)) || raw.startsWith('000201')) {
    return { isValid: false, error: defaultError };
  }

  // 2. Check for textual mentions of foreign/incompatible networks (e.g. BSC, BSB, BNB, Polygon, Solana)
  const foreignNetworkPattern =
    /\b(bsc|bsb|binance|bnb|bep20|bep-20|polygon|matic|arbitrum|avalanche|avax|solana|sol|tron|trx|bitcoin|btc|cardano|ada|ripple|xrp|fantom|ftm)\b/i;
  if (foreignNetworkPattern.test(raw) && !/\b(base|base-sepolia)\b/i.test(raw)) {
    return { isValid: false, error: defaultError };
  }

  // 3. Explicitly check for non-EVM address formats:
  // Bitcoin (bc1, tb1, 1, 3), Tron (T...), Cardano (addr1...), Ripple (r...)
  if (
    /^(bc1|tb1)[a-z0-9]{25,90}$/i.test(raw) ||
    /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(raw) ||
    /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(raw) ||
    /^addr1[a-z0-9]{50,110}$/i.test(raw) ||
    /^r[0-9a-zA-Z]{24,34}$/.test(raw)
  ) {
    return { isValid: false, error: defaultError };
  }

  // Solana: Base58 string (length 32-44, no 0x prefix, only alphanumeric)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(raw) && !raw.startsWith('0x')) {
    return { isValid: false, error: defaultError };
  }

  // Helper to check if an EVM address is a foreign token or non-recipient contract
  const isKnownForeignOrRestrictedContract = (addr: string) => {
    return !!KNOWN_FOREIGN_CONTRACTS[addr.toLowerCase()];
  };

  // 4. Direct 0x EVM Address check (standard Base account)
  if (raw.startsWith('0x') && isAddress(raw as `0x${string}`)) {
    if (isKnownForeignOrRestrictedContract(raw)) {
      return { isValid: false, error: defaultError };
    }

    return {
      isValid: true,
      data: {
        address: raw,
        rawString: raw,
        token: 'USDC',
        chainId: 8453,
      },
    };
  }

  // 5. EIP-681 / EIP-831 URI Scheme parsing (ethereum:, base:, web+ethereum:)
  // Syntax: ethereum:[address][@chainId][?parameters] OR base:[address][?parameters]
  const uriMatch = raw.match(/^(?:ethereum|base|web\+ethereum):([0-9a-zA-Z]+)(?:@([0-9]+))?(?:\?(.*))?$/i);
  if (uriMatch) {
    const addressPart = uriMatch[1];
    const chainIdPart = uriMatch[2];
    const queryPart = uriMatch[3] || '';

    // If chainId is specified in URI (e.g. @56 for BSC, @1 for Ethereum Mainnet, @137 for Polygon), it MUST be Base (8453 or 84532)
    if (chainIdPart) {
      const chainIdNum = parseInt(chainIdPart, 10);
      if (!BASE_CHAIN_IDS.includes(chainIdNum)) {
        return { isValid: false, error: defaultError };
      }
    }

    const formattedAddress = addressPart.startsWith('0x') ? addressPart : `0x${addressPart}`;

    if (isAddress(formattedAddress as `0x${string}`)) {
      if (isKnownForeignOrRestrictedContract(formattedAddress)) {
        return { isValid: false, error: defaultError };
      }

      let amount: number | undefined;
      let label: string | undefined;
      let parsedChainId: number = chainIdPart ? parseInt(chainIdPart, 10) : 8453;

      if (queryPart) {
        const params = new URLSearchParams(queryPart);

        // Check chainId query parameter
        const queryChainId = params.get('chainId');
        if (queryChainId) {
          const num = parseInt(queryChainId, 10);
          if (!BASE_CHAIN_IDS.includes(num)) {
            return { isValid: false, error: defaultError };
          }
          parsedChainId = num;
        }

        // Check network query parameter
        const networkParam = (params.get('network') || '').toLowerCase();
        if (networkParam && !['base', 'base-sepolia', 'base_mainnet', 'base-mainnet'].includes(networkParam)) {
          return { isValid: false, error: defaultError };
        }

        const valueParam = params.get('value') || params.get('amount') || params.get('uint256');
        if (valueParam) {
          const parsed = parseFloat(valueParam);
          if (!isNaN(parsed) && isFinite(parsed) && parsed > 0 && parsed <= 1_000_000) {
            amount = parseFloat(parsed.toFixed(4));
          }
        }

        label = sanitizePaymentLabel(params.get('label') || params.get('memo') || params.get('recipient'));
      }

      return {
        isValid: true,
        data: {
          address: getAddress(formattedAddress as `0x${string}`),
          amount,
          token: 'USDC',
          label,
          chainId: parsedChainId,
          rawString: raw,
          isPaymentRequest: Boolean(amount || label),
        },
      };
    }
  }

  // 5b. CofreAdmin Payment Request URL / Deep Link parsing (e.g. https://.../?pay=0x...&amount=18.50&memo=Churrasco)
  if (/^https?:\/\//i.test(raw) || raw.includes('?pay=') || raw.includes('?to=')) {
    try {
      const urlObj = raw.startsWith('http')
        ? new URL(raw)
        : new URL(raw.startsWith('/') ? `https://cofreadmin.gfin.app${raw}` : `https://cofreadmin.gfin.app/${raw}`);
      const params = urlObj.searchParams;
      const targetAddr = (params.get('pay') || params.get('to') || params.get('address') || '').trim();
      const chainParam = params.get('chainId');

      if (chainParam) {
        const chainNum = parseInt(chainParam, 10);
        if (!BASE_CHAIN_IDS.includes(chainNum)) {
          return { isValid: false, error: defaultError };
        }
      }

      if (targetAddr && isAddress(targetAddr as `0x${string}`)) {
        if (isKnownForeignOrRestrictedContract(targetAddr)) {
          return { isValid: false, error: defaultError };
        }

        let amount: number | undefined;
        const rawAmt = params.get('amount') || params.get('value');
        if (rawAmt) {
          const parsedAmt = parseFloat(rawAmt);
          if (!isNaN(parsedAmt) && isFinite(parsedAmt) && parsedAmt > 0 && parsedAmt <= 1_000_000) {
            amount = parseFloat(parsedAmt.toFixed(4));
          }
        }

        const label = sanitizePaymentLabel(params.get('memo') || params.get('label') || params.get('for'));
        const ensName = sanitizePaymentLabel(params.get('ens'));

        return {
          isValid: true,
          data: {
            address: getAddress(targetAddr as `0x${string}`),
            amount,
            token: 'USDC',
            label,
            ensName,
            chainId: 8453,
            rawString: raw,
            isPaymentRequest: true,
          },
        };
      }
    } catch {
      // Fall through to standard checks if URL parsing fails
    }
  }

  // 6. Check if raw text is clean 42-character 0x hex with whitespace/newlines
  const cleanHex = raw.replace(/[\s\r\n]+/g, '');
  if (/^0x[a-fA-F0-9]{40}$/.test(cleanHex) && isAddress(cleanHex as `0x${string}`)) {
    if (isKnownForeignOrRestrictedContract(cleanHex)) {
      return { isValid: false, error: defaultError };
    }

    return {
      isValid: true,
      data: {
        address: cleanHex,
        rawString: raw,
        token: 'USDC',
        chainId: 8453,
      },
    };
  }

  // Incompatible or invalid format
  return {
    isValid: false,
    error: defaultError,
  };
}

/**
 * Parses raw scanned data or pasted text from EVM / Crypto QR codes.
 * Ensures the data is valid and compatible with the Base network.
 */
export function parseCryptoQrOrText(input: string): ParsedCryptoData | null {
  const result = validateCryptoInput(input, 'qr');
  return result.isValid && result.data ? result.data : null;
}

/**
 * Formats a crypto QR payload standard (EIP-681 compliant) strictly bound to the Base network (USDC).
 * Uses EIP-55 checksumming to prevent address tampering and attaches the chainId (@8453)
 * so scanning wallets cannot accidentally route funds to incompatible networks.
 */
export function generateCryptoPaymentUri(options: {
  address: string;
  amount?: number;
  token?: 'USDC';
  label?: string;
  chainId?: number;
}): string {
  const { address, amount, token = 'USDC', label, chainId = 8453 } = options;
  const cleanAddress = (address || '').trim();
  let checksummedAddress = cleanAddress;
  try {
    if (isAddress(cleanAddress as `0x${string}`)) {
      checksummedAddress = getAddress(cleanAddress as `0x${string}`);
    }
  } catch {
    // Keep cleanAddress if checksumming cannot be computed
  }

  // If amount and label are omitted, return raw 0x address for maximum exchange compatibility
  if (!amount && (!label || !label.trim())) {
    return checksummedAddress;
  }

  const params = new URLSearchParams();
  if (amount && amount > 0) {
    params.set('value', amount.toString());
  }
  params.set('token', token);
  if (label && label.trim()) {
    const cleanLabel = sanitizePaymentLabel(label);
    if (cleanLabel) {
      params.set('label', cleanLabel);
    }
  }

  const query = params.toString();
  // Standard EIP-681 format: ethereum:<address>@<chainId>?<query>
  return `ethereum:${checksummedAddress}@${chainId}${query ? `?${query}` : ''}`;
}

/**
 * Generates a shareable CofreAdmin Payment Link (Payment Request / Invoice Style)
 * that pre-fills the recipient address, exact USDC amount, and memo when opened or scanned.
 */
export function generateShareablePaymentLink(options: {
  address: string;
  amount?: number;
  label?: string;
  chainId?: number;
}): string {
  const { address, amount, label, chainId = 8453 } = options;
  const cleanAddress = (address || '').trim();
  let checksummedAddress = cleanAddress;
  try {
    if (isAddress(cleanAddress as `0x${string}`)) {
      checksummedAddress = getAddress(cleanAddress as `0x${string}`);
    }
  } catch {}

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://cofreadmin.gfin.app';

  const params = new URLSearchParams();
  params.set('pay', checksummedAddress);
  if (amount && amount > 0 && isFinite(amount)) {
    params.set('amount', amount.toFixed(2));
  }
  const cleanLabel = sanitizePaymentLabel(label);
  if (cleanLabel) {
    params.set('memo', cleanLabel);
  }
  params.set('chainId', String(chainId));

  return `${origin}/?${params.toString()}`;
}
