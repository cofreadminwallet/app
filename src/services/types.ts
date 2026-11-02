import type {
  TransactionType,
  Category,
  Vault,
  Transaction,
  OnChainLedgerEntry,
  SavedContact,
  UserProfile,
  NeoTheme,
  TabType,
  PeriodFilter,
  TypeFilter,
} from '../types';

export type {
  TransactionType,
  Category,
  Vault,
  Transaction,
  OnChainLedgerEntry,
  SavedContact,
  UserProfile,
  NeoTheme,
  TabType,
  PeriodFilter,
  TypeFilter,
};

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | string;

/**
 * Base interface for multi-tenant support (user / professional / organization)
 */
export interface TenantEntity {
  userId?: string;
  doctorId?: string;
}

export type TenantCategory = Category & TenantEntity;
export type TenantVault = Vault & TenantEntity;
export type TenantTransaction = Transaction & TenantEntity;
export type TenantOnChainLedgerEntry = OnChainLedgerEntry & TenantEntity;
export type TenantSavedContact = SavedContact & TenantEntity;
export type TenantUserProfile = UserProfile & TenantEntity;

export interface CloudUserData extends TenantEntity {
  user: UserProfile;
  email?: string;
  customAvatarUrl?: string;
  categories: Category[];
  vaults: Vault[];
  transactions: Transaction[];
  onchainLedger?: OnChainLedgerEntry[];
  contacts?: SavedContact[];
  updatedAt: string;
  encryptedWalletBackup?: string;
  walletAddress?: string;
  schemaVersion?: number;
}

export interface MergedCloudUserData extends CloudUserData {
  hasMergedLocalItems: boolean;
}

export interface WalletBackupAckParams {
  userEmail?: string;
  walletAddress: string;
  userUid?: string;
  statement?: string;
  action?: 'INITIAL_BACKUP' | 'MANUAL_EXPORT' | 'SEED_REVEAL';
}

export interface CloudDeletionConsent {
  confirmed: boolean;
  confirmedAt: string;
  statement?: string;
}

export interface AuthenticatedSessionUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  name: string;
  photoURL: string;
  picture: string;
}

export interface BillingPlanStatus {
  planId: 'FREE_SELF_CUSTODY' | 'PRO_VAULT' | 'ENTERPRISE';
  name: string;
  protocolFeeRate: number;
  minProtocolFeeUsd: number;
  maxVaults: number;
  cloudSyncEnabled: boolean;
}

export interface StorageQuotaStatus {
  usedBytes: number;
  maxBytes: number;
  percentageUsed: number;
}

/**
 * Authentication Contract (IAuthService)
 * Decouples identity provider (Firebase Auth, OAuth, Supabase Auth, Auth0, etc.)
 */
export interface IAuthService {
  signIn(): Promise<{ user: AuthenticatedSessionUser }>;
  signInWithGoogle(): Promise<AuthenticatedSessionUser>;
  signOut(): Promise<void>;
  getCurrentUser(): AuthenticatedSessionUser | null;
  onAuthStateChanged(callback: (user: AuthenticatedSessionUser | null) => void): () => void;
  verifyActiveSessionToken(forceRefresh?: boolean): Promise<boolean>;
  saveOAuthHandshake(payload: string): Promise<void>;
  consumeOAuthHandshake(): Promise<string | null>;
  consumeOAuthHandshakeSync(): string | null;
  clearOAuthHandshake(): Promise<void>;
  clearOAuthHandshakeSync(): void;
}

/**
 * Billing Plans, Protocol Fees and Storage Contract (IBillingService)
 */
export interface IBillingService {
  getPlanStatus(userId?: string): Promise<BillingPlanStatus>;
  getStorageQuota(userId?: string): Promise<StorageQuotaStatus>;
  calculateProtocolFee(amountUsdc: number): Promise<{ feeUsdc: number; netAmountUsdc: number; rate: number }>;
}

/**
 * Primary Database Contract (IDatabaseService - Repository Pattern)
 * Contains all asynchronous methods (Promise<...>) for reading, writing, editing,
 * deleting, cloud syncing and legal auditing, plus synchronous fast-hydration selectors
 * to prevent flickering during initial React lifecycle.
 */
export interface IDatabaseService {
  // --- Active Profile and Scope Isolation (Multi-Tenant: userId / doctorId / profileKey) ---
  getActiveProfileId(): Promise<string>;
  getActiveProfileKey(): string;
  setActiveProfileId(idOrEmail: string | null): Promise<void>;
  setActiveProfileKey(idOrEmail: string | null): void;

