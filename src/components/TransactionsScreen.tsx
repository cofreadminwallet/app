import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Transaction,
  Category,
  Vault,
  PeriodFilter,
  TypeFilter,
  OnChainLedgerEntry,
} from '../types';
import {
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  Copy,
  CheckCircle2,
  Check,
  Layers,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCheck,
  BarChart3,
  Fuel,
  Coins,
  Receipt,
  Download,
  FileText,
  StickyNote,
  ChevronDown,
  Loader2,
  Vault as VaultIcon,
} from 'lucide-react';
import { formatCurrency, formatRelativeDate, StorageService } from '../utils/storage';
import { Web3Service } from '../services/web3Service';
import { CloudSyncService } from '../services/cloudSync';
import {
  isSimulatedTransaction,
  isSimulatedLedgerEntry,
  sanitizeTransactions,
  sanitizeLedgerEntries,
} from '../utils/transactionSanitizer';
import { triggerHaptic } from '../utils/haptics';
import { TransactionDetailModal } from './TransactionDetailModal';
import { AnalyticsScreen } from './AnalyticsScreen';
import { ExportDataModal } from './ExportDataModal';
import { UserProfile } from '../types';
import { useI18n } from '../hooks/useI18n';
import { useExchangeRate } from '../hooks/useExchangeRate';

import { isTransactionOrganized } from '../utils/transactionUtils';
export { isTransactionOrganized };

export type ExtendedTypeFilter = TypeFilter | 'vault' | 'organized' | 'unorganized';
export type TransactionsViewMode = 'organized' | 'analytics' | 'ledger';

