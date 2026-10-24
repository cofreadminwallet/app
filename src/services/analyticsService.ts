/**
 * Google Analytics 4 (GA4) Service for CofreAdmin
 *
 * Stream Configuration:
 * Nome: CofreAdmin Fluxo
 * URL: https://cofreadmin.gfin.app
 * Stream ID: 15792783568
 * Measurement ID: G-8XNZBW7NTB
 */

export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-8XNZBW7NTB';
export const GA_STREAM_ID = import.meta.env.VITE_GA_STREAM_ID || '15792783568';
export const GA_STREAM_URL = import.meta.env.VITE_APP_URL || 'https://cofreadmin.gfin.app';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export class AnalyticsService {
  /**
   * Safe helper to invoke gtag
   */
  private static send(command: string, ...args: any[]) {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      try {
        window.gtag(command, ...args);
      } catch (err) {
        console.debug('[GA4] Falha ao enviar evento:', err);
      }
    }
  }

  /**
   * Track screen / tab view
   */
  public static trackScreenView(screenName: string) {
    this.send('event', 'screen_view', {
      app_name: 'CofreAdmin',
      screen_name: screenName,
    });
  }

  /**
   * Tracks a generic custom event
   */
  public static trackEvent(eventName: string, params: Record<string, any> = {}) {
    this.send('event', eventName, {
      app_name: 'CofreAdmin',
      ...params,
    });
  }

  /**
   * Track PWA installation event
   */
  public static trackPWAInstall(platform: string = 'web') {
    this.send('event', 'pwa_install', {
      app_name: 'CofreAdmin',
      install_source: platform,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Identifies if user is running as installed standalone PWA or web browser
   */
  public static trackAppOpen(appVersion: string) {
    const isStandalone = 
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
       (window.navigator as any).standalone === true);

    const displayMode = isStandalone ? 'standalone_pwa' : 'browser_tab';

    // Set user property in GA4
    this.send('set', 'user_properties', {
      app_mode: displayMode,
      app_version: appVersion,
    });

    // Sends application startup event
    this.send('event', 'app_start', {
      app_name: 'CofreAdmin',
      app_version: appVersion,
      display_mode: displayMode,
      is_standalone: isStandalone,
    });
  }

  /**
   * Track user sign-in event
   */
  public static trackLogin(method: string) {
    this.send('event', 'login', {
      method,
    });
  }
}
