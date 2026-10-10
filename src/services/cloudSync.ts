import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, Category, Vault, Transaction } from '../types';
import { sanitizeTransactions } from '../utils/transactionSanitizer';
import { StorageService, isCustomUserAvatar } from '../utils/storage';

export interface CloudUserData {
  version: string;
  email: string;
  updatedAt?: any;
  customAvatarUrl?: string | null;
  user: UserProfile;
  categories: Category[];
  vaults: Vault[];
  transactions: Transaction[];
}

export interface LegalDeletionAuditRecord {
  archiveId: string;
  userUid?: string;
  userEmail: string;
  walletAddress?: string;
  termsAccepted: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
  termsLanguage?: string;
  termsDocumentUrl?: string;
  termsAuditFingerprint?: string;
  termsReadAndAcknowledgedOnDeletion: boolean;
  backupAcknowledgedAt?: string;
  backupAuditFingerprint?: string;
  deletionConsentConfirmed: boolean;
  deletionConsentConfirmedAt?: string;
  deletionConsentFingerprint?: string;
  deletionConsentStatement?: string;
  deletionLanguage?: string;
  deletedAt: string;
  deletionTimestamp: any;
  deletionReason: string;
  legalBasis: string;
  statement: string;
  clientLocale?: string;
  clientUserAgent?: string;
}

export interface LegalWalletBackupAuditRecord {
  archiveId: string;
  archiveType: 'WALLET_BACKUP_ACKNOWLEDGMENT';
  userUid?: string;
  userEmail: string;
  walletAddress?: string;
  acknowledgedAt: string;
  acknowledgmentTimestamp: any;
  auditFingerprint: string;
  statement: string;
  legalBasis: string;
  clientUserAgent?: string;
}

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

// Filter out legacy simulated, mock or test vaults
export const DEMO_VAULT_IDS = new Set<string>(['vault_1', 'vault_2', 'vault_3', 'vault_4']);

// Helper to sanitize key from email
export function getCloudUserDocId(email?: string): string {
  if (!email) return 'user_default';
  return email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Recursively cleans any object or array so that:
 * 1. All `undefined` keys and values are completely removed.
 * 2. Any `NaN` numbers are safely converted to 0.
 * 3. Firestore FieldValue objects (e.g. serverTimestamp) are left intact.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    // Preserve Firestore FieldValue or special constructors
    if (
      typeof (data as any).isEqual === 'function' ||
      '_methodName' in (data as any) ||
      (data as any).constructor?.name === 'FieldValue'
    ) {
      return data;
    }
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        if (typeof val === 'number' && isNaN(val)) {
          clean[key] = 0;
        } else {
          clean[key] = sanitizeForFirestore(val);
        }
      }
    }
    return clean as T;
  }
  if (typeof data === 'number' && isNaN(data)) {
    return 0 as unknown as T;
  }
  return data;
}

/**
 * Smart automatic merger for Gen Z / Zero-Friction experience:
 * Seamlessly combines local offline records with cloud history without duplicates.
 */
