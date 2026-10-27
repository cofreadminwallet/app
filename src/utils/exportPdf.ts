import { jsPDF } from 'jspdf';
import { Transaction, Category, UserProfile } from '../types';
import { formatCurrency } from './storage';
import { ExchangeRateService } from '../services/exchangeRateService';

export type ExportPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export interface ExportDataOptions {
  period: ExportPeriod;
  transactions: Transaction[];
  categories: Category[];
  user: UserProfile;
  lang?: string;
  logoBase64?: string;
}

let cachedLogoBase64: string | null = null;

/**
 * Loads the official CofreAdmin icon asset as base64 data URL with caching.
 */
export const loadLogoBase64 = async (): Promise<string | null> => {
  if (cachedLogoBase64) return cachedLogoBase64;
  if (typeof window === 'undefined') return null;

  const candidateUrls = ['/apple-touch-icon.png', '/icon-192.png', '/cofreadmin-logo.png'];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      if (base64) {
        cachedLogoBase64 = base64;
        return cachedLogoBase64;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
};

/**
 * Fallback vector renderer for the official CofreAdmin Neo-Brutalist Purple Vault with Lime Sliders.
 */
const drawNeoVaultLogo = (doc: jsPDF, x: number, y: number, size: number) => {
  // Vault body in signature purple (#9333EA)
  doc.setFillColor(147, 51, 234);
  doc.roundedRect(x, y, size, size, 2, 2, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, size, size, 2, 2, 'S');

  // Inner vault wheel dial (#C084FC)
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.28;
  doc.setFillColor(192, 132, 252);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.circle(cx, cy, r, 'S');

  // Center lock pin
  doc.setFillColor(88, 28, 135);
  doc.circle(cx, cy, r * 0.35, 'F');

  // Lime Admin Equalizer slider on right edge (#B8F256)
  const sliderW = size * 0.22;
  const sliderH = size * 0.65;
  const sliderX = x + size - sliderW * 0.7;
  const sliderY = y + (size - sliderH) / 2;
  doc.setFillColor(184, 242, 86);
  doc.roundedRect(sliderX, sliderY, sliderW, sliderH, 1, 1, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.roundedRect(sliderX, sliderY, sliderW, sliderH, 1, 1, 'S');
};

// Comprehensive regex for cleaning unsupported emojis and Unicode glyphs in standard PDF fonts
const EMOJI_AND_SPECIAL_CHARS_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{200B}-\u{200F}]/gu;

/**
 * Sanitizes text to guarantee clean rendering in PDF exports and CSV files:
 * - Converts non-breaking spaces (\u00A0 from Intl.NumberFormat) to standard spaces
 * - Strips unsupported emojis that would produce glyph boxes in standard PDF fonts
 * - Normalizes dashes, quotes, and bullet symbols to safe ASCII equivalents
 * - Preserves all Latin accented letters (á, é, í, ó, ú, etc.)
 */
export const sanitizeForPdf = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text)
    .replace(/\u00A0/g, ' ') // Non-breaking space (Intl currency)
    .replace(/[\u202F\u2007\u2009]/g, ' ') // Thin/narrow spaces to standard space
    .replace(EMOJI_AND_SPECIAL_CHARS_REGEX, '') // Emojis causing broken glyphs
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '-') // Bullet points to hyphen
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-') // Typographic em/en dashes to hyphen
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // Curly single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // Curly double quotes
    .replace(/[\u2026]/g, '...') // Typographic ellipsis
    .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F]/g, '') // Ensure characters are compatible with Latin-1 / Latin Extended
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Formats currency values while cleaning non-breaking spaces for PDF fonts
 */
export const formatCurrencyForPdf = (amount: number, currency: string = 'BRL'): string => {
  const converted = ExchangeRateService.convertFromUsdc(amount, currency);
  const formatted = formatCurrency(converted, currency);
  return sanitizeForPdf(formatted);
};

export const getPeriodLabel = (period: ExportPeriod, lang: string = 'pt-BR'): string => {
  const isEn = lang === 'en-US';
  switch (period) {
    case 'day':
      return isEn ? 'Day (Today)' : 'Dia (Hoje)';
    case 'week':
      return isEn ? 'Last 7 Days' : 'Últimos 7 Dias';
    case 'month':
      return isEn ? 'This Month' : 'Este Mês';
    case 'year':
      return isEn ? 'This Year' : 'Este Ano';
    case 'all':
      return isEn ? 'Full History' : 'Histórico Completo';
  }
};

