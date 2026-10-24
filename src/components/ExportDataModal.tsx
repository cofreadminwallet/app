import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Download,
  Share2,
  Calendar,
  Table,
  Check,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Transaction, Category, UserProfile } from '../types';
import { formatUsdcAsCurrency as formatCurrency } from '../utils/storage';
import { triggerHaptic } from '../utils/haptics';
import { useI18n } from '../services/i18nService';
import {
  ExportPeriod,
  filterTransactionsByPeriod,
  generateStatementPdf,
  getPeriodLabel,
  exportTransactionsAsCsv,
} from '../utils/exportPdf';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  user: UserProfile;
  onShowToast?: (msg: string, emoji?: string) => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  user,
  onShowToast,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';
  const [selectedPeriod, setSelectedPeriod] = useState<ExportPeriod>('month');
  const [isExporting, setIsExporting] = useState(false);
  const [lastExported, setLastExported] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return filterTransactionsByPeriod(transactions, selectedPeriod);
  }, [transactions, selectedPeriod]);

  const totalIncome = useMemo(() => {
    return filtered
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filtered]);

  const totalExpense = useMemo(() => {
    return filtered
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filtered]);

  const netBalance = totalIncome - totalExpense;

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    try {
      setIsExporting(true);
      triggerHaptic('medium');

      const { doc, filename } = generateStatementPdf({
        period: selectedPeriod,
        transactions,
        categories,
        user,
        lang: language,
      });

      doc.save(filename);

      setLastExported(filename);
      triggerHaptic('success');
      if (onShowToast) {
        onShowToast(
          isEn ? 'PDF exported successfully!' : `PDF exportado com sucesso!`,
          '📄'
        );
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      triggerHaptic('warning');
      if (onShowToast) {
        onShowToast(
          isEn ? 'Failed to generate PDF. Try again.' : 'Falha ao gerar o PDF. Tente novamente.',
          '⚠️'
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleSharePdf = async () => {
    try {
      setIsExporting(true);
      triggerHaptic('medium');

      const { filename, blob } = generateStatementPdf({
        period: selectedPeriod,
        transactions,
        categories,
        user,
        lang: language,
      });

      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: isEn
            ? `CofreAdmin Statement - ${getPeriodLabel(selectedPeriod, language)}`
            : `Extrato CofreAdmin - ${getPeriodLabel(selectedPeriod, language)}`,
          text: isEn
            ? `Financial statement from CofreAdmin (${filtered.length} entries).`
            : `Extrato financeiro gerado pelo app CofreAdmin (${filtered.length} lançamentos).`,
          files: [file],
        });
        triggerHaptic('success');
        if (onShowToast) {
          onShowToast(isEn ? 'Statement shared!' : 'Comprovante compartilhado!', '✨');
        }
      } else if (navigator.share) {
        // Fallback for text share if files share isn't supported
        await navigator.share({
          title: isEn
            ? `CofreAdmin Statement - ${getPeriodLabel(selectedPeriod, language)}`
            : `Extrato CofreAdmin - ${getPeriodLabel(selectedPeriod, language)}`,
          text: isEn
            ? `📊 CofreAdmin Statement (${getPeriodLabel(selectedPeriod, language)}):\n- Income: +${formatCurrency(totalIncome, user.currency)}\n- Expenses: -${formatCurrency(totalExpense, user.currency)}\n- Balance: ${netBalance >= 0 ? '+' : ''}${formatCurrency(netBalance, user.currency)}\nTotal: ${filtered.length} transactions.`
            : `📊 Extrato CofreAdmin (${getPeriodLabel(selectedPeriod, language)}):\n- Entradas: +${formatCurrency(totalIncome, user.currency)}\n- Gastos: -${formatCurrency(totalExpense, user.currency)}\n- Saldo: ${netBalance >= 0 ? '+' : ''}${formatCurrency(netBalance, user.currency)}\nTotal: ${filtered.length} transações.`,
        });
        triggerHaptic('success');
      } else {
        // Direct download fallback
        const { doc } = generateStatementPdf({
          period: selectedPeriod,
          transactions,
          categories,
          user,
          lang: language,
        });
        doc.save(filename);
        if (onShowToast) {
          onShowToast(
            isEn ? 'PDF downloaded to device!' : 'PDF baixado no seu aparelho!',
            '📥'
          );
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Erro ao compartilhar:', err);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCsv = () => {
    try {
      triggerHaptic('light');
      const { filename, content } = exportTransactionsAsCsv(
        transactions,
        selectedPeriod,
        categories,
        user.currency,
        language
      );

      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      triggerHaptic('success');
      if (onShowToast) {
        onShowToast(isEn ? 'CSV file exported!' : 'Arquivo CSV exportado!', '📊');
      }
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
    }
  };

  const periods: { id: ExportPeriod; label: string; badge: string }[] = isEn
    ? [
        { id: 'day', label: 'Day', badge: 'Today' },
        { id: 'week', label: 'Week', badge: '7 days' },
        { id: 'month', label: 'Month', badge: '30 days' },
        { id: 'year', label: 'Year', badge: '365d' },
        { id: 'all', label: 'All', badge: 'Total' },
      ]
    : [
        { id: 'day', label: 'Dia', badge: 'Hoje' },
        { id: 'week', label: 'Semana', badge: '7 dias' },
        { id: 'month', label: 'Mês', badge: '30 dias' },
        { id: 'year', label: 'Ano', badge: '365d' },
        { id: 'all', label: 'Todos', badge: 'Total' },
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      id="modal-export-data-overlay"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF8F5] border-2 border-black rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-neo max-h-[90vh] overflow-y-auto"
        id="modal-export-data-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] border-2 border-black flex items-center justify-center shadow-neo-xs">
              <FileText className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-['Outfit'] font-black text-lg text-black">
                  {isEn ? 'Export' : 'Exportar'}
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#DCFCE7] text-emerald-950 border border-black/30 rounded-md font-mono">
                  PDF
                </span>
              </div>
              <p className="text-xs font-bold text-neutral-500">
                {isEn ? 'Download statement' : 'Baixar extrato'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full border-2 border-black/20 hover:border-black flex items-center justify-center bg-white hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-neutral-700" />
          </button>
        </div>

        {/* Step 1: Select Period */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-black uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            <span>{isEn ? 'Select Period:' : 'Selecione o Período:'}</span>
          </label>

          <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
            {periods.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedPeriod(p.id);
                }}
                className={`py-2 px-1 rounded-xl border-2 font-['Outfit'] font-black text-xs transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  selectedPeriod === p.id
                    ? 'bg-[#B8F256] text-black border-black shadow-neo-sm scale-[1.02]'
                    : 'bg-white text-black border-black/20 hover:border-black'
                }`}
              >
                <span>{p.label}</span>
                <span
                  className={`text-[9px] font-bold ${
                    selectedPeriod === p.id ? 'text-emerald-950 font-black' : 'text-neutral-400'
                  }`}
                >
                  {p.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Summary Preview Card */}
        <div className="bg-white border-2 border-black rounded-2xl p-3.5 shadow-neo-sm mb-4 space-y-3">
          <div className="flex items-center justify-between border-b border-black/10 pb-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                {isEn ? 'Period Preview' : 'Prévia do Período'}
              </span>
              <h4 className="font-['Outfit'] font-black text-sm text-black">
                {getPeriodLabel(selectedPeriod, language)}
              </h4>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-black bg-neutral-100 border border-black/20 px-2 py-0.5 rounded-lg text-neutral-700">
                {filtered.length} {filtered.length === 1 ? (isEn ? 'entry' : 'registro') : (isEn ? 'entries' : 'registros')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-[#E4F97E]/30 border border-black/15 rounded-xl p-2 min-w-0">
              <span className="text-[9px] font-bold text-emerald-900 block truncate">
                {isEn ? 'Income' : 'Entradas'}
              </span>
              <span className="font-['Outfit'] font-black text-xs text-emerald-700 block truncate">
                +{formatCurrency(totalIncome, user.currency)}
              </span>
            </div>

            <div className="bg-[#FFE4E6]/40 border border-black/15 rounded-xl p-2 min-w-0">
              <span className="text-[9px] font-bold text-rose-900 block truncate">
                {isEn ? 'Expenses' : 'Gastos'}
              </span>
              <span className="font-['Outfit'] font-black text-xs text-rose-600 block truncate">
                -{formatCurrency(totalExpense, user.currency)}
              </span>
            </div>

            <div className="bg-[#EDE9FE]/50 border border-black/15 rounded-xl p-2 min-w-0">
              <span className="text-[9px] font-bold text-purple-900 block truncate">
                {isEn ? 'Balance' : 'Saldo'}
              </span>
              <span
                className={`font-['Outfit'] font-black text-xs block truncate ${
                  netBalance >= 0 ? 'text-purple-900' : 'text-rose-600'
                }`}
              >
                {netBalance >= 0 ? '+' : ''}
                {formatCurrency(netBalance, user.currency)}
              </span>
            </div>
          </div>

          {/* Mini list sample */}
          {filtered.length > 0 ? (
            <div className="space-y-1 pt-1">
              <span className="text-[9px] font-black uppercase text-neutral-400 block">
                {isEn ? 'Included in document:' : 'Itens inclusos no documento:'}
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1 divide-y divide-black/5 pr-1">
                {filtered.slice(0, 5).map((tx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  return (
                    <div key={tx.id} className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <span className="text-xs shrink-0">{cat?.emoji || '💸'}</span>
                        <span className="font-bold text-neutral-800 truncate text-[11px]">
                          {tx.description || (isEn ? 'Entry' : 'Lançamento')}
                        </span>
                      </div>
                      <span
                        className={`font-black text-[11px] shrink-0 ${
                          tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount, user.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {filtered.length > 5 && (
                <p className="text-[10px] text-center font-bold text-neutral-400 pt-1">
                  {isEn
                    ? `+ ${filtered.length - 5} other transactions in full PDF`
                    : `+ ${filtered.length - 5} outras transações no PDF completo`}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-3 text-xs font-medium text-neutral-400">
              {isEn
                ? 'No transactions found in this period. The PDF will be generated with a zeroed summary.'
                : 'Nenhuma transação encontrada neste período. O PDF será gerado com o resumo zerado.'}
            </div>
          )}
        </div>

        {/* Action Buttons: symbols (Download PDF, Share, CSV Spreadsheet) */}
        <div className="flex items-center justify-center gap-2 max-w-[190px] mx-auto w-full">
          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="w-10 h-10 bg-[#E4F97E] hover:bg-[#D4ED5B] active:bg-[#C2DE3D] text-black border-2 border-black rounded-xl shadow-neo-xs btn-press flex items-center justify-center cursor-pointer disabled:opacity-50 transition-colors shrink-0"
            id="btn-download-pdf-statement"
            title={isEn ? 'PDF' : 'PDF'}
            aria-label={isEn ? 'PDF' : 'PDF'}
          >
            <Download className="w-4 h-4 text-black stroke-[2.5]" />
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleSharePdf}
            disabled={isExporting}
            className="w-10 h-10 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-black border-2 border-black rounded-xl shadow-neo-xs btn-press flex items-center justify-center cursor-pointer disabled:opacity-50 transition-colors shrink-0"
            id="btn-share-pdf-statement"
            title={isEn ? 'Share' : 'Compartilhar'}
            aria-label={isEn ? 'Share' : 'Compartilhar'}
          >
            <Share2 className="w-4 h-4 text-purple-700 stroke-[2.5]" />
          </button>

          {/* Planilha CSV */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={isExporting}
            className="w-10 h-10 bg-[#EDE9FE] hover:bg-[#DDD6FE] active:bg-[#C4B5FD] text-purple-950 border-2 border-black rounded-xl shadow-neo-xs btn-press flex items-center justify-center cursor-pointer disabled:opacity-50 transition-colors shrink-0"
            id="btn-export-csv-statement"
            title={isEn ? 'CSV' : 'CSV'}
            aria-label={isEn ? 'CSV' : 'CSV'}
          >
            <Table className="w-4 h-4 text-purple-900 stroke-[2.5]" />
          </button>
        </div>

        {/* Confirmation note */}
        {lastExported && (
          <div className="mt-3 flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 rounded-lg py-1 px-2 text-center">
            <Check className="w-3 h-3 text-emerald-700" />
            <span>{isEn ? `Last downloaded file: ${lastExported}` : `Último arquivo baixado: ${lastExported}`}</span>
          </div>
        )}
      </div>
    </div>
  );
};