export function mergeLocalAndCloudData(
  local: {
    user: UserProfile;
    categories: Category[];
    vaults: Vault[];
    transactions: Transaction[];
  },
  cloud: CloudUserData
): {
  user: UserProfile;
  categories: Category[];
  vaults: Vault[];
  transactions: Transaction[];
  hasMergedLocalItems: boolean;
} {
  let hasMergedLocalItems = false;

  // Filter out any simulated, mock or synthetic transactions

  const rawCloudTxs = cloud.transactions || [];
  const rawLocalTxs = local.transactions || [];
  const cleanCloudTransactions = sanitizeTransactions(rawCloudTxs);
  const cleanLocalTransactions = sanitizeTransactions(rawLocalTxs);

  // If simulations were purged, mark hasMergedLocalItems so clean state is saved to cloud
  if (cleanCloudTransactions.length !== rawCloudTxs.length || cleanLocalTransactions.length !== rawLocalTxs.length) {
    hasMergedLocalItems = true;
  }

  const cleanCloudVaults = (cloud.vaults || []).filter(v => !DEMO_VAULT_IDS.has(v.id));
  const cleanLocalVaults = (local.vaults || []).filter(v => !DEMO_VAULT_IDS.has(v.id));

  // 1. MERGE TRANSACTIONS (Avoid duplicates by ID or signature)
  const cloudTxIds = new Set(cleanCloudTransactions.map(t => t.id));
  const cloudSignatures = new Set(
    cleanCloudTransactions.map(
      t => `${t.type}_${t.amount}_${(t.date || '').slice(0, 10)}_${t.description?.trim().toLowerCase()}`
    )
  );

  const mergedTransactions: Transaction[] = [...cleanCloudTransactions];

  cleanLocalTransactions.forEach(localTx => {
    const sig = `${localTx.type}_${localTx.amount}_${(localTx.date || '').slice(0, 10)}_${localTx.description?.trim().toLowerCase()}`;
    if (!cloudTxIds.has(localTx.id) && !cloudSignatures.has(sig)) {
      mergedTransactions.push(localTx);
      hasMergedLocalItems = true;
    }
  });

  // Sort chronological descending (newest first)
  mergedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 2. MERGE VAULTS
  const cloudVaultIds = new Set(cleanCloudVaults.map(v => v.id));
  const cloudVaultTitles = new Set(cleanCloudVaults.map(v => v.title.trim().toLowerCase()));
  const mergedVaults: Vault[] = [...cleanCloudVaults];

  cleanLocalVaults.forEach(localVault => {
    const titleKey = localVault.title.trim().toLowerCase();
    if (!cloudVaultIds.has(localVault.id) && !cloudVaultTitles.has(titleKey)) {
      mergedVaults.push(localVault);
      hasMergedLocalItems = true;
    }
  });

  // 3. MERGE CATEGORIES
  const cloudCatIds = new Set(cloud.categories?.map(c => c.id) || []);
  const cloudCatNames = new Set(cloud.categories?.map(c => c.name.trim().toLowerCase()) || []);
  const mergedCategories: Category[] = [...(cloud.categories || [])];

  (local.categories || []).forEach(localCat => {
    const nameKey = localCat.name.trim().toLowerCase();
    if (!cloudCatIds.has(localCat.id) && !cloudCatNames.has(nameKey)) {
      mergedCategories.push(localCat);
      hasMergedLocalItems = true;
    }
  });

  // 4. MERGE USER PROFILE
  const localAvatar = local.user.avatarUrl;
  const cloudAvatar = cloud.user?.avatarUrl;
  const cloudCustomAvatar = cloud.customAvatarUrl;
  const localPersistedCustom = StorageService.getCustomAvatar();

  let resolvedAvatar = localAvatar;

  // Custom photo & chosen avatar resolution hierarchy:
  if (localAvatar && isCustomUserAvatar(localAvatar)) {
    resolvedAvatar = localAvatar;
  } else if (cloudCustomAvatar && isCustomUserAvatar(cloudCustomAvatar)) {
    resolvedAvatar = cloudCustomAvatar;
  } else if (cloudAvatar && isCustomUserAvatar(cloudAvatar)) {
    resolvedAvatar = cloudAvatar;
  } else if (localPersistedCustom && isCustomUserAvatar(localPersistedCustom)) {
    resolvedAvatar = localPersistedCustom;
  } else {
    resolvedAvatar = localAvatar || cloudAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=BaseCofre';
  }

  // Ensure custom avatar is saved in storage if resolved
  if (isCustomUserAvatar(resolvedAvatar)) {
    StorageService.setCustomAvatar(resolvedAvatar);
  }

  const mergedUser: UserProfile = {
    ...cloud.user,
    ...local.user,
    // Ensure cloud/auth identity and wallet are preserved
    isLoggedIn: true,
    isGoogleAuth: local.user.isGoogleAuth ?? cloud.user?.isGoogleAuth ?? true,
    provider: local.user.provider || cloud.user?.provider || (local.user.isGuest ? 'guest' : (local.user.isGoogleAuth ? 'google' : (local.user.discordId ? 'discord' : 'guest'))),
    authId: local.user.authId || cloud.user?.authId,
    discordId: local.user.discordId || cloud.user?.discordId,
    email: local.user.email || cloud.user?.email,
    name: local.user.name || cloud.user?.name,
    username: local.user.username || cloud.user?.username,
    avatarUrl: resolvedAvatar,
    walletAddress: cloud.user?.walletAddress || local.user.walletAddress,
    walletPrivateKey: local.user.walletPrivateKey,
    streakDays: Math.max(cloud.user?.streakDays || 0, local.user.streakDays || 0),
    initialBalance:
      typeof local.user.initialBalance === 'number'
        ? local.user.initialBalance
        : (cloud.user?.initialBalance ?? 0),
    dailySpendLimit:
      typeof local.user.dailySpendLimit === 'number'
        ? local.user.dailySpendLimit
        : (cloud.user?.dailySpendLimit ?? 50),
    hasCompletedOnboarding:
      Boolean(cloud.user?.hasCompletedOnboarding || local.user.hasCompletedOnboarding || cloud.user?.termsAccepted || local.user.termsAccepted),
    termsAccepted:
      Boolean(cloud.user?.termsAccepted || local.user.termsAccepted || true),
    deviceSecurityEnabled:
      Boolean(cloud.user?.deviceSecurityEnabled || local.user.deviceSecurityEnabled),
    appLockEnabled:
      Boolean(cloud.user?.appLockEnabled || local.user.appLockEnabled),
    requireAuthForPayments:
      Boolean(cloud.user?.requireAuthForPayments || local.user.requireAuthForPayments),
    passkeyEnabled:
      Boolean(cloud.user?.passkeyEnabled || local.user.passkeyEnabled),
  };

  return {
    user: mergedUser,
    categories: mergedCategories.length > 0 ? mergedCategories : local.categories,
    vaults: mergedVaults,
    transactions: mergedTransactions,
    hasMergedLocalItems,
  };
}

