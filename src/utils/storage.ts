import { Category, Vault, Transaction, UserProfile, OnChainLedgerEntry } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_USER, DEFAULT_VAULTS, DEFAULT_TRANSACTIONS } from './initialData';
import {
  sanitizeTransactions,
  sanitizeLedgerEntries,
  isRealLedgerEntry,
} from './transactionSanitizer';
import { ExchangeRateService } from '../services/exchangeRateService';

const STORAGE_KEYS = {
  USER: 'cofreadmin_user_v3',
  CATEGORIES: 'cofreadmin_categories_v1',
  VAULTS: 'cofreadmin_vaults_v1',
  TRANSACTIONS: 'cofreadmin_transactions_v1',
  ONCHAIN_LEDGER: 'cofreadmin_onchain_ledger_v1',
  AVATAR_BACKUP: 'cofreadmin_avatar_backup_v1',
  CUSTOM_AVATAR: 'cofreadmin_user_custom_avatar_v1',
  ACTIVE_PROFILE: 'cofreadmin_active_profile_id',
  NOTIFIED_TX_HASHES: 'cofreadmin_notified_tx_hashes_v1',
};

/**
 * Derives a strictly isolated storage profile key based on login type/provider:
 * - Google logins: 'google_<email_sanitized>'
 * - Discord logins: 'discord_<discord_id_or_user>'
 * This guarantees 100% profile, avatar, wallet, and history separation even if they share the exact same email.
 */
