import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  limit,
  type Firestore,
} from 'firebase/firestore';
import type {
  Category,
  Vault,
  Transaction,
  OnChainLedgerEntry,
  SavedContact,
  UserProfile,
  CloudUserData,
  MergedCloudUserData,
  WalletBackupAckParams,
  CloudDeletionConsent,
  AuthenticatedSessionUser,
  IAuthService,
} from './types';
import { isCustomUserAvatar, isDefaultOrPlaceholderAvatar, localStorageDb } from './localStorageDb';
import { sanitizeTransactions } from '../utils/transactionSanitizer';

// Production configuration 100% via environment variables (.env) or runtime injection by the App Hosting container
const runtimeWindowConfig =
  typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__
    ? (window as any).__FIREBASE_CONFIG__
    : {};

export const effectiveFirebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || runtimeWindowConfig.apiKey || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || runtimeWindowConfig.authDomain || '').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || runtimeWindowConfig.projectId || '').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || runtimeWindowConfig.storageBucket || '').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || runtimeWindowConfig.messagingSenderId || '').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || runtimeWindowConfig.appId || '').trim(),
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_DATABASE_ID || runtimeWindowConfig.firestoreDatabaseId || '(default)').trim(),
};

export const isFirebaseConfigured = Boolean(
  effectiveFirebaseConfig.apiKey &&
    effectiveFirebaseConfig.apiKey !== 'undefined' &&
    effectiveFirebaseConfig.projectId &&
    effectiveFirebaseConfig.projectId !== 'undefined'
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(effectiveFirebaseConfig);
    authInstance = getAuth(app);
    firestoreInstance = getFirestore(app, effectiveFirebaseConfig.firestoreDatabaseId);
  } catch (err) {
    console.warn('Aviso: Firebase não pôde ser inicializado. Operando em modo 100% Local.', err);
    app = null;
    authInstance = null;
    firestoreInstance = null;
  }
}

export const auth: Auth | null = authInstance;
export const firestoreDb: Firestore | null = firestoreInstance;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

const USERS_COLLECTION = 'userData';
const LEGAL_AUDIT_COLLECTION = 'legalAuditArchive';
const USERS_UID_COLLECTION = 'users';
const CANDIDATE_USER_COLLECTIONS = ['userData', 'users', 'cofreadmin_users'];

export const DEMO_VAULT_IDS = ['vault-1', 'vault-2', 'vault-3', 'vault_1', 'vault_2', 'vault_3', 'vault_4'];

export const DEMO_TX_TITLES = [
  'Salário Mensal',
  'Supermercado',
  'Depósito Reserva',
  'Fatura Cartão',
  'Aporte Reserva de Emergência',
  'Rendimento Automático',
  'Depósito Inicial',
  'Transferência Recebida',
];

export const CURRENT_SCHEMA_VERSION = 2;

