import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseUnits,
  formatUnits,
  Hex,
  keccak256,
  toHex,
  isAddress,
  recoverTypedDataAddress,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { APP_VERSION } from './src/config/version';

const app = express();
// Trust only the first reverse proxy hop (Cloud Run / App Hosting), preventing X-Forwarded-For client spoofing
app.set('trust proxy', 1);

// Resolve port:
// 1. Command-line argument (--port <p>)
// 2. Production PORT env (Cloud Run / App Hosting, e.g. 8080)
// 3. Container DEFAULT_APP_PORT env (3000)
// 4. Default 8080 for production containers, 3000 for standard local development
function resolvePort(): number {
  const args = process.argv;
  const portFlagIdx = args.indexOf('--port');
  if (portFlagIdx !== -1 && args[portFlagIdx + 1]) {
    const parsed = parseInt(args[portFlagIdx + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.DEFAULT_APP_PORT) {
    const parsed = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return process.env.NODE_ENV === 'production' ? 8080 : 3000;
}

// Safely resolve execution directory in both ESM (dev via tsx) and CJS (compiled esbuild bundle)
const getRuntimeDir = (): string => {
  return typeof __dirname !== 'undefined' ? __dirname : process.cwd();
};

const PORT = resolvePort();

// OWASP Expert Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=*, microphone=(), geolocation=(), payment=()');
  res.removeHeader('X-Powered-By');
  next();
});

app.use(express.json({ limit: '1mb' }));

// Official Base USDC Contract Addresses
// -------------------------------------------------------------
// OFFICIAL CONTRACTS: USDC & CIRCLE PAYMASTER ON BASE
// -------------------------------------------------------------
const BASE_USDC_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const BASE_USDC_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

// Official Circle Paymaster contracts (ERC-4337) on Base:
// Permissionless: The user pays gas directly with their own USDC (0 ETH required and NO policyId).
export const CIRCLE_PAYMASTER_BASE_V07 = '0x6C973eBe80dCD8660841D4356bf15c32460271C9' as const;
export const CIRCLE_PAYMASTER_BASE_V08 = '0x0578cFB241215b77442a541325d6A4E6dFE700Ec' as const;
export const CIRCLE_PAYMASTER_BASE_SEPOLIA = '0x31BE08D380A21fc740883c0BC434FcFc88740b58' as const;

const BASE_RPC = 'https://mainnet.base.org';
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

// Configured addresses specified by developer (configurable via environment variables)
export const EXPECTED_GAS_RELAYER = (process.env.EXPECTED_GAS_RELAYER || '0x31b7BafB5Bf4ab3D892610Ae7C9cA45BdBc45233') as `0x${string}`;
export const DEFAULT_DEV_FEE_RECIPIENT = (process.env.DEV_FEE_RECIPIENT_ADDRESS || '0xD4875cCF87Efb7DDD8dF7787aE4094d5CD2C71De') as `0x${string}`;

// -------------------------------------------------------------
// MANDATORY SECURITY: PAYMASTER PROXY & CONTRACT ALLOWLIST
// Strict protection against balance draining and replay attacks.
// Only official USDC and Circle Paymaster contracts on Base are authorized.
// -------------------------------------------------------------
export const ALLOWED_SPONSORED_CONTRACTS = new Set([
  BASE_USDC_MAINNET.toLowerCase(), // 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (Base Mainnet Native USDC)
  BASE_USDC_SEPOLIA.toLowerCase(), // 0x036CbD53842c5426634e7929541eC2318f3dCF7e (Base Sepolia USDC)
  CIRCLE_PAYMASTER_BASE_V07.toLowerCase(), // 0x6C973eBe80dCD8660841D4356bf15c32460271C9 (Circle Paymaster v0.7 Base)
  CIRCLE_PAYMASTER_BASE_V08.toLowerCase(), // 0x0578cFB241215b77442a541325d6A4E6dFE700Ec (Circle Paymaster v0.8 Base)
  CIRCLE_PAYMASTER_BASE_SEPOLIA.toLowerCase(), // 0x31BE08D380A21fc740883c0BC434FcFc88740b58 (Circle Paymaster Base Sepolia)
]);

// Circle Paymaster Configuration (Permissionless - No Policy ID needed)
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY?.trim();
const isCirclePaymasterActive = Boolean(CIRCLE_API_KEY && CIRCLE_API_KEY.length > 5);

// Anti-Drain Protection / Dual Rate Limiting (IP + senderAddress, max 15 req/min) and Memory Protection (DoS)
const sponsorshipRateLimit = new Map<string, { count: number; resetTime: number }>();
const MAX_RATE_LIMIT_KEYS = 5000;
let lastRateLimitPurge = Date.now();

function purgeExpiredRateLimits(now: number): void {
  if (now - lastRateLimitPurge < 30000 && sponsorshipRateLimit.size < MAX_RATE_LIMIT_KEYS) {
    return;
  }
  lastRateLimitPurge = now;
  for (const [key, entry] of sponsorshipRateLimit.entries()) {
    if (now > entry.resetTime) {
      sponsorshipRateLimit.delete(key);
    }
  }
  // If map still hits ceiling under volumetric attack, remove oldest entries (FIFO)
  if (sponsorshipRateLimit.size >= MAX_RATE_LIMIT_KEYS) {
    const excess = sponsorshipRateLimit.size - MAX_RATE_LIMIT_KEYS + 500;
    let removed = 0;
    for (const key of sponsorshipRateLimit.keys()) {
      sponsorshipRateLimit.delete(key);
      removed++;
      if (removed >= excess) break;
    }
  }
}

function incrementRateKey(key: string, now: number, maxRequests: number, windowMs: number): boolean {
  const record = sponsorshipRateLimit.get(key);
  if (!record || now > record.resetTime) {
    sponsorshipRateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count += 1;
  return true;
}

function checkSponsorshipRateLimit(
  clientIp: string,
  senderAddress?: string,
  maxRequests = 15,
  windowMs = 60000
): boolean {
  const now = Date.now();
  purgeExpiredRateLimits(now);

  const normalizedIp = `ip:${(clientIp || 'unknown').trim().toLowerCase()}`;
  const ipAllowed = incrementRateKey(normalizedIp, now, maxRequests, windowMs);

  let senderAllowed = true;
  if (senderAddress && typeof senderAddress === 'string' && senderAddress.trim()) {
    const normalizedSender = `addr:${senderAddress.trim().toLowerCase()}`;
    senderAllowed = incrementRateKey(normalizedSender, now, maxRequests, windowMs);
  }

  return ipAllowed && senderAllowed;
}

const USDC_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
  'function authorizationState(address authorizer, bytes32 nonce) view returns (bool)',
]);

// -------------------------------------------------------------
// Helper: Resolve or Create Relayer Account
// -------------------------------------------------------------
function resolveRelayerKeyFilePath(): string {
  // Store generated ephemeral relayer key in OS temp directory or explicit env path, never root project folder
  if (process.env.RELAYER_KEY_FILE) return process.env.RELAYER_KEY_FILE;
  return path.join(os.tmpdir(), '.cofre_relayer_key');
}

const RELAYER_KEY_FILE = resolveRelayerKeyFilePath();

