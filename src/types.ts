export type TransactionType = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string; // Pastel colors: 'lavender' | 'rose' | 'mint' | 'yellow' | 'lime' | 'orange' | 'cyan' | 'emerald' | 'pink' | 'purple'
  bgColor: string;
  textColor: string;
  type: 'expense' | 'income' | 'both';
  isFavorite?: boolean;
  order?: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  description: string;
  date: string; // ISO format or YYYY-MM-DDTHH:mm
  vaultId?: string; // If transaction is a deposit/withdraw from a vault
  paymentMethod?: 'crypto' | 'transfer' | 'card' | 'cash';
  isOnChain?: boolean;
  txHash?: string;
  tokenSymbol?: string;
  notes?: string;
  isOrganized?: boolean;
}

export interface Vault {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  emoji: string;
  color: string;
  bgColor: string;
  createdAt: string;
  deadline?: string;
  completed?: boolean;
  completedAt?: string;
  currency?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  email?: string;
  authId?: string;
  provider?: 'google' | 'discord' | 'guest';
  discordId?: string;
  isGoogleAuth: boolean;
  isLoggedIn?: boolean;
  isGuest?: boolean;
  hasCompletedOnboarding?: boolean;
  initialBalance?: number;
  streakDays: number;
  lastActiveDate: string;
  dailySpendLimit: number;
  hideBalance: boolean;
  hapticsEnabled: boolean;
  currency: string;
  language?: string;
  isPublicProfile?: boolean;
  adminRank?: string;
  walletAddress?: string;
  walletPrivateKey?: string;
  walletMnemonic?: string;
  walletMigrated?: boolean;
  web3Balance?: number;
  web3Network?: 'base' | 'base-sepolia';
  web3Enabled?: boolean;
  lastWeb3Sync?: string;
  securityPinHash?: string;
  isPinSet?: boolean;
  passkeyEnabled?: boolean;
  requireAuthForPayments?: boolean;
  appLockEnabled?: boolean;
  deviceSecurityEnabled?: boolean;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
  termsLanguage?: 'pt-BR' | 'en-US' | string;
  termsDocumentUrl?: string;
  clientLocale?: string;
  termsAuditFingerprint?: string;
  lastBackupAcknowledgedAt?: string;
  backupAuditFingerprint?: string;
  theme?: NeoTheme;
  pushNotificationsEnabled?: boolean;
  notifyOnReceivePayment?: boolean;
  notifyOnVaultMilestone?: boolean;
}

export type NeoTheme = 'original';

export type TabType = 'home' | 'vaults' | 'analytics' | 'transactions' | 'profile';

export type PeriodFilter = 'day' | 'week' | 'month' | 'year' | 'all' | 'today';
export type TypeFilter = 'all' | 'expense' | 'income';

export interface OnChainLedgerEntry {
  txHash: string;
  timestamp: string;
  blockNumber?: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  tokenSymbol: string;
  gasFee: number;
  protocolFee?: number;
  totalDebit?: number;
  network: 'base' | 'base-sepolia' | string;
  status: 'confirmed' | 'pending' | 'failed';
  originalLabel?: string;
  type: 'send' | 'receive' | 'deposit';
}

export interface SavedContact {
  id: string;
  name: string;
  address: string;
  ensName?: string;
  emoji?: string;
  isFavorite?: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

