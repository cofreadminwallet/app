import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel
} from 'firebase/firestore';
// Configure Firestore log level to 'error' to avoid benign warnings about clock skew / future timestamps in iframe/container
setLogLevel('error');

// Safely load local file config if present (e.g. in development/studio environment).
// Using import.meta.glob prevents Vite build failures when firebase-applet-config.json
// is absent in open-source clones or Git-tracked deployments.
const localConfigFiles = import.meta.glob<Record<string, any>>('../firebase-applet-config.json', { eager: true });
const fileConfig = (localConfigFiles['../firebase-applet-config.json'] as { default?: Record<string, string> } | undefined)?.default || {};

// Configure dynamic authDomain and env variable overrides.
// Environment variables (VITE_FIREBASE_*) take precedence for production / App Hosting.
export const effectiveFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fileConfig.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fileConfig.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fileConfig.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fileConfig.appId || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || fileConfig.firestoreDatabaseId || undefined,
};

// Fallback to placeholder if completely unconfigured to prevent hard crash before warning
const safeConfig = {
  apiKey: effectiveFirebaseConfig.apiKey || 'placeholder-api-key',
  authDomain: effectiveFirebaseConfig.authDomain || 'placeholder.firebaseapp.com',
  projectId: effectiveFirebaseConfig.projectId || 'placeholder-project',
  storageBucket: effectiveFirebaseConfig.storageBucket || undefined,
  messagingSenderId: effectiveFirebaseConfig.messagingSenderId || undefined,
  appId: effectiveFirebaseConfig.appId || '1:1234567890:web:abcdef123456',
};

if (!effectiveFirebaseConfig.projectId || effectiveFirebaseConfig.projectId === 'placeholder-project') {
  console.warn('[Firebase] Nenhuma credencial do Firebase configurada. Defina as variáveis VITE_FIREBASE_* no .env ou crie firebase-applet-config.json.');
}

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(safeConfig) : getApp();

// Initialize Firebase Auth (defaults natively to browserLocalPersistence in Web/PWA)
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
// We deliberately DO NOT set prompt: 'select_account' so that once authorized,
// the browser/PWA preserves permissions seamlessly without asking again.

// Initialize Firestore with resilient network settings (forcing long polling to avoid connection unavailable errors in iframe/proxies)
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    effectiveFirebaseConfig.firestoreDatabaseId || undefined
  );
} catch (err1) {
  try {
    // Fallback without persistent tab manager (e.g. in sandboxed/restricted iframe environments)
    firestoreInstance = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        localCache: memoryLocalCache(),
      },
      effectiveFirebaseConfig.firestoreDatabaseId || undefined
    );
  } catch {
    // Ultimate fallback to getFirestore if already initialized
    firestoreInstance = effectiveFirebaseConfig.firestoreDatabaseId 
      ? getFirestore(app, effectiveFirebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
}

export const db: Firestore = firestoreInstance;
export default app;

