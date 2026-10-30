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
  IDatabaseService,
  IAuthService,
  IBillingService,
  BillingPlanStatus,
  StorageQuotaStatus,
  AuthenticatedSessionUser,
} from './types';
import { LocalStorageDatabaseService, localStorageDb } from './localStorageDb';
import { FirebaseDatabaseService, FirebaseAuthService, firebaseDb, firebaseAuth } from './firebaseDb';

/**
 * Unified Current Repository (CurrentDatabaseService)
 * Implements the Hybrid architecture (Offline-First via LocalStorage + Cloud Sync via Firebase Firestore).
 * Any future database migration (Supabase, PostgreSQL, REST API) can replace
 * this class or be injected in `src/services/index.ts` without modifying any React screens.
 */
export class CurrentDatabaseService implements IDatabaseService {
  private local: LocalStorageDatabaseService;
  private cloud: FirebaseDatabaseService;

  constructor(
    localRepo: LocalStorageDatabaseService = localStorageDb,
    cloudRepo: FirebaseDatabaseService = firebaseDb
  ) {
    this.local = localRepo;
    this.cloud = cloudRepo;
  }

  // --- Active Profile and Scope Isolation (Multi-Tenant: userId / doctorId / profileKey) ---
  getActiveProfileKey(): string {
    return this.local.getActiveProfileKey();
  }

  async getActiveProfileId(): Promise<string> {
    return this.local.getActiveProfileId();
  }

  setActiveProfileKey(idOrEmail: string | null): void {
    this.local.setActiveProfileKey(idOrEmail);
  }

  async setActiveProfileId(idOrEmail: string | null): Promise<void> {
    await this.local.setActiveProfileId(idOrEmail);
  }

  // --- User / Profile ---
  getUser(profileKey?: string): UserProfile {
    return this.local.getUser(profileKey);
  }

  async getUserAsync(profileKey?: string): Promise<UserProfile> {
    return this.local.getUserAsync(profileKey);
  }

  async saveUser(user: UserProfile, profileKey?: string): Promise<void> {
    await this.local.saveUser(user, profileKey);
  }

  getCustomAvatar(profileKey?: string): string | null {
    return this.local.getCustomAvatar(profileKey);
  }

  async getCustomAvatarAsync(profileKey?: string): Promise<string | null> {
    return this.local.getCustomAvatarAsync(profileKey);
  }

  async setCustomAvatar(avatarData: string, profileKey?: string): Promise<void> {
    await this.local.setCustomAvatar(avatarData, profileKey);
  }

  async clearCustomAvatar(profileKey?: string): Promise<void> {
    await this.local.clearCustomAvatar(profileKey);
  }

  getPersistedAvatar(profileKey?: string): string | null {
    return this.local.getPersistedAvatar(profileKey);
  }

  async setPersistedAvatar(avatarData: string, profileKey?: string): Promise<void> {
    await this.local.setPersistedAvatar(avatarData, profileKey);
  }

  // --- Categories ---
  getCategories(profileKey?: string): Category[] {
    return this.local.getCategories(profileKey);
  }

  async getCategoriesAsync(profileKey?: string): Promise<Category[]> {
    return this.local.getCategoriesAsync(profileKey);
  }

  async saveCategories(categories: Category[], profileKey?: string): Promise<void> {
    await this.local.saveCategories(categories, profileKey);
  }

  // --- Vaults ---
  getVaults(profileKey?: string): Vault[] {
    return this.local.getVaults(profileKey);
  }

  async getVaultsAsync(profileKey?: string): Promise<Vault[]> {
    return this.local.getVaultsAsync(profileKey);
  }

  async saveVaults(vaults: Vault[], profileKey?: string): Promise<void> {
    await this.local.saveVaults(vaults, profileKey);
  }

  // --- Transactions ---
  getTransactions(profileKey?: string): Transaction[] {
    return this.local.getTransactions(profileKey);
  }

  async getTransactionsAsync(profileKey?: string): Promise<Transaction[]> {
    return this.local.getTransactionsAsync(profileKey);
  }

  async saveTransactions(transactions: Transaction[], profileKey?: string): Promise<void> {
    await this.local.saveTransactions(transactions, profileKey);
  }