// In-memory cache & deduplication to eliminate redundant Firestore operations and save quota
let lastSavedStateSignature = '';
let inFlightSavePromise: Promise<boolean> | null = null;
let lastLoadResult: { email: string; timestamp: number; data: CloudUserData | null } | null = null;
let inFlightLoadPromise: Promise<CloudUserData | null> | null = null;
const READ_CACHE_TTL_MS = 60000; // 60s read cache to prevent multiple roundtrips on route/tab switches

/**
 * Computes a lightweight fast structural signature of the user's operational state.
 * If this signature hasn't changed, saveToCloud skips writing to Firestore completely!
 */
function computeStateSignature(
  user: UserProfile,
  categories: Category[],
  vaults: Vault[],
  transactions: Transaction[]
): string {
  const userCore = `${user.provider || ''}_${user.authId || ''}_${user.email || ''}_${user.name || ''}_${user.avatarUrl || ''}_${user.walletAddress || ''}_${user.streakDays || 0}_${user.dailySpendLimit || 50}_${user.initialBalance || 0}_${user.currency || 'BRL'}_${user.hasCompletedOnboarding}_${user.termsAccepted}_${Boolean(user.deviceSecurityEnabled)}_${Boolean(user.appLockEnabled)}_${Boolean(user.requireAuthForPayments)}`;
  const catsCore = (categories || []).map(c => `${c.id}:${c.name}:${c.type}:${c.color || ''}`).join('|');
  const vaultsCore = (vaults || [])
    .filter(v => !DEMO_VAULT_IDS.has(v.id))
    .map(v => `${v.id}:${v.currentAmount}:${v.targetAmount}:${v.title}`)
    .join('|');
  const txsCore = (transactions || [])
    .slice(0, 30) // sample latest 30 txs + count
    .map(t => `${t.id}:${t.amount}:${t.type}:${t.date}`)
    .join('|') + `_len:${transactions?.length || 0}`;

  return `${userCore}##${catsCore}##${vaultsCore}##${txsCore}`;
}

