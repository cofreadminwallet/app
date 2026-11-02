import React, { useState } from 'react';
import { Sparkles, ArrowRight, Target, CheckCircle2, Wallet, X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import confetti from 'canvas-confetti';
import { useI18n } from '../services/i18nService';

interface OnboardingModalProps {
  isOpen: boolean;
  userName: string;
  currency: string;
  onComplete: (dailySpendLimit: number) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  userName,
  currency,
  onComplete,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';
  const [step, setStep] = useState<1 | 2>(1);
  const [dailyLimitInput, setDailyLimitInput] = useState('');

  if (!isOpen) return null;

  const handleFinish = (limitVal?: number) => {
    const parsed = limitVal !== undefined ? limitVal : parseFloat(dailyLimitInput);
    const finalLimit = !isNaN(parsed) && parsed > 0 ? parsed : 0;
    triggerHaptic('success');
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });
    onComplete(finalLimit);
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      triggerHaptic('medium');
      setStep(2);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    triggerHaptic('light');
    handleFinish(0);
  };

  const currencySymbol = currency === 'BRL' ? 'R$' : '$';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#F4F6FB] border-[3px] border-black rounded-[28px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-7 my-auto text-black">
        {/* Close/Skip button on top-right */}
        <button
          type="button"
          onClick={handleSkip}
          aria-label={isEn ? 'Skip and enter app' : 'Pular e entrar no aplicativo'}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-neutral-100 flex items-center justify-center font-bold text-black shadow-neo-xs btn-press z-10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress indicator */}
        <div className="flex items-center justify-between gap-2 mb-4 pr-10">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 rounded-xl border-2 border-black flex items-center justify-center font-['Outfit'] font-black text-xs ${
                step >= 1 ? 'bg-[#E4F97E] text-black shadow-neo-xs' : 'bg-white text-neutral-400'
              }`}
            >
              1
            </div>
            <div className="w-8 h-1 bg-black/20 rounded-full overflow-hidden">
              <div className={`h-full bg-black transition-all ${step === 2 ? 'w-full' : 'w-0'}`} />
            </div>
            <div
              className={`w-7 h-7 rounded-xl border-2 border-black flex items-center justify-center font-['Outfit'] font-black text-xs ${
                step === 2 ? 'bg-[#E4F97E] text-black shadow-neo-xs' : 'bg-white text-neutral-400'
              }`}
            >
              2
            </div>
          </div>

          <span className="text-[10px] font-['Outfit'] font-black uppercase tracking-wider bg-white text-black border border-black px-2.5 py-0.5 rounded-full shadow-neo-xs">
            {isEn ? 'Welcome Base 🚀' : 'Boas-Vindas Base 🚀'}
          </span>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext} className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EDE9FE] border-2 border-black rounded-xl text-xs font-black text-purple-950 shadow-neo-xs mb-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                <span>{isEn ? 'Step 1 • Web3 Wallet' : 'Passo 1 • Carteira Web3'}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-['Outfit'] font-black text-black leading-tight">
                {isEn ? 'Smart Wallet connected! ⚡' : 'Smart Wallet conectada! ⚡'}
              </h2>

              <p className="text-xs text-neutral-600 font-medium mt-1">
                {isEn ? (
                  <>
                    Hello <strong>{userName.split(' ')[0] || 'Admin'}</strong>, your USDC balance syncs with the <strong>Base (L2)</strong> network in real time.
                  </>
                ) : (
                  <>
                    Olá <strong>{userName.split(' ')[0] || 'Admin'}</strong>, seu saldo em USDC é sincronizado com a rede <strong>Base (L2)</strong> em tempo real.
                  </>
                )}
              </p>
            </div>

            {/* Smart Wallet Overview Card */}
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 border-2 border-black flex items-center justify-center text-xl">
                  <Wallet className="w-5 h-5 text-[#0052FF]" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase block">
                    {isEn ? 'Main Network' : 'Rede Principal'}
                  </span>
                  <span className="text-xs font-['Outfit'] font-black text-black block truncate">
                    Base Mainnet (L2) • Coinbase
                  </span>
                </div>
                <span className="bg-[#DCFCE7] text-emerald-800 border border-emerald-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {isEn ? 'Active 🟢' : 'Ativo 🟢'}
                </span>
              </div>

              <div className="bg-[#F4F6FB] border border-black/15 rounded-xl p-2.5 text-[11px] text-neutral-700 leading-relaxed font-medium">
                {isEn
                  ? '🛡️ 100% On-Chain: Your vaults and funds operate with real USDC balance on the blockchain.'
                  : '🛡️ 100% On-Chain: Seus cofres e reservas operam com saldo real em USDC na blockchain.'}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                className="w-full py-3.5 bg-[#B8F256] hover:bg-[#A3E635] text-black font-['Outfit'] font-black text-sm rounded-2xl border-2 border-black shadow-neo-sm btn-press flex items-center justify-center gap-2 cursor-pointer"
                id="btn-onboarding-next"
              >
                <span>{isEn ? 'Continue' : 'Continuar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-2 text-xs font-['Outfit'] font-bold text-neutral-500 hover:text-black transition-colors cursor-pointer"
              >
                {isEn ? 'Skip intro and enter app' : 'Pular introdução e entrar no app'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleNext} className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF3C7] border-2 border-black rounded-xl text-xs font-black text-amber-950 shadow-neo-xs mb-2">
                <Target className="w-3.5 h-3.5 text-amber-700" />
                <span>{isEn ? 'Step 2 • Daily Cap (Optional)' : 'Passo 2 • Meta Diária (Opcional)'}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-['Outfit'] font-black text-black leading-tight">
                {isEn ? 'Set Daily Cap?' : 'Definir Meta Diária?'}
              </h2>

              <p className="text-xs text-neutral-600 font-medium mt-1">
                {isEn
                  ? 'The daily budget is completely optional. Set a limit or skip to customize whenever you want.'
                  : 'A meta diária é totalmente opcional. Se quiser, digite um valor agora ou pule para começar a usar e ajustar quando preferir.'}
              </p>
            </div>

            {/* Daily limit card */}
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm text-center">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  {isEn ? `Daily limit (${currencySymbol})` : `Meta diária (${currencySymbol})`}
                </span>
                <span className="text-[10px] font-bold bg-[#EDE9FE] text-purple-900 border border-purple-300 px-2 py-0.2 rounded-full">
                  {isEn ? 'Optional' : 'Opcional'}
                </span>
              </div>

              <div className="flex items-center justify-center gap-1.5 my-2">
                <span className="text-2xl font-['Outfit'] font-black text-neutral-400">{currencySymbol}</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={dailyLimitInput}
                  onChange={(e) => setDailyLimitInput(e.target.value)}
                  placeholder={isEn ? '0.00 (no cap)' : '0.00 (sem meta)'}
                  className="w-full text-center text-3xl sm:text-4xl font-['Outfit'] font-black text-black bg-transparent focus:outline-hidden"
                  autoFocus
                  id="input-onboarding-limit"
                />
              </div>

              <p className="text-[10px] text-neutral-500">
                {dailyLimitInput && parseFloat(dailyLimitInput) > 0
                  ? isEn
                    ? `Cap of ${currencySymbol}${parseFloat(dailyLimitInput).toFixed(2)} per day`
                    : `Meta de ${currencySymbol}${parseFloat(dailyLimitInput).toFixed(2)} por dia`
                  : isEn
                  ? 'Leave blank or 0 to use without daily cap'
                  : 'Deixe em branco ou zero para usar sem meta diária'}
              </p>
            </div>

            {/* Quick Limit Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-neutral-600">
                  {isEn ? 'Quick suggestions:' : 'Sugestões rápidas:'}
                </span>
                {dailyLimitInput && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setDailyLimitInput('');
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    {isEn ? 'Clear' : 'Limpar'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(currency === 'BRL' ? [50, 100, 150, 200] : [15, 25, 50, 80]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setDailyLimitInput(val.toString());
                    }}
                    className={`py-1.5 px-3 rounded-xl border-2 border-black text-xs font-['Outfit'] font-bold btn-press shadow-neo-xs cursor-pointer ${
                      dailyLimitInput === val.toString()
                        ? 'bg-[#B8F256] text-black font-black'
                        : 'bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {currencySymbol}{val}/{isEn ? 'day' : 'dia'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                className="w-full py-3.5 bg-[#B8F256] hover:bg-[#A3E635] text-black font-['Outfit'] font-black text-sm rounded-2xl border-2 border-black shadow-neo-sm btn-press flex items-center justify-center gap-2 cursor-pointer"
                id="btn-onboarding-finish"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {dailyLimitInput && parseFloat(dailyLimitInput) > 0
                    ? isEn
                      ? 'Save Cap & Enter'
                      : 'Salvar Meta e Entrar'
                    : isEn
                    ? 'Enter App (No Cap)'
                    : 'Entrar no App (Sem Meta)'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-2.5 bg-white hover:bg-neutral-100 text-neutral-700 font-['Outfit'] font-bold text-xs rounded-xl border-2 border-black shadow-neo-xs btn-press cursor-pointer"
              >
                {isEn ? 'Skip for now (Set later)' : 'Pular por enquanto (Definir depois)'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