function getRelayerPrivateKey(): Hex {
  const envKey = process.env.RELAYER_PRIVATE_KEY?.trim();
  if (envKey && envKey.startsWith('0x') && envKey.length === 66) {
    return envKey as Hex;
  }

  // Check persistent file fallback
  if (fs.existsSync(RELAYER_KEY_FILE)) {
    try {
      try {
        fs.chmodSync(RELAYER_KEY_FILE, 0o600);
      } catch {
        // ignore chmod warning on non-POSIX filesystems
      }
      const savedKey = fs.readFileSync(RELAYER_KEY_FILE, 'utf-8').trim();
      if (savedKey.startsWith('0x') && savedKey.length === 66) {
        return savedKey as Hex;
      }
    } catch {
      // continue to generate
    }
  }

  // Generate fallback local relayer wallet with strict owner-only permissions (0o600)
  const newKey = generatePrivateKey();
  try {
    fs.writeFileSync(RELAYER_KEY_FILE, newKey, { encoding: 'utf-8', mode: 0o600 });
  } catch (err) {
    console.warn('Could not write .relayer_key file:', err);
  }
  return newKey;
}

const isEnvKeyProvided = Boolean(process.env.RELAYER_PRIVATE_KEY?.trim());
const relayerPrivateKey = getRelayerPrivateKey();
const relayerAccount = privateKeyToAccount(relayerPrivateKey);

console.log(`[Relayer] Carteira despachante (ETH Gás): ${relayerAccount.address}`);
console.log(`[Relayer] Carteira de Lucros DEV (USDC): ${process.env.DEV_FEE_RECIPIENT_ADDRESS || DEFAULT_DEV_FEE_RECIPIENT}`);
if (relayerAccount.address.toLowerCase() === EXPECTED_GAS_RELAYER.toLowerCase()) {
  console.log(`[Relayer] ✅ Conectado com a carteira oficial de gás: ${EXPECTED_GAS_RELAYER}`);
} else if (!isEnvKeyProvided) {
  console.log(`[Relayer] ℹ️ Aguardando RELAYER_PRIVATE_KEY no ambiente para conectar com a carteira ${EXPECTED_GAS_RELAYER}`);
}

// -------------------------------------------------------------
// 1. API: Health & Relayer Status
// -------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC),
  });

  const targetGasWallet = EXPECTED_GAS_RELAYER;
  const devFeeRecipient = (process.env.DEV_FEE_RECIPIENT_ADDRESS?.trim() || DEFAULT_DEV_FEE_RECIPIENT) as `0x${string}`;
  let relayerEthBalance = '0';
  let targetEthBalance = '0';
  let hasEthBalance = false;

  try {
    const balWei = await publicClient.getBalance({ address: relayerAccount.address });
    relayerEthBalance = formatUnits(balWei, 18);
    const targetBalWei = await publicClient.getBalance({ address: targetGasWallet });
    targetEthBalance = formatUnits(targetBalWei, 18);
    hasEthBalance = balWei > BigInt(30000000000000); // > 0.00003 ETH
  } catch (err) {
    console.warn('Erro ao consultar saldo do Relayer:', err);
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    network: 'base',
    relayerAddress: relayerAccount.address,
    expectedGasWallet: targetGasWallet,
    devFeeRecipient,
    isOfficialGasWalletLoaded: relayerAccount.address.toLowerCase() === targetGasWallet.toLowerCase(),
    relayerEthBalance,
    targetGasWalletEthBalance: targetEthBalance,
    hasEthBalance,
    feeUsdc: parseFloat(process.env.RELAYER_FEE_USDC || '0.02'),
  });
});

// App Version Endpoint (No-Cache): Allows instant PWA client-side version checks and auto-refresh
app.get('/api/version', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Read current package version & build time
  let appVersion = APP_VERSION;
  try {
    const versionFilePath = path.join(process.cwd(), 'src', 'config', 'version.ts');
    if (fs.existsSync(versionFilePath)) {
      const content = fs.readFileSync(versionFilePath, 'utf-8');
      const match = content.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
      if (match && match[1]) {
        appVersion = match[1];
      }
    }
  } catch (err) {
    console.warn('[Server] Falha ao ler versão dinâmica:', err);
  }

  res.json({
    version: appVersion,
    timestamp: Date.now(),
    buildId: process.env.BUILD_ID || `build-${appVersion}`,
  });
});

// Firebase Web App Config Endpoint (Runtime Container Fallback)
app.get('/api/firebase-config', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  let webappConfig: Record<string, string> = {};
  if (process.env.FIREBASE_WEBAPP_CONFIG) {
    try {
      webappConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    } catch {}
  }
  const config = {
    apiKey: (process.env.VITE_FIREBASE_API_KEY || webappConfig.apiKey || '').trim(),
    authDomain: (process.env.VITE_FIREBASE_AUTH_DOMAIN || webappConfig.authDomain || '').trim(),
    projectId: (process.env.VITE_FIREBASE_PROJECT_ID || webappConfig.projectId || '').trim(),
    storageBucket: (process.env.VITE_FIREBASE_STORAGE_BUCKET || webappConfig.storageBucket || '').trim(),
    messagingSenderId: (process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || webappConfig.messagingSenderId || '').trim(),
    appId: (process.env.VITE_FIREBASE_APP_ID || webappConfig.appId || '').trim(),
    firestoreDatabaseId: (process.env.VITE_FIREBASE_DATABASE_ID || webappConfig.firestoreDatabaseId || '(default)').trim(),
  };
  res.json({
    configured: Boolean(config.apiKey && config.projectId),
    config,
  });
});

app.get('/api/paymaster/config', async (req, res) => {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC),
  });

  const targetGasWallet = EXPECTED_GAS_RELAYER;
  const devFeeRecipient = (process.env.DEV_FEE_RECIPIENT_ADDRESS?.trim() || DEFAULT_DEV_FEE_RECIPIENT) as `0x${string}`;
  let relayerEthBalance = '0';
  let targetEthBalance = '0';
  let hasEthBalance = false;

  try {
    const balWei = await publicClient.getBalance({ address: relayerAccount.address });
    relayerEthBalance = formatUnits(balWei, 18);
    const targetBalWei = await publicClient.getBalance({ address: targetGasWallet });
    targetEthBalance = formatUnits(targetBalWei, 18);
    hasEthBalance = balWei > BigInt(30000000000000);
  } catch (err) {
    console.warn('Erro ao consultar saldo do Relayer:', err);
  }

  const feeUsdc = parseFloat(process.env.RELAYER_FEE_USDC || '0.02');
  const isOfficial = relayerAccount.address.toLowerCase() === targetGasWallet.toLowerCase();

  res.json({
    enabled: true,
    provider: isCirclePaymasterActive ? 'circle_paymaster' : 'relayer_eip3009',
    network: 'base',
    circlePaymasterActive: isCirclePaymasterActive,
    isPermissionless: true,
    circlePaymasterContract: CIRCLE_PAYMASTER_BASE_V07,
    allowlist: Array.from(ALLOWED_SPONSORED_CONTRACTS),
    security: {
      proxyActive: true,
      allowlistEnforced: true,
      rateLimitEnforced: true,
      noEthRequired: true,
      contract: BASE_USDC_MAINNET,
      description: 'Circle Paymaster Oficial na Base (Permissionless: Usuário paga taxa com o próprio USDC, sem necessidade de Policy ID ou ETH).',
    },
    relayerAddress: relayerAccount.address,
    expectedGasWallet: targetGasWallet,
    devFeeRecipient,
    isOfficialGasWalletLoaded: isOfficial,
    relayerEthBalance,
    targetGasWalletEthBalance: targetEthBalance,
    hasEthBalance,
    feeUsdc,
    gasToken: 'USDC',
    message: isCirclePaymasterActive
      ? `Circle Paymaster ativo na Base (Permissionless). O cliente paga o gás diretamente com o próprio saldo de USDC dele (0 ETH e sem Policy ID).`
      : `Circle Paymaster oficial ativo na Base (Permissionless - sem necessidade de chaves privadas ou ETH).`,
  });
});