  // --- On-Chain Ledger ---
  getOnChainLedger(profileKey?: string): OnChainLedgerEntry[] {
    return this.local.getOnChainLedger(profileKey);
  }

  async getOnChainLedgerAsync(profileKey?: string): Promise<OnChainLedgerEntry[]> {
    return this.local.getOnChainLedgerAsync(profileKey);
  }

  async saveOnChainLedger(entries: OnChainLedgerEntry[], profileKey?: string): Promise<void> {
    await this.local.saveOnChainLedger(entries, profileKey);
  }

  recordOnChainEntry(entry: OnChainLedgerEntry, profileKey?: string): OnChainLedgerEntry[] {
    return this.local.recordOnChainEntry(entry, profileKey);
  }

  // --- Web3 Address Book / Contacts ---
  getContacts(profileKey?: string): SavedContact[] {
    return this.local.getContacts(profileKey);
  }

  async getContactsAsync(profileKey?: string): Promise<SavedContact[]> {
    return this.local.getContactsAsync(profileKey);
  }

  async saveContacts(contacts: SavedContact[], profileKey?: string): Promise<void> {
    await this.local.saveContacts(contacts, profileKey);
  }

  upsertContact(
    contact: Omit<SavedContact, 'id' | 'createdAt'> & { id?: string },
    profileKey?: string
  ): SavedContact[] {
    return this.local.upsertContact(contact, profileKey);
  }

  deleteContact(id: string, profileKey?: string): SavedContact[] {
    return this.local.deleteContact(id, profileKey);
  }

  // --- UI Preferences and On-Chain Notifications ---
  getShowNativeUsdcSync(): boolean {
    return this.local.getShowNativeUsdcSync();
  }

  async getShowNativeUsdc(): Promise<boolean> {
    return this.local.getShowNativeUsdc();
  }

  async saveShowNativeUsdc(value: boolean): Promise<void> {
    await this.local.saveShowNativeUsdc(value);
  }

  getNotifiedTxHashes(profileKey?: string): Set<string> {
    return this.local.getNotifiedTxHashes(profileKey);
  }

  markTxHashesNotified(hashes: string[], profileKey?: string): void {
    this.local.markTxHashesNotified(hashes, profileKey);
  }

  // --- Web3 Key Vault Encrypted Storage (Local Key Vault) ---
  getWalletKeyCipherSync(storageKey: string): string | null {
    return this.local.getWalletKeyCipherSync(storageKey);
  }

  async getWalletKeyCipher(storageKey: string): Promise<string | null> {
    return this.local.getWalletKeyCipher(storageKey);
  }

  async saveWalletKeyCipher(storageKey: string, cipher: string): Promise<void> {
    await this.local.saveWalletKeyCipher(storageKey, cipher);
  }

  // --- Cloud Sync, Backup and Legal Audit ---
  async saveToCloud(
    userOrId: UserProfile | string,
    categoriesOrData?: Category[] | Omit<CloudUserData, 'updatedAt'>,
    vaults?: Vault[],
    transactions?: Transaction[]
  ): Promise<boolean> {
    return this.cloud.saveToCloud(userOrId, categoriesOrData, vaults, transactions);
  }

  async loadFromCloud(userIdOrEmail: string, email?: string, uid?: string): Promise<CloudUserData | null> {
    return this.cloud.loadFromCloud(userIdOrEmail, email, uid);
  }

  async purgeSimulatedDataFromCloud(
    userIdOrEmail: string,
    email?: string,
    currentVaults: Vault[] = []
  ): Promise<{ success: boolean; purgedCount: number }> {
    return this.cloud.purgeSimulatedDataFromCloud(userIdOrEmail, email, currentVaults);
  }

  async deleteFromCloud(
    emailOrId: string,
    user?: UserProfile,
    deletionConsent?: CloudDeletionConsent
  ): Promise<boolean> {
    return this.cloud.deleteFromCloud(emailOrId, user, deletionConsent);
  }

