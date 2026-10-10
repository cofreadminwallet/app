import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CacheManager } from './services/cacheManager';
import './index.css';

// Initialize automatic cache lifecycle & cleanup on startup
CacheManager.init();

// Intercept and suppress benign external/network errors and unhandled synthetic events (e.g., {"isTrusted":false})
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : (reason?.message || '');
    if (
      !event.isTrusted ||
      !reason ||
      msg.includes('Pending promise was never set') ||
      (msg.includes('INTERNAL ASSERTION FAILED') && msg.includes('auth')) ||
      msg.includes('hypelab') ||
      msg.includes('Failed to fetch')
    ) {
      console.warn('[CofreAdmin] Intercepted benign unhandled rejection:', reason || 'untrusted synthetic rejection');
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || event.error?.message || '';
    if (
      !event.isTrusted ||
      msg.includes('Pending promise was never set') ||
      (msg.includes('INTERNAL ASSERTION FAILED') && msg.includes('auth')) ||
      msg.includes('hypelab') ||
      msg.includes('Script error')
    ) {
      console.warn('[CofreAdmin] Intercepted benign window error:', msg || 'untrusted synthetic event');
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  (window as any).__APP_MOUNTED__ = true;
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
