import React, { useState } from 'react';
import { Category } from '../types';
import { useI18n } from '../services/i18nService';
import { triggerHaptic } from '../utils/haptics';
import { Check, X, Tag, Sparkles } from 'lucide-react';
import { Web3Service } from '../services/web3Service';

export interface QuickCategorizeTxData {
  id: string;
  amount: number;
  tokenSymbol?: string;
  fromAddress?: string;
  txHash?: string;
  currentCategoryId?: string;
  contactName?: string;
}

interface QuickCategorizeReceiveToastProps {
  transaction: QuickCategorizeTxData;
  categories: Category[];
  onSelectCategory: (txId: string, categoryId: string, customNote?: string) => void;
  onClose: () => void;
}

export const QuickCategorizeReceiveToast: React.FC<QuickCategorizeReceiveToastProps> = ({
  transaction,
  categories,
  onSelectCategory,
  onClose,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';
  const [selectedCatId, setSelectedCatId] = useState<string | null>(transaction.currentCategoryId || null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCatName, setSuccessCatName] = useState<string>('');

  const displaySender = transaction.contactName
    ? transaction.contactName
    : transaction.fromAddress
    ? Web3Service.truncateAddress(transaction.fromAddress)
    : 'Base L2';

  // Sort categories: income and both types first, then favorites, then rest
  const sortedCategories = React.useMemo(() => {
    return [...categories].sort((a, b) => {
      const aIncome = a.type === 'income' || a.type === 'both' ? 1 : 0;
      const bIncome = b.type === 'income' || b.type === 'both' ? 1 : 0;
      if (aIncome !== bIncome) return bIncome - aIncome;
      return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
    });
  }, [categories]);

  const handleCategoryClick = (cat: Category) => {
    triggerHaptic('success');
    setSelectedCatId(cat.id);
    setIsSuccess(true);
    setSuccessCatName(`${cat.emoji} ${cat.name}`);
    onSelectCategory(transaction.id, cat.id);

    // Auto-dismiss smoothly after success feedback
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className="bg-[#FFFFFF] border-3 border-black rounded-2xl p-3.5 sm:p-4 shadow-neo flex flex-col gap-2.5">
        {/* Top Header: Badge, Inbound Info, and Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#B8F256] border-2 border-black flex items-center justify-center text-lg flex-shrink-0 shadow-neo-xs animate-bounce">
              💰
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-['Outfit'] font-black text-xs sm:text-sm text-black leading-tight">
                  {isEn ? 'Payment Received!' : 'Pagamento Recebido!'}
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-400 font-extrabold px-1.5 py-0.2 rounded-md">
                  +${transaction.amount.toFixed(2)} {transaction.tokenSymbol || 'USDC'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-medium truncate mt-0.5">
                {isEn ? 'From:' : 'De:'} <span className="font-bold text-neutral-700">{displaySender}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="text-neutral-400 hover:text-black p-1 hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
            aria-label={isEn ? 'Close notification' : 'Fechar notificação'}
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Success Feedback state */}
        {isSuccess ? (
          <div className="bg-[#DCFCE7] border-2 border-black rounded-xl p-2.5 flex items-center gap-2 animate-in fade-in zoom-in-95">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs flex-shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <p className="font-['Outfit'] font-bold text-xs text-emerald-950 truncate">
              {isEn ? 'Categorized as' : 'Categorizado em'} <span className="font-black underline">{successCatName}</span>!
            </p>
          </div>
        ) : (
          /* Category Quick Selector row */
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-neutral-400" />
                {isEn ? 'Quick Categorize (1-Tap):' : 'Categorizar Agora (1 Toque):'}
              </span>
              <span className="text-[9px] text-neutral-400 font-normal">
                {isEn ? 'Saved to activity' : 'Salva no extrato'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
              {sortedCategories.slice(0, 8).map((cat) => {
                const isSelected = selectedCatId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className={`px-2.5 py-1.5 rounded-xl border-2 font-['Outfit'] text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-transform btn-press cursor-pointer shadow-neo-xs ${
                      isSelected
                        ? 'bg-[#B8F256] border-black text-black ring-2 ring-black/20'
                        : 'bg-neutral-50 hover:bg-neutral-100 border-black text-neutral-800'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span className="truncate max-w-[90px]">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