  async logWalletBackupAcknowledgment(
    paramsOrUserId: WalletBackupAckParams | string,
    email?: string,
    walletAddress?: string,
    action?: 'INITIAL_BACKUP' | 'MANUAL_EXPORT' | 'SEED_REVEAL'
  ): Promise<string | null> {
    return this.cloud.logWalletBackupAcknowledgment(paramsOrUserId, email, walletAddress, action);
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
    return this.cloud.mergeLocalAndCloudData(local, cloud);
  }

  resetCache(): void {
    this.cloud.resetCache();
  }

  // --- Simulated Data Purge / Factory Reset / Hard Deletion ---
  purgeSimulatedData(profileKey?: string): { purgedCount: number } {
    return this.local.purgeSimulatedData(profileKey);
  }

  resetToDefaults(profileKey?: string): void {
    this.local.resetToDefaults(profileKey);
  }

  async clearAll(): Promise<void> {
    await this.local.clearAll();
  }

  async clearAllHard(): Promise<void> {
    await this.local.clearAllHard();
  }
}

/**
 * Current Authentication Service (CurrentAuthService)
 */
export class CurrentAuthService implements IAuthService {
  private provider: FirebaseAuthService;

  constructor(provider: FirebaseAuthService = firebaseAuth) {
    this.provider = provider;
  }

  async signIn(): Promise<{ user: AuthenticatedSessionUser }> {
    return this.provider.signIn();
  }

  async signInWithGoogle(): Promise<AuthenticatedSessionUser> {
    return this.provider.signInWithGoogle();
  }

  async signOut(): Promise<void> {
    return this.provider.signOut();
  }

  getCurrentUser(): AuthenticatedSessionUser | null {
    return this.provider.getCurrentUser();
  }

  onAuthStateChanged(callback: (user: AuthenticatedSessionUser | null) => void): () => void {
    return this.provider.onAuthStateChanged(callback);
  }

  async verifyActiveSessionToken(forceRefresh = true): Promise<boolean> {
    return this.provider.verifyActiveSessionToken(forceRefresh);
  }

  async saveOAuthHandshake(payload: string): Promise<void> {
    return this.provider.saveOAuthHandshake(payload);
  }

  consumeOAuthHandshakeSync(): string | null {
    return this.provider.consumeOAuthHandshakeSync();
  }

  async consumeOAuthHandshake(): Promise<string | null> {
    return this.provider.consumeOAuthHandshake();
  }

  clearOAuthHandshakeSync(): void {
    this.provider.clearOAuthHandshakeSync();
  }

  async clearOAuthHandshake(): Promise<void> {
    return this.provider.clearOAuthHandshake();
  }
}

/**
 * Plans, Protocol Fees and Storage Service (CurrentBillingService)
 */
export class CurrentBillingService implements IBillingService {
  async getPlanStatus(_userId?: string): Promise<BillingPlanStatus> {
    return {
      planId: 'FREE_SELF_CUSTODY',
      name: 'Autocustódia Web3 + Cloud Sync',
      protocolFeeRate: 0.002, // 0.2% protocol fee
      minProtocolFeeUsd: 0.05,
      maxVaults: 50,
      cloudSyncEnabled: true,
    };
  }

  async getStorageQuota(userId?: string): Promise<StorageQuotaStatus> {
    const txs = localStorageDb.getTransactions(userId);
    const vaults = localStorageDb.getVaults(userId);
    const ledger = localStorageDb.getOnChainLedger(userId);
    const usedBytes = new Blob([JSON.stringify({ txs, vaults, ledger })]).size;
    const maxBytes = 5 * 1024 * 1024;
    return {
      usedBytes,
      maxBytes,
      percentageUsed: Math.min(100, Number(((usedBytes / maxBytes) * 100).toFixed(2))),
    };
  }

  async calculateProtocolFee(
    amountUsdc: number
  ): Promise<{ feeUsdc: number; netAmountUsdc: number; rate: number }> {
    const rate = 0.002;
    const feeUsdc = Math.max(0.05, Number((amountUsdc * rate).toFixed(4)));
    const netAmountUsdc = Math.max(0, Number((amountUsdc - feeUsdc).toFixed(4)));
    return { feeUsdc, netAmountUsdc, rate };
  }
}
