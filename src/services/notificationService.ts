import { triggerHaptic } from '../utils/haptics';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  vibrate?: number[];
}

export const NotificationService = {
  /**
   * Checks if native notifications and Service Workers are supported in the current environment
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
  },

  /**
   * Returns current browser notification permission status: 'default' | 'granted' | 'denied'
   */
  getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  },

  /**
   * Requests user permission for native Web Push notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        triggerHaptic('success');
      } else {
        triggerHaptic('warning');
      }
      return permission;
    } catch (e) {
      console.warn('[NotificationService] Error requesting notification permission:', e);
      return 'denied';
    }
  },

  /**
   * Displays a native system notification via the Service Worker (or fallback to Notification constructor)
   */
  async showNotification(title: string, options: NotificationOptions = {}): Promise<boolean> {
    if (!this.isSupported()) return false;

    if (Notification.permission !== 'granted') {
      const perm = await this.requestPermission();
      if (perm !== 'granted') return false;
    }

    const defaultOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
      icon: '/icon-192.png',
      badge: '/favicon.svg',
      tag: 'cofreadmin-alert',
      renotify: true,
      ...options,
    };

    // 1. Preferred method: Dispatch through active ServiceWorkerRegistration (ensures background display)
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(title, defaultOptions);
          return true;
        }

        // Alternative: post message to controller
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            options: defaultOptions,
          });
          return true;
        }
      }
    } catch (swErr) {
      console.warn('[NotificationService] SW notification failed, falling back to Notification constructor:', swErr);
    }

    // 2. Direct Window Notification fallback
    try {
      new Notification(title, defaultOptions);
      return true;
    } catch (notifErr) {
      console.warn('[NotificationService] Window Notification error:', notifErr);
      return false;
    }
  },

  /**
   * Notifies user when a payment is received on Base L2
   */
  async notifyPaymentReceived({
    amount,
    tokenSymbol = 'USDC',
    fromAddress,
    txHash,
  }: {
    amount: number;
    tokenSymbol?: string;
    fromAddress?: string;
    txHash?: string;
  }): Promise<boolean> {
    const formattedAmount = `$${amount.toFixed(2)} ${tokenSymbol}`;
    const fromTruncated = fromAddress
      ? ` de ${fromAddress.slice(0, 6)}...${fromAddress.slice(-4)}`
      : '';

    return this.showNotification(`💰 Pagamento Recebido!`, {
      body: `Você acabou de receber +${formattedAmount}${fromTruncated} na Base L2.`,
      tag: `receive-${txHash || Date.now()}`,
      data: {
        url: '/?tab=transactions',
        tab: 'transactions',
        txHash,
      },
    });
  },

  /**
   * Notifies user when a payment was broadcasted and confirmed
   */
  async notifyPaymentSent({
    amount,
    tokenSymbol = 'USDC',
    toAddress,
    txHash,
  }: {
    amount: number;
    tokenSymbol?: string;
    toAddress?: string;
    txHash?: string;
  }): Promise<boolean> {
    const formattedAmount = `$${amount.toFixed(2)} ${tokenSymbol}`;
    const toTruncated = toAddress
      ? ` para ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`
      : '';

    return this.showNotification(`💸 Pagamento Enviado`, {
      body: `Transferência de -${formattedAmount}${toTruncated} liquidada com sucesso na Base.`,
      tag: `send-${txHash || Date.now()}`,
      data: {
        url: '/?tab=transactions',
        tab: 'transactions',
        txHash,
      },
    });
  },

  /**
   * Notifies user when a Vault reaches a target milestone (50%, 75%, 100%)
   */
  async notifyVaultMilestone({
    vaultTitle,
    currentAmount,
    targetAmount,
    percent,
    emoji = '🎯',
  }: {
    vaultTitle: string;
    currentAmount: number;
    targetAmount: number;
    percent: number;
    emoji?: string;
  }): Promise<boolean> {
    const isCompleted = percent >= 100;
    const title = isCompleted
      ? `${emoji} Meta Atingida no Cofre!`
      : `${emoji} Marco de Economia: ${percent}%!`;

    const body = isCompleted
      ? `Parabéns! O seu cofre "${vaultTitle}" completou 100% da meta ($${currentAmount.toFixed(2)}).`
      : `Seu cofre "${vaultTitle}" já atingiu ${percent}% da meta ($${currentAmount.toFixed(2)} de $${targetAmount.toFixed(2)}).`;

    return this.showNotification(title, {
      body,
      tag: `vault-milestone-${vaultTitle}`,
      data: {
        url: '/?tab=vaults',
        tab: 'vaults',
      },
    });
  },

  /**
   * Sends a test notification to verify device sound, banner, and permissions
   */
  async notifyTest(): Promise<boolean> {
    triggerHaptic('success');
    return this.showNotification('🔔 CofreAdmin • Notificações Ativas!', {
      body: 'Seu dispositivo agora recebe avisos em tempo real de pagamentos em USDC e metas dos seus cofres.',
      tag: 'test-notification',
      data: {
        url: '/',
        tab: 'home',
      },
    });
  },

  /**
   * Unsubscribes any stray background push subscriptions from PushManager to ensure
   * external servers or old test endpoints can NEVER send unsolicited phantom push notifications.
   */
  async cleanupLegacyPushSubscriptions(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.pushManager) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          console.log('[NotificationService] Cancelando inscrição push residual do navegador:', sub.endpoint);
          await sub.unsubscribe();
        }
      }
    } catch (e) {
      console.warn('[NotificationService] Aviso ao verificar push residual:', e);
    }
  },

  /**
   * Deep Purge: Clears all caches, unregisters old service workers, cleans push subscriptions
   * and refreshes the page so no trace of old code remains on the mobile device.
   */
  async purgeDeviceCacheAndReload(): Promise<void> {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map(async (r) => {
            const sub = await r.pushManager?.getSubscription?.();
            if (sub) await sub.unsubscribe();
            await r.unregister();
          })
        );
      }
    } catch (err) {
      console.warn('Erro durante limpeza de cache profundo:', err);
    }
    // Hard reload
    window.location.reload();
  },
};
