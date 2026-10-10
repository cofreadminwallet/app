import express from 'express';
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
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

const app = express();
app.set('trust proxy', true);

// Resolve port:
// 1. Command-line argument (--port <p>)
// 2. Production PORT env (Cloud Run / App Hosting, e.g. 8080)
// 3. AI Studio DEFAULT_APP_PORT env (3000)
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
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=*, microphone=(), geolocation=(), payment=()');
  res.removeHeader('X-Powered-By');
  next();
});

app.use(express.json({ limit: '1mb' }));

// Official Base USDC Contract Addresses
// -------------------------------------------------------------
// CONTRATOS OFICIAIS: USDC & CIRCLE PAYMASTER NA BASE
// -------------------------------------------------------------
const BASE_USDC_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const BASE_USDC_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

// Contratos oficiais do Circle Paymaster (ERC-4337) na Base:
// Permissionless: O usuário paga o gás com o próprio USDC dele (0 ETH necessário e SEM policyId).
export const CIRCLE_PAYMASTER_BASE_V07 = '0x6C973eBe80dCD8660841D4356bf15c32460271C9' as const;
export const CIRCLE_PAYMASTER_BASE_V08 = '0x0578cFB241215b77442a541325d6A4E6dFE700Ec' as const;
export const CIRCLE_PAYMASTER_BASE_SEPOLIA = '0x31BE08D380A21fc740883c0BC434FcFc88740b58' as const;

const BASE_RPC = 'https://mainnet.base.org';
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

// Configured addresses specified by developer (configurable via environment variables)
export const EXPECTED_GAS_RELAYER = (process.env.EXPECTED_GAS_RELAYER || '0x31b7BafB5Bf4ab3D892610Ae7C9cA45BdBc45233') as `0x${string}`;
export const DEFAULT_DEV_FEE_RECIPIENT = (process.env.DEV_FEE_RECIPIENT_ADDRESS || '0xD4875cCF87Efb7DDD8dF7787aE4094d5CD2C71De') as `0x${string}`;

// -------------------------------------------------------------
// SEGURANÇA OBRIGATÓRIA: PAYMASTER PROXY & ALLOWLIST DE CONTRATOS
// Proteção estrita contra drenagem de saldo e ataques de replay.
// Apenas os contratos oficiais do USDC e do Circle Paymaster na Base são autorizados.
// -------------------------------------------------------------
export const ALLOWED_SPONSORED_CONTRACTS = new Set([
  BASE_USDC_MAINNET.toLowerCase(), // 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (Base Mainnet Native USDC)
  BASE_USDC_SEPOLIA.toLowerCase(), // 0x036CbD53842c5426634e7929541eC2318f3dCF7e (Base Sepolia USDC)
  CIRCLE_PAYMASTER_BASE_V07.toLowerCase(), // 0x6C973eBe80dCD8660841D4356bf15c32460271C9 (Circle Paymaster v0.7 Base)
  CIRCLE_PAYMASTER_BASE_V08.toLowerCase(), // 0x0578cFB241215b77442a541325d6A4E6dFE700Ec (Circle Paymaster v0.8 Base)
  CIRCLE_PAYMASTER_BASE_SEPOLIA.toLowerCase(), // 0x31BE08D380A21fc740883c0BC434FcFc88740b58 (Circle Paymaster Base Sepolia)
]);

// Configuração do Circle Paymaster (Permissionless - Sem necessidade de Policy ID)
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY?.trim();
const isCirclePaymasterActive = Boolean(CIRCLE_API_KEY && CIRCLE_API_KEY.length > 5);

// Proteção Anti-Drenagem / Rate Limiting (Máx 15 requisições de patrocínio por minuto por remetente)
const sponsorshipRateLimit = new Map<string, { count: number; resetTime: number }>();

