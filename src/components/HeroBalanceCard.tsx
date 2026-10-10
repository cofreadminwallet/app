import React, { useState } from 'react';
import { TrendingUp, Eye, EyeOff, Wallet, Check, ArrowLeftRight } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { Web3Service } from '../services/web3Service';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { useI18n } from '../hooks/useI18n';
import { getCurrencyConfig } from '../utils/currencies';
import { formatCurrency } from '../utils/storage';

export type DisplayCurrencyMode = string; // e.g. 'BRL', 'USD', 'EUR', 'GBP', etc.

interface HeroBalanceCardProps {
  totalBalance?: number; // In USDC
  availableBalance: number; // In USDC
  lockedInVaults: number; // In USDC
  weeklyDelta: number;
  hideBalance: boolean;
  onToggleHideBalance: () => void;
  currency?: string; // Target secondary display currency (e.g. 'BRL', 'USD', 'EUR')
  onChangeCurrency?: (mode: string) => void;
  walletAddress?: string;
  web3Network?: 'base' | 'base-sepolia';
  onRefreshOnChain?: () => void;
  isRefreshingOnChain?: boolean;
  showInUsdc?: boolean;
  onToggleCurrencyMode?: () => void;
}

export const HeroBalanceCard: React.FC<HeroBalanceCardProps> = React.memo(({
  totalBalance,
  availableBalance,
  lockedInVaults,
  weeklyDelta,
  hideBalance,
  onToggleHideBalance,
  currency = 'BRL',
  onChangeCurrency,
  walletAddress,
  showInUsdc: showInUsdcProp,
  onToggleCurrencyMode,
}) => {
  const [hasCopiedAddress, setHasCopiedAddress] = useState(false);
  const { getRateFor } = useExchangeRate();
  const { t, language } = useI18n();

  // Selected secondary currency
  const activeCurrency = (currency || 'BRL').toUpperCase();
  const currencyConfig = getCurrencyConfig(activeCurrency, language);
  const currentRate = getRateFor(activeCurrency);

  // Mode: show primary as fiat or as native USDC
  const [internalShowInUsdc, setInternalShowInUsdc] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cofreadmin_show_native_usdc') === 'true';
    } catch {
      return false;
    }
  });

  const isControlled = typeof showInUsdcProp === 'boolean';
  const showInUsdc = isControlled ? showInUsdcProp : internalShowInUsdc;

  const handleToggleCurrencyMode = () => {
    triggerHaptic('medium');
    if (onToggleCurrencyMode) {
      onToggleCurrencyMode();
    } else {
      const nextVal = !internalShowInUsdc;
      setInternalShowInUsdc(nextVal);
      try {
        localStorage.setItem('cofreadmin_show_native_usdc', String(nextVal));
      } catch {}
    }
  };

  const handleCopy = () => {
    if (!walletAddress) return;
    triggerHaptic('light');
    navigator.clipboard?.writeText(walletAddress);
    setHasCopiedAddress(true);
    setTimeout(() => setHasCopiedAddress(false), 2000);
  };

  // Base raw values in USDC
  const rawTotalUsdc = typeof totalBalance === 'number' && !isNaN(totalBalance) ? totalBalance : (availableBalance || 0);
  const rawAvailableUsdc = typeof availableBalance === 'number' && !isNaN(availableBalance) ? availableBalance : 0;
  const rawLockedUsdc = typeof lockedInVaults === 'number' && !isNaN(lockedInVaults) ? lockedInVaults : 0;
  const rawWeeklyDeltaUsdc = typeof weeklyDelta === 'number' && !isNaN(weeklyDelta) ? weeklyDelta : 0;

  // Secondary converted values
  const convertedTotal = rawTotalUsdc * currentRate;
  const convertedAvailable = rawAvailableUsdc * currentRate;
  const convertedLocked = rawLockedUsdc * currentRate;
  const convertedWeeklyDelta = rawWeeklyDeltaUsdc * currentRate;

  // Main displayed string
  const formatMainDisplay = () => {
    if (showInUsdc) {
      return `$ ${rawTotalUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
    }
    return formatCurrency(convertedTotal, activeCurrency);
  };

  const formatSecondaryDisplay = () => {
    if (showInUsdc) {
      return `≈ ${formatCurrency(convertedTotal, activeCurrency)}`;
    }
    return `≈ $ ${rawTotalUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
  };

  return (
    <div 
      className="relative w-full bg-gradient-to-br from-[#E4F97E] to-[#B8F256] border-[3px] border-black rounded-[22px] p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2 transition-all"
      id="hero-balance-card"
    >
      {/* Header: Title & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-black">
            {t('balance_total')}
          </span>

          {walletAddress ? (
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 bg-black/10 hover:bg-black/20 text-black px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors cursor-pointer"
              title={t('balance_copy_address')}
            >
              <span>{Web3Service.truncateAddress(walletAddress)}</span>
              {hasCopiedAddress ? (
                <Check className="w-2.5 h-2.5 text-black" />
              ) : (
                <Wallet className="w-2.5 h-2.5 opacity-60" />
              )}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 bg-black/10 text-black px-2 py-0.5 rounded-full text-[10px] font-mono font-bold select-none">
              <span>{language === 'pt-BR' ? 'Offline' : 'Offline'}</span>
            </span>
          )}
        </div>

        {/* Network & Eye Toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/10 text-black flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${walletAddress ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`} />
            {walletAddress ? 'Base L2' : 'Local'}
          </span>

          <button
            onClick={() => {
              triggerHaptic('light');
              onToggleHideBalance();
            }}
            className="p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-black transition-colors"
            title={hideBalance ? t('balance_show') : t('balance_hide')}
            id="toggle-hide-balance-btn"
          >
            {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Balance Display (Tap directly on balance to switch between USDC and secondary currency) */}
      <div 
        onClick={handleToggleCurrencyMode}
        id="main-balance-toggle-area"
        className="cursor-pointer group select-none py-1"
        title={language === 'en-US' ? 'Switch' : 'Alternar'}
      >
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-black font-['Outfit']">
          {hideBalance ? '••••••••' : formatMainDisplay()}
        </h2>

        {/* Sub-balance with subtle switch indicator & live exchange rate pill */}
        {!hideBalance ? (
          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-mono font-bold text-black/70 group-hover:text-black transition-colors flex-wrap">
            <span>{formatSecondaryDisplay()}</span>
            <ArrowLeftRight className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity ml-0.5" />
            <span
              className="inline-flex items-center gap-1 text-[10px] font-sans font-bold text-black/80 bg-black/10 px-2 py-0.5 rounded-full ml-1 select-none"
              title={language === 'en-US' ? 'Rate' : 'Cotação'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
              <span>
                1 USDC ≈ {currencyConfig.symbol} {currentRate.toLocaleString(currencyConfig.locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </span>
          </div>
        ) : (
          <div className="text-xs font-mono font-bold text-black/40 mt-0.5">
            ••••
          </div>
        )}
      </div>

      {/* Footer: Weekly Trend & Available / Vaults breakdown */}
      <div className="flex items-center justify-between pt-2 border-t border-black/15 text-xs font-bold text-black flex-wrap gap-y-1">
        {/* Weekly Delta */}
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 opacity-70" />
          <span>
            {rawWeeklyDeltaUsdc >= 0 ? '+' : '-'}
            {showInUsdc
              ? `$ ${Math.abs(rawWeeklyDeltaUsdc).toFixed(2)}`
              : formatCurrency(Math.abs(convertedWeeklyDelta), activeCurrency)}
          </span>
          <span className="text-[10px] opacity-60">7d</span>
        </div>

        {/* Vault balance vs Total balance */}
        <div 
          className="flex items-center gap-1.5 whitespace-nowrap text-[11px]"
          id="hero-vault-vs-total-info"
          title={language === 'en-US' ? 'Vaults' : 'Cofres'}
        >
          <span className="opacity-75 font-semibold">{language === 'pt-BR' ? 'Cofres:' : 'Vaults:'}</span>
          <span className="font-mono font-black text-xs">
            {hideBalance ? (
              '•••• / ••••'
            ) : (
              <>
                <span>
                  {showInUsdc
                    ? `$ ${rawLockedUsdc.toFixed(2)}`
                    : formatCurrency(convertedLocked, activeCurrency)}
                </span>
                <span className="opacity-50 mx-1">/</span>
                <span>
                  {showInUsdc
                    ? `$ ${rawTotalUsdc.toFixed(2)}`
                    : formatCurrency(convertedTotal, activeCurrency)}
                </span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
});