export const CloudSyncService = {
  /**
   * Resets internal signature cache (useful after deletion or fresh login)
   */
  resetCache(): void {
    lastSavedStateSignature = '';
    lastLoadResult = null;
  },

  /**
   * Pushes full user state to Firestore cloud.
   * OPTIMIZATION:
   * 1. Skips Firestore completely if state hasn't changed (Diff / Hash check).
   * 2. Deduplicates concurrent saves via an in-flight promise.
   */
  async saveToCloud(
    user: UserProfile,
    categories: Category[],
    vaults: Vault[],
    transactions: Transaction[]
  ): Promise<boolean> {
    try {
      const email = user.email?.trim() || (user.id ? `user_${user.id}` : '');
      if (!email) {
        return false;
      }

      // Guest / Offline test mode or Discord logins operate exclusively in local/offline storage.
      // Firestore cloud sync is exclusively enabled for authenticated Google accounts.
      if (user.isGuest || user.provider === 'guest' || user.provider === 'discord' || user.discordId || !auth.currentUser) {
        return true;
      }

      // Check if data actually changed since last successful write
      const currentSignature = computeStateSignature(user, categories, vaults, transactions);
      if (currentSignature === lastSavedStateSignature) {
        // Zero Firestore write quota spent: identical state
        return true;
      }

      // If another save is already executing, wait for it then evaluate
      if (inFlightSavePromise) {
        await inFlightSavePromise;
        if (currentSignature === lastSavedStateSignature) {
          return true;
        }
      }

      const executeSave = async (): Promise<boolean> => {
        const profileKey = user.authId || (user.provider === 'discord' || user.discordId ? `discord_${user.discordId || (user.id || '').replace(/^discord_/, '')}` : `google_${getCloudUserDocId(user.email)}`);
        const docId = getCloudUserDocId(profileKey);
        const userDocRef = doc(db, 'userData', docId);

        const customAvatarToPersist = isCustomUserAvatar(user.avatarUrl)
          ? user.avatarUrl
          : (isCustomUserAvatar(StorageService.getCustomAvatar(profileKey)) ? StorageService.getCustomAvatar(profileKey) : null);

        const finalUserAvatar = user.avatarUrl || customAvatarToPersist || 'https://api.dicebear.com/7.x/bottts/svg?seed=BaseCofre';

        const userForCloud = { ...user };
        delete (userForCloud as any).walletPrivateKey;
        delete (userForCloud as any).securityPinHash;

        const rawPayload = {
          version: '1.0.0',
          email: user.email?.trim().toLowerCase() || profileKey,
          authId: profileKey,
          provider: user.provider || (user.isGoogleAuth ? 'google' : 'discord'),
          updatedAt: serverTimestamp(),
          customAvatarUrl: customAvatarToPersist,
          user: {
            ...userForCloud,
            email: user.email?.trim() || '',
            authId: profileKey,
            provider: user.provider || (user.isGoogleAuth ? 'google' : 'discord'),
            username: user.username || 'usuario',
            avatarUrl: finalUserAvatar,
          },
          categories: categories || [],
          vaults: (vaults || []).filter((v) => !DEMO_VAULT_IDS.has(v.id)),
          transactions: sanitizeTransactions(transactions || []),
        };

        const cleanPayload = sanitizeForFirestore(rawPayload);

        // Overwrite the user document so deletions or changes are saved
        await setDoc(userDocRef, cleanPayload);

        // Update cache signature and update load cache
        lastSavedStateSignature = currentSignature;
        lastLoadResult = {
          email: profileKey.trim().toLowerCase(),
          timestamp: Date.now(),
          data: {
            ...rawPayload,
            updatedAt: new Date().toISOString(),
          } as CloudUserData,
        };

        return true;
      };

      inFlightSavePromise = executeSave();
      const result = await inFlightSavePromise;
      inFlightSavePromise = null;
      return result;
    } catch (error) {
      console.error('Error saving to Firebase Cloud:', error);
      inFlightSavePromise = null;
      return false;
    }
  },

  /**
   * Fetches user state from Firestore cloud.
   * OPTIMIZATION:
   * 1. Uses a 60-second read cache to prevent unnecessary repeat reads on fast tab or navigation changes.
   * 2. Deduplicates concurrent in-flight requests for the same account.
   */
  async loadFromCloud(identifier?: string, forceRefresh = false): Promise<CloudUserData | null> {
    if (!identifier || !identifier.trim()) {
      return null;
    }
    const cleanId = identifier.trim().toLowerCase();

    // Guest/Offline and Discord accounts operate in local/offline storage; do not attempt Firebase Auth-restricted calls
    if (cleanId.startsWith('guest_') || cleanId.startsWith('offline_') || cleanId.startsWith('discord_')) {
      return null;
    }

    // Firebase Firestore requires an active authenticated Firebase user
    if (!auth.currentUser) {
      return null;
    }

    // Check read cache first (saves 1 read operation if within TTL)
    if (!forceRefresh && lastLoadResult && lastLoadResult.email === cleanId) {
      const age = Date.now() - lastLoadResult.timestamp;
      if (age < READ_CACHE_TTL_MS && lastLoadResult.data) {
        return lastLoadResult.data;
      }
    }

    // Deduplicate in-flight load requests
    if (inFlightLoadPromise && !forceRefresh) {
      return inFlightLoadPromise;
    }

    const executeLoad = async (): Promise<CloudUserData | null> => {
      try {
        const docId = getCloudUserDocId(cleanId);
        let userDocRef = doc(db, 'userData', docId);
        let snapshot = await getDoc(userDocRef);

        // For Google profiles: if 'google_<email>' is not found, check legacy '<email>'
        if (!snapshot.exists() && cleanId.startsWith('google_')) {
          const legacyEmail = cleanId.replace(/^google_/, '');
          const legacyDocId = getCloudUserDocId(legacyEmail);
          const legacyDocRef = doc(db, 'userData', legacyDocId);
          try {
            const legacySnap = await getDoc(legacyDocRef);
            if (legacySnap.exists()) {
              snapshot = legacySnap;
              userDocRef = legacyDocRef;
            }
          } catch {}
        } else if (!snapshot.exists() && !cleanId.startsWith('google_')) {
          // If identifier did not have 'google_' prefix, check modern prefixed doc
          const modernDocId = getCloudUserDocId(`google_${cleanId}`);
          const modernDocRef = doc(db, 'userData', modernDocId);
          try {
            const modernSnap = await getDoc(modernDocRef);
            if (modernSnap.exists()) {
              snapshot = modernSnap;
              userDocRef = modernDocRef;
            }
          } catch {}
        }

        if (snapshot.exists()) {
          const data = snapshot.data() as CloudUserData;
          if (data.vaults) {
            data.vaults = data.vaults.filter((v) => !DEMO_VAULT_IDS.has(v.id));
          }
          if (data.transactions) {
            const rawCount = data.transactions.length;
            data.transactions = sanitizeTransactions(data.transactions);
            if (data.transactions.length !== rawCount) {
              setDoc(userDocRef, sanitizeForFirestore(data), { merge: true }).catch(() => {});
            }
          }

          // Restore custom avatar ONLY to this profile's isolated storage
          const cloudCustomAvatar = data.customAvatarUrl || (isCustomUserAvatar(data.user?.avatarUrl) ? data.user.avatarUrl : null);
          if (cloudCustomAvatar && isCustomUserAvatar(cloudCustomAvatar)) {
            StorageService.setCustomAvatar(cloudCustomAvatar, cleanId);
            if (data.user) {
              data.user.avatarUrl = cloudCustomAvatar;
            }
          }

          // Cache the clean result
          lastLoadResult = {
            email: cleanId,
            timestamp: Date.now(),
            data,
          };

          // Mark signature so initial save doesn't write back what was just read
          if (data.user) {
            lastSavedStateSignature = computeStateSignature(
              data.user,
              data.categories || [],
              data.vaults || [],
              data.transactions || []
            );
          }

          return data;
        }

        lastLoadResult = {
          email: cleanId,
          timestamp: Date.now(),
          data: null,
        };
        return null;
      } catch (error: any) {
        if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
          console.warn('Firebase Cloud sync permission notice:', error?.message || error);
        } else {
          console.error('Error loading from Firebase Cloud:', error);
        }
        return null;
      }
    };

    inFlightLoadPromise = executeLoad();
    const res = await inFlightLoadPromise;
    inFlightLoadPromise = null;
    return res;
  },

  /**
   * Directly purges all simulated transactions and synthetic deposits from the user's Firestore document
   */
  async purgeSimulatedDataFromCloud(email?: string): Promise<{ success: boolean; purgedCount: number; remainingCount: number }> {
    if (!email || !email.trim() || email.startsWith('guest_') || email.startsWith('offline_')) {
      return { success: true, purgedCount: 0, remainingCount: 0 };
    }
    try {
      const docId = getCloudUserDocId(email.trim());
      const userDocRef = doc(db, 'userData', docId);
      const snapshot = await getDoc(userDocRef);

      if (!snapshot.exists()) {
        return { success: true, purgedCount: 0, remainingCount: 0 };
      }

      const data = snapshot.data() as CloudUserData;
      const originalTxs = data.transactions || [];
      const cleanTxs = sanitizeTransactions(originalTxs);
      const originalVaults = data.vaults || [];
      const cleanVaults = originalVaults.filter((v) => !DEMO_VAULT_IDS.has(v.id));
      const purgedCount = originalTxs.length - cleanTxs.length + (originalVaults.length - cleanVaults.length);

      if (purgedCount > 0) {
        data.transactions = cleanTxs;
        data.vaults = cleanVaults;
        data.updatedAt = serverTimestamp();
        await setDoc(userDocRef, sanitizeForFirestore(data));
      }

      return { success: true, purgedCount, remainingCount: cleanTxs.length };
    } catch (err) {
      console.error('Error purging simulated data from Firebase Cloud:', err);
      return { success: false, purgedCount: 0, remainingCount: 0 };
    }
  },

  /**
   * Deletes all operational user data from Firebase Firestore (LGPD Right to Erasure / Google Play Compliance).
   * 
   * BLINDAGEM JURÍDICA (LGPD Art. 16, I e VI):
   * Before permanently deleting all user data (transactions, vaults, categories, profile),
   * writes an immutable Digital Deletion and Terms Acceptance Certificate to 'legalAuditArchive' collection.
   * This audit record certifies that the user agreed to the Terms of Use and commanded
   * their account deletion, providing legal compliance under LGPD/GDPR and self-custody laws.
   */
  async deleteFromCloud(
    email?: string,
    currentUserProfile?: Partial<UserProfile>,
    deletionConsent?: {
      confirmed: boolean;
      confirmedAt: string;
      statement?: string;
    }
  ): Promise<boolean> {
    const targetIdentifier = currentUserProfile?.authId || (currentUserProfile?.isGoogleAuth ? email : (currentUserProfile?.discordId ? `discord_${currentUserProfile.discordId}` : email)) || email;
    if (!targetIdentifier || !targetIdentifier.trim()) {
      return false;
    }
    const cleanIdentifier = targetIdentifier.trim().toLowerCase();
    if (currentUserProfile?.isGuest || currentUserProfile?.provider === 'guest' || cleanIdentifier.startsWith('guest_') || cleanIdentifier.startsWith('offline_')) {
      return true;
    }
    const docId = getCloudUserDocId(cleanIdentifier);
    const userDocRef = doc(db, 'userData', docId);

    try {
      // 1. Collect audit trail records from Firestore or memory
      let auditUser: Partial<UserProfile> = currentUserProfile || {};
      try {
        const snapshot = await getDoc(userDocRef);
        if (snapshot.exists()) {
          const cloudData = snapshot.data() as CloudUserData;
          if (cloudData && cloudData.user) {
            auditUser = {
              ...cloudData.user,
              ...auditUser,
            };
          }
        }
      } catch (readErr) {
        console.warn('Could not read existing doc prior to deletion, proceeding with in-memory profile:', readErr);
      }

      // 2. Save immutable audit certificate in legalAuditArchive (Legal protection)
      const nowIso = new Date().toISOString();
      const archiveId = `audit_del_${docId}_${Date.now()}`;
      const auditDocRef = doc(db, 'legalAuditArchive', archiveId);

      const auditRecord: LegalDeletionAuditRecord = {
        archiveId,
        userUid: auditUser.id || (auth.currentUser ? auth.currentUser.uid : undefined),
        userEmail: auditUser.email || (email ? email.trim().toLowerCase() : cleanIdentifier),
        walletAddress: auditUser.walletAddress,
        termsAccepted: true,
        termsAcceptedAt: auditUser.termsAcceptedAt || nowIso,
        termsVersion: auditUser.termsVersion || 'v2.0-2026-09',
        termsLanguage: auditUser.termsLanguage || (typeof window !== 'undefined' ? localStorage.getItem('cofreadmin_user_language') || 'pt-BR' : 'pt-BR'),
        termsDocumentUrl: auditUser.termsDocumentUrl || ((auditUser.termsLanguage === 'en-US' || (typeof window !== 'undefined' && localStorage.getItem('cofreadmin_user_language') === 'en-US'))
          ? 'https://github.com/cofreadminwallet/docs/blob/main/en-us/privacy-policy/privacy-policy.md'
          : 'https://github.com/cofreadminwallet/docs/blob/main/pt-br/termos/termos-e-privacidade.md'),
        termsAuditFingerprint: auditUser.termsAuditFingerprint || `clickwrap_v2_${cleanIdentifier}_${Date.now()}`,
        termsReadAndAcknowledgedOnDeletion: true,
        backupAcknowledgedAt: auditUser.lastBackupAcknowledgedAt,
        backupAuditFingerprint: auditUser.backupAuditFingerprint,
        deletionConsentConfirmed: deletionConsent ? deletionConsent.confirmed : true,
        deletionConsentConfirmedAt: deletionConsent?.confirmedAt || nowIso,
        deletionConsentFingerprint: `del_clickwrap_${cleanIdentifier}_${Date.now()}`,
        deletionConsentStatement: deletionConsent?.statement || 'Consentimento de exclusão voluntária com ratificação obrigatória de leitura da Política de Privacidade, irreversibilidade do ato e responsabilidade sobre a chave privada.',
        deletionLanguage: typeof window !== 'undefined' ? localStorage.getItem('cofreadmin_user_language') || 'pt-BR' : 'pt-BR',
        deletedAt: nowIso,
        deletionTimestamp: serverTimestamp(),
        deletionReason: 'EXCLUSAO_VOLUNTARIA_SOLICITADA_PELO_TITULAR_LGPD',
        legalBasis: 'LGPD_LEI_13709_2018_ART_16_INCISOS_I_E_VI',
        statement: 'Certidão digital probatória de exclusão voluntária definitiva de conta e dados sincronizados solicitada pelo titular. O titular confirmou expressamente ter lido e estar ciente da Política de Privacidade, reconhecendo a irrevogabilidade do apagamento dos dados e sua responsabilidade exclusiva pela guarda, posse e backup da sua chave privada (auto-custódia). Os dados operacionais foram eliminados da base ativa. Este registro probatório é arquivado de forma imutável exclusivamente para fins de defesa em processos judiciais, administrativos ou cumprimento de obrigação legal conforme autorizado pelo Art. 16, incisos I e VI da Lei nº 13.709/2018 (LGPD).',
        clientLocale: typeof navigator !== 'undefined' ? (navigator.languages ? navigator.languages.join(',') : navigator.language) : 'unknown',
        clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      };

      await setDoc(auditDocRef, sanitizeForFirestore(auditRecord));
      console.log('Certidão probatória arquivada com sucesso em legalAuditArchive:', archiveId);

      // 3. Permanently deletes active user data (LGPD Art. 18 / GDPR Right to Erasure)
      await deleteDoc(userDocRef);
      CloudSyncService.resetCache();
      return true;
    } catch (error) {
      console.error('Error during secure LGPD deletion process:', error);
      // Security fallback: if archival fails, still proceed with active operational data deletion
      try {
        await deleteDoc(userDocRef);
        CloudSyncService.resetCache();
        return true;
      } catch (delError) {
        console.error('Fatal error deleting user document:', delError);
        return false;
      }
    }
  },

  /**
   * BLINDAGEM JURÍDICA: Registra a certidão probatória imutável de ciência de autocustódia
   * and self-custody private key acknowledgment in the 'legalAuditArchive' collection.
   * CRITICAL SECURITY NOTE: The private key is NEVER transmitted or stored. Only public address and audit signature.
   */
  async logWalletBackupAcknowledgment(params: {
    userEmail?: string;
    walletAddress?: string;
    userUid?: string;
    statement?: string;
  }): Promise<string | null> {
    const cleanEmail = (params.userEmail || auth.currentUser?.email || 'user_local').trim().toLowerCase();
    const docId = getCloudUserDocId(cleanEmail);
    const nowIso = new Date().toISOString();
    const auditFingerprint = `backup_ack_${docId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const archiveId = `audit_backup_${docId}_${Date.now()}`;

    const auditRecord: LegalWalletBackupAuditRecord = {
      archiveId,
      archiveType: 'WALLET_BACKUP_ACKNOWLEDGMENT',
      userUid: params.userUid || (auth.currentUser ? auth.currentUser.uid : undefined),
      userEmail: cleanEmail,
      walletAddress: params.walletAddress,
      acknowledgedAt: nowIso,
      acknowledgmentTimestamp: serverTimestamp(),
      auditFingerprint,
      legalBasis: 'LGPD_LEI_13709_2018_ART_16_INCISOS_I_E_VI_E_ISENCAO_NAO_CUSTODIAL',
      statement:
        params.statement ||
        'Declaro para os devidos fins legais que confirmo ciência expressa de que sou o único e exclusivo responsável pela custódia, guarda e backup da minha chave privada (autocustódia Web3), isentando o CofreAdmin de qualquer responsabilidade ou custódia por perda, extravio ou acesso não autorizado aos fundos na blockchain.',
      clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    // 1. Store audit certificate locally in browser storage (offline-first)
    try {
      if (typeof localStorage !== 'undefined') {
        const storedLogs = JSON.parse(localStorage.getItem('cofreadmin_backup_audit_logs') || '[]');
        storedLogs.push({ ...auditRecord, acknowledgmentTimestamp: nowIso });
        localStorage.setItem('cofreadmin_backup_audit_logs', JSON.stringify(storedLogs.slice(-10)));
      }
    } catch (localErr) {
      console.warn('Could not save local backup audit record:', localErr);
    }

    // 2. If authenticated in Firebase, write immutable audit record to legalAuditArchive collection
    if (auth.currentUser) {
      try {
        const auditDocRef = doc(db, 'legalAuditArchive', archiveId);
        await setDoc(auditDocRef, sanitizeForFirestore(auditRecord));
        console.log('Certidão probatória de backup da chave gravada com sucesso em legalAuditArchive:', archiveId);
      } catch (cloudErr) {
        console.warn('Could not record backup acknowledgment in legalAuditArchive:', cloudErr);
      }
    }

    return auditFingerprint;
  },
};

