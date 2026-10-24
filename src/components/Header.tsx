import React from 'react';
import { UserProfile } from '../types';
import { Settings, LogOut, Share2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { APP_VERSION_LABEL } from '../config/version';
import { db } from '../services';
import { useI18n } from '../hooks/useI18n';

interface HeaderProps {
  user: UserProfile;
  onOpenProfile: () => void;
  onOpenVaults: () => void;
  onLogout?: () => void;
  onShare?: () => void;
  syncStatus?: 'syncing' | 'synced' | 'offline' | 'error';
}

export const Header: React.FC<HeaderProps> = React.memo(({ 
  user, 
  onOpenProfile, 
  onLogout,
  onShare,
  syncStatus = 'synced',
}) => {
  const { t, language } = useI18n();
  // Online/Offline detection - persistent indicator (ON / OFF)
  const [isOnline, setIsOnline] = React.useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isConnected = isOnline && syncStatus !== 'offline';

  return (
    <header className="w-full max-w-full flex items-center justify-between p-3 sm:p-4 bg-white border-b-2 border-black sticky top-0 z-30 pt-safe gap-2">
      {/* Left: Avatar & Greeting */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenProfile();
          }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-black bg-[#E0F2FE] flex items-center justify-center overflow-hidden shadow-neo-xs hover:scale-105 transition-transform flex-shrink-0 cursor-pointer"
          id="user-profile-header-button"
          aria-label="Abrir perfil e configurações de usuário"
        >
          <img 
            src={user.avatarUrl || db.getCustomAvatar() || 'https://api.dicebear.com/7.x/bottts/svg?seed=BaseCofre'} 
            alt={user.name} 
            className="w-full h-full object-cover rounded-full bg-[#B8F256]"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=BaseCofre';
            }}
          />
        </button>

        <div className="min-w-0 flex-1">
          {/* Informational badges row - PURE INFO, NOT A LINK */}
          <div className="flex items-center gap-1.5 flex-wrap cursor-default select-none pointer-events-auto">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono-code leading-none">
              CofreAdmin
            </span>

            {/* Connection status and guest mode */}
            {user.isGuest ? (
              <span 
                className="text-[8px] sm:text-[9px] font-black font-mono-code px-1.5 py-0.5 rounded border border-amber-600 bg-amber-100 text-amber-950 flex items-center gap-1 whitespace-nowrap cursor-default shadow-neo-xs"
                title="Offline"
                id="header-guest-badge"
              >
                <span>🔒 OFFLINE</span>
              </span>
            ) : isConnected ? (
              <span 
                className="text-[8px] sm:text-[9px] font-bold font-mono-code px-1.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-center gap-1 whitespace-nowrap cursor-default"
                title="Online"
                id="header-connection-status"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>ON</span>
              </span>
            ) : (
              <span 
                className="text-[8px] sm:text-[9px] font-bold font-mono-code px-1.5 py-0.5 rounded border border-rose-300 bg-rose-50 text-rose-800 flex items-center gap-1 whitespace-nowrap cursor-default"
                title="Offline"
                id="header-connection-status"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                <span>OFF</span>
              </span>
            )}

            {!user.isGuest && (
              <span 
                className="text-[8px] sm:text-[9px] font-bold font-mono-code px-1.5 py-0.5 rounded border border-black/20 bg-[#EDE9FE] text-purple-900 flex items-center whitespace-nowrap cursor-default"
                title={language === 'en-US' ? "Version" : "Versão"}
                id="header-version-badge"
              >
                {APP_VERSION_LABEL}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenProfile();
            }}
            className="font-['Outfit'] font-black text-sm sm:text-base text-black leading-tight tracking-tight truncate mt-0.5 block text-left hover:underline cursor-pointer"
            title={language === 'en-US' ? "Profile" : "Perfil"}
          >
            {language === 'pt-BR' ? `Olá, ${user.name.split(' ')[0]}` : `Hey, ${user.name.split(' ')[0]}`}
          </button>
        </div>
      </div>

      {/* Right: Actions (Share, Settings, Logout) */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Quick Share Button (Only icon, no text) */}
        {onShare && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onShare();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 border-black bg-white flex items-center justify-center shadow-neo-xs btn-press hover:bg-neutral-100 flex-shrink-0 text-black cursor-pointer"
            title={language === 'en-US' ? "Share" : "Compartilhar"}
            id="quick-share-btn"
            aria-label={language === 'en-US' ? "Share" : "Compartilhar"}
          >
            <Share2 className="w-4 h-4 text-black" />
          </button>
        )}

        {/* Profile / Settings Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenProfile();
          }}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 border-black bg-white flex items-center justify-center shadow-neo-xs btn-press hover:bg-neutral-100 flex-shrink-0 cursor-pointer"
          title={language === 'en-US' ? "Settings" : "Ajustes"}
          id="quick-settings-btn"
          aria-label={language === 'en-US' ? "Settings" : "Ajustes"}
        >
          <Settings className="w-4 h-4 text-black" />
        </button>

        {/* Quick Logout / Exit Button */}
        {onLogout && (
          <button
            onClick={() => {
              triggerHaptic('medium');
              onLogout();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 border-black bg-[#FFE4E6] hover:bg-[#FECDD3] flex items-center justify-center shadow-neo-xs btn-press flex-shrink-0 text-rose-900"
            title={language === 'en-US' ? "Logout" : "Sair"}
            id="quick-logout-btn"
            aria-label={language === 'en-US' ? "Logout" : "Sair"}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
});
