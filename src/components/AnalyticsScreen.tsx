import React, { useState, useMemo } from 'react';
import { Transaction, Category } from '../types';
import { Calendar, Tag, BarChart3, AlertTriangle, CheckCircle2, X, Zap } from 'lucide-react';
import { formatUsdcAsCurrency as formatCurrency } from '../utils/storage';
import { triggerHaptic } from '../utils/haptics';
import { useI18n } from '../hooks/useI18n';

interface AnalyticsScreenProps {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
}

export type AnalyticsTimeframe = 'month' | 'year';
export type AnalyticsTab = 'expenses' | 'income' | 'all';

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = React.memo(({
  transactions,
  categories,
  currency,
}) => {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('month');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('all');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [isGeneratingRayX, setIsGeneratingRayX] = useState(false);
  const [showRayXModal, setShowRayXModal] = useState(false);
  const { t, language } = useI18n();

  const now = useMemo(() => new Date(), []);
  const monthNames = language === 'pt-BR' ? [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ] : [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filter transactions according to selected timeframe (month or year)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.date);

      if (timeframe === 'month') {
        return (
          txDate.getFullYear() === now.getFullYear() &&
          txDate.getMonth() === now.getMonth()
        );
      }

      if (timeframe === 'year') {
        return txDate.getFullYear() === now.getFullYear();
      }

      return true;
    });
  }, [transactions, timeframe, now]);

  const expenseTx = filteredTransactions.filter(t => t.type === 'expense');
  const incomeTx = filteredTransactions.filter(t => t.type === 'income');

  const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Group by Category for the selected timeframe
  const activeTxList = activeTab === 'expenses' 
    ? expenseTx 
    : activeTab === 'income' 
      ? incomeTx 
      : filteredTransactions;

  const currentTotal = activeTab === 'expenses' 
    ? totalExpense 
    : activeTab === 'income' 
      ? totalIncome 
      : (totalExpense + totalIncome);

  const categoryMap = new Map<string, { total: number; type: 'expense' | 'income' | 'mixed' }>();
  activeTxList.forEach(tx => {
    const prev = categoryMap.get(tx.categoryId);
    if (!prev) {
      categoryMap.set(tx.categoryId, { total: tx.amount, type: tx.type });
    } else {
      categoryMap.set(tx.categoryId, { 
        total: prev.total + tx.amount, 
        type: prev.type === tx.type ? prev.type : 'mixed' 
      });
    }
  });

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([catId, data]) => {
      const cat = categories.find(c => c.id === catId);
      const percentage = currentTotal > 0 ? Math.round((data.total / currentTotal) * 100) : 0;
      return {
        id: catId,
        name: cat?.name || 'Outro',
        emoji: cat?.emoji || '📦',
        bgColor: cat?.bgColor || '#EDE9FE',
        textColor: cat?.textColor || '#000',
        total: data.total,
        type: data.type,
        percentage,
      };
    })
    .sort((a, b) => b.total - a.total);

  // ==========================================
  // 1. DATA CALCULATION FOR MONTH (4 Periods of Current Month)
  // ==========================================
  const currentMonthData = useMemo(() => {
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const todayDate = now.getDate();
    const isEn = language === 'en-US';

    const periods = [
      { key: 'p1', shortLabel: '01-07', subLabel: isEn ? 'Days 1-7' : 'Dia 1 a 7', fullLabel: isEn ? `${monthNames[curMonth]} 01 to 07` : `01 a 07 de ${monthNames[curMonth]}`, minDay: 1, maxDay: 7 },
      { key: 'p2', shortLabel: '08-14', subLabel: isEn ? 'Days 8-14' : 'Dia 8 a 14', fullLabel: isEn ? `${monthNames[curMonth]} 08 to 14` : `08 a 14 de ${monthNames[curMonth]}`, minDay: 8, maxDay: 14 },
      { key: 'p3', shortLabel: '15-21', subLabel: isEn ? 'Days 15-21' : 'Dia 15 a 21', fullLabel: isEn ? `${monthNames[curMonth]} 15 to 21` : `15 a 21 de ${monthNames[curMonth]}`, minDay: 15, maxDay: 21 },
      { key: 'p4', shortLabel: '22-31', subLabel: isEn ? 'Days 22-31' : 'Dia 22 a 31', fullLabel: isEn ? `${monthNames[curMonth]} 22 to 31` : `22 a 31 de ${monthNames[curMonth]}`, minDay: 22, maxDay: 31 },
    ];

    const periodsData = periods.map(p => {
      const isCurrent = todayDate >= p.minDay && todayDate <= p.maxDay;
      return {
        ...p,
        isCurrent,
        expenseAmount: 0,
        incomeAmount: 0,
        txCount: 0,
      };
    });

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === curYear && txDate.getMonth() === curMonth) {
        const d = txDate.getDate();
        const match = periodsData.find(p => d >= p.minDay && d <= p.maxDay);
        if (match) {
          match.txCount += 1;
          if (tx.type === 'expense') match.expenseAmount += tx.amount;
          else if (tx.type === 'income') match.incomeAmount += tx.amount;
        }
      }
    });

    return periodsData;
  }, [transactions, now, monthNames, language]);

  // ==========================================
  // 2. DATA CALCULATION FOR YEAR (12 Months)
  // ==========================================
  const currentYearData = useMemo(() => {
    const isEn = language === 'en-US';
    const monthShort = isEn 
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const curYear = now.getFullYear();
    const curMonthIdx = now.getMonth();

    const monthsData = monthShort.map((m, idx) => ({
      key: `m_${idx}`,
      shortLabel: m,
      subLabel: `${idx + 1 < 10 ? '0' + (idx + 1) : idx + 1}/${curYear.toString().slice(-2)}`,
      fullLabel: isEn ? `${monthNames[idx]} ${curYear}` : `${monthNames[idx]} de ${curYear}`,
      isCurrent: idx === curMonthIdx,
      expenseAmount: 0,
      incomeAmount: 0,
      txCount: 0,
    }));

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === curYear) {
        const mIdx = txDate.getMonth();
        if (monthsData[mIdx]) {
          monthsData[mIdx].txCount += 1;
          if (tx.type === 'expense') monthsData[mIdx].expenseAmount += tx.amount;
          else if (tx.type === 'income') monthsData[mIdx].incomeAmount += tx.amount;
        }
      }
    });

    return monthsData;
  }, [transactions, now, monthNames, language]);

  // Active chart series based on selected timeframe
  const activeSeries = timeframe === 'month' ? currentMonthData : currentYearData;
  
  // Calculate maximum value for chart scaling
  const maxChartAmount = useMemo(() => {
    if (activeTab === 'expenses') {
      return Math.max(...activeSeries.map(d => d.expenseAmount), 10);
    }
    if (activeTab === 'income') {
      return Math.max(...activeSeries.map(d => d.incomeAmount), 10);
    }
    // 'all' mode: find highest of either expense or income across all items
    const allVals = activeSeries.flatMap(d => [d.expenseAmount, d.incomeAmount]);
    return Math.max(...allVals, 10);
  }, [activeSeries, activeTab]);

  const totalExpenseInChart = activeSeries.reduce((acc, curr) => acc + curr.expenseAmount, 0);
  const totalIncomeInChart = activeSeries.reduce((acc, curr) => acc + curr.incomeAmount, 0);

  // Timeframe-specific average calculation
  const divisor = timeframe === 'month' ? 4 : (now.getMonth() + 1);
  const averageExpense = totalExpenseInChart / Math.max(1, divisor);
  const averageIncome = totalIncomeInChart / Math.max(1, divisor);

  // Default active bar to the current one or the selected one
  const currentItemIndex = activeSeries.findIndex(s => s.isCurrent);
  const effectiveBarIndex = selectedBarIndex !== null && selectedBarIndex < activeSeries.length 
    ? selectedBarIndex 
    : (currentItemIndex >= 0 ? currentItemIndex : activeSeries.length - 1);
  
  const activeBarData = activeSeries[effectiveBarIndex];

  const formatCompact = (val: number) => {
    const symbol = currency === 'BRL' ? 'R$' : '$';
    if (val <= 0) return `${symbol}0`;
    if (val >= 1000) return `${symbol}${(val / 1000).toFixed(1)}k`;
    return `${symbol}${Math.round(val)}`;
  };

  // Top category
  const topCategory = categoryBreakdown[0];

  // Raio-X Financeiro (100% cálculo matemático - Sem IA)
  const rayXReport = useMemo(() => {
    // Uncategorized expenses detection
    const uncategorizedTxs = expenseTx.filter(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const catName = cat?.name?.toLowerCase() || '';
      return (
        !t.categoryId ||
        t.categoryId === 'other' ||
        catName.includes('outro') ||
        catName.includes('sem categoria') ||
        t.isOrganized === false
      );
    });

    const uncategorizedTotal = uncategorizedTxs.reduce((sum, t) => sum + t.amount, 0);
    const uncategorizedPercentage = totalExpense > 0 ? Math.round((uncategorizedTotal / totalExpense) * 100) : 0;

    // Daily average
    const daysElapsed = timeframe === 'month' ? Math.max(1, now.getDate()) : Math.max(1, Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)));
    const dailyAverage = totalExpense / daysElapsed;

    // Retention rate
    const retentionRate = totalIncome > 0 ? Math.max(0, Math.round((netBalance / totalIncome) * 100)) : 0;

    // Direct mathematical insights
    const isEn = language === 'en-US';
    const insights: string[] = [];
    if (uncategorizedPercentage > 15) {
      insights.push(
        isEn
          ? `${uncategorizedPercentage}% of your expenses do not have a category assigned. Categorizing them in Transactions improves tracking accuracy.`
          : `${uncategorizedPercentage}% das suas despesas não possuem categoria definida. Organizar os gastos no Extrato melhora a precisão do seu controle.`
      );
    }
    if (totalExpense > totalIncome && totalIncome > 0) {
      insights.push(
        isEn
          ? `Expenses exceeded income by ${formatCurrency(totalExpense - totalIncome, currency)}. Consider reviewing non-essential spending.`
          : `Os gastos superaram as entradas em ${formatCurrency(totalExpense - totalIncome, currency)}. Vale reavaliar gastos não essenciais.`
      );
    } else if (totalIncome > totalExpense) {
      insights.push(
        isEn
          ? `Positive balance: you saved ${retentionRate}% of all income received in this period.`
          : `Saldo positivo: você economizou ${retentionRate}% de tudo o que entrou no período.`
      );
    }
    if (topCategory && topCategory.percentage >= 40) {
      insights.push(
        isEn
          ? `Category "${topCategory.name}" accounts for ${topCategory.percentage}% of total expenses (${formatCurrency(topCategory.total, currency)}).`
          : `A categoria "${topCategory.name}" concentra ${topCategory.percentage}% do total gasto (${formatCurrency(topCategory.total, currency)}).`
      );
    }

    return {
      uncategorizedTotal,
      uncategorizedCount: uncategorizedTxs.length,
      uncategorizedPercentage,
      dailyAverage,
      retentionRate,
      insights,
    };
  }, [expenseTx, totalExpense, totalIncome, netBalance, timeframe, now, categories, currency, topCategory, language]);

  const handleOpenRayX = () => {
    triggerHaptic('medium');
    setShowRayXModal(true);
  };

  const isEn = language === 'en-US';

  return (
    <div className="w-full pb-28 pt-1" id="analytics-screen-container">
      {/* Header */}
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between">
          <h3 className="font-['Outfit'] font-black text-xl text-black">
            {isEn ? 'Analytics' : 'Controle'}
          </h3>
          <span className="text-[10px] font-['Outfit'] font-black bg-[#E4F97E] border border-black px-2.5 py-0.5 rounded-full shadow-neo-xs">
            {timeframe === 'month' ? `${monthNames[now.getMonth()]} ${now.getFullYear()}` : (isEn ? `Year ${now.getFullYear()}` : `Ano ${now.getFullYear()}`)}
          </span>
        </div>
      </div>

      {/* Financial Breakdown Callout Banner */}
      <div className="w-full bg-white border-2 border-black rounded-2xl p-3.5 shadow-neo mb-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B8F256] border-2 border-black flex items-center justify-center flex-shrink-0 text-black shadow-neo-xs">
            <BarChart3 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h4 className="font-['Outfit'] font-black text-sm text-black flex items-center gap-1.5">
              {isEn ? `Financial X-Ray (${timeframe === 'month' ? 'Monthly' : 'Yearly'})` : `Raio-X Financeiro ${timeframe === 'month' ? 'do Mês' : 'do Ano'}`}
              <span className="text-[9px] bg-[#DCFCE7] text-emerald-950 border border-black/30 px-2 py-0.5 rounded-md font-mono uppercase font-black">
                {isEn ? 'Computed' : 'Calculado'}
              </span>
            </h4>
            <p className="text-[11px] text-neutral-600 font-medium">
              {isEn
                ? 'Daily average, retention rate, and uncategorized spending alert.'
                : 'Média diária, economia e alerta de gastos sem categoria.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenRayX}
          disabled={isGeneratingRayX}
          className="w-full sm:w-auto px-3.5 py-2 bg-[#B8F256] hover:bg-[#A3E635] active:scale-95 text-black text-xs font-['Outfit'] font-black rounded-xl border-2 border-black shadow-neo-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          id="btn-open-raio-x"
        >
          {isGeneratingRayX ? (
            <Zap className="w-4 h-4 text-black animate-spin" />
          ) : (
            <BarChart3 className="w-4 h-4 text-black" />
          )}
          <span>{isGeneratingRayX ? (language === 'pt-BR' ? 'Calculando...' : 'Crunching data...') : (language === 'pt-BR' ? 'Ver Raio-X' : 'View X-Ray')}</span>
        </button>
      </div>

      {/* Main Financial Balance Card */}
      <div className="w-full bg-[#EDE9FE] border-2 border-black rounded-2xl p-3.5 shadow-neo mb-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-['Outfit'] font-black uppercase text-purple-950 tracking-wider">
            {language === 'pt-BR' ? 'Resumo' : 'Summary'}
          </span>
          <span className="text-[11px] font-bold text-purple-900">
            {timeframe === 'month' ? monthNames[now.getMonth()] : now.getFullYear()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white border-2 border-black rounded-xl p-2 shadow-neo-xs text-center">
            <span className="text-[10px] font-bold text-rose-700 uppercase block truncate">
              {t('tx_sum_expenses')}
            </span>
            <span className="font-['Outfit'] font-black text-xs sm:text-sm text-rose-600 truncate block">
              {formatCurrency(totalExpense, currency)}
            </span>
          </div>

          <div className="bg-white border-2 border-black rounded-xl p-2 shadow-neo-xs text-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block truncate">
              {t('tx_sum_incomes')}
            </span>
            <span className="font-['Outfit'] font-black text-xs sm:text-sm text-emerald-700 truncate block">
              {formatCurrency(totalIncome, currency)}
            </span>
          </div>

          <div className="bg-white border-2 border-black rounded-xl p-2 shadow-neo-xs text-center">
            <span className="text-[10px] font-bold text-neutral-600 uppercase block truncate">
              {t('tx_sum_net')}
            </span>
            <span className={`font-['Outfit'] font-black text-xs sm:text-sm truncate block ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance, currency)}
            </span>
          </div>
        </div>

        {topCategory && (
          <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-bold text-purple-950">
            <span className="truncate">{language === 'pt-BR' ? 'Principal categoria:' : 'Top category:'}</span>
            <span className="bg-white px-2 py-0.5 rounded-md border border-black/20 text-xs truncate max-w-[55%]">
              {topCategory.name} ({topCategory.percentage}%)
            </span>
          </div>
        )}
      </div>

      {/* Main Dynamic Interactive Chart Card */}
      <div className="w-full bg-white border-2 border-black rounded-2xl p-3.5 shadow-neo mb-3.5">
        
        {/* Header Controls: Timeframe Pills & 3-Way Nature Switch (Gastos, Entradas, Tudo) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-black/10">
          
          {/* Timeframe Selector Pills */}
          <div className="grid grid-cols-2 gap-1 bg-[#F4F6FB] border border-black rounded-xl p-1 shadow-neo-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setTimeframe('month');
                setSelectedBarIndex(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-['Outfit'] font-black transition-all text-center truncate ${
                timeframe === 'month'
                  ? 'bg-[#B8F256] text-black border border-black shadow-neo-xs'
                  : 'text-neutral-700 hover:text-black'
              }`}
              id="timeframe-btn-month"
            >
              {language === 'pt-BR' ? 'Mensal' : 'Monthly'}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setTimeframe('year');
                setSelectedBarIndex(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-['Outfit'] font-black transition-all text-center truncate ${
                timeframe === 'year'
                  ? 'bg-[#B8F256] text-black border border-black shadow-neo-xs'
                  : 'text-neutral-700 hover:text-black'
              }`}
              id="timeframe-btn-year"
            >
              {language === 'pt-BR' ? 'Anual' : 'Yearly'}
            </button>
          </div>

          {/* 3-Way Switcher: Gastos / Entradas / Tudo */}
          <div className="grid grid-cols-3 gap-1 bg-neutral-100 border border-black rounded-xl p-1 w-full sm:w-auto shadow-neo-xs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('expenses');
              }}
              className={`py-1 px-2.5 rounded-lg text-xs font-['Outfit'] transition-all text-center truncate ${
                activeTab === 'expenses' 
                  ? 'bg-[#FF5B5B] text-white font-black' 
                  : 'text-neutral-600 hover:text-black font-bold'
              }`}
              id="tab-view-expenses"
            >
              {t('tx_filter_expense')}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('income');
              }}
              className={`py-1 px-2.5 rounded-lg text-xs font-['Outfit'] transition-all text-center truncate ${
                activeTab === 'income' 
                  ? 'bg-[#10B981] text-white font-black' 
                  : 'text-neutral-600 hover:text-black font-bold'
              }`}
              id="tab-view-income"
            >
              {t('tx_filter_income')}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('all');
              }}
              className={`py-1 px-2.5 rounded-lg text-xs font-['Outfit'] transition-all text-center truncate ${
                activeTab === 'all' 
                  ? 'bg-[#EDE9FE] text-purple-950 font-black' 
                  : 'text-neutral-600 hover:text-black font-bold'
              }`}
              id="tab-view-all"
            >
              {t('tx_filter_all')}
            </button>
          </div>
        </div>

        {/* Title for Active Period */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h4 className="font-['Outfit'] font-black text-sm text-black">
              {activeTab === 'expenses' && (isEn ? 'Expenses' : 'Gastos')}
              {activeTab === 'income' && (isEn ? 'Income' : 'Entradas')}
              {activeTab === 'all' && (isEn ? 'Comparison' : 'Comparativo')}
            </h4>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#EDE9FE] text-purple-900 border border-black/20 rounded-md">
              {timeframe === 'month' ? monthNames[now.getMonth()] : (isEn ? `Year ${now.getFullYear()}` : `Ano ${now.getFullYear()}`)}
            </span>
          </div>

          {/* Color Legend when in 'all' mode */}
          {activeTab === 'all' && (
            <div className="flex items-center gap-2 text-[10px] font-bold font-['Outfit'] bg-[#F4F6FB] px-2 py-0.5 rounded-lg border border-black/20">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-[#FF5B5B] border border-black rounded-xs inline-block" />
                {isEn ? 'Expenses' : 'Gastos'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-[#10B981] border border-black rounded-xs inline-block" />
                {isEn ? 'Income' : 'Entradas'}
              </span>
            </div>
          )}
        </div>

        {/* Metric Summary Badges for Single Tab Mode */}
        {(activeTab === 'expenses' || activeTab === 'income') && (
          <div className="grid grid-cols-2 gap-2 mb-2.5 bg-[#F4F6FB] border border-black/10 rounded-xl p-2">
            {activeTab === 'expenses' && (
              <>
                <div>
                  <span className="text-[9px] font-bold text-neutral-500 block">Total:</span>
                  <span className="font-['Outfit'] font-black text-xs sm:text-sm text-rose-600">
                    {formatCurrency(totalExpenseInChart, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-neutral-500 block">
                    {timeframe === 'month' ? (isEn ? 'Avg/week:' : 'Média/sem:') : (isEn ? 'Avg/month:' : 'Média/mês:')}
                  </span>
                  <span className="font-['Outfit'] font-black text-xs sm:text-sm text-neutral-800">
                    {formatCurrency(averageExpense, currency)}
                  </span>
                </div>
              </>
            )}

            {activeTab === 'income' && (
              <>
                <div>
                  <span className="text-[9px] font-bold text-neutral-500 block">Total:</span>
                  <span className="font-['Outfit'] font-black text-xs sm:text-sm text-emerald-700">
                    {formatCurrency(totalIncomeInChart, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-neutral-500 block">
                    {timeframe === 'month' ? (isEn ? 'Avg/week:' : 'Média/sem:') : (isEn ? 'Avg/month:' : 'Média/mês:')}
                  </span>
                  <span className="font-['Outfit'] font-black text-xs sm:text-sm text-neutral-800">
                    {formatCurrency(averageIncome, currency)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Neo-Brutalist Vertical Bar Chart */}
        <div className="flex items-end justify-between gap-1 sm:gap-2 h-44 pt-4 pb-1 px-0.5 overflow-x-auto no-scrollbar">
          {activeSeries.map((item, idx) => {
            const isSelected = effectiveBarIndex === idx;

            // Height calculation for Expenses
            const expHeight = item.expenseAmount > 0 
              ? Math.max(6, Math.round((item.expenseAmount / maxChartAmount) * 100)) 
              : 0;

            // Height calculation for Income
            const incHeight = item.incomeAmount > 0 
              ? Math.max(6, Math.round((item.incomeAmount / maxChartAmount) * 100)) 
              : 0;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedBarIndex(idx);
                }}
                className={`flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer focus:outline-hidden ${
                  timeframe === 'year' ? 'min-w-[24px]' : 'min-w-[48px]'
                }`}
              >
                {/* Floating Value Indicator Tag */}
                <div className="flex flex-col items-center transition-all">
                  {activeTab === 'expenses' && (
                    <span className={`text-[8px] sm:text-[9px] font-mono-code font-bold px-1 py-0.2 rounded border transition-all ${
                      isSelected
                        ? 'bg-[#FFE4E6] text-rose-950 border-black shadow-neo-xs scale-105 opacity-100 z-20 font-black'
                        : 'text-rose-700 border-transparent group-hover:opacity-100 opacity-70'
                    }`}>
                      {formatCompact(item.expenseAmount)}
                    </span>
                  )}

                  {activeTab === 'income' && (
                    <span className={`text-[8px] sm:text-[9px] font-mono-code font-bold px-1 py-0.2 rounded border transition-all ${
                      isSelected
                        ? 'bg-[#DCFCE7] text-emerald-950 border-black shadow-neo-xs scale-105 opacity-100 z-20 font-black'
                        : 'text-emerald-700 border-transparent group-hover:opacity-100 opacity-70'
                    }`}>
                      {formatCompact(item.incomeAmount)}
                    </span>
                  )}

                  {activeTab === 'all' && (
                    <div className={`text-[7px] sm:text-[8px] font-mono-code font-black px-1 py-0.2 rounded border flex items-center gap-0.5 transition-all ${
                      isSelected
                        ? 'bg-[#EDE9FE] text-purple-950 border-black shadow-neo-xs scale-105 opacity-100 z-20 font-black'
                        : 'text-neutral-500 border-transparent group-hover:opacity-100 opacity-60'
                    }`}>
                      {item.expenseAmount > 0 || item.incomeAmount > 0 ? (
                        <>
                          <span className="text-[#FF7B7B]">{formatCompact(item.expenseAmount)}</span>
                          <span>/</span>
                          <span className="text-[#6EE7B7]">{formatCompact(item.incomeAmount)}</span>
                        </>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bars Area */}
                <div className="w-full h-full flex items-end justify-center">
                  
                  {/* Mode 1: Gastos Only (Red Bar) */}
                  {activeTab === 'expenses' && (
                    <div className="w-full max-w-[34px] h-full flex items-end">
                      <div
                        className={`w-full rounded-t-xl border-2 border-black transition-all duration-300 shadow-neo-xs ${
                          isSelected
                            ? 'border-black ring-2 ring-rose-500 ring-offset-1 scale-105 z-10'
                            : ''
                        } ${
                          item.expenseAmount > 0
                            ? 'bg-[#FF5B5B]'
                            : 'bg-neutral-100 opacity-70'
                        }`}
                        style={{ height: `${expHeight || 4}%` }}
                      />
                    </div>
                  )}

                  {/* Mode 2: Entradas Only (Green Bar) */}
                  {activeTab === 'income' && (
                    <div className="w-full max-w-[34px] h-full flex items-end">
                      <div
                        className={`w-full rounded-t-xl border-2 border-black transition-all duration-300 shadow-neo-xs ${
                          isSelected
                            ? 'border-black ring-2 ring-emerald-500 ring-offset-1 scale-105 z-10'
                            : ''
                        } ${
                          item.incomeAmount > 0
                            ? 'bg-[#10B981]'
                            : 'bg-neutral-100 opacity-70'
                        }`}
                        style={{ height: `${incHeight || 4}%` }}
                      />
                    </div>
                  )}

                  {/* Mode 3: Tudo (Side-by-side Paired Bars: Red for Gastos + Green for Entradas) */}
                  {activeTab === 'all' && (
                    <div className={`w-full max-w-[46px] h-full flex items-end justify-center gap-0.5 sm:gap-1 p-0.5 rounded-t-xl transition-all ${
                      isSelected ? 'bg-neutral-200/50 ring-2 ring-black ring-offset-1' : ''
                    }`}>
                      {/* Left: Expense Bar (Red) */}
                      <div className="flex-1 h-full flex items-end">
                        <div
                          className={`w-full rounded-t-md border-2 border-black transition-all duration-300 ${
                            item.expenseAmount > 0
                              ? 'bg-[#FF5B5B] shadow-neo-xs'
                              : 'bg-neutral-100 opacity-50'
                          }`}
                          style={{ height: `${expHeight || 4}%` }}
                          title={`${isEn ? 'Expenses' : 'Gastos'}: ${formatCurrency(item.expenseAmount, currency)}`}
                        />
                      </div>

                      {/* Right: Income Bar (Green) */}
                      <div className="flex-1 h-full flex items-end">
                        <div
                          className={`w-full rounded-t-md border-2 border-black transition-all duration-300 ${
                            item.incomeAmount > 0
                              ? 'bg-[#10B981] shadow-neo-xs'
                              : 'bg-neutral-100 opacity-50'
                          }`}
                          style={{ height: `${incHeight || 4}%` }}
                          title={`${isEn ? 'Income' : 'Entradas'}: ${formatCurrency(item.incomeAmount, currency)}`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Period Labels */}
                <div className="flex flex-col items-center text-center">
                  <span className={`text-[10px] sm:text-[11px] font-['Outfit'] font-black leading-tight ${
                    item.isCurrent 
                      ? 'text-black font-extrabold underline decoration-2 decoration-purple-600' 
                      : isSelected 
                        ? 'text-black font-extrabold' 
                        : 'text-neutral-600'
                  }`}>
                    {item.shortLabel}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono-code font-bold text-neutral-400 leading-tight">
                    {item.subLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Period Quick Inspector */}
        {activeBarData && (
          <div className="mt-3 pt-2.5 border-t border-black/10 text-xs bg-[#F4F6FB] p-2.5 rounded-xl border border-black/10">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
                <span className="font-['Outfit'] font-bold text-black truncate">
                  {activeBarData.fullLabel} {activeBarData.isCurrent && (isEn ? '• Current ⭐' : '• Atual ⭐')}
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 font-normal">
                ({activeBarData.txCount} {isEn ? (activeBarData.txCount === 1 ? 'entry' : 'entries') : (activeBarData.txCount === 1 ? 'lançamento' : 'lançamentos')})
              </span>
            </div>

            {/* Inspector Values */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1 border-t border-black/5 font-['Outfit']">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-neutral-500">{isEn ? 'Expenses:' : 'Gastos:'}</span>
                <span className="font-black text-rose-600">
                  {formatCurrency(activeBarData.expenseAmount, currency)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-neutral-500">{isEn ? 'Income:' : 'Entradas:'}</span>
                <span className="font-black text-emerald-700">
                  {formatCurrency(activeBarData.incomeAmount, currency)}
                </span>
              </div>
              <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-neutral-500">{isEn ? 'Net Balance:' : 'Saldo:'}</span>
                <span className={`font-black ${activeBarData.incomeAmount - activeBarData.expenseAmount >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {activeBarData.incomeAmount - activeBarData.expenseAmount >= 0 ? '+' : ''}
                  {formatCurrency(activeBarData.incomeAmount - activeBarData.expenseAmount, currency)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Breakdown Section Synchronized with Selected Timeframe & Tab */}
      <div className="w-full bg-white border-2 border-black rounded-2xl p-3.5 shadow-neo">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-['Outfit'] font-black text-sm text-black">
            {isEn ? 'Categories' : 'Categorias'}
          </h4>
          <span className="text-[10px] font-bold bg-[#FEF3C7] text-amber-900 border border-black/20 px-2 py-0.5 rounded-md">
            {timeframe === 'month' ? (isEn ? 'Monthly' : 'Mensal') : (isEn ? 'Yearly' : 'Anual')}
          </span>
        </div>

        {/* Breakdown bars list */}
        <div className="space-y-3">
          {categoryBreakdown.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-black/20 rounded-xl p-4 bg-neutral-50">
              <span className="text-xl">📦</span>
              <p className="text-xs text-neutral-500 font-bold mt-1">
                {isEn ? 'No records for this period.' : 'Sem registros neste período.'}
              </p>
            </div>
          ) : (
            categoryBreakdown.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 font-['Outfit'] font-extrabold text-black min-w-0 truncate">
                    <span className="text-sm flex-shrink-0">{cat.emoji}</span>
                    <span className="truncate">{cat.name}</span>
                    {activeTab === 'all' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border flex-shrink-0 ${
                        cat.type === 'expense'
                          ? 'bg-[#FFE4E6] text-rose-700 border-rose-300'
                          : cat.type === 'income'
                            ? 'bg-[#DCFCE7] text-emerald-700 border-emerald-300'
                            : 'bg-[#EDE9FE] text-purple-700 border-purple-300'
                      }`}>
                        {cat.type === 'expense' ? (isEn ? 'Expense' : 'Gasto') : cat.type === 'income' ? (isEn ? 'Income' : 'Entrada') : (isEn ? 'Mixed' : 'Misto')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
                    <span className={`font-black ${
                      cat.type === 'expense' 
                        ? 'text-rose-600' 
                        : cat.type === 'income' 
                          ? 'text-emerald-700' 
                          : 'text-neutral-900'
                    }`}>
                      {formatCurrency(cat.total, currency)}
                    </span>
                    <span className="font-mono-code font-bold text-[11px] text-neutral-400">
                      ({cat.percentage}%)
                    </span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="w-full h-2 bg-neutral-100 border border-black/30 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.type === 'expense' && activeTab === 'all'
                        ? '#FF8585'
                        : cat.type === 'income' && activeTab === 'all'
                          ? '#34D399'
                          : (cat.bgColor || '#EDE9FE'),
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Raio-X Modal (100% Cálculo Matemático - Sem IA) */}
      {showRayXModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t-2 sm:border-2 border-black rounded-t-3xl sm:rounded-3xl shadow-neo w-full max-lg max-h-[90vh] overflow-y-auto p-4 sm:p-5 space-y-4 animate-in slide-in-from-bottom-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#B8F256] border-2 border-black flex items-center justify-center text-black shadow-neo-xs">
                  <BarChart3 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-black text-base text-black leading-tight">
                    {isEn ? 'Financial X-Ray' : 'Raio-X Financeiro'}
                  </h3>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    {isEn
                      ? `Exact diagnosis calculated from your entries (${timeframe === 'month' ? monthNames[now.getMonth()] : `Year ${now.getFullYear()}`})`
                      : `Diagnóstico exato baseado nas suas transações (${timeframe === 'month' ? monthNames[now.getMonth()] : `Ano ${now.getFullYear()}`})`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowRayXModal(false);
                }}
                className="p-1.5 rounded-lg border-2 border-transparent hover:border-black hover:bg-neutral-100 transition-colors"
                aria-label={isEn ? 'Close' : 'Fechar'}
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-neutral-50 border-2 border-black rounded-xl shadow-neo-xs">
                <span className="text-[10px] font-['Outfit'] font-black uppercase text-neutral-500 block">
                  {isEn ? 'Daily Spend Average' : 'Média de Gasto Diário'}
                </span>
                <div className="font-['Outfit'] font-black text-base text-black mt-0.5">
                  {formatCurrency(rayXReport.dailyAverage, currency)}/{isEn ? 'day' : 'dia'}
                </div>
              </div>
              <div className="p-3 bg-neutral-50 border-2 border-black rounded-xl shadow-neo-xs">
                <span className="text-[10px] font-['Outfit'] font-black uppercase text-neutral-500 block">
                  {isEn ? 'Savings / Retention Rate' : 'Taxa de Retenção/Sobra'}
                </span>
                <div className="font-['Outfit'] font-black text-base text-black mt-0.5">
                  {rayXReport.retentionRate}% {isEn ? 'of total' : 'do total'}
                </div>
              </div>
            </div>

            {/* Top Category Info */}
            {topCategory && (
              <div className="p-3 bg-[#FFE600] border-2 border-black rounded-xl text-black shadow-neo-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-['Outfit'] font-black uppercase tracking-wider">
                    {isEn ? 'Largest Spending Category' : 'Maior Concentração de Gasto'}
                  </span>
                  <span className="text-[11px] font-black">{topCategory.percentage}% {isEn ? 'of total' : 'do total'}</span>
                </div>
                <div className="font-['Outfit'] font-black text-sm mt-0.5">
                  {topCategory.name}: {formatCurrency(topCategory.total, currency)}
                </div>
              </div>
            )}

            {/* CRITICAL: Uncategorized Alert / Status */}
            {rayXReport.uncategorizedTotal > 0 ? (
              <div className="p-3.5 bg-amber-50 border-2 border-amber-500 rounded-xl text-amber-950 space-y-1.5 shadow-neo-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span className="font-['Outfit'] text-xs font-black uppercase">
                    {isEn ? 'Uncategorized Spending Detected' : 'Gastos Sem Categoria Detectados'}
                  </span>
                </div>
                <p className="text-xs font-bold text-amber-900 leading-relaxed">
                  {isEn ? (
                    <>You have <span className="underline font-black">{formatCurrency(rayXReport.uncategorizedTotal, currency)}</span> ({rayXReport.uncategorizedPercentage}% of outflows) across {rayXReport.uncategorizedCount} entry(ies) without category or marked as other.</>
                  ) : (
                    <>Você possui <span className="underline font-black">{formatCurrency(rayXReport.uncategorizedTotal, currency)}</span> ({rayXReport.uncategorizedPercentage}% das saídas) em {rayXReport.uncategorizedCount} lançamento{rayXReport.uncategorizedCount > 1 ? 's' : ''} sem categoria definida ou marcados como outros.</>
                  )}
                </p>
                <p className="text-[11px] text-amber-800 font-medium">
                  {isEn
                    ? '💡 Tip: You can tap on any transaction in the Statement to assign the right category.'
                    : '💡 Dica: Você pode tocar em cada lançamento no Extrato para definir a categoria exata.'}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border-2 border-emerald-600 rounded-xl text-emerald-950 flex items-center gap-2.5 shadow-neo-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-xs font-bold">
                  <span className="font-black">{isEn ? 'All Organized!' : 'Tudo Organizado!'}</span> {isEn ? '100% of your expenses for this period are categorized.' : '100% dos seus gastos deste período estão categorizados.'}
                </div>
              </div>
            )}

            {/* Diagnostic Insights (Direct mathematical observations) */}
            {rayXReport.insights.length > 0 && (
              <div className="p-3.5 bg-neutral-100 border-2 border-black rounded-xl space-y-2 shadow-neo-xs">
                <span className="text-[10px] font-['Outfit'] font-black uppercase tracking-wider text-neutral-600 block">
                  {isEn ? 'Period Observations' : 'Observações do Período'}
                </span>
                <ul className="space-y-1.5">
                  {rayXReport.insights.map((insight, idx) => (
                    <li key={idx} className="text-xs text-black font-medium flex items-start gap-1.5">
                      <span className="text-emerald-950 bg-[#B8F256] border border-black/40 rounded-full w-3.5 h-3.5 text-[9px] flex items-center justify-center font-black flex-shrink-0 mt-0.5">
                        •
                      </span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Close action button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowRayXModal(false);
              }}
              className="w-full py-3 bg-[#B8F256] hover:bg-[#A3E635] text-black font-['Outfit'] font-black text-xs rounded-xl border-2 border-black shadow-neo cursor-pointer transition-all active:scale-98"
            >
              {isEn ? 'Got it / Close X-Ray' : 'Entendido / Fechar Raio-X'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