interface TransactionsScreenProps {
  transactions: Transaction[];
  categories: Category[];
  vaults?: Vault[];
  currency: string;
  user?: UserProfile;
  onShowToast?: (msg: string, emoji?: string) => void;
  initialViewMode?: TransactionsViewMode;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction?: (updatedTx: Transaction) => void;
  onAddTransaction?: (newTx: Transaction) => void;
  onOpenSend?: () => void;
  onRefreshOnChain?: () => Promise<void> | void;
  isRefreshingOnChain?: boolean;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = React.memo(({
  transactions,
  categories,
  vaults = [],
  currency,
  user,
  onShowToast,
  initialViewMode = 'organized',
  onDeleteTransaction,
  onUpdateTransaction,
  onAddTransaction,
  onOpenSend,
  onRefreshOnChain,
  isRefreshingOnChain = false,
}) => {
  // Main view tab: 'organized' (Ledger) vs 'analytics' (Charts) vs 'ledger' (Raw On-Chain)
  const [viewMode, setViewMode] = useState<TransactionsViewMode>(initialViewMode);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { convertFromUsdc } = useExchangeRate();
  const activeCurrency = (currency || 'BRL').toUpperCase();
  const { t, language } = useI18n();

  // Organized ledger filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [typeFilter, setTypeFilter] = useState<ExtendedTypeFilter>('all');
  const [selectedCatFilter] = useState<string>('all');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  // On-Chain Ledger states
  const [ledgerEntries, setLedgerEntries] = useState<OnChainLedgerEntry[]>([]);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'send' | 'receive'>('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [isSyncingLedger, setIsSyncingLedger] = useState(false);

  // Load ledger on mount and view changes (sanitized)
  const loadLedger = () => {
    const data = StorageService.getOnChainLedger();
    setLedgerEntries(sanitizeLedgerEntries(data));
  };

  useEffect(() => {
    loadLedger();
  }, [transactions]);

  const getCategory = (catId: string): Category | undefined => {
    return categories.find((c) => c.id === catId);
  };

  // Fast O(1) hashmap index for transactions on-chain lookup
  const txByHash = useMemo(() => {
    const map = new Map<string, Transaction>();
    for (const tx of transactions) {
      if (tx.txHash) {
        map.set(tx.txHash.toLowerCase(), tx);
      }
    }
    return map;
  }, [transactions]);

  // Find matching organized transaction for an on-chain ledger entry
  const findOrganizedTx = useCallback((ledgerEntry: OnChainLedgerEntry): Transaction | undefined => {
    if (ledgerEntry.txHash) {
      const match = txByHash.get(ledgerEntry.txHash.toLowerCase());
      if (match) return match;
    }
    return transactions.find(
      (tx) =>
        tx.isOnChain &&
        Math.abs(tx.amount - ledgerEntry.amount) < 0.01 &&
        Math.abs(new Date(tx.date).getTime() - new Date(ledgerEntry.timestamp).getTime()) < 60000
    );
  }, [txByHash, transactions]);

  // Lazy loading / Pagination configuration
  const PAGE_SIZE = 20;
  const [visibleTxCount, setVisibleTxCount] = useState<number>(PAGE_SIZE);
  const [visibleLedgerCount, setVisibleLedgerCount] = useState<number>(PAGE_SIZE);
  const [isLoadingMoreTx, setIsLoadingMoreTx] = useState(false);
  const [isLoadingMoreLedger, setIsLoadingMoreLedger] = useState(false);

  const loadMoreTxSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreLedgerSentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleTxCount(PAGE_SIZE);
  }, [searchQuery, periodFilter, typeFilter, selectedCatFilter]);

  useEffect(() => {
    setVisibleLedgerCount(PAGE_SIZE);
  }, [ledgerSearch, ledgerFilter]);

  // Format exact date with time (seconds included)
  const formatExactDateTime = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  // Copy hash or address helper
  const handleCopy = (text: string, id: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Quick restore/name an on-chain transaction into organized ledger
  const handleRestoreToExtrato = (entry: OnChainLedgerEntry) => {
    triggerHaptic('medium');
    const isIncome = entry.type === 'receive';
    const defaultCat = isIncome
      ? categories.find((c) =>
          c.type === 'income' || ['salary', 'salario', 'crypto', 'invest', 'renda'].some((k) =>
            c.id.toLowerCase().includes(k) || c.name.toLowerCase().includes(k)
          )
        ) || categories.find((c) => c.type === 'income') || categories[0]
      : categories.find((c) =>
          c.type === 'expense' || ['munchies', 'food', 'market', 'crypto', 'games', 'shopping'].some((k) =>
            c.id.toLowerCase().includes(k) || c.name.toLowerCase().includes(k)
          )
        ) || categories.find((c) => c.type === 'expense') || categories[0];

    const restoredTx: Transaction = {
      id: `tx-restored-${Date.now()}`,
      type: isIncome ? 'income' : 'expense',
      amount: entry.totalDebit || entry.amount,
      categoryId: defaultCat.id,
      description: entry.originalLabel || (isIncome ? `Recebimento Base: ${Web3Service.truncateAddress(entry.fromAddress)}` : `Pagamento Base: ${Web3Service.truncateAddress(entry.toAddress)}`),
      date: entry.timestamp,
      isOnChain: true,
      txHash: entry.txHash,
      tokenSymbol: entry.tokenSymbol || 'USDC',
      notes: `Liquidado na Base L2 • ${entry.tokenSymbol || 'USDC'} • De: ${Web3Service.truncateAddress(entry.fromAddress)} • Para: ${Web3Service.truncateAddress(entry.toAddress)}`,
      isOrganized: true,
    };

    if (onAddTransaction) {
      onAddTransaction(restoredTx);
    }
    setSelectedTxForDetail(restoredTx);
  };

  // Sync real on-chain transaction data with Base blockchain
  const handleSyncLedger = async () => {
    triggerHaptic('medium');
    setIsSyncingLedger(true);
    try {
      if (onRefreshOnChain) {
        await onRefreshOnChain();
      }
    } catch (e) {
      console.warn('Erro ao sincronizar com a blockchain:', e);
    } finally {
      loadLedger();
      setIsSyncingLedger(false);
      triggerHaptic('success');
    }
  };

  // Filtered organized transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return transactions.filter((tx) => {
      // Never display simulated or non-real transactions
      if (isSimulatedTransaction(tx)) return false;

      const txDate = new Date(tx.date);

      if (periodFilter === 'day' || periodFilter === 'today') {
        if (txDate < startOfDay) return false;
      } else if (periodFilter === 'week') {
        if (txDate < startOfWeek) return false;
      } else if (periodFilter === 'month') {
        if (txDate < startOfMonth) return false;
      } else if (periodFilter === 'year') {
        if (txDate < startOfYear) return false;
      }

      if (typeFilter === 'expense' && tx.type !== 'expense') {
        return false;
      }
      if (typeFilter === 'income' && tx.type !== 'income') {
        return false;
      }
      if (typeFilter === 'vault' && !tx.vaultId && tx.categoryId !== 'vault_deposit') {
        return false;
      }
      if (typeFilter === 'organized' && !isTransactionOrganized(tx)) {
        return false;
      }
      if (typeFilter === 'unorganized' && isTransactionOrganized(tx)) {
        return false;
      }

      if (selectedCatFilter !== 'all' && tx.categoryId !== selectedCatFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const cat = getCategory(tx.categoryId);
        const vault = tx.vaultId ? vaults.find((v) => v.id === tx.vaultId) : undefined;
        const matchDesc = tx.description?.toLowerCase().includes(query);
        const matchCat = cat?.name.toLowerCase().includes(query);
        const matchVault = vault?.title?.toLowerCase().includes(query);
        const matchHash = tx.txHash?.toLowerCase().includes(query);
        if (!matchDesc && !matchCat && !matchVault && !matchHash) return false;
      }

      return true;
    });
  }, [transactions, periodFilter, typeFilter, selectedCatFilter, searchQuery, categories, vaults]);

  // Filtered onchain ledger entries
  const filteredLedgerEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      // Only keep verified Base blockchain entries with authentic EVM hash
      if (isSimulatedLedgerEntry(entry)) return false;

      const matchTx = findOrganizedTx(entry);
      const isNamedInExtrato = Boolean(matchTx);

      if (ledgerFilter === 'send' && entry.type !== 'send') return false;
      if (ledgerFilter === 'receive' && entry.type !== 'receive') return false;

      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const matchHash = entry.txHash.toLowerCase().includes(q);
        const matchFrom = entry.fromAddress.toLowerCase().includes(q);
        const matchTo = entry.toAddress.toLowerCase().includes(q);
        const matchLabel = entry.originalLabel?.toLowerCase().includes(q);
        const matchNamed = matchTx?.description?.toLowerCase().includes(q);
        if (!matchHash && !matchFrom && !matchTo && !matchLabel && !matchNamed) return false;
      }

      return true;
    });
  }, [ledgerEntries, ledgerFilter, ledgerSearch, transactions]);

  // Summary calculations
  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const vaultDeposits = useMemo(() => {
    return filteredTransactions
      .filter((t) => (t.vaultId || t.categoryId === 'vault_deposit') && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const vaultWithdrawals = useMemo(() => {
    return filteredTransactions
      .filter((t) => (t.vaultId || t.categoryId === 'vault_deposit') && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const vaultCount = useMemo(() => {
    return transactions.filter(t => Boolean(t.vaultId) || t.categoryId === 'vault_deposit').length;
  }, [transactions]);

  const organizedCount = useMemo(() => {
    return transactions.filter(t => isTransactionOrganized(t)).length;
  }, [transactions]);

  const unorganizedCount = useMemo(() => {
    return transactions.filter(t => !isTransactionOrganized(t)).length;
  }, [transactions]);

  // Sliced transactions for infinite scroll / lazy loading
  const displayedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleTxCount);
  }, [filteredTransactions, visibleTxCount]);

  const hasMoreTx = visibleTxCount < filteredTransactions.length;

  const handleLoadMoreTx = useCallback(() => {
    if (!hasMoreTx || isLoadingMoreTx) return;
    setIsLoadingMoreTx(true);
    triggerHaptic('light');
    setTimeout(() => {
      setVisibleTxCount((prev) => Math.min(prev + PAGE_SIZE, filteredTransactions.length));
      setIsLoadingMoreTx(false);
    }, 150);
  }, [hasMoreTx, isLoadingMoreTx, filteredTransactions.length]);

  // Sliced ledger entries for infinite scroll / lazy loading
  const displayedLedgerEntries = useMemo(() => {
    return filteredLedgerEntries.slice(0, visibleLedgerCount);
  }, [filteredLedgerEntries, visibleLedgerCount]);

  const hasMoreLedger = visibleLedgerCount < filteredLedgerEntries.length;

  const handleLoadMoreLedger = useCallback(() => {
    if (!hasMoreLedger || isLoadingMoreLedger) return;
    setIsLoadingMoreLedger(true);
    triggerHaptic('light');
    setTimeout(() => {
      setVisibleLedgerCount((prev) => Math.min(prev + PAGE_SIZE, filteredLedgerEntries.length));
      setIsLoadingMoreLedger(false);
    }, 150);
  }, [hasMoreLedger, isLoadingMoreLedger, filteredLedgerEntries.length]);

  // Infinite Scroll with IntersectionObserver for transactions list
  useEffect(() => {
    if (viewMode !== 'organized' || !hasMoreTx) return;
    const sentinel = loadMoreTxSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMoreTx && !isLoadingMoreTx) {
          handleLoadMoreTx();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, hasMoreTx, isLoadingMoreTx, handleLoadMoreTx]);

  // Infinite Scroll with IntersectionObserver for Ledger
  useEffect(() => {
    if (viewMode !== 'ledger' || !hasMoreLedger) return;
    const sentinel = loadMoreLedgerSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMoreLedger && !isLoadingMoreLedger) {
          handleLoadMoreLedger();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, hasMoreLedger, isLoadingMoreLedger, handleLoadMoreLedger]);

  return (
    <div className="w-full pb-28 pt-2" id="transactions-screen-container">
      {/* Top Header & View Toggle (Organized Ledger vs Raw On-Chain History) */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="font-['Outfit'] font-black text-2xl text-black">
              {viewMode === 'organized' && t('tx_title_extrato')}
              {viewMode === 'analytics' && t('tx_title_analytics')}
              {viewMode === 'ledger' && t('tx_title_onchain')}
            </h2>
            <p className="text-xs font-bold text-neutral-500">
              {viewMode === 'organized' && t('tx_sub_extrato')}
              {viewMode === 'analytics' && t('tx_sub_analytics')}
              {viewMode === 'ledger' && t('tx_sub_onchain')}
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onRefreshOnChain && (
              <button
                type="button"
                onClick={handleSyncLedger}
                disabled={isSyncingLedger || isRefreshingOnChain}
                className="w-9 h-9 bg-white hover:bg-neutral-100 text-black border-2 border-black rounded-xl text-xs font-['Outfit'] font-black shadow-neo-xs btn-press flex items-center justify-center cursor-pointer disabled:opacity-60"
                id="btn-header-sync-blockchain"
                title={language === 'en-US' ? 'Sync' : 'Sincronizar'}
                aria-label="Sincronizar"
              >
                <RefreshCw
                  className={`w-4 h-4 text-[#0052FF] ${
                    isSyncingLedger || isRefreshingOnChain ? 'animate-spin' : ''
                  }`}
                />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsExportModalOpen(true);
              }}
              className="w-9 h-9 bg-white hover:bg-neutral-100 text-black border-2 border-black rounded-xl text-xs font-['Outfit'] font-black shadow-neo-xs btn-press flex items-center justify-center cursor-pointer"
              id="btn-header-export-data"
              title={language === 'en-US' ? 'Export' : 'Exportar'}
              aria-label="Exportar"
            >
              <Download className="w-4 h-4 text-purple-700" />
            </button>
          </div>
        </div>

        {/* View Mode Toggle (3 Options: Ledger, Analytics, On-Chain) */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-neutral-100 border-2 border-black rounded-2xl shadow-neo-sm mb-4">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setViewMode('organized');
            }}
            className={`py-2 px-2 rounded-xl border-2 font-['Outfit'] font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'organized'
                ? 'bg-white text-black border-black shadow-neo-xs'
                : 'border-transparent text-neutral-600 hover:text-black'
            }`}
            id="tab-view-organized"
          >
            <Layers className="w-3.5 h-3.5 text-purple-700" />
            <span className="truncate">{t('tx_tab_organized')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setViewMode('analytics');
            }}
            className={`py-2 px-2 rounded-xl border-2 font-['Outfit'] font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'analytics'
                ? 'bg-[#B8F256] text-black border-black shadow-neo-xs'
                : 'border-transparent text-neutral-600 hover:text-black'
            }`}
            id="tab-view-analytics"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-800" />
            <span className="truncate">{t('tx_tab_analytics')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setViewMode('ledger');
            }}
            className={`py-2 px-2 rounded-xl border-2 font-['Outfit'] font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'ledger'
                ? 'bg-[#0052FF] text-white border-black shadow-neo-xs'
                : 'border-transparent text-neutral-600 hover:text-black'
            }`}
            id="tab-view-ledger"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="truncate">{t('tx_tab_ledger')}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: ORGANIZED LEDGER (Categories, budgets, edits, charts) */}
      {/* ========================================================================= */}
      {viewMode === 'organized' && (
        <div className="space-y-4">
          {/* Search input */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('tx_search_placeholder')}
              className="w-full bg-white border-2 border-black rounded-2xl pl-10 pr-4 py-2.5 text-sm font-bold text-black focus:outline-hidden shadow-neo-sm placeholder:text-neutral-400"
              id="input-search-transactions"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black bg-neutral-200 hover:bg-neutral-300 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Ledger Card (View periods: Day, Week, Month, Year, All) */}
          <div className="bg-white border-2 border-black rounded-2xl p-2.5 sm:p-3.5 shadow-neo space-y-2">
            {/* Header with Card Name and Compact Metrics */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-['Outfit'] font-black text-xs sm:text-sm text-black uppercase tracking-wide">
                  {t('tx_tab_organized')}
                </span>
                <span className="text-[10px] font-bold text-neutral-500 font-mono">
                  ({filteredTransactions.length})
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md border border-black/20 shrink-0">
                <CheckCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{organizedCount}/{transactions.length}</span>
              </div>
            </div>

            {/* Segmented Period Selector (Dia, Semana, Mês, Ano, Todos) */}
            <div className="grid grid-cols-5 gap-1 p-0.5 sm:p-1 bg-neutral-100 border border-black/25 rounded-xl shadow-neo-xs">
              {[
                { id: 'day', label: t('tx_period_day') },
                { id: 'week', label: t('tx_period_week') },
                { id: 'month', label: t('tx_period_month') },
                { id: 'year', label: t('tx_period_year') },
                { id: 'all', label: t('tx_period_all') },
              ].map((p) => {
                const isActive = periodFilter === p.id || (p.id === 'day' && periodFilter === 'today');
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setPeriodFilter(p.id as PeriodFilter);
                    }}
                    className={`py-1 px-1 rounded-lg font-['Outfit'] font-black text-[11px] sm:text-xs transition-all text-center truncate cursor-pointer ${
                      isActive
                        ? 'bg-[#B8F256] text-black border border-black shadow-neo-xs'
                        : 'text-neutral-700 hover:text-black hover:bg-neutral-200/60'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* 3 Compact Financial Cards (Inflows, Outflows, Net Balance) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
              {typeFilter === 'vault' ? (
                <>
                  <div className="bg-[#EDE9FE]/80 border border-purple-300 rounded-xl p-1.5 sm:p-2 min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-purple-900 uppercase tracking-wider block truncate">
                      {t('tx_sum_saved')}
                    </span>
                    <span className="font-['Outfit'] font-black text-xs sm:text-sm text-purple-800 block truncate">
                      {formatCurrency(convertFromUsdc(vaultDeposits, activeCurrency), activeCurrency)}
                    </span>
                  </div>

                  <div className="bg-[#E4F97E]/60 border border-emerald-300 rounded-xl p-1.5 sm:p-2 min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-900 uppercase tracking-wider block truncate">
                      {t('tx_sum_withdrawn')}
                    </span>
                    <span className="font-['Outfit'] font-black text-xs sm:text-sm text-emerald-700 block truncate">
                      {formatCurrency(convertFromUsdc(vaultWithdrawals, activeCurrency), activeCurrency)}
                    </span>
                  </div>

                  <div className="bg-purple-100/90 border border-purple-400 rounded-xl p-1.5 sm:p-2 min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-purple-950 uppercase tracking-wider block truncate">
                      {t('tx_sum_retained')}
                    </span>
                    <span className="font-['Outfit'] font-black text-xs sm:text-sm text-purple-900 block truncate">
                      {formatCurrency(convertFromUsdc(Math.max(0, vaultDeposits - vaultWithdrawals), activeCurrency), activeCurrency)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-[#E4F97E]/40 border border-black/20 rounded-xl p-1.5 sm:p-2 min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-900 uppercase tracking-wider block truncate">
                      {t('tx_sum_incomes')}
                    </span>
                    <span className="font-['Outfit'] font-black text-xs sm:text-sm text-emerald-700 block truncate">
                      +{formatCurrency(convertFromUsdc(totalIncome, activeCurrency), activeCurrency)}
                    </span>
                  </div>

                  <div className="bg-[#FFE4E6]/40 border border-black/20 rounded-xl p-1.5 sm:p-2 min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-rose-900 uppercase tracking-wider block truncate">
                      {t('tx_sum_expenses')}
                    </span>
                    <span className="font-['Outfit'] font-black text-xs sm:text-sm text-rose-600 block truncate">
                      -{formatCurrency(convertFromUsdc(totalExpense, activeCurrency), activeCurrency)}
                    </span>
                  </div>

                  <div className="bg-[#EDE9FE]/50 border border-black/20 rounded-xl p-1.5 sm:p-2 min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-purple-900 uppercase tracking-wider block truncate">
                      {t('tx_sum_net')}
                    </span>
                    <span
                      className={`font-['Outfit'] font-black text-xs sm:text-sm block truncate ${
                        netBalance >= 0 ? 'text-purple-900' : 'text-rose-600'
                      }`}
                    >
                      {netBalance >= 0 ? '+' : ''}
                      {formatCurrency(convertFromUsdc(netBalance, activeCurrency), activeCurrency)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Type & Organization Filters (Single Line Centered Grid) */}
          <div className={`grid ${unorganizedCount > 0 ? 'grid-cols-5' : 'grid-cols-4'} gap-1 sm:gap-1.5 w-full items-center`}>
            <button
              onClick={() => {
                triggerHaptic('light');
                setTypeFilter('all');
              }}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border-2 font-['Outfit'] font-black text-[11px] sm:text-xs text-center truncate cursor-pointer transition-all flex items-center justify-center gap-1 ${
                typeFilter === 'all'
                  ? 'bg-[#EDE9FE] text-purple-950 border-black shadow-neo-xs'
                  : 'bg-white text-neutral-600 border-black/20 hover:border-black/50'
              }`}
            >
              <span>{t('tx_filter_all')}</span>
              <span className="text-[10px] opacity-75 font-mono">({transactions.length})</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setTypeFilter('expense');
              }}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border-2 font-['Outfit'] font-black text-[11px] sm:text-xs text-center truncate cursor-pointer transition-all flex items-center justify-center ${
                typeFilter === 'expense'
                  ? 'bg-[#FFE4E6] text-rose-950 border-black shadow-neo-sm'
                  : 'bg-white text-neutral-600 border-black/20 hover:border-black/50'
              }`}
            >
              {t('tx_filter_expense')}
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setTypeFilter('income');
              }}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border-2 font-['Outfit'] font-black text-[11px] sm:text-xs text-center truncate cursor-pointer transition-all flex items-center justify-center ${
                typeFilter === 'income'
                  ? 'bg-[#E4F97E] text-emerald-950 border-black shadow-neo-sm'
                  : 'bg-white text-neutral-600 border-black/20 hover:border-black/50'
              }`}
            >
              {t('tx_filter_income')}
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setTypeFilter('vault');
              }}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border-2 font-['Outfit'] font-black text-[11px] sm:text-xs text-center truncate cursor-pointer flex items-center justify-center gap-1 transition-all ${
                typeFilter === 'vault'
                  ? 'bg-[#EDE9FE] text-purple-950 border-black shadow-neo-sm'
                  : 'bg-white text-neutral-600 border-black/20 hover:border-purple-600/50 hover:bg-purple-50'
              }`}
              title={language === 'en-US' ? 'Vaults' : 'Cofres'}
              id="filter-btn-vaults"
            >
              <VaultIcon className="w-3 h-3 text-purple-700 stroke-[2.5] shrink-0" />
              <span>{t('tx_filter_vault')}</span>
            </button>

            {unorganizedCount > 0 && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setTypeFilter('unorganized');
                }}
                className={`py-1.5 px-1 sm:px-2 rounded-xl border-2 font-['Outfit'] font-black text-[11px] sm:text-xs text-center truncate cursor-pointer flex items-center justify-center gap-1 transition-all ${
                  typeFilter === 'unorganized'
                    ? 'bg-[#FEF3C7] text-amber-950 border-black shadow-neo-sm'
                    : 'bg-white text-neutral-600 border-black/20 hover:border-amber-600/50 hover:bg-amber-50'
                }`}
                title={language === 'en-US' ? 'Pending' : 'Pendentes'}
              >
                <Edit3 className="w-3 h-3 text-amber-700 shrink-0" />
                <span>{language === 'pt-BR' ? 'Pendentes' : 'Pending'}</span>
              </button>
            )}
          </div>

          {/* Transactions List */}
          <div className="space-y-2.5">
            {filteredTransactions.length === 0 ? (
              transactions.length === 0 ? (
                <div className="text-center py-8 bg-white border-2 border-dashed border-black/30 rounded-2xl p-4 space-y-3">
                  <span className="text-3xl block">✨</span>
                  <div>
                    <h4 className="font-['Outfit'] font-black text-base text-black">
                      {language === 'pt-BR' ? 'Seu extrato inteligente começa aqui' : 'Your smart ledger starts here'}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                      {language === 'pt-BR'
                        ? 'Movimentações em USDC na rede Base ou lançamentos organizados aparecem automaticamente.'
                        : 'USDC transfers on Base L2 or recorded entries appear here automatically.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {onOpenSend && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('medium');
                          onOpenSend();
                        }}
                        className="py-1.5 px-3 bg-[#B8F256] hover:bg-[#A3E635] text-black border border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{language === 'pt-BR' ? '⚡ Enviar USDC' : '⚡ Send USDC'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setViewMode('ledger');
                      }}
                      className="py-1.5 px-3 bg-white hover:bg-neutral-50 text-neutral-800 border border-black/30 rounded-xl font-['Outfit'] font-bold text-xs shadow-neo-xs btn-press cursor-pointer"
                    >
                      <span>{language === 'pt-BR' ? '⛓️ Ver On-Chain' : '⛓️ View On-Chain'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-white border-2 border-dashed border-black/30 rounded-2xl p-4">
                  <span className="text-2xl">🔍</span>
                  <h4 className="font-['Outfit'] font-bold text-sm text-black mt-2">
                    {language === 'pt-BR' ? 'Nenhum lançamento no filtro' : 'No entries found in filter'}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1 mb-3">
                    {language === 'pt-BR'
                      ? <>Transações on-chain brutas podem ser consultadas na aba <strong>On-Chain</strong>.</>
                      : <>Raw on-chain transactions can be checked in the <strong>On-Chain</strong> tab.</>}
                  </p>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setViewMode('ledger');
                    }}
                    className="bg-[#0052FF] text-white border border-black rounded-lg px-3 py-1.5 text-xs font-black shadow-neo-xs btn-press cursor-pointer"
                  >
                    {language === 'pt-BR' ? 'Ver On-Chain' : 'View On-Chain'}
                  </button>
                </div>
              )
            ) : (
              <>
                {displayedTransactions.map((tx) => {
                  const category = getCategory(tx.categoryId);
                  const isIncome = tx.type === 'income';
                  const isOrganized = isTransactionOrganized(tx);
                  const isVaultMovement = Boolean(tx.vaultId || tx.categoryId === 'vault_deposit');
                  const vault = tx.vaultId ? vaults.find((v) => v.id === tx.vaultId) : undefined;

                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedTxForDetail(tx);
                      }}
                      className={`w-full ${
                        isVaultMovement ? 'bg-[#FAF8FF]' : 'bg-white'
                      } border-2 border-black rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-neo-sm hover:translate-x-0.5 transition-transform gap-2 cursor-pointer group`}
                      id={`tx-item-${tx.id}`}
                    >
                      {/* Left */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border-2 border-black flex items-center justify-center text-lg sm:text-xl flex-shrink-0"
                          style={{ backgroundColor: isVaultMovement ? '#EDE9FE' : (category?.bgColor || '#EDE9FE') }}
                        >
                          {isVaultMovement
                            ? (vault?.emoji || '🔒')
                            : (category?.emoji || (isIncome ? '💰' : '💸'))}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="font-['Outfit'] font-black text-xs sm:text-base text-black leading-tight truncate group-hover:text-blue-600 transition-colors">
                              {tx.description || category?.name || (language === 'pt-BR' ? 'Transação' : 'Transaction')}
                            </h4>

                            {/* Visual indicator: Check (Organized) or Pencil (Pending) */}
                            {isOrganized ? (
                              <span
                                className="inline-flex items-center justify-center bg-[#DCFCE7] text-emerald-950 p-1 rounded-md border border-emerald-600/40 flex-shrink-0"
                                title={language === 'pt-BR' ? 'Organizado' : 'Organized'}
                              >
                                <Check className="w-2.5 h-2.5 stroke-[3] text-emerald-700" />
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center justify-center bg-[#FEF3C7] text-amber-950 p-1 rounded-md border border-amber-600/40 flex-shrink-0 animate-pulse"
                                title={language === 'pt-BR' ? 'Pendente de personalização' : 'Pending details'}
                              >
                                <Edit3 className="w-2.5 h-2.5 text-amber-700" />
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-neutral-500 mt-0.5">
                            <span className="truncate">{category?.name}</span>
                            <span>•</span>
                            <span className="flex-shrink-0">{formatRelativeDate(tx.date, language)}</span>

                            {/* Vault Badge */}
                            {isVaultMovement && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded border border-purple-300 flex-shrink-0">
                                  <VaultIcon className="w-2.5 h-2.5 text-purple-700 stroke-[2.5]" />
                                  <span className="max-w-[110px] truncate">{vault?.title || (language === 'pt-BR' ? 'Cofre' : 'Vault')}</span>
                                </span>
                              </>
                            )}
                          </div>

                          {/* Transaction Memo (if present) */}
                          {tx.notes && tx.notes.trim() && (
                            <div
                              className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-600 bg-neutral-100/90 px-2 py-0.5 rounded-md border border-black/10 w-fit max-w-full"
                              title={language === 'pt-BR' ? `Anotação: ${tx.notes}` : `Note: ${tx.notes}`}
                            >
                              <StickyNote className="w-3 h-3 text-amber-600 flex-shrink-0" />
                              <span className="truncate font-medium italic">{tx.notes.trim()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <div className="text-right">
                          <span
                            className={`font-['Outfit'] font-black text-xs sm:text-base block ${
                              isVaultMovement
                                ? (isIncome ? 'text-emerald-700' : 'text-purple-700')
                                : (isIncome ? 'text-emerald-600' : 'text-rose-600')
                            }`}
                          >
                            {isIncome ? '+' : '-'}
                            {formatCurrency(convertFromUsdc(tx.amount, activeCurrency), activeCurrency)}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('light');
                            setSelectedTxForDetail(tx);
                          }}
                          className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-100 border border-transparent hover:border-black/20 flex-shrink-0 transition-colors cursor-pointer"
                          title={language === 'en-US' ? 'Edit' : 'Editar'}
                          id={`btn-edit-tx-${tx.id}`}
                        >
                          <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('light');
                            setTxToDelete(tx);
                          }}
                          className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-black/20 flex-shrink-0 transition-colors cursor-pointer"
                          title={language === 'en-US' ? 'Delete' : 'Excluir'}
                          id={`btn-delete-tx-${tx.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Lazy Loading Sentinel & Load More Action */}
                {hasMoreTx && (
                  <div className="pt-2 pb-1 text-center">
                    <div ref={loadMoreTxSentinelRef} className="h-2" />
                    <button
                      type="button"
                      onClick={handleLoadMoreTx}
                      disabled={isLoadingMoreTx}
                      className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 active:bg-neutral-100 border-2 border-black rounded-xl font-['Outfit'] font-black text-xs text-black shadow-neo-sm btn-press cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                      id="btn-load-more-tx"
                    >
                      {isLoadingMoreTx ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0052FF]" />
                          <span>{language === 'pt-BR' ? 'Carregando próximos lançamentos...' : 'Loading next entries...'}</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 text-black stroke-[2.5]" />
                          <span>{language === 'pt-BR' ? `Carregar mais (+${Math.min(PAGE_SIZE, filteredTransactions.length - displayedTransactions.length)})` : `Load more (+${Math.min(PAGE_SIZE, filteredTransactions.length - displayedTransactions.length)})`}</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] font-bold text-neutral-400 mt-2">
                      {language === 'pt-BR'
                        ? `Exibindo ${displayedTransactions.length} de ${filteredTransactions.length} lançamentos`
                        : `Showing ${displayedTransactions.length} of ${filteredTransactions.length} entries`}
                    </p>
                  </div>
                )}

                {!hasMoreTx && filteredTransactions.length > PAGE_SIZE && (
                  <div className="pt-3 pb-1 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-black/15 text-[11px] font-bold text-neutral-500">
                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                      {language === 'pt-BR' ? `Todos os ${filteredTransactions.length} lançamentos exibidos` : `All ${filteredTransactions.length} entries displayed`}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: GRÁFICOS & ANÁLISES FINANCEIRAS                                   */}
      {/* ========================================================================= */}
      {viewMode === 'analytics' && (
        <div className="animate-in fade-in duration-200">
          <AnalyticsScreen
            transactions={transactions}
            categories={categories}
            currency={currency}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: HISTÓRICO GERAL ON-CHAIN (RAW BLOCKCHAIN AUDIT)                   */}
      {/* ========================================================================= */}
      {viewMode === 'ledger' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Search & Sync on Blockchain Ledger */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder={language === 'pt-BR' ? 'Hash, Endereço, Nome...' : 'Hash, Address, Tag...'}
                className="w-full bg-white border-2 border-black rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-black focus:outline-hidden shadow-neo-sm placeholder:text-neutral-400 font-mono"
              />
              {ledgerSearch && (
                <button
                  onClick={() => setLedgerSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black bg-neutral-200 hover:bg-neutral-300 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSyncLedger}
              disabled={isSyncingLedger}
              className="w-10 h-10 bg-white hover:bg-neutral-50 border-2 border-black rounded-2xl text-xs font-['Outfit'] font-black text-black shadow-neo-sm flex items-center justify-center cursor-pointer flex-shrink-0"
              title={language === 'en-US' ? 'Refresh' : 'Atualizar'}
              aria-label="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 text-[#0052FF] ${isSyncingLedger ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter Chips for Ledger */}
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1 w-full">
            {[
              { id: 'all', label: language === 'pt-BR' ? `Todas (${ledgerEntries.length})` : `All (${ledgerEntries.length})` },
              { id: 'send', label: language === 'pt-BR' ? '💸 Enviadas' : '💸 Sent' },
              { id: 'receive', label: language === 'pt-BR' ? '💰 Recebidas' : '💰 Received' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setLedgerFilter(f.id as any);
                }}
                className={`py-1.5 px-3 rounded-xl border-2 font-['Outfit'] font-black text-xs whitespace-nowrap transition-all cursor-pointer ${
                  ledgerFilter === f.id
                    ? 'bg-[#B8F256] text-black border-black shadow-neo-sm scale-[1.02]'
                    : 'bg-white text-neutral-700 border-black/30 hover:border-black'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Ledger Transaction Cards */}
          <div className="space-y-3">
            {filteredLedgerEntries.length === 0 ? (
              <div className="text-center py-10 bg-white border-2 border-dashed border-black/30 rounded-2xl p-4">
                <span className="text-3xl">⛓️</span>
                <h4 className="font-['Outfit'] font-bold text-base text-black mt-2">
                  {language === 'pt-BR' ? 'Nenhuma transação on-chain encontrada no filtro!' : 'No on-chain transactions found in filter!'}
                </h4>
                <p className="text-xs text-neutral-500 mt-1">
                  {language === 'pt-BR'
                    ? 'Faça um envio de cripto via QR Code ou receba USDC na sua carteira para registrar novos blocos.'
                    : 'Send crypto via QR Code or receive USDC in your wallet to record new blocks.'}
                </p>
              </div>
            ) : (
              <>
                {displayedLedgerEntries.map((entry) => {
                  const organizedTx = findOrganizedTx(entry);
                  const isNamedInExtrato = Boolean(organizedTx);
                  const isSend = entry.type === 'send';
                  const isCopied = copiedHash === entry.txHash;

                  return (
                    <div
                      key={entry.txHash}
                      className="bg-white border-2 border-black rounded-2xl p-3.5 shadow-neo-sm space-y-2.5 relative"
                    >
                      {/* Header Row: Status, Date, Time & Value */}
                      <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center font-black ${
                              isSend ? 'bg-[#FFE4E6] text-rose-700' : 'bg-[#DCFCE7] text-emerald-700'
                            }`}
                          >
                            {isSend ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : (
                              <ArrowDownLeft className="w-5 h-5" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-['Outfit'] font-black text-xs text-black">
                                {isSend ? (language === 'pt-BR' ? 'Envio USDC' : 'USDC Sent') : (language === 'pt-BR' ? 'Recebido USDC' : 'USDC Received')}
                              </span>
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.2 rounded border border-emerald-300">
                                {language === 'pt-BR' ? '✓ Confirmado' : '✓ Confirmed'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500">
                              <Clock className="w-3 h-3" />
                              <span>{formatExactDateTime(entry.timestamp)}</span>
                              {entry.blockNumber && (
                                <span className="font-mono text-[10px] text-neutral-400">
                                  • {language === 'pt-BR' ? 'Bloco #' : 'Block #'}{entry.blockNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-['Outfit'] font-black text-base sm:text-lg block ${
                              isSend ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {isSend ? '-' : '+'}${entry.amount.toFixed(2)} USDC
                          </span>
                          {entry.totalDebit && entry.totalDebit > entry.amount && (
                            <span className="text-[10px] text-neutral-400 font-bold block">
                              {language === 'pt-BR' ? 'Débito total: ' : 'Total debit: '}${entry.totalDebit.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ledger Status Banner: Categorized vs Uncategorized / Excluded */}
                      <div
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold ${
                          isNamedInExtrato
                            ? 'bg-[#F0FDF4] border-emerald-300 text-emerald-950'
                            : 'bg-[#FFFBEB] border-amber-300 text-amber-950'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span>{isNamedInExtrato ? '🏷️' : '⚠️'}</span>
                          <span className="truncate">
                            {isNamedInExtrato
                              ? `${language === 'pt-BR' ? 'Extrato' : 'Activity'}: "${organizedTx?.description}"`
                              : (language === 'pt-BR' ? 'Sem categoria / Crua' : 'Uncategorized / Raw')}
                          </span>
                        </div>

                        {isNamedInExtrato ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (organizedTx) {
                                triggerHaptic('light');
                                setSelectedTxForDetail(organizedTx);
                              }
                            }}
                            className="w-7 h-7 bg-white hover:bg-neutral-100 border border-black/30 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
                            title={language === 'en-US' ? 'Edit' : 'Editar'}
                            aria-label="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-black" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestoreToExtrato(entry)}
                            className="w-7 h-7 bg-[#B8F256] hover:bg-[#A3E635] border border-black rounded-lg flex items-center justify-center shadow-neo-xs cursor-pointer flex-shrink-0"
                            title={language === 'en-US' ? 'Organize' : 'Organizar'}
                            aria-label="Organizar"
                          >
                            <PlusCircle className="w-4 h-4 text-black" />
                          </button>
                        )}
                      </div>

                      {/* Transaction Summary */}
                      <div className="p-2.5 bg-[#F8FAFC] border border-black/10 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500 font-medium">
                            {isSend ? (language === 'pt-BR' ? 'Destinatário:' : 'To:') : (language === 'pt-BR' ? 'Remetente:' : 'From:')}
                          </span>
                          <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-black">
                            <span>{Web3Service.truncateAddress(isSend ? entry.toAddress : entry.fromAddress)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(isSend ? entry.toAddress : entry.fromAddress, `addr-${entry.txHash}`)}
                              className="p-0.5 hover:text-black text-neutral-400"
                              title={language === 'en-US' ? 'Copy' : 'Copiar'}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {isSend && entry.totalDebit && entry.totalDebit > entry.amount && (
                          <div className="flex items-center justify-between border-t border-black/5 pt-1">
                            <span className="text-neutral-500 font-medium">{language === 'pt-BR' ? 'Total debitado:' : 'Total debited:'}</span>
                            <span className="font-mono font-bold text-rose-600">
                              ${entry.totalDebit.toFixed(2)} USDC
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-black/5 pt-1">
                          <span className="text-neutral-500 font-medium">{language === 'pt-BR' ? 'Comprovante:' : 'Explorer:'}</span>
                          <a
                            href={Web3Service.getExplorerUrl(entry.txHash, 'tx', entry.network as any)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0052FF] hover:underline flex items-center gap-1 font-mono font-bold text-[11px]"
                          >
                            <span>{Web3Service.truncateAddress(entry.txHash)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Lazy Loading Sentinel & Load More Action for Ledger */}
                {hasMoreLedger && (
                  <div className="pt-2 pb-1 text-center">
                    <div ref={loadMoreLedgerSentinelRef} className="h-2" />
                    <button
                      type="button"
                      onClick={handleLoadMoreLedger}
                      disabled={isLoadingMoreLedger}
                      className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 active:bg-neutral-100 border-2 border-black rounded-xl font-['Outfit'] font-black text-xs text-black shadow-neo-sm btn-press cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                      id="btn-load-more-ledger"
                    >
                      {isLoadingMoreLedger ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0052FF]" />
                          <span>{language === 'pt-BR' ? 'Buscando blocos anteriores...' : 'Fetching previous blocks...'}</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 text-black stroke-[2.5]" />
                          <span>{language === 'pt-BR' ? `Ver mais transações on-chain (+${Math.min(PAGE_SIZE, filteredLedgerEntries.length - displayedLedgerEntries.length)})` : `Load more on-chain transactions (+${Math.min(PAGE_SIZE, filteredLedgerEntries.length - displayedLedgerEntries.length)})`}</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] font-bold text-neutral-400 mt-2 font-mono">
                      {language === 'pt-BR' ? `Exibindo ${displayedLedgerEntries.length} de ${filteredLedgerEntries.length} blocos` : `Showing ${displayedLedgerEntries.length} of ${filteredLedgerEntries.length} blocks`}
                    </p>
                  </div>
                )}

                {!hasMoreLedger && filteredLedgerEntries.length > PAGE_SIZE && (
                  <div className="pt-3 pb-1 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-black/15 text-[11px] font-bold text-neutral-500">
                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                      {language === 'pt-BR' ? `Fim do histórico on-chain (${filteredLedgerEntries.length} transações)` : `End of on-chain ledger (${filteredLedgerEntries.length} transactions)`}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Transaction Detail & Edit Modal */}
      {selectedTxForDetail && (
        <TransactionDetailModal
          isOpen={Boolean(selectedTxForDetail)}
          transaction={selectedTxForDetail}
          categories={categories}
          vaults={vaults}
          currency={currency}
          userEmail={user?.email}
          onClose={() => setSelectedTxForDetail(null)}
          onUpdate={(updatedTx) => {
            if (onUpdateTransaction) {
              onUpdateTransaction(updatedTx);
            }
            setSelectedTxForDetail(null);
          }}
          onDelete={(id) => {
            onDeleteTransaction(id);
            setSelectedTxForDetail(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setTxToDelete(null)} />
          <div className="relative w-full max-w-sm bg-white border-2 border-black rounded-[24px] shadow-neo-xl p-5 z-10 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FFE4E6] border-2 border-black flex items-center justify-center text-2xl mx-auto mb-3 shadow-neo-xs">
              🗑️
            </div>

            <h3 className="font-['Outfit'] font-black text-lg text-black">
              {language === 'pt-BR' ? 'Remover do Extrato?' : 'Remove from Activity?'}
            </h3>

            <p className="text-xs text-neutral-600 font-medium mt-1.5 mb-2 px-2">
              {language === 'pt-BR'
                ? <>Deseja remover <strong>{txToDelete.description || 'este lançamento'}</strong> ({formatCurrency(convertFromUsdc(txToDelete.amount, activeCurrency), activeCurrency)}) do seu extrato?</>
                : <>Do you want to remove <strong>{txToDelete.description || 'this entry'}</strong> ({formatCurrency(convertFromUsdc(txToDelete.amount, activeCurrency), activeCurrency)}) from your activity log?</>}
            </p>

            <p className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded-xl p-2 mb-4 font-semibold text-left">
              {language === 'pt-BR'
                ? 'ℹ️ A transação continuará gravada permanentemente na Blockchain e na aba On-Chain.'
                : 'ℹ️ The transaction remains permanently recorded on the Blockchain and in the On-Chain tab.'}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-black border-2 border-black rounded-xl font-['Outfit'] font-bold text-xs btn-press cursor-pointer"
              >
                {t('modal_cancel')}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('warning');
                  onDeleteTransaction(txToDelete.id);
                  setTxToDelete(null);
                }}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer"
                id="btn-confirm-delete-tx"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('modal_confirm')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Export Data Modal (PDF / CSV / Share) */}
      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        categories={categories}
        user={user || {
          id: 'user_default',
          name: 'Usuário',
          username: 'usuario',
          avatarUrl: '',
          isGoogleAuth: false,
          streakDays: 1,
          lastActiveDate: new Date().toISOString(),
          dailySpendLimit: 50,
          hideBalance: false,
          hapticsEnabled: true,
          currency: currency || 'BRL',
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
});
