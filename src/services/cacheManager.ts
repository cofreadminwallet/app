import { APP_VERSION_LABEL } from '../config/version';
import { NotificationService } from './notificationService';

const VERSION_STORAGE_KEY = 'cofreadmin_installed_app_version';
const LAST_CACHE_PURGE_KEY = 'cofreadmin_last_cache_purge';

export const CacheManager = {
  /**
   * Initializes automatic cache lifecycle management:
   * 1. Detects if the app has been updated to a new version.
   * 2. Automatically purges all obsolete caches from the browser/device without user intervention.
   * 3. Unsubscribes any leftover ghost PushManager subscriptions.
   * 4. Listens for runtime Service Worker updates.
   * 5. Catches chunk loading errors (caused by new deployments) and recovers automatically.
   */
  init(): void {
    if (typeof window === 'undefined') return;

    this.checkVersionAndPurgeStaleCache();
    this.setupChunkErrorRecovery();
    this.setupServiceWorkerAutoUpdate();
  },

  /**
   * Compares currently installed version with stored version.
   * If a new version is detected, automatically clears all browser caches
   * so that no trace of removed code remains on the user's phone.
   */
  async checkVersionAndPurgeStaleCache(): Promise<void> {
    try {
      const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
      const isNewVersion = storedVersion !== APP_VERSION_LABEL;

      if (isNewVersion) {
        console.log(
          `[CacheManager] Nova versão detectada (${APP_VERSION_LABEL} vs ${storedVersion || 'nenhuma'}). Limpando cache do aparelho automaticamente...`
        );

        // 1. Purge all CacheStorage buckets
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          if (cacheKeys.length > 0) {
            await Promise.all(cacheKeys.map((key) => caches.delete(key)));
            console.log(`[CacheManager] Caches do aparelho deletados automaticamente: ${cacheKeys.length}`);
          }
        }

        // 2. Unsubscribe ghost push subscriptions
        await NotificationService.cleanupLegacyPushSubscriptions();

        // 3. Update version marker
        localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION_LABEL);
        localStorage.setItem(LAST_CACHE_PURGE_KEY, Date.now().toString());
      }
    } catch (err) {
      console.warn('[CacheManager] Erro durante verificação automática de versão:', err);
    }
  },

  /**
   * Auto-recovery for dynamic import / chunk load failures.
   * When an app is updated, old bundle filenames on the server are removed.
   * If a running client tries to lazy-load an old chunk, this catches it,
   * purges cache, and performs a clean reload so the user never gets an error screen.
   */
  setupChunkErrorRecovery(): void {
    window.addEventListener('error', (event) => {
      const msg = event.message || '';
      if (
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('chunk') ||
        msg.includes('Loading chunk')
      ) {
        const lastPurge = parseInt(sessionStorage.getItem('cofreadmin_chunk_reload') || '0', 10);
        // Throttle reload to at most once per 30 seconds to prevent infinite reload loops
        if (Date.now() - lastPurge > 30000) {
          console.warn('[CacheManager] Chunk antigo detectado após atualização. Limpando cache e recarregando...');
          sessionStorage.setItem('cofreadmin_chunk_reload', Date.now().toString());
          const reload = () => {
            window.location.reload();
          };

          if (typeof window !== 'undefined' && 'caches' in window) {
            window.caches.keys().then((keys) => Promise.all(keys.map((k) => window.caches.delete(k)))).then(reload);
          } else {
            reload();
          }
        }
      }
    });
  },

  /**
   * Registers and monitors the Service Worker to update and activate immediately.
   */
  setupServiceWorkerAutoUpdate(): void {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Immediately check for updates
          registration.update();

          // Listen for update found
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[CacheManager] Nova versão instalada em segundo plano.');
                // Trigger live update alert
                import('./appUpdateService').then(({ appUpdateService }) => {
                  appUpdateService.checkForUpdate();
                });
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[CacheManager] Falha ao registrar Service Worker:', err);
        });

      // Cleanup stray push subscriptions on load
      NotificationService.cleanupLegacyPushSubscriptions();
    });

    // When the new Service Worker activates and takes control:
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[CacheManager] Novo Service Worker assumiu o controle. Cache sincronizado.');
    });
  },
};