// -------------------------------------------------------------
// PAYMASTER PROXY: Secure Proxy for Paymaster / Gas Station Calls
// Keeps CIRCLE_API_KEY strictly concealed on server and
// enforces Allowlist validation across all incoming requests.
// -------------------------------------------------------------
app.post('/api/paymaster/proxy', async (req, res) => {
  try {
    // Blocks JSON-RPC batching attacks or malformed payloads
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Segurança: Payload inválido. Requisições em lote (JSON-RPC batch arrays) não são permitidas.',
      });
    }

    const { targetContract, senderAddress } = req.body;

    // 1. Mandatory and Strict Contract Allowlist Validation (Fail-Closed: rejects if empty or missing)
    const contractCandidate = String(targetContract || req.body?.to || req.body?.contractAddress || '').trim().toLowerCase();
    if (!contractCandidate || !ALLOWED_SPONSORED_CONTRACTS.has(contractCandidate)) {
      console.warn(`[Paymaster Proxy] 🚨 Bloqueio de segurança: Contrato ausente ou não autorizado '${contractCandidate || 'vazio'}'`);
      return res.status(403).json({
        success: false,
        error: `Segurança: O contrato '${contractCandidate || 'indefinido'}' não está na Allowlist de Patrocínio. Somente o contrato oficial do USDC na Base é autorizado.`,
      });
    }

    // 2. Anti-Drain Protection (Dual Rate Limiting: IP + Wallet Address)
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown_ip';
    if (!checkSponsorshipRateLimit(clientIp, senderAddress)) {
      return res.status(429).json({
        success: false,
        error: 'Limite de requisições de patrocínio excedido temporariamente. Aguarde alguns segundos.',
      });
    }

    if (!isCirclePaymasterActive) {
      return res.status(503).json({
        success: false,
        error: 'Circle Paymaster não configurado. Defina CIRCLE_API_KEY nas variáveis de ambiente.',
      });
    }

    // Forwards authenticated request to Circle Web3 Services using server key
    const circleEndpoint = 'https://api.circle.com/v1/w3s/paymaster';
    const circleResponse = await fetch(circleEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(10000),
    });

    const data = await circleResponse.json();
    return res.status(circleResponse.status).json(data);
  } catch (proxyErr: any) {
    console.error('[Paymaster Proxy] Erro no encaminhamento para Circle:', proxyErr);
    return res.status(500).json({
      success: false,
      error: proxyErr.message || 'Falha na comunicação com a Paymaster da Circle.',
    });
  }
});

// -------------------------------------------------------------
// Real-time USDC & USD to BRL Exchange Rate API
// -------------------------------------------------------------
let cachedExchangeRate: {
  rate: number;
  usdcRate: number;
  usdRate: number;
  timestamp: number;
  source: string;
} | null = null;

app.get('/api/exchange-rate', async (req, res) => {
  const now = Date.now();
  // Cache for 60 seconds to provide snappy responses
  if (cachedExchangeRate && now - cachedExchangeRate.timestamp < 60000 && req.query.force !== 'true') {
    return res.json({
      success: true,
      ...cachedExchangeRate,
      cached: true,
    });
  }

  let rate = 5.11;
  let usdcRate = 5.11;
  let usdRate = 5.08;
  let source = 'Coinbase USDC/BRL (Base Market)';

  try {
    const coinbaseRes = await fetch('https://api.coinbase.com/v2/prices/USDC-BRL/spot', {
      headers: { 'User-Agent': 'CofreAdmin/1.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (coinbaseRes.ok) {
      const data = await coinbaseRes.json();
      const fetchedAmount = parseFloat(data?.data?.amount);
      if (!isNaN(fetchedAmount) && fetchedAmount > 1 && fetchedAmount < 30) {
        usdcRate = fetchedAmount;
        rate = fetchedAmount;
        source = 'Coinbase USDC/BRL (Base L2)';
      }
    }
  } catch (err) {
    console.warn('[ExchangeRate] Falha ao consultar Coinbase USDC-BRL:', err);
  }

  try {
    const usdRes = await fetch('https://api.coinbase.com/v2/prices/USD-BRL/spot', {
      signal: AbortSignal.timeout(3000),
    });
    if (usdRes.ok) {
      const data = await usdRes.json();
      const fetchedUsd = parseFloat(data?.data?.amount);
      if (!isNaN(fetchedUsd) && fetchedUsd > 1) {
        usdRate = fetchedUsd;
      }
    }
  } catch {
    // optional reference
  }

  if (rate <= 1 || isNaN(rate)) {
    try {
      const erRes = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: AbortSignal.timeout(4000),
      });
      if (erRes.ok) {
        const data = await erRes.json();
        const brl = parseFloat(data?.rates?.BRL);
        if (!isNaN(brl) && brl > 1) {
          rate = brl;
          usdRate = brl;
          usdcRate = brl;
          source = 'Open Exchange Rates (Global)';
        }
      }
    } catch (e) {
      console.warn('[ExchangeRate] Falha no fallback OpenER:', e);
    }
  }

  cachedExchangeRate = {
    rate: parseFloat(rate.toFixed(4)),
    usdcRate: parseFloat(usdcRate.toFixed(4)),
    usdRate: parseFloat(usdRate.toFixed(4)),
    timestamp: now,
    source,
  };

  return res.json({
    success: true,
    ...cachedExchangeRate,
    cached: false,
  });
});