export const filterTransactionsByPeriod = (
  transactions: Transaction[],
  period: ExportPeriod
): Transaction[] => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return transactions
    .filter((tx) => {
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return true;

      switch (period) {
        case 'day':
          return txDate >= startOfDay;
        case 'week':
          return txDate >= startOfWeek;
        case 'month':
          return txDate >= startOfMonth;
        case 'year':
          return txDate >= startOfYear;
        case 'all':
        default:
          return true;
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const generateStatementPdf = async (
  options: ExportDataOptions
): Promise<{ doc: jsPDF; filename: string; blob: Blob }> => {
  const { period, transactions, categories, user, lang = user.language || 'pt-BR' } = options;
  const isEn = lang === 'en-US';
  const filtered = filterTransactionsByPeriod(transactions, period);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const getCatName = (catId: string) => {
    const c = categories.find((cat) => cat.id === catId);
    // For PDF layout, category names are stripped of emojis to prevent font corruption
    return c ? sanitizeForPdf(c.name) : (isEn ? 'General' : 'Geral');
  };

  const totalIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const now = new Date();
  const formattedNow = new Intl.DateTimeFormat(isEn ? 'en-US' : 'pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  const periodTitle = sanitizeForPdf(getPeriodLabel(period, lang));
  const dateSlug = now.toISOString().slice(0, 10);
  const filename = isEn
    ? `Statement_CofreAdmin_${period}_${dateSlug}.pdf`
    : `Extrato_CofreAdmin_${period}_${dateSlug}.pdf`;

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const bannerHeight = 28;

  // Header Banner (Neo-brutalist dark & lime accent)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, margin, contentWidth, bannerHeight, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.rect(margin, margin, contentWidth, bannerHeight, 'S');

  // 1. Icon in Header (Official CofreAdmin Vault Icon)
  const iconSize = 18; // mm
  const iconX = margin + 5;
  const iconY = margin + 5;

  const logoBase64 = options.logoBase64 || (await loadLogoBase64());
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', iconX, iconY, iconSize, iconSize);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.roundedRect(iconX, iconY, iconSize, iconSize, 1.5, 1.5, 'S');
    } catch {
      drawNeoVaultLogo(doc, iconX, iconY, iconSize);
    }
  } else {
    drawNeoVaultLogo(doc, iconX, iconY, iconSize);
  }

  // 2. Titles next to Icon (without raw COFREADMIN text, cleanly formatted with subtitle & slogan)
  const textX = iconX + iconSize + 4.5;

  // Primary Document Title
  doc.setTextColor(228, 249, 126); // lime #E4F97E
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(isEn ? 'FINANCIAL STATEMENT' : 'EXTRATO FINANCEIRO', textX, margin + 11);

  // Subtitle
  doc.setTextColor(241, 245, 249); // slate-100
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    isEn ? 'Activity & Transaction Record' : 'Registro de Atividades e Transações',
    textX,
    margin + 17
  );

  // Brand Slogan
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text(
    isEn ? 'CofreAdmin - Own your money. Be the admin.' : 'CofreAdmin - Seja o admin da sua grana.',
    textX,
    margin + 22.5
  );

  // 3. User & Wallet Metadata on right side
  const rightX = pageWidth - margin - 5;
  const userName = sanitizeForPdf(user.name || user.username || (isEn ? 'User' : 'Usuário'));

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`${isEn ? 'Holder' : 'Titular'}: ${userName}`, rightX, margin + 8, { align: 'right' });

  let metaY = margin + 13;
  if (user.walletAddress) {
    const rawAddr = String(user.walletAddress);
    const shortAddr = rawAddr.length > 10 ? `${rawAddr.slice(0, 6)}...${rawAddr.slice(-4)}` : rawAddr;
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Base: ${shortAddr}`, rightX, metaY, { align: 'right' });
    metaY += 5;
  }

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${isEn ? 'Issued' : 'Emitido'}: ${formattedNow}`, rightX, metaY, { align: 'right' });
  doc.text(`${isEn ? 'Currency' : 'Moeda'}: ${user.currency || 'BRL'}`, rightX, metaY + 5, { align: 'right' });

  // Period Badge
  let y = margin + bannerHeight + 6;
  doc.setFillColor(238, 242, 255);
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth, 10, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    isEn
      ? `PERIOD REPORT: ${periodTitle.toUpperCase()}`
      : `RELATÓRIO DO PERÍODO: ${periodTitle.toUpperCase()}`,
    margin + 4,
    y + 6.5
  );
  doc.text(
    isEn ? `Total Entries: ${filtered.length}` : `Total de Lançamentos: ${filtered.length}`,
    pageWidth - margin - 4,
    y + 6.5,
    { align: 'right' }
  );

  // Summary Cards (Neo-brutalist grid)
  y += 14;
  const colWidth = (contentWidth - 6) / 3;

  // Income Card
  doc.setFillColor(240, 253, 244);
  doc.rect(margin, y, colWidth, 16, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, y, colWidth, 16, 'S');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(isEn ? 'INCOME' : 'ENTRADAS', margin + 3, y + 5);
  doc.setFontSize(11);
  doc.text(`+${formatCurrencyForPdf(totalIncome, user.currency)}`, margin + 3, y + 12);

  // Gastos / Expenses
  const col2X = margin + colWidth + 3;
  doc.setFillColor(255, 241, 242);
  doc.rect(col2X, y, colWidth, 16, 'F');
  doc.rect(col2X, y, colWidth, 16, 'S');
  doc.setTextColor(159, 18, 57);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(isEn ? 'EXPENSES' : 'SAÍDAS / GASTOS', col2X + 3, y + 5);
  doc.setFontSize(11);
  doc.text(`-${formatCurrencyForPdf(totalExpense, user.currency)}`, col2X + 3, y + 12);

  // Balance
  const col3X = col2X + colWidth + 3;
  doc.setFillColor(245, 243, 255);
  doc.rect(col3X, y, colWidth, 16, 'F');
  doc.rect(col3X, y, colWidth, 16, 'S');
  doc.setTextColor(88, 28, 135);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(isEn ? 'PERIOD BALANCE' : 'SALDO DO PERÍODO', col3X + 3, y + 5);
  doc.setFontSize(11);
  const sign = netBalance >= 0 ? '+' : '';
  doc.text(`${sign}${formatCurrencyForPdf(netBalance, user.currency)}`, col3X + 3, y + 12);

  // Transactions Table Header
  y += 22;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(isEn ? 'DATE' : 'DATA', margin + 3, y + 5.5);
  doc.text(isEn ? 'DESCRIPTION' : 'DESCRIÇÃO', margin + 32, y + 5.5);
  doc.text(isEn ? 'CATEGORY' : 'CATEGORIA', margin + 112, y + 5.5);
  doc.text(isEn ? 'TYPE' : 'TIPO', margin + 152, y + 5.5);
  doc.text(isEn ? 'AMOUNT' : 'VALOR', pageWidth - margin - 3, y + 5.5, { align: 'right' });

  y += 8;

  if (filtered.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(
      isEn
        ? 'No transactions recorded for the selected period.'
        : 'Nenhuma movimentação registrada no período selecionado.',
      pageWidth / 2,
      y + 15,
      { align: 'center' }
    );
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    filtered.forEach((tx, idx) => {
      // Check page break
      if (y > pageHeight - 25) {
        doc.addPage();
        y = margin;

        // Continuation header
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentWidth, 8, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(margin, y, contentWidth, 8, 'S');

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(isEn ? 'DATE' : 'DATA', margin + 3, y + 5.5);
        doc.text(isEn ? 'DESCRIPTION' : 'DESCRIÇÃO', margin + 32, y + 5.5);
        doc.text(isEn ? 'CATEGORY' : 'CATEGORIA', margin + 112, y + 5.5);
        doc.text(isEn ? 'TYPE' : 'TIPO', margin + 152, y + 5.5);
        doc.text(isEn ? 'AMOUNT' : 'VALOR', pageWidth - margin - 3, y + 5.5, { align: 'right' });

        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }

      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 7, 'F');
      }

      // Thin bottom line
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 7, pageWidth - margin, y + 7);

      // Date formatted
      let dStr = tx.date;
      try {
        const d = new Date(tx.date);
        dStr = new Intl.DateTimeFormat(isEn ? 'en-US' : 'pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        }).format(d);
      } catch {
        dStr = tx.date.slice(0, 10);
      }

      doc.setTextColor(71, 85, 105);
      doc.text(dStr, margin + 3, y + 4.8);

      // Description (sanitize and truncate if too long, with on-chain indicator)
      doc.setTextColor(15, 23, 42);
      const rawDesc = tx.description || (isEn ? 'No description' : 'Sem descrição');
      const onChainTag = tx.isOnChain ? ' [Base]' : '';
      const descText = sanitizeForPdf(rawDesc + onChainTag);
      const truncatedDesc = descText.length > 45 ? descText.slice(0, 42) + '...' : descText;
      doc.text(truncatedDesc, margin + 32, y + 4.8);

      // Category (clean of emojis and special characters)
      doc.setTextColor(71, 85, 105);
      const catText = getCatName(tx.categoryId);
      const truncatedCat = catText.length > 20 ? catText.slice(0, 18) + '..' : catText;
      doc.text(truncatedCat, margin + 112, y + 4.8);

      // Type (with asterisk if on-chain)
      const baseType = tx.type === 'income' ? (isEn ? 'Income' : 'Entrada') : (isEn ? 'Expense' : 'Gasto');
      const typeLabel = tx.isOnChain ? `${baseType}*` : baseType;
      doc.text(typeLabel, margin + 152, y + 4.8);

      // Amount
      const isIncome = tx.type === 'income';
      if (isIncome) {
        doc.setTextColor(22, 101, 52);
      } else {
        doc.setTextColor(159, 18, 57);
      }
      doc.setFont('helvetica', 'bold');
      const valStr = `${isIncome ? '+' : '-'}${formatCurrencyForPdf(tx.amount, user.currency)}`;
      doc.text(valStr, pageWidth - margin - 3, y + 4.8, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      y += 7;
    });
  }

  // Dynamic multi-page footer stamping across all pages
  const hasOnChainTx = filtered.some((tx) => tx.isOnChain);
  const totalPages = doc.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageHeight - margin - 4;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    const footerText = sanitizeForPdf(
      isEn
        ? `CofreAdmin - Device-verified financial statement${hasOnChainTx ? ' • *On-chain via Base' : ''}`
        : `CofreAdmin - Extrato verificado localmente no dispositivo${hasOnChainTx ? ' • *On-chain via Base' : ''}`
    );
    doc.text(footerText, margin, footerY + 2);

    const pageNumText = isEn ? `Page ${p} of ${totalPages}` : `Página ${p} de ${totalPages}`;
    doc.text(pageNumText, pageWidth - margin, footerY + 2, { align: 'right' });
  }

  const blob = doc.output('blob');

  return { doc, filename, blob };
};

