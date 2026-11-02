/**
 * Automatic PWA & App Update Manager.
 * Detects new server releases and applies updates, cache purging,
 * and seamless refresh automatically in the background without requiring user clicks.
 */
import { APP_VERSION } from '../config/version';

class AppUpdateService {
  private latestVersion: string = APP_VERSION;
  private intervalId: number | null = null;
  private isChecking = false;
  private isApplyingUpdate = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // 1. Initial check shortly after load
    setTimeout(() => {
      this.checkForUpdate();
    }, 2500);

    // 2. Periodic background check every 45 seconds while app is active
    this.intervalId = window.setInterval(() => {
      this.checkForUpdate();
    }, 45000);

    // 3. Check whenever the user returns to the app (PWA resume / window focus / tab switch)
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdate();
      }
    });

    window.addEventListener('focus', () => {
      this.checkForUpdate();
    });

    // 4. Listen for Service Worker updatefound event and auto-apply when ready
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[AppUpdate] Novo Service Worker instalado. Aplicando atualização automaticamente...');
                this.applyUpdateAndReload();
              }
            });
          }
        });
      });
    }
  }

  /**
   * Queries /api/version to detect if the deployed version differs from running version.
   * If a new version is detected, it immediately initiates the automated update procedure.
   */
  public async checkForUpdate(): Promise<boolean> {
    if (this.isChecking || this.isApplyingUpdate || typeof window === 'undefined') return false;
    this.isChecking = true;

    try {
      const response = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) return false;

      const data = await response.json();
      const serverVersion = (data.version || '').trim();

      if (serverVersion && serverVersion !== APP_VERSION) {
        console.log(`[AppUpdate] 🚀 Nova versão detectada: ${serverVersion} (atual: ${APP_VERSION}). Executando atualização automática...`);
        this.latestVersion = serverVersion;
        // Automatically apply update and reload without requiring user button press
        await this.applyUpdateAndReload();
        return true;
      }
    } catch {
      // Offline mode or network fluctuation - silently continue
    } finally {
      this.isChecking = false;
    }

    return false;
  }

  /**
   * Automated update procedure:
   * 1. Signals the new Service Worker to skipWaiting immediately
   * 2. Clears all stale CacheStorage buckets
   * 3. Sets session timestamp to prevent refresh loops
   * 4. Reloads the application cleanly with the new assets
   */
  public async applyUpdateAndReload(): Promise<void> {
    if (this.isApplyingUpdate || typeof window === 'undefined') return;

    // Prevent rapid refresh loops if server version mismatch persists during cold start
    const lastReload = parseInt(sessionStorage.getItem('cofreadmin_version_reload_ts') || '0', 10);
    if (Date.now() - lastReload < 10000) {
      console.warn('[AppUpdate] Recarregamento ignorado para evitar loops.');
      return;
    }
    sessionStorage.setItem('cofreadmin_version_reload_ts', Date.now().toString());

    this.isApplyingUpdate = true;

    console.log('[AppUpdate] Limpando caches e atualizando o app automaticamente...');

    try {
      // 1. Tell waiting service worker to skip waiting
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await registration.update();
        }
      }

      // 2. Purge browser CacheStorage
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      console.warn('[AppUpdate] Aviso na limpeza de caches:', e);
    }

    // 3. Smooth, clean reload with timestamp query param to guarantee fresh index.html
    const cleanUrl = window.location.pathname + '?_v=' + Date.now();
    window.location.replace(cleanUrl);
  }

  public getLatestVersion(): string {
    return this.latestVersion;
  }
}

export const appUpdateService = new AppUpdateService();