// -------------------------------------------------------------
// HTML / JSON / OAuth State / Host Header Hardening Utilities
// -------------------------------------------------------------
function escapeHtml(unsafe: unknown): string {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const VALID_HOST_REGEX = /^[a-zA-Z0-9.-]+(:[0-9]{1,5})?$/;

function resolveSafeAppUrl(req: express.Request): string {
  const configuredAppUrl = process.env.APP_URL?.trim();
  if (configuredAppUrl) {
    try {
      const parsed = new URL(configuredAppUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin;
      }
    } catch {
      // fallback to validated request host
    }
  }

  const rawProto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim().toLowerCase();
  const safeProto = rawProto === 'http' || rawProto === 'https' ? rawProto : 'https';
  const rawHost = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();

  if (!rawHost || !VALID_HOST_REGEX.test(rawHost) || rawHost.includes('..')) {
    return `http://localhost:${PORT}`;
  }

  return `${safeProto}://${rawHost}`;
}

const oauthHmacSecret =
  process.env.OAUTH_STATE_SECRET?.trim() ||
  process.env.DISCORD_CLIENT_SECRET?.trim() ||
  relayerPrivateKey;

const consumedOAuthStates = new Map<string, number>();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOAuthState(): string {
  const now = Date.now();
  if (consumedOAuthStates.size > 2000) {
    for (const [k, exp] of consumedOAuthStates.entries()) {
      if (now > exp) consumedOAuthStates.delete(k);
    }
  }
  const nonce = crypto.randomBytes(32).toString('hex');
  const payload = `${nonce}.${now}`;
  const signature = crypto.createHmac('sha256', oauthHmacSecret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifyOAuthState(stateParam: unknown): boolean {
  if (typeof stateParam !== 'string' || !stateParam) return false;
  const parts = stateParam.split('.');
  if (parts.length !== 3) return false;

  const [nonce, timestampStr, receivedSig] = parts;
  if (!/^[a-f0-9]{64}$/.test(nonce) || !/^[0-9]+$/.test(timestampStr) || !/^[a-f0-9]{64}$/.test(receivedSig)) {
    return false;
  }

  const issuedAt = parseInt(timestampStr, 10);
  const now = Date.now();
  if (isNaN(issuedAt) || now - issuedAt > OAUTH_STATE_TTL_MS || issuedAt > now + 60000) {
    return false;
  }

  // Blocks state reuse / replay attacks
  if (consumedOAuthStates.has(nonce)) {
    return false;
  }

  const payload = `${nonce}.${timestampStr}`;
  const expectedSig = crypto.createHmac('sha256', oauthHmacSecret).update(payload).digest('hex');

  const receivedBuf = Buffer.from(receivedSig, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (receivedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
    return false;
  }

  consumedOAuthStates.set(nonce, now + OAUTH_STATE_TTL_MS);
  return true;
}

// -------------------------------------------------------------
// Discord OAuth2 API Endpoints
// Enables Discord sign-in while preserving 100% of app structure
// -------------------------------------------------------------
app.get('/api/auth/discord/url', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const appUrl = resolveSafeAppUrl(req);
  const redirectUri = `${appUrl}/api/auth/discord/callback`;

  if (!clientId) {
    return res.json({
      configured: false,
      redirectUri,
      message: 'DISCORD_CLIENT_ID e DISCORD_CLIENT_SECRET ainda não configurados nas variáveis de ambiente.',
    });
  }

  const state = generateOAuthState();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state,
    prompt: 'consent',
  });

  const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  return res.json({
    configured: true,
    url: authUrl,
    redirectUri,
    state,
  });
});

app.get(['/api/auth/discord/callback', '/api/auth/discord/callback/'], async (req, res) => {
  const { code, error, error_description, state } = req.query;
  const rawState = typeof state === 'string' ? state : '';

  const renderOAuthErrorPage = (rawMessage: string, titleText = 'Autorização Discord Cancelada') => {
    const safeTitle = escapeHtml(titleText);
    const safeMsgHtml = escapeHtml(rawMessage);
    const errorPayloadJson = safeJsonForScript({
      type: 'OAUTH_AUTH_ERROR',
      provider: 'discord',
      state: rawState,
      error: String(rawMessage),
    });

    return res.send(`<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle} • CofreAdmin</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; text-align: center; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 90vh; margin: 0; }
      .card { background: #1e293b; border: 2px solid #334155; border-radius: 20px; padding: 28px; max-width: 420px; width: 100%; margin: 0 auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    </style>
  </head>
  <body>
    <div class="card">
      <div style="font-size:32px;margin-bottom:10px;">👾</div>
      <h3 style="color:#f43f5e;margin:0 0 8px 0;font-size:18px;">${safeTitle}</h3>
      <p style="font-size:13px;color:#cbd5e1;margin:0 0 12px 0;line-height:1.5;">${safeMsgHtml}</p>
      <p style="font-size:11px;color:#94a3b8;margin:0;">Fechando janela em instantes...</p>
    </div>
    <script>
      (function() {
        var errorPayload = ${errorPayloadJson};
        var targetOrigin = window.location.origin;
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(errorPayload, targetOrigin);
          }
        } catch (e) {}
        setTimeout(function() {
          try { window.close(); } catch (e) {}
        }, 1500);
      })();
    </script>
  </body>
</html>`);
  };

  if (error || !code) {
    const errorKey = String(error || 'missing_code');
    const isCancelledOrDenied = errorKey === 'access_denied';
    const friendlyMsg = isCancelledOrDenied
      ? 'Acesso cancelado pelo usuário ou autorização não concedida.'
      : String(error_description || error || 'Código de autorização não recebido.');

    return renderOAuthErrorPage(friendlyMsg, 'Autorização Discord Cancelada');
  }

  // Mandatory Anti-CSRF cryptographic state verification
  if (!verifyOAuthState(rawState)) {
    console.warn('[Discord OAuth] 🚨 Bloqueio CSRF: Parâmetro state inválido, expirado ou ausente.');
    return renderOAuthErrorPage(
      'Sessão de autenticação inválida ou expirada (proteção anti-CSRF). Inicie o login novamente pelo CofreAdmin.',
      'Verificação de Segurança Falhou'
    );
  }

  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  const appUrl = resolveSafeAppUrl(req);
  const redirectUri = `${appUrl}/api/auth/discord/callback`;

  try {
    const tokenParams = new URLSearchParams({
      client_id: clientId || '',
      client_secret: clientSecret || '',
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Discord OAuth] Token exchange error:', errText);
      throw new Error(`Falha ao obter token do Discord (${tokenRes.status}). Verifique o Client Secret.`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetches user profile from Discord
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!userRes.ok) {
      throw new Error(`Falha ao carregar perfil do Discord (${userRes.status})`);
    }

    const discordUser = await userRes.json();
    const cleanId = String(discordUser.id || '').replace(/[^0-9]/g, '');
    const cleanAvatarHash = String(discordUser.avatar || '').replace(/[^a-zA-Z0-9_]/g, '');
    const avatarUrl = cleanAvatarHash
      ? `https://cdn.discordapp.com/avatars/${cleanId}/${cleanAvatarHash}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0', 10) % 5}.png`;

    const userPayload = {
      id: cleanId,
      email: discordUser.email || `${discordUser.username}@discord.user`,
      name: discordUser.global_name || discordUser.username,
      username: discordUser.username,
      avatarUrl,
    };

    const safeUserNameHtml = escapeHtml(userPayload.name);
    const authPayloadJson = safeJsonForScript({
      type: 'OAUTH_AUTH_SUCCESS',
      provider: 'discord',
      state: rawState,
      user: userPayload,
    });

    return res.send(`<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Discord Autenticado • CofreAdmin</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; text-align: center; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 90vh; margin: 0; }
      .card { background: #1e293b; border: 2px solid #334155; border-radius: 20px; padding: 28px; max-width: 420px; width: 100%; margin: 0 auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
      .btn { display: inline-block; margin-top: 14px; background: #5865F2; color: white; border: 2px solid #818cf8; border-radius: 12px; padding: 10px 20px; font-weight: 800; font-size: 13px; text-decoration: none; cursor: pointer; }
      .btn:active { transform: translate(1px, 1px); }
    </style>
  </head>
  <body>
    <div class="card">
      <div style="font-size:36px;margin-bottom:10px;">🎮</div>
      <h3 style="color:#818cf8;margin:0 0 8px 0;font-size:18px;">Autenticado com Discord!</h3>
      <p style="font-size:13px;color:#e2e8f0;margin:0 0 10px 0;line-height:1.4;">Olá, <strong>${safeUserNameHtml}</strong>. Autorização confirmada com sucesso!</p>
      <p style="font-size:11px;color:#94a3b8;margin:0 0 14px 0;">Sincronizando seus dados com o CofreAdmin...</p>
      <button class="btn" id="btn-finish" onclick="dispatchAndClose()">Concluir e Fechar Janela</button>
    </div>
    <script>
      var authPayload = ${authPayloadJson};
      var targetOrigin = window.location.origin;

      function dispatchAuth() {
        try {
          localStorage.setItem('cofre_discord_auth_success', JSON.stringify({
            data: authPayload,
            timestamp: Date.now()
          }));
        } catch (e) {}

        try {
          sessionStorage.setItem('cofre_discord_auth_success', JSON.stringify({
            data: authPayload,
            timestamp: Date.now()
          }));
        } catch (e) {}

        try {
          if (window.BroadcastChannel) {
            var bc = new BroadcastChannel('cofre_discord_oauth');
            bc.postMessage(authPayload);
            setTimeout(function() {
              try { bc.close(); } catch(e) {}
            }, 6000);
          }
        } catch (e) {}

        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(authPayload, targetOrigin);
          }
        } catch (e) {}
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(authPayload, targetOrigin);
          }
        } catch (e) {}
        try {
          if (window.top && window.top !== window) {
            window.top.postMessage(authPayload, targetOrigin);
          }
        } catch (e) {}
      }

      function dispatchAndClose() {
        dispatchAuth();
        setTimeout(function() {
          try {
            window.close();
          } catch (e) {}
          if (window.opener == null && window.parent === window) {
            window.location.href = '/';
          }
        }, 200);
      }

      dispatchAuth();
      setTimeout(dispatchAuth, 400);
      setTimeout(function() {
        try {
          window.close();
        } catch (e) {}
      }, 1400);
    </script>
  </body>
</html>`);
  } catch (err: any) {
    console.error('[Discord OAuth] Callback exception:', err);
    return renderOAuthErrorPage(
      err?.message || 'Ocorreu um erro ao processar o login com Discord.',
      'Erro na Autenticação Discord'
    );
  }
});

// -------------------------------------------------------------
// 2. API: Estimate Gas and Fees in USDC
// -------------------------------------------------------------
app.post('/api/paymaster/estimate', async (req, res) => {
  try {
    const amount = typeof req.body?.amount === 'number' && req.body.amount > 0 ? req.body.amount : 0;
    // App protocol fee: 0.2% with $0.05 minimum
    const devFeeUsdc = amount > 0 ? parseFloat(Math.max(amount * 0.002, 0.05).toFixed(4)) : 0.05;
    // Gas reimbursement fee in USDC
    const gasFeeUsdc = parseFloat(process.env.RELAYER_FEE_USDC || '0.02');
    const devFeeRecipient = (process.env.DEV_FEE_RECIPIENT_ADDRESS?.trim() || DEFAULT_DEV_FEE_RECIPIENT);

    res.json({
      success: true,
      gasFeeUsdc,
      devFeeUsdc,
      totalFeeUsdc: parseFloat((devFeeUsdc + gasFeeUsdc).toFixed(4)),
      devFeeRecipient,
      gasRelayerAddress: relayerAccount.address,
      network: 'base',
      gasToken: 'USDC',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Falha ao estimar taxa',
      gasFeeUsdc: 0.02,
      devFeeUsdc: 0.05,
    });
  }
});

// Concurrency control against Race Conditions / Double-Spend and Relayer Nonce collision
const activeSenderTransfers = new Set<string>();
let relayerExecutionQueue: Promise<unknown> = Promise.resolve();

function withRelayerExecutionLock<T>(task: () => Promise<T>): Promise<T> {
  const next = relayerExecutionQueue.then(task, task);
  relayerExecutionQueue = next.catch(() => {});
  return next;
}

function safeParseUint256(val: unknown): bigint | null {
  if (typeof val === 'bigint') return val >= BigInt(0) ? val : null;
  if (typeof val === 'number') {
    if (!Number.isSafeInteger(val) || val < 0) return null;
    return BigInt(val);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    try {
      return BigInt(trimmed);
    } catch {
      return null;
    }
  }
  return null;
}

function isValidBytes32Hex(val: unknown): val is `0x${string}` {
  return typeof val === 'string' && /^0x[a-fA-F0-9]{64}$/.test(val.trim());
}

// -------------------------------------------------------------
// 3. API: Execute Gasless USDC Transfer via Relayer (EIP-3009)
// -------------------------------------------------------------
app.post('/api/paymaster/transfer', async (req, res) => {
  let lockedSenderKey: string | null = null;
  try {
    // Immediate scrubbing of any private keys accidentally submitted by modified clients
    if (req.body && typeof req.body === 'object' && 'privateKey' in req.body) {
      delete req.body.privateKey;
    }

    const {
      senderAddress,
      recipientAddress,
      amount,
      network = 'base',
      protocolFee: requestedProtocolFee,
      gasFee: requestedGasFee,
    } = req.body || {};

    if (
      !senderAddress ||
      !recipientAddress ||
      typeof senderAddress !== 'string' ||
      typeof recipientAddress !== 'string' ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos: informe endereço de envio, destinatário e valor numérico positivo em USDC.',
      });
    }

    if (!isAddress(senderAddress) || !isAddress(recipientAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Segurança: Endereço de remetente ou destinatário inválido na rede Base.',
      });
    }

    // ASSET LOSS PREVENTION:
    // 1. Blocks transfers to self (avoids burning fees unnecessarily)
    if (senderAddress.toLowerCase() === recipientAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Segurança: O endereço de destino não pode ser igual ao endereço de envio.',
      });
    }

    // 2. Blocks transfers to zero address or burn address (irreversible loss of assets)
    const lowerRecipient = recipientAddress.toLowerCase();
    if (
      lowerRecipient === '0x0000000000000000000000000000000000000000' ||
      lowerRecipient === '0x000000000000000000000000000000000000dead'
    ) {
      return res.status(400).json({
        success: false,
        error: 'Segurança: Envio bloqueado para endereço zero/queima. Esse destino destruiria seus ativos permanentemente.',
      });
    }

    // -------------------------------------------------------------
    // SECURITY MEASURE: AUTHORITATIVE FEE FLOOR ON SERVER
    // Prevents an attacker from passing protocolFee: 0.0001 or gasFee: 0.0001 to bypass fees
    // -------------------------------------------------------------
    const calculatedDevFee = parseFloat(Math.max(amount * 0.002, 0.05).toFixed(4));
    const devFeeUsdc =
      typeof requestedProtocolFee === 'number' && Number.isFinite(requestedProtocolFee) && requestedProtocolFee >= calculatedDevFee
        ? parseFloat(requestedProtocolFee.toFixed(4))
        : calculatedDevFee;

    const envGasFee = parseFloat(process.env.RELAYER_FEE_USDC || '0.02');
    const gasFeeUsdc =
      typeof requestedGasFee === 'number' && Number.isFinite(requestedGasFee) && requestedGasFee >= envGasFee
        ? parseFloat(requestedGasFee.toFixed(4))
        : envGasFee;

    const totalRequiredUsdc = parseFloat((amount + devFeeUsdc + gasFeeUsdc).toFixed(4));

    const isMainnet = network === 'base';
    const chain = isMainnet ? base : baseSepolia;
    const usdcAddress = isMainnet ? BASE_USDC_MAINNET : BASE_USDC_SEPOLIA;
    const rpcUrl = isMainnet ? BASE_RPC : BASE_SEPOLIA_RPC;

    // -------------------------------------------------------------
    // SECURITY MEASURE 1: MANDATORY CONTRACT ALLOWLIST
    // -------------------------------------------------------------
    if (!ALLOWED_SPONSORED_CONTRACTS.has(usdcAddress.toLowerCase())) {
      console.warn(`[Paymaster Proxy] 🚨 Bloqueio: Contrato ${usdcAddress} fora da Allowlist.`);
      return res.status(403).json({
        success: false,
        error: `Segurança: O contrato ${usdcAddress} não está na Allowlist de Patrocínio. Apenas o USDC oficial na Base é autorizado.`,
      });
    }

    // -------------------------------------------------------------
    // SECURITY MEASURE 2: ANTI-DRAIN PROTECTION (DUAL RATE LIMITING: IP + WALLET)
    // -------------------------------------------------------------
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown_ip';
    if (!checkSponsorshipRateLimit(clientIp, senderAddress)) {
      console.warn(`[Paymaster Proxy] ⚠️ Rate limit de patrocínio excedido para IP ${clientIp} / Carteira: ${senderAddress}`);
      return res.status(429).json({
        success: false,
        error: 'Muitas transferências em sequência. Aguarde alguns segundos para nova operação para segurança dos seus fundos.',
      });
    }

    // -------------------------------------------------------------
    // SECURITY MEASURE 3: SENDER CONCURRENCY LOCK (ANTI-DOUBLE-SPEND)
    // -------------------------------------------------------------
    const normalizedSender = senderAddress.toLowerCase();
    if (activeSenderTransfers.has(normalizedSender)) {
      return res.status(429).json({
        success: false,
        error: 'Já existe uma transferência em processamento para esta carteira. Aguarde a confirmação on-chain antes de enviar novamente.',
      });
    }
    activeSenderTransfers.add(normalizedSender);
    lockedSenderKey = normalizedSender;

    const devFeeRecipient = (process.env.DEV_FEE_RECIPIENT_ADDRESS?.trim() || DEFAULT_DEV_FEE_RECIPIENT) as `0x${string}`;
    const parsedAmount = parseUnits(amount.toFixed(6), 6);
    const parsedDevFee = parseUnits(devFeeUsdc.toFixed(6), 6);
    const parsedGasFee = parseUnits(gasFeeUsdc.toFixed(6), 6);

    // -------------------------------------------------------------
    // SECURITY MEASURE 4: PRE-EXECUTION CRYPTOGRAPHIC VALIDATION OF 3 EIP-3009 AUTHORIZATIONS
    // Prevents malicious clients from omitting devFeeAuthorization / gasFeeAuthorization or submitting invalid signatures
    // -------------------------------------------------------------
    const clientAuth = req.body.authorization;
    const clientDevAuth = req.body.devFeeAuthorization;
    const clientGasAuth = req.body.gasFeeAuthorization;

    const parseAndValidateAuth = (
      rawAuth: any,
      expectedFrom: string,
      expectedTo: string,
      expectedMinValue: bigint,
      label: string
    ) => {
      if (!rawAuth || typeof rawAuth !== 'object') {
        throw new Error(`Segurança: Autorização EIP-3009 obrigatória ausente (${label}).`);
      }
      if (!isAddress(rawAuth.from) || rawAuth.from.toLowerCase() !== expectedFrom.toLowerCase()) {
        throw new Error(`Segurança: O remetente da autorização (${label}) difere da carteira autenticada.`);
      }
      if (!isAddress(rawAuth.to) || rawAuth.to.toLowerCase() !== expectedTo.toLowerCase()) {
        throw new Error(`Segurança: O destinatário da autorização (${label}) difere do endereço exigido.`);
      }
      const val = safeParseUint256(rawAuth.value);
      if (val === null || val < expectedMinValue) {
        throw new Error(`Segurança: O valor assinado na autorização (${label}) é inválido ou inferior ao exigido.`);
      }
      const validAfter = safeParseUint256(rawAuth.validAfter ?? 0);
      const validBefore = safeParseUint256(rawAuth.validBefore);
      const nowSec = BigInt(Math.floor(Date.now() / 1000));
      if (validAfter === null || validBefore === null || validAfter > nowSec + BigInt(60) || validBefore <= nowSec + BigInt(30)) {
        throw new Error(`Segurança: Janela de validade temporal (validAfter/validBefore) expirada ou inválida em (${label}).`);
      }
      if (!isValidBytes32Hex(rawAuth.nonce) || !isValidBytes32Hex(rawAuth.r) || !isValidBytes32Hex(rawAuth.s)) {
        throw new Error(`Segurança: Parâmetros criptográficos (nonce, r, s) malformados em (${label}).`);
      }
      const vNum = Number(rawAuth.v);
      if (vNum !== 27 && vNum !== 28) {
        throw new Error(`Segurança: Parâmetro de recuperação ECDSA (v) inválido em (${label}).`);
      }
      return {
        from: rawAuth.from as `0x${string}`,
        to: rawAuth.to as `0x${string}`,
        value: val,
        validAfter,
        validBefore,
        nonce: rawAuth.nonce.trim() as `0x${string}`,
        v: vNum,
        r: rawAuth.r.trim() as `0x${string}`,
        s: rawAuth.s.trim() as `0x${string}`,
      };
    };

    let auth1: ReturnType<typeof parseAndValidateAuth>;
    let auth2: ReturnType<typeof parseAndValidateAuth>;
    let auth3: ReturnType<typeof parseAndValidateAuth>;

    try {
      auth1 = parseAndValidateAuth(clientAuth, senderAddress, recipientAddress, parsedAmount, 'Transferência Principal');
      if (auth1.value !== parsedAmount) {
        throw new Error('Segurança: O valor assinado na transferência principal diverge do valor declarado.');
      }
      auth2 = parseAndValidateAuth(clientDevAuth, senderAddress, devFeeRecipient, parsedDevFee, 'Taxa de Protocolo');
      auth3 = parseAndValidateAuth(clientGasAuth, senderAddress, relayerAccount.address, parsedGasFee, 'Reembolso de Gás Relayer');
    } catch (validationErr: any) {
      return res.status(400).json({
        success: false,
        error: validationErr.message || 'Falha na validação estrutural das autorizações EIP-3009.',
      });
    }

    // Ensures all 3 nonces are strictly unique (prevents internal batch collision)
    const uniqueNonces = new Set([
      auth1.nonce.toLowerCase(),
      auth2.nonce.toLowerCase(),
      auth3.nonce.toLowerCase(),
    ]);
    if (uniqueNonces.size !== 3) {
      return res.status(400).json({
        success: false,
        error: 'Segurança: Os nonces criptográficos das autorizações EIP-3009 devem ser exclusivos e distintos.',
      });
    }

    // Cryptographically verifies all 3 EIP-712 ECDSA signatures BEFORE spending any Relayer ETH
    const chainId = isMainnet ? 8453 : 84532;
    const eip712Domain = {
      name: 'USD Coin',
      version: '2',
      chainId,
      verifyingContract: usdcAddress,
    } as const;
    const eip712Types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    } as const;

    const verifyAuthSignature = async (authObj: typeof auth1, label: string) => {
      const fullSignature = `0x${authObj.r.slice(2)}${authObj.s.slice(2)}${authObj.v.toString(16).padStart(2, '0')}` as Hex;
      const recoveredAddress = await recoverTypedDataAddress({
        domain: eip712Domain,
        types: eip712Types,
        primaryType: 'TransferWithAuthorization',
        message: {
          from: authObj.from,
          to: authObj.to,
          value: authObj.value,
          validAfter: authObj.validAfter,
          validBefore: authObj.validBefore,
          nonce: authObj.nonce,
        },
        signature: fullSignature,
      });
      if (recoveredAddress.toLowerCase() !== authObj.from.toLowerCase()) {
        throw new Error(`Segurança: Assinatura ECDSA EIP-712 inválida para (${label}).`);
      }
    };

    try {
      await Promise.all([
        verifyAuthSignature(auth1, 'Transferência Principal'),
        verifyAuthSignature(auth2, 'Taxa de Protocolo'),
        verifyAuthSignature(auth3, 'Reembolso de Gás Relayer'),
      ]);
    } catch (sigErr: any) {
      return res.status(400).json({
        success: false,
        error: sigErr.message || 'Segurança: Assinatura criptográfica EIP-3009 inválida.',
      });
    }

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // Parallel on-chain query: USDC balance, Relayer ETH balance, and state of the 3 nonces (Anti-Replay)
    const [usdcBalanceRaw, relayerEthBalanceWei, nonce1Used, nonce2Used, nonce3Used] = await Promise.all([
      (publicClient as any).readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [senderAddress as `0x${string}`],
      }) as Promise<bigint>,
      publicClient.getBalance({
        address: relayerAccount.address,
      }),
      (publicClient as any).readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'authorizationState',
        args: [auth1.from, auth1.nonce],
      }) as Promise<boolean>,
      (publicClient as any).readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'authorizationState',
        args: [auth2.from, auth2.nonce],
      }) as Promise<boolean>,
      (publicClient as any).readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'authorizationState',
        args: [auth3.from, auth3.nonce],
      }) as Promise<boolean>,
    ]);

    if (nonce1Used || nonce2Used || nonce3Used) {
      return res.status(400).json({
        success: false,
        error: 'Segurança Anti-Replay: Uma ou mais autorizações EIP-3009 já foram utilizadas anteriormente na blockchain Base.',
      });
    }

    const currentUsdc = parseFloat(formatUnits(usdcBalanceRaw, 6));
    if (currentUsdc < totalRequiredUsdc) {
      return res.status(400).json({
        success: false,
        error: `Saldo insuficiente de USDC na Base. Disponível: $${currentUsdc.toFixed(2)} USDC, Necessário: $${totalRequiredUsdc.toFixed(2)} USDC (sendo $${amount.toFixed(2)} de envio + $${devFeeUsdc.toFixed(2)} de taxa do app + $${gasFeeUsdc.toFixed(2)} de reembolso do gás).`,
      });
    }

    // Each Base tx costs ~0.000005 ETH (~$0.01). Require at least 0.000025 ETH
    const minEthRequiredWei = BigInt(25000000000000);
    if (relayerEthBalanceWei < minEthRequiredWei) {
      const isOfficial = relayerAccount.address.toLowerCase() === EXPECTED_GAS_RELAYER.toLowerCase();
      const guidance = isOfficial
        ? `A carteira de gás oficial (${EXPECTED_GAS_RELAYER}) precisa de saldo em ETH na Base (mínimo ~0.0005 a 0.001 ETH / cerca de R$ 5 a R$ 10). Envie uma pequena fração de ETH na Base para ${EXPECTED_GAS_RELAYER}.`
        : `A carteira despachante atual (${relayerAccount.address}) está sem ETH na Base. Para usar sua carteira de gás (${EXPECTED_GAS_RELAYER}), adicione a chave privada dela na variável RELAYER_PRIVATE_KEY e certifique-se de que ela tenha ~0.001 ETH na Base.`;

      return res.status(400).json({
        success: false,
        error: guidance,
        relayerAddress: relayerAccount.address,
        expectedGasWallet: EXPECTED_GAS_RELAYER,
        devFeeRecipient,
        relayerEthBalance: formatUnits(relayerEthBalanceWei, 18),
      });
    }

    // Executes on-chain broadcast serialized via Relayer mutex to avoid nonce collisions
    const txExecutionResult = await withRelayerExecutionLock(async () => {
      const relayerWalletClient = createWalletClient({
        account: relayerAccount,
        chain,
        transport: http(rpcUrl),
      });

      let relayerTxNonce = await publicClient.getTransactionCount({
        address: relayerAccount.address,
        blockTag: 'pending',
      });

      console.log(`[Relayer] Transmitindo envio de $${amount} USDC de ${auth1.from} para ${auth1.to} (nonce: ${relayerTxNonce})...`);

      const mainTxHash = await (relayerWalletClient as any).writeContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'transferWithAuthorization',
        args: [
          auth1.from,
          auth1.to,
          auth1.value,
          auth1.validAfter,
          auth1.validBefore,
          auth1.nonce,
          auth1.v,
          auth1.r,
          auth1.s,
        ],
        nonce: relayerTxNonce++,
      });

      console.log(`[Relayer] Transação principal transmitida: ${mainTxHash}`);

      let blockNumber = 0;
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: mainTxHash as `0x${string}`,
          timeout: 30000,
        });
        blockNumber = Number(receipt.blockNumber);

        if (receipt.status === 'reverted') {
          console.error(`[Relayer] 🚨 Transação de pagamento REVERTEU on-chain: ${mainTxHash}`);
          return {
            reverted: true as const,
            mainTxHash,
            blockNumber,
            devFeeTxHash: null,
            gasFeeTxHash: null,
          };
        }
      } catch (waitErr: any) {
        console.warn('[Relayer] Transação principal transmitida para a mempool da Base:', waitErr?.message || waitErr);
      }

      let devFeeTxHash: string | null = null;
      if (parsedDevFee > BigInt(0)) {
        try {
          devFeeTxHash = await (relayerWalletClient as any).writeContract({
            address: usdcAddress,
            abi: USDC_ABI,
            functionName: 'transferWithAuthorization',
            args: [
              auth2.from,
              auth2.to,
              auth2.value,
              auth2.validAfter,
              auth2.validBefore,
              auth2.nonce,
              auth2.v,
              auth2.r,
              auth2.s,
            ],
            nonce: relayerTxNonce++,
          });
          console.log(`[Relayer] Taxa do APP de $${devFeeUsdc} USDC enviada com sucesso para a carteira DEV (${devFeeRecipient}). Tx: ${devFeeTxHash}`);
        } catch (feeErr) {
          console.warn('[Relayer] Aviso ao debitar taxa do APP para a carteira DEV:', feeErr);
        }
      }

      let gasFeeTxHash: string | null = null;
      if (parsedGasFee > BigInt(0)) {
        try {
          gasFeeTxHash = await (relayerWalletClient as any).writeContract({
            address: usdcAddress,
            abi: USDC_ABI,
            functionName: 'transferWithAuthorization',
            args: [
              auth3.from,
              auth3.to,
              auth3.value,
              auth3.validAfter,
              auth3.validBefore,
              auth3.nonce,
              auth3.v,
              auth3.r,
              auth3.s,
            ],
            nonce: relayerTxNonce++,
          });
          console.log(`[Relayer] Reembolso de Gás de $${gasFeeUsdc} USDC enviado para a carteira de Gás (${relayerAccount.address}). Tx: ${gasFeeTxHash}`);
        } catch (gasErr) {
          console.warn('[Relayer] Aviso ao debitar taxa de reembolso de gás:', gasErr);
        }
      }

      return {
        reverted: false as const,
        mainTxHash,
        blockNumber,
        devFeeTxHash,
        gasFeeTxHash,
      };
    });

    if (txExecutionResult.reverted) {
      return res.status(400).json({
        success: false,
        error: 'A transferência de USDC foi rejeitada pela rede Base (status: reverted). O destinatário NÃO recebeu os valores e nenhuma taxa de serviço foi debitada.',
        txHash: txExecutionResult.mainTxHash,
        reverted: true,
      });
    }

    const { mainTxHash, blockNumber, devFeeTxHash, gasFeeTxHash } = txExecutionResult;

    return res.json({
      success: true,
      txHash: mainTxHash,
      devFeeTxHash,
      gasFeeTxHash,
      feeTxHash: devFeeTxHash || gasFeeTxHash,
      blockNumber,
      amount,
      devFeeUsdc,
      gasFeeUsdc,
      feeUsdc: parseFloat((devFeeUsdc + gasFeeUsdc).toFixed(4)),
      token: 'USDC',
      recipientAddress,
      senderAddress: auth1.from,
      gasRelayerAddress: relayerAccount.address,
      devFeeRecipient,
      gasPaidInUsdc: true,
      provider: isCirclePaymasterActive ? 'Circle Paymaster (Gas Station Proxy)' : 'Base EIP-3009 Meta-Transaction',
      circleSponsored: isCirclePaymasterActive,
      security: {
        allowlistEnforced: true,
        contract: usdcAddress,
        rateLimitEnforced: true,
        zeroEthRequired: true,
      },
    });
  } catch (err: any) {
    console.error('Erro na execução da meta-transação:', err);
    return res.status(500).json({
      success: false,
      error: err.shortMessage || err.message || 'Falha ao processar pagamento via Relayer.',
    });
  } finally {
    if (lockedSenderKey) {
      activeSenderTransfers.delete(lockedSenderKey);
    }
  }
});

