import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  // Automatic support for native FIREBASE_WEBAPP_CONFIG in Firebase App Hosting at build time
  let webappConfig: Record<string, string> = {};
  if (process.env.FIREBASE_WEBAPP_CONFIG) {
    try {
      webappConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    } catch (e) {
      console.warn('[Vite Build] Aviso ao analisar FIREBASE_WEBAPP_CONFIG:', e);
    }
  }

  const resolveFirebaseEnv = (viteKey: string, configKey: string, defaultVal = ''): string => {
    return process.env[viteKey] || webappConfig[configKey] || defaultVal;
  };

  return {
    plugins: [react(), tailwindcss()],
    define: {
      ...(resolveFirebaseEnv('VITE_FIREBASE_API_KEY', 'apiKey')
        ? { 'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(resolveFirebaseEnv('VITE_FIREBASE_API_KEY', 'apiKey')) }
        : {}),
      ...(resolveFirebaseEnv('VITE_FIREBASE_AUTH_DOMAIN', 'authDomain')
        ? { 'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(resolveFirebaseEnv('VITE_FIREBASE_AUTH_DOMAIN', 'authDomain')) }
        : {}),
      ...(resolveFirebaseEnv('VITE_FIREBASE_PROJECT_ID', 'projectId')
        ? { 'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(resolveFirebaseEnv('VITE_FIREBASE_PROJECT_ID', 'projectId')) }
        : {}),
      ...(resolveFirebaseEnv('VITE_FIREBASE_STORAGE_BUCKET', 'storageBucket')
        ? { 'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(resolveFirebaseEnv('VITE_FIREBASE_STORAGE_BUCKET', 'storageBucket')) }
        : {}),
      ...(resolveFirebaseEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId')
        ? { 'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(resolveFirebaseEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId')) }
        : {}),
      ...(resolveFirebaseEnv('VITE_FIREBASE_APP_ID', 'appId')
        ? { 'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(resolveFirebaseEnv('VITE_FIREBASE_APP_ID', 'appId')) }
        : {}),
      ...(resolveFirebaseEnv('VITE_FIREBASE_DATABASE_ID', 'firestoreDatabaseId')
        ? { 'import.meta.env.VITE_FIREBASE_DATABASE_ID': JSON.stringify(resolveFirebaseEnv('VITE_FIREBASE_DATABASE_ID', 'firestoreDatabaseId', '(default)')) }
        : {}),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    cacheDir: 'node_modules/.vite_cofre_v26',
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom/client',
        'viem',
        'viem/accounts',
        'viem/chains',
        'lucide-react',
        'motion/react',
        'canvas-confetti',
        'qrcode',
      ],
    },
    server: {
      // HMR is disabled via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.relayer_key'],
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'es2022',
      minify: 'esbuild',
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) {
                return 'vendor-pdf';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('viem')) {
                return 'vendor-web3';
              }
              if (id.includes('motion')) {
                return 'vendor-animation';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
            }
          },
        },
      },
    },
  };
});