export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export function getCloudUserDocId(userId: string, email?: string): string {
  if (userId && userId.startsWith('google_') && /^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return userId;
  }
  if (email && email.includes('@')) {
    const sanitized = email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    return `google_${sanitized}`.slice(0, 128);
  }
  const raw = (userId || 'anonymous').trim().toLowerCase();
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

export function normalizeCloudUserData(raw: any): CloudUserData {
  if (!raw || typeof raw !== 'object') return raw;
  const clone = { ...raw };
  if (!clone.user) {
    clone.user = {
      id: clone.authId || clone.id || clone.email || 'user',
      authId: clone.authId || clone.id,
      email: clone.email || '',
      name: clone.name || clone.displayName || (clone.email ? clone.email.split('@')[0] : 'Usuário'),
      username: clone.username || clone.name || (clone.email ? clone.email.split('@')[0] : 'Usuário'),
      avatarUrl: clone.avatarUrl || clone.photoURL || '',
      walletAddress: clone.walletAddress || '',
      walletPrivateKey: clone.walletPrivateKey || '',
      walletMnemonic: clone.walletMnemonic,
      termsAccepted: clone.termsAccepted ?? true,
      termsAcceptedAt: clone.termsAcceptedAt || clone.createdAt || new Date().toISOString(),
      hasCompletedOnboarding: clone.hasCompletedOnboarding ?? true,
      isLoggedIn: true,
      web3Network: clone.web3Network || 'base',
      web3Enabled: true,
      deviceSecurityEnabled: Boolean(clone.deviceSecurityEnabled),
      appLockEnabled: Boolean(clone.appLockEnabled),
      requireAuthForPayments: Boolean(clone.requireAuthForPayments),
      passkeyEnabled: Boolean(clone.passkeyEnabled),
      dailySpendLimit: clone.dailySpendLimit,
    };
  } else {
    clone.user = { ...clone.user };
    if (!clone.user.walletAddress && clone.walletAddress) clone.user.walletAddress = clone.walletAddress;
    if (!clone.user.email && clone.email) clone.user.email = clone.email;
    if (!clone.user.termsAccepted && clone.termsAccepted) clone.user.termsAccepted = clone.termsAccepted;
    if (!clone.user.hasCompletedOnboarding && clone.hasCompletedOnboarding) clone.user.hasCompletedOnboarding = clone.hasCompletedOnboarding;
  }
  return clone as CloudUserData;
}

export function getCandidateDocIds(userId: string, email?: string, uid?: string): string[] {
  const candidates = new Set<string>();

  const addCandidate = (id?: string) => {
    if (!id || typeof id !== 'string') return;
    const trimmed = id.trim();
    if (!trimmed) return;
    // Permits standard document ID characters and email symbols (@ and .)
    if (/^[a-zA-Z0-9_\-@.]{1,128}$/.test(trimmed)) {
      candidates.add(trimmed);
      candidates.add(trimmed.toLowerCase());
    }
    const sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
    if (sanitized && /^[a-zA-Z0-9_-]{1,128}$/.test(sanitized)) {
      candidates.add(sanitized);
      candidates.add(sanitized.toLowerCase());
    }
  };

  const processEmail = (val?: string) => {
    if (!val || typeof val !== 'string' || !val.includes('@')) return;
    const clean = val.trim().toLowerCase();
    addCandidate(clean);
    addCandidate(`google_${clean}`);
    addCandidate(`discord_${clean}`);
    addCandidate(`user_${clean}`);

    const sanitized = clean.replace(/[^a-zA-Z0-9_-]/g, '_');
    addCandidate(`google_${sanitized}`);
    addCandidate(`discord_${sanitized}`);
    addCandidate(sanitized);
    addCandidate(`user_${sanitized}`);
  };

  const processId = (val?: string) => {
    if (!val || typeof val !== 'string') return;
    const clean = val.trim();
    if (!clean) return;
    if (clean.includes('@')) {
      processEmail(clean);
    } else {
      addCandidate(clean);
      if (clean.startsWith('google_')) {
        const withoutGoogle = clean.slice('google_'.length);
        addCandidate(withoutGoogle);
        addCandidate(`user_${withoutGoogle}`);
      } else if (clean.startsWith('discord_')) {
        const withoutDiscord = clean.slice('discord_'.length);
        addCandidate(withoutDiscord);
        addCandidate(`user_${withoutDiscord}`);
      } else {
        addCandidate(`google_${clean}`);
        addCandidate(`discord_${clean}`);
      }
    }
  };

  const activeUid = uid || auth?.currentUser?.uid;
  const activeEmail = email || auth?.currentUser?.email || undefined;

  if (activeEmail) processEmail(activeEmail);
  if (userId) processId(userId);
  if (activeUid) {
    addCandidate(activeUid);
    addCandidate(`google_${activeUid}`);
    addCandidate(`discord_${activeUid}`);
    if (activeUid.startsWith('discord_')) {
      addCandidate(activeUid.slice('discord_'.length));
    }
  }

  return Array.from(candidates).filter(Boolean);
}

export function mergeLocalAndCloudData(
  local: {
    user: UserProfile;
    categories: Category[];
    vaults: Vault[];
    transactions: Transaction[];
    onchainLedger?: OnChainLedgerEntry[];
    contacts?: SavedContact[];
    updatedAt?: string;
    encryptedWalletBackup?: string;
    walletAddress?: string;
    schemaVersion?: number;
  },
  cloud: CloudUserData
): MergedCloudUserData {
  const cloudCatIds = new Set((cloud.categories || []).map(c => c.id));
  const cloudVaultIds = new Set((cloud.vaults || []).map(v => v.id));
  const cloudTxIds = new Set((cloud.transactions || []).map(t => t.id));

  let hasMergedLocalItems = false;

  const categoryMap = new Map<string, Category>();
  (local.categories || []).forEach(c => {
    categoryMap.set(c.id, c);
    if (!cloudCatIds.has(c.id)) hasMergedLocalItems = true;
  });
  (cloud.categories || []).forEach(c => categoryMap.set(c.id, c));

  const vaultMap = new Map<string, Vault>();
  (local.vaults || [])
    .filter(v => !DEMO_VAULT_IDS.includes(v.id))
    .forEach(v => {
      vaultMap.set(v.id, v);
      if (!cloudVaultIds.has(v.id)) hasMergedLocalItems = true;
    });
  (cloud.vaults || [])
    .filter(v => !DEMO_VAULT_IDS.includes(v.id))
    .forEach(v => vaultMap.set(v.id, v));

  const cleanLocalTxs = sanitizeTransactions(local.transactions || []);
  const cleanCloudTxs = sanitizeTransactions(cloud.transactions || []);

  const txMap = new Map<string, Transaction>();
  cleanLocalTxs.forEach(t => {
    txMap.set(t.id, t);
    if (!cloudTxIds.has(t.id)) hasMergedLocalItems = true;
  });
  cleanCloudTxs.forEach(t => txMap.set(t.id, t));

  const sortedTxs = Array.from(txMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const ledgerMap = new Map<string, OnChainLedgerEntry>();
  (local.onchainLedger || []).forEach(entry => {
    if (entry && entry.txHash) ledgerMap.set(entry.txHash.toLowerCase(), entry);
  });
  (cloud.onchainLedger || []).forEach(entry => {
    if (entry && entry.txHash) ledgerMap.set(entry.txHash.toLowerCase(), entry);
  });
  const sortedLedger = Array.from(ledgerMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const contactsMap = new Map<string, SavedContact>();
  (cloud.contacts || []).forEach(c => {
    if (c && c.address) contactsMap.set(c.address.toLowerCase(), c);
  });
  (local.contacts || []).forEach(c => {
    if (c && c.address) contactsMap.set(c.address.toLowerCase(), c);
  });
  const sortedContacts = Array.from(contactsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
  const cloudTime = cloud.updatedAt ? new Date(cloud.updatedAt).getTime() : 0;
  const isCloudNewer = cloudTime >= localTime;

  const primaryUser = isCloudNewer ? cloud.user || local.user : local.user || cloud.user;
  const secondaryUser = isCloudNewer ? local.user : cloud.user;

  let resolvedAvatarUrl = primaryUser?.avatarUrl || secondaryUser?.avatarUrl;
  if (isCustomUserAvatar(local.user?.avatarUrl)) {
    resolvedAvatarUrl = local.user.avatarUrl;
  } else if (isCustomUserAvatar(cloud.user?.avatarUrl)) {
    resolvedAvatarUrl = cloud.user.avatarUrl;
  } else if (isDefaultOrPlaceholderAvatar(resolvedAvatarUrl)) {
    resolvedAvatarUrl = !isDefaultOrPlaceholderAvatar(local.user?.avatarUrl)
      ? local.user?.avatarUrl
      : !isDefaultOrPlaceholderAvatar(cloud.user?.avatarUrl)
      ? cloud.user?.avatarUrl
      : resolvedAvatarUrl;
  }

  return {
    user: {
      ...secondaryUser,
      ...primaryUser,
      avatarUrl: resolvedAvatarUrl,
      hasCompletedOnboarding: Boolean(
        local.user?.hasCompletedOnboarding || cloud.user?.hasCompletedOnboarding
      ),
    },
    categories: Array.from(categoryMap.values()),
    vaults: Array.from(vaultMap.values()),
    transactions: sortedTxs,
    onchainLedger: sortedLedger,
    contacts: sortedContacts,
    updatedAt: new Date(Math.max(localTime, cloudTime, Date.now())).toISOString(),
    encryptedWalletBackup: cloud.encryptedWalletBackup || local.encryptedWalletBackup,
    walletAddress: cloud.walletAddress || local.walletAddress,
    schemaVersion: Math.max(
      local.schemaVersion || 1,
      cloud.schemaVersion || 1,
      CURRENT_SCHEMA_VERSION
    ),
    hasMergedLocalItems,
  };
}

/**
 * Cloud Implementation (FirebaseDatabaseService - Firestore)
 * Isolates 100% of calls to the Cloud Firestore SDK.
 */
export class FirebaseDatabaseService {
  private lastSavedHash: string | null = null;

  resetCache(): void {
    this.lastSavedHash = null;
  }

  async saveToCloud(
    userOrId: UserProfile | string,
    categoriesOrData?: Category[] | Omit<CloudUserData, 'updatedAt'>,
    vaults?: Vault[],
    transactions?: Transaction[]
  ): Promise<boolean> {
    if (!firestoreDb) return false;
    try {
      let userId: string;
      let payloadData: Omit<CloudUserData, 'updatedAt'>;

      if (typeof userOrId === 'string') {
        userId = userOrId;
        payloadData = (categoriesOrData as Omit<CloudUserData, 'updatedAt'>) || {
          user: localStorageDb.getUser(userId),
          categories: localStorageDb.getCategories(userId),
          vaults: localStorageDb.getVaults(userId),
          transactions: localStorageDb.getTransactions(userId),
        };
      } else {
        const userObj = userOrId;
        userId = userObj.authId || userObj.email || userObj.id;
        payloadData = {
          user: userObj,
          email: userObj.email,
          categories: Array.isArray(categoriesOrData) ? categoriesOrData : localStorageDb.getCategories(userId),
          vaults: vaults || localStorageDb.getVaults(userId),
          transactions: transactions || localStorageDb.getTransactions(userId),
          onchainLedger: localStorageDb.getOnChainLedger(userId),
          contacts: localStorageDb.getContacts(userId),
          walletAddress: userObj.walletAddress,
        };
      }

      if (!userId) return false;

      const activeAuthEmail = auth?.currentUser?.email || payloadData.user?.email || payloadData.email || '';
      const activeAuthUid = auth?.currentUser?.uid || payloadData.user?.authId || userId;
      const docId = getCloudUserDocId(userId, activeAuthEmail);
      const userRef = doc(firestoreDb, USERS_COLLECTION, docId);
      const cleanUser = payloadData.user
        ? {
            ...payloadData.user,
            email: activeAuthEmail || payloadData.user.email,
          }
        : undefined;
      if (cleanUser) {
        delete cleanUser.walletPrivateKey;
        delete cleanUser.walletMnemonic;
      }

      const payload: CloudUserData & { authId?: string } = sanitizeForFirestore({
        ...payloadData,
        email: activeAuthEmail || payloadData.email,
        authId: activeAuthUid,
        user: cleanUser,
        schemaVersion: payloadData.schemaVersion || CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      });

      await setDoc(userRef, payload, { merge: true });

      // Mirror backup into users/{uid} when authenticated with Firebase UID
      const fbUid = auth?.currentUser?.uid;
      if (fbUid && /^[a-zA-Z0-9_-]{1,128}$/.test(fbUid)) {
        try {
          const uidRef = doc(firestoreDb, USERS_UID_COLLECTION, fbUid);
          await setDoc(uidRef, payload, { merge: true });
        } catch {
          // Non-blocking fallback mirror
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao salvar dados no Cloud Firestore:', error);
      return false;
    }
  }

  async loadFromCloud(userIdOrEmail: string, email?: string, uid?: string): Promise<CloudUserData | null> {
    if (!firestoreDb || (!userIdOrEmail && !email && !uid)) return null;
    try {
      // Ensure Firebase Auth token is attached to Firestore SDK before querying post-login
      if (auth?.currentUser) {
        try {
          await auth.currentUser.getIdToken();
        } catch {
          // Proceed with cached session if offline
        }
      }

      const activeUid = uid || auth?.currentUser?.uid;
      const activeEmail = email || auth?.currentUser?.email || undefined;
      const candidates = getCandidateDocIds(userIdOrEmail, activeEmail, activeUid);
      const foundSnapshots: CloudUserData[] = [];

      // 1. Direct parallel read across all candidate collections (userData, users, cofreadmin_users)
      const directReadTasks: Promise<CloudUserData | null>[] = [];
      for (const colName of CANDIDATE_USER_COLLECTIONS) {
        for (const candidateId of candidates) {
          directReadTasks.push(
            (async () => {
              try {
                const userRef = doc(firestoreDb, colName, candidateId);
                const snap = await getDoc(userRef);
                if (snap.exists()) {
                  return normalizeCloudUserData(snap.data());
                }
              } catch {
                // Continue search across other candidates
              }
              return null;
            })()
          );
        }
      }

      const directResults = await Promise.all(directReadTasks);
      for (const item of directResults) {
        if (item) {
          foundSnapshots.push(item);
        }
      }

      // 2. Query-based fallback on primary collections (by email, user.email, or authId)
      if (foundSnapshots.length === 0) {
        let cleanEmail = (activeEmail || '').trim();
        if (!cleanEmail && userIdOrEmail.includes('@')) {
          cleanEmail = userIdOrEmail.trim();
        } else if (!cleanEmail && userIdOrEmail.startsWith('google_') && userIdOrEmail.includes('_gmail_com')) {
          cleanEmail = userIdOrEmail.slice('google_'.length).replace(/_gmail_com$/, '@gmail.com');
        }

        const emailVariants = Array.from(
          new Set([cleanEmail, cleanEmail.toLowerCase()].filter(Boolean))
        );

        for (const colName of CANDIDATE_USER_COLLECTIONS) {
          if (foundSnapshots.length > 0) break;
          for (const emailVar of emailVariants) {
            try {
              const q1 = query(collection(firestoreDb, colName), where('email', '==', emailVar), limit(5));
              const snap1 = await getDocs(q1);
              snap1.forEach(docSnap => {
                if (docSnap.exists()) foundSnapshots.push(normalizeCloudUserData(docSnap.data()));
              });
            } catch {}

            if (foundSnapshots.length === 0) {
              try {
                const q2 = query(collection(firestoreDb, colName), where('user.email', '==', emailVar), limit(5));
                const snap2 = await getDocs(q2);
                snap2.forEach(docSnap => {
                  if (docSnap.exists()) foundSnapshots.push(normalizeCloudUserData(docSnap.data()));
                });
              } catch {}
            }
          }

          if (foundSnapshots.length === 0 && activeUid) {
            try {
              const qUid = query(collection(firestoreDb, colName), where('authId', '==', activeUid), limit(5));
              const snapUid = await getDocs(qUid);
              snapUid.forEach(docSnap => {
                if (docSnap.exists()) foundSnapshots.push(normalizeCloudUserData(docSnap.data()));
              });
            } catch {}
          }
        }
      }

      // 3. Secondary fallback by direct UID across all candidate collections
      const fbUid = auth?.currentUser?.uid || activeUid;
      if (foundSnapshots.length === 0 && fbUid && /^[a-zA-Z0-9_\-@.]{1,128}$/.test(fbUid)) {
        for (const colName of CANDIDATE_USER_COLLECTIONS) {
          try {
            const uidRef = doc(firestoreDb, colName, fbUid);
            const uidSnap = await getDoc(uidRef);
            if (uidSnap.exists()) {
              const data = normalizeCloudUserData(uidSnap.data());
              if (data && (data.user || data.email || data.walletAddress)) {
                foundSnapshots.push(data);
              }
            }
          } catch {}
        }
      }

      if (foundSnapshots.length === 0) {
        return null;
      }

      let combined = foundSnapshots[0];
      for (let i = 1; i < foundSnapshots.length; i++) {
        combined = mergeLocalAndCloudData(combined, foundSnapshots[i]);
      }
      return combined;
    } catch (error) {
      console.error('Erro ao carregar dados do Cloud Firestore:', error);
      return null;
    }
  }

  async purgeSimulatedDataFromCloud(
    userIdOrEmail: string,
    email?: string,
    currentVaults: Vault[] = []
  ): Promise<{ success: boolean; purgedCount: number }> {
    if (!firestoreDb || (!userIdOrEmail && !email)) return { success: false, purgedCount: 0 };
    let purgedCount = 0;
    try {
      const candidates = getCandidateDocIds(userIdOrEmail, email);
      const cleanedVaults = currentVaults.filter(v => !DEMO_VAULT_IDS.includes(v.id));

      for (const candidateId of candidates) {
        const userRef = doc(firestoreDb, USERS_COLLECTION, candidateId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const cloudData = snap.data() as CloudUserData;
          const cloudCleanedVaults = (cloudData.vaults || []).filter(
            v => !DEMO_VAULT_IDS.includes(v.id)
          );
          const originalTxs = cloudData.transactions || [];
          const cloudCleanedTxs = sanitizeTransactions(originalTxs);
          purgedCount += Math.max(0, originalTxs.length - cloudCleanedTxs.length);

          await setDoc(
            userRef,
            sanitizeForFirestore({
              ...cloudData,
              vaults: cloudCleanedVaults.length > 0 ? cloudCleanedVaults : cleanedVaults,
              transactions: cloudCleanedTxs,
              updatedAt: new Date().toISOString(),
            })
          );
        }
      }
      return { success: true, purgedCount };
    } catch (error) {
      console.error('Erro ao expurgar dados simulados da nuvem:', error);
      return { success: false, purgedCount: 0 };
    }
  }

  async deleteFromCloud(
    emailOrId: string,
    user?: UserProfile,
    deletionConsent?: CloudDeletionConsent
  ): Promise<boolean> {
    if (!emailOrId && !user?.email) return false;
    if (!firestoreDb) return true;
    try {
      const candidates = getCandidateDocIds(user?.authId || emailOrId, user?.email || emailOrId);

      try {
        const rawIdentifier = (user?.email || emailOrId || 'unknown').trim().toLowerCase();
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawIdentifier));
        const emailHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        const localTxs = localStorageDb.getTransactions();
        const localLedger = localStorageDb.getOnChainLedger();
        const onChainTxs = localTxs
          .filter(tx => Boolean(tx.txHash))
          .map(tx => ({
            txHash: tx.txHash,
            date: tx.date,
            amountUsdc: tx.amount,
            type: tx.type,
          }));

        const ledgerHashes = localLedger.map(entry => ({
          txHash: entry.txHash,
          date: entry.timestamp,
          amountUsdc: entry.amount,
          type: entry.type,
          counterparty: entry.type === 'send' ? entry.toAddress : entry.fromAddress,
        }));

        const archiveId = `del_${emailHash.slice(0, 16)}_${Date.now()}`;
        const auditRef = doc(firestoreDb, LEGAL_AUDIT_COLLECTION, archiveId);
        await setDoc(
          auditRef,
          sanitizeForFirestore({
            userEmail: auth?.currentUser?.email || user?.email || rawIdentifier,
            userUid: auth?.currentUser?.uid || user?.authId || user?.id || emailHash.slice(0, 16),
            deletedAccountId: user?.authId || user?.id || emailHash.slice(0, 16),
            emailHash,
            walletAddressUsed: user?.walletAddress || 'not_linked',
            reason: 'USER_REQUESTED_ACCOUNT_DELETION',
            retentionBasis: 'LGPD_ART_16_II_COMPLIANCE_AND_PLD_AUDIT',
            deletedAt: deletionConsent?.confirmedAt || new Date().toISOString(),
            retainUntil: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            statement: deletionConsent?.statement,
            totalTxCount: localTxs.length,
            totalOnchainCount: ledgerHashes.length || onChainTxs.length,
            onChainTxHashes: ledgerHashes.length > 0 ? ledgerHashes.slice(0, 100) : onChainTxs.slice(0, 100),
          })
        );
      } catch (auditErr) {
        console.warn('Aviso ao gravar log de conformidade legal:', auditErr);
      }

      for (const candidateId of candidates) {
        try {
          const userRef = doc(firestoreDb, USERS_COLLECTION, candidateId);
          await deleteDoc(userRef);
        } catch {}
      }

      const fbUid = auth?.currentUser?.uid;
      if (fbUid && /^[a-zA-Z0-9_-]{1,128}$/.test(fbUid)) {
        try {
          await deleteDoc(doc(firestoreDb, USERS_UID_COLLECTION, fbUid));
        } catch {}
      }

      return true;
    } catch (error) {
      console.error('Erro ao excluir dados do usuário no Cloud Firestore:', error);
      return false;
    }
  }

  async logWalletBackupAcknowledgment(
    paramsOrUserId: WalletBackupAckParams | string,
    email?: string,
    walletAddress?: string,
    action: 'INITIAL_BACKUP' | 'MANUAL_EXPORT' | 'SEED_REVEAL' = 'MANUAL_EXPORT'
  ): Promise<string | null> {
    try {
      const resolvedUid =
        typeof paramsOrUserId === 'string' ? paramsOrUserId : paramsOrUserId.userUid || '';
      const resolvedEmail =
        typeof paramsOrUserId === 'string' ? email || '' : paramsOrUserId.userEmail || '';
      const resolvedWallet =
        typeof paramsOrUserId === 'string'
          ? walletAddress || ''
          : paramsOrUserId.walletAddress || '';
      const resolvedAction =
        typeof paramsOrUserId === 'string'
          ? action
          : paramsOrUserId.action || 'MANUAL_EXPORT';
      const resolvedStatement =
        typeof paramsOrUserId === 'string' ? undefined : paramsOrUserId.statement;

      const rawIdentifier = (resolvedEmail || resolvedUid || resolvedWallet || 'unknown')
        .trim()
        .toLowerCase();
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawIdentifier));
      const emailHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const acceptedAt = new Date().toISOString();
      const fingerprint = `ack_${emailHash.slice(0, 12)}_${Date.now()}`;

      if (!firestoreDb) {
        return fingerprint;
      }

      const auditRef = doc(firestoreDb, LEGAL_AUDIT_COLLECTION, fingerprint);
      await setDoc(
        auditRef,
        sanitizeForFirestore({
          userEmail: auth?.currentUser?.email || resolvedEmail || rawIdentifier,
          userUid: auth?.currentUser?.uid || resolvedUid || emailHash.slice(0, 16),
          userId: resolvedUid || emailHash.slice(0, 16),
          emailHash,
          walletAddress: resolvedWallet || 'pending_address',
          action: resolvedAction,
          statement: resolvedStatement,
          fingerprint,
          acknowledgedNonCustodialTerms: true,
          acknowledgedResponsibilityTerms: true,
          acceptedAt,
          retentionBasis: 'LGPD_ART_16_I_AND_REGULAR_EXERCISE_OF_RIGHTS_ART_7_VI',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 180) : 'web',
          schemaVersion: CURRENT_SCHEMA_VERSION,
        })
      );
      return fingerprint;
    } catch (error) {
      console.warn('Aviso ao registrar comprovante legal de backup da carteira:', error);
      return `local_ack_${Date.now()}`;
    }
  }

  mergeLocalAndCloudData(
    local: {
      user: UserProfile;
      categories: Category[];
      vaults: Vault[];
      transactions: Transaction[];
      onchainLedger?: OnChainLedgerEntry[];
      contacts?: SavedContact[];
      updatedAt?: string;
    },
    cloud: CloudUserData
  ): MergedCloudUserData {
    return mergeLocalAndCloudData(local, cloud);
  }
}

/**
 * Authentication Implementation (FirebaseAuthService)
 * Isolates 100% of calls to the Firebase Auth SDK.
 */
export class FirebaseAuthService implements IAuthService {
  async signIn(): Promise<{ user: AuthenticatedSessionUser }> {
    const user = await this.signInWithGoogle();
    return { user };
  }

  async signInWithGoogle(): Promise<AuthenticatedSessionUser> {
    if (!auth) {
      throw new Error(
        'Autenticação em nuvem não configurada: defina as variáveis VITE_FIREBASE_* no arquivo .env para usar o Login Google, ou acesse via Modo Local.'
      );
    }
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    return {
      id: user.uid,
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Usuário Google',
      name: user.displayName || 'Usuário Google',
      photoURL: user.photoURL || '',
      picture: user.photoURL || '',
    };
  }

  async signOut(): Promise<void> {
    if (!auth) return;
    await firebaseSignOut(auth);
  }

  getCurrentUser(): AuthenticatedSessionUser | null {
    if (!auth) return null;
    const current = auth.currentUser;
    if (!current) return null;
    return {
      id: current.uid,
      uid: current.uid,
      email: current.email || '',
      displayName: current.displayName || 'Usuário Google',
      name: current.displayName || 'Usuário Google',
      photoURL: current.photoURL || '',
      picture: current.photoURL || '',
    };
  }

  onAuthStateChanged(callback: (user: AuthenticatedSessionUser | null) => void): () => void {
    if (!auth) {
      queueMicrotask(() => callback(null));
      return () => {};
    }
    return firebaseOnAuthStateChanged(auth, firebaseUser => {
      if (!firebaseUser) {
        callback(null);
        return;
      }
      callback({
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Usuário Google',
        name: firebaseUser.displayName || 'Usuário Google',
        photoURL: firebaseUser.photoURL || '',
        picture: firebaseUser.photoURL || '',
      });
    });
  }

  async verifyActiveSessionToken(forceRefresh = true): Promise<boolean> {
    if (!auth) return false;
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    const token = await currentUser.getIdToken(forceRefresh);
    return Boolean(token);
  }

  async saveOAuthHandshake(payload: string): Promise<void> {
    await localStorageDb.saveOAuthHandshake(payload);
  }

  consumeOAuthHandshakeSync(): string | null {
    return localStorageDb.consumeOAuthHandshakeSync();
  }

  async consumeOAuthHandshake(): Promise<string | null> {
    return localStorageDb.consumeOAuthHandshake();
  }

  clearOAuthHandshakeSync(): void {
    localStorageDb.clearOAuthHandshakeSync();
  }

  async clearOAuthHandshake(): Promise<void> {
    await localStorageDb.clearOAuthHandshake();
  }
}

export const firebaseDb = new FirebaseDatabaseService();
export const firebaseAuth = new FirebaseAuthService();