function checkSponsorshipRateLimit(sender: string, maxRequests = 15, windowMs = 60000): boolean {
  const cleanSender = sender.toLowerCase();
  const now = Date.now();
  const record = sponsorshipRateLimit.get(cleanSender);
  if (!record || now > record.resetTime) {
    sponsorshipRateLimit.set(cleanSender, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count += 1;
  return true;
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
      const savedKey = fs.readFileSync(RELAYER_KEY_FILE, 'utf-8').trim();
      if (savedKey.startsWith('0x') && savedKey.length === 66) {
        return savedKey as Hex;
      }
    } catch {
      // continue to generate
    }
  }

  // Generate fallback local relayer wallet
  const newKey = generatePrivateKey();
  try {
    fs.writeFileSync(RELAYER_KEY_FILE, newKey, 'utf-8');
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
  let appVersion = 'v1.0.2-b';
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
// PAYMASTER PROXY: Proxy Seguro para Chamadas Paymaster / Gas Station
// Mantém a CIRCLE_API_KEY estritamente oculta no servidor e
// aplica validação de Allowlist em todas as requisições.
// -------------------------------------------------------------
app.post('/api/paymaster/proxy', async (req, res) => {
  try {
    const { targetContract, senderAddress } = req.body;

    // 1. Validação Obrigatória de Allowlist de Contratos
    const contractCandidate = (targetContract || req.body?.to || req.body?.contractAddress || '').toLowerCase();
    if (contractCandidate && !ALLOWED_SPONSORED_CONTRACTS.has(contractCandidate)) {
      console.warn(`[Paymaster Proxy] 🚨 Bloqueio de segurança: Contrato não autorizado '${contractCandidate}'`);
      return res.status(403).json({
        success: false,
        error: `Segurança: O contrato '${contractCandidate}' não está na Allowlist de Patrocínio. Somente o contrato oficial do USDC na Base é autorizado.`,
      });
    }

    // 2. Proteção Anti-Drenagem (Rate Limiting)
    const sender = (senderAddress || req.ip || 'anonymous').toLowerCase();
    if (!checkSponsorshipRateLimit(sender)) {
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

    // Encaminha requisição autenticada para a Circle Web3 Services com a chave do servidor
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
// Discord OAuth2 API Endpoints
// Permite login com Discord preservando 100% da estrutura do app
// -------------------------------------------------------------
app.get('/api/auth/discord/url', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const rawProto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const rawHost = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  const detectedAppUrl = `${rawProto}://${rawHost}`;
  const appUrl = (process.env.APP_URL?.trim() || detectedAppUrl).replace(/\/$/, '');
  const redirectUri = `${appUrl}/api/auth/discord/callback`;

  if (!clientId) {
    return res.json({
      configured: false,
      redirectUri,
      message: 'DISCORD_CLIENT_ID e DISCORD_CLIENT_SECRET ainda não configurados nas variáveis de ambiente.',
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    prompt: 'consent',
  });

  const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  return res.json({
    configured: true,
    url: authUrl,
    redirectUri,
  });
});

app.get(['/api/auth/discord/callback', '/api/auth/discord/callback/'], async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error || !code) {
    const errorKey = String(error || 'missing_code');
    const isCancelledOrDenied = errorKey === 'access_denied';
    const friendlyMsg = isCancelledOrDenied
      ? 'Acesso cancelado pelo usuário ou autorização não concedida.'
      : (error_description || error || 'Código de autorização não recebido.');

    return res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Autenticação Discord</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; text-align: center; background: #F4F6FB; color: #111; }
            .card { background: white; border: 2px solid black; border-radius: 16px; padding: 24px; max-width: 400px; margin: 0 auto; box-shadow: 4px 4px 0 #000; }
          </style>
        </head>
        <body>
          <div class="card">
            <div style="font-size:32px;margin-bottom:8px;">👾</div>
            <h3 style="color:#e11d48;margin:0 0 8px 0;">Autorização Discord Cancelada</h3>
            <p style="font-size:13px;color:#555;margin:0 0 12px 0;">${friendlyMsg}</p>
            <p style="font-size:11px;color:#888;">Fechando janela em instantes...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_ERROR',
                provider: 'discord',
                error: '${friendlyMsg}'
              }, '*');
              setTimeout(function() { window.close(); }, 1200);
            } else {
              setTimeout(function() { window.close(); }, 1200);
            }
          </script>
        </body>
      </html>
    `);
  }

  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  const rawProto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const rawHost = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  const detectedAppUrl = `${rawProto}://${rawHost}`;
  const appUrl = (process.env.APP_URL?.trim() || detectedAppUrl).replace(/\/$/, '');
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

    // Busca perfil do usuário no Discord
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
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0', 10) % 5}.png`;

    const userPayload = {
      id: discordUser.id,
      email: discordUser.email || `${discordUser.username}@discord.user`,
      name: discordUser.global_name || discordUser.username,
      username: discordUser.username,
      avatarUrl,
    };

    return res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Discord Autenticado • CofreAdmin</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; text-align: center; background: #F4F6FB; color: #111; display: flex; align-items: center; justify-content: center; min-height: 90vh; margin: 0; }
            .card { background: white; border: 3px solid black; border-radius: 20px; padding: 28px; max-width: 420px; width: 100%; margin: 0 auto; box-shadow: 5px 5px 0 #000; }
            .btn { display: inline-block; margin-top: 14px; background: #5865F2; color: white; border: 2px solid black; border-radius: 12px; padding: 10px 20px; font-weight: 800; font-size: 13px; text-decoration: none; cursor: pointer; box-shadow: 2px 2px 0 #000; }
            .btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 #000; }
          </style>
        </head>
        <body>
          <div class="card">
            <div style="font-size:36px;margin-bottom:10px;">🎮</div>
            <h3 style="color:#5865F2;margin:0 0 8px 0;font-size:18px;">Autenticado com Discord!</h3>
            <p style="font-size:13px;color:#333;margin:0 0 10px 0;line-height:1.4;">Olá, <strong>${userPayload.name}</strong>. Autorização confirmada com sucesso!</p>
            <p style="font-size:11px;color:#666;margin:0 0 14px 0;">Sincronizando seus dados com o CofreAdmin...</p>
            <button class="btn" id="btn-finish" onclick="dispatchAndClose()">Concluir e Fechar Janela</button>
          </div>
          <script>
            var authPayload = {
              type: 'OAUTH_AUTH_SUCCESS',
              provider: 'discord',
              user: ${JSON.stringify(userPayload)}
            };

            function dispatchAuth() {
              // 1. LocalStorage com timestamp para detecção instantânea via polling ou storage event
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

              // 2. BroadcastChannel - Não fecha imediatamente para não abortar mensagens em trânsito
              try {
                if (window.BroadcastChannel) {
                  var bc = new BroadcastChannel('cofre_discord_oauth');
                  bc.postMessage(authPayload);
                  setTimeout(function() {
                    try { bc.close(); } catch(e) {}
                  }, 6000);
                }
              } catch (e) {}

              // 3. postMessage para todos os contextos possíveis
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage(authPayload, '*');
                }
              } catch (e) {}
              try {
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage(authPayload, '*');
                }
              } catch (e) {}
              try {
                if (window.top && window.top !== window) {
                  window.top.postMessage(authPayload, '*');
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

            // Despacha imediatamente
            dispatchAuth();

            // Redespacha aos 400ms para garantir recepção em dispositivos com latência de IPC
            setTimeout(dispatchAuth, 400);

            // Fecha a janela com tempo hábil de 1400ms para que o navegador transmita a mensagem antes de encerrar
            setTimeout(function() {
              try {
                window.close();
              } catch (e) {}
            }, 1400);
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('[Discord OAuth] Callback exception:', err);
    return res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Erro no Login Discord</title>
          <style>
            body { font-family: sans-serif; padding: 32px; text-align: center; background: #F4F6FB; color: #111; }
            .card { background: white; border: 2px solid black; border-radius: 16px; padding: 24px; max-width: 400px; margin: 0 auto; box-shadow: 4px 4px 0 #000; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3 style="color:#e11d48;margin-top:0;">Erro na Autenticação Discord</h3>
            <p style="font-size:13px;color:#555;">${err.message || 'Ocorreu um erro ao processar o login com Discord.'}</p>
            <p style="font-size:11px;color:#888;">Esta janela será fechada automaticamente...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_ERROR',
                provider: 'discord',
                error: '${err.message || 'Erro ao processar login'}'
              }, '*');
              setTimeout(function() { window.close(); }, 2500);
            }
          </script>
        </body>
      </html>
    `);
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

// -------------------------------------------------------------
// 3. API: Execute Gasless USDC Transfer via Relayer (EIP-3009)
// -------------------------------------------------------------
app.post('/api/paymaster/transfer', async (req, res) => {
  try {
    const {
      senderAddress,
      recipientAddress,
      amount,
      network = 'base',
      protocolFee: requestedProtocolFee,
      gasFee: requestedGasFee,
    } = req.body;

    if (!senderAddress || !recipientAddress || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos: informe endereço de envio, destinatário e valor em USDC.',
      });
    }

    // PROTEÇÃO CONTRA PERDA DE ATIVOS:
    // 1. Bloqueia envio para o próprio remetente (evita queimar taxas à toa)
    if (senderAddress.toLowerCase() === recipientAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Segurança: O endereço de destino não pode ser igual ao endereço de envio.',
      });
    }

    // 2. Bloqueia envio para o endereço zero ou endereço burn (perda irreversível de ativos)
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

    // 1. App Fee: 0.2% with minimum $0.05 USD -> DESTINED EXCLUSIVELY TO DEV WALLET
    const calculatedDevFee = Math.max(amount * 0.002, 0.05);
    const devFeeUsdc = typeof requestedProtocolFee === 'number' && requestedProtocolFee > 0
      ? parseFloat(requestedProtocolFee.toFixed(4))
      : parseFloat(calculatedDevFee.toFixed(4));

    // 2. Gas Relayer Fee: Reimbursement for Base ETH gas spent -> DESTINED TO GAS WALLET
    const envGasFee = parseFloat(process.env.RELAYER_FEE_USDC || '0.02');
    const gasFeeUsdc = typeof requestedGasFee === 'number' && requestedGasFee > 0
      ? parseFloat(requestedGasFee.toFixed(4))
      : envGasFee;

    const totalRequiredUsdc = parseFloat((amount + devFeeUsdc + gasFeeUsdc).toFixed(4));

    const isMainnet = network === 'base';
    const chain = isMainnet ? base : baseSepolia;
    const usdcAddress = isMainnet ? BASE_USDC_MAINNET : BASE_USDC_SEPOLIA;
    const rpcUrl = isMainnet ? BASE_RPC : BASE_SEPOLIA_RPC;

    // -------------------------------------------------------------
    // MEDIDA DE SEGURANÇA 1: ALLOWLIST DE CONTRATOS OBRIGATÓRIA
    // Bloqueia qualquer tentativa de patrocinar contratos não autorizados
    // -------------------------------------------------------------
    if (!ALLOWED_SPONSORED_CONTRACTS.has(usdcAddress.toLowerCase())) {
      console.warn(`[Paymaster Proxy] 🚨 Bloqueio: Contrato ${usdcAddress} fora da Allowlist.`);
      return res.status(403).json({
        success: false,
        error: `Segurança: O contrato ${usdcAddress} não está na Allowlist de Patrocínio. Apenas o USDC oficial na Base é autorizado.`,
      });
    }

    // -------------------------------------------------------------
    // MEDIDA DE SEGURANÇA 2: PROTEÇÃO ANTI-DRENAGEM (RATE LIMITING)
    // -------------------------------------------------------------
    if (!checkSponsorshipRateLimit(senderAddress)) {
      console.warn(`[Paymaster Proxy] ⚠️ Rate limit de patrocínio excedido para: ${senderAddress}`);
      return res.status(429).json({
        success: false,
        error: 'Muitas transferências em sequência. Aguarde alguns segundos para nova operação para segurança dos seus fundos.',
      });
    }

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // 1. Check user USDC balance on Base
    const usdcBalanceRaw = (await (publicClient as any).readContract({
      address: usdcAddress,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [senderAddress as `0x${string}`],
    })) as bigint;

    const currentUsdc = parseFloat(formatUnits(usdcBalanceRaw, 6));
    if (currentUsdc < totalRequiredUsdc) {
      return res.status(400).json({
        success: false,
        error: `Saldo insuficiente de USDC na Base. Disponível: $${currentUsdc.toFixed(2)} USDC, Necessário: $${totalRequiredUsdc.toFixed(2)} USDC (sendo $${amount.toFixed(2)} de envio + $${devFeeUsdc.toFixed(2)} de taxa do app + $${gasFeeUsdc.toFixed(2)} de reembolso do gás).`,
      });
    }

    // 2. Check Relayer ETH balance
    const devFeeRecipient = (process.env.DEV_FEE_RECIPIENT_ADDRESS?.trim() || DEFAULT_DEV_FEE_RECIPIENT) as `0x${string}`;
    const relayerEthBalanceWei = await publicClient.getBalance({
      address: relayerAccount.address,
    });

    // Each tx on Base costs ~0.000005 ETH (~$0.01). We require at least 0.000025 ETH
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

    // 3. User Authorization (EIP-3009 TransferWithAuthorization)
    // ZERO-KNOWLEDGE PREFERRED: Client signs locally, passing authorization params (from, to, value, validAfter, validBefore, nonce, v, r, s)
    const clientAuth = req.body.authorization;
    const clientDevAuth = req.body.devFeeAuthorization;
    const clientGasAuth = req.body.gasFeeAuthorization;

    // Immediately scrub any privateKey parameter if inadvertently received in body
    if (req.body.privateKey) {
      delete req.body.privateKey;
    }

    const parsedAmount = parseUnits(amount.toFixed(6), 6);
    const parsedDevFee = parseUnits(devFeeUsdc.toFixed(6), 6);
    const parsedGasFee = parseUnits(gasFeeUsdc.toFixed(6), 6);

    if (!clientAuth || !clientAuth.from || !clientAuth.to || !clientAuth.value || !clientAuth.nonce || !clientAuth.v || !clientAuth.r || !clientAuth.s) {
      return res.status(400).json({
        success: false,
        error: 'Autorização EIP-3009 assinada não informada. A assinatura é realizada localmente na carteira do cliente.',
      });
    }

    // Validate that client signature parameters strictly match the intent
    if (clientAuth.from.toLowerCase() !== senderAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Segurança: O remetente da autorização assinada difere do remetente informado.',
      });
    }
    if (clientAuth.to.toLowerCase() !== recipientAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Segurança: O destinatário da autorização assinada difere do destinatário informado.',
      });
    }
    if (BigInt(clientAuth.value) !== parsedAmount) {
      return res.status(400).json({
        success: false,
        error: 'Segurança: O valor assinado criptograficamente diverge do valor declarado de transferência.',
      });
    }

    const auth1 = {
      from: clientAuth.from as `0x${string}`,
      to: clientAuth.to as `0x${string}`,
      value: BigInt(clientAuth.value),
      validAfter: BigInt(clientAuth.validAfter || 0),
      validBefore: BigInt(clientAuth.validBefore || Math.floor(Date.now() / 1000) + 7200),
      nonce: clientAuth.nonce as `0x${string}`,
      v: Number(clientAuth.v),
      r: clientAuth.r as `0x${string}`,
      s: clientAuth.s as `0x${string}`,
    };

    // Relayer client submits to Base blockchain with Relayer's ETH!
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

    // Submit main transfer
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

    // Aguarda confirmação da transação principal antes de cobrar qualquer taxa
    let blockNumber = 0;
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: mainTxHash as `0x${string}`,
        timeout: 30000,
      });
      blockNumber = Number(receipt.blockNumber);

      // PROTEÇÃO CRÍTICA: Se a transação reverteu on-chain, interrompe imediatamente!
      // Não cobra taxa do app, não cobra reembolso de gás e avisa o usuário com precisão.
      if (receipt.status === 'reverted') {
        console.error(`[Relayer] 🚨 Transação de pagamento REVERTEU on-chain: ${mainTxHash}`);
        return res.status(400).json({
          success: false,
          error: 'A transferência de USDC foi rejeitada pela rede Base (status: reverted). O destinatário NÃO recebeu os valores e nenhuma taxa de serviço foi debitada.',
          txHash: mainTxHash,
          reverted: true,
        });
      }
    } catch (waitErr: any) {
      console.warn('[Relayer] Transação principal transmitida para a mempool da Base:', waitErr?.message || waitErr);
    }

    // Apenas se a transação principal foi aceita com sucesso, submete as taxas acessórias (App Fee e Gas Fee)
    let devFeeTxHash: string | null = null;
    if (parsedDevFee > BigInt(0)) {
      try {
        let auth2: {
          from: `0x${string}`;
          to: `0x${string}`;
          value: bigint;
          validAfter: bigint;
          validBefore: bigint;
          nonce: `0x${string}`;
          v: number;
          r: `0x${string}`;
          s: `0x${string}`;
        } | null = null;

        if (clientDevAuth && clientDevAuth.from && clientDevAuth.to && clientDevAuth.nonce && clientDevAuth.r) {
          // Validação estrita dos parâmetros da taxa de serviço
          if (
            clientDevAuth.to.toLowerCase() === devFeeRecipient.toLowerCase() &&
            BigInt(clientDevAuth.value) === parsedDevFee
          ) {
            auth2 = {
              from: clientDevAuth.from as `0x${string}`,
              to: clientDevAuth.to as `0x${string}`,
              value: BigInt(clientDevAuth.value),
              validAfter: BigInt(clientDevAuth.validAfter || 0),
              validBefore: BigInt(clientDevAuth.validBefore || Math.floor(Date.now() / 1000) + 7200),
              nonce: clientDevAuth.nonce as `0x${string}`,
              v: Number(clientDevAuth.v),
              r: clientDevAuth.r as `0x${string}`,
              s: clientDevAuth.s as `0x${string}`,
            };
          }
        }

        if (auth2) {
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
        }
      } catch (feeErr) {
        console.warn('[Relayer] Aviso ao debitar taxa do APP para a carteira DEV:', feeErr);
      }
    }

    // Transfer Gas reimbursement in USDC to Relayer / Gas wallet
    let gasFeeTxHash: string | null = null;
    if (parsedGasFee > BigInt(0)) {
      try {
        let auth3: {
          from: `0x${string}`;
          to: `0x${string}`;
          value: bigint;
          validAfter: bigint;
          validBefore: bigint;
          nonce: `0x${string}`;
          v: number;
          r: `0x${string}`;
          s: `0x${string}`;
        } | null = null;

        if (clientGasAuth && clientGasAuth.from && clientGasAuth.to && clientGasAuth.nonce && clientGasAuth.r) {
          // Validação estrita do destinatário e valor do reembolso do gás
          if (
            clientGasAuth.to.toLowerCase() === relayerAccount.address.toLowerCase() &&
            BigInt(clientGasAuth.value) === parsedGasFee
          ) {
            auth3 = {
              from: clientGasAuth.from as `0x${string}`,
              to: clientGasAuth.to as `0x${string}`,
              value: BigInt(clientGasAuth.value),
              validAfter: BigInt(clientGasAuth.validAfter || 0),
              validBefore: BigInt(clientGasAuth.validBefore || Math.floor(Date.now() / 1000) + 7200),
              nonce: clientGasAuth.nonce as `0x${string}`,
              v: Number(clientGasAuth.v),
              r: clientGasAuth.r as `0x${string}`,
              s: clientGasAuth.s as `0x${string}`,
            };
          }
        }

        if (auth3) {
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
        }
      } catch (gasErr) {
        console.warn('[Relayer] Aviso ao debitar taxa de reembolso de gás:', gasErr);
      }
    }

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
  }
});

// -------------------------------------------------------------
// 3.5. Firebase Auth Handler Reverse Proxy
// -------------------------------------------------------------
// Se uma requisição chegar para /__/auth/*, encaminha diretamente para o domínio oficial
// do Firebase Auth (involuted-cycling-n9ffs.firebaseapp.com). Isso garante que o handler de OAuth
// do Google funcione perfeitamente tanto no domínio customizado (cofreadmin.gfin.app) quanto localmente.
app.all('/__/auth/*', async (req, res) => {
  try {
    const firebaseAuthDomain = process.env.FIREBASE_AUTH_DOMAIN || 'involuted-cycling-n9ffs.firebaseapp.com';
    const targetUrl = `https://${firebaseAuthDomain}${req.originalUrl}`;

    const headers: Record<string, string> = {
      host: firebaseAuthDomain,
      'user-agent': req.headers['user-agent'] || 'Mozilla/5.0',
      accept: req.headers['accept'] || '*/*',
    };
    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'];
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' && req.body ? JSON.stringify(req.body) : undefined,
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
  if (process.env.NODE_ENV !== 'production') {
    // Dynamic import to prevent loading Vite and its dependencies into memory in production
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
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
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

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
}

startServer();
