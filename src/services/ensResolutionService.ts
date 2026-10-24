import { createPublicClient, http, namehash, parseAbi, getAddress, isAddress } from 'viem';
import { base, mainnet } from 'viem/chains';
import { isValidEvmAddress, KNOWN_FOREIGN_CONTRACTS } from '../utils/cryptoAddressUtils';
import { StorageService } from '../utils/storage';
import { SavedContact } from '../types';

/**
 * Official Coinbase Basenames L2 Resolver on Base Mainnet (Chain ID 8453)
 */
export const BASENAMES_L2_RESOLVER_MAINNET = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD' as const;

const L2_RESOLVER_ABI = parseAbi([
  'function addr(bytes32 node) view returns (address)',
  'function name(bytes32 node) view returns (string)',
]);

const ETH_MAINNET_RPCS = [
  'https://ethereum-rpc.publicnode.com',
  'https://cloudflare-eth.com',
];

export interface EnsResolutionResult {
  isValid: boolean;
  address?: string;
  normalizedName?: string;
  isBasename?: boolean;
  error?: string;
}

export interface RecipientTrustStatus {
  isKnown: boolean;
  contact?: SavedContact;
  previousTransferCount: number;
  lastTransferDate?: string;
}

// In-memory resolution cache (TTL: 5 minutes) to avoid redundant RPC roundtrips while typing
const resolutionCache = new Map<string, { result: EnsResolutionResult; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export class EnsResolutionService {
  /**
   * Checks if a raw input looks like an ENS (.eth) or Basename (.base.eth) handle.
   */
  public static isDomainNameInput(input: string): boolean {
    if (!input) return false;
    const clean = input.trim().replace(/^@/, '').toLowerCase();
    return clean.endsWith('.base.eth') || clean.endsWith('.eth');
  }

  /**
   * Validates domain name against IDN homograph attacks, invisible zero-width characters,
   * and punycode spoofing before querying any on-chain resolver.
   */
  public static validateSafeDomainSyntax(rawInput: string, isEn = false): {
    safe: boolean;
    normalized?: string;
    isBasename?: boolean;
    error?: string;
  } {
    const trimmed = (rawInput || '').trim().replace(/^@/, '');
    if (!trimmed) {
      return {
        safe: false,
        error: isEn ? 'Enter a valid .base.eth or .eth name.' : 'Digite um nome .base.eth ou .eth válido.',
      };
    }

    // 1. Block zero-width / control / bidirectional spoofing characters
    if (/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/.test(trimmed)) {
      return {
        safe: false,
        error: isEn
          ? 'Security Alert: Hidden/invisible characters detected in domain name.'
          : 'Alerta de Segurança: Caracteres ocultos/invisíveis detectados no nome.',
      };
    }

    const lower = trimmed.toLowerCase();

    // 2. Block Punycode (xn--) and non-ASCII confusable homographs (e.g. Cyrillic 'а' vs Latin 'a')
    if (lower.includes('xn--') || /[^\x20-\x7E]/.test(lower)) {
      return {
        safe: false,
        error: isEn
          ? 'Security Alert: Internationalized/homograph characters are blocked to prevent address spoofing. Use only standard a-z and 0-9.'
          : 'Alerta de Segurança: Caracteres especiais/homógrafos bloqueados contra falsificação. Use apenas letras (a-z), números (0-9) e hífen.',
      };
    }

    // 3. Enforce strict label structure (.base.eth or .eth)
    const isBasename = lower.endsWith('.base.eth');
    const isEth = lower.endsWith('.eth');
    if (!isBasename && !isEth) {
      return {
        safe: false,
        error: isEn
          ? 'Only .base.eth (Basenames) and .eth (ENS) names are supported.'
          : 'Apenas nomes .base.eth (Basenames) e .eth (ENS) são suportados.',
      };
    }

    const labelPart = isBasename ? lower.slice(0, -'.base.eth'.length) : lower.slice(0, -'.eth'.length);
    if (!labelPart || labelPart.length < 3 || labelPart.length > 63) {
      return {
        safe: false,
        error: isEn
          ? 'Domain name must have between 3 and 63 characters.'
          : 'O nome deve ter entre 3 e 63 caracteres antes do sufixo.',
      };
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(labelPart)) {
      return {
        safe: false,
        error: isEn
          ? 'Invalid format. Use only letters (a-z), numbers (0-9), and hyphens.'
          : 'Formato inválido. Use apenas letras (a-z), números (0-9) e hífens.',
      };
    }

    return {
      safe: true,
      normalized: lower,
      isBasename,
    };
  }

  /**
   * Resolves a `.base.eth` (Basename on Base L2) or `.eth` (ENS) domain to a verified,
   * EIP-55 checksummed 0x address compatible with Base L2.
   */
  public static async resolveName(rawInput: string, isEn = false): Promise<EnsResolutionResult> {
    const syntax = this.validateSafeDomainSyntax(rawInput, isEn);
    if (!syntax.safe || !syntax.normalized) {
      return {
        isValid: false,
        error: syntax.error,
      };
    }

    const domain = syntax.normalized;
    const isBasename = Boolean(syntax.isBasename);

    // Check memory cache first
    const cached = resolutionCache.get(domain);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }

    try {
      let resolvedAddress: string | null = null;

      // Strategy 1: If it's a `.base.eth` Basename, query Coinbase's Official Base Mainnet L2Resolver directly first (fast & native L2)
      if (isBasename) {
        try {
          const baseClient = createPublicClient({
            chain: base,
            transport: http('https://mainnet.base.org', { timeout: 6000, retryCount: 2 }),
          });
          const node = namehash(domain);
          const addr = (await (baseClient as any).readContract({
            address: BASENAMES_L2_RESOLVER_MAINNET,
            abi: L2_RESOLVER_ABI,
            functionName: 'addr',
            args: [node],
          })) as string;
          if (addr && addr !== '0x0000000000000000000000000000000000000000' && isAddress(addr)) {
            resolvedAddress = getAddress(addr);
          }
        } catch (l2Err) {
          console.warn('Basenames L2 direct resolution fallback to L1 ENS:', l2Err);
        }
      }

      // Strategy 2: Universal ENS resolution via Ethereum Mainnet RPC (supports both .eth and CCIP-Read .base.eth)
      if (!resolvedAddress) {
        for (const rpcUrl of ETH_MAINNET_RPCS) {
          try {
            const ethClient = createPublicClient({
              chain: mainnet,
              transport: http(rpcUrl, { timeout: 7000, retryCount: 1 }),
            });
            const ensAddr = await ethClient.getEnsAddress({
              name: domain,
            });
            if (ensAddr && ensAddr !== '0x0000000000000000000000000000000000000000' && isAddress(ensAddr)) {
              resolvedAddress = getAddress(ensAddr);
              break;
            }
          } catch {
            // Try next fallback RPC
          }
        }
      }

      if (!resolvedAddress) {
        const notFoundResult: EnsResolutionResult = {
          isValid: false,
          normalizedName: domain,
          isBasename,
          error: isEn
            ? `No wallet address found for "${domain}". Please verify the spelling.`
            : `Nenhum endereço encontrado para "${domain}". Verifique se o nome está correto.`,
        };
        return notFoundResult;
      }

      // Security Check: Reject known token contracts or burn addresses
      if (!isValidEvmAddress(resolvedAddress) || KNOWN_FOREIGN_CONTRACTS[resolvedAddress.toLowerCase()]) {
        return {
          isValid: false,
          normalizedName: domain,
          isBasename,
          error: isEn
            ? 'Security Block: This domain resolves to a restricted contract or invalid address.'
            : 'Bloqueio de Segurança: Este domínio aponta para um contrato restrito ou endereço inválido.',
        };
      }

      const successResult: EnsResolutionResult = {
        isValid: true,
        address: getAddress(resolvedAddress),
        normalizedName: domain,
        isBasename,
      };

      resolutionCache.set(domain, { result: successResult, timestamp: Date.now() });
      return successResult;
    } catch (err) {
      console.warn('Error resolving ENS/Basename:', err);
      return {
        isValid: false,
        normalizedName: domain,
        isBasename,
        error: isEn
          ? 'Could not query on-chain name service right now. Check your connection or paste the 0x address.'
          : 'Não foi possível consultar o serviço de nomes on-chain agora. Verifique sua conexão ou use o endereço 0x.',
      };
    }
  }

  /**
   * Evaluates whether a recipient address is already trusted/known by the user
   * (either saved in their Contact Book or present in past confirmed outgoing transfers).
   */
  public static evaluateRecipientTrust(address: string, profileKey?: string): RecipientTrustStatus {
    if (!address || !isAddress(address as `0x${string}`)) {
      return { isKnown: false, previousTransferCount: 0 };
    }

    const cleanAddr = address.trim().toLowerCase();
    const contacts = StorageService.getContacts(profileKey);
    const matchedContact = contacts.find((c) => c.address.toLowerCase() === cleanAddr);

    const ledger = StorageService.getOnChainLedger(profileKey);
    const pastOutgoing = ledger.filter(
      (entry) =>
        entry.type === 'send' &&
        entry.status === 'confirmed' &&
        (entry.toAddress || '').toLowerCase() === cleanAddr
    );

    const isKnown = Boolean(matchedContact || pastOutgoing.length > 0);
    return {
      isKnown,
      contact: matchedContact,
      previousTransferCount: pastOutgoing.length,
      lastTransferDate: pastOutgoing[0]?.timestamp,
    };
  }
}
