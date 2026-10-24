import React, { useState } from 'react';
import { Vault, UserProfile } from '../types';
import { Plus, Lock, Unlock, Sparkles, CheckCircle2, Trash2, Share2, Calendar, Vault as VaultIcon } from 'lucide-react';
import { formatCurrency } from '../utils/storage';
import { triggerHaptic } from '../utils/haptics';
import confetti from 'canvas-confetti';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { useI18n } from '../hooks/useI18n';
import { getCurrencyConfig } from '../utils/currencies';

interface VaultsScreenProps {
  vaults: Vault[];
  availableBalance: number;
  currency: string;
  user: UserProfile;
  autoOpenCreate?: boolean;
  onAutoOpenHandled?: () => void;
  autoOpenDepositVaultId?: string | null;
  onAutoOpenDepositHandled?: () => void;
  onCreateVault: (vaultData: Omit<Vault, 'id' | 'createdAt' | 'completed'>) => void;
  onDepositVault: (vaultId: string, amount: number) => void;
  onWithdrawVault: (vaultId: string, amount: number) => void;
  onDeleteVault: (vaultId: string) => void;
}

const PASTEL_COLORS = [
  { name: 'Lavender', bg: '#EDE9FE', border: '#7C3AED' },
  { name: 'Rose', bg: '#FFE4E6', border: '#E11D48' },
  { name: 'Mint', bg: '#E0F2FE', border: '#0284C7' },
  { name: 'Yellow', bg: '#FEF3C7', border: '#D97706' },
  { name: 'Lime', bg: '#E4F97E', border: '#65A30D' },
];

const EMOJI_PRESETS = ['🖥️', '🏖️', '💎', '👟', '🚗', '📱', '🎮', '✈️', '🏠', '🎸', '🎒', '🛡️'];

