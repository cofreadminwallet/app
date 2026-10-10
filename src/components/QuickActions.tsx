import React from 'react';
import { triggerHaptic } from '../utils/haptics';
import { Vault, ArrowRight } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

interface QuickActionsProps {
  onOpenVaults: () => void;
  onOpenCryptoScanner?: () => void;
  onOpenCryptoReceive?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = React.memo(({
  onOpenVaults,
  onOpenCryptoScanner,
  onOpenCryptoReceive,
}) => {
  const { t } = useI18n();

  return (
    <div className="w-full my-3 space-y-2.5" id="quick-actions-section">
      {/* Primary Row: Native Base Crypto Actions */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Pay / Send via Camera QR or 0x Address */}
        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenCryptoScanner?.();
          }}
          className="bg-[#DCFCE7] hover:bg-[#BBF7D0] active:bg-[#86EFAC] border-2 border-black rounded-2xl p-2.5 sm:p-3 shadow-neo-sm btn-press flex items-center gap-2.5 text-left transition-all group min-w-0"
          id="btn-quick-crypto-pay"
          aria-label="Pagar ou enviar USDC na Base"
        >
          <div className="w-10 h-10 bg-white rounded-xl border-2 border-black flex items-center justify-center text-xl shadow-neo-xs group-hover:scale-105 transition-transform flex-shrink-0">
            📷
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-['Outfit'] font-black text-emerald-950 block leading-tight truncate">
              {t('action_pay')}
            </span>
            <span className="text-[10px] text-emerald-800 font-bold block truncate">
              {t('action_pay_sub')}
            </span>
          </div>
        </button>

        {/* Receive Crypto / Base USDC Deposit */}
        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenCryptoReceive?.();
          }}
          className="bg-[#E0F2FE] hover:bg-[#BAE6FD] active:bg-[#7DD3FC] border-2 border-black rounded-2xl p-2.5 sm:p-3 shadow-neo-sm btn-press flex items-center gap-2.5 text-left transition-all group min-w-0"
          id="btn-quick-crypto-receive"
          aria-label="Receber USDC via QR Code"
        >
          <div className="w-10 h-10 bg-white rounded-xl border-2 border-black flex items-center justify-center text-xl shadow-neo-xs group-hover:scale-105 transition-transform flex-shrink-0">
            📥
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-['Outfit'] font-black text-sky-950 block leading-tight truncate">
              {t('action_receive')}
            </span>
            <span className="text-[10px] text-sky-800 font-bold block truncate">
              {t('action_receive_sub')}
            </span>
          </div>
        </button>
      </div>

      {/* Secondary Row: Cofres & Metas (Full Width) */}
      <button
        onClick={() => {
          triggerHaptic('medium');
          onOpenVaults();
        }}
        className="w-full bg-[#EDE9FE] hover:bg-[#DDD6FE] active:bg-[#C4B5FD] border-2 border-black rounded-2xl p-2.5 sm:p-3 shadow-neo-xs btn-press flex items-center justify-between transition-all group cursor-pointer"
        id="btn-quick-open-vaults"
        aria-label="Acessar Cofres e Metas"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-white rounded-xl border-2 border-black flex items-center justify-center shadow-neo-xs group-hover:scale-105 transition-transform flex-shrink-0">
            <Vault className="w-5 h-5 text-purple-950 stroke-[2.5]" />
          </div>
          <div className="min-w-0 text-left">
            <span className="text-xs sm:text-sm font-['Outfit'] font-black text-purple-950 block leading-tight truncate">
              {t('action_new_vault')}
            </span>
            <span className="text-[10px] text-purple-800 font-bold block truncate">
              {t('action_new_vault_sub')}
            </span>
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg bg-white border border-black/30 flex items-center justify-center text-purple-950 flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
          <ArrowRight className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
});
