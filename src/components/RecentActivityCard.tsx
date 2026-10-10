import React from 'react';
import { Transaction, Category } from '../types';
import { formatCurrency, formatRelativeDate } from '../utils/storage';
import { triggerHaptic } from '../utils/haptics';
import { Check, Edit3 } from 'lucide-react';
import { isTransactionOrganized } from '../utils/transactionUtils';
import { useI18n } from '../hooks/useI18n';
import { useExchangeRate } from '../hooks/useExchangeRate';

interface RecentActivityCardProps {
  transactions: Transaction[];
  categories: Category[];
  onViewAll: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  currency: string;
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = React.memo(({
  transactions,
  categories,
  onViewAll,
  onSelectTransaction,
  currency,
}) => {
  const { t, language } = useI18n();
  const { convertFromUsdc } = useExchangeRate();
  const activeCurrency = (currency || 'BRL').toUpperCase();
  const recent = transactions.slice(0, 4);

  const getCategory = (catId: string): Category | undefined => {
    return categories.find(c => c.id === catId);
  };

  return (
    <div 
      className="w-full my-4"
      id="recent-activity-card-container"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2.5 px-0.5">
        <h3 className="font-['Outfit'] font-black text-xs sm:text-sm uppercase tracking-wider text-black">
          {t('activity_title')}
        </h3>
        <button
          onClick={() => {
            triggerHaptic('light');
            onViewAll();
          }}
          className="text-[10px] sm:text-xs font-black uppercase text-black underline hover:opacity-75 transition-opacity"
          id="btn-recent-activity-view-all"
        >
          {t('activity_view_all')}
        </button>
      </div>

      {/* Transactions list */}
      <div className="flex flex-col gap-2 sm:gap-2.5">
        {recent.length === 0 ? (
          <div className="text-center py-6 bg-white border-2 border-dashed border-black/30 rounded-2xl">
            <span className="text-2xl">💸</span>
            <p className="text-xs font-bold text-neutral-500 mt-1">
              {t('activity_empty')}
            </p>
          </div>
        ) : (
          recent.map((tx) => {
            const category = getCategory(tx.categoryId);
            const isIncome = tx.type === 'income';
            const isOrganized = isTransactionOrganized(tx);
            const rowBg = isIncome ? 'bg-[#E0F2FE]' : (category?.bgColor || 'bg-[#FFE4E6]');

            return (
              <div
                key={tx.id}
                onClick={() => {
                  triggerHaptic('light');
                  onSelectTransaction(tx);
                }}
                className={`w-full ${rowBg} border-2 border-black rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-neo-xs hover:translate-x-0.5 transition-transform cursor-pointer gap-2`}
                id={`tx-row-${tx.id}`}
              >
                {/* Left: Icon & Info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white border-2 border-black rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0 shadow-neo-xs">
                    {category?.emoji || (isIncome ? '💼' : '🍕')}
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-['Outfit'] font-black text-xs text-black leading-tight truncate">
                        {tx.description || category?.name || 'Move'}
                      </p>
                      {isOrganized ? (
                        <span
                          className="inline-flex items-center justify-center bg-[#DCFCE7] text-emerald-950 p-0.5 rounded-md border border-emerald-600/40 flex-shrink-0"
                          title={language === 'pt-BR' ? 'Organizado' : 'Organized'}
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3] text-emerald-700" />
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center bg-[#FEF3C7] text-amber-950 p-0.5 rounded-md border border-amber-600/40 flex-shrink-0 animate-pulse"
                          title={language === 'pt-BR' ? 'Pendente' : 'Pending'}
                        >
                          <Edit3 className="w-2.5 h-2.5 text-amber-700" />
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-bold uppercase opacity-60 text-black truncate mt-0.5">
                      {category?.name || (isIncome ? (language === 'pt-BR' ? 'Entrada' : 'Inflow') : (language === 'pt-BR' ? 'Gasto' : 'Outflow'))} • {formatRelativeDate(tx.date, language)}
                    </p>
                  </div>
                </div>

                {/* Right: Amount */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-['Outfit'] font-black text-xs sm:text-sm ${
                    isIncome ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {isIncome ? '+ ' : '- '}{formatCurrency(convertFromUsdc(tx.amount, activeCurrency), activeCurrency)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