export const VaultsScreen: React.FC<VaultsScreenProps> = React.memo(({
  vaults,
  availableBalance,
  currency,
  user,
  autoOpenCreate,
  onAutoOpenHandled,
  autoOpenDepositVaultId,
  onAutoOpenDepositHandled,
  onCreateVault,
  onDepositVault,
  onWithdrawVault,
  onDeleteVault,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(!!autoOpenCreate);
  const [activeDepositVault, setActiveDepositVault] = useState<Vault | null>(null);
  const [activeWithdrawVault, setActiveWithdrawVault] = useState<Vault | null>(null);
  const [celebrationVault, setCelebrationVault] = useState<Vault | null>(null);
  const [vaultToDelete, setVaultToDelete] = useState<Vault | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const { rate: liveUsdcRate, getRateFor, convertFromUsdc, convertToUsdc } = useExchangeRate();
  const { t, language } = useI18n();

  const activeCurrency = (currency || 'BRL').toUpperCase();
  const currencyConfig = getCurrencyConfig(activeCurrency, language);
  const currencySymbol = currencyConfig.symbol;

  // Convert availableBalance (in base USDC) into the active display currency
  const availableInActiveCurrency = convertFromUsdc(availableBalance, activeCurrency);

  // Auto open create modal if requested from outside
  React.useEffect(() => {
    if (autoOpenCreate) {
      setIsCreateOpen(true);
      if (onAutoOpenHandled) {
        onAutoOpenHandled();
      }
    }
  }, [autoOpenCreate, onAutoOpenHandled]);

  // Auto open deposit modal if requested from outside (e.g. from Home Screen "+ Guardar")
  React.useEffect(() => {
    if (autoOpenDepositVaultId) {
      const target = vaults.find(v => v.id === autoOpenDepositVaultId);
      if (target) {
        setActiveDepositVault(target);
      }
      if (onAutoOpenDepositHandled) {
        onAutoOpenDepositHandled();
      }
    }
  }, [autoOpenDepositVaultId, vaults, onAutoOpenDepositHandled]);

  // New Vault Form state
  const [title, setTitle] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [initialAmountStr, setInitialAmountStr] = useState('0');
  const [selectedEmoji, setSelectedEmoji] = useState('🖥️');
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);
  const [deadline, setDeadline] = useState('');

  // Deposit/Withdraw form state
  const [actionAmountStr, setActionAmountStr] = useState('');

  const totalInVaults = vaults.reduce((acc, v) => acc + v.currentAmount, 0);
  const completedVaults = vaults.filter(v => v.completed);
  const activeVaults = vaults.filter(v => !v.completed);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetInActive = parseFloat(targetAmountStr) || 0;
    let initialInActive = parseFloat(initialAmountStr) || 0;

    if (!title.trim() || targetInActive <= 0) {
      triggerHaptic('warning');
      return;
    }

    // Ensure initial deposit does not exceed available balance
    if (initialInActive > (availableInActiveCurrency + 0.0001)) {
      initialInActive = availableInActiveCurrency;
    }

    // Convert values back to USDC for storage
    const targetInUsdc = activeCurrency === 'USDC' || activeCurrency === 'USD'
      ? targetInActive
      : convertToUsdc(targetInActive, activeCurrency);

    let initialInUsdc = 0;
    if (initialInActive > 0) {
      if (activeCurrency === 'USDC' || activeCurrency === 'USD') {
        initialInUsdc = initialInActive;
      } else if (Math.abs(initialInActive - availableInActiveCurrency) < 0.001) {
        initialInUsdc = availableBalance;
      } else {
        initialInUsdc = convertToUsdc(initialInActive, activeCurrency);
      }
      initialInUsdc = Math.min(initialInUsdc, availableBalance);
    }

    triggerHaptic('success');
    onCreateVault({
      title: title.trim(),
      targetAmount: Math.max(0.01, Math.round(targetInUsdc * 100) / 100),
      currentAmount: Math.min(targetInUsdc, Math.max(0, Math.round(initialInUsdc * 100) / 100)),
      emoji: selectedEmoji,
      color: selectedColor.name.toLowerCase(),
      bgColor: selectedColor.bg,
      deadline: deadline || undefined,
    });

    // Reset & close
    setTitle('');
    setTargetAmountStr('');
    setInitialAmountStr('0');
    setDeadline('');
    setIsCreateOpen(false);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDepositVault) return;
    const amountInActive = parseFloat(actionAmountStr) || 0;
    if (amountInActive < 0.01 || amountInActive > (availableInActiveCurrency + 0.0001)) {
      triggerHaptic('warning');
      return;
    }

    let amountUsdc: number;
    if (activeCurrency === 'USDC' || activeCurrency === 'USD') {
      amountUsdc = amountInActive;
    } else if (Math.abs(amountInActive - availableInActiveCurrency) < 0.001) {
      amountUsdc = availableBalance;
    } else {
      amountUsdc = convertToUsdc(amountInActive, activeCurrency);
    }
    amountUsdc = Math.min(amountUsdc, availableBalance);

    const willComplete = (activeDepositVault.currentAmount + amountUsdc) >= activeDepositVault.targetAmount;

    onDepositVault(activeDepositVault.id, amountUsdc);
    setActionAmountStr('');
    setActiveDepositVault(null);

    if (willComplete) {
      // Trigger Celebration Modal!
      triggerHaptic('success');
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
      setCelebrationVault({
        ...activeDepositVault,
        currentAmount: activeDepositVault.targetAmount,
        completed: true,
      });
    }
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWithdrawVault) return;
    const amountInActive = parseFloat(actionAmountStr) || 0;
    const currentInVaultInActive = convertFromUsdc(activeWithdrawVault.currentAmount, activeCurrency);
    if (amountInActive < 0.01 || amountInActive > (currentInVaultInActive + 0.0001)) {
      triggerHaptic('warning');
      return;
    }

    let amountUsdc: number;
    if (activeCurrency === 'USDC' || activeCurrency === 'USD') {
      amountUsdc = amountInActive;
    } else if (Math.abs(amountInActive - currentInVaultInActive) < 0.001) {
      amountUsdc = activeWithdrawVault.currentAmount;
    } else {
      amountUsdc = convertToUsdc(amountInActive, activeCurrency);
    }
    amountUsdc = Math.min(amountUsdc, activeWithdrawVault.currentAmount);

    onWithdrawVault(activeWithdrawVault.id, amountUsdc);
    setActionAmountStr('');
    setActiveWithdrawVault(null);
  };

  const handleShareGoal = async () => {
    triggerHaptic('light');
    if (!celebrationVault) return;
    const targetFormatted = formatCurrency(convertFromUsdc(celebrationVault.targetAmount, activeCurrency), activeCurrency);
    const text = language === 'pt-BR'
      ? `🎯 META ALCANÇADA NO COFREADMIN!\nEconomia de ${targetFormatted} concluída no cofre "${celebrationVault.title}" ${celebrationVault.emoji}!\nhttps://cofreadmin.gfin.app\n#CofreAdmin #MetasFinanceiras`
      : `🎯 GOAL SMASHED ON COFREADMIN!\nSaved ${targetFormatted} in the "${celebrationVault.title}" vault ${celebrationVault.emoji}!\nhttps://cofreadmin.gfin.app\n#CofreAdmin #FinancialGoals`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: language === 'pt-BR' ? 'Meta Alcançada - CofreAdmin' : 'Goal Smashed - CofreAdmin',
          text,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 3000);
      } catch {}
    }
  };

  return (
    <div className="w-full pb-28 pt-2" id="vaults-screen-container">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#EDE9FE] via-[#E0F2FE] to-[#FEF3C7] border-2 border-black rounded-[22px] p-5 shadow-neo mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 bg-white/70 px-2 py-0.5 rounded-md border border-black/15 inline-flex items-center gap-1">
              <VaultIcon className="w-3 h-3 stroke-[2.5]" />
              <span>{t('vaults_header_badge')}</span>
            </span>
            <h2 className="font-['Outfit'] font-black text-2xl text-black mt-1">
              {formatCurrency(convertFromUsdc(totalInVaults, activeCurrency), activeCurrency)}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs font-bold text-neutral-600">
                {vaults.length} {language === 'pt-BR' ? (vaults.length === 1 ? 'meta' : 'metas') : (vaults.length === 1 ? 'goal' : 'goals')}
              </p>
              <span className="text-[10px] font-bold text-purple-950/70 bg-purple-200/60 px-2 py-0.5 rounded-full border border-black/10">
                {activeCurrency === 'USDC'
                  ? `1 USDC ≈ ${getCurrencyConfig(user.currency || 'BRL', language).symbol} ${getRateFor(user.currency || 'BRL').toFixed(2)}`
                  : `1 USDC ≈ ${currencySymbol} ${getRateFor(activeCurrency).toFixed(2)}`}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('medium');
              setIsCreateOpen(true);
            }}
            className="w-10 h-10 bg-[#B8F256] hover:bg-[#A3E635] text-black border-2 border-black rounded-xl font-['Outfit'] font-black text-sm shadow-neo-sm btn-press flex items-center justify-center cursor-pointer shrink-0"
            id="btn-open-create-vault-modal"
            title={language === 'en-US' ? 'New' : 'Novo'}
            aria-label={language === 'en-US' ? 'New' : 'Novo'}
          >
            <Plus className="w-5 h-5 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Active Vaults Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-['Outfit'] font-extrabold text-lg text-black tracking-tight flex items-center gap-2">
            <span>{t('vaults_active_title')}</span>
            <span className="text-xs bg-[#EDE9FE] text-purple-950 border border-black px-2.5 py-0.5 rounded-full font-mono font-black shadow-neo-xs">
              {activeVaults.length}
            </span>
          </h3>
        </div>

        {activeVaults.length === 0 ? (
          <div className="text-center py-8 bg-white border-2 border-dashed border-black/30 rounded-[20px] p-4">
            <span className="text-3xl">🎯</span>
            <h4 className="font-['Outfit'] font-bold text-base text-black mt-2">
              {t('vaults_empty_active')}
            </h4>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1 mb-3">
              {t('vaults_empty_desc')}
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-10 h-10 mx-auto bg-[#B8F256] border-2 border-black rounded-xl font-black shadow-neo-sm btn-press flex items-center justify-center cursor-pointer"
              title={language === 'en-US' ? 'New' : 'Novo'}
              aria-label={language === 'en-US' ? 'New' : 'Novo'}
            >
              <Plus className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeVaults.map((vault) => {
              const currentInActive = convertFromUsdc(vault.currentAmount, activeCurrency);
              const targetInActive = convertFromUsdc(vault.targetAmount, activeCurrency);
              const remainingInActive = Math.max(0, targetInActive - currentInActive);
              const progress = Math.min(100, Math.round((vault.currentAmount / (vault.targetAmount || 1)) * 100));

              return (
                <div
                  key={vault.id}
                  className="border-2 border-black rounded-[22px] p-4 shadow-neo flex flex-col justify-between"
                  style={{ backgroundColor: vault.bgColor || '#FFFFFF' }}
                  id={`vault-card-${vault.id}`}
                >
                  <div>
                    {/* Top Row: Emoji, Title & Delete */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-xl bg-white border-2 border-black flex items-center justify-center text-2xl shadow-neo-sm flex-shrink-0">
                          {vault.emoji}
                        </div>
                        <div>
                          <h4 className="font-['Outfit'] font-black text-base text-black leading-tight">
                            {vault.title}
                          </h4>
                          {vault.deadline && (
                            <span className="text-[10px] font-semibold text-neutral-600 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {language === 'pt-BR' ? 'Até ' : 'Due '} {new Date(vault.deadline).toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : 'en-US')}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          setVaultToDelete(vault);
                        }}
                        className="text-neutral-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 border border-transparent hover:border-black/20 transition-colors"
                        title={language === 'en-US' ? 'Delete' : 'Excluir'}
                        id={`btn-delete-vault-${vault.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Balance Info */}
                    <div className="bg-white/80 border border-black/20 rounded-xl p-3 my-2.5">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="font-['Outfit'] font-black text-xl text-black">
                          {formatCurrency(currentInActive, activeCurrency)}
                        </span>
                        <span className="font-['Outfit'] font-extrabold text-xs text-neutral-600">
                          {t('vaults_target')} {formatCurrency(targetInActive, activeCurrency)}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-3 bg-neutral-100 border-2 border-black rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full bg-black rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-extrabold text-neutral-600 mt-1">
                        <span>{progress}% {t('vaults_completed_pct')}</span>
                        <span>{t('vaults_remaining_prefix')} {formatCurrency(remainingInActive, activeCurrency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Guardar / Resgatar */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        setActiveDepositVault(vault);
                      }}
                      className="py-2 px-3 bg-[#B8F256] text-black hover:bg-[#A3E635] border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-sm btn-press flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{t('vaults_btn_deposit')}</span>
                    </button>

                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveWithdrawVault(vault);
                      }}
                      disabled={vault.currentAmount <= 0}
                      className="py-2 px-3 bg-white text-black hover:bg-neutral-100 border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-sm btn-press disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{t('vaults_btn_withdraw')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Vaults Section */}
      {completedVaults.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3 px-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-['Outfit'] font-extrabold text-lg text-black tracking-tight">
              {t('vaults_completed_title')}
            </h3>
            <span className="text-xs bg-emerald-100 border border-black text-emerald-950 px-2 py-0.5 rounded-full font-black">
              {completedVaults.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completedVaults.map((vault) => (
              <div
                key={vault.id}
                className="bg-white border-2 border-black rounded-2xl p-3.5 shadow-neo flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border-2 border-black flex items-center justify-center text-xl shadow-neo-sm">
                    {vault.emoji}
                  </div>
                  <div>
                    <h5 className="font-['Outfit'] font-bold text-sm text-black flex items-center gap-1">
                      <span>{vault.title}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100 inline" />
                    </h5>
                    <span className="text-xs font-black text-emerald-700">
                      {formatCurrency(convertFromUsdc(vault.targetAmount, activeCurrency), activeCurrency)} {t('vaults_completed_badge')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setCelebrationVault(vault);
                  }}
                  className="p-2 rounded-xl bg-neutral-100 border border-black hover:bg-neutral-200 text-neutral-800"
                  title={language === 'en-US' ? 'Details' : 'Detalhes'}
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Create New Vault */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="absolute inset-0" onClick={() => setIsCreateOpen(false)} />
          <div className="relative w-full max-w-md bg-[#F4F6FB] border-t-2 sm:border-2 border-black rounded-t-[28px] sm:rounded-[28px] shadow-neo-xl p-5 z-10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Outfit'] font-black text-xl text-black">
                {t('vaults_create_modal_title')}
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-['Outfit'] font-bold text-black block mb-1">
                  {language === 'pt-BR' ? 'Nome da Meta' : 'Goal Name'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={language === 'pt-BR' ? 'ex: Setup Gamer, Reserva...' : 'e.g. Gaming PC, Stash...'}
                  className="w-full bg-white border-2 border-black rounded-xl p-2.5 text-sm font-bold text-black focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-['Outfit'] font-bold text-black block mb-1">
                    {language === 'pt-BR' ? 'Valor Alvo' : 'Target Amount'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-['Outfit'] font-black text-xs text-neutral-400">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={targetAmountStr}
                      onChange={(e) => setTargetAmountStr(e.target.value)}
                      placeholder="100.00"
                      className="w-full bg-white border-2 border-black rounded-xl p-2.5 pl-8 text-sm font-bold text-black focus:outline-hidden"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-['Outfit'] font-bold text-black block mb-1">
                    {language === 'pt-BR' ? 'Aporte Inicial' : 'Initial Deposit'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-['Outfit'] font-black text-xs text-neutral-400">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={availableInActiveCurrency > 0 ? availableInActiveCurrency : 0}
                      value={initialAmountStr}
                      onChange={(e) => setInitialAmountStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border-2 border-black rounded-xl p-2.5 pl-8 text-sm font-bold text-black focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Emoji Picker */}
              <div>
                <label className="text-xs font-['Outfit'] font-bold text-black block mb-1">
                  {language === 'pt-BR' ? 'Ícone' : 'Icon'}
                </label>
                <div className="grid grid-cols-6 gap-1.5 pb-1">
                  {EMOJI_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedEmoji(emoji);
                      }}
                      className={`h-9 rounded-xl border-2 flex items-center justify-center text-lg transition-transform ${
                        selectedEmoji === emoji ? 'border-black bg-white shadow-neo-sm scale-105' : 'border-transparent bg-white/70 hover:bg-white'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme */}
              <div>
                <label className="text-xs font-['Outfit'] font-bold text-black block mb-1">
                  {language === 'pt-BR' ? 'Cor' : 'Color'}
                </label>
                <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                  {PASTEL_COLORS.map((col) => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedColor(col);
                      }}
                      className={`py-1.5 px-1 rounded-xl border-2 text-[10px] sm:text-[11px] font-black text-black text-center truncate ${
                        selectedColor.name === col.name ? 'border-black shadow-neo-xs ring-1 ring-black' : 'border-black/30 opacity-80'
                      }`}
                      style={{ backgroundColor: col.bg }}
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="text-xs font-['Outfit'] font-bold text-black block mb-1">
                  {language === 'pt-BR' ? 'Data Limite (Opcional)' : 'Deadline (Optional)'}
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-white border-2 border-black rounded-xl p-2 text-xs font-bold text-black"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#B8F256] text-black border-2 border-black rounded-xl font-['Outfit'] font-black text-sm shadow-neo btn-press flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{language === 'pt-BR' ? 'Criar' : 'Create'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Guardar Grana */}
      {activeDepositVault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm bg-[#EDE9FE] border-2 border-black rounded-[24px] shadow-neo-xl p-5 z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeDepositVault.emoji}</span>
                <h4 className="font-['Outfit'] font-black text-lg text-black">
                  {language === 'pt-BR' ? 'Guardar no Cofre' : 'Deposit into Vault'}
                </h4>
              </div>
              <button
                onClick={() => setActiveDepositVault(null)}
                className="w-7 h-7 rounded-full border-2 border-black bg-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-purple-950 font-medium mb-3">
              {language === 'pt-BR' ? 'Cofre: ' : 'Vault: '}<strong>{activeDepositVault.title}</strong>
              <br />
              {language === 'pt-BR' ? 'Saldo disponível livre: ' : 'Available Balance: '}<strong>{formatCurrency(availableInActiveCurrency, activeCurrency)}</strong>
            </p>

            {(() => {
              const depositNum = parseFloat(actionAmountStr) || 0;
              const hasInput = actionAmountStr.trim() !== '';
              const isBelowMin = hasInput && depositNum < 0.01;
              const isExceeding = hasInput && depositNum > (availableInActiveCurrency + 0.0001);
              const isValid = hasInput && !isBelowMin && !isExceeding && availableInActiveCurrency >= 0.01;

              // Smart quick deposit percentages in active currency
              const quickShortcuts = [
                { label: '25%', value: Math.max(0.01, Math.round(availableInActiveCurrency * 0.25 * 100) / 100) },
                { label: '50%', value: Math.max(0.01, Math.round(availableInActiveCurrency * 0.50 * 100) / 100) },
                { label: '75%', value: Math.max(0.01, Math.round(availableInActiveCurrency * 0.75 * 100) / 100) },
                { label: language === 'pt-BR' ? 'Tudo (Máx)' : 'Max', value: Math.round(availableInActiveCurrency * 100) / 100 },
              ].filter((opt, idx, arr) => opt.value <= (availableInActiveCurrency + 0.001) && (idx === 0 || opt.value !== arr[idx - 1].value));

              return (
                <form onSubmit={handleDepositSubmit} noValidate className="space-y-3">
                  <div className="bg-white border-2 border-black rounded-xl p-3 text-center">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">
                      {language === 'pt-BR' ? 'Quanto quer guardar?' : 'How much to deposit?'}
                    </label>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="font-['Outfit'] font-black text-xl text-neutral-400">{currencySymbol}</span>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        max={availableInActiveCurrency > 0.01 ? availableInActiveCurrency : undefined}
                        value={actionAmountStr}
                        onChange={(e) => setActionAmountStr(e.target.value)}
                        placeholder={availableInActiveCurrency > 0 ? (availableInActiveCurrency < 1 ? availableInActiveCurrency.toFixed(2) : '10.00') : '0.00'}
                        className="font-['Outfit'] font-black text-3xl text-black text-center w-full focus:outline-hidden"
                        autoFocus
                      />
                    </div>
                  </div>

                  {isBelowMin && (
                    <div className="bg-rose-50 border border-rose-300 rounded-lg p-2 text-center text-xs font-bold text-rose-700">
                      {language === 'pt-BR' ? `O valor mínimo para guardar é ${formatCurrency(0.01, activeCurrency)}.` : `Minimum deposit is ${formatCurrency(0.01, activeCurrency)}.`}
                    </div>
                  )}

                  {isExceeding && (
                    <div className="bg-rose-50 border border-rose-300 rounded-lg p-2 text-center text-xs font-bold text-rose-700">
                      {language === 'pt-BR' ? `Valor maior que o saldo disponível (${formatCurrency(availableInActiveCurrency, activeCurrency)}).` : `Exceeds available balance (${formatCurrency(availableInActiveCurrency, activeCurrency)}).`}
                    </div>
                  )}

                  {availableInActiveCurrency < 0.01 && (
                    <div className="bg-amber-100 border border-amber-400 rounded-lg p-2 text-center text-xs font-bold text-amber-900">
                      {language === 'pt-BR'
                        ? `⚠️ Saldo disponível zerado (${formatCurrency(availableInActiveCurrency, activeCurrency)}). Adicione uma receita ou receba USDC na carteira para guardar no cofre!`
                        : `⚠️ No available balance (${formatCurrency(availableInActiveCurrency, activeCurrency)}). Add an income or receive USDC to lock in vaults!`}
                    </div>
                  )}

                  {isValid && (
                    <div className="text-center text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg py-1 px-2">
                      {language === 'pt-BR' ? 'Restará no saldo livre: ' : 'Left in available balance: '} {formatCurrency(Math.max(0, availableInActiveCurrency - depositNum), activeCurrency)}
                    </div>
                  )}

                  {/* Smart Adaptive Quick Buttons */}
                  {availableInActiveCurrency >= 0.01 && quickShortcuts.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {quickShortcuts.map((sc) => (
                        <button
                          key={sc.label}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setActionAmountStr(sc.value.toFixed(2));
                          }}
                          className="bg-white hover:bg-purple-100 border border-black rounded-lg py-1.5 text-xs font-black text-center text-black shadow-neo-xs btn-press"
                          title={language === 'en-US' ? 'Fill' : 'Preencher'}
                        >
                          {sc.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isValid}
                    className="w-full py-3 bg-[#B8F256] text-black hover:bg-[#A3E635] disabled:opacity-40 disabled:cursor-not-allowed border-2 border-black rounded-xl font-['Outfit'] font-black text-sm shadow-neo-sm btn-press cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{t('vaults_btn_deposit')}</span>
                  </button>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: Resgatar Grana */}
      {activeWithdrawVault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm bg-[#FFE4E6] border-2 border-black rounded-[24px] shadow-neo-xl p-5 z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeWithdrawVault.emoji}</span>
                <h4 className="font-['Outfit'] font-black text-lg text-black">
                  {language === 'pt-BR' ? 'Resgatar do Cofre' : 'Withdraw from Vault'}
                </h4>
              </div>
              <button
                onClick={() => setActiveWithdrawVault(null)}
                className="w-7 h-7 rounded-full border-2 border-black bg-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-rose-950 font-medium mb-3">
              {language === 'pt-BR' ? 'Guardado atualmente: ' : 'Currently locked: '}<strong>{formatCurrency(convertFromUsdc(activeWithdrawVault.currentAmount, activeCurrency), activeCurrency)}</strong>
            </p>

            {(() => {
              const currentInVaultInActive = convertFromUsdc(activeWithdrawVault.currentAmount, activeCurrency);
              const withdrawNum = parseFloat(actionAmountStr) || 0;
              const hasInput = actionAmountStr.trim() !== '';
              const isBelowMin = hasInput && withdrawNum < 0.01;
              const isExceeding = hasInput && withdrawNum > (currentInVaultInActive + 0.0001);
              const isValid = hasInput && !isBelowMin && !isExceeding && currentInVaultInActive >= 0.01;

              const quickWithdrawShortcuts = [
                { label: '25%', value: Math.max(0.01, Math.round(currentInVaultInActive * 0.25 * 100) / 100) },
                { label: '50%', value: Math.max(0.01, Math.round(currentInVaultInActive * 0.50 * 100) / 100) },
                { label: '75%', value: Math.max(0.01, Math.round(currentInVaultInActive * 0.75 * 100) / 100) },
                { label: language === 'pt-BR' ? 'Tudo (Máx)' : 'Max', value: Math.round(currentInVaultInActive * 100) / 100 },
              ].filter((opt, idx, arr) => opt.value <= (currentInVaultInActive + 0.001) && (idx === 0 || opt.value !== arr[idx - 1].value));

              return (
                <form onSubmit={handleWithdrawSubmit} noValidate className="space-y-3">
                  <div className="bg-white border-2 border-black rounded-xl p-3 text-center">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">
                      {language === 'pt-BR' ? 'Quanto quer resgatar?' : 'How much to withdraw?'}
                    </label>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="font-['Outfit'] font-black text-xl text-neutral-400">{currencySymbol}</span>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        max={currentInVaultInActive > 0.01 ? currentInVaultInActive : undefined}
                        value={actionAmountStr}
                        onChange={(e) => setActionAmountStr(e.target.value)}
                        placeholder={currentInVaultInActive < 1 ? currentInVaultInActive.toFixed(2) : '10.00'}
                        className="font-['Outfit'] font-black text-3xl text-black text-center w-full focus:outline-hidden"
                        autoFocus
                      />
                    </div>
                  </div>

                  {isBelowMin && (
                    <div className="bg-rose-50 border border-rose-300 rounded-lg p-2 text-center text-xs font-bold text-rose-700">
                      {language === 'pt-BR' ? `O valor mínimo para resgate é ${formatCurrency(0.01, activeCurrency)}.` : `Minimum withdrawal is ${formatCurrency(0.01, activeCurrency)}.`}
                    </div>
                  )}

                  {isExceeding && (
                    <div className="bg-rose-50 border border-rose-300 rounded-lg p-2 text-center text-xs font-bold text-rose-700">
                      {language === 'pt-BR' ? `Valor maior que o saldo deste cofre (${formatCurrency(currentInVaultInActive, activeCurrency)}).` : `Exceeds vault balance (${formatCurrency(currentInVaultInActive, activeCurrency)}).`}
                    </div>
                  )}

                  {currentInVaultInActive >= 0.01 && quickWithdrawShortcuts.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {quickWithdrawShortcuts.map((sc) => (
                        <button
                          key={sc.label}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setActionAmountStr(sc.value.toFixed(2));
                          }}
                          className="bg-white hover:bg-rose-100 border border-black rounded-lg py-1.5 text-xs font-black text-center text-black shadow-neo-xs btn-press"
                          title={language === 'en-US' ? 'Fill' : 'Preencher'}
                        >
                          {sc.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isValid}
                    className="w-full py-3 bg-rose-600 text-white disabled:opacity-40 disabled:cursor-not-allowed border-2 border-black rounded-xl font-['Outfit'] font-black text-sm shadow-neo-sm btn-press cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{t('vaults_btn_withdraw')}</span>
                  </button>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: 100% Goal Completion Celebration */}
      {celebrationVault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="relative w-full max-w-sm bg-gradient-to-br from-[#E4F97E] via-[#D2F764] to-[#B8F256] border-3 border-black rounded-[28px] shadow-neo-xl p-6 text-center z-10 overflow-hidden">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-1.5 bg-white text-black border-2 border-black px-3 py-1 rounded-full text-xs font-['Outfit'] font-black mb-3 shadow-neo-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'pt-BR' ? 'META CONCLUÍDA 100%!' : 'GOAL 100% SMASHED!'}</span>
            </div>

            {/* Big Icon */}
            <div className="w-20 h-20 rounded-2xl bg-white border-3 border-black mx-auto flex items-center justify-center text-4xl shadow-neo my-2">
              {celebrationVault.emoji}
            </div>

            <h3 className="font-['Outfit'] font-black text-2xl text-black mt-2">
              {celebrationVault.title}
            </h3>

            <p className="font-['Outfit'] font-extrabold text-xl text-neutral-900 my-1">
              {formatCurrency(convertFromUsdc(celebrationVault.targetAmount, activeCurrency), activeCurrency)}
            </p>

            <p className="text-xs text-black/80 font-medium px-2 mb-4">
              {language === 'pt-BR'
                ? <>Parabéns, <strong>{user.name.split(' ')[0]}</strong>! Você concluiu com sucesso o objetivo deste cofre! 🎯</>
                : <>Congrats, <strong>{user.name.split(' ')[0]}</strong>! You successfully crushed this savings goal! 🎯</>}
            </p>

            {/* Share / Copy Action */}
            <div className="space-y-2">
              <button
                onClick={handleShareGoal}
                className="w-full py-3 bg-[#B8F256] text-black hover:bg-[#A3E635] border-2 border-black rounded-xl font-['Outfit'] font-black text-sm shadow-neo-sm btn-press flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>{copiedShare ? (language === 'pt-BR' ? 'Link Copiado! 🚀' : 'Copied to Clipboard! 🚀') : (language === 'pt-BR' ? 'Compartilhar Meta' : 'Share Goal')}</span>
              </button>

              <button
                onClick={() => setCelebrationVault(null)}
                className="w-full py-2.5 bg-white text-black border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-sm btn-press"
              >
                {t('modal_close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Vault Confirmation */}
      {vaultToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setVaultToDelete(null)} />
          <div className="relative w-full max-w-sm bg-white border-2 border-black rounded-[24px] shadow-neo-xl p-5 z-10 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FFE4E6] border-2 border-black flex items-center justify-center text-2xl mx-auto mb-3 shadow-neo-xs">
              {vaultToDelete.emoji || '🎯'}
            </div>
            
            <h3 className="font-['Outfit'] font-black text-lg text-black">
              {language === 'pt-BR' ? 'Excluir Cofre?' : 'Delete Vault?'}
            </h3>
            
            <p className="text-xs text-neutral-600 font-medium mt-1.5 mb-4 px-2">
              {language === 'pt-BR'
                ? <>Deseja excluir o cofre <strong>"{vaultToDelete.title}"</strong>? O valor guardado ({formatCurrency(convertFromUsdc(vaultToDelete.currentAmount, activeCurrency), activeCurrency)}) retornará ao seu saldo disponível.</>
                : <>Delete the vault <strong>"{vaultToDelete.title}"</strong>? The saved funds ({formatCurrency(convertFromUsdc(vaultToDelete.currentAmount, activeCurrency), activeCurrency)}) will return to your available balance.</>}
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVaultToDelete(null)}
                className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-black border-2 border-black rounded-xl font-['Outfit'] font-bold text-xs btn-press"
              >
                {t('modal_cancel')}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('warning');
                  onDeleteVault(vaultToDelete.id);
                  setVaultToDelete(null);
                }}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press flex items-center justify-center gap-1.5"
                id="btn-confirm-delete-vault"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'pt-BR' ? 'Excluir' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
