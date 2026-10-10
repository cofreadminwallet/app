import React from 'react';
import { Target } from 'lucide-react';
import { formatCurrency } from '../utils/storage';
import { triggerHaptic } from '../utils/haptics';
import { useI18n } from '../hooks/useI18n';
import { useExchangeRate } from '../hooks/useExchangeRate';

interface DailyBudgetCardProps {
  spentToday: number;
  dailyLimit: number;
  currency: string;
  onEditLimit: () => void;
}

export const DailyBudgetCard: React.FC<DailyBudgetCardProps> = React.memo(({
  spentToday,
  dailyLimit,
  currency,
  onEditLimit,
}) => {
  const { t, language } = useI18n();
  const { convertFromUsdc } = useExchangeRate();
  const activeCurrency = (currency || 'BRL').toUpperCase();
  const spentTodayInCurrency = convertFromUsdc(spentToday, activeCurrency);
  const dailyLimitInCurrency = convertFromUsdc(dailyLimit, activeCurrency);
  const hasLimit = typeof dailyLimit === 'number' && dailyLimit > 0;
  const percentage = hasLimit ? Math.min(100, Math.round((spentToday / dailyLimit) * 100)) : 0;
  const remaining = hasLimit ? Math.max(0, dailyLimitInCurrency - spentTodayInCurrency) : 0;
  const isOverBudget = hasLimit && spentTodayInCurrency > dailyLimitInCurrency;

  // Determine status color and emoji when limit is set
  let statusBg = 'bg-[#DCFCE7] text-emerald-950';
  let statusText = language === 'pt-BR'
    ? `Restam ${formatCurrency(remaining, activeCurrency)}`
    : `${formatCurrency(remaining, activeCurrency)} remaining`;
  let statusEmoji = '🟢';

  if (!hasLimit) {
    statusBg = 'bg-[#EDE9FE] text-purple-950';
    statusText = language === 'pt-BR' ? 'Definir meta diária' : 'Set daily cap';
    statusEmoji = '🎯';
  } else if (percentage >= 100) {
    statusBg = 'bg-[#FFE4E6] text-rose-800';
    statusText = language === 'pt-BR'
      ? `Excedeu ${formatCurrency(spentTodayInCurrency - dailyLimitInCurrency, activeCurrency)}`
      : `${formatCurrency(spentTodayInCurrency - dailyLimitInCurrency, activeCurrency)} over`;
    statusEmoji = '🔴';
  } else if (percentage >= 75) {
    statusBg = 'bg-[#FEF3C7] text-amber-900';
    statusText = language === 'pt-BR'
      ? `Restam ${formatCurrency(remaining, activeCurrency)}`
      : `${formatCurrency(remaining, activeCurrency)} left`;
    statusEmoji = '🟡';
  }

  return (
    <div 
      className="w-full bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] my-4 cursor-pointer hover:bg-neutral-50/90 transition-all btn-press"
      onClick={() => {
        triggerHaptic('light');
        onEditLimit();
      }}
      id="daily-budget-card"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] border-2 border-black flex items-center justify-center shadow-neo-xs">
            <Target className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-['Outfit'] font-black text-sm text-black leading-tight">
                {t('budget_title')}
              </h4>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-[#EDE9FE] text-purple-950 border border-black/20">
                {language === 'pt-BR' ? 'Opcional' : 'Optional'}
              </span>
            </div>
            <p className="text-[9px] font-bold uppercase opacity-60 text-black">
              {hasLimit 
                ? (language === 'pt-BR' ? 'Limite diário' : 'Daily cap') 
                : (language === 'pt-BR' ? 'Definir teto' : 'Set cap')}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="font-['Outfit'] font-black text-sm text-black">
            {formatCurrency(spentTodayInCurrency, activeCurrency)}
          </span>
          <span className="text-[11px] font-bold text-neutral-400">
            {hasLimit ? ` / ${formatCurrency(dailyLimitInCurrency, activeCurrency)}` : (language === 'pt-BR' ? ' hoje' : ' today')}
          </span>
        </div>
      </div>

      {/* Brutalist Progress Bar */}
      <div className="w-full h-2.5 bg-[#F4F6FB] border-2 border-black rounded-full overflow-hidden p-0.5 my-2">
        <div 
          className={`h-full rounded-full border border-black transition-all duration-500 ${
            !hasLimit
              ? 'bg-neutral-300 w-full opacity-40'
              : isOverBudget 
                ? 'bg-rose-500' 
                : percentage >= 75 
                  ? 'bg-amber-400' 
                  : 'bg-[#B8F256]'
          }`}
          style={{ width: hasLimit ? `${percentage}%` : '100%' }}
        />
      </div>

      {/* Bottom Status pill & Edit hint */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs mt-1">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 border-black text-[9px] sm:text-[10px] font-black uppercase ${statusBg} shadow-neo-xs max-w-full truncate`}>
          <span className="flex-shrink-0">{statusEmoji}</span>
          <span className="truncate">{statusText}</span>
        </span>
        <span className="text-[10px] font-black uppercase text-black underline flex-shrink-0">
          {hasLimit
            ? (language === 'pt-BR' ? 'Ajustar' : 'Adjust')
            : (language === 'pt-BR' ? '+ Definir' : '+ Set Cap')}
        </span>
      </div>
    </div>
  );
});