export function getProfileStorageKey(user?: Partial<UserProfile> | null): string {
  if (!user) return 'default';
  if (user.isGuest || user.provider === 'guest') {
    return 'guest_offline';
  }
  const provider = user.provider || (user.isGoogleAuth ? 'google' : (user.discordId ? 'discord' : 'default'));
  if (provider === 'discord') {
    const rawDiscordId = user.discordId || (user.authId && user.authId.replace(/^discord_/, '')) || (user.id && user.id.replace(/^discord_/, ''));
    if (rawDiscordId) {
      return `discord_${rawDiscordId.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }
    const cleanEmail = (user.email || 'unknown').trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    return `discord_${cleanEmail}`;
  }

  // Google Provider
  const cleanEmail = (user.email || user.username || 'unknown').trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `google_${cleanEmail}`;
}

/**
 * Checks whether an avatar URL is a user-customized photo or specifically chosen avatar,
 * as opposed to an automated default robot placeholder (BaseCofre).
 */
export function isCustomUserAvatar(url?: string | null): boolean {
  if (!url || typeof url !== 'string' || !url.trim()) return false;
  const clean = url.trim();
  if (clean === '' || clean === 'undefined' || clean === 'null') return false;
  // Default placeholder avatars
  if (clean.includes('seed=BaseCofre') || clean.includes('seed=default')) {
    return false;
  }
  return true;
}

/**
 * Checks whether an avatar URL is a generic placeholder or automated default bot.
 */
export function isDefaultOrPlaceholderAvatar(url?: string | null): boolean {
  return !isCustomUserAvatar(url);
}

// Safe JSON parser
function safeGet<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e: any) {
    console.error(`Error writing localStorage key "${key}":`, e);
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      try {
        localStorage.removeItem('cofreadmin_onchain_ledger_v1');
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    }
  }
}

function getScopedKey(baseKey: string, explicitProfileKey?: string): string {
  const profileKey = explicitProfileKey || StorageService.getActiveProfileKey();
  if (!profileKey || profileKey === 'default') {
    return baseKey;
  }
  return `${baseKey}_${profileKey}`;
}

export const StorageService = {
  getActiveProfileKey(): string | null {
    try {
      const active = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE);
      if (active && active.trim()) {
        return active.trim();
      }
      // Infer from current stored user if present
      const curr = safeGet<UserProfile | null>(STORAGE_KEYS.USER, null);
      if (curr && curr.isLoggedIn) {
        const pk = getProfileStorageKey(curr);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, pk);
        return pk;
      }
      return null;
    } catch {
      return null;
    }
  },

  setActiveProfileKey(profileKey?: string | null): void {
    try {
      if (profileKey && profileKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, profileKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE);
      }
    } catch {}
  },

  getUser(profileKey?: string): UserProfile {
    const targetKey = getScopedKey(STORAGE_KEYS.USER, profileKey);
    const user = safeGet<UserProfile>(targetKey, safeGet<UserProfile>(STORAGE_KEYS.USER, DEFAULT_USER));
    
    // Look up custom avatar ONLY for this profile key to prevent cross-account avatar leaks
    const currentProfile = profileKey || this.getActiveProfileKey() || getProfileStorageKey(user);
    const customAvatar = this.getCustomAvatar(currentProfile);
    const avatarBackup = this.getPersistedAvatar(currentProfile);

    if (customAvatar && isCustomUserAvatar(customAvatar)) {
      user.avatarUrl = customAvatar;
    } else if (avatarBackup && isCustomUserAvatar(avatarBackup) && isDefaultOrPlaceholderAvatar(user.avatarUrl)) {
      user.avatarUrl = avatarBackup;
    }

    // Check and update streak logic based on date
    const today = new Date().toISOString().split('T')[0];
    const lastActive = (user.lastActiveDate || '').split('T')[0] || today;
    if (lastActive !== today) {
      const lastDate = new Date(lastActive);
      const currentDate = new Date(today);
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        user.streakDays += 1;
      } else if (diffDays > 1) {
        user.streakDays = 1;
      }
      user.lastActiveDate = today;
      this.saveUser(user, currentProfile);
    }
    return user;
  },

  saveUser(user: UserProfile, explicitProfileKey?: string): void {
    const profileKey = explicitProfileKey || getProfileStorageKey(user);
    this.setActiveProfileKey(profileKey);

    // If incoming user avatar is missing or empty, recover the profile-scoped custom avatar if available
    if (!user.avatarUrl || user.avatarUrl.trim() === '') {
      const protectedCustom = this.getCustomAvatar(profileKey);
      if (protectedCustom && isCustomUserAvatar(protectedCustom)) {
        user.avatarUrl = protectedCustom;
      }
    }

    // Security Sanitation: Sensitive cryptographic keys or PIN hashes are NEVER written into plain user JSON
    const sanitizedUser: UserProfile = { ...user };
    delete sanitizedUser.walletPrivateKey;
    delete sanitizedUser.securityPinHash;

    // Save to profile-scoped storage key
    const scopedUserKey = getScopedKey(STORAGE_KEYS.USER, profileKey);
    safeSet(scopedUserKey, sanitizedUser);
    
    // Mirror to active user key for fast global access
    safeSet(STORAGE_KEYS.USER, sanitizedUser);

    if (isCustomUserAvatar(user.avatarUrl)) {
      this.setCustomAvatar(user.avatarUrl, profileKey);
    }
  },

  getPersistedAvatar(profileKey?: string): string | null {
    const currentProfile = profileKey || this.getActiveProfileKey();
    if (currentProfile && currentProfile !== 'default') {
      const scopedCustom = safeGet<string | null>(getScopedKey(STORAGE_KEYS.CUSTOM_AVATAR, currentProfile), null);
      if (scopedCustom && isCustomUserAvatar(scopedCustom)) return scopedCustom;
      const scopedBackup = safeGet<string | null>(getScopedKey(STORAGE_KEYS.AVATAR_BACKUP, currentProfile), null);
      if (scopedBackup && isCustomUserAvatar(scopedBackup)) return scopedBackup;
    }
    return null;
  },

  setPersistedAvatar(url: string, profileKey?: string): void {
    if (url && isCustomUserAvatar(url)) {
      const currentProfile = profileKey || this.getActiveProfileKey();
      if (currentProfile && currentProfile !== 'default') {
        safeSet(getScopedKey(STORAGE_KEYS.CUSTOM_AVATAR, currentProfile), url);
        safeSet(getScopedKey(STORAGE_KEYS.AVATAR_BACKUP, currentProfile), url);
      }
    }
  },

  getCustomAvatar(profileKey?: string): string | null {
    const currentProfile = profileKey || this.getActiveProfileKey();
    if (currentProfile && currentProfile !== 'default') {
      const scoped = safeGet<string | null>(getScopedKey(STORAGE_KEYS.CUSTOM_AVATAR, currentProfile), null);
      if (scoped && isCustomUserAvatar(scoped)) return scoped;
      const backup = safeGet<string | null>(getScopedKey(STORAGE_KEYS.AVATAR_BACKUP, currentProfile), null);
      if (backup && isCustomUserAvatar(backup)) return backup;
    }
    return null;
  },

  setCustomAvatar(url: string, profileKey?: string): void {
    if (url) {
      const currentProfile = profileKey || this.getActiveProfileKey();
      if (currentProfile && currentProfile !== 'default') {
        safeSet(getScopedKey(STORAGE_KEYS.CUSTOM_AVATAR, currentProfile), url);
        safeSet(getScopedKey(STORAGE_KEYS.AVATAR_BACKUP, currentProfile), url);
      }
    }
  },

  clearCustomAvatar(profileKey?: string): void {
    try {
      const currentProfile = profileKey || this.getActiveProfileKey();
      if (currentProfile && currentProfile !== 'default') {
        localStorage.removeItem(getScopedKey(STORAGE_KEYS.CUSTOM_AVATAR, currentProfile));
        localStorage.removeItem(getScopedKey(STORAGE_KEYS.AVATAR_BACKUP, currentProfile));
      }
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_AVATAR);
      localStorage.removeItem(STORAGE_KEYS.AVATAR_BACKUP);
    } catch {}
  },

  getCategories(profileKey?: string): Category[] {
    const key = getScopedKey(STORAGE_KEYS.CATEGORIES, profileKey);
    return safeGet<Category[]>(key, safeGet<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES));
  },

  saveCategories(categories: Category[], profileKey?: string): void {
    const key = getScopedKey(STORAGE_KEYS.CATEGORIES, profileKey);
    safeSet(key, categories);
    safeSet(STORAGE_KEYS.CATEGORIES, categories);
  },

  getVaults(profileKey?: string): Vault[] {
    const key = getScopedKey(STORAGE_KEYS.VAULTS, profileKey);
    const raw = safeGet<Vault[]>(key, safeGet<Vault[]>(STORAGE_KEYS.VAULTS, DEFAULT_VAULTS));
    const DEMO_VAULT_IDS = new Set(['vault_1', 'vault_2', 'vault_3', 'vault_4']);
    const clean = (raw || []).filter((v) => !DEMO_VAULT_IDS.has(v.id));
    if (clean.length !== (raw || []).length) {
      safeSet(key, clean);
      safeSet(STORAGE_KEYS.VAULTS, clean);
    }
    return clean;
  },

  saveVaults(vaults: Vault[], profileKey?: string): void {
    const key = getScopedKey(STORAGE_KEYS.VAULTS, profileKey);
    safeSet(key, vaults);
    safeSet(STORAGE_KEYS.VAULTS, vaults);
  },

  getTransactions(profileKey?: string): Transaction[] {
    const key = getScopedKey(STORAGE_KEYS.TRANSACTIONS, profileKey);
    const raw = safeGet<Transaction[]>(key, safeGet<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS));
    const sanitized = sanitizeTransactions(raw);
    if (sanitized.length !== raw.length) {
      safeSet(key, sanitized);
      safeSet(STORAGE_KEYS.TRANSACTIONS, sanitized);
    }
    return sanitized;
  },

  saveTransactions(transactions: Transaction[], profileKey?: string): void {
    const sanitized = sanitizeTransactions(transactions);
    const key = getScopedKey(STORAGE_KEYS.TRANSACTIONS, profileKey);
    safeSet(key, sanitized);
    safeSet(STORAGE_KEYS.TRANSACTIONS, sanitized);
  },

  getOnChainLedger(profileKey?: string): OnChainLedgerEntry[] {
    const key = getScopedKey(STORAGE_KEYS.ONCHAIN_LEDGER, profileKey);
    const raw = safeGet<OnChainLedgerEntry[]>(key, safeGet<OnChainLedgerEntry[]>(STORAGE_KEYS.ONCHAIN_LEDGER, []));
    const sanitized = sanitizeLedgerEntries(raw);
    if (sanitized.length !== raw.length) {
      safeSet(key, sanitized);
      safeSet(STORAGE_KEYS.ONCHAIN_LEDGER, sanitized);
    }
    return sanitized;
  },

  saveOnChainLedger(entries: OnChainLedgerEntry[], profileKey?: string): void {
    const sanitized = sanitizeLedgerEntries(entries);
    const key = getScopedKey(STORAGE_KEYS.ONCHAIN_LEDGER, profileKey);
    safeSet(key, sanitized);
    safeSet(STORAGE_KEYS.ONCHAIN_LEDGER, sanitized);
  },

  recordOnChainEntry(entry: OnChainLedgerEntry, profileKey?: string): void {
    if (!isRealLedgerEntry(entry)) {
      console.warn('Bloqueado registro de lançamento simulado/sem hash no livro-razão:', entry.txHash);
      return;
    }
    const current = this.getOnChainLedger(profileKey);
    const exists = current.some((e) => e.txHash.toLowerCase() === entry.txHash.toLowerCase());
    if (!exists) {
      this.saveOnChainLedger([entry, ...current], profileKey);
    }
  },

  getNotifiedTxHashes(profileKey?: string): Set<string> {
    const key = getScopedKey(STORAGE_KEYS.NOTIFIED_TX_HASHES, profileKey);
    const raw = safeGet<string[]>(key, safeGet<string[]>(STORAGE_KEYS.NOTIFIED_TX_HASHES, []));
    return new Set(Array.isArray(raw) ? raw.map((h) => (h || '').toLowerCase()) : []);
  },

  markTxHashesNotified(txHashes: string[], profileKey?: string): void {
    if (!Array.isArray(txHashes) || txHashes.length === 0) return;
    const current = this.getNotifiedTxHashes(profileKey);
    for (const hash of txHashes) {
      if (hash && typeof hash === 'string') current.add(hash.trim().toLowerCase());
    }
    const arr = Array.from(current);
    const key = getScopedKey(STORAGE_KEYS.NOTIFIED_TX_HASHES, profileKey);
    safeSet(key, arr);
    safeSet(STORAGE_KEYS.NOTIFIED_TX_HASHES, arr);
  },

  purgeSimulatedData(profileKey?: string): { purgedCount: number; remainingCount: number } {
    const rawTxs = this.getTransactions(profileKey);
    const cleanTxs = sanitizeTransactions(rawTxs);
    const rawLedger = this.getOnChainLedger(profileKey);
    const cleanLedger = sanitizeLedgerEntries(rawLedger);

    const purgedCount = (rawTxs.length - cleanTxs.length) + (rawLedger.length - cleanLedger.length);

    this.saveTransactions(cleanTxs, profileKey);
    this.saveOnChainLedger(cleanLedger, profileKey);

    return {
      purgedCount,
      remainingCount: cleanTxs.length,
    };
  },

  // Export full application state as JSON
  exportDataJSON(profileKey?: string): string {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: this.getUser(profileKey),
      categories: this.getCategories(profileKey),
      vaults: this.getVaults(profileKey),
      transactions: this.getTransactions(profileKey),
    };
    return JSON.stringify(data, null, 2);
  },

  // Import full JSON
  importDataJSON(jsonStr: string, profileKey?: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.user) this.saveUser(data.user, profileKey);
      if (data.categories) this.saveCategories(data.categories, profileKey);
      if (data.vaults) this.saveVaults(data.vaults, profileKey);
      if (data.transactions) this.saveTransactions(data.transactions, profileKey);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  // Reset to default clean data on logout (clears active profile and residual avatar keys)
  resetToDefaults(): void {
    this.clearCustomAvatar();
    this.setActiveProfileKey(null);
    safeSet(STORAGE_KEYS.USER, DEFAULT_USER);
    safeSet(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    safeSet(STORAGE_KEYS.VAULTS, []);
    safeSet(STORAGE_KEYS.TRANSACTIONS, []);
    safeSet(STORAGE_KEYS.ONCHAIN_LEDGER, []);
  },
};

// Currency formatter utility for USDC / USD and international fiat digital assets
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const curr = (currency || 'USD').toUpperCase();
  if (curr === 'USDC') {
    return `$ ${(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
  }
  try {
    const localeMap: Record<string, string> = {
      BRL: 'pt-BR',
      USD: 'en-US',
      EUR: 'de-DE',
      GBP: 'en-GB',
      JPY: 'ja-JP',
      CAD: 'en-CA',
      AUD: 'en-AU',
      CHF: 'de-CH',
      ARS: 'es-AR',
      MXN: 'es-MX',
      CNY: 'zh-CN',
    };
    const locale = localeMap[curr] || 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
    }).format(num);
  } catch {
    return `${curr} ${num.toFixed(2)}`;
  }
}

// Automatically converts an amount in base USDC into the target currency and formats it
export function formatUsdcAsCurrency(amountUsdc: number, currency: string = 'USD'): string {
  const converted = ExchangeRateService.convertFromUsdc(amountUsdc, currency);
  return formatCurrency(converted, currency);
}

// Date formatter with language support (pt-BR / en-US)
export function formatRelativeDate(dateString: string, customLang?: 'pt-BR' | 'en-US'): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    let currentLang: 'pt-BR' | 'en-US' = customLang || 'pt-BR';
    if (!customLang && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cofreadmin_user_language');
        if (saved === 'en-US' || saved === 'pt-BR') {
          currentLang = saved;
        }
      } catch {}
    }

    if (currentLang === 'en-US') {
      if (isToday) return `Today, ${timeStr}`;
      if (isYesterday) return `Yesterday, ${timeStr}`;

      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }

    if (isToday) return `Hoje, ${timeStr}`;
    if (isYesterday) return `Ontem, ${timeStr}`;

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}
