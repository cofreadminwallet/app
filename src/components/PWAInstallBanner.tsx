import React, { useState } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, HelpCircle, Laptop } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { triggerHaptic } from '../utils/haptics';
import { useI18n } from '../services/i18nService';

export const PWAInstallBanner: React.FC = () => {
  const { isInstalled, isIOS, hasNativePrompt, promptInstall } = usePWAInstall();
  const { language } = useI18n();
  const isEn = language === 'en-US';
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    }
    return false;
  });
  const [showGuide, setShowGuide] = useState(false);

  // If already running standalone (installed) or dismissed in this browser session, don't show
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    } catch {}
  };

  const handleInstallClick = async () => {
    triggerHaptic('medium');
    if (isIOS) {
      setShowGuide((prev) => !prev);
      return;
    }

    const result = await promptInstall();
    if (result.requiresGuide) {
      setShowGuide(true);
    }
  };

  return (
    <div 
      className="mx-3 mt-2 mb-2 p-3 bg-amber-300 border-2 border-black rounded-2xl shadow-neo text-black relative select-none animate-in fade-in slide-in-from-top-2 duration-200"
      id="pwa-install-banner"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0 border border-black shadow-neo-xs">
            <Smartphone className="w-5 h-5 text-[#B8F256]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-['Outfit'] font-black text-xs uppercase tracking-wider text-black">
                {isEn ? 'Installable Web App' : 'Web App Instalável'}
              </span>
              <span className="bg-black text-[#B8F256] text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-neutral-800 font-medium truncate">
              {isEn ? 'Install to Home Screen for offline and full screen' : 'Instale na Tela de Início para acesso offline e tela cheia'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-black text-[#B8F256] hover:bg-neutral-800 font-['Outfit'] font-black text-xs rounded-xl border border-black flex items-center gap-1 shadow-neo-xs btn-press cursor-pointer transition-colors"
            id="pwa-banner-install-btn"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isEn ? 'Install' : 'Instalar'}</span>
          </button>
          <button
            onClick={handleDismiss}
            aria-label={isEn ? 'Dismiss banner' : 'Fechar aviso'}
            className="p-1.5 hover:bg-black/10 rounded-lg text-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Guided Steps if prompt is not triggered natively or on iOS/Safari */}
      {showGuide && (
        <div className="mt-3 pt-3 border-t-2 border-black/20 text-[11px] text-neutral-900 space-y-1.5 animate-in fade-in duration-200">
          {isIOS ? (
            <>
              <p className="font-bold flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-neutral-900" />
                {isEn ? 'How to install on Safari (iPhone/iPad):' : 'Como instalar no Safari do iPhone/iPad:'}
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] font-medium text-neutral-800">
                {isEn ? (
                  <>
                    <li>Tap the <strong>Share</strong> button (box with upward arrow) in Safari.</li>
                    <li>Scroll and select <strong>Add to Home Screen</strong> (icon <PlusSquare className="w-3 h-3 inline text-black" />).</li>
                    <li>Tap <strong>Add</strong> in the top corner.</li>
                  </>
                ) : (
                  <>
                    <li>Toque no botão de <strong>Compartilhar</strong> (quadrado com seta para cima) no Safari.</li>
                    <li>Role as opções e selecione <strong>Adicionar à Tela de Início</strong> (ícone <PlusSquare className="w-3 h-3 inline text-black" />).</li>
                    <li>Toque em <strong>Adicionar</strong> no canto superior.</li>
                  </>
                )}
              </ol>
            </>
          ) : (
            <>
              <p className="font-bold flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-neutral-900" />
                {isEn ? 'How to install on Chrome / Edge / Browser:' : 'Como instalar no Chrome / Edge / Navegador:'}
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] font-medium text-neutral-800">
                {isEn ? (
                  <>
                    <li>Tap the <strong>3 dots (Menu ⋮)</strong> of your browser at the top right.</li>
                    <li>Select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.</li>
                    <li>Done! CofreAdmin will open in full-screen standalone mode.</li>
                  </>
                ) : (
                  <>
                    <li>Toque nos <strong>3 pontinhos (Menu ⋮)</strong> do navegador no canto superior direito.</li>
                    <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                    <li>Pronto! O CofreAdmin abrirá como app nativo em tela inteira.</li>
                  </>
                )}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
};
