// CofreAdmin - Service Worker (Google PWA, Cache Buster & Push Guard)
const CACHE_NAME = 'cofreadmin-cache-v23';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-maskable.svg'
];

// Install Event: Take over immediately without waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
});

// Activate Event: Purge ALL old caches & cancel any stray/ghost PushManager subscriptions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 1. Delete all old caches from prior versions to remove any stale vestige
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[SW] Purgando cache antigo obsoleto:', key);
              return caches.delete(key);
            }
          })
        );
      }),
      // 2. Unsubscribe any residual external push subscription from the browser
      self.registration.pushManager?.getSubscription?.().then((sub) => {
        if (sub) {
          console.log('[SW] Cancelando inscrição push residual do PushManager:', sub.endpoint);
          return sub.unsubscribe();
        }
      }).catch((err) => {
        console.warn('[SW] Aviso push residual:', err);
      }),
    ]).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-First for HTML/Scripts so updates are immediately visible without stale residue
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Skip APIs, external scripts, and dev server internal requests
  if (
    url.origin.includes('googlesyndication.com') ||
    url.origin.includes('adservice.google.com') ||
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('identitytoolkit') ||
    url.origin.includes('securetoken') ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('google.com') ||
    url.origin.includes('gstatic.com') ||
    url.origin.includes('firebaseapp.com') ||
    url.origin.includes('base.org') ||
    url.origin.includes('blockscout.com') ||
    url.origin.includes('basescan.org') ||
    url.origin.includes('dicebear.com') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/__/') ||
    url.pathname.includes('@vite') ||
    url.pathname.includes('@fs') ||
    url.pathname.includes('@id')
  ) {
    return;
  }

  // Handle SPA Navigation requests: Network-First (always fresh HTML when online)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Network-first for JavaScript and CSS bundles to avoid stale code
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Handle Static Assets (Images, Icons): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// ============================================================================
// Web Push Notifications & Native System Alerts (Strict Security Guard)
// ============================================================================

// 1. Listen for background Web Push events:
// CRITICAL: NEVER show fake, generic, or phantom "Nova movimentação" alerts!
self.addEventListener('push', (event) => {
  if (!event || !event.data) {
    console.log('[SW] Push ignorado: evento vazio ou keep-alive de rede.');
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

  // If there is no explicit real title and body, discard silently.
  if (!data || !data.title || !data.body) {
    console.log('[SW] Push descartado: sem dados legítimos.');
    return;
  }

  // Drop generic ghost messages
  const lowerBody = data.body.toLowerCase();
  if (lowerBody.includes('nova movimentação na sua carteira') || lowerBody === 'nova movimentação.') {
    console.log('[SW] Push descartado: mensagem genérica detectada sem transação associada.');
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
      tab: data.tab || 'home'
    },
    actions: data.actions || [
      { action: 'open', title: 'Abrir App' }
    ],
    tag: data.tag || `cofre-${Date.now()}`,
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Notification Click Handler: focuses existing client or opens app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

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

// 3. Message handler: Allow frontend to request native notification display via SW or purge caches
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
      ...options
    };
    self.registration.showNotification(title, defaultOptions);
  }

  if (event.data.type === 'PURGE_ALL_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      event.ports?.[0]?.postMessage({ success: true });
    });
  }
});
