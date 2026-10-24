import type {
  Category,
  Vault,
  Transaction,
  OnChainLedgerEntry,
  SavedContact,
  UserProfile,
} from './types';
import {
  DEFAULT_USER,
  DEFAULT_CATEGORIES,
  DEFAULT_VAULTS,
  DEFAULT_TRANSACTIONS,
} from '../utils/initialData';
import {
  sanitizeTransactions,
  sanitizeLedgerEntries,
} from '../utils/transactionSanitizer';

export {
  DEFAULT_USER,
  DEFAULT_CATEGORIES,
  DEFAULT_VAULTS as INITIAL_VAULTS,
  DEFAULT_TRANSACTIONS as INITIAL_TRANSACTIONS,
};

const STORAGE_KEYS = {
  USER: 'cofreadmin_user',
  CATEGORIES: 'cofreadmin_categories',
  VAULTS: 'cofreadmin_vaults',
  TRANSACTIONS: 'cofreadmin_transactions',
  ONCHAIN_LEDGER: 'cofreadmin_onchain_ledger',
  CONTACTS: 'cofreadmin_contacts',
  CUSTOM_AVATAR: 'cofreadmin_custom_avatar',
  AVATAR_BACKUP: 'cofreadmin_avatar_backup_',
  ACTIVE_PROFILE: 'cofreadmin_active_profile',
  SHOW_NATIVE_USDC: 'cofreadmin_show_native_usdc',
  OAUTH_HANDSHAKE: 'cofre_discord_auth_success',
};

export const getProfileStorageKey = (
  input?: string | UserProfile | null
): string => {
  if (!input) return 'anonymous';
  if (typeof input === 'object') {
    const rawKey = input.authId || input.email || input.id || 'anonymous';
    return rawKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }
  return input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
};

export const isDefaultOrPlaceholderAvatar = (url?: string | null): boolean => {
  if (!url) return true;
  if (url.includes('images.unsplash.com/photo-1535713875002-d1d0cf377fde')) return true;
  if (url.includes('ui-avatars.com')) return true;
  if (url.includes('seed=BaseCofre')) return true;
  return false;
};

export const isCustomUserAvatar = (url?: string | null): boolean => {
  if (!url) return false;
  if (isDefaultOrPlaceholderAvatar(url)) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) return false;
  return true;
};

/**
 * Local Storage Implementation (LocalStorageDatabaseService)
 * Centralizes 100% of business logic localStorage/sessionStorage accesses in the application.
 */
