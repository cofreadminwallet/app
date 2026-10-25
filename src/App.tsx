import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserProfile, 
  Transaction, 
  Category, 
  Vault, 
  TabType, 
  TransactionType 
} from './types';
import { formatCurrency, isCustomUserAvatar, isDefaultOrPlaceholderAvatar, getProfileStorageKey } from './utils/storage';
import { sanitizeTransactions, isRealTxHash } from './utils/transactionSanitizer';
import { DEFAULT_USER, DEFAULT_CATEGORIES, DEFAULT_VAULTS, DEFAULT_TRANSACTIONS } from './utils/initialData';
import { db, authService, mergeLocalAndCloudData } from './services';
import { Header } from './components/Header';
import { HeroBalanceCard } from './components/HeroBalanceCard';
import { useExchangeRate } from './hooks/useExchangeRate';
import { ExchangeRateService } from './services/exchangeRateService';
import { QuickActions } from './components/QuickActions';
import { DailyBudgetCard } from './components/DailyBudgetCard';
import { ActiveVaultsPreview } from './components/ActiveVaultsPreview';
import { RecentActivityCard } from './components/RecentActivityCard';
import { BottomNav } from './components/BottomNav';
import { LoginScreen } from './components/LoginScreen';
import { AppLockScreen } from './components/AppLockScreen';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { QuickCategorizeReceiveToast, QuickCategorizeTxData } from './components/QuickCategorizeReceiveToast';

// Code-splitting / Lazy loading heavy secondary screens to make initial app launch instantaneous
const VaultsScreen = React.lazy(() => import('./components/VaultsScreen').then(m => ({ default: m.VaultsScreen })));
const TransactionsScreen = React.lazy(() => import('./components/TransactionsScreen').then(m => ({ default: m.TransactionsScreen })));
const AnalyticsScreen = React.lazy(() => import('./components/AnalyticsScreen').then(m => ({ default: m.AnalyticsScreen })));
const ProfileSettingsScreen = React.lazy(() => import('./components/ProfileSettingsScreen').then(m => ({ default: m.ProfileSettingsScreen })));
const OnboardingModal = React.lazy(() => import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
const CryptoQrScannerModal = React.lazy(() => import('./components/CryptoQrScannerModal').then(m => ({ default: m.CryptoQrScannerModal })));
const CryptoSendModal = React.lazy(() => import('./components/CryptoSendModal').then(m => ({ default: m.CryptoSendModal })));
const CryptoReceiveModal = React.lazy(() => import('./components/CryptoReceiveModal').then(m => ({ default: m.CryptoReceiveModal })));
const TransactionDetailModal = React.lazy(() => import('./components/TransactionDetailModal').then(m => ({ default: m.TransactionDetailModal })));
const WalletMigrationModal = React.lazy(() => import('./components/WalletMigrationModal').then(m => ({ default: m.WalletMigrationModal })));
const WalletBackupModal = React.lazy(() => import('./components/WalletBackupModal').then(m => ({ default: m.WalletBackupModal })));

import { ParsedCryptoData, validateCryptoInput } from './utils/cryptoAddressUtils';
import { CryptoReceipt } from './services/cryptoTransferService';
import { Target, RefreshCw, Smartphone } from 'lucide-react';
import { triggerHaptic } from './utils/haptics';
import confetti from 'canvas-confetti';
import { Web3Service, WalletBalances, Web3Network, SyncedOnChainTx } from './services/web3Service';
import { WebAuthnService } from './services/webAuthnService';
import { applyTheme } from './utils/theme';
import { AnalyticsService } from './services/analyticsService';
import { NotificationService } from './services/notificationService';
import { APP_VERSION } from './config/version';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useI18n } from './hooks/useI18n';
import { detectDefaultSecondaryCurrency, detectInitialLanguage } from './services/i18nService';
import { getCurrencyConfig } from './utils/currencies';

const TAB_ORDER: Record<TabType, number> = {
  home: 0,
  vaults: 1,
  analytics: 2,
  transactions: 3,
  profile: 4,
};

let cachedShareLogoFilePt: File | null = null;
let cachedShareLogoFileEn: File | null = null;
let prefetchSharePromisePt: Promise<void> | null = null;
let prefetchSharePromiseEn: Promise<void> | null = null;

const prefetchShareLogo = async (lang: 'pt-BR' | 'en-US' = 'pt-BR') => {
  if (typeof window === 'undefined') return;
  const isEn = lang === 'en-US';
  if (isEn && cachedShareLogoFileEn) return;
  if (!isEn && cachedShareLogoFilePt) return;

  if (isEn) {
    if (!prefetchSharePromiseEn) {
      prefetchSharePromiseEn = (async () => {
        try {
          const res = await fetch('/cofreadmin-share-card-en.png');
          if (!res.ok) return;
          const blob = await res.blob();
          cachedShareLogoFileEn = new File([blob], 'cofreadmin-own-your-money-be-the-admin.png', { type: 'image/png' });
        } catch (err) {
          console.warn('Share card prefetch failed (en):', err);
        } finally {
          prefetchSharePromiseEn = null;
        }
      })();
    }
    return prefetchSharePromiseEn;
  } else {
    if (!prefetchSharePromisePt) {
      prefetchSharePromisePt = (async () => {
        try {
          const res = await fetch('/cofreadmin-share-card.png');
          if (!res.ok) return;
          const blob = await res.blob();
          cachedShareLogoFilePt = new File([blob], 'cofreadmin-seja-o-admin-da-sua-grana.png', { type: 'image/png' });
        } catch (err) {
          console.warn('Falha no pré-carregamento do card de compartilhamento (pt):', err);
        } finally {
          prefetchSharePromisePt = null;
        }
      })();
    }
    return prefetchSharePromisePt;
  }
};

const tabVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 32 : direction < 0 ? -32 : 0,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -32 : direction < 0 ? 32 : 0,
    opacity: 0,
    transition: {
      duration: 0.16,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

export default function App() {
  const { t, language } = useI18n();
  const isEn = language === 'en-US';
  // Real-time market exchange rate for USDC <-> BRL across entire application
  const { rate: liveRate, refreshRate: refreshExchangeRate } = useExchangeRate();

  // Dynamic content scroll container ref
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Global State initialized from Storage (with automatic secondary currency based on user locale)
  const [user, setUser] = useState<UserProfile>(() => {
    const loaded = db.getUser();
    if (!loaded.currency) {
      const initialLang = detectInitialLanguage();
      loaded.currency = detectDefaultSecondaryCurrency(initialLang);
    }
    return loaded;
  });
  const [categories, setCategories] = useState<Category[]>(() => db.getCategories());
  const [vaults, setVaults] = useState<Vault[]>(() => db.getVaults());
  const [transactions, setTransactions] = useState<Transaction[]>(() => db.getTransactions());

  // Check persistent session from Firebase Auth on launch if not already cached
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => {
    const initialUser = db.getUser();
    return !initialUser.isLoggedIn;
  });

  // Security App Lock State (Biometrics Face ID / Device Passkey / 4-digit PIN)
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    const initialUser = db.getUser();
    if (!initialUser.isLoggedIn) return false;

    const isDeviceSecurityActive = WebAuthnService.isDeviceSecurityEnabled(
      initialUser.deviceSecurityEnabled ?? initialUser.appLockEnabled
    );
    const isAlreadyUnlockedInSession = WebAuthnService.isSessionUnlocked();

    return Boolean(isDeviceSecurityActive && !isAlreadyUnlockedInSession);
  });

  // UI & Cloud Sync state with Directional Slide Navigation
  const [activeTab, setActiveTabInternal] = useState<TabType>('home');
  const [direction, setDirection] = useState<number>(0);
  const activeTabRef = useRef<TabType>('home');

  const setActiveTab = useCallback((newTab: TabType) => {
    if (newTab === activeTabRef.current) return;
    const prevIdx = TAB_ORDER[activeTabRef.current] ?? 0;
    const nextIdx = TAB_ORDER[newTab] ?? 0;
    setDirection(nextIdx >= prevIdx ? 1 : -1);
    activeTabRef.current = newTab;
    setActiveTabInternal(newTab);
    AnalyticsService.trackScreenView(newTab);
    // Smoothly scroll back to top of screen on tab change
    contentContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const [isDailyBudgetModalOpen, setIsDailyBudgetModalOpen] = useState(false);
  const [newDailyLimitInput, setNewDailyLimitInput] = useState(user.dailySpendLimit.toString());

  // Currency display mode: show primary as native USDC ($ on top) or as fiat (R$ on top)
  const [showInUsdc, setShowInUsdc] = useState<boolean>(() => db.getShowNativeUsdcSync());

  const handleToggleShowInUsdc = useCallback(() => {
    setShowInUsdc(prev => {
      const nextVal = !prev;
      void db.saveShowNativeUsdc(nextVal);
      return nextVal;
    });
  }, []);

  // Visual currency for cards: follows whichever currency is currently displayed on top (primary)
  const activeDisplayCurrency = showInUsdc ? 'USDC' : (user.currency || 'BRL');
  
  // Smart Onboarding state
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [openCreateVaultDirectly, setOpenCreateVaultDirectly] = useState(false);
  const [openDepositVaultIdDirectly, setOpenDepositVaultIdDirectly] = useState<string | null>(null);

  // Crypto Web3 Scanner / Send & Receive Modals
  const [isCryptoScannerOpen, setIsCryptoScannerOpen] = useState(false);
  const [isCryptoSendOpen, setIsCryptoSendOpen] = useState(false);
  const [isCryptoReceiveOpen, setIsCryptoReceiveOpen] = useState(false);
  const [scannedCryptoData, setScannedCryptoData] = useState<ParsedCryptoData | null>(null);
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);
  const [pendingQuickCategorizeTx, setPendingQuickCategorizeTx] = useState<QuickCategorizeTxData | null>(null);
  
  // Live on-chain balances directly from Base Blockchain
  const [onChainBalances, setOnChainBalances] = useState<WalletBalances>({
    usdc: 0,
    eth: 0,
    totalUsd: 0,
    formattedUsdc: '0.00',
    formattedEth: '0.0000',
  });
  const [isRefreshingOnChain, setIsRefreshingOnChain] = useState(false);

  // Guard references to prevent false positive notifications for historical/cached transactions
  const isInitialSyncCompletedRef = useRef<boolean>(false);
  const lastSyncTimestampRef = useRef<number>(0);

  // Toast notification state for sleek non-blocking feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; icon?: string } | null>(null);

  const showToast = React.useCallback((text: string, icon = '⚡') => {
    setToastMessage({ text, icon });
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Deep Link Payment Request Handler (?pay=0x...&amount=...&memo=...)
  const pendingDeepLinkPaymentRef = useRef<ParsedCryptoData | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = window.location.search;
    if (!search || (!search.includes('pay=') && !search.includes('to='))) return;

    const validation = validateCryptoInput(window.location.href, 'qr');
    // Clean URL immediately so reloading the page does not re-trigger the payment modal
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch {}

    if (validation.isValid && validation.data) {
      pendingDeepLinkPaymentRef.current = validation.data;
    }
  }, []);

  useEffect(() => {
    if (!pendingDeepLinkPaymentRef.current) return;
    if (!user.isLoggedIn || isAppLocked) return;

    const reqData = pendingDeepLinkPaymentRef.current;
    pendingDeepLinkPaymentRef.current = null;

    if (user.isGuest) {
      showToast(
        isEn
          ? 'Sign in to pay this USDC request on Base!'
          : 'Faça login para pagar esta cobrança em USDC na Base!',
        '🔒'
      );
      return;
    }

    const contacts = db.getContacts();
    const matchedContact = contacts.find(
      (c) => c.address.toLowerCase() === reqData.address.toLowerCase()
    );

    setScannedCryptoData({
      ...reqData,
      contactName: reqData.contactName || matchedContact?.name,
      ensName: reqData.ensName || matchedContact?.ensName,
      isPaymentRequest: true,
    });
    setIsCryptoSendOpen(true);
  }, [user.isLoggedIn, user.isGuest, isAppLocked, isEn, showToast]);

  // Security Migration and Mandatory Wallet Backup States
  const [migrationState, setMigrationState] = useState<{
    isOpen: boolean;
    legacyAddress: string;
    legacyPrivateKey: string;
    newAddress: string;
    newPrivateKey: string;
    newMnemonic?: string;
    legacyUsdcBalance: number;
    legacyEthBalance: number;
  } | null>(null);

  const [mandatoryBackupState, setMandatoryBackupState] = useState<{
    isOpen: boolean;
    publicAddress: string;
    privateKey: string;
    mnemonic?: string;
  } | null>(null);

  // Future Wallet Upgrade / Rotation Check (triggered only if a previous generation key is staged)
  useEffect(() => {
    if (!user.isLoggedIn || user.isGuest || !user.walletAddress) {
      return;
    }

    let isCancelled = false;

    const runFutureMigrationCheck = async () => {
      try {
        const pendingMigration = await Web3Service.getPendingMigrationWallet(
          user.email,
          user.authId || user.id,
          undefined,
          user.walletAddress,
          user.web3Network || 'base'
        );
        if (isCancelled || !pendingMigration) return;

        let targetAddress = user.walletAddress;
        let targetPrivateKey =
          user.walletPrivateKey ||
          (await Web3Service.getStoredDecryptedPrivateKey(user.email, user.authId || user.id)) ||
          '';
        let targetMnemonic =
          user.walletMnemonic ||
          (await Web3Service.getStoredMnemonic(user.email, user.authId || user.id)) ||
          undefined;

        if (!targetAddress || !targetPrivateKey || targetAddress.toLowerCase() === pendingMigration.previousAddress.toLowerCase()) {
          const newWallet = Web3Service.generateMnemonicWallet();
          targetAddress = newWallet.address;
          targetPrivateKey = newWallet.privateKey;
          targetMnemonic = newWallet.mnemonic;
        }

        if (!isCancelled) {
          setMigrationState({
            isOpen: true,
            legacyAddress: pendingMigration.previousAddress,
            legacyPrivateKey: pendingMigration.previousPrivateKey,
            newAddress: targetAddress,
            newPrivateKey: targetPrivateKey,
            newMnemonic: targetMnemonic,
            legacyUsdcBalance: pendingMigration.usdcBalance,
            legacyEthBalance: pendingMigration.ethBalance,
          });
        }
      } catch (err) {
        console.warn('Aviso ao verificar rotação futura de carteira:', err);
      }
    };

    runFutureMigrationCheck();
    return () => {
      isCancelled = true;
    };
  }, [user.isLoggedIn, user.isGuest, user.walletAddress, user.web3Network, user.email, user.authId, user.id]);

  const handleCompleteMigration = async (newAddr: string, newPk: string, newMnem?: string) => {
    setMigrationState(null);
    try {
      await Web3Service.saveWalletCredentials({
        userEmail: user.email,
        userUid: user.authId || user.id,
        privateKey: newPk,
        mnemonic: newMnem,
      });
      Web3Service.clearPendingMigrationWallet(user.email, user.authId || user.id);
    } catch (saveErr) {
      console.error('Erro ao persistir credenciais da carteira atualizada:', saveErr);
    }

    setUser(prev => {
      const updated: UserProfile = {
        ...prev,
        walletAddress: newAddr,
        walletPrivateKey: newPk,
        walletMnemonic: newMnem,
        walletMigrated: true,
      };
      void db.saveUser(updated);
      void db.saveToCloud(updated, categories, vaults, transactions);
      return updated;
    });
    setMandatoryBackupState({
      isOpen: true,
      publicAddress: newAddr,
      privateKey: newPk,
      mnemonic: newMnem,
    });
    showToast(isEn ? 'Wallet upgraded successfully! 🛡️' : 'Carteira atualizada com sucesso! 🛡️', '✅');
  };

  // Synchronize Neo-Brutalist Theme on mount or preference update
  useEffect(() => {
    applyTheme(user.theme || 'original');
  }, [user.theme]);

  // Prefetch share logo (bilingual aware)
  useEffect(() => {
    prefetchShareLogo(language);
  }, [language]);

  // Function to refresh on-chain balance and sync all on-chain transactions directly from Base
  const refreshOnChainBalance = React.useCallback(async (
    addr?: string,
    net?: Web3Network,
    options?: { showToastOnSync?: boolean }
  ) => {
    if (user.isGuest) return;
    const targetAddress = addr || user.walletAddress;
    const targetNetwork = net || user.web3Network || 'base';
    if (!targetAddress) return;

    const profileKey = getProfileStorageKey(user);
    setIsRefreshingOnChain(true);
    try {
      // 1. Fetch live balances from Base RPC
      const balances = await Web3Service.getWalletBalances(targetAddress, targetNetwork);
      setOnChainBalances(balances);

      // 2. Fetch live on-chain transactions from Base Blockscout indexer (strictly Base USDC)
      const onChainTxs = await Web3Service.fetchOnChainTransactions(targetAddress, targetNetwork);

      const isInitialHydration = !isInitialSyncCompletedRef.current;
      const alreadyNotified = db.getNotifiedTxHashes(profileKey);
      const newlyReceivedTxsToAlert: SyncedOnChainTx[] = [];
      const allProcessedHashes: string[] = [];

      setTransactions((prevTransactions) => {
        let updatedList = [...prevTransactions];
        const existingLedger = db.getOnChainLedger(profileKey);

        // 3a. Process transactions returned by the blockchain indexer
        for (const onTx of onChainTxs) {
          if (!onTx.txHash || !isRealTxHash(onTx.txHash)) {
            continue;
          }

          allProcessedHashes.push(onTx.txHash);

          // Sync into permanent on-chain ledger if not present
          const hasInLedger = existingLedger.some(
            (e) => e.txHash && e.txHash.toLowerCase() === onTx.txHash.toLowerCase()
          );
          if (!hasInLedger) {
            void db.recordOnChainEntry({
              txHash: onTx.txHash,
              timestamp: onTx.timestamp,
              blockNumber: onTx.blockNumber,
              fromAddress: onTx.fromAddress,
              toAddress: onTx.toAddress,
              amount: onTx.amount,
              tokenSymbol: onTx.tokenSymbol,
              gasFee: onTx.gasFee || 0,
              network: targetNetwork,
              status: 'confirmed',
              type: onTx.type,
              originalLabel:
                onTx.type === 'receive'
                  ? `Recebimento ${onTx.tokenSymbol}`
                  : `Envio ${onTx.tokenSymbol}`,
            }, profileKey);
          }

          // Check if already present in organized transaction history
          const existingIndex = updatedList.findIndex(
            (t) => t.txHash && t.txHash.toLowerCase() === onTx.txHash.toLowerCase()
          );

          if (existingIndex >= 0) {
            // Already tracked, keep user customizations
            continue;
          }

          // Real-time alert eligibility:
          // 1. NEVER during initial hydration/load of the app
          // 2. ONLY for genuine inbound USDC transfers to the user's wallet
          // 3. ONLY for FRESH transactions occurred in the last 3 minutes (not historical)
          // 4. MUST NOT have been in existing ledger or notified previously
          if (!isInitialHydration && !hasInLedger) {
            const txTimeMs = new Date(onTx.timestamp).getTime();
            const now = Date.now();
            const isFresh =
              !isNaN(txTimeMs) &&
              txTimeMs > 1000000000000 &&
              (now - txTimeMs) < 3 * 60 * 1000 &&
              (now - txTimeMs) >= 0;
            const isTargetReceiver = (onTx.toAddress || '').toLowerCase() === targetAddress.toLowerCase();

            if (
              onTx.type === 'receive' &&
              onTx.tokenSymbol === 'USDC' &&
              onTx.amount > 0 &&
              isTargetReceiver &&
              isFresh &&
              !alreadyNotified.has(onTx.txHash.toLowerCase())
            ) {
              newlyReceivedTxsToAlert.push(onTx);
            }
          }

          // Otherwise, insert new organized transaction
          const defaultCat =
            onTx.type === 'receive'
              ? categories.find((c) =>
                  ['salary', 'freela', 'allowance', 'crypto'].some((k) =>
                    c.id.toLowerCase().includes(k) || c.name.toLowerCase().includes(k)
                  )
                ) || categories.find((c) => c.type === 'income') || categories[0]
              : categories.find((c) =>
                  ['munchies', 'food', 'subs', 'games'].some((k) =>
                    c.id.toLowerCase().includes(k) || c.name.toLowerCase().includes(k)
                  )
                ) || categories.find((c) => c.type === 'expense') || categories[0];

          const savedContacts = db.getContacts(profileKey);
          const counterpartyAddr = onTx.type === 'receive' ? onTx.fromAddress : onTx.toAddress;
          const matchedContact = savedContacts.find(
            (c) => c.address.toLowerCase() === (counterpartyAddr || '').toLowerCase()
          );
          const counterpartyDisplay = matchedContact
            ? matchedContact.name
            : Web3Service.truncateAddress(counterpartyAddr);

          const newOrganizedTx: Transaction = {
            id: `tx-onchain-${onTx.txHash}`,
            type: onTx.type === 'receive' ? 'income' : 'expense',
            amount: onTx.amount,
            categoryId: defaultCat?.id || 'salary',
            description:
              onTx.type === 'receive'
                ? `Recebimento ${onTx.tokenSymbol}: ${counterpartyDisplay}`
                : `Envio ${onTx.tokenSymbol}: ${counterpartyDisplay}`,
            date: onTx.timestamp,
            isOnChain: true,
            txHash: onTx.txHash,
            tokenSymbol: onTx.tokenSymbol,
            paymentMethod: 'crypto',
            notes: `Liquidado na Base L2 • ${onTx.tokenSymbol} • De: ${Web3Service.truncateAddress(onTx.fromAddress)} • Para: ${Web3Service.truncateAddress(onTx.toAddress)}`,
            isOrganized: true,
          };

          updatedList.unshift(newOrganizedTx);
        }

        // Clean out any simulated or synthetic transactions from the final list
        const cleanList = sanitizeTransactions(updatedList);

        // Save sanitized real transactions to local storage immediately
        void db.saveTransactions(cleanList, profileKey);
        return cleanList;
      });

      // Mark all processed transactions as notified/known in storage so they can NEVER trigger false notifications
      if (allProcessedHashes.length > 0) {
        void db.markTxHashesNotified(allProcessedHashes, profileKey);
      }

      if (isInitialHydration) {
        // Initial sync completed quietly: do not notify for past events
        isInitialSyncCompletedRef.current = true;
      } else if (newlyReceivedTxsToAlert.length > 0) {
        // Only notify if there are genuine, freshly arrived real-time USDC transactions
        const totalReceived = newlyReceivedTxsToAlert.reduce((sum, tx) => sum + tx.amount, 0);
        const firstNewTx = newlyReceivedTxsToAlert[0];
        const savedContacts = db.getContacts(profileKey);
        const matchedContact = savedContacts.find(
          (c) => c.address.toLowerCase() === (firstNewTx?.fromAddress || '').toLowerCase()
        );

        // Display interactive 1-Tap Quick Categorization notification banner
        setPendingQuickCategorizeTx({
          id: `tx-onchain-${firstNewTx.txHash}`,
          amount: totalReceived,
          tokenSymbol: firstNewTx.tokenSymbol || 'USDC',
          fromAddress: firstNewTx.fromAddress,
          txHash: firstNewTx.txHash,
          contactName: matchedContact?.name,
        });

        triggerHaptic('success');
        if (user.pushNotificationsEnabled && user.notifyOnReceivePayment !== false) {
          NotificationService.notifyPaymentReceived({
            amount: totalReceived,
            tokenSymbol: 'USDC',
            fromAddress: firstNewTx?.fromAddress,
          });
        }
      } else if (options?.showToastOnSync) {
        showToast(isEn ? 'Activity & wallet synced with Base! ✨' : 'Extrato e carteira sincronizados com a Base! ✨', '✅');
        triggerHaptic('success');
      }
    } catch (err) {
      console.warn('Could not query on-chain balance/transactions from Base:', err);
      if (options?.showToastOnSync) {
        showToast(isEn ? 'Could not sync with Base network.' : 'Não foi possível sincronizar com a Base.', '⚠️');
      }
    } finally {
      setIsRefreshingOnChain(false);
    }
  }, [user.walletAddress, user.web3Network, user.isGuest, user.pushNotificationsEnabled, user.notifyOnReceivePayment, user.email, user.authId, categories, showToast]);

  // Sync on-chain balance on mount and when tab regains focus (throttled)
  useEffect(() => {
    if (user.walletAddress && !user.isGuest) {
      lastSyncTimestampRef.current = Date.now();
      refreshOnChainBalance(user.walletAddress, user.web3Network);
    }
    const handleFocus = () => {
      const now = Date.now();
      // Throttle: avoid re-querying if focused within 25 seconds
      if (now - lastSyncTimestampRef.current < 25000) {
        return;
      }
      lastSyncTimestampRef.current = now;
      if (user.walletAddress && !user.isGuest) {
        refreshOnChainBalance(user.walletAddress, user.web3Network);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user.walletAddress, user.web3Network, user.isGuest, refreshOnChainBalance]);

  const handleGlobalRefresh = useCallback(async () => {
    // 1. Refresh market exchange rate
    refreshExchangeRate();
    // 2. Refresh on-chain balance and transactions on Base
    if (user.walletAddress) {
      await refreshOnChainBalance(user.walletAddress, user.web3Network, { showToastOnSync: true });
    }
    // 3. Synchronize with cloud storage (if authenticated)
    if (user.isLoggedIn && user.email) {
      try {
        await db.saveToCloud(user, categories, vaults, transactions);
      } catch {}
    }
  }, [user, categories, vaults, transactions, refreshExchangeRate, refreshOnChainBalance]);

  // Mobile pull-to-refresh hook
  const {
    pullDistance,
    isRefreshing: isPullRefreshing,
    isTriggered: isPullTriggered,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh({
    onRefresh: handleGlobalRefresh,
    disabled: !user.isLoggedIn,
  });

  // Attach touch listeners directly to scroll container
  useEffect(() => {
    const el = contentContainerRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => handleTouchStart(e, el);
    const onMove = (e: TouchEvent) => handleTouchMove(e, el);
    const onEnd = () => handleTouchEnd();

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Auto-lock when user leaves app in background for a while or reopens
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem('cofre_last_background_ts', Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        const lastBg = sessionStorage.getItem('cofre_last_background_ts');
        if (lastBg) {
          const elapsedSeconds = (Date.now() - parseInt(lastBg, 10)) / 1000;
          // If in background for more than 60 seconds, re-lock the app if device security is active
          if (elapsedSeconds > 60) {
            const isDeviceSecurityActive = WebAuthnService.isDeviceSecurityEnabled(
              user.deviceSecurityEnabled ?? user.appLockEnabled
            );
            if (isDeviceSecurityActive) {
              WebAuthnService.setSessionUnlocked(false);
              setIsAppLocked(true);
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user.deviceSecurityEnabled, user.appLockEnabled]);

  // Listen for Service Worker notification click events to navigate seamlessly to the target tab
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE_TAB' && event.data.tab) {
          const tab = event.data.tab;
          if (['home', 'vaults', 'analytics', 'transactions', 'profile'].includes(tab)) {
            setActiveTab(tab as TabType);
          }
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  }, []);
  
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'offline' | 'error'>(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }
    return user.isGoogleAuth ? 'synced' : 'offline';
  });

  // Persistent Auth State Listener: automatically restore Google user session across browser restarts / PWA closes
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = authService.onAuthStateChanged(async (fbUser) => {
      if (!isMounted) return;

      // Strict provider separation protection:
      // If currently active user is logged in via Discord or in Guest/Offline mode,
      // NEVER allow Firebase Google Auth to overwrite the active profile!
      const currentActiveUser = db.getUser();
      if (
        currentActiveUser.isLoggedIn &&
        (currentActiveUser.provider === 'discord' || currentActiveUser.provider === 'guest' || currentActiveUser.isGuest)
      ) {
        if (isMounted) {
          setIsAuthChecking(false);
        }
        return;
      }

      // If no user is logged in via Firebase, complete check and unblock rendering
      if (!fbUser || !fbUser.email) {
        if (isMounted) {
          setIsAuthChecking(false);
        }
        return;
      }

      const userEmail = fbUser.email.trim();
      const sanitizedEmail = userEmail.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
      const googleProfileKey = `google_${sanitizedEmail}`;
      const displayName = fbUser.displayName || userEmail.split('@')[0];
      const photoURL = fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}`;

      try {
        // Isolated asynchronous Firestore lookup for Google account with full identity resolution
        const cloudData = await db.loadFromCloud(googleProfileKey, userEmail, fbUser.uid);

        // Check local storage candidates
        const candidateProfileKeys = [
          googleProfileKey,
          sanitizedEmail,
          userEmail.toLowerCase(),
          userEmail,
          fbUser.uid,
        ];

        let localExistingCandidate: UserProfile | null = null;
        for (const k of candidateProfileKeys) {
          const u = db.getUser(k);
          if (
            u &&
            (u.walletAddress || u.termsAccepted || u.hasCompletedOnboarding || (u.email && u.email.toLowerCase() === userEmail.toLowerCase()))
          ) {
            localExistingCandidate = u;
            break;
          }
        }

        // Early-return logic: verify if Google profile already has a complete Firestore record or local record
        const hasCompleteFirestoreRecord = Boolean(
          cloudData &&
          (cloudData.user || cloudData.email || (cloudData as any).walletAddress) &&
          (
            (cloudData.user && (cloudData.user.walletAddress || cloudData.user.termsAccepted || cloudData.user.hasCompletedOnboarding)) ||
            (cloudData as any).walletAddress ||
            (cloudData as any).termsAccepted ||
            (cloudData.categories && cloudData.categories.length > 0) ||
            (cloudData.transactions && cloudData.transactions.length > 0) ||
            (cloudData.vaults && cloudData.vaults.length > 0)
          )
        );

        const hasCompleteLocalRecord = Boolean(
          localExistingCandidate &&
          (localExistingCandidate.walletAddress || localExistingCandidate.termsAccepted || localExistingCandidate.hasCompletedOnboarding)
        );

        if ((hasCompleteFirestoreRecord || hasCompleteLocalRecord) && isMounted) {
          const cloudUser = cloudData?.user || localExistingCandidate;
          if (!cloudUser) {
            if (isMounted) setIsAuthChecking(false);
            return;
          }

          const localCustomAvatar = db.getCustomAvatar(googleProfileKey);
          const localBackupAvatar = db.getPersistedAvatar(googleProfileKey);
          const cloudCustomAvatar = (cloudData as any)?.customAvatarUrl ||
            (isCustomUserAvatar(cloudUser.avatarUrl) ? cloudUser.avatarUrl : null);

          let resolvedAvatar = photoURL;

          if (cloudCustomAvatar && isCustomUserAvatar(cloudCustomAvatar)) {
            resolvedAvatar = cloudCustomAvatar;
            void db.setCustomAvatar(cloudCustomAvatar, googleProfileKey);
          } else if (cloudUser.avatarUrl && isCustomUserAvatar(cloudUser.avatarUrl)) {
            resolvedAvatar = cloudUser.avatarUrl;
            void db.setCustomAvatar(cloudUser.avatarUrl, googleProfileKey);
          } else if (localCustomAvatar && isCustomUserAvatar(localCustomAvatar)) {
            resolvedAvatar = localCustomAvatar;
          } else if (localBackupAvatar && isCustomUserAvatar(localBackupAvatar)) {
            resolvedAvatar = localBackupAvatar;
          } else if (fbUser.photoURL && fbUser.photoURL.startsWith('http')) {
            resolvedAvatar = fbUser.photoURL;
          } else {
            resolvedAvatar = photoURL;
          }

          let walletAddress = cloudUser.walletAddress || (cloudData as any)?.walletAddress || '';
          let walletPrivateKey = cloudUser.walletPrivateKey || '';
          let walletMnemonic: string | undefined = cloudUser.walletMnemonic || undefined;

          try {
            // ALWAYS validates/connects local wallet to ensure the displayed address
            // strictly corresponds to the private key present on this device (prevents "phantom wallet").
            const walletRes = await Web3Service.connectGoogleWallet(
              userEmail,
              'base',
              googleProfileKey,
              walletPrivateKey || undefined
            );
            if (walletRes.address) {
              walletAddress = walletRes.address;
            }
            if (walletRes.privateKey) {
              walletPrivateKey = walletRes.privateKey;
            }
            if (walletRes.mnemonic) {
              walletMnemonic = walletRes.mnemonic;
            }
            if (walletRes.isNewlyCreated && walletRes.privateKey) {
              setMandatoryBackupState({
                isOpen: true,
                publicAddress: walletRes.address,
                privateKey: walletRes.privateKey,
                mnemonic: walletRes.mnemonic,
              });
            }
          } catch (err) {
            console.warn('Erro ao conectar carteira Web3 no restore:', err);
          }

          const fullyRestoredUser: UserProfile = {
            ...DEFAULT_USER,
            ...cloudUser,
            isLoggedIn: true,
            isGoogleAuth: true,
            provider: 'google',
            authId: googleProfileKey,
            email: userEmail,
            name: cloudUser.name || displayName,
            username: cloudUser.username || userEmail.split('@')[0],
            avatarUrl: resolvedAvatar,
            walletAddress: walletAddress || cloudUser.walletAddress,
            walletPrivateKey: walletPrivateKey || cloudUser.walletPrivateKey,
            walletMnemonic,
            web3Network: cloudUser.web3Network || 'base',
            web3Enabled: true,
            hasCompletedOnboarding: true,
            termsAccepted: true,
            termsAcceptedAt: cloudUser.termsAcceptedAt || new Date().toISOString(),
            dailySpendLimit: typeof cloudUser.dailySpendLimit === 'number' ? cloudUser.dailySpendLimit : 50,
          };

          // Save isolated record in local storage under Google profile key
          db.setActiveProfileKey(googleProfileKey);
          void db.saveUser(fullyRestoredUser, googleProfileKey);
          void db.setPersistedAvatar(resolvedAvatar, googleProfileKey);

          const resolvedCats = (cloudData?.categories && cloudData.categories.length > 0)
            ? cloudData.categories
            : db.getCategories(googleProfileKey);
          if (resolvedCats && resolvedCats.length > 0) {
            setCategories(resolvedCats);
            void db.saveCategories(resolvedCats, googleProfileKey);
          }

          const resolvedVaults = cloudData?.vaults || db.getVaults(googleProfileKey);
          if (resolvedVaults) {
            setVaults(resolvedVaults);
            void db.saveVaults(resolvedVaults, googleProfileKey);
          }

          const resolvedTxs = cloudData?.transactions || db.getTransactions(googleProfileKey);
          if (resolvedTxs) {
            const cleanTxs = sanitizeTransactions(resolvedTxs);
            setTransactions(cleanTxs);
            void db.saveTransactions(cleanTxs, googleProfileKey);
            if (cloudData?.transactions && cleanTxs.length !== cloudData.transactions.length && fullyRestoredUser.email) {
              db.purgeSimulatedDataFromCloud(googleProfileKey, fullyRestoredUser.email).catch(() => {});
            }
          }

          const isSecurityActive = WebAuthnService.isDeviceSecurityEnabled(
            cloudUser.deviceSecurityEnabled ?? (cloudUser.appLockEnabled ?? (fullyRestoredUser.deviceSecurityEnabled ?? fullyRestoredUser.appLockEnabled))
          );

          if (isSecurityActive) {
            WebAuthnService.setDeviceSecurityEnabled(true);
            fullyRestoredUser.deviceSecurityEnabled = true;
            fullyRestoredUser.appLockEnabled = true;
            fullyRestoredUser.requireAuthForPayments = true;
            fullyRestoredUser.passkeyEnabled = true;
            if (!WebAuthnService.isSessionUnlocked()) {
              setIsAppLocked(true);
            }
          }

          // Synchronously update React state with restored data
          setUser(fullyRestoredUser);
          setIsOnboardingModalOpen(false);
          setIsAuthChecking(false);
          setSyncStatus('synced');

          if (walletAddress) {
            refreshOnChainBalance(walletAddress, fullyRestoredUser.web3Network);
          }

          void db.saveToCloud(fullyRestoredUser, resolvedCats || [], resolvedVaults || [], resolvedTxs || []);

          return;
        }

        // If no complete Firestore record exists (new user without prior registration):
        // Do not force automatic login so LoginScreen can present terms acceptance flow.
        if (isMounted) {
          setIsAuthChecking(false);
        }
        return;
      } catch (err) {
        console.warn('Silent session restore error:', err);
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    });

    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setIsAuthChecking(false);
      }
    }, 4500);

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  // GA4: Track app open, standalone display mode, and initial screen
  useEffect(() => {
    AnalyticsService.trackAppOpen(APP_VERSION);
    AnalyticsService.trackScreenView('home');
  }, []);

  // Auto trigger onboarding on first opening if user has not completed it yet
  useEffect(() => {
    if (user.isLoggedIn && !user.hasCompletedOnboarding) {
      setIsOnboardingModalOpen(true);
    }
  }, [user.isLoggedIn, user.hasCompletedOnboarding]);

  // Keep local storage in sync when state changes
  useEffect(() => {
    void db.saveUser(user);
  }, [user]);

  // Migration/alignment on mount: ensure all vaults match user.currency
  useEffect(() => {
    setVaults(prev => {
      let changed = false;
      const updated = prev.map(v => {
        if (v.currency && v.currency !== user.currency) {
          changed = true;
          const dynamicRate = ExchangeRateService.getRate();
          const mult = user.currency === 'BRL' ? dynamicRate : (1 / dynamicRate);
          return {
            ...v,
            targetAmount: Math.round(v.targetAmount * mult * 100) / 100,
            currentAmount: Math.round(v.currentAmount * mult * 100) / 100,
            currency: user.currency,
          };
        }
        if (!v.currency) {
          changed = true;
          return {
            ...v,
            currency: user.currency,
          };
        }
        return v;
      });
      return changed ? updated : prev;
    });
  }, []);

  useEffect(() => {
    void db.saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    void db.saveVaults(vaults);
  }, [vaults]);

  useEffect(() => {
    void db.saveTransactions(transactions);
  }, [transactions]);

  // Initial cloud restore on login / page load (silent sync)
  useEffect(() => {
    if (user.isLoggedIn && (user.email || user.authId)) {
      // Discord logins operate in isolated local storage (Web3 offline-first, no Firebase Auth session)
      if (user.provider === 'discord' || !user.isGoogleAuth) {
        setSyncStatus('synced');
        return;
      }

      const syncKey = user.authId || `google_${(user.email || '').toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      setSyncStatus('syncing');
      db.loadFromCloud(syncKey, user.email, user.authId).then((cloudData) => {
        if (cloudData) {
          // Automatic silent merge: combines local records with cloud history without friction or duplicates
          const merged = mergeLocalAndCloudData(
            { user, categories, vaults, transactions },
            cloudData
          );

          setUser(merged.user);
          setCategories(merged.categories);
          setVaults(merged.vaults);
          setTransactions(merged.transactions);

          if (merged.hasMergedLocalItems) {
            // Upload merged state back to cloud silently so cloud has everything
            db.saveToCloud(
              merged.user,
              merged.categories,
              merged.vaults,
              merged.transactions
            )
              .then(() => {
                setSyncStatus('synced');
              })
              .catch(() => setSyncStatus('error'));
          } else {
            setSyncStatus('synced');
          }
        } else {
          // If first time on cloud for this account, upload baseline silently in background
          db.saveToCloud(user, categories, vaults, transactions)
            .then(() => {
              setSyncStatus('synced');
            })
            .catch(() => setSyncStatus('error'));
        }
      }).catch((e) => {
        console.warn('Could not pull initial cloud data:', e);
        setSyncStatus('synced');
      });
    } else {
      setSyncStatus('synced');
    }
  }, [user.isLoggedIn, user.email, user.authId]);

  // Network connection event listeners: detect when app goes offline / online in real-time
  useEffect(() => {
    const handleOnline = () => {
      if (user.isLoggedIn && user.email) {
        setSyncStatus('syncing');
        db.saveToCloud(user, categories, vaults, transactions)
          .then((ok) => {
            setSyncStatus(ok ? 'synced' : 'error');
          })
          .catch(() => setSyncStatus('error'));
      } else {
        setSyncStatus('synced');
      }
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, categories, vaults, transactions]);

  // Debounced auto-save to cloud whenever data changes (2000ms debounce saves writes during rapid typing/editing)
  useEffect(() => {
    if (!user.isLoggedIn || !user.email) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    
    setSyncStatus('syncing');
    const timer = setTimeout(() => {
      db.saveToCloud(user, categories, vaults, transactions)
        .then((ok) => {
          setSyncStatus(ok ? 'synced' : 'error');
        })
        .catch(() => {
          setSyncStatus('error');
        });
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, categories, vaults, transactions]);

  // Financial Calculations (On-Chain Wallet Truth + Internal App Vaults & Movements)
  const calculations = useMemo(() => {
    // Total income and expense from manual / tracked entries (excluding internal vault transfers)
    const totalIncome = transactions
      .filter(t => t.type === 'income' && !t.vaultId && t.categoryId !== 'vault_deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense' && !t.vaultId && t.categoryId !== 'vault_deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    // Locked in active and completed vaults
    const lockedInVaults = Math.round(vaults.reduce((sum, v) => sum + v.currentAmount, 0) * 100) / 100;

    // Real On-Chain balance from the Base Blockchain
    const realOnChainUsdc = onChainBalances.usdc;

    // Tracked on-chain transactions sum in app history
    const onChainTxNet = transactions
      .filter(t => t.isOnChain)
      .reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);

    // If on-chain RPC returned funds (> 0), that is the authoritative live truth from Base!
    // Otherwise, if the app has recorded on-chain transactions, use that net amount.
    const effectiveWalletBalance = realOnChainUsdc > 0 
      ? realOnChainUsdc 
      : Math.max(0, onChainTxNet);

    // Net off-chain manual income and expenses (e.g. transfers, cash)
    // Exclude internal vault transfers so funds aren't deducted twice
    const manualIncome = transactions
      .filter(t => !t.isOnChain && t.type === 'income' && !t.vaultId && t.categoryId !== 'vault_deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const manualExpense = transactions
      .filter(t => !t.isOnChain && t.type === 'expense' && !t.vaultId && t.categoryId !== 'vault_deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const baseInitialBalance = typeof user.initialBalance === 'number' ? user.initialBalance : 0;
    
    // If user has a wallet balance on Base:
    // available balance is the wallet balance minus what was committed to vaults + manual movements.
    // If no crypto balance, fall back to initial base + total movements - locked in vaults.
    const rawAvailable = effectiveWalletBalance > 0
      ? effectiveWalletBalance - lockedInVaults + manualIncome - manualExpense
      : baseInitialBalance + totalIncome - totalExpense - lockedInVaults;

    const availableBalance = Math.max(0, Math.round(rawAvailable * 100) / 100);
    const totalBalance = Math.max(0, Math.round((availableBalance + lockedInVaults) * 100) / 100);

    // Spending today
    const now = new Date();
    const todayStr = now.toDateString();
    const spentToday = transactions
      .filter(t => t.type === 'expense' && new Date(t.date).toDateString() === todayStr)
      .reduce((sum, t) => sum + t.amount, 0);

    // Last 7 days net difference (weekly delta)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentWeeklyIncome = transactions
      .filter(t => t.type === 'income' && new Date(t.date) >= sevenDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    const recentWeeklyExpense = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= sevenDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    const weeklyDelta = recentWeeklyIncome - recentWeeklyExpense;

    return {
      totalBalance,
      availableBalance,
      lockedInVaults,
      spentToday,
      weeklyDelta: weeklyDelta || (totalIncome > 0 ? totalIncome - totalExpense : 0),
    };
  }, [transactions, vaults, user.initialBalance, onChainBalances.usdc]);

  // Handler: Update categories with safe transaction reassignment for deleted categories
  const handleUpdateCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    void db.saveCategories(newCategories);

    const existingCatIds = new Set(newCategories.map(c => c.id));
    let latestTxList = transactions;

    setTransactions(prev => {
      let hasOrphans = false;
      const updated = prev.map(tx => {
        if (!existingCatIds.has(tx.categoryId)) {
          hasOrphans = true;
          return {
            ...tx,
            categoryId: tx.type === 'income' ? 'crypto' : 'other',
          };
        }
        return tx;
      });
      if (hasOrphans) {
        latestTxList = updated;
        void db.saveTransactions(updated);
      }
      return hasOrphans ? updated : prev;
    });

    if (user.isLoggedIn && user.isGoogleAuth) {
      db.saveToCloud(user, newCategories, vaults, latestTxList).catch(e => {
        console.warn('Cloud sync categories update warning:', e);
      });
    }
  };

  // Handler: Add new transaction
  const handleSaveTransaction = (data: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    description: string;
    date: string;
    vaultId?: string;
  }) => {
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      type: data.type,
      amount: data.amount,
      categoryId: data.categoryId,
      description: data.description,
      date: data.date,
      vaultId: data.vaultId,
      paymentMethod: 'crypto',
      isOnChain: false,
      tokenSymbol: 'USDC',
      isOrganized: true,
    };

    // If transaction involves a vault
    if (data.vaultId) {
      // If locking funds into vault as an expense, ensure user has available balance
      if (data.type === 'expense') {
        if (calculations.availableBalance <= 0 || data.amount > calculations.availableBalance) {
          showToast('Saldo insuficiente para guardar neste cofre!', '⚠️');
          triggerHaptic('warning');
          return;
        }
      }

      setVaults(prev => prev.map(v => {
        if (v.id === data.vaultId) {
          const newCurrent = data.type === 'expense' 
            ? v.currentAmount + data.amount 
            : Math.max(0, v.currentAmount - data.amount);
          const isCompleted = newCurrent >= v.targetAmount;
          return {
            ...v,
            currentAmount: newCurrent,
            completed: isCompleted,
            completedAt: isCompleted ? new Date().toISOString() : undefined,
          };
        }
        return v;
      }));
    }

    setTransactions(prev => [newTx, ...prev]);
  };

  // Currency switcher for secondary quote display (supports Top 10+ global currencies)
  const handleChangeCurrency = (newMode: string) => {
    const targetCurrency = (newMode || 'USD').toUpperCase();
    const currentCurrency = (user.currency || 'USD').toUpperCase();

    if (targetCurrency === currentCurrency) return;

    const targetRate = ExchangeRateService.getRate(targetCurrency);
    const targetConfig = getCurrencyConfig(targetCurrency, language);

    // 1. Update user profile currency
    setUser(prev => {
      const updated = {
        ...prev,
        currency: targetCurrency,
      };
      void db.saveUser(updated);
      if (updated.email) {
        db.saveToCloud(updated, categories, vaults, transactions).catch(() => {});
      }
      return updated;
    });

    // 2. Feedback toast with real exchange rate
    showToast(
      language === 'pt-BR'
        ? `Moeda alterada para ${targetConfig.flag} ${targetConfig.name} (1 USDC ≈ ${targetConfig.symbol} ${targetRate.toFixed(2)})`
        : `Currency set to ${targetConfig.flag} ${targetConfig.name} (1 USDC ≈ ${targetConfig.symbol} ${targetRate.toFixed(2)})`,
      '💱'
    );
  };

  // Handler: Create Vault
  const handleCreateVault = (vaultData: Omit<Vault, 'id' | 'createdAt' | 'completed'>) => {
    // Initial amount cannot exceed current available balance
    const safeInitial = Math.min(
      vaultData.currentAmount,
      Math.max(0, calculations.availableBalance)
    );

    const newVault: Vault = {
      ...vaultData,
      currentAmount: safeInitial,
      id: `vault_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      completed: safeInitial >= vaultData.targetAmount,
      currency: user.currency,
    };
    setVaults(prev => [newVault, ...prev]);

    // If initial amount > 0, record deposit transaction to maintain balance consistency
    if (safeInitial > 0) {
      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        type: 'expense',
        amount: safeInitial,
        categoryId: 'vault_deposit',
        description: `Aporte inicial no cofre: ${vaultData.title}`,
        date: new Date().toISOString(),
        vaultId: newVault.id,
        isOrganized: true,
      };
      setTransactions(prev => [newTx, ...prev]);
    }
  };

  // Handler: Deposit to Vault
  const handleDepositVault = (vaultId: string, amount: number) => {
    const safeAmount = Math.round(amount * 100) / 100;
    if (safeAmount < 0.01) return;

    // Strict balance check: cannot deposit more than available balance (with tiny epsilon for float safety)
    const available = Math.round(calculations.availableBalance * 100) / 100;
    if (available <= 0 || safeAmount > (available + 0.0001)) {
      showToast(`Saldo insuficiente (${formatCurrency(available, user.currency)})`, '⚠️');
      triggerHaptic('warning');
      return;
    }

    setVaults(prev => prev.map(v => {
      if (v.id === vaultId) {
        const newAmt = Math.round((v.currentAmount + safeAmount) * 100) / 100;
        const isComp = newAmt >= v.targetAmount;
        return {
          ...v,
          currentAmount: newAmt,
          completed: isComp,
          completedAt: isComp ? new Date().toISOString() : undefined,
        };
      }
      return v;
    }));

    // Log transaction
    const vault = vaults.find(v => v.id === vaultId);
    if (vault) {
      const isComp = (vault.currentAmount + safeAmount) >= vault.targetAmount;
      if (isComp && user.pushNotificationsEnabled && user.notifyOnVaultMilestone !== false) {
        NotificationService.notifyVaultMilestone({
          vaultTitle: vault.title,
          currentAmount: vault.currentAmount + safeAmount,
          targetAmount: vault.targetAmount,
          percent: 100,
          emoji: vault.emoji || '🎯',
        });
      }

      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        type: 'expense',
        amount: safeAmount,
        categoryId: 'vault_deposit',
        description: `Depósito no cofre: ${vault.title}`,
        date: new Date().toISOString(),
        vaultId: vault.id,
        isOrganized: true,
      };
      setTransactions(prev => [newTx, ...prev]);
      showToast(isEn ? `Saved ${formatCurrency(safeAmount, user.currency)} in vault!` : `Guardado ${formatCurrency(safeAmount, user.currency)} no cofre!`, '🔒');
    }
  };

  // Handler: Withdraw from Vault
  const handleWithdrawVault = (vaultId: string, amount: number) => {
    const rawAmount = Math.round(amount * 100) / 100;
    if (rawAmount < 0.01) return;

    const vault = vaults.find(v => v.id === vaultId);
    if (!vault || vault.currentAmount <= 0) {
      showToast(isEn ? 'No available balance in this vault!' : 'Não há saldo disponível neste cofre!', '⚠️');
      triggerHaptic('warning');
      return;
    }

    const safeAmount = Math.min(rawAmount, vault.currentAmount);

    setVaults(prev => prev.map(v => {
      if (v.id === vaultId) {
        const newAmt = Math.max(0, Math.round((v.currentAmount - safeAmount) * 100) / 100);
        return {
          ...v,
          currentAmount: newAmt,
          completed: false,
        };
      }
      return v;
    }));

    // Log transaction
    if (vault) {
      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        type: 'income',
        amount: safeAmount,
        categoryId: 'vault_deposit',
        description: isEn ? `Withdrawal from vault: ${vault.title}` : `Resgate do cofre: ${vault.title}`,
        date: new Date().toISOString(),
        vaultId: vault.id,
        isOrganized: true,
      };
      setTransactions(prev => [newTx, ...prev]);
      showToast(isEn ? `Unlocked ${formatCurrency(safeAmount, user.currency)} from vault!` : `Resgatado ${formatCurrency(safeAmount, user.currency)} do cofre!`, '🔓');
    }
  };

  // Handler: Delete Vault
  const handleDeleteVault = (vaultId: string) => {
    const vault = vaults.find(v => v.id === vaultId);
    setVaults(prev => prev.filter(v => v.id !== vaultId));
    showToast(isEn ? `Vault "${vault?.title || ''}" deleted!` : `Cofre "${vault?.title || ''}" excluído!`, '🗑️');
  };

  // Handler: Delete Transaction
  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    showToast(isEn ? `Item "${tx?.description || 'Transaction'}" deleted!` : `Lançamento "${tx?.description || 'Transação'}" excluído!`, '🗑️');
  };

  // Automatic Background Sweep: Purge simulated or unverified transactions from App and Cloud Database
  useEffect(() => {
    const runAutoPurge = async () => {
      // 1. Purge from local storage
      await db.purgeSimulatedData();

      // 2. Filter in React state
      setTransactions((prev) => {
        const clean = sanitizeTransactions(prev);
        if (clean.length !== prev.length) {
          void db.saveTransactions(clean);
          return clean;
        }
        return prev;
      });

      setVaults((prev) => {
        const DEMO_VAULT_IDS = new Set(['vault_1', 'vault_2', 'vault_3', 'vault_4']);
        const clean = prev.filter((v) => !DEMO_VAULT_IDS.has(v.id));
        if (clean.length !== prev.length) {
          void db.saveVaults(clean);
          return clean;
        }
        return prev;
      });

      // 3. Purge from Firestore cloud if user is logged in
      if (user.isLoggedIn && user.email) {
        try {
          await db.purgeSimulatedDataFromCloud(user.email);
        } catch (e) {
          console.warn('[AutoPurge] Cloud purge warning:', e);
        }
      }
    };

    runAutoPurge();
  }, [user.isLoggedIn, user.email]);

  // Handler: Purge Simulated / Non-Real Transactions across App & Cloud Database
  const handlePurgeSimulatedTransactions = async () => {
    // 1. Purge from local storage
    await db.purgeSimulatedData();

    // 2. Filter in React state
    const cleanTxs = sanitizeTransactions(transactions);
    setTransactions(cleanTxs);
    await db.saveTransactions(cleanTxs);

    const DEMO_VAULT_IDS = new Set(['vault_1', 'vault_2', 'vault_3', 'vault_4']);
    const cleanVaults = vaults.filter((v) => !DEMO_VAULT_IDS.has(v.id));
    setVaults(cleanVaults);
    await db.saveVaults(cleanVaults);

    // 3. Purge from Firestore cloud if user is logged in
    let cloudPurged = 0;
    if (user.isLoggedIn && user.email) {
      const res = await db.purgeSimulatedDataFromCloud(user.email);
      cloudPurged = res.purgedCount;
    }

    // 4. Trigger on-chain refresh to guarantee only genuine Base blockchain transactions
    if (user.walletAddress) {
      await refreshOnChainBalance(user.walletAddress, user.web3Network, { showToastOnSync: false });
    }
  };

  // Handler: Reload All Data
  const handleReloadAllData = () => {
    setUser(db.getUser());
    setCategories(db.getCategories());
    setVaults(db.getVaults());
    setTransactions(db.getTransactions());
  };

  // Handler: Update User Profile with immediate dual persistence (LocalStorage + Cloud)
  const handleUpdateUser = (updated: UserProfile) => {
    const finalAvatar = updated.avatarUrl || user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=BaseCofre';

    const userWithAvatar: UserProfile = {
      ...updated,
      avatarUrl: finalAvatar,
    };

    if (isCustomUserAvatar(finalAvatar)) {
      void db.setCustomAvatar(finalAvatar, userWithAvatar.authId);
    } else {
      void db.clearCustomAvatar(userWithAvatar.authId);
    }

    setUser(userWithAvatar);
    void db.saveUser(userWithAvatar);
    if (userWithAvatar.isLoggedIn) {
      db.saveToCloud(userWithAvatar, categories, vaults, transactions).catch(e => {
        console.warn('Cloud sync on user update warning:', e);
      });
    }
  };

  // Handler: Complete Onboarding Flow
  const handleCompleteOnboarding = (dailyLimit: number) => {
    triggerHaptic('success');
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#B8F256', '#E4F97E', '#000000', '#A855F7'],
    });

    const finalLimit = typeof dailyLimit === 'number' && dailyLimit > 0 ? dailyLimit : 0;

    setUser(prev => {
      const updated = {
        ...prev,
        dailySpendLimit: finalLimit,
        hasCompletedOnboarding: true,
      };
      // Immediately persist locally so it is never triggered again
      void db.saveUser(updated);
      if (updated.email) {
        void db.saveToCloud(updated, categories, vaults, transactions);
      }
      return updated;
    });
    setIsOnboardingModalOpen(false);
    if (finalLimit > 0) {
      showToast(isEn ? `Daily budget saved: ${formatCurrency(finalLimit, user.currency)}!` : `Meta diária salva: ${formatCurrency(finalLimit, user.currency)}!`, '🎯');
    } else {
      showToast(isEn ? 'Welcome to CofreAdmin! 🚀' : 'Bem-vindo ao CofreAdmin! 🚀', '⚡');
    }
  };

  // Handler: Reset to Factory Defaults and return to Initial Home Screen ("HOME")
  const handleResetToFactory = async () => {
    triggerHaptic('success');

    const preservedEmail = user.email?.trim() || 'usuario@gmail.com';
    const preservedName = user.name && user.name !== 'Convidado' && user.name !== 'Guest' ? user.name : (isEn ? 'Google User' : 'Usuário Google');
    const preservedAvatar = db.getCustomAvatar() || user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=CofreMaster&backgroundColor=b6e3f4,c0aede,ffd5dc';
    const preservedWallet = user.walletAddress || '';

    const resetUser: UserProfile = {
      ...DEFAULT_USER,
      id: user.id || DEFAULT_USER.id,
      name: preservedName,
      username: user.username || 'usuario',
      email: preservedEmail,
      avatarUrl: preservedAvatar,
      walletAddress: preservedWallet,
      walletPrivateKey: user.walletPrivateKey,
      isLoggedIn: true,
      isGoogleAuth: true,
      hasCompletedOnboarding: true,
      initialBalance: 0,
      dailySpendLimit: 50,
      streakDays: 0,
      hideBalance: false,
      currency: 'USD',
      web3Network: 'base',
      web3Enabled: true,
    };

    // 1. Reset local storage immediately (Zero test data, preserves wallet)
    await db.saveUser(resetUser);
    await db.saveCategories(DEFAULT_CATEGORIES);
    await db.saveVaults([]);
    await db.saveTransactions([]);
    await db.saveOnChainLedger([]);

    // 2. Reset in-memory React states
    setUser(resetUser);
    setCategories(DEFAULT_CATEGORIES);
    setVaults([]);
    setTransactions([]);
    setActiveTab('home');

    // 3. Immediately refresh real on-chain balance from Base so wallet funds stay visible!
    await refreshOnChainBalance(preservedWallet, user.web3Network || 'base');

    // 4. Force overwrite cloud state in Firestore immediately
    setSyncStatus('syncing');
    try {
      await db.saveToCloud(
        resetUser,
        DEFAULT_CATEGORIES,
        [],
        []
      );
      setSyncStatus('synced');
      showToast(isEn ? 'App data reset! Your wallet balance remains intact 🛡️' : 'Dados e cofres do app redefinidos! O saldo da sua carteira continua intacto 🛡️', '🔄');
    } catch (e) {
      console.warn('Cloud sync error on reset:', e);
      setSyncStatus('synced');
      showToast(isEn ? 'App data reset! Wallet balance preserved.' : 'Dados do app redefinidos! Saldo da carteira preservado.', '✨');
    }
  };

  // Handler: Delete Account and all Firebase Cloud Data permanently (LGPD Right to Erasure / Google Play Compliance)
  const handleDeleteAccountAndCloudData = async (deletionConsent?: {
    confirmed: boolean;
    confirmedAt: string;
    statement?: string;
  }) => {
    triggerHaptic('heavy');
    try {
      const emailToDelete = user.email?.trim();
      if (emailToDelete) {
        await db.deleteFromCloud(emailToDelete, user, deletionConsent);
      }

      // Sign out Firebase Auth and native Google session
      authService.signOut().catch(() => {});

      // Clear all local storage records, cached tokens, and encrypted private keys
      await db.clearAllHard();

      const emptyUser: UserProfile = {
        ...DEFAULT_USER,
        isLoggedIn: false,
        isGoogleAuth: false,
        name: isEn ? 'Guest' : 'Convidado',
        email: '',
      };

      setUser(emptyUser);
      setCategories(DEFAULT_CATEGORIES);
      setVaults([]);
      setTransactions([]);
      setActiveTab('home');
      setSyncStatus('offline');
      showToast(isEn ? 'Account deleted and privacy certificate archived.' : 'Conta excluída e certidão LGPD arquivada.', '🗑️');
    } catch (error) {
      console.error('Erro ao excluir conta da nuvem:', error);
      showToast(isEn ? 'Error processing cloud deletion.' : 'Erro ao processar exclusão na nuvem.', '⚠️');
    }
  };

  const handleLogout = () => {
    triggerHaptic('warning');
    authService.signOut().catch(() => {});
    WebAuthnService.setSessionUnlocked(false);
    setIsAppLocked(false);
    db.resetCache();
    void db.resetToDefaults();

    const emptyUser: UserProfile = {
      ...DEFAULT_USER,
      isLoggedIn: false,
    };

    setUser(emptyUser);
    setCategories(DEFAULT_CATEGORIES);
    setVaults([]);
    setTransactions([]);
    setOnChainBalances({
      usdc: 0,
      eth: 0,
      totalUsd: 0,
      formattedUsdc: '0.00',
      formattedEth: '0.0000',
    });
    setActiveTab('home');
  };

  const handleShareApp = async () => {
    triggerHaptic('medium');
    const isEn = language === 'en-US';
    const shareUrl = 'https://cofreadmin.gfin.app';
    const message = isEn
      ? `*CofreAdmin* — Own your money. Be the admin.\n\nSelf-Custodial Web3 Personal Finance. Send and receive payments. Organize, save and track your finances with ease.\n\nAccess: ${shareUrl}`
      : `*CofreAdmin* — Seja o admin da sua grana.\n\nCarteira digital Web3 & Gerenciador financeiro. Envie e receba pagamentos. Organize, poupe e acompanhe suas finanças de forma simples e direta.\n\nAcesse: ${shareUrl}`;

    // 1. Native file sharing with logo image (WhatsApp receives as attached photo with caption)
    if (typeof navigator !== 'undefined') {
      try {
        const currentCachedFile = isEn ? cachedShareLogoFileEn : cachedShareLogoFilePt;
        if (!currentCachedFile) {
          await prefetchShareLogo(language);
        }

        const fileToShare = isEn ? cachedShareLogoFileEn : cachedShareLogoFilePt;
        if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
          await navigator.share({
            files: [fileToShare],
            title: 'CofreAdmin',
            text: message,
          });
          return;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // User closed or canceled share dialog
        console.warn('Compartilhamento com arquivo não suportado, tentando URL:', err);
      }

      // 2. If device does not support direct file sharing, fallback to standard native URL share
      if (navigator.share) {
        try {
          const textWithoutUrl = isEn
            ? `*CofreAdmin* — Own your money. Be the admin.\n\nSelf-Custodial Web3 Personal Finance.`
            : `*CofreAdmin* — Seja o admin da sua grana.\n\nCarteira digital Web3 e gerenciador financeiro para você organizar, poupar e acompanhar seus ativos.`;
          await navigator.share({
            title: 'CofreAdmin',
            text: textWithoutUrl,
            url: shareUrl,
          });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }
    }

    // 3. Desktop fallback: copy text to clipboard and open WhatsApp Web
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
      }
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (win && !win.closed) {
        showToast(isEn ? 'Opening WhatsApp...' : 'Abrindo WhatsApp...', '💬');
      } else {
        showToast(isEn ? 'Message copied to clipboard!' : 'Mensagem copiada para compartilhar!', '📋');
      }
    } catch {
      showToast(isEn ? 'Link copied!' : 'Link copiado!', '🔗');
    }
  };

  // Handler: Save Daily Budget Modal
  const handleSaveDailyLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newDailyLimitInput);
    const finalLimitInActive = !isNaN(val) && val > 0 ? val : 0;
    const finalLimitUsdc = (activeDisplayCurrency === 'USDC' || activeDisplayCurrency === 'USD')
      ? finalLimitInActive
      : ExchangeRateService.convertToUsdc(finalLimitInActive, activeDisplayCurrency);

    triggerHaptic('success');
    setUser(prev => {
      const updated = { ...prev, dailySpendLimit: finalLimitUsdc };
      void db.saveUser(updated);
      if (updated.email) {
        void db.saveToCloud(updated, categories, vaults, transactions);
      }
      return updated;
    });
    setIsDailyBudgetModalOpen(false);
    if (finalLimitUsdc > 0) {
      showToast(isEn ? `New daily budget saved: ${formatCurrency(finalLimitInActive, activeDisplayCurrency)}!` : `Nova meta diária salva: ${formatCurrency(finalLimitInActive, activeDisplayCurrency)}!`, '🎯');
    } else {
      showToast(isEn ? 'Daily budget disabled (optional).' : 'Meta diária desativada (opcional).', '🎯');
    }
  };

  // Handler: Handle Crypto QR Code / 0x Scan Success
  const handleCryptoScanSuccess = (data: ParsedCryptoData) => {
    setScannedCryptoData(data);
    setIsCryptoScannerOpen(false);
    setIsCryptoSendOpen(true);
  };

  // Handler: Handle Crypto Transfer Completed (from Web3 / Base settlement)
  const handleCryptoPaymentComplete = (
    receipt: CryptoReceipt,
    selectedCategoryId?: string,
    customDescription?: string
  ): string => {
    const chosenCategory =
      (selectedCategoryId && categories.find(c => c.id === selectedCategoryId)) ||
      categories.find(c =>
        ['games', 'munchies', 'food', 'market', 'drip', 'subs'].some(k =>
          c.name.toLowerCase().includes(k) || c.id.toLowerCase().includes(k)
        )
      ) ||
      categories.find(c => c.type === 'expense') ||
      categories[0];

    const totalDebited = receipt.totalDebit || receipt.amount;
    const finalDescription =
      customDescription?.trim() ||
      receipt.label?.trim() ||
      (isEn
        ? `USDC Payment: ${Web3Service.truncateAddress(receipt.recipientAddress)}`
        : `Pagamento USDC: ${Web3Service.truncateAddress(receipt.recipientAddress)}`);

    const newTxId = `tx-base-${Date.now()}`;
    const isCustomized = Boolean(customDescription?.trim() || (receipt.label && receipt.label !== 'Transferência Base (USDC)' && receipt.label !== 'Pagamento Base (USDC)'));
    const newTx: Transaction = {
      id: newTxId,
      type: 'expense',
      amount: totalDebited,
      categoryId: chosenCategory.id,
      description: finalDescription,
      date: receipt.timestamp,
      paymentMethod: 'crypto',
      isOnChain: true,
      txHash: receipt.txHash,
      tokenSymbol: receipt.token,
      notes: isEn
        ? `Settled on Base L2 • Amount: $${receipt.amount.toFixed(2)} + Fee: $${(receipt.protocolFee || 0).toFixed(2)} • Block #${receipt.blockNumber}`
        : `Liquidado na Base L2 • Valor: $${receipt.amount.toFixed(2)} + Taxa APP: $${(receipt.protocolFee || 0).toFixed(2)} • Bloco #${receipt.blockNumber}`,
      isOrganized: isCustomized,
    };

    setTransactions(prev => [newTx, ...prev]);
    showToast(isEn ? `Payment of $${receipt.amount.toFixed(2)} ${receipt.token} completed!` : `Pagamento de $${receipt.amount.toFixed(2)} ${receipt.token} concluído!`, '💸');
    if (user.pushNotificationsEnabled && user.notifyOnReceivePayment !== false) {
      NotificationService.notifyPaymentSent({
        amount: receipt.amount,
        tokenSymbol: receipt.token,
        toAddress: receipt.recipientAddress,
        txHash: receipt.txHash,
      });
    }
    refreshOnChainBalance();
    return newTxId;
  };

  // Handler: Live update created crypto transaction (when user organizes expense in receipt screen)
  const handleUpdateCreatedCryptoTx = (
    txId: string,
    categoryId: string,
    customDescription: string
  ) => {
    setTransactions(prev =>
      prev.map(tx => {
        if (tx.id === txId) {
          const categoryObj = categories.find(c => c.id === categoryId);
          const finalDesc =
            customDescription.trim() ||
            categoryObj?.name ||
            tx.description;
          return {
            ...tx,
            categoryId,
            description: finalDesc,
            isOrganized: true,
          };
        }
        return tx;
      })
    );
  };

  // Handler: Update any existing transaction (from detail/edit modal in ledger)
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev =>
      prev.map(tx => (tx.id === updatedTx.id ? updatedTx : tx))
    );
    showToast(isEn ? 'Transaction updated in your Activity! ✨' : 'Lançamento atualizado no seu extrato! ✨', '📝');
  };

  // Handler: 1-Tap Quick Categorize for received transactions directly from notification
  const handleQuickCategorizeReceive = (txId: string, categoryId: string) => {
    const categoryObj = categories.find(c => c.id === categoryId);
    setTransactions(prev =>
      prev.map(tx => {
        if (tx.id === txId || (tx.txHash && txId.includes(tx.txHash))) {
          return {
            ...tx,
            categoryId,
            description: tx.description.includes(':')
              ? `Recebimento ${tx.tokenSymbol || 'USDC'}: ${tx.description.split(':')[1].trim()}`
              : (categoryObj ? `${categoryObj.name}` : tx.description),
            isOrganized: true,
          };
        }
        return tx;
      })
    );

    const currentProfileKey = getProfileStorageKey(user);
    setTimeout(() => {
      const updatedTxs = db.getTransactions(currentProfileKey);
      const modified = updatedTxs.map(tx => {
        if (tx.id === txId || (tx.txHash && txId.includes(tx.txHash))) {
          return { ...tx, categoryId, isOrganized: true };
        }
        return tx;
      });
      void db.saveTransactions(modified, currentProfileKey);
      if (user.isLoggedIn && user.email) {
        void db.saveToCloud(user, categories, vaults, modified);
      }
    }, 50);

    showToast(
      isEn
        ? `Categorized as ${categoryObj?.emoji || ''} ${categoryObj?.name || 'Category'}!`
        : `Categorizado como ${categoryObj?.emoji || ''} ${categoryObj?.name || 'Categoria'}!`,
      '🏷️'
    );
  };

  // Handler: Connect Google Account directly from profile/app settings
  const handleConnectGoogle = async () => {
    triggerHaptic('success');
    try {
      const fbUser = await authService.signInWithGoogle();
      const currentEmail = fbUser.email || user.email || 'usuario@gmail.com';
      const displayName = fbUser.displayName || user.name || currentEmail.split('@')[0];
      const photoURL = fbUser.photoURL || user.avatarUrl;

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });

      const googleProfileKey = `google_${currentEmail.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      db.setActiveProfileKey(googleProfileKey);

      let walletAddress = user.walletAddress;
      let walletPrivateKey = user.walletPrivateKey;
      let walletMnemonic = user.walletMnemonic;

      try {
        let existingPk: string | undefined = walletPrivateKey;
        try {
          const cloudData = await db.loadFromCloud(googleProfileKey, currentEmail);
          if (cloudData?.user?.walletPrivateKey) {
            existingPk = cloudData.user.walletPrivateKey;
          }
        } catch {}

        const walletRes = await Web3Service.connectGoogleWallet(
          currentEmail,
          'base',
          googleProfileKey,
          existingPk
        );
        if (walletRes.address) {
          walletAddress = walletRes.address;
        }
        if (walletRes.privateKey) {
          walletPrivateKey = walletRes.privateKey;
        }
        if (walletRes.mnemonic) {
          walletMnemonic = walletRes.mnemonic;
        }
        if (walletRes.isNewlyCreated && walletRes.privateKey) {
          setMandatoryBackupState({
            isOpen: true,
            publicAddress: walletRes.address,
            privateKey: walletRes.privateKey,
            mnemonic: walletRes.mnemonic,
          });
        }
      } catch (err) {
        console.warn('Erro ao conectar carteira Web3 no login Google:', err);
      }

      setUser(prev => {
        const localCustomAvatar = db.getCustomAvatar(googleProfileKey);
        const localBackupAvatar = db.getPersistedAvatar(googleProfileKey);
        let resolvedAvatar = photoURL;
        if (localCustomAvatar && isCustomUserAvatar(localCustomAvatar)) {
          resolvedAvatar = localCustomAvatar;
        } else if (prev.avatarUrl && isCustomUserAvatar(prev.avatarUrl) && prev.provider === 'google') {
          resolvedAvatar = prev.avatarUrl;
        } else if (localBackupAvatar && isCustomUserAvatar(localBackupAvatar)) {
          resolvedAvatar = localBackupAvatar;
        } else if (fbUser.photoURL) {
          resolvedAvatar = fbUser.photoURL;
        }

        if (isCustomUserAvatar(resolvedAvatar)) {
          void db.setCustomAvatar(resolvedAvatar, googleProfileKey);
        }

        const updated = {
          ...prev,
          isLoggedIn: true,
          isGoogleAuth: true,
          provider: 'google' as const,
          authId: googleProfileKey,
          email: currentEmail,
          name: displayName,
          username: currentEmail.split('@')[0],
          avatarUrl: resolvedAvatar,
          walletAddress: walletAddress || prev.walletAddress || '',
          walletPrivateKey: walletPrivateKey,
          walletMnemonic: walletMnemonic,
          web3Network: prev.web3Network || 'base',
          web3Enabled: true,
        };
        void db.saveUser(updated, googleProfileKey);
        void db.setPersistedAvatar(resolvedAvatar, googleProfileKey);
        void db.saveToCloud(updated, categories, vaults, transactions);
        return updated;
      });
      showToast(isEn ? 'Google account connected successfully! 🛡️' : 'Conta Google conectada com sucesso! 🛡️', '✅');
    } catch (err: any) {
      console.warn('Erro ao conectar Google:', err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        showToast(isEn ? 'Failed to connect Google account.' : 'Falha ao conectar com o Google.', '⚠️');
      }
    }
  };

  // While verifying if there is an existing persistent session on cold launch
  if (isAuthChecking && !user.isLoggedIn) {
    return (
      <div className="fixed inset-0 bg-[#F4F6FB] flex flex-col items-center justify-center p-6 select-none" id="auth-loading-splash">
        <div className="w-16 h-16 bg-white border-3 border-black rounded-2xl shadow-neo flex items-center justify-center mb-4 animate-bounce">
          <span className="text-2xl">🛡️</span>
        </div>
        <p className="font-['Outfit'] font-black text-sm text-black">
          {isEn ? 'Restoring Secure Session...' : 'Restaurando Sessão Segura...'}
        </p>
        <span className="text-[11px] text-neutral-500 font-medium mt-1">
          {isEn ? 'Verifying saved credentials' : 'Verificando credenciais salvas'}
        </span>
      </div>
    );
  }

  // If user is not logged in, render the Login Screen
  if (!user.isLoggedIn) {
    return (
      <LoginScreen
        onLoginSuccess={(updates, newCategories, newVaults, newTransactions) => {
          const isSecurityActive = WebAuthnService.isDeviceSecurityEnabled(
            updates.deviceSecurityEnabled ?? (updates.appLockEnabled ?? false)
          );

          const updated: UserProfile = {
            ...DEFAULT_USER,
            ...updates,
            deviceSecurityEnabled: isSecurityActive,
            appLockEnabled: isSecurityActive,
            requireAuthForPayments: isSecurityActive,
            passkeyEnabled: isSecurityActive,
            isLoggedIn: true,
          };

          const isGuestProfile = updated.isGuest || updated.provider === 'guest';
          const profileKey = updated.authId || (
            isGuestProfile
              ? 'guest_offline'
              : updated.provider === 'discord'
              ? `discord_${updated.discordId || (updated.id || '').replace(/^discord_/, '')}`
              : `google_${(updated.email || '').trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_')}`
          );

          if (isGuestProfile) {
            setSyncStatus('offline');
          } else {
            setSyncStatus('synced');
          }

          // Save clean isolated state for active profile
          db.setActiveProfileKey(profileKey);
          void db.saveUser(updated, profileKey);

          const resolvedCategories = newCategories && newCategories.length > 0 ? newCategories : DEFAULT_CATEGORIES;
          const resolvedVaults = newVaults || [];
          const resolvedTransactions = newTransactions || [];

          setCategories(resolvedCategories);
          void db.saveCategories(resolvedCategories, profileKey);

          setVaults(resolvedVaults);
          void db.saveVaults(resolvedVaults, profileKey);

          setTransactions(resolvedTransactions);
          void db.saveTransactions(resolvedTransactions, profileKey);

          // Reset memory balances and re-query Base blockchain for active wallet
          setOnChainBalances({
            usdc: 0,
            eth: 0,
            totalUsd: 0,
            formattedUsdc: '0.00',
            formattedEth: '0.0000',
          });

          if (updated.walletAddress) {
            refreshOnChainBalance(updated.walletAddress, updated.web3Network || 'base');
          }

          if (isSecurityActive) {
            WebAuthnService.setDeviceSecurityEnabled(true);
            WebAuthnService.setSessionUnlocked(false);
            setIsAppLocked(true);
          } else {
            WebAuthnService.setSessionUnlocked(true);
            setIsAppLocked(false);
          }

          setUser(updated);
        }}
      />
    );
  }

  // If app is locked by biometrics/PIN, render the App Lock Screen
  if (isAppLocked) {
    return (
      <AppLockScreen
        user={user}
        onUnlock={() => {
          setIsAppLocked(false);
          showToast(isEn ? 'Vault Unlocked Successfully! 🛡️' : 'Cofre Desbloqueado com Sucesso! 🛡️', '🔓');
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="w-full max-w-full min-h-screen bg-[#F4F6FB] app-theme-bg text-black flex justify-center font-sans overflow-x-hidden">
      {/* Mobile & Desktop responsive app shell */}
      <main className="w-full max-w-2xl md:max-w-3xl bg-white app-shell-card min-h-screen flex flex-col relative sm:border-x sm:border-black/10 sm:shadow-md overflow-x-hidden">
        {/* Sleek Floating Toast Notification aligned with Neo-Brutalist design system */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in slide-in-from-top-3 duration-200 pointer-events-auto">
            <div className="bg-[#DCFCE7] text-emerald-950 border-2 border-black rounded-2xl p-3 sm:p-3.5 shadow-neo flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-400 border-2 border-black flex items-center justify-center text-base flex-shrink-0 shadow-neo-xs">
                  {toastMessage.icon || '⚡'}
                </div>
                <p className="font-['Outfit'] font-black text-xs sm:text-sm text-emerald-950 leading-tight">
                  {toastMessage.text}
                </p>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="text-emerald-900/60 hover:text-emerald-950 text-xs font-black p-1 hover:bg-emerald-300/40 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Interactive 1-Tap Quick Categorize Toast for newly received transactions */}
        {pendingQuickCategorizeTx && (
          <QuickCategorizeReceiveToast
            transaction={pendingQuickCategorizeTx}
            categories={categories}
            onSelectCategory={handleQuickCategorizeReceive}
            onClose={() => setPendingQuickCategorizeTx(null)}
          />
        )}

        {/* Sticky Header */}
        <Header
          user={user}
          onOpenProfile={() => setActiveTab('profile')}
          onOpenVaults={() => setActiveTab('vaults')}
          onLogout={handleLogout}
          onShare={handleShareApp}
          syncStatus={syncStatus}
        />

        {/* Offline Mode / Guest Mode Notice Banner */}
        {user.isGuest && (
          <div className="w-full bg-[#FEF9C3] border-b-2 border-black p-2.5 sm:px-4 flex items-center justify-between gap-2 shadow-xs text-xs z-20" id="guest-offline-banner">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 bg-amber-400 text-black font-black text-[10px] rounded-md border border-black uppercase font-mono-code flex-shrink-0 shadow-neo-xs">
                {language === 'pt-BR' ? 'Modo Offline' : 'Guest Offline'}
              </span>
              <span className="font-semibold text-neutral-900 truncate text-[11px] sm:text-xs inline-flex items-center gap-1">
                <span>{language === 'pt-BR' ? 'Dados salvos apenas no' : 'Data stored on this'}</span>
                <Smartphone className="w-3.5 h-3.5 inline shrink-0" aria-label="device" />
                <span>{language === 'pt-BR' ? '' : 'device'}</span>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1 bg-[#B8F256] hover:bg-[#A3E635] text-black font-black text-[11px] rounded-lg border-2 border-black shadow-neo-xs btn-press flex-shrink-0 cursor-pointer whitespace-nowrap"
              id="btn-guest-connect-account"
              title={language === 'en-US' ? 'Login' : 'Entrar'}
            >
              {language === 'pt-BR' ? 'Fazer Login' : 'Log In'}
            </button>
          </div>
        )}

        {/* PWA Install Banner */}
        <PWAInstallBanner />

        {/* Dynamic Screen Content */}
        <div 
          ref={contentContainerRef}
          className="flex-1 px-3 sm:px-5 pt-3 pb-24 sm:pb-28 overflow-y-auto overflow-x-hidden w-full max-w-full relative"
        >
          {/* Pull-To-Refresh Visual Indicator */}
          {(pullDistance > 0 || isPullRefreshing) && (
            <div 
              className="w-full flex items-center justify-center pointer-events-none transition-all duration-150 overflow-hidden mb-2"
              style={{ height: `${Math.max(pullDistance, isPullRefreshing ? 44 : 0)}px` }}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black rounded-full shadow-neo-xs text-xs font-['Outfit'] font-black text-black">
                <RefreshCw 
                  className={`w-3.5 h-3.5 ${
                    isPullRefreshing ? 'animate-spin text-[#0052FF]' : ''
                  }`}
                  style={{
                    transform: isPullRefreshing ? undefined : `rotate(${pullDistance * 4}deg)`,
                  }}
                />
                <span className="text-[11px]">
                  {isPullRefreshing
                    ? 'Atualizando carteira...'
                    : isPullTriggered
                    ? 'Solte para atualizar'
                    : 'Puxe para atualizar'}
                </span>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={activeTab}
              custom={direction}
              variants={tabVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
            >
              {activeTab === 'home' && (
                <div>
                  {/* Hero Balance Card */}
                  <HeroBalanceCard
                    totalBalance={calculations.totalBalance}
                    availableBalance={calculations.availableBalance}
                    lockedInVaults={calculations.lockedInVaults}
                    weeklyDelta={calculations.weeklyDelta}
                    hideBalance={user.hideBalance}
                    onToggleHideBalance={() => setUser(prev => ({ ...prev, hideBalance: !prev.hideBalance }))}
                    currency={user.currency}
                    onChangeCurrency={handleChangeCurrency}
                    walletAddress={user.isGuest ? undefined : user.walletAddress}
                    web3Network={user.web3Network || 'base'}
                    onRefreshOnChain={() => refreshOnChainBalance(user.walletAddress, user.web3Network, { showToastOnSync: true })}
                    isRefreshingOnChain={isRefreshingOnChain}
                    showInUsdc={showInUsdc}
                    onToggleCurrencyMode={handleToggleShowInUsdc}
                  />

                  {/* Quick Actions (Crypto Pagar, Crypto Receber, Cofres & Metas) */}
                  <QuickActions
                    onOpenVaults={() => setActiveTab('vaults')}
                    onOpenCryptoScanner={() => {
                      if (user.isGuest) {
                        showToast(isEn ? 'Web3 wallet is disabled in Offline Mode. Sign in to use!' : 'A carteira Web3 está desativada no Modo Offline. Faça login para usar!', '🔒');
                        triggerHaptic('warning');
                      } else {
                        setIsCryptoScannerOpen(true);
                      }
                    }}
                    onOpenCryptoReceive={() => {
                      if (user.isGuest) {
                        showToast(isEn ? 'Web3 wallet is disabled in Offline Mode. Sign in to use!' : 'A carteira Web3 está desativada no Modo Offline. Faça login para usar!', '🔒');
                        triggerHaptic('warning');
                      } else {
                        setIsCryptoReceiveOpen(true);
                      }
                    }}
                  />

                  {/* Daily Budget Tracker Card */}
                  <DailyBudgetCard
                    spentToday={calculations.spentToday}
                    dailyLimit={user.dailySpendLimit}
                    currency={activeDisplayCurrency}
                    onEditLimit={() => {
                      const limitInActive = (activeDisplayCurrency === 'USDC' || activeDisplayCurrency === 'USD')
                        ? user.dailySpendLimit
                        : ExchangeRateService.convertFromUsdc(user.dailySpendLimit, activeDisplayCurrency);
                      setNewDailyLimitInput(limitInActive.toString());
                      setIsDailyBudgetModalOpen(true);
                    }}
                  />

                  {/* Active Vaults Preview (Carousel) */}
                  <ActiveVaultsPreview
                    vaults={vaults}
                    availableBalance={calculations.availableBalance}
                    onOpenVaults={() => setActiveTab('vaults')}
                    onQuickDeposit={(vault) => {
                      if (calculations.availableBalance <= 0) {
                        showToast(isEn ? 'Insufficient balance to save in this vault!' : 'Saldo insuficiente para guardar neste cofre!', '⚠️');
                        triggerHaptic('warning');
                      } else {
                        triggerHaptic('medium');
                      }
                      setOpenDepositVaultIdDirectly(vault.id);
                      setActiveTab('vaults');
                    }}
                    onCreateVault={() => {
                      setOpenCreateVaultDirectly(true);
                      setActiveTab('vaults');
                    }}
                    currency={activeDisplayCurrency}
                  />

                  {/* Recent Activity Card */}
                  <RecentActivityCard
                    transactions={transactions}
                    categories={categories}
                    onViewAll={() => setActiveTab('transactions')}
                    onSelectTransaction={(tx) => {
                      triggerHaptic('light');
                      setSelectedDetailTx(tx);
                    }}
                    currency={activeDisplayCurrency}
                  />
                </div>
              )}

              {activeTab === 'vaults' && (
                <React.Suspense fallback={
                  <div className="flex flex-col items-center justify-center p-12 space-y-3">
                    <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-neutral-500 font-['Outfit']">Carregando Cofres...</span>
                  </div>
                }>
                  <VaultsScreen
                    vaults={vaults}
                    availableBalance={calculations.availableBalance}
                    currency={activeDisplayCurrency}
                    user={user}
                    autoOpenCreate={openCreateVaultDirectly}
                    onAutoOpenHandled={() => setOpenCreateVaultDirectly(false)}
                    autoOpenDepositVaultId={openDepositVaultIdDirectly}
                    onAutoOpenDepositHandled={() => setOpenDepositVaultIdDirectly(null)}
                    onCreateVault={handleCreateVault}
                    onDepositVault={handleDepositVault}
                    onWithdrawVault={handleWithdrawVault}
                    onDeleteVault={handleDeleteVault}
                  />
                </React.Suspense>
              )}

              {activeTab === 'analytics' && (
                <React.Suspense fallback={
                  <div className="flex flex-col items-center justify-center p-12 space-y-3">
                    <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-neutral-500 font-['Outfit']">Carregando Análises...</span>
                  </div>
                }>
                  <AnalyticsScreen
                    transactions={transactions}
                    categories={categories}
                    currency={activeDisplayCurrency}
                  />
                </React.Suspense>
              )}

              {activeTab === 'transactions' && (
                <React.Suspense fallback={
                  <div className="flex flex-col items-center justify-center p-12 space-y-3">
                    <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-neutral-500 font-['Outfit']">Carregando Extrato...</span>
                  </div>
                }>
                  <TransactionsScreen
                    transactions={transactions}
                    categories={categories}
                    vaults={vaults}
                    currency={activeDisplayCurrency}
                    user={user}
                    onShowToast={showToast}
                    onDeleteTransaction={handleDeleteTransaction}
                    onUpdateTransaction={handleUpdateTransaction}
                    onAddTransaction={(newTx) => {
                      setTransactions(prev => [newTx, ...prev]);
                      showToast(isEn ? 'Transaction restored to Activity! ✨' : 'Transação restaurada e adicionada ao Extrato! ✨', '📝');
                    }}
                    onOpenSend={() => setIsCryptoScannerOpen(true)}
                    onRefreshOnChain={() => refreshOnChainBalance(user.walletAddress, user.web3Network, { showToastOnSync: true })}
                    isRefreshingOnChain={isRefreshingOnChain}
                  />
                </React.Suspense>
              )}

              {activeTab === 'profile' && (
                <React.Suspense fallback={
                  <div className="flex flex-col items-center justify-center p-12 space-y-3">
                    <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-neutral-500 font-['Outfit']">{isEn ? 'Loading Settings...' : 'Carregando Ajustes...'}</span>
                  </div>
                }>
                  <ProfileSettingsScreen
                    user={user}
                    categories={categories}
                    vaults={vaults}
                    transactions={transactions}
                    totalBalance={calculations.totalBalance}
                    spentToday={calculations.spentToday}
                    onUpdateUser={handleUpdateUser}
                    onUpdateCategories={handleUpdateCategories}
                    onReloadAllData={handleReloadAllData}
                    onConnectGoogle={handleConnectGoogle}
                    onResetToFactory={handleResetToFactory}
                    onDeleteAccountAndCloudData={handleDeleteAccountAndCloudData}
                    onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
                    onLogout={handleLogout}
                    currency={user.currency}
                    onChangeCurrency={handleChangeCurrency}
                    syncStatus={syncStatus}
                    onShare={handleShareApp}
                    onNavigateToTab={(tab) => setActiveTab(tab as TabType)}
                    onLockApp={() => {
                      WebAuthnService.setSessionUnlocked(false);
                      setIsAppLocked(true);
                      showToast(isEn ? 'Vault Locked. Authentication required.' : 'Cofre Bloqueado. Autenticação necessária.', '🔒');
                    }}
                  />
                </React.Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation with elevated action button */}
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenPay={() => setIsCryptoScannerOpen(true)}
        />

        {/* Onboarding Welcome Flow Modal */}
        <React.Suspense fallback={null}>
          <OnboardingModal
            isOpen={isOnboardingModalOpen}
            userName={user.name || 'Jovem'}
            currency={user.currency}
            onComplete={handleCompleteOnboarding}
          />
        </React.Suspense>

        {/* Crypto QR Scanner Modal (Camera & 0x Address Pasting) */}
        <React.Suspense fallback={null}>
          <CryptoQrScannerModal
            isOpen={isCryptoScannerOpen}
            onClose={() => setIsCryptoScannerOpen(false)}
            onScanSuccess={handleCryptoScanSuccess}
          />
        </React.Suspense>

        {/* Crypto Send Confirmation & Receipt Modal (Web3 Base Settlement) */}
        <React.Suspense fallback={null}>
          <CryptoSendModal
            isOpen={isCryptoSendOpen}
            cryptoData={scannedCryptoData}
            userBalanceUSDC={calculations.availableBalance}
            totalBalanceUSDC={calculations.totalBalance}
            lockedInVaultsUSDC={calculations.lockedInVaults}
            walletAddress={user.isGuest ? undefined : user.walletAddress}
            walletPrivateKey={user.isGuest ? undefined : user.walletPrivateKey}
            network={user.web3Network || 'base'}
            userEmail={user.email || user.username}
            categories={categories}
            onClose={() => setIsCryptoSendOpen(false)}
            onPaymentComplete={handleCryptoPaymentComplete}
            onUpdateCreatedTransaction={handleUpdateCreatedCryptoTx}
          />
        </React.Suspense>

        {/* Crypto Receive Modal (Receive USDC/ETH directly to Coinbase Smart Wallet on Base) */}
        <React.Suspense fallback={null}>
          <CryptoReceiveModal
            isOpen={isCryptoReceiveOpen}
            onClose={() => setIsCryptoReceiveOpen(false)}
            userName={user.name || 'Cofre Base User'}
            userEmail={user.email || user.username}
            walletAddress={user.isGuest ? undefined : user.walletAddress}
            network={user.web3Network || 'base'}
          />
        </React.Suspense>

        {/* Transaction Detail & Edit Modal (from Home / Recent activity) */}
        {selectedDetailTx && (
          <React.Suspense fallback={null}>
            <TransactionDetailModal
              isOpen={Boolean(selectedDetailTx)}
              transaction={selectedDetailTx}
              categories={categories}
              vaults={vaults}
              currency={activeDisplayCurrency}
              userEmail={user.email}
              onClose={() => setSelectedDetailTx(null)}
              onUpdate={(updatedTx) => {
                handleUpdateTransaction(updatedTx);
                setSelectedDetailTx(null);
              }}
              onDelete={(id) => {
                handleDeleteTransaction(id);
                setSelectedDetailTx(null);
              }}
            />
          </React.Suspense>
        )}

        {/* Wallet Migration Modal (Auto-pops if balance found on legacy deterministic wallet) */}
        {migrationState && (
          <React.Suspense fallback={null}>
            <WalletMigrationModal
              isOpen={migrationState.isOpen}
              legacyAddress={migrationState.legacyAddress}
              legacyPrivateKey={migrationState.legacyPrivateKey}
              newAddress={migrationState.newAddress}
              newPrivateKey={migrationState.newPrivateKey}
              newMnemonic={migrationState.newMnemonic}
              legacyUsdcBalance={migrationState.legacyUsdcBalance}
              legacyEthBalance={migrationState.legacyEthBalance}
              onCompleteMigration={handleCompleteMigration}
            />
          </React.Suspense>
        )}

        {/* Mandatory Wallet Backup Modal (Shown once after wallet creation or migration) */}
        {mandatoryBackupState && (
          <React.Suspense fallback={null}>
            <WalletBackupModal
              isOpen={mandatoryBackupState.isOpen}
              publicAddress={mandatoryBackupState.publicAddress}
              privateKey={mandatoryBackupState.privateKey}
              mnemonic={mandatoryBackupState.mnemonic}
              userEmail={user.email}
              userUid={user.authId || user.id}
              isMandatory={true}
              onClose={() => setMandatoryBackupState(null)}
              onAcknowledgeBackup={(fingerprint) => {
                setMandatoryBackupState(null);
                setUser(prev => {
                  const updated = {
                    ...prev,
                    lastBackupAcknowledgedAt: new Date().toISOString(),
                    backupAuditFingerprint: fingerprint,
                  };
                  void db.saveUser(updated);
                  if (updated.isLoggedIn && !updated.isGuest) {
                    db.saveToCloud(updated, categories, vaults, transactions).catch(() => {});
                  }
                  return updated;
                });
                showToast(isEn ? 'Backup saved securely!' : 'Backup confirmado com sucesso!', '🔐');
              }}
            />
          </React.Suspense>
        )}

        {/* Daily Budget Quick Edit Modal */}
        {isDailyBudgetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="relative w-full max-w-xs bg-[#FEF3C7] border-2 border-black rounded-[24px] shadow-neo-xl p-5 z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-900" />
                  <h4 className="font-['Outfit'] font-black text-base text-black">
                    Ajustar Meta Diária
                  </h4>
                </div>
                <button
                  onClick={() => setIsDailyBudgetModalOpen(false)}
                  className="w-7 h-7 rounded-full border-2 border-black bg-white flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveDailyLimit} className="space-y-3">
                <div className="bg-white border-2 border-black rounded-xl p-3 text-center">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Limite diário</span>
                    <span className="text-[10px] font-bold bg-[#EDE9FE] text-purple-900 border border-purple-300 px-2 py-0.2 rounded-full">
                      Opcional
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="font-['Outfit'] font-black text-xl text-neutral-400">{user.currency === 'BRL' ? 'R$' : '$'}</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={newDailyLimitInput}
                      onChange={(e) => setNewDailyLimitInput(e.target.value)}
                      placeholder="0 (sem meta)"
                      className="font-['Outfit'] font-black text-3xl text-black text-center w-full focus:outline-hidden"
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    {parseFloat(newDailyLimitInput) > 0
                      ? `${getCurrencyConfig(activeDisplayCurrency, language).symbol} ${parseFloat(newDailyLimitInput).toFixed(2)} por dia`
                      : 'Meta opcional • Deixe 0 para desativar'}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-1.5">
                  {(() => {
                    const activeRate = ExchangeRateService.getRate(activeDisplayCurrency);
                    const baseVals = (activeDisplayCurrency === 'USDC' || activeDisplayCurrency === 'USD')
                      ? [15, 25, 50, 80]
                      : [10, 25, 50, 80].map(v => Math.round(v * (activeRate || 1)));
                    const sym = getCurrencyConfig(activeDisplayCurrency, language).symbol;
                    return baseVals.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setNewDailyLimitInput(amt.toString());
                        }}
                        className="bg-white hover:bg-amber-100 border border-black rounded-lg px-2 py-1 text-xs font-bold"
                      >
                        {sym}{amt}
                      </button>
                    ));
                  })()}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setNewDailyLimitInput('0');
                    }}
                    className="bg-white hover:bg-rose-50 border border-black rounded-lg px-2 py-1 text-xs font-bold text-rose-700"
                  >
                    Sem meta
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {user.dailySpendLimit > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setUser(prev => {
                          const updated = { ...prev, dailySpendLimit: 0 };
                          void db.saveUser(updated);
                          if (updated.email) {
                            void db.saveToCloud(updated, categories, vaults, transactions);
                          }
                          return updated;
                        });
                        setIsDailyBudgetModalOpen(false);
                        showToast(isEn ? 'Daily budget disabled (optional).' : 'Meta diária desativada (opcional).', '🎯');
                      }}
                      className="flex-1 py-2.5 bg-white hover:bg-neutral-100 text-neutral-700 border-2 border-black rounded-xl font-['Outfit'] font-bold text-xs shadow-neo-xs btn-press"
                    >
                      {isEn ? 'Disable' : 'Desativar'}
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#B8F256] text-black hover:bg-[#A3E635] border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-sm btn-press cursor-pointer"
                  >
                    {isEn ? 'Save' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
