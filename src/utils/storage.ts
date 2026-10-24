import {
  db,
  getProfileStorageKey,
  isCustomUserAvatar,
  isDefaultOrPlaceholderAvatar,
} from '../services';
import {
  DEFAULT_USER,
  DEFAULT_CATEGORIES,
  INITIAL_VAULTS,
  INITIAL_TRANSACTIONS,
} from '../services/localStorageDb';
import type {
  Category,
  Vault,
  Transaction,
  OnChainLedgerEntry,
  SavedContact,
  UserProfile,
} from '../types';

export {
  DEFAULT_USER,
  DEFAULT_CATEGORIES,
  INITIAL_VAULTS,
  INITIAL_TRANSACTIONS,
  getProfileStorageKey,
  isCustomUserAvatar,
  isDefaultOrPlaceholderAvatar,
};

/**
 * Compatibility facade: delegates 100% of read/write operations to the `db` layer
 * (`src/services/index.ts`), ensuring zero direct access to `localStorage` outside of `src/services/`.
 */
export const StorageService = {
  getActiveProfileId: (): string => db.getActiveProfileKey(),
  getActiveProfileKey: (): string => db.getActiveProfileKey(),
  setActiveProfileId: (idOrEmail: string | null): void => db.setActiveProfileKey(idOrEmail),
  setActiveProfileKey: (idOrEmail: string | null): void => db.setActiveProfileKey(idOrEmail),

  getCustomAvatar: (profileKey?: string): string | null => db.getCustomAvatar(profileKey),
  saveCustomAvatar: (email: string, avatarData: string): void => {
    void db.setCustomAvatar(avatarData, email);
  },
  setCustomAvatar: (avatarData: string, profileKey?: string): void => {
    void db.setCustomAvatar(avatarData, profileKey);
  },
  clearCustomAvatar: (profileKey?: string): void => {
    void db.clearCustomAvatar(profileKey);
  },
  getPersistedAvatar: (profileKey?: string): string | null => db.getPersistedAvatar(profileKey),
  setPersistedAvatar: (avatarData: string, profileKey?: string): void => {
    void db.setPersistedAvatar(avatarData, profileKey);
  },

  getUser: (profileKey?: string): UserProfile => db.getUser(profileKey),
  saveUser: (user: UserProfile, profileKey?: string): void => {
    void db.saveUser(user, profileKey);
  },

  getCategories: (profileKey?: string): Category[] => db.getCategories(profileKey),
  saveCategories: (categories: Category[], profileKey?: string): void => {
    void db.saveCategories(categories, profileKey);
  },

  getVaults: (profileKey?: string): Vault[] => db.getVaults(profileKey),
  saveVaults: (vaults: Vault[], profileKey?: string): void => {
    void db.saveVaults(vaults, profileKey);
  },

  getTransactions: (profileKey?: string): Transaction[] => db.getTransactions(profileKey),
  saveTransactions: (transactions: Transaction[], profileKey?: string): void => {
    void db.saveTransactions(transactions, profileKey);
  },

  getOnChainLedger: (profileKey?: string): OnChainLedgerEntry[] => db.getOnChainLedger(profileKey),
  saveOnChainLedger: (entries: OnChainLedgerEntry[], profileKey?: string): void => {
    void db.saveOnChainLedger(entries, profileKey);
  },
  appendOnChainLedgerEntry: (entry: OnChainLedgerEntry, profileKey?: string): OnChainLedgerEntry[] =>
    db.recordOnChainEntry(entry, profileKey),
  recordOnChainEntry: (entry: OnChainLedgerEntry, profileKey?: string): OnChainLedgerEntry[] =>
    db.recordOnChainEntry(entry, profileKey),

  getContacts: (profileKey?: string): SavedContact[] => db.getContacts(profileKey),
  saveContacts: (contacts: SavedContact[], profileKey?: string): void => {
    void db.saveContacts(contacts, profileKey);
  },
  upsertContact: (
    contact: Omit<SavedContact, 'id' | 'createdAt'> & { id?: string },
    profileKey?: string
  ): SavedContact[] => db.upsertContact(contact, profileKey),
  deleteContact: (id: string, profileKey?: string): SavedContact[] =>
    db.deleteContact(id, profileKey),

  getNotifiedTxHashes: (profileKey?: string): Set<string> => db.getNotifiedTxHashes(profileKey),
  markTxHashesNotified: (hashes: string[], profileKey?: string): void =>
    db.markTxHashesNotified(hashes, profileKey),

  purgeSimulatedData: (profileKey?: string): { purgedCount: number } =>
    db.purgeSimulatedData(profileKey),
  resetToDefaults: (profileKey?: string): void => db.resetToDefaults(profileKey),
  clearAll: (): void => {
    void db.clearAll();
  },
};

export const formatCurrency = (value: number, currency: string = 'BRL'): string => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const upper = (currency || 'BRL').toUpperCase();
  if (upper === 'USDC') {
    return `$ ${safeValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  const localeMap: Record<string, string> = {
    BRL: 'pt-BR',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
  };
  try {
    return new Intl.NumberFormat(localeMap[upper] || 'pt-BR', {
      style: 'currency',
      currency: upper.length === 3 ? upper : 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    return `$ ${safeValue.toFixed(2)}`;
  }
};

export const formatUsdcAsCurrency = (
  usdcValue: number,
  currency: string = 'BRL',
  exchangeRate: number = 5.0
): string => {
  const safeUsdc = Number.isFinite(usdcValue) ? usdcValue : 0;
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 5.0;
  const upper = (currency || 'BRL').toUpperCase();
  if (upper === 'USDC' || upper === 'USD') {
    return formatCurrency(safeUsdc, upper);
  }
  const rate = upper === 'BRL' ? safeRate : upper === 'EUR' ? 0.92 : safeRate;
  return formatCurrency(safeUsdc * rate, upper);
};

export const formatRelativeDate = (dateStr: string, lang: 'pt-BR' | 'en-US' | string = 'pt-BR'): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const isEn = lang === 'en-US';
  const locale = isEn ? 'en-US' : 'pt-BR';
  const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  if (isToday) return isEn ? `Today, ${timeStr}` : `Hoje, ${timeStr}`;
  if (isYesterday) return isEn ? `Yesterday, ${timeStr}` : `Ontem, ${timeStr}`;

  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' }) + `, ${timeStr}`;
};
