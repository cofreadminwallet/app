// CofreAdmin - Service Worker (Google PWA & Push Notification Guard)
// Network-only pass-through for HTML/JS/CSS to prevent stale bundle trapping.
const CACHE_NAME = 'cofreadmin-cache-v26';

// Install Event: Take over immediately and clear any legacy caches
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
});

// Activate Event: Purge ALL caches & cancel any stray PushManager subscriptions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            console.log('[SW] Purgando cache obsoleto:', key);
            return caches.delete(key);
          })
        )
      ),
      self.registration.pushManager
        ?.getSubscription?.()
        .then((sub) => {
          if (sub) {
            return sub.unsubscribe();
          }
        })
        .catch(() => {}),
    ]).then(() => self.clients.claim())
  );
});

// Fetch Event: Pure pass-through to network so the Service Worker never serves stale HTML or JS modules
self.addEventListener('fetch', () => {
  return;
});

// ============================================================================
// Web Push Notifications & Native System Alerts (Strict Security Guard)
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event || !event.data) {
    return;
  }

  let data = null;
  try {
    data = event.data.json();
  } catch (e) {
    const text = event.data.text();
    if (text && text.trim().length > 0 && !text.toLowerCase().includes('ping')) {
      data = { title: 'CofreAdmin', body: text };
    }
  }

  if (!data || !data.title || !data.body) {
    return;
  }

  const lowerBody = data.body.toLowerCase();
  if (lowerBody.includes('nova movimentação na sua carteira') || lowerBody === 'nova movimentação.') {
    return;
  }

  const title = data.title;
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon.svg',
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
      tab: data.tab || 'home',
    },
    actions: data.actions || [{ action: 'open', title: 'Abrir App' }],
    tag: data.tag || `cofre-${Date.now()}`,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (event.notification.data && event.notification.data.tab) {
            client.postMessage({ type: 'NAVIGATE_TAB', tab: event.notification.data.tab });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const defaultOptions = {
      icon: '/icon-192.png',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      tag: 'cofreadmin-alert',
      renotify: true,
      ...options,
    };
    self.registration.showNotification(title, defaultOptions);
  }

  if (event.data.type === 'PURGE_ALL_CACHE') {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => {
        event.ports?.[0]?.postMessage({ success: true });
      });
  }
});
