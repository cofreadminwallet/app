import { useState, useEffect, useCallback } from 'react';
import { AnalyticsService } from '../services/analyticsService';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__deferredPwaPrompt) {
      return window.__deferredPwaPrompt;
    }
    return null;
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  });

  const [isIOS, setIsIOS] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    return isIOSDevice && !isStandalone;
  });

  // isInstallable is TRUE instantly whenever the user is visiting from a browser (not installed yet)
  const [isInstallable, setIsInstallable] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    return !isStandalone;
  });

  useEffect(() => {
    // Check standalone mode dynamically
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
      setIsInstallable(!isStandalone);
    };

    checkStandalone();

    // Check if early prompt was already captured
    if (window.__deferredPwaPrompt) {
      setDeferredPrompt(window.__deferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    const handleEarlyPromptReady = () => {
      if (window.__deferredPwaPrompt) {
        setDeferredPrompt(window.__deferredPwaPrompt);
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      window.__deferredPwaPrompt = null;
      AnalyticsService.trackPWAInstall('browser_prompt');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('cofre_pwa_ready', handleEarlyPromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('cofre_pwa_ready', handleEarlyPromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<{ success: boolean; requiresGuide: boolean }> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__deferredPwaPrompt : null);

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') window.__deferredPwaPrompt = null;
          AnalyticsService.trackPWAInstall('in_app_button');
          return { success: true, requiresGuide: false };
        }
        return { success: false, requiresGuide: false };
      } catch (err) {
        console.warn('[PWA] Erro ao abrir prompt nativo, abrindo guia:', err);
        return { success: false, requiresGuide: true };
      }
    }

    // If native prompt is not yet ready on browser or unsupported platform, guide user
    return { success: false, requiresGuide: true };
  }, [deferredPrompt]);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    promptInstall,
    hasNativePrompt: Boolean(deferredPrompt || (typeof window !== 'undefined' && window.__deferredPwaPrompt)),
  };
}
