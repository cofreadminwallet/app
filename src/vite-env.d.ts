/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_DATABASE_ID?: string;
  readonly VITE_FIREBASE_OAUTH_CLIENT_ID?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_FEEDBACK_URL?: string;
  readonly VITE_DEV_FEE_RECIPIENT_ADDRESS?: string;
  readonly VITE_EXPECTED_GAS_RELAYER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
