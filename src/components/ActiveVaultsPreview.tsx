import React from 'react';
import { Vault } from '../types';
import { Plus, ChevronRight, Target, Vault as VaultIcon } from 'lucide-react';
import { formatCurrency } from '../utils/storage';
import { triggerHaptic } from '../utils/haptics';
import { useI18n } from '../hooks/useI18n';
import { useExchangeRate } from '../hooks/useExchangeRate';

interface ActiveVaultsPreviewProps {
  vaults: Vault[];
  availableBalance?: number;
  onOpenVaults: () => void;
  onQuickDeposit: (vault: Vault) => void;
  onCreateVault: () => void;
  currency: string;
}

export const ActiveVaultsPreview: React.FC<ActiveVaultsPreviewProps> = React.memo(({
  vaults,
  availableBalance = 0,
  onOpenVaults,
  onQuickDeposit,
  onCreateVault,
  currency,
}) => {
  const { t, language } = useI18n();
  const { convertFromUsdc } = useExchangeRate();
  const activeCurrency = (currency || 'BRL').toUpperCase();
  const activeVaults = vaults.filter(v => !v.completed);
  const completedCount = vaults.filter(v => v.completed).length;

  return (
    <div className="w-full my-4" id="active-vaults-preview-section">
      {/* Header with Title and Counter */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <h3 className="font-['Outfit'] font-black text-xs sm:text-sm uppercase tracking-wider text-black flex items-center gap-1.5">
            <span>{t('nav_vaults')}</span>
            <VaultIcon className="w-3.5 h-3.5 stroke-[2.5]" />
          </h3>
          <span className="text-[10px] font-black bg-[#EDE9FE] text-purple-950 border border-black px-2 py-0.5 rounded-md shadow-neo-xs font-mono">
            {activeVaults.length}
          </span>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenVaults();
          }}
          className="text-[10px] sm:text-xs font-black uppercase text-black underline hover:opacity-75 flex items-center gap-0.5"
          id="see-all-vaults-btn"
          title={language === 'en-US' ? 'Vaults' : 'Cofres'}
        >
          <span>{language === 'pt-BR' ? `Ver todos (${vaults.length})` : `See all (${vaults.length})`}</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Responsive Compact Grid - All Vaults visible on Mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
        {activeVaults.map((vault) => {
          const currentInCurrency = convertFromUsdc(vault.currentAmount, activeCurrency);
          const targetInCurrency = convertFromUsdc(vault.targetAmount, activeCurrency);
          const progress = Math.min(100, Math.round((vault.currentAmount / (vault.targetAmount || 1)) * 100));

          return (
            <div
              key={vault.id}
              onClick={() => {
                triggerHaptic('light');
                onOpenVaults();
              }}
              className="relative border-2 border-black rounded-xl p-2.5 sm:p-3 shadow-neo-xs flex flex-col justify-between hover:-translate-y-0.5 transition-transform cursor-pointer overflow-hidden"
              style={{ backgroundColor: vault.bgColor || '#FEF3C7' }}
            >
              <div>
                {/* Emoji & Title */}
                <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                  <span className="text-base flex-shrink-0 leading-none">
                    {vault.emoji || '🎯'}
                  </span>
                  <p className="text-[11px] sm:text-xs font-['Outfit'] font-black text-black truncate leading-tight">
                    {vault.title}
                  </p>
                </div>

                {/* Amount & Progress percentage */}
                <div className="flex items-baseline justify-between gap-1 mb-1">
                  <p className="font-['Outfit'] font-black text-xs sm:text-sm text-black truncate">
                    {formatCurrency(currentInCurrency, activeCurrency)}
                  </p>
                  <span className="text-[9px] font-black text-black/70 flex-shrink-0">
                    {progress}%
                  </span>
                </div>

                {/* Target Subtitle */}
                <p className="text-[9px] font-bold text-black/60 truncate mb-1.5">
                  {language === 'pt-BR' ? 'Meta:' : 'Goal:'} {formatCurrency(targetInCurrency, activeCurrency)}
                </p>

                {/* Compact Progress bar */}
                <div className="w-full h-1.5 bg-white border border-black rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-[#B8F256] border-r border-black transition-all duration-500"
                    style={{ width: `${Math.max(4, progress)}%` }}
                  />
                </div>
              </div>

              {/* Action: Quick Deposit */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('medium');
                  onQuickDeposit(vault);
                }}
                className="w-full py-1 bg-white hover:bg-[#B8F256] text-black border border-black rounded-lg font-['Outfit'] font-black text-[9px] sm:text-[10px] uppercase shadow-neo-xs btn-press transition-colors text-center cursor-pointer"
                id={`quick-deposit-vault-${vault.id}`}
                title={language === 'en-US' ? 'Deposit' : 'Guardar'}
              >
                {language === 'pt-BR' ? 'Guardar' : 'Deposit'}
              </button>
            </div>
          );
        })}

        {/* Compact Card "Create Goal / Vault" */}
        <button
          onClick={() => {
            triggerHaptic('medium');
            onCreateVault();
          }}
          className="min-h-[110px] border-2 border-dashed border-black/40 hover:border-black bg-white/70 hover:bg-white rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-all group shadow-neo-xs btn-press cursor-pointer"
          id="btn-create-new-vault-grid"
          title={language === 'en-US' ? 'New' : 'Novo'}
          aria-label="Criar nova meta"
        >
          <div className="w-8 h-8 rounded-full bg-white border-2 border-black flex items-center justify-center text-black mb-1 group-hover:scale-110 transition-transform shadow-neo-xs">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="font-['Outfit'] font-black text-xs text-black leading-tight">
            {language === 'pt-BR' ? 'Novo' : 'New'}
          </span>
        </button>
      </div>
    </div>
  );
});

