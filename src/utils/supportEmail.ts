import { APP_VERSION, APP_VERSION_LABEL } from '../config/version';
import { Transaction } from '../types';
import { I18nService, AppLanguage } from '../services/i18nService';

export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'cofreadminwallet@gmail.com';

export interface SupportContextOptions {
  userEmail?: string;
  userId?: string;
  walletAddress?: string;
  network?: string;
  transaction?: Transaction;
  errorMessage?: string;
  actionContext?: string;
  language?: AppLanguage;
}

/**
 * Builds a formatted mailto URL pre-filled with diagnostic information
 * in the active application language (pt-BR or en-US) so the user can easily
 * report issues to cofreadminwallet@gmail.com
 */
export function buildSupportMailto(options: SupportContextOptions = {}): string {
  const lang: AppLanguage = options.language || I18nService.getLanguage();
  const isEn = lang === 'en-US';

  const {
    userEmail,
    userId,
    walletAddress,
    network = 'Base',
    transaction,
    errorMessage,
    actionContext = isEn ? 'General' : 'Geral',
  } = options;

  let subject: string;
  if (transaction) {
    subject = isEn
      ? `[CofreAdmin] Issue with entry #${transaction.id.slice(0, 8)}`
      : `[CofreAdmin] Problema no lançamento #${transaction.id.slice(0, 8)}`;
  } else if (errorMessage) {
    subject = isEn
      ? `[CofreAdmin] Error: ${actionContext}`
      : `[CofreAdmin] Erro: ${actionContext}`;
  } else {
    subject = isEn
      ? `[CofreAdmin ${APP_VERSION_LABEL}] Report Issue (${actionContext})`
      : `[CofreAdmin ${APP_VERSION_LABEL}] Relatar Problema (${actionContext})`;
  }

  const device = typeof navigator !== 'undefined' ? navigator.userAgent : (isEn ? 'Unknown' : 'Desconhecido');
  const timestamp = new Date().toLocaleString(isEn ? 'en-US' : 'pt-BR');

  let body = isEn
    ? `Hello CofreAdmin Support Team,\n\n`
    : `Olá Equipe de Suporte do CofreAdmin,\n\n`;

  body += isEn
    ? `[Describe below what happened or the issue you found:]\n\n\n`
    : `[Descreva abaixo o que aconteceu ou o problema encontrado:]\n\n\n`;

  body += `--------------------------------------------------\n`;
  body += isEn
    ? `TECHNICAL DIAGNOSTICS (Automatically generated)\n`
    : `DIAGNÓSTICO TÉCNICO (Gerado automaticamente)\n`;
  body += `--------------------------------------------------\n`;
  body += `App: CofreAdmin ${APP_VERSION_LABEL} (${APP_VERSION})\n`;
  body += isEn ? `Date & Time: ${timestamp}\n` : `Data e Hora: ${timestamp}\n`;
  body += isEn ? `Context: ${actionContext}\n` : `Contexto: ${actionContext}\n`;
  if (userEmail) body += isEn ? `User Account: ${userEmail}\n` : `Conta do Usuário: ${userEmail}\n`;
  if (userId) body += `UID: ${userId}\n`;
  if (walletAddress) body += isEn ? `Wallet Address (Base): ${walletAddress}\n` : `Endereço Carteira (Base): ${walletAddress}\n`;
  if (network) body += isEn ? `Network: ${network}\n` : `Rede: ${network}\n`;

  if (errorMessage) {
    body += isEn ? `Error Message: ${errorMessage}\n` : `Mensagem de Erro: ${errorMessage}\n`;
  }

  if (transaction) {
    body += isEn ? `\nENTRY DETAILS:\n` : `\nDETALHES DO LANÇAMENTO:\n`;
    body += `- ID: ${transaction.id}\n`;
    body += isEn
      ? `- Type: ${transaction.type === 'income' ? 'Income / Deposit' : 'Expense / Withdrawal'}\n`
      : `- Tipo: ${transaction.type === 'income' ? 'Receita / Entrada' : 'Despesa / Saída'}\n`;
    body += isEn
      ? `- Amount: ${transaction.amount} ${transaction.tokenSymbol || 'USDC'}\n`
      : `- Valor: ${transaction.amount} ${transaction.tokenSymbol || 'USDC'}\n`;
    body += isEn ? `- Date recorded: ${transaction.date}\n` : `- Data do registro: ${transaction.date}\n`;
    body += isEn ? `- Category: ${transaction.categoryId}\n` : `- Categoria: ${transaction.categoryId}\n`;
    if (transaction.description) {
      body += isEn ? `- Description: ${transaction.description}\n` : `- Descrição: ${transaction.description}\n`;
    }
    if (transaction.txHash) {
      body += isEn ? `- Blockchain Hash: ${transaction.txHash}\n` : `- Hash Blockchain: ${transaction.txHash}\n`;
    }
    if (transaction.vaultId) {
      body += isEn ? `- Linked Vault: ${transaction.vaultId}\n` : `- Cofre Vinculado: ${transaction.vaultId}\n`;
    }
  }

  body += isEn
    ? `\nDevice / Browser: ${device}\n`
    : `\nDispositivo / Navegador: ${device}\n`;
  body += `--------------------------------------------------\n`;

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  return `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Opens pre-filled email client or falls back to clipboard
 */
export function openSupportEmail(options: SupportContextOptions = {}): boolean {
  const mailtoUrl = buildSupportMailto(options);
  if (typeof window !== 'undefined') {
    window.location.href = mailtoUrl;
    return true;
  }
  return false;
}
