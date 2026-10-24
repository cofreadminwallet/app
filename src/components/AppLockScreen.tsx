import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, Lock, Smartphone, LogOut, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isGoogleUnlocking, setIsGoogleUnlocking] = useState(false);

  // Request authentication using the phone's native security (Biometrics / Face ID / PIN)
  const handleDeviceUnlock = async () => {
    setErrorMessage(null);
    setIsAuthenticating(true);
    triggerHaptic('light');

    try {
      const res = await WebAuthnService.authenticateBiometrics(
        user.email || 'usuario@cofreadmin.app',
        user.name || 'Usuário Cofre'
      );
      if (res.success) {
        triggerHaptic('success');
        WebAuthnService.setSessionUnlocked(true);
        sessionStorage.removeItem('cofre_last_background_ts');
        onUnlock();
      } else if (res.cancelled) {
        triggerHaptic('warning');
        setErrorMessage(
          isEn
            ? 'Validation cancelled on device. Tap button to try again.'
            : 'Validação cancelada no aparelho. Toque no botão para tentar novamente.'
        );
      } else {
        triggerHaptic('warning');
        setErrorMessage(
          res.message ||
            (isEn
              ? 'Security check not recognized. Tap to try again.'
              : 'Segurança não reconhecida. Toque para tentar novamente.')
        );
      }
    } catch (e: any) {
      console.warn('Device unlock exception:', e);
      triggerHaptic('warning');
      setErrorMessage(
        isEn
          ? 'Failed to trigger device security. Try again.'
          : 'Falha ao acionar a segurança do celular. Tente novamente.'
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Automatically trigger native prompt once on mount for seamless banking-app UX
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDeviceUnlock();
    }, 450);

    return () => {
      clearTimeout(timer);
      WebAuthnService.cancelPendingAuth();
    };
  }, []);

  // Emergency unlock using active Google Auth session
  const handleGoogleSessionUnlock = async () => {
    setIsGoogleUnlocking(true);
    setErrorMessage(null);
    triggerHaptic('medium');

    try {
      const isValidSession = await authService.verifyActiveSessionToken(true);
      if (isValidSession) {
        triggerHaptic('success');
        WebAuthnService.setSessionUnlocked(true);
        sessionStorage.removeItem('cofre_last_background_ts');
        onUnlock();
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-6 bg-[#F4F6FB] overflow-y-auto"
      id="screen-app-lock"
    >
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#0052FF_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

      {/* Top Bar */}
      <div className="w-full max-w-sm flex items-center justify-between relative z-10 pt-1">
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
      <div className="w-full max-w-sm flex flex-col items-center text-center relative z-10 my-auto py-6">
        {/* Avatar & Lock Badge */}
        <div className="relative mb-3.5">
          <div className="w-20 h-20 rounded-full border-3 border-black overflow-hidden bg-white shadow-neo mx-auto">
            <img
              src={user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=CofreMaster'}
              alt={user.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#B8F256] border-2 border-black flex items-center justify-center shadow-neo-xs">
            <Lock className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          </div>
        </div>

        <h2 className="font-['Outfit'] font-black text-xl text-black tracking-tight mb-0.5">
          {user.name || (isEn ? 'My Vault' : 'Meu Cofre')}
        </h2>
        <p className="text-xs text-neutral-500 font-medium mb-6">
          {isEn
            ? 'Biometrics or PIN'
            : 'Biometria ou PIN'}
        </p>

        {/* Error Alert if any */}
        {errorMessage && (
          <div
            className="w-full mb-3 p-3 bg-rose-50 border-2 border-black rounded-xl text-xs font-bold text-rose-950 flex items-start gap-2 shadow-neo-xs animate-in fade-in text-left"
            id="app-lock-error-alert"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-tight">
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Primary Unlock Action */}
        <button
          type="button"
          onClick={handleDeviceUnlock}
          disabled={isAuthenticating}
          className={`w-full py-3.5 px-4 bg-[#0052FF] hover:bg-[#0045D8] text-white border-3 border-black rounded-2xl font-['Outfit'] font-black text-sm shadow-neo btn-press flex items-center justify-center gap-2.5 cursor-pointer transition-all ${
            isAuthenticating ? 'opacity-80 scale-[0.99]' : ''
          }`}
          id="btn-unlock-device-security"
        >
          {isAuthenticating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>{isEn ? 'Waiting for device...' : 'Aguardando aparelho...'}</span>
            </>
          ) : (
            <>
              <Fingerprint className="w-5 h-5 text-[#B8F256]" />
              <span>{isEn ? 'Unlock' : 'Desbloquear'}</span>
            </>
          )}
        </button>

        {/* Fallback Option */}
        <div className="mt-5 pt-3 border-t border-black/10 w-full flex flex-col items-center gap-2">
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
      <div className="w-full max-w-sm flex items-center justify-center relative z-10 pb-1">
        <p className="text-[10px] text-neutral-400 font-mono font-medium">
          {isEn ? 'CofreAdmin • Security' : 'CofreAdmin • Segurança'}
        </p>
      </div>
    </div>
  );
};
