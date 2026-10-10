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
}

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
    .replace(EMOJI_AND_SPECIAL_CHARS_REGEX, '') // Emojis que causam símbolos quebrados
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '-') // Bullet points to hyphen
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-') // Typographic em/en dashes to hyphen
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // Aspas simples curvas
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // Aspas duplas curvas
    .replace(/[\u2026]/g, '...') // Reticências tipográficas
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

export const generateStatementPdf = (options: ExportDataOptions): { doc: jsPDF; filename: string; blob: Blob } => {
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

  // Header Banner (Neo-brutalist dark & lime accent)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, margin, contentWidth, 26, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.rect(margin, margin, contentWidth, 26, 'S');

  // App Brand inside Header
  doc.setTextColor(228, 249, 126); // lime #E4F97E
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('COFREADMIN', margin + 6, margin + 11);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    isEn
      ? 'Financial Statement & Activity Record'
      : 'Extrato Financeiro e Registro de Atividades',
    margin + 6,
    margin + 17
  );

  // Meta info on the right
  const userName = sanitizeForPdf(user.name || user.username || (isEn ? 'User' : 'Usuário'));
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(8);
  doc.text(`${isEn ? 'Account Holder' : 'Titular'}: ${userName}`, pageWidth - margin - 6, margin + 9, { align: 'right' });
  doc.text(`${isEn ? 'Issued' : 'Emitido'}: ${formattedNow}`, pageWidth - margin - 6, margin + 14, { align: 'right' });
  doc.text(`${isEn ? 'Currency' : 'Moeda'}: ${user.currency || 'BRL'}`, pageWidth - margin - 6, margin + 19, { align: 'right' });

  // Period Badge
  let y = margin + 32;
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

  // Entradas / Income
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

      // Description (sanitize and truncate if too long)
      doc.setTextColor(15, 23, 42);
      const rawDesc = tx.description || (isEn ? 'No description' : 'Sem descrição');
      const descText = sanitizeForPdf(rawDesc);
      const truncatedDesc = descText.length > 45 ? descText.slice(0, 42) + '...' : descText;
      doc.text(truncatedDesc, margin + 32, y + 4.8);

      // Category (clean of emojis and special characters)
      doc.setTextColor(71, 85, 105);
      const catText = getCatName(tx.categoryId);
      const truncatedCat = catText.length > 20 ? catText.slice(0, 18) + '..' : catText;
      doc.text(truncatedCat, margin + 112, y + 4.8);

      // Type
      const typeLabel = tx.type === 'income' ? (isEn ? 'Income' : 'Entrada') : (isEn ? 'Expense' : 'Gasto');
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

  // Footer note on last page
  const footerY = pageHeight - margin - 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    sanitizeForPdf(
      isEn
        ? 'CofreAdmin - Statement & receipt issued locally on device'
        : 'CofreAdmin - Comprovante e extrato emitido localmente no dispositivo'
    ),
    margin,
    footerY + 2
  );
  doc.text(isEn ? 'Authentic' : 'Autêntico', pageWidth - margin, footerY + 2, { align: 'right' });

  const blob = doc.output('blob');

  return { doc, filename, blob };
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

  const headers = isEn
    ? ['Date', 'Type', 'Description', 'Category', `Amount (${currency})`, 'Vault', 'OnChain', 'Blockchain Hash', 'BaseScan Explorer Link']
    : ['Data', 'Tipo', 'Descrição', 'Categoria', `Valor (${currency})`, 'Cofre', 'OnChain', 'Hash Blockchain', 'Link Explorer BaseScan'];

  const rows = filtered.map((tx) => [
    `"${tx.date}"`,
    `"${tx.type === 'income' ? (isEn ? 'Income' : 'Entrada') : (isEn ? 'Expense' : 'Gasto')}"`,
    `"${sanitizeForPdf(tx.description || (isEn ? 'No description' : 'Sem descrição')).replace(/"/g, '""')}"`,
    `"${getCatName(tx.categoryId).replace(/"/g, '""')}"`,
    tx.amount.toFixed(2),
    tx.vaultId || tx.categoryId === 'vault_deposit' ? (isEn ? 'Yes' : 'Sim') : (isEn ? 'No' : 'Não'),
    tx.isOnChain ? (isEn ? 'Yes' : 'Sim') : (isEn ? 'No' : 'Não'),
    `"${tx.txHash || ''}"`,
    `"${tx.txHash ? `https://basescan.org/tx/${tx.txHash}` : ''}"`,
  ]);

  const content = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  return { filename, content };
};
