import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Fingerprint, Lock, LogOut, AlertCircle, RefreshCw, Delete } from 'lucide-react';
import { UserProfile } from '../types';
import { WebAuthnService } from '../services/webAuthnService';
import { authService } from '../services';
import { triggerHaptic } from '../utils/haptics';
import { useI18n } from '../services/i18nService';

interface AppLockScreenProps {
  user: UserProfile;
  onUnlock: () => void;
  onLogout: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  user,
  onUnlock,
  onLogout,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';

  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShake, setIsShake] = useState(false);
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);
  const [isGoogleUnlocking, setIsGoogleUnlocking] = useState(false);
  const [hasPin, setHasPin] = useState<boolean>(() => WebAuthnService.hasStoredPin());

  // Initial setup state if user enabled lock without creating a PIN yet
  const [setupStep, setSetupStep] = useState<'enter' | 'confirm' | null>(null);
  const [setupPinCandidate, setSetupPinCandidate] = useState<string>('');

  const isVerifyingRef = useRef(false);

  // Unlock callback helper
  const completeUnlock = useCallback(() => {
    triggerHaptic('success');
    WebAuthnService.setSessionUnlocked(true);
    sessionStorage.removeItem('cofre_last_background_ts');
    onUnlock();
  }, [onUnlock]);

  // Request native biometrics unlock
  const handleDeviceUnlock = useCallback(async () => {
    setErrorMessage(null);
    setIsAuthenticatingBio(true);
    triggerHaptic('light');

    try {
      const res = await WebAuthnService.authenticateBiometrics(
        user.email || 'usuario@cofreadmin.app',
        user.name || 'Usuário Cofre'
      );
      if (res.success) {
        completeUnlock();
      } else if (res.cancelled) {
        // Soft cancellation - user closed or clicked outside, allow typing PIN
        setErrorMessage(
          isEn
            ? 'Biometrics cancelled. Enter your 4-digit PIN.'
            : 'Biometria cancelada. Digite seu PIN de 4 dígitos.'
        );
      } else {
        triggerHaptic('warning');
        setErrorMessage(
          res.message ||
            (isEn
              ? 'Security check not recognized. Enter PIN to unlock.'
              : 'Segurança não reconhecida. Digite o PIN para desbloquear.')
        );
      }
    } catch (e: any) {
      console.warn('Device unlock exception:', e);
      triggerHaptic('warning');
      setErrorMessage(
        isEn
          ? 'Failed to trigger device biometrics. Enter your PIN.'
          : 'Falha ao acionar a biometria. Digite seu PIN de 4 dígitos.'
      );
    } finally {
      setIsAuthenticatingBio(false);
    }
  }, [completeUnlock, isEn, user.email, user.name]);

  // Optional seamless biometrics auto-trigger on mount (like TWT / banking apps)
  useEffect(() => {
    const isBioActive = WebAuthnService.isBiometricsEnabled() || !hasPin;
    if (!isBioActive) return;

    const timer = setTimeout(() => {
      handleDeviceUnlock();
    }, 400);

    return () => {
      clearTimeout(timer);
      WebAuthnService.cancelPendingAuth();
    };
  }, [handleDeviceUnlock, hasPin]);

  // Handle PIN digit verification
  const verifyPin = useCallback(
    async (enteredPin: string) => {
      if (isVerifyingRef.current) return;
      isVerifyingRef.current = true;

      // Case 1: First-time setup mode if user had no PIN configured
      if (!hasPin) {
        if (!setupStep || setupStep === 'enter') {
          triggerHaptic('medium');
          setSetupPinCandidate(enteredPin);
          setSetupStep('confirm');
          setPin('');
          isVerifyingRef.current = false;
          return;
        } else if (setupStep === 'confirm') {
          if (enteredPin === setupPinCandidate) {
            triggerHaptic('success');
            await WebAuthnService.saveSecurityPin(enteredPin);
            setHasPin(true);
            completeUnlock();
          } else {
            triggerHaptic('warning');
            setIsShake(true);
            setErrorMessage(
              isEn ? 'PINs do not match. Try again.' : 'Os PINs não coincidem. Tente novamente.'
            );
            setTimeout(() => {
              setIsShake(false);
              setSetupStep('enter');
              setSetupPinCandidate('');
              setPin('');
            }, 600);
          }
          isVerifyingRef.current = false;
          return;
        }
      }

      // Case 2: Standard PIN verification against stored SHA-256 hash
      try {
        const isValid = await WebAuthnService.verifySecurityPin(enteredPin);
        if (isValid) {
          completeUnlock();
        } else {
          triggerHaptic('warning');
          setIsShake(true);
          setErrorMessage(
            isEn ? 'Incorrect PIN. Try again.' : 'PIN incorreto. Tente novamente.'
          );
          setTimeout(() => {
            setIsShake(false);
            setPin('');
            isVerifyingRef.current = false;
          }, 350);
          return;
        }
      } catch (e) {
        console.error('Error verifying PIN:', e);
        setErrorMessage(isEn ? 'Verification error.' : 'Erro ao verificar PIN.');
      }
      isVerifyingRef.current = false;
    },
    [completeUnlock, hasPin, isEn, setupPinCandidate, setupStep]
  );

  // Keypad button press handler
  const handleDigitPress = useCallback(
    (digit: string) => {
      if (pin.length >= 4 || isVerifyingRef.current) return;
      triggerHaptic('light');
      setErrorMessage(null);

      const nextPin = pin + digit;
      setPin(nextPin);

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    },
    [pin, verifyPin]
  );

  // Backspace press handler
  const handleBackspace = useCallback(() => {
    if (pin.length === 0 || isVerifyingRef.current) return;
    triggerHaptic('light');
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  }, [pin.length]);

  // Physical keyboard support for desktop & tablets
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBackspace, handleDigitPress]);

  // Emergency unlock using active Google Auth session
  const handleGoogleSessionUnlock = async () => {
    setIsGoogleUnlocking(true);
    setErrorMessage(null);
    triggerHaptic('medium');

    try {
      const isValidSession = await authService.verifyActiveSessionToken(true);
      if (isValidSession) {
        completeUnlock();
      } else {
        triggerHaptic('warning');
        setErrorMessage(
          isEn ? 'Session expired. Please sign in again.' : 'Sessão expirada. Faça login novamente.'
        );
      }
    } catch {
      triggerHaptic('warning');
      setErrorMessage(
        isEn
          ? 'Could not validate Google session. Please sign in again.'
          : 'Não foi possível validar a sessão Google. Faça login novamente.'
      );
    } finally {
      setIsGoogleUnlocking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-6 bg-[#F4F6FB] overflow-y-auto select-none"
      id="screen-app-lock"
    >
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#0052FF_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

      {/* Top Bar */}
      <div className="w-full max-w-xs sm:max-w-sm flex items-center justify-between relative z-10 pt-1">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-black rounded-full shadow-neo-xs">
          <Shield className="w-3.5 h-3.5 text-[#0052FF]" />
          <span className="text-[10px] font-['Outfit'] font-black uppercase tracking-wider text-black">
            {isEn ? 'Protected Vault' : 'Cofre Protegido'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            WebAuthnService.cancelPendingAuth();
            onLogout();
          }}
          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-neutral-100 text-rose-700 border-2 border-black rounded-full text-[10px] font-['Outfit'] font-black shadow-neo-xs btn-press cursor-pointer"
          id="btn-lock-screen-logout"
          title={isEn ? 'Logout' : 'Sair'}
        >
          <LogOut className="w-3 h-3" />
          <span>{isEn ? 'Sign Out' : 'Sair'}</span>
        </button>
      </div>

      {/* Main Center Container */}
      <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center text-center relative z-10 my-auto py-2">
        {/* Avatar & Lock Badge */}
        <div className="relative mb-2">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-3 border-black overflow-hidden bg-white shadow-neo mx-auto">
            <img
              src={user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=CofreMaster'}
              alt={user.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#B8F256] border-2 border-black flex items-center justify-center shadow-neo-xs">
            <Lock className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          </div>
        </div>

        <h2 className="font-['Outfit'] font-black text-lg sm:text-xl text-black tracking-tight mb-0.5">
          {user.name || (isEn ? 'My Vault' : 'Meu Cofre')}
        </h2>

        {/* Dynamic Instruction */}
        <p className="text-xs text-neutral-600 font-bold mb-4">
          {!hasPin
            ? setupStep === 'confirm'
              ? isEn
                ? 'Confirm your 4-digit PIN'
                : 'Confirme seu PIN de 4 dígitos'
              : isEn
              ? 'Create your 4-digit PIN'
              : 'Crie seu PIN de 4 dígitos'
            : isEn
            ? 'Enter your PIN'
            : 'Digite seu PIN'}
        </p>

        {/* 4-Digit PIN Visual Indicators (Dots) */}
        <div
          className={`flex items-center justify-center gap-4 mb-5 transition-transform ${
            isShake ? 'animate-bounce text-rose-600' : ''
          }`}
          id="pin-dots-container"
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 border-black transition-all duration-150 ${
                  isFilled
                    ? 'bg-[#0052FF] scale-125 shadow-neo-xs'
                    : 'bg-white/90 scale-100'
                }`}
              />
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            className="w-full mb-3 p-2.5 bg-rose-50 border-2 border-black rounded-xl text-xs font-bold text-rose-950 flex items-start gap-2 shadow-neo-xs animate-in fade-in text-left"
            id="app-lock-error-alert"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-tight">
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Trust Wallet-Style Tactile Numeric Keypad */}
        <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3 max-w-[280px] sm:max-w-[300px] mx-auto mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              className="h-14 sm:h-16 rounded-2xl bg-white hover:bg-neutral-100 active:bg-neutral-200 border-2 border-black font-['Outfit'] font-black text-2xl text-black shadow-neo-xs btn-press flex items-center justify-center cursor-pointer transition-transform"
              id={`btn-keypad-${digit}`}
            >
              {digit}
            </button>
          ))}

          {/* Bottom Row: Biometrics Button, 0, Backspace */}
          <button
            type="button"
            onClick={handleDeviceUnlock}
            disabled={isAuthenticatingBio}
            className={`h-14 sm:h-16 rounded-2xl border-2 border-black font-['Outfit'] font-black text-sm shadow-neo-xs btn-press flex items-center justify-center cursor-pointer transition-all ${
              isAuthenticatingBio
                ? 'bg-[#B8F256] text-black animate-pulse'
                : 'bg-[#EDE9FE] hover:bg-[#DDD6FE] text-purple-950'
            }`}
            id="btn-keypad-biometrics"
            title={isEn ? 'Biometrics' : 'Biometria'}
          >
            {isAuthenticatingBio ? (
              <RefreshCw className="w-6 h-6 animate-spin text-purple-950" />
            ) : (
              <Fingerprint className="w-7 h-7 text-[#0052FF]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="h-14 sm:h-16 rounded-2xl bg-white hover:bg-neutral-100 active:bg-neutral-200 border-2 border-black font-['Outfit'] font-black text-2xl text-black shadow-neo-xs btn-press flex items-center justify-center cursor-pointer transition-transform"
            id="btn-keypad-0"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 sm:h-16 rounded-2xl bg-white hover:bg-neutral-100 active:bg-neutral-200 border-2 border-black font-['Outfit'] font-black text-black shadow-neo-xs btn-press flex items-center justify-center cursor-pointer transition-transform"
            id="btn-keypad-backspace"
            title={isEn ? 'Backspace' : 'Apagar'}
          >
            <Delete className="w-6 h-6 text-neutral-800" />
          </button>
        </div>

        {/* Fallback Option */}
        <div className="pt-2 border-t border-black/10 w-full flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleGoogleSessionUnlock}
            disabled={isGoogleUnlocking}
            className="text-xs font-['Outfit'] font-bold text-neutral-600 hover:text-black flex items-center gap-1.5 transition-colors cursor-pointer py-1"
            id="btn-unlock-google-session"
          >
            {isGoogleUnlocking ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-neutral-500" />
                <span>{isEn ? 'Validating...' : 'Validando...'}</span>
              </>
            ) : (
              <span>{isEn ? 'Unlock with Google' : 'Desbloquear com Google'}</span>
            )}
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="w-full max-w-xs sm:max-w-sm flex items-center justify-center relative z-10 pb-1">
        <p className="text-[10px] text-neutral-400 font-mono font-medium">
          {isEn ? 'CofreAdmin • Instant Security' : 'CofreAdmin • Segurança Instantânea'}
        </p>
      </div>
    </div>
  );
};