  // --- User / Profile ---
  getUserAsync(profileKey?: string): Promise<UserProfile>;
  getUser(profileKey?: string): UserProfile;
  saveUser(user: UserProfile, profileKey?: string): Promise<void>;
  getCustomAvatar(profileKey?: string): string | null;
  getCustomAvatarAsync(profileKey?: string): Promise<string | null>;
  setCustomAvatar(avatarData: string, profileKey?: string): Promise<void>;
  clearCustomAvatar(profileKey?: string): Promise<void>;
  getPersistedAvatar(profileKey?: string): string | null;
  setPersistedAvatar(avatarData: string, profileKey?: string): Promise<void>;

  // --- Categories ---
  getCategoriesAsync(profileKey?: string): Promise<Category[]>;
  getCategories(profileKey?: string): Category[];
  saveCategories(categories: Category[], profileKey?: string): Promise<void>;

  // --- Vaults ---
  getVaultsAsync(profileKey?: string): Promise<Vault[]>;
  getVaults(profileKey?: string): Vault[];
  saveVaults(vaults: Vault[], profileKey?: string): Promise<void>;

  // --- Transactions ---
  getTransactionsAsync(profileKey?: string): Promise<Transaction[]>;
  getTransactions(profileKey?: string): Transaction[];
  saveTransactions(transactions: Transaction[], profileKey?: string): Promise<void>;

  // --- On-Chain Ledger ---
  getOnChainLedgerAsync(profileKey?: string): Promise<OnChainLedgerEntry[]>;
  getOnChainLedger(profileKey?: string): OnChainLedgerEntry[];
  saveOnChainLedger(entries: OnChainLedgerEntry[], profileKey?: string): Promise<void>;
  recordOnChainEntry(entry: OnChainLedgerEntry, profileKey?: string): OnChainLedgerEntry[];

  // --- Web3 Address Book / Contacts ---
  getContactsAsync(profileKey?: string): Promise<SavedContact[]>;
  getContacts(profileKey?: string): SavedContact[];
  saveContacts(contacts: SavedContact[], profileKey?: string): Promise<void>;
  upsertContact(contact: Omit<SavedContact, 'id' | 'createdAt'> & { id?: string }, profileKey?: string): SavedContact[];
  deleteContact(id: string, profileKey?: string): SavedContact[];

  // --- UI Preferences and On-Chain Notifications ---
  getShowNativeUsdc(): Promise<boolean>;
  getShowNativeUsdcSync(): boolean;
  saveShowNativeUsdc(value: boolean): Promise<void>;
  getNotifiedTxHashes(profileKey?: string): Set<string>;
  markTxHashesNotified(hashes: string[], profileKey?: string): void;

  // --- Web3 Key Vault Encrypted Storage (Local Key Vault) ---
  getWalletKeyCipher(storageKey: string): Promise<string | null>;
  getWalletKeyCipherSync(storageKey: string): string | null;
  saveWalletKeyCipher(storageKey: string, cipher: string): Promise<void>;

  // --- Cloud Sync, Backup and Legal Audit (LGPD / Civil Rights Framework for the Internet) ---
  saveToCloud(
    userOrId: UserProfile | string,
    categoriesOrData?: Category[] | Omit<CloudUserData, 'updatedAt'>,
    vaults?: Vault[],
    transactions?: Transaction[]
  ): Promise<boolean>;
  loadFromCloud(userIdOrEmail: string, email?: string, uid?: string): Promise<CloudUserData | null>;
  purgeSimulatedDataFromCloud(
    userIdOrEmail: string,
    email?: string,
    currentVaults?: Vault[]
  ): Promise<{ success: boolean; purgedCount: number }>;
  deleteFromCloud(
    emailOrId: string,
    user?: UserProfile,
    deletionConsent?: CloudDeletionConsent
  ): Promise<boolean>;
  logWalletBackupAcknowledgment(
    paramsOrUserId: WalletBackupAckParams | string,
    email?: string,
    walletAddress?: string,
    action?: 'INITIAL_BACKUP' | 'MANUAL_EXPORT' | 'SEED_REVEAL'
  ): Promise<string | null>;
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
  ): MergedCloudUserData;
  resetCache(): void;

  // --- Simulated Data Purge / Factory Reset / Hard Deletion ---
  purgeSimulatedData(profileKey?: string): { purgedCount: number };
  resetToDefaults(profileKey?: string): void;
  clearAll(): Promise<void>;
  clearAllHard(): Promise<void>;
}