export class LocalStorageDatabaseService {
  getActiveProfileKey(): string {
    if (typeof window === 'undefined') return 'anonymous';
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE) || 'anonymous';
  }

  async getActiveProfileId(): Promise<string> {
    return this.getActiveProfileKey();
  }

  setActiveProfileKey(idOrEmail: string | null): void {
    if (typeof window === 'undefined') return;
    if (!idOrEmail) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE);
    } else {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, getProfileStorageKey(idOrEmail));
    }
  }

  async setActiveProfileId(idOrEmail: string | null): Promise<void> {
    this.setActiveProfileKey(idOrEmail);
  }

  private getScopedKey(baseKey: string, profileKey?: string): string {
    const resolvedProfile = profileKey ? getProfileStorageKey(profileKey) : this.getActiveProfileKey();
    return `${baseKey}_${resolvedProfile}`;
  }

  private getStorageDataWithFallbacks(baseKey: string, profileKey?: string): string | null {
    if (typeof window === 'undefined') return null;
    const resolvedProfile = profileKey ? getProfileStorageKey(profileKey) : this.getActiveProfileKey();
    const primaryKey = `${baseKey}_${resolvedProfile}`;
    const directData = localStorage.getItem(primaryKey);
    if (directData) return directData;

    // Fallback 1: check if key was saved without 'google_' / 'discord_' prefix or vice versa
    if (resolvedProfile.startsWith('google_')) {
      const stripped = resolvedProfile.slice('google_'.length);
      const fallbackData = localStorage.getItem(`${baseKey}_${stripped}`);
      if (fallbackData) return fallbackData;
    } else if (resolvedProfile.startsWith('discord_')) {
      const stripped = resolvedProfile.slice('discord_'.length);
      const fallbackData = localStorage.getItem(`${baseKey}_${stripped}`);
      if (fallbackData) return fallbackData;
    } else {
      const googleFallback = localStorage.getItem(`${baseKey}_google_${resolvedProfile}`);
      if (googleFallback) return googleFallback;
    }

    // Fallback 2: unscoped key
    const unscopedData = localStorage.getItem(baseKey);
    if (unscopedData) return unscopedData;

    return null;
  }

  getCustomAvatar(profileKey?: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const key = profileKey ? getProfileStorageKey(profileKey) : this.getActiveProfileKey();
      return (
        localStorage.getItem(`${STORAGE_KEYS.CUSTOM_AVATAR}_${key}`) ||
        localStorage.getItem(STORAGE_KEYS.AVATAR_BACKUP + key) ||
        localStorage.getItem(STORAGE_KEYS.CUSTOM_AVATAR)
      );
    } catch {
      return null;
    }
  }

  async getCustomAvatarAsync(profileKey?: string): Promise<string | null> {
    return this.getCustomAvatar(profileKey);
  }

  setCustomAvatarSync(avatarData: string, profileKey?: string): void {
    if (typeof window === 'undefined' || !avatarData) return;
    try {
      const key = profileKey ? getProfileStorageKey(profileKey) : this.getActiveProfileKey();
      localStorage.setItem(`${STORAGE_KEYS.CUSTOM_AVATAR}_${key}`, avatarData);
      localStorage.setItem(STORAGE_KEYS.AVATAR_BACKUP + key, avatarData);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_AVATAR, avatarData);
    } catch (e) {
      console.error('Erro ao salvar avatar customizado no localStorage:', e);
    }
  }

  async setCustomAvatar(avatarData: string, profileKey?: string): Promise<void> {
    this.setCustomAvatarSync(avatarData, profileKey);
  }

  clearCustomAvatarSync(profileKey?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const key = profileKey ? getProfileStorageKey(profileKey) : this.getActiveProfileKey();
      localStorage.removeItem(`${STORAGE_KEYS.CUSTOM_AVATAR}_${key}`);
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_AVATAR);
    } catch {}
  }

  async clearCustomAvatar(profileKey?: string): Promise<void> {
    this.clearCustomAvatarSync(profileKey);
  }

  getPersistedAvatar(profileKey?: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const key = profileKey ? getProfileStorageKey(profileKey) : this.getActiveProfileKey();
      return (
        localStorage.getItem(STORAGE_KEYS.AVATAR_BACKUP + key) ||
        localStorage.getItem(`${STORAGE_KEYS.CUSTOM_AVATAR}_${key}`)
      );
    } catch {
      return null;
    }
  }

  setPersistedAvatarSync(avatarData: string, profileKey?: string): void {
    if (typeof window === 'undefined' || !avatarData) return;
    try {
      const key = profileKey ? getProfileStorageKey(profileKey) : this.getActiveProfileKey();
      localStorage.setItem(STORAGE_KEYS.AVATAR_BACKUP + key, avatarData);
    } catch {}
  }

  async setPersistedAvatar(avatarData: string, profileKey?: string): Promise<void> {
    this.setPersistedAvatarSync(avatarData, profileKey);
  }

  getUser(profileKey?: string): UserProfile {
    if (typeof window === 'undefined') return { ...DEFAULT_USER };
    try {
      const activeProfile = profileKey ? getProfileStorageKey(profileKey) : this.getActiveProfileKey();
      const data = this.getStorageDataWithFallbacks(STORAGE_KEYS.USER, profileKey);

      if (!data) return { ...DEFAULT_USER };
      const parsed = JSON.parse(data) as Partial<UserProfile>;
      const user: UserProfile = {
        ...DEFAULT_USER,
        ...parsed,
      };

      const customAvatar = this.getCustomAvatar(activeProfile);
      if (customAvatar && isCustomUserAvatar(customAvatar) && !isCustomUserAvatar(user.avatarUrl)) {
        user.avatarUrl = customAvatar;
      }

      if (activeProfile === 'anonymous' && (user.authId || user.email || user.id)) {
        const derivedKey = user.authId || user.email || user.id;
        this.setActiveProfileKey(derivedKey);
        localStorage.setItem(this.getScopedKey(STORAGE_KEYS.USER, derivedKey), JSON.stringify(user));
      }

      return user;
    } catch {
      return { ...DEFAULT_USER };
    }
  }

  async getUserAsync(profileKey?: string): Promise<UserProfile> {
    return this.getUser(profileKey);
  }

  saveUserSync(user: UserProfile, profileKey?: string): void {
    if (typeof window === 'undefined') return;
    try {
      if (user) {
        const targetKey = profileKey || user.authId || user.email || user.id;
        if (targetKey) {
          this.setActiveProfileKey(targetKey);
        }
        if (isCustomUserAvatar(user.avatarUrl)) {
          this.setCustomAvatarSync(user.avatarUrl, targetKey);
        } else if (targetKey) {
          const existingCustom = this.getCustomAvatar(targetKey);
          if (existingCustom && isCustomUserAvatar(existingCustom)) {
            user.avatarUrl = existingCustom;
          }
        }
        const serialized = JSON.stringify(user);
        localStorage.setItem(this.getScopedKey(STORAGE_KEYS.USER, targetKey), serialized);
        localStorage.setItem(STORAGE_KEYS.USER, serialized);
      } else {
        localStorage.removeItem(this.getScopedKey(STORAGE_KEYS.USER, profileKey));
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch (e) {
      console.error('Erro ao salvar usuário no localStorage:', e);
    }
  }

  async saveUser(user: UserProfile, profileKey?: string): Promise<void> {
    this.saveUserSync(user, profileKey);
  }

  getCategories(profileKey?: string): Category[] {
    if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
    try {
      const data = this.getStorageDataWithFallbacks(STORAGE_KEYS.CATEGORIES, profileKey);
      if (!data) {
        this.saveCategoriesSync(DEFAULT_CATEGORIES, profileKey);
        return DEFAULT_CATEGORIES;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  async getCategoriesAsync(profileKey?: string): Promise<Category[]> {
    return this.getCategories(profileKey);
  }

  saveCategoriesSync(categories: Category[], profileKey?: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.getScopedKey(STORAGE_KEYS.CATEGORIES, profileKey), JSON.stringify(categories));
    } catch (e) {
      console.error('Erro ao salvar categorias:', e);
    }
  }

  async saveCategories(categories: Category[], profileKey?: string): Promise<void> {
    this.saveCategoriesSync(categories, profileKey);
  }

  getVaults(profileKey?: string): Vault[] {
    if (typeof window === 'undefined') return DEFAULT_VAULTS;
    try {
      const data = this.getStorageDataWithFallbacks(STORAGE_KEYS.VAULTS, profileKey);
      if (!data) {
        return DEFAULT_VAULTS;
      }
      const parsed: Vault[] = JSON.parse(data);
      const DEMO_VAULT_IDS = ['vault-1', 'vault-2', 'vault-3', 'vault_1', 'vault_2', 'vault_3', 'vault_4'];
      const filtered = (Array.isArray(parsed) ? parsed : []).filter(v => !DEMO_VAULT_IDS.includes(v.id));
      if (filtered.length !== parsed.length) {
        this.saveVaultsSync(filtered, profileKey);
      }
      return filtered;
    } catch {
      return DEFAULT_VAULTS;
    }
  }

  async getVaultsAsync(profileKey?: string): Promise<Vault[]> {
    return this.getVaults(profileKey);
  }

  saveVaultsSync(vaults: Vault[], profileKey?: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.getScopedKey(STORAGE_KEYS.VAULTS, profileKey), JSON.stringify(vaults));
    } catch (e) {
      console.error('Erro ao salvar cofres:', e);
    }
  }

  async saveVaults(vaults: Vault[], profileKey?: string): Promise<void> {
    this.saveVaultsSync(vaults, profileKey);
  }

  getTransactions(profileKey?: string): Transaction[] {
    if (typeof window === 'undefined') return DEFAULT_TRANSACTIONS;
    try {
      const data = this.getStorageDataWithFallbacks(STORAGE_KEYS.TRANSACTIONS, profileKey);
      if (!data) {
        return DEFAULT_TRANSACTIONS;
      }
      const parsed: Transaction[] = JSON.parse(data);
      const filtered = sanitizeTransactions(Array.isArray(parsed) ? parsed : []);
      if (filtered.length !== parsed.length) {
        this.saveTransactionsSync(filtered, profileKey);
      }
      return filtered;
    } catch {
      return DEFAULT_TRANSACTIONS;
    }
  }

  async getTransactionsAsync(profileKey?: string): Promise<Transaction[]> {
    return this.getTransactions(profileKey);
  }

  saveTransactionsSync(transactions: Transaction[], profileKey?: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        this.getScopedKey(STORAGE_KEYS.TRANSACTIONS, profileKey),
        JSON.stringify(transactions)
      );
    } catch (e) {
      console.error('Erro ao salvar transações:', e);
    }
  }

  async saveTransactions(transactions: Transaction[], profileKey?: string): Promise<void> {
    this.saveTransactionsSync(transactions, profileKey);
  }

  getOnChainLedger(profileKey?: string): OnChainLedgerEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = this.getStorageDataWithFallbacks(STORAGE_KEYS.ONCHAIN_LEDGER, profileKey);
      if (!data) return [];
      const parsed: OnChainLedgerEntry[] = JSON.parse(data);
      return sanitizeLedgerEntries(Array.isArray(parsed) ? parsed : []);
    } catch {
      return [];
    }
  }

  async getOnChainLedgerAsync(profileKey?: string): Promise<OnChainLedgerEntry[]> {
    return this.getOnChainLedger(profileKey);
  }

  saveOnChainLedgerSync(entries: OnChainLedgerEntry[], profileKey?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const map = new Map<string, OnChainLedgerEntry>();
      entries.forEach(entry => {
        if (entry && entry.txHash) {
          map.set(entry.txHash.toLowerCase(), entry);
        }
      });
      const deduped = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      localStorage.setItem(this.getScopedKey(STORAGE_KEYS.ONCHAIN_LEDGER, profileKey), JSON.stringify(deduped));
    } catch (e) {
      console.error('Erro ao salvar livro-razão on-chain:', e);
    }
  }

  async saveOnChainLedger(entries: OnChainLedgerEntry[], profileKey?: string): Promise<void> {
    this.saveOnChainLedgerSync(entries, profileKey);
  }

  recordOnChainEntry(entry: OnChainLedgerEntry, profileKey?: string): OnChainLedgerEntry[] {
    const current = this.getOnChainLedger(profileKey);
    const exists = current.some(item => item.txHash.toLowerCase() === entry.txHash.toLowerCase());
    const updated = exists
      ? current.map(item => (item.txHash.toLowerCase() === entry.txHash.toLowerCase() ? { ...item, ...entry } : item))
      : [entry, ...current];
    this.saveOnChainLedgerSync(updated, profileKey);
    return this.getOnChainLedger(profileKey);
  }

  getContacts(profileKey?: string): SavedContact[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = this.getStorageDataWithFallbacks(STORAGE_KEYS.CONTACTS, profileKey);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async getContactsAsync(profileKey?: string): Promise<SavedContact[]> {
    return this.getContacts(profileKey);
  }

  saveContactsSync(contacts: SavedContact[], profileKey?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const map = new Map<string, SavedContact>();
      contacts.forEach(c => {
        if (c && c.address && c.name) {
          map.set(c.address.toLowerCase(), {
            ...c,
            name: c.name.trim().slice(0, 60),
            address: c.address.trim(),
            ensName: c.ensName ? c.ensName.trim() : undefined,
          });
        }
      });
      const deduped = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem(this.getScopedKey(STORAGE_KEYS.CONTACTS, profileKey), JSON.stringify(deduped));
    } catch (e) {
      console.error('Erro ao salvar contatos:', e);
    }
  }

  async saveContacts(contacts: SavedContact[], profileKey?: string): Promise<void> {
    this.saveContactsSync(contacts, profileKey);
  }

  upsertContact(
    contact: Omit<SavedContact, 'id' | 'createdAt'> & { id?: string },
    profileKey?: string
  ): SavedContact[] {
    const current = this.getContacts(profileKey);
    const normalizedAddr = contact.address.trim().toLowerCase();
    const existingIndex = current.findIndex(c => c.address.toLowerCase() === normalizedAddr);

    let updated: SavedContact[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = {
        ...updated[existingIndex],
        name: contact.name.trim(),
        address: contact.address.trim(),
        ensName: contact.ensName ?? updated[existingIndex].ensName,
        emoji: contact.emoji ?? updated[existingIndex].emoji,
        isFavorite: contact.isFavorite ?? updated[existingIndex].isFavorite,
        lastUsedAt: new Date().toISOString(),
      };
    } else {
      const newContact: SavedContact = {
        id: contact.id || `contact-${Date.now()}`,
        name: contact.name.trim(),
        address: contact.address.trim(),
        ensName: contact.ensName,
        emoji: contact.emoji || '👤',
        isFavorite: contact.isFavorite ?? true,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      };
      updated = [...current, newContact];
    }

    this.saveContactsSync(updated, profileKey);
    return this.getContacts(profileKey);
  }

  deleteContact(id: string, profileKey?: string): SavedContact[] {
    const current = this.getContacts(profileKey);
    const updated = current.filter(c => c.id !== id);
    this.saveContactsSync(updated, profileKey);
    return this.getContacts(profileKey);
  }

  getShowNativeUsdcSync(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEYS.SHOW_NATIVE_USDC) === 'true';
    } catch {
      return false;
    }
  }

  async getShowNativeUsdc(): Promise<boolean> {
    return this.getShowNativeUsdcSync();
  }

  saveShowNativeUsdcSync(value: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.SHOW_NATIVE_USDC, String(value));
    } catch {}
  }

  async saveShowNativeUsdc(value: boolean): Promise<void> {
    this.saveShowNativeUsdcSync(value);
  }

  getNotifiedTxHashes(profileKey?: string): Set<string> {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const key = profileKey ? getProfileStorageKey(profileKey) : this.getActiveProfileKey();
      const raw = localStorage.getItem(`cofreadmin_notified_txs_${key}`);
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  }

  markTxHashesNotified(hashes: string[], profileKey?: string): void {
    if (typeof window === 'undefined' || !hashes.length) return;
    try {
      const key = profileKey ? getProfileStorageKey(profileKey) : this.getActiveProfileKey();
      const current = this.getNotifiedTxHashes(key);
      hashes.forEach(h => {
        if (h) current.add(h.toLowerCase());
      });
      const recentList = Array.from(current).slice(-150);
      localStorage.setItem(`cofreadmin_notified_txs_${key}`, JSON.stringify(recentList));
    } catch {}
  }

  purgeSimulatedData(profileKey?: string): { purgedCount: number } {
    if (typeof window === 'undefined') return { purgedCount: 0 };
    try {
      const scopedTxKey = this.getScopedKey(STORAGE_KEYS.TRANSACTIONS, profileKey);
      const rawTxs = localStorage.getItem(scopedTxKey);
      let purgedCount = 0;

      if (rawTxs) {
        const parsed: Transaction[] = JSON.parse(rawTxs);
        const clean = sanitizeTransactions(Array.isArray(parsed) ? parsed : []);
        if (clean.length !== parsed.length) {
          purgedCount += parsed.length - clean.length;
          this.saveTransactionsSync(clean, profileKey);
        }
      }

      const scopedLedgerKey = this.getScopedKey(STORAGE_KEYS.ONCHAIN_LEDGER, profileKey);
      const rawLedger = localStorage.getItem(scopedLedgerKey);
      if (rawLedger) {
        const parsedLedger: OnChainLedgerEntry[] = JSON.parse(rawLedger);
        const cleanLedger = sanitizeLedgerEntries(Array.isArray(parsedLedger) ? parsedLedger : []);
        if (cleanLedger.length !== parsedLedger.length) {
          purgedCount += parsedLedger.length - cleanLedger.length;
          this.saveOnChainLedgerSync(cleanLedger, profileKey);
        }
      }

      return { purgedCount };
    } catch {
      return { purgedCount: 0 };
    }
  }

  resetToDefaults(profileKey?: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(this.getScopedKey(STORAGE_KEYS.USER, profileKey));
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE);
    } catch {}
  }

  getWalletKeyCipherSync(storageKey: string): string | null {
    if (typeof window === 'undefined' || !storageKey) return null;
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  async getWalletKeyCipher(storageKey: string): Promise<string | null> {
    return this.getWalletKeyCipherSync(storageKey);
  }

  saveWalletKeyCipherSync(storageKey: string, cipher: string): void {
    if (typeof window === 'undefined' || !storageKey) return;
    try {
      localStorage.setItem(storageKey, cipher);
    } catch (e) {
      console.error('Erro ao salvar chave criptografada da carteira:', e);
    }
  }

  async saveWalletKeyCipher(storageKey: string, cipher: string): Promise<void> {
    this.saveWalletKeyCipherSync(storageKey, cipher);
  }

  saveOAuthHandshakeSync(payload: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.OAUTH_HANDSHAKE, payload);
    } catch {}
    try {
      sessionStorage.setItem(STORAGE_KEYS.OAUTH_HANDSHAKE, payload);
    } catch {}
  }

  async saveOAuthHandshake(payload: string): Promise<void> {
    this.saveOAuthHandshakeSync(payload);
  }

  consumeOAuthHandshakeSync(): string | null {
    if (typeof window === 'undefined') return null;
    let savedAuth: string | null = null;
    try {
      savedAuth =
        localStorage.getItem(STORAGE_KEYS.OAUTH_HANDSHAKE) ||
        sessionStorage.getItem(STORAGE_KEYS.OAUTH_HANDSHAKE);
      if (savedAuth) {
        localStorage.removeItem(STORAGE_KEYS.OAUTH_HANDSHAKE);
        sessionStorage.removeItem(STORAGE_KEYS.OAUTH_HANDSHAKE);
      }
    } catch {}
    return savedAuth;
  }

  async consumeOAuthHandshake(): Promise<string | null> {
    return this.consumeOAuthHandshakeSync();
  }

  clearOAuthHandshakeSync(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.OAUTH_HANDSHAKE);
      sessionStorage.removeItem(STORAGE_KEYS.OAUTH_HANDSHAKE);
    } catch {}
  }

  async clearOAuthHandshake(): Promise<void> {
    this.clearOAuthHandshakeSync();
  }

  clearAllSync(): void {
    this.resetToDefaults();
  }

  async clearAll(): Promise<void> {
    this.clearAllSync();
  }

  clearAllHardSync(): void {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }

  async clearAllHard(): Promise<void> {
    this.clearAllHardSync();
  }
}

export const localStorageDb = new LocalStorageDatabaseService();