/**
 * Mitigates CSV Formula Injection (DDE / Excel / LibreOffice / Google Sheets)
 * by prefixing values starting with '=', '+', '-', '@', '\t', or '\r' with an apostrophe ("'")
 * and escaping double quotes according to RFC 4180.
 */
export const sanitizeCsvCell = (value: string | number | null | undefined): string => {
  const raw = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  const safeFormula = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safeFormula.replace(/"/g, '""')}"`;
};

export const exportTransactionsAsCsv = (
  transactions: Transaction[],
  period: ExportPeriod,
  categories: Category[],
  currency: string,
  lang: string = 'pt-BR'
): { filename: string; content: string } => {
  const isEn = lang === 'en-US';
  const filtered = filterTransactionsByPeriod(transactions, period);
  const now = new Date().toISOString().slice(0, 10);
  const filename = isEn
    ? `Statement_CofreAdmin_${period}_${now}.csv`
    : `Extrato_CofreAdmin_${period}_${now}.csv`;

  const getCatName = (catId: string) => {
    const c = categories.find((cat) => cat.id === catId);
    return c ? sanitizeForPdf(c.name) : (isEn ? 'General' : 'Geral');
  };

  const headers = (isEn
    ? ['Date', 'Type', 'Description', 'Category', `Amount (${currency})`, 'Vault', 'OnChain', 'Blockchain Hash', 'BaseScan Explorer Link']
    : ['Data', 'Tipo', 'Descrição', 'Categoria', `Valor (${currency})`, 'Cofre', 'OnChain', 'Hash Blockchain', 'Link Explorer BaseScan']
  ).map((h) => sanitizeCsvCell(h));

  const rows = filtered.map((tx) => {
    const cleanTxHash = tx.txHash ? String(tx.txHash).replace(/[^a-zA-Z0-9x]/g, '') : '';
    return [
      sanitizeCsvCell(tx.date),
      sanitizeCsvCell(tx.type === 'income' ? (isEn ? 'Income' : 'Entrada') : (isEn ? 'Expense' : 'Gasto')),
      sanitizeCsvCell(sanitizeForPdf(tx.description || (isEn ? 'No description' : 'Sem descrição'))),
      sanitizeCsvCell(getCatName(tx.categoryId)),
      tx.amount.toFixed(2),
      sanitizeCsvCell(tx.vaultId || tx.categoryId === 'vault_deposit' ? (isEn ? 'Yes' : 'Sim') : (isEn ? 'No' : 'Não')),
      sanitizeCsvCell(tx.isOnChain ? (isEn ? 'Yes' : 'Sim') : (isEn ? 'No' : 'Não')),
      sanitizeCsvCell(cleanTxHash),
      sanitizeCsvCell(cleanTxHash ? `https://basescan.org/tx/${cleanTxHash}` : ''),
    ];
  });

  const content = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  return { filename, content };
};