// -------------------------------------------------------------
// 3.5. Firebase Auth Handler Reverse Proxy (Shielded against SSRF and Path Traversal)
// -------------------------------------------------------------
app.all('/__/auth/*', async (req, res) => {
  try {
    const firebaseAuthDomain = (
      process.env.FIREBASE_AUTH_DOMAIN ||
      process.env.VITE_FIREBASE_AUTH_DOMAIN ||
      ''
    ).trim();

    if (!firebaseAuthDomain || !/^[a-zA-Z0-9-]+(\.firebaseapp\.com|\.web\.app)$/.test(firebaseAuthDomain)) {
      return res.status(503).json({
        error: 'FIREBASE_AUTH_DOMAIN não configurado ou inválido nas variáveis de ambiente.',
      });
    }

    const rawUrl = req.originalUrl || '';
    // Blocks Path Traversal, authority redirection (@), or backslash attacks
    if (
      !rawUrl.startsWith('/__/auth/') ||
      rawUrl.includes('..') ||
      rawUrl.toLowerCase().includes('%2e') ||
      rawUrl.includes('\\') ||
      rawUrl.includes('@')
    ) {
      return res.status(400).json({
        error: 'Segurança: Caminho de autenticação inválido ou não permitido.',
      });
    }

    const parsedTarget = new URL(rawUrl, `https://${firebaseAuthDomain}`);
    if (parsedTarget.hostname !== firebaseAuthDomain || !parsedTarget.pathname.startsWith('/__/auth/')) {
      return res.status(400).json({
        error: 'Segurança: Destino de proxy de autenticação bloqueado.',
      });
    }

    const headers: Record<string, string> = {
      host: firebaseAuthDomain,
      'user-agent': req.headers['user-agent'] || 'Mozilla/5.0',
      accept: req.headers['accept'] || '*/*',
    };
    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'];
    }

    const response = await fetch(parsedTarget.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(10000),
    });

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('Erro no proxy de autenticação do Firebase:', err);
    res.status(502).send('Firebase Auth Proxy Error');
  }
});

// Cloud Health & Container Liveness Probes
app.get(['/healthz', '/_health'], (_req, res) => {
  res.status(200).send('OK');
});

// Explicit Service Worker Route with correct MIME type and headers
app.get('/sw.js', (_req, res) => {
  const publicSw = path.join(process.cwd(), 'public', 'sw.js');
  const distSw = path.join(process.cwd(), 'dist', 'sw.js');
  const localSw = path.join(getRuntimeDir(), 'sw.js');
  const swPath = fs.existsSync(publicSw) ? publicSw : (fs.existsSync(distSw) ? distSw : (fs.existsSync(localSw) ? localSw : null));
  if (swPath) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(swPath);
  } else {
    res.status(404).send('Service worker not found');
  }
});

// -------------------------------------------------------------
// 4. Vite & Production SPA Serving
// -------------------------------------------------------------
async function startServer() {
  // Bind port immediately on startup so container readiness and pre-warming probes succeed instantly
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`CofreAdmin Server rodando na porta ${PORT}`);
    console.log(`🚀 Relayer ativo para pagamentos sem ETH (taxa em USDC) na Base.`);
    console.log(`👉 Endereço do Relayer: ${relayerAccount.address}`);
  });

  server.on('error', (err: any) => {
    console.error(`[Server] Erro ao iniciar servidor na porta ${PORT}:`, err);
  });

  // Graceful shutdown for Cloud Run / App Hosting container lifecycle
  const handleShutdown = (signal: string) => {
    console.log(`[Server] Sinal ${signal} recebido. Encerrando conexões com segurança...`);
    server.close(() => {
      console.log('[Server] Servidor finalizado com sucesso.');
      process.exit(0);
    });
    // Force shutdown after 10s timeout if connections don't drain
    setTimeout(() => {
      console.error('[Server] Timeout no encerramento forçando finalização.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  if (process.env.NODE_ENV !== 'production') {
    const devDistAssets = path.join(process.cwd(), 'dist', 'assets');
    if (fs.existsSync(devDistAssets)) {
      app.use('/assets', express.static(devDistAssets, { fallthrough: true }));
    }
    app.use((req, res, next) => {
      // Force fresh 200 OK responses from Vite (never 304 stale cached modules)
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];

      // Prevent browser from locking dev modules in max-age=31536000,immutable disk cache
      const origSetHeader = res.setHeader.bind(res);
      res.setHeader = function (name: string, value: any) {
        if (typeof name === 'string' && name.toLowerCase() === 'cache-control') {
          return origSetHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        }
        if (typeof name === 'string' && name.toLowerCase() === 'etag') {
          return res;
        }
        return origSetHeader(name, value);
      };

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      next();
    });

    // Dynamic import to prevent loading Vite and its dependencies into memory in production
    const viteReadyPromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      })
    );

    app.use(async (req, res, next) => {
      try {
        const vite = await viteReadyPromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    // Resolve dist folder safely across different container execution paths
    const candidateDist = path.join(process.cwd(), 'dist');
    const runtimeDir = getRuntimeDir();
    const distPath = fs.existsSync(path.join(candidateDist, 'index.html'))
      ? candidateDist
      : (fs.existsSync(path.join(runtimeDir, 'index.html')) ? runtimeDir : candidateDist);

    // Serve hashed assets with immutable cache
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: false, // Return 404 if file does not exist in /assets, do NOT fall through to index.html
    }));

    // Serve other root static files (manifest, sw.js, icons, etc)
    app.use(express.static(distPath, {
      maxAge: '1h',
    }));

    // Return 404 JSON for non-existent API routes so they don't fall through to index.html
    app.all('/api/*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint da API não encontrado',
        path: req.path,
      });
    });

    // Catch-all for SPA navigation: Always serve index.html with NO CACHE so clients always get the newest bundle references
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const indexPath = path.join(distPath, 'index.html');
      try {
        let html = fs.readFileSync(indexPath, 'utf-8');
        let webappConfig: Record<string, string> = {};
        if (process.env.FIREBASE_WEBAPP_CONFIG) {
          try {
            webappConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
          } catch {}
        }
        const clientFirebaseConfig = {
          apiKey: (process.env.VITE_FIREBASE_API_KEY || webappConfig.apiKey || '').trim(),
          authDomain: (process.env.VITE_FIREBASE_AUTH_DOMAIN || webappConfig.authDomain || '').trim(),
          projectId: (process.env.VITE_FIREBASE_PROJECT_ID || webappConfig.projectId || '').trim(),
          storageBucket: (process.env.VITE_FIREBASE_STORAGE_BUCKET || webappConfig.storageBucket || '').trim(),
          messagingSenderId: (process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || webappConfig.messagingSenderId || '').trim(),
          appId: (process.env.VITE_FIREBASE_APP_ID || webappConfig.appId || '').trim(),
          firestoreDatabaseId: (process.env.VITE_FIREBASE_DATABASE_ID || webappConfig.firestoreDatabaseId || '(default)').trim(),
        };

        if (clientFirebaseConfig.apiKey && clientFirebaseConfig.projectId) {
          const injectionScript = `<script>window.__FIREBASE_CONFIG__ = ${safeJsonForScript(clientFirebaseConfig)};</script>`;
          if (html.includes('</head>')) {
            html = html.replace('</head>', `${injectionScript}</head>`);
          } else {
            html = injectionScript + html;
          }
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      } catch {
        res.sendFile(indexPath);
      }
    });
  }
}

startServer();
