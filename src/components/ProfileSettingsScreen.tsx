import React, { useState } from 'react';
import { UserProfile, Category, Vault, Transaction } from '../types';
import { 
  User, 
  Settings, 
  Plus, 
  Trash2, 
  Smartphone, 
  Check, 
  Edit3,
  ArrowUp,
  ArrowDown,
  Star,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  X,
  Share2,
  LogOut,
  Key,
  RefreshCw,
  Copy,
  Fingerprint,
  Lock,
  CheckCircle2,
  Camera,
  Upload,
  MessageSquare,
  Bell,
  BellRing,
  BellOff,
  ShieldCheck,
  Loader2,
  Info,
} from 'lucide-react';
import { NotificationService } from '../services/notificationService';
import { APP_VERSION, APP_VERSION_LABEL } from '../config/version';
import { compressAndCropAvatar } from '../utils/imageUtils';
import { WebAuthnService } from '../services/webAuthnService';
import { triggerHaptic } from '../utils/haptics';
import { formatCurrency, isCustomUserAvatar } from '../utils/storage';
import { db } from '../services';
import { EmojiPicker } from './EmojiPicker';
import { COLOR_PRESETS, ColorPreset } from '../utils/emojiCatalog';
import { WalletBackupModal } from './WalletBackupModal';
import { LegalTermsModal } from './LegalTermsModal';
import { Web3Service } from '../services/web3Service';
import { openSupportEmail } from '../utils/supportEmail';
import { useI18n } from '../hooks/useI18n';
import { TOP_CURRENCIES, getTopCurrencies } from '../utils/currencies';
import {
  getOrCreatePrivateKey,
  getDecryptedPrivateKey,
  getAddressFromPrivateKey
} from '../utils/wallet';

interface ProfileSettingsScreenProps {
  user: UserProfile;
  categories: Category[];
  vaults?: Vault[];
  transactions?: Transaction[];
  totalBalance?: number;
  spentToday?: number;
  onUpdateUser: (updated: UserProfile) => void;
  onUpdateCategories: (cats: Category[]) => void;
  onReloadAllData: () => void;
  onConnectGoogle?: () => void;
  onResetToFactory?: () => void;
  onDeleteAccountAndCloudData?: (deletionConsent?: {
    confirmed: boolean;
    confirmedAt: string;
    statement?: string;
  }) => Promise<void> | void;
  onOpenOnboarding?: () => void;
  onLogout?: () => void;
  currency: string;
  syncStatus?: 'syncing' | 'synced' | 'offline' | 'error';
  onNavigateToTab?: (tab: string) => void;
  onLockApp?: () => void;
  onChangeCurrency?: (newMode: 'BRL' | 'USDC') => void;
  onShare?: () => void;
}

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=CofreMaster&backgroundColor=b6e3f4,c0aede,ffd5dc',
  'https://api.dicebear.com/7.x/bottts/svg?seed=AlexVault&backgroundColor=b6e3f4,c0aede,ffd5dc',
  'https://api.dicebear.com/7.x/bottts/svg?seed=NeonGamer&backgroundColor=c0aede,ffd5dc',
  'https://api.dicebear.com/7.x/bottts/svg?seed=FintechAdmin&backgroundColor=b6e3f4,d1d4f9',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberSaver&backgroundColor=ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/bottts/svg?seed=RichieRich&backgroundColor=b8f256,e4f97e',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4,c0aede',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=SigmaPro&backgroundColor=b8f256,b6e3f4',
];

export const ProfileSettingsScreen: React.FC<ProfileSettingsScreenProps> = React.memo(({
  user,
  categories,
  vaults = [],
  transactions = [],
  totalBalance = 0,
  spentToday = 0,
  onUpdateUser,
  onUpdateCategories,
  onReloadAllData,
  onConnectGoogle,
  onResetToFactory,
  onDeleteAccountAndCloudData,
  onOpenOnboarding,
  onLogout,
  currency,
  syncStatus = 'synced',
  onNavigateToTab,
  onLockApp,
  onChangeCurrency,
  onShare,
}) => {
  const { t, language, changeLanguage } = useI18n();
  const isEn = language === 'en-US';
  const [activeSection, setActiveSection] = useState<'profile' | 'categories' | 'security' | 'backup'>('profile');
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  
  // Unified Device Security (Biometrics / 4-digit PIN / Phone Screen Lock)
  const [isPlatformBiometricsAvailable, setIsPlatformBiometricsAvailable] = useState(true);
  const [hasStoredPin, setHasStoredPin] = useState<boolean>(() => WebAuthnService.hasStoredPin());
  const [deviceSecurityActive, setDeviceSecurityActive] = useState<boolean>(() =>
    WebAuthnService.isDeviceSecurityEnabled(user.deviceSecurityEnabled ?? user.appLockEnabled)
  );
  const [isTestingBio, setIsTestingBio] = useState(false);
  const [bioFeedback, setBioFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 4-Digit Security PIN Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalStep, setPinModalStep] = useState<'enter' | 'confirm'>('enter');
  const [pinModalCandidate, setPinModalCandidate] = useState('');
  const [pinModalInput, setPinModalInput] = useState('');
  const [pinModalError, setPinModalError] = useState<string | null>(null);

  React.useEffect(() => {
    WebAuthnService.isPlatformAuthenticatorAvailable().then((avail) => {
      setIsPlatformBiometricsAvailable(avail);
    });
    setDeviceSecurityActive(WebAuthnService.isDeviceSecurityEnabled(user.deviceSecurityEnabled ?? user.appLockEnabled));
    setHasStoredPin(WebAuthnService.hasStoredPin());
  }, [user.deviceSecurityEnabled, user.appLockEnabled]);

  // User edit state
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [avatarUrl, setAvatarUrl] = useState(() => user.avatarUrl || db.getCustomAvatar(user.authId) || 'https://api.dicebear.com/7.x/bottts/svg?seed=BaseCofre');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<string | null>(null);
  const [dailyLimit, setDailyLimit] = useState(user.dailySpendLimit.toString());
  const [initialBalance, setInitialBalance] = useState((user.initialBalance ?? 0).toString());
  const [haptics, setHaptics] = useState(user.hapticsEnabled);
  const [savedUserFeedback, setSavedUserFeedback] = useState(false);

  // Push Notifications state
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() =>
    NotificationService.getPermission()
  );
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() =>
    Boolean(user.pushNotificationsEnabled && NotificationService.getPermission() === 'granted')
  );
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);

  const handleTogglePush = async () => {
    triggerHaptic('medium');
    if (!NotificationService.isSupported()) {
      setPushFeedback('Notificações push não suportadas neste navegador.');
      setTimeout(() => setPushFeedback(null), 3000);
      return;
    }

    if (isPushEnabled) {
      setIsPushEnabled(false);
      onUpdateUser({
        ...user,
        pushNotificationsEnabled: false,
      });
      setPushFeedback('Notificações push desativadas.');
      setTimeout(() => setPushFeedback(null), 2500);
      return;
    }

    setIsRequestingPush(true);
    try {
      const perm = await NotificationService.requestPermission();
      setPushPermission(perm);
      if (perm === 'granted') {
        setIsPushEnabled(true);
        onUpdateUser({
          ...user,
          pushNotificationsEnabled: true,
          notifyOnReceivePayment: true,
          notifyOnVaultMilestone: true,
        });
        setPushFeedback(isEn ? 'Notifications enabled successfully! 🔔' : 'Notificações ativadas com sucesso! 🔔');
        NotificationService.notifyTest();
      } else if (perm === 'denied') {
        setPushFeedback(isEn ? 'Permission denied in browser settings.' : 'Permissão negada nas configurações do navegador.');
      }
    } catch {
      setPushFeedback(isEn ? 'Error requesting notification permission.' : 'Erro ao solicitar permissão de notificações.');
    } finally {
      setIsRequestingPush(false);
      setTimeout(() => setPushFeedback(null), 3500);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingPush(true);
    triggerHaptic('success');
    try {
      await NotificationService.notifyTest();
      setPushFeedback(isEn ? 'Notification sent successfully to your device! ✨' : 'Notificação enviada com sucesso para o seu aparelho! ✨');
    } catch {
      setPushFeedback(isEn ? 'Failed to send test notification.' : 'Falha ao enviar notificação de teste.');
    } finally {
      setIsTestingPush(false);
      setTimeout(() => setPushFeedback(null), 3500);
    }
  };

  // Sync avatarUrl when user state updates from parent or cloud
  React.useEffect(() => {
    if (user.avatarUrl) {
      setAvatarUrl(user.avatarUrl);
    }
  }, [user.avatarUrl]);

  // Handle personal photo upload with automatic compression to 160x160 JPEG
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('medium');
    setIsUploadingPhoto(true);
    setAvatarFeedback(null);

    try {
      const compressedDataUrl = await compressAndCropAvatar(file, 160, 0.85);
      setAvatarUrl(compressedDataUrl);
      void db.setCustomAvatar(compressedDataUrl, user.authId);
      onUpdateUser({
        ...user,
        avatarUrl: compressedDataUrl,
      });
      triggerHaptic('success');
      setAvatarFeedback(isEn ? 'Profile photo saved and synced! ✨' : 'Foto do perfil salva e sincronizada! ✨');
      setTimeout(() => setAvatarFeedback(null), 3000);
    } catch (err: any) {
      console.error('Error processing avatar image:', err);
      triggerHaptic('warning');
      setAvatarFeedback(isEn ? 'Error processing image. Try another photo.' : 'Erro ao processar imagem. Tente outra foto.');
      setTimeout(() => setAvatarFeedback(null), 4000);
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // Web3 Wallet Backup & Re-generation state (in Backup tab)
  const [isWalletBackupOpen, setIsWalletBackupOpen] = useState(false);
  const [userPrivateKey, setUserPrivateKey] = useState<string>(user.walletPrivateKey || '');
  const [userMnemonic, setUserMnemonic] = useState<string>(user.walletMnemonic || '');
  const [walletFeedback, setWalletFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    if (user.isGuest) {
      setUserPrivateKey('');
      setUserMnemonic('');
      return;
    }
    const uid = user.authId || user.id;
    if (!user.email && !uid) return;

    Web3Service.getStoredMnemonic(user.email, uid)
      .then((mnem) => {
        if (mnem) setUserMnemonic(mnem);
      })
      .catch(() => {});

    if (user.walletPrivateKey && user.walletPrivateKey.startsWith('0x')) {
      setUserPrivateKey(user.walletPrivateKey);
      Web3Service.saveWalletCredentials({
        userEmail: user.email,
        userUid: uid,
        privateKey: user.walletPrivateKey,
        mnemonic: user.walletMnemonic,
      }).catch(() => {});
      return;
    }

    Web3Service.getStoredDecryptedPrivateKey(user.email, uid)
      .then((decrypted) => {
        if (decrypted && decrypted.startsWith('0x')) {
          setUserPrivateKey(decrypted);
          const realAddr = getAddressFromPrivateKey(decrypted);
          if (realAddr && !user.walletAddress) {
            onUpdateUser({
              ...user,
              walletAddress: realAddr,
              walletPrivateKey: decrypted,
            });
          }
        }
      })
      .catch(() => {});
  }, [user.email, user.authId, user.id, user.username, user.walletPrivateKey, user.walletMnemonic]);

  // Category Manager State
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'expense' | 'income' | 'favorites'>('all');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('🍕');
  const [catType, setCatType] = useState<'expense' | 'income' | 'both'>('expense');
  const [catColor, setCatColor] = useState<ColorPreset>(COLOR_PRESETS[0]);
  const [catIsFavorite, setCatIsFavorite] = useState(false);
  // Emoji picker & delete confirmation states
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCloudDeleteConfirm, setShowCloudDeleteConfirm] = useState(false);
  const [isDeletingCloud, setIsDeletingCloud] = useState(false);
  const [isDeleteConsentChecked, setIsDeleteConsentChecked] = useState(false);
  const [deleteConsentError, setDeleteConsentError] = useState(false);

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    triggerHaptic('success');
    const parsedDaily = parseFloat(dailyLimit);
    const updatedDailyLimit = !isNaN(parsedDaily) && parsedDaily >= 0 ? parsedDaily : 0;
    const updated: UserProfile = {
      ...user,
      name: name.trim() || user.name,
      username: username.trim() || user.username,
      avatarUrl,
      dailySpendLimit: updatedDailyLimit,
      initialBalance: parseFloat(initialBalance) >= 0 ? parseFloat(initialBalance) : (user.initialBalance ?? 0),
      hapticsEnabled: haptics,
    };
    onUpdateUser(updated);
    setSavedUserFeedback(true);
    setTimeout(() => setSavedUserFeedback(false), 2500);
  };

  const handleStartCreateCat = (suggestedType: 'expense' | 'income' = 'expense') => {
    triggerHaptic('light');
    setEditingCatId(null);
    setCatName('');
    setCatType(suggestedType);
    setCatEmoji(suggestedType === 'income' ? '💰' : '🍕');
    setCatColor(suggestedType === 'income' ? COLOR_PRESETS[4] : COLOR_PRESETS[1]);
    setCatIsFavorite(false);
    setIsCreatingCat(true);
  };

  const handleStartEditCat = (cat: Category) => {
    triggerHaptic('light');
    setIsCreatingCat(false);
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatEmoji(cat.emoji);
    setCatType(cat.type);
    const matched = COLOR_PRESETS.find(p => p.name === cat.color) || COLOR_PRESETS[0];
    setCatColor(matched);
    setCatIsFavorite(!!cat.isFavorite);
  };

  const handleSaveCategoryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    triggerHaptic('success');

    if (isCreatingCat) {
      const newCat: Category = {
        id: `cat_${Date.now()}`,
        name: catName.trim(),
        emoji: catEmoji || (catType === 'income' ? '💰' : '🍕'),
        color: catColor.name,
        bgColor: catColor.bg,
        textColor: catColor.text,
        type: catType,
        isFavorite: catIsFavorite,
        order: categories.length + 1,
      };
      onUpdateCategories([...categories, newCat]);
      setIsCreatingCat(false);
      // If filtering by opposite type, adjust filter to show newly created category
      if (categoryFilter !== 'all' && categoryFilter !== 'favorites' && categoryFilter !== catType) {
        setCategoryFilter(catType === 'income' || catType === 'expense' ? catType : 'all');
      }
    } else if (editingCatId) {
      const updated = categories.map(c => {
        if (c.id === editingCatId) {
          return {
            ...c,
            name: catName.trim(),
            emoji: catEmoji || (catType === 'income' ? '💰' : '🍕'),
            color: catColor.name,
            bgColor: catColor.bg,
            textColor: catColor.text,
            type: catType,
            isFavorite: catIsFavorite,
          };
        }
        return c;
      });
      onUpdateCategories(updated);
      setEditingCatId(null);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    triggerHaptic('light');
    setCatToDelete(cat);
  };

  const handleConfirmDeleteCategory = () => {
    if (!catToDelete) return;
    triggerHaptic('warning');
    onUpdateCategories(categories.filter(c => c.id !== catToDelete.id));
    if (editingCatId === catToDelete.id) {
      setEditingCatId(null);
    }
    setCatToDelete(null);
  };

  const handleToggleFavoriteCat = (catId: string) => {
    triggerHaptic('medium');
    const updated = categories.map(c => {
      if (c.id === catId) {
        return { ...c, isFavorite: !c.isFavorite };
      }
      return c;
    });
    onUpdateCategories(updated);
  };

  const handleMoveUpCat = (catId: string) => {
    triggerHaptic('light');
    const idx = categories.findIndex(c => c.id === catId);
    if (idx <= 0) return;
    const newArr = [...categories];
    const temp = newArr[idx];
    newArr[idx] = newArr[idx - 1];
    newArr[idx - 1] = temp;
    onUpdateCategories(newArr);
  };

  const handleMoveDownCat = (catId: string) => {
    triggerHaptic('light');
    const idx = categories.findIndex(c => c.id === catId);
    if (idx === -1 || idx >= categories.length - 1) return;
    const newArr = [...categories];
    const temp = newArr[idx];
    newArr[idx] = newArr[idx + 1];
    newArr[idx + 1] = temp;
    onUpdateCategories(newArr);
  };

  const displayedCategories = categories.filter(c => {
    if (categoryFilter === 'favorites') return c.isFavorite;
    if (categoryFilter === 'expense') return c.type === 'expense' || c.type === 'both';
    if (categoryFilter === 'income') return c.type === 'income' || c.type === 'both';
    return true;
  });

  const handleResetData = () => {
    triggerHaptic('warning');
    setShowResetConfirm(true);
  };

  const handleConfirmFactoryReset = () => {
    triggerHaptic('heavy');
    setShowResetConfirm(false);
    if (onResetToFactory) {
      onResetToFactory();
    } else {
      db.resetToDefaults();
      onReloadAllData();
    }
  };

  const handleConfirmCloudDelete = async () => {
    if (isDeletingCloud) return;
    if (!isDeleteConsentChecked) {
      triggerHaptic('warning');
      setDeleteConsentError(true);
      return;
    }
    setIsDeletingCloud(true);
    triggerHaptic('heavy');
    try {
      if (onDeleteAccountAndCloudData) {
        await onDeleteAccountAndCloudData({
          confirmed: true,
          confirmedAt: new Date().toISOString(),
          statement: isEn
            ? 'I declare that I have read and agree with the Privacy Policy, confirm the voluntary, permanent, and irreversible deletion of all my data in the cloud and app, and acknowledge that custody and backup of my private key is my sole and exclusive responsibility.'
            : 'Declaro que li e concordo com a Política de Privacidade, confirmo a exclusão voluntária, definitiva e irreversível de todos os meus dados na nuvem e no app, e reconheço que a guarda e backup da chave privada da minha carteira é de minha exclusiva e total responsabilidade.',
        });
      }
    } finally {
      setIsDeletingCloud(false);
      setShowCloudDeleteConfirm(false);
      setIsDeleteConsentChecked(false);
      setDeleteConsentError(false);
    }
  };

  // Unified Device Security Handlers
  const handleToggleDeviceSecurity = async () => {
    if (!deviceSecurityActive) {
      triggerHaptic('light');

      // If user has not yet set a 4-digit PIN, prompt them to set one first
      if (!WebAuthnService.hasStoredPin()) {
        handleOpenPinModal();
        return;
      }

      setDeviceSecurityActive(true);
      WebAuthnService.setDeviceSecurityEnabled(true);

      onUpdateUser({
        ...user,
        deviceSecurityEnabled: true,
        appLockEnabled: true,
        requireAuthForPayments: true,
      });

      triggerHaptic('success');
      setBioFeedback({
        type: 'success',
        text: isEn
          ? 'App lock enabled with PIN & Biometrics!'
          : 'Bloqueio ativado com PIN e Biometria!',
      });
      setTimeout(() => setBioFeedback(null), 3000);
    } else {
      // Disable
      triggerHaptic('medium');
      setDeviceSecurityActive(false);
      WebAuthnService.setDeviceSecurityEnabled(false);

      onUpdateUser({
        ...user,
        deviceSecurityEnabled: false,
        appLockEnabled: false,
        requireAuthForPayments: false,
      });

      setBioFeedback({
        type: 'success',
        text: isEn ? 'App lock disabled.' : 'Bloqueio do aplicativo desativado.',
      });
      setTimeout(() => setBioFeedback(null), 3000);
    }
  };

  const handleOpenPinModal = () => {
    triggerHaptic('medium');
    setPinModalStep('enter');
    setPinModalCandidate('');
    setPinModalInput('');
    setPinModalError(null);
    setIsPinModalOpen(true);
  };

  const handlePinModalDigit = (digit: string) => {
    if (pinModalInput.length >= 4) return;
    triggerHaptic('light');
    setPinModalError(null);
    const nextVal = pinModalInput + digit;
    setPinModalInput(nextVal);

    if (nextVal.length === 4) {
      if (pinModalStep === 'enter') {
        triggerHaptic('medium');
        setPinModalCandidate(nextVal);
        setPinModalStep('confirm');
        setPinModalInput('');
      } else if (pinModalStep === 'confirm') {
        if (nextVal === pinModalCandidate) {
          triggerHaptic('success');
          WebAuthnService.saveSecurityPin(nextVal).then(() => {
            setHasStoredPin(true);
            setDeviceSecurityActive(true);
            WebAuthnService.setDeviceSecurityEnabled(true);
            onUpdateUser({
              ...user,
              deviceSecurityEnabled: true,
              appLockEnabled: true,
              requireAuthForPayments: true,
            });
            setIsPinModalOpen(false);
            setBioFeedback({
              type: 'success',
              text: isEn
                ? '4-digit PIN saved and lock enabled!'
                : 'PIN de 4 dígitos salvo e bloqueio ativado!',
            });
            setTimeout(() => setBioFeedback(null), 3000);
          });
        } else {
          triggerHaptic('warning');
          setPinModalError(
            isEn ? 'PINs do not match. Try again.' : 'Os PINs não coincidem. Tente novamente.'
          );
          setPinModalInput('');
          setPinModalStep('enter');
          setPinModalCandidate('');
        }
      }
    }
  };

  const handlePinModalBackspace = () => {
    if (pinModalInput.length === 0) return;
    triggerHaptic('light');
    setPinModalInput((prev) => prev.slice(0, -1));
    setPinModalError(null);
  };

  const handleTestDeviceSecurity = async () => {
    triggerHaptic('light');
    setIsTestingBio(true);
    setBioFeedback(null);

    try {
      const res = await WebAuthnService.authenticateBiometrics(
        user.email || 'usuario@cofreadmin.app',
        user.name || (isEn ? 'CofreAdmin User' : 'Usuário CofreAdmin')
      );
      if (res.success) {
        triggerHaptic('success');
        setBioFeedback({
          type: 'success',
          text: isEn
            ? 'Biometrics or PIN validated successfully! 🛡️'
            : 'Biometria ou PIN validado com sucesso! 🛡️',
        });
      } else if (res.cancelled) {
        triggerHaptic('warning');
        setBioFeedback({
          type: 'error',
          text: isEn ? 'Biometric validation cancelled on device.' : 'Validação biométrica cancelada no aparelho.',
        });
      } else {
        triggerHaptic('warning');
        setBioFeedback({
          type: 'error',
          text: res.message || (isEn ? 'Device validation failed.' : 'Falha na validação do aparelho.'),
        });
      }
    } catch (e: any) {
      setBioFeedback({
        type: 'error',
        text: isEn ? 'Error validating device security.' : 'Erro ao validar segurança do aparelho.',
      });
    } finally {
      setIsTestingBio(false);
      setTimeout(() => setBioFeedback(null), 4000);
    }
  };

  const handleLockNow = () => {
    triggerHaptic('medium');
    WebAuthnService.setSessionUnlocked(false);
    if (onLockApp) {
      onLockApp();
    }
  };

  return (
    <div className="w-full pb-28 pt-2" id="profile-settings-screen-container">
      {/* User Info Header Card */}
      <div className="flex items-center justify-between bg-white border-2 border-black rounded-2xl p-2.5 sm:p-3 shadow-neo mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-black object-cover bg-[#B8F256] shadow-neo-xs flex-shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-['Outfit'] font-black text-base sm:text-lg text-black leading-tight truncate">
                {user.name || (isEn ? 'User' : 'Usuário')}
              </h2>
              {user.isGuest || user.provider === 'guest' ? (
                <span className="inline-flex items-center gap-1 bg-[#FEF08A] text-amber-950 border border-black/20 text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-neo-xs">
                  <span>{isEn ? 'Offline Mode' : 'Modo Offline'}</span>
                </span>
              ) : user.isGoogleAuth || user.provider === 'google' ? (
                <span className="inline-flex items-center gap-1 bg-[#FFFBEB] text-amber-900 border border-black/20 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  <span>Google</span>
                </span>
              ) : user.provider === 'discord' || user.discordId ? (
                <span className="inline-flex items-center gap-1 bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-neo-xs">
                  <span>Discord</span>
                </span>
              ) : null}
            </div>
            <span className="text-xs text-neutral-500 font-mono block truncate">
              {user.email || (user.username ? `@${user.username}` : '')}
            </span>
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs - Responsive 4 Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { id: 'profile', label: isEn ? 'Profile' : 'Perfil', icon: '👤', activeBg: 'bg-[#EDE9FE]', textActive: 'text-purple-950', ring: 'ring-purple-400/40' },
          { id: 'categories', label: isEn ? 'Tags' : 'Categorias', icon: '🏷️', activeBg: 'bg-[#FFE4E6]', textActive: 'text-rose-950', ring: 'ring-rose-400/40' },
          { id: 'security', label: isEn ? 'Security' : 'Segurança', icon: '🛡️', activeBg: 'bg-[#DCFCE7]', textActive: 'text-emerald-950', ring: 'ring-emerald-400/40' },
          { id: 'backup', label: isEn ? 'Backup' : 'Backup', icon: '💾', activeBg: 'bg-[#FEF3C7]', textActive: 'text-amber-950', ring: 'ring-amber-400/40' },
        ].map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveSection(tab.id as any);
              }}
              className={`py-2 px-2 rounded-xl border-2 font-['Outfit'] font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 btn-press min-h-[44px] cursor-pointer ${
                isActive
                  ? `${tab.activeBg} ${tab.textActive} border-black shadow-neo scale-[1.02] ring-2 ${tab.ring}`
                  : 'bg-white text-neutral-700 border-black/20 hover:border-black hover:text-black hover:bg-neutral-50 shadow-neo-xs'
              }`}
              id={`tab-settings-${tab.id}`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION: PROFILE */}
      {activeSection === 'profile' && (
        <div className="space-y-4">
          {user.isGuest && (
            <div className="bg-[#FEF9C3] border-2 border-black rounded-2xl p-4 shadow-neo-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-amber-400 text-black font-black text-[10px] rounded-md border border-black uppercase font-mono-code shadow-neo-xs">
                  {isEn ? 'Guest Mode' : 'Modo Visitante'}
                </span>
                <span className="text-[10px] font-bold text-neutral-600">• {isEn ? 'Zero Cloud' : 'Zero Nuvem'}</span>
              </div>
              <p className="text-xs text-neutral-800 font-medium">
                {isEn
                  ? 'Local test mode. Records are saved only on this device.'
                  : 'Modo local. Seus registros estão salvos apenas neste dispositivo.'}
              </p>
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onLogout();
                  }}
                  className="w-full py-2 px-3 bg-[#B8F256] hover:bg-[#A3E635] text-black border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer"
                  id="btn-profile-connect-account"
                >
                  <span>{isEn ? 'Sign In / Sign Up' : 'Entrar / Criar Conta'}</span>
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="bg-white border-2 border-black rounded-[22px] p-4.5 sm:p-5 shadow-neo space-y-3.5">
            <h3 className="font-['Outfit'] font-black text-base text-black flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              <span>{isEn ? 'Profile' : 'Perfil'}</span>
            </h3>

            {/* Avatar & Photo Section */}
            <div className="bg-[#F8FAFC] border-2 border-black rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-['Outfit'] font-black text-black">
                  {isEn ? 'Photo' : 'Foto'}
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      const seeds = ['CofreMaster', 'Creative', 'FinanceHero', 'Alex', 'StudioPro', 'ZenMaster', 'PixelCofre'];
                      const randomSeed = seeds[Math.floor(Math.random() * seeds.length)] + Math.floor(Math.random() * 1000);
                      const styles = ['bottts', 'adventurer', 'pixel-art', 'lorelei'];
                      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
                      const newAvatar = `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}&backgroundColor=b6e3f4,c0aede,ffd5dc,b8f256`;
                      setAvatarUrl(newAvatar);
                      void db.setCustomAvatar(newAvatar, user.authId);
                      onUpdateUser({ ...user, avatarUrl: newAvatar });
                      setAvatarFeedback(isEn ? 'New avatar! ✨' : 'Novo avatar! ✨');
                      setTimeout(() => setAvatarFeedback(null), 2500);
                    }}
                    className="text-[11px] font-['Outfit'] font-black bg-[#EDE9FE] hover:bg-[#DDD6FE] text-purple-950 px-2.5 py-1 rounded-xl border border-black shadow-neo-xs btn-press flex items-center gap-1 cursor-pointer"
                    title={isEn ? 'Random' : 'Aleatório'}
                  >
                    <span>🎲</span>
                    <span>{isEn ? 'Random' : 'Aleatório'}</span>
                  </button>

                  {avatarUrl && !avatarUrl.includes('seed=BaseCofre') && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        void db.clearCustomAvatar();
                        const defaultAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=BaseCofre&backgroundColor=b6e3f4,c0aede,ffd5dc';
                        setAvatarUrl(defaultAvatar);
                        onUpdateUser({ ...user, avatarUrl: defaultAvatar });
                        setAvatarFeedback(isEn ? 'Default restored.' : 'Padrão restaurado.');
                        setTimeout(() => setAvatarFeedback(null), 2500);
                      }}
                      className="text-[11px] font-['Outfit'] font-bold text-neutral-600 hover:text-red-600 bg-white hover:bg-red-50 px-2 py-1 rounded-xl border border-black/20 hover:border-red-400 transition-colors cursor-pointer"
                      title={isEn ? 'Reset' : 'Restaurar'}
                    >
                      {isEn ? 'Reset' : 'Restaurar'}
                    </button>
                  )}
                </div>
              </div>

              {/* Photo with direct camera badge + Preset Avatars side-by-side */}
              <div className="flex items-center gap-3">
                {/* Current Avatar display & Direct camera trigger on the photo */}
                <div className="relative group flex-shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-black bg-[#B8F256] p-0.5 overflow-hidden shadow-neo-sm">
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover rounded-full bg-white"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=BaseCofre';
                      }}
                    />
                  </div>
                  <label
                    htmlFor="avatar-file-input"
                    className="absolute -bottom-1 -right-1 bg-black hover:bg-neutral-800 text-[#B8F256] p-1.5 rounded-full border border-black shadow-neo-xs cursor-pointer transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                    title={isUploadingPhoto ? (isEn ? 'Uploading...' : 'Carregando...') : (isEn ? 'Upload' : 'Carregar')}
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B8F256]" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </label>
                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>

                {/* Avatar selector positioned alongside profile picture */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">
                      {isEn ? 'Avatars' : 'Avatares'}
                    </span>
                    {avatarFeedback && (
                      <span className="text-[10px] font-bold text-emerald-700 animate-fade-in truncate max-w-[140px]">
                        {avatarFeedback}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {AVATAR_OPTIONS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setAvatarUrl(av);
                          void db.setCustomAvatar(av, user.authId);
                          onUpdateUser({ ...user, avatarUrl: av });
                          setAvatarFeedback(isEn ? 'Avatar updated! ✨' : 'Avatar atualizado! ✨');
                          setTimeout(() => setAvatarFeedback(null), 2500);
                        }}
                        className={`w-10 h-10 rounded-full border-2 p-0.5 overflow-hidden flex-shrink-0 transition-all cursor-pointer ${
                          avatarUrl === av ? 'border-black bg-[#B8F256] shadow-neo-sm scale-105 ring-2 ring-black' : 'border-black/20 opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        title={isEn ? `Avatar ${idx + 1}` : `Avatar ${idx + 1}`}
                      >
                        <img src={av} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover rounded-full bg-white" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Name with Cloud Save button on the right */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-['Outfit'] font-bold text-black block">
                  {isEn ? 'Name' : 'Nome'}
                </label>
                {savedUserFeedback && (
                  <span className="text-[11px] font-bold text-emerald-700 animate-fade-in flex items-center gap-1 font-['Outfit']">
                    <span>☁️</span>
                    <span>{isEn ? 'Saved to cloud! ✨' : 'Salvo na nuvem! ✨'}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveProfile();
                    }
                  }}
                  className="flex-1 min-w-0 bg-[#F4F6FB] border-2 border-black rounded-xl px-3.5 py-1.5 text-sm font-bold text-black focus:outline-hidden focus:border-black focus:bg-white transition-colors"
                  placeholder={isEn ? 'Your name' : 'Seu nome'}
                  required
                />
                <button
                  type="button"
                  onClick={() => handleSaveProfile()}
                  className={`w-9 h-9 rounded-xl border-2 border-black font-['Outfit'] font-black text-sm shadow-neo-2xs btn-press flex items-center justify-center cursor-pointer shrink-0 transition-all active:scale-95 ${
                    savedUserFeedback
                      ? 'bg-emerald-400 text-black'
                      : 'bg-[#B8F256] hover:bg-[#a3e635] text-black'
                  }`}
                  title={isEn ? 'Save to cloud ☁️' : 'Salvar na nuvem ☁️'}
                  id="btn-save-name-cloud"
                  aria-label={isEn ? 'Save name to cloud' : 'Salvar nome na nuvem'}
                >
                  <span className="text-base leading-none select-none">
                    {savedUserFeedback ? '✅' : '☁️'}
                  </span>
                </button>
              </div>
            </div>

            {/* Language Selection */}
            <div className="py-2.5 border-t border-black/10 flex items-center justify-between gap-2">
              <label className="text-xs font-['Outfit'] font-bold text-black shrink-0">
                {isEn ? 'Language:' : 'Idioma:'}
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    changeLanguage('en-US');
                  }}
                  className={`py-1 px-2.5 rounded-lg border-2 font-['Outfit'] font-black text-xs flex items-center gap-1 transition-all cursor-pointer ${
                    language === 'en-US'
                      ? 'bg-[#B8F256] text-black border-black shadow-neo-2xs'
                      : 'bg-[#F4F6FB] text-neutral-600 border-black/20 hover:border-black'
                  }`}
                  id="btn-lang-us"
                  title="en-US"
                >
                  <span className="text-sm leading-none">🇺🇸</span>
                  <span>en-US</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    changeLanguage('pt-BR');
                  }}
                  className={`py-1 px-2.5 rounded-lg border-2 font-['Outfit'] font-black text-xs flex items-center gap-1 transition-all cursor-pointer ${
                    language === 'pt-BR'
                      ? 'bg-[#B8F256] text-black border-black shadow-neo-2xs'
                      : 'bg-[#F4F6FB] text-neutral-600 border-black/20 hover:border-black'
                  }`}
                  id="btn-lang-br"
                  title="pt-BR"
                >
                  <span className="text-sm leading-none">🇧🇷</span>
                  <span>pt-BR</span>
                </button>
              </div>
            </div>

            {/* Currency Selection */}
            <div className="py-2.5 border-t border-black/10">
              <label className="text-xs font-['Outfit'] font-bold text-black block mb-1.5" htmlFor="select-display-currency">
                {isEn ? 'Currency' : 'Moeda'}
              </label>
              <select
                id="select-display-currency"
                value={(currency || 'USD').toUpperCase()}
                onChange={(e) => {
                  const selectedCode = e.target.value;
                  triggerHaptic('medium');
                  onUpdateUser({ ...user, currency: selectedCode });
                  if (onChangeCurrency) onChangeCurrency(selectedCode as any);
                }}
                className="w-full bg-[#F4F6FB] border-2 border-black rounded-xl p-2.5 text-xs font-['Outfit'] font-black text-black focus:outline-hidden cursor-pointer"
              >
                {getTopCurrencies(language).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Haptics Switch */}
            <div className="flex items-center justify-between pt-2.5 pb-1 border-t border-black/10">
              <div>
                <span className="text-xs font-['Outfit'] font-bold text-black block">
                  {isEn ? 'Vibration' : 'Vibração'}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {isEn ? 'Haptic feedback on actions' : 'Resposta tátil nas ações'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  const nextVal = !haptics;
                  setHaptics(nextVal);
                  onUpdateUser({ ...user, hapticsEnabled: nextVal });
                }}
                className={`w-12 h-6 rounded-full border-2 border-black p-0.5 transition-colors cursor-pointer ${
                  haptics ? 'bg-[#B8F256]' : 'bg-neutral-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-black transition-transform ${
                  haptics ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </form>

          {/* Card: Push Nativas (Web Push) */}
          <div className="bg-white border-2 border-black rounded-[22px] p-5 shadow-neo space-y-3.5" id="card-push-notifications">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] border-2 border-black flex items-center justify-center shadow-neo-xs flex-shrink-0">
                  <Bell className="w-5 h-5 text-amber-900" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-['Outfit'] font-black text-sm text-black">
                      {isEn ? 'Native Push' : 'Push Nativas'}
                    </h4>
                    {pushPermission === 'granted' && isPushEnabled ? (
                      <span className="bg-[#DCFCE7] text-emerald-950 text-[10px] font-black px-1.5 py-0.5 rounded border border-emerald-400">
                        {isEn ? '✓ Active' : '✓ Ativo'}
                      </span>
                    ) : (
                      <span className="bg-neutral-100 text-neutral-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-black/15">
                        {isEn ? 'Inactive' : 'Inativo'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    {isEn
                      ? 'Alerts for received USDC and goals'
                      : 'Alerta de USDC recebidos e metas'}
                  </p>
                </div>
              </div>

              {/* Master Switch */}
              <button
                type="button"
                onClick={handleTogglePush}
                disabled={isRequestingPush}
                className={`w-12 h-6 rounded-full border-2 border-black p-0.5 transition-colors cursor-pointer flex-shrink-0 ${
                  isPushEnabled && pushPermission === 'granted' ? 'bg-[#B8F256]' : 'bg-neutral-200'
                }`}
                title={isPushEnabled ? (isEn ? 'Disable' : 'Desativar') : (isEn ? 'Enable' : 'Ativar')}
                id="toggle-push-notifications"
              >
                <div className={`w-4 h-4 rounded-full bg-white border border-black transition-transform ${
                  isPushEnabled && pushPermission === 'granted' ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Detailed settings when active */}
            {isPushEnabled && pushPermission === 'granted' && (
              <div className="space-y-2.5 pt-2 border-t border-black/10">
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                    <span>💰</span> {isEn ? 'USDC receipts' : 'Recebimentos de USDC'}
                  </span>
                  <input
                    type="checkbox"
                    checked={user.notifyOnReceivePayment !== false}
                    onChange={(e) => {
                      triggerHaptic('light');
                      onUpdateUser({ ...user, notifyOnReceivePayment: e.target.checked });
                    }}
                    className="w-4 h-4 accent-[#0052FF] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                    <span>🎯</span> {isEn ? 'Vault goals' : 'Metas dos cofres'}
                  </span>
                  <input
                    type="checkbox"
                    checked={user.notifyOnVaultMilestone !== false}
                    onChange={(e) => {
                      triggerHaptic('light');
                      onUpdateUser({ ...user, notifyOnVaultMilestone: e.target.checked });
                    }}
                    className="w-4 h-4 accent-[#0052FF] cursor-pointer"
                  />
                </div>

                {/* Test Button */}
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isTestingPush}
                  className="w-full mt-2 py-2 px-3 bg-[#EDE9FE] hover:bg-[#DDD6FE] text-purple-950 border border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press flex items-center justify-center gap-2 cursor-pointer transition-all"
                  id="btn-test-push-notification"
                >
                  <BellRing className={`w-4 h-4 text-purple-700 ${isTestingPush ? 'animate-bounce' : ''}`} />
                  <span>
                    {isTestingPush
                      ? (isEn ? 'Sending...' : 'Enviando...')
                      : (isEn ? '🔔 Test Push' : '🔔 Testar Push')}
                  </span>
                </button>
              </div>
            )}

            {pushFeedback && (
              <p className="text-xs font-bold text-emerald-700 text-center animate-fade-in pt-1">
                {pushFeedback}
              </p>
            )}
          </div>
        </div>
      )}

      {/* SECTION: CATEGORIES & INCOME TYPES MANAGER */}
      {activeSection === 'categories' && (
        <div className="space-y-3.5">
          {/* Subtle divider line between main tabs and category filters */}
          <div className="w-full border-t border-black/15 -mt-1 pt-0.5" />

          {/* Quick Filter Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pb-1">
            {[
              { 
                id: 'all', 
                label: isEn ? 'All' : 'Todas', 
                count: categories.length, 
                emoji: '🏷️', 
                activeBg: 'bg-[#EDE9FE]', 
                textActive: 'text-purple-950' 
              },
              { 
                id: 'expense', 
                label: isEn ? 'Expenses' : 'Gastos', 
                count: categories.filter(c => c.type === 'expense' || c.type === 'both').length, 
                emoji: '💸', 
                activeBg: 'bg-[#FFE4E6]', 
                textActive: 'text-rose-950' 
              },
              { 
                id: 'income', 
                label: isEn ? 'Income' : 'Entradas', 
                count: categories.filter(c => c.type === 'income' || c.type === 'both').length, 
                emoji: '💰', 
                activeBg: 'bg-[#E4F97E]', 
                textActive: 'text-emerald-950' 
              },
              { 
                id: 'favorites', 
                label: isEn ? 'Favorites' : 'Favoritas', 
                count: categories.filter(c => c.isFavorite).length, 
                emoji: '⭐', 
                activeBg: 'bg-[#FEF3C7]', 
                textActive: 'text-amber-950' 
              },
            ].map((tab) => {
              const isActive = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setCategoryFilter(tab.id as any);
                  }}
                  className={`py-2 px-2 rounded-xl border-2 font-['Outfit'] font-black text-xs transition-all flex items-center justify-center gap-1.5 min-w-0 cursor-pointer ${
                    isActive
                      ? `${tab.activeBg} ${tab.textActive} border-black shadow-neo-sm scale-[1.02]`
                      : 'bg-white text-neutral-600 border-black/20 hover:border-black hover:text-black hover:bg-neutral-50 shadow-neo-xs'
                  }`}
                  id={`cat-filter-${tab.id}`}
                >
                  <span>{tab.emoji}</span>
                  <span className="truncate">{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full border border-black/20 font-bold ${
                    isActive ? 'bg-white/80 text-black' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Bar: Unified Registration Button */}
          {!isCreatingCat && !editingCatId && (
            <button
              onClick={() => handleStartCreateCat(categoryFilter === 'income' ? 'income' : 'expense')}
              className="w-full py-3 px-4 bg-[#EDE9FE] hover:bg-[#DDD6FE] text-purple-950 border-2 border-black rounded-2xl font-['Outfit'] font-black text-sm shadow-neo-sm btn-press flex items-center justify-between cursor-pointer transition-all group"
              id="btn-create-category-unified"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border-2 border-black flex items-center justify-center shadow-neo-xs group-hover:scale-105 transition-transform text-base">
                  <Plus className="w-5 h-5 stroke-[3] text-purple-950" />
                </div>
                <div className="text-left">
                  <span className="block leading-tight text-sm font-black text-black">
                    {isEn ? 'Add Tag' : 'Nova Categoria'}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-600 block">
                    {isEn ? 'Create expense or income tag' : 'Cadastre gastos ou receitas'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-lg border border-black/20 bg-[#FFE4E6] text-rose-950 font-black">
                  {isEn ? '💸 Expense' : '💸 Gasto'}
                </span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-lg border border-black/20 bg-[#E4F97E] text-emerald-950 font-black">
                  {isEn ? '💰 Income' : '💰 Ganho'}
                </span>
              </div>
            </button>
          )}

          {/* Form Card (Create or Edit) */}
          {(isCreatingCat || editingCatId) && (
            <form 
              onSubmit={handleSaveCategoryForm} 
              className={`border-2 border-black rounded-[24px] p-4 shadow-neo space-y-4 animate-in zoom-in-95 duration-150 ${
                catType === 'income' 
                  ? 'bg-gradient-to-b from-[#F9FEE8] to-white border-lime-800' 
                  : 'bg-gradient-to-b from-[#FFF5F5] to-white border-rose-800'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between border-b pb-3 ${
                catType === 'income' ? 'border-lime-200' : 'border-rose-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center text-lg shadow-neo-xs ${
                    catType === 'income' ? 'bg-[#E4F97E]' : 'bg-[#FFE4E6]'
                  }`}>
                    {catType === 'income' ? '💰' : '💸'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-['Outfit'] font-black text-sm text-black leading-tight">
                        {isCreatingCat ? (
                          catType === 'income'
                            ? (isEn ? 'New Income' : 'Nova Entrada')
                            : (isEn ? 'New Expense' : 'Novo Gasto')
                        ) : (
                          catType === 'income'
                            ? (isEn ? 'Edit Income' : 'Editar Entrada')
                            : (isEn ? 'Edit Expense' : 'Editar Gasto')
                        )}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-black/30 ${
                        catType === 'income' ? 'bg-[#E4F97E] text-emerald-950' : 'bg-[#FFE4E6] text-rose-950'
                      }`}>
                        {catType === 'income' ? (isEn ? 'Income' : 'Receita') : (isEn ? 'Expense' : 'Despesa')}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-neutral-500 mt-0.5">
                      {catType === 'income'
                        ? (isEn ? 'Income, salary, or transfer tag' : 'Salário, rendimentos ou transferências')
                        : (isEn ? 'Track and organize your spending' : 'Classifique e controle seus gastos')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCat(false);
                    setEditingCatId(null);
                  }}
                  className="w-7 h-7 rounded-lg border border-black/20 hover:border-black bg-white hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
                  title={isEn ? 'Cancel' : 'Cancelar'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Natureza Selector (Claramente diferenciado) */}
              <div>
                <label className="text-[11px] font-black text-neutral-700 block mb-1.5 flex items-center justify-between">
                  <span>{isEn ? 'Type:' : 'Tipo:'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setCatType('expense');
                      if (isCreatingCat && catColor.name === 'lime') {
                        setCatColor(COLOR_PRESETS[1]); // rose
                      }
                      if (isCreatingCat && (catEmoji === '💰' || catEmoji === '💵')) {
                        setCatEmoji('🍕');
                      }
                    }}
                    className={`py-2.5 px-2.5 rounded-xl border-2 font-['Outfit'] font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      catType === 'expense'
                        ? 'bg-[#FFE4E6] text-rose-950 border-black shadow-neo-xs scale-[1.01]'
                        : 'bg-white text-neutral-500 border-black/20 hover:border-black'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
                    <span>{isEn ? '💸 Expense' : '💸 Gasto'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setCatType('income');
                      if (isCreatingCat && catColor.name === 'rose') {
                        setCatColor(COLOR_PRESETS[4]); // lime
                      }
                      if (isCreatingCat && (catEmoji === '🍕' || catEmoji === '🍔')) {
                        setCatEmoji('💰');
                      }
                    }}
                    className={`py-2.5 px-2.5 rounded-xl border-2 font-['Outfit'] font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      catType === 'income'
                        ? 'bg-[#E4F97E] text-emerald-950 border-black shadow-neo-xs scale-[1.01]'
                        : 'bg-white text-neutral-500 border-black/20 hover:border-black'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                    <span>{isEn ? '💰 Income' : '💰 Ganho'}</span>
                  </button>
                </div>
              </div>

              {/* Name & Emoji Picker */}
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">
                    {catType === 'income'
                      ? (isEn ? 'Income Name' : 'Nome da Entrada')
                      : (isEn ? 'Expense Name' : 'Nome do Gasto')}
                  </label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder={
                      catType === 'income' 
                        ? (isEn ? 'e.g., Salary, Freelance, Yields...' : 'ex: Salário, Freela, Rendimento...') 
                        : (isEn ? 'e.g., Groceries, Gym, Subscriptions...' : 'ex: Mercado, Academia, Assinaturas...')
                    }
                    className="w-full bg-white border-2 border-black rounded-xl p-2.5 text-xs font-bold text-black focus:outline-hidden shadow-neo-xs"
                    required
                    autoFocus
                  />
                </div>

                <div className="col-span-1">
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1 text-center">
                    Emoji
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setIsEmojiPickerOpen(true);
                    }}
                    className="w-full h-[38px] bg-white hover:bg-[#EDE9FE] border-2 border-black rounded-xl flex items-center justify-center text-xl shadow-neo-xs btn-press cursor-pointer"
                    title={isEn ? 'Emoji' : 'Emoji'}
                  >
                    <span>{catEmoji}</span>
                  </button>
                </div>
              </div>

              {/* Quick Suggested Emojis tailored for the selected type */}
              <div>
                <span className="text-[10px] font-bold text-neutral-500 block mb-1">
                  {isEn ? 'Suggestions:' : 'Sugestões:'}
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {(catType === 'income'
                    ? ['💰', '💵', '🪙', '💼', '💳', '🏦', '📈', '🤑', '🎁', '💎', '🏷️', '🤝']
                    : ['🍕', '🍔', '🛒', '🚗', '🎮', '👕', '⚡', '💊', '🏖️', '🍿', '🎬', '☕']
                  ).map((quickEmoji) => (
                    <button
                      key={quickEmoji}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setCatEmoji(quickEmoji);
                      }}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition-transform hover:scale-110 cursor-pointer ${
                        catEmoji === quickEmoji ? 'border-2 border-black bg-white shadow-neo-xs scale-110' : 'border-black/20 bg-white/70'
                      }`}
                    >
                      {quickEmoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="text-[11px] font-bold text-neutral-600 block mb-1.5">
                  {isEn ? 'Color' : 'Cor'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setCatColor(preset);
                      }}
                      className={`w-7 h-7 rounded-lg border-2 transition-transform flex items-center justify-center text-xs cursor-pointer ${
                        catColor.name === preset.name ? 'border-black scale-110 shadow-neo-xs' : 'border-black/30'
                      }`}
                      style={{ backgroundColor: preset.bg }}
                      title={preset.label}
                    >
                      {catColor.name === preset.name && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Favorite Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-black/10">
                <div className="flex items-center gap-1.5">
                  <Star className={`w-4 h-4 ${catIsFavorite ? 'text-amber-500 fill-amber-400' : 'text-neutral-400'}`} />
                  <span className="text-xs font-bold text-black">
                    {isEn ? 'Favorite Tag' : 'Categoria Favorita'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setCatIsFavorite(!catIsFavorite);
                  }}
                  className={`w-10 h-5 rounded-full border-2 border-black p-0.5 transition-colors cursor-pointer ${
                    catIsFavorite ? 'bg-amber-400' : 'bg-neutral-200'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-black transition-transform ${
                    catIsFavorite ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCat(false);
                    setEditingCatId(null);
                  }}
                  className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-black border-2 border-black rounded-xl font-['Outfit'] font-bold text-xs cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className={`flex-2 py-2.5 border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer ${
                    catType === 'income'
                      ? 'bg-[#E4F97E] hover:bg-[#D2F764] text-emerald-950'
                      : 'bg-[#FFE4E6] hover:bg-[#FECDD3] text-rose-950'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {isEn ? 'Save Tag' : 'Salvar Categoria'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* List of Categories with Reorder, Edit, Delete, Favorite */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h4 className="font-['Outfit'] font-black text-sm text-black">
                {categoryFilter === 'expense' && (isEn ? `Expense Tags (${displayedCategories.length})` : `Categorias de Gastos (${displayedCategories.length})`)}
                {categoryFilter === 'income' && (isEn ? `Income Tags (${displayedCategories.length})` : `Tipos de Entrada (${displayedCategories.length})`)}
                {categoryFilter === 'favorites' && (isEn ? `Favorite Tags (${displayedCategories.length})` : `Categorias & Entradas Favoritas (${displayedCategories.length})`)}
                {categoryFilter === 'all' && (isEn ? `All Categories & Tags (${displayedCategories.length})` : `Todas as Categorias & Entradas (${displayedCategories.length})`)}
              </h4>
              <span className="text-[10px] text-neutral-500 font-semibold">
                {isEn ? 'Use ⬆️ ⬇️ to reorder' : 'Use ⬆️ ⬇️ para reordenar'}
              </span>
            </div>

            {displayedCategories.length === 0 ? (
              <div className="text-center py-8 bg-white border-2 border-dashed border-black/30 rounded-2xl p-4">
                <span className="text-3xl">
                  {categoryFilter === 'income' ? '💰' : categoryFilter === 'expense' ? '💸' : '🏷️'}
                </span>
                <p className="font-['Outfit'] font-bold text-xs text-neutral-600 mt-2">
                  {categoryFilter === 'expense'
                    ? (isEn ? 'No expense tags registered.' : 'Nenhuma categoria de gasto cadastrada.')
                    : categoryFilter === 'income'
                    ? (isEn ? 'No income tags registered.' : 'Nenhum tipo de entrada cadastrado.')
                    : (isEn ? 'No tags found with this filter.' : 'Nenhuma categoria encontrada com este filtro.')}
                </p>
                <button
                  onClick={() => handleStartCreateCat(categoryFilter === 'income' ? 'income' : 'expense')}
                  className="mt-3 px-4 py-2 bg-[#EDE9FE] hover:bg-[#DDD6FE] text-purple-950 border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{isEn ? '+ Add Expense or Income Tag' : '+ Cadastro de Saídas e Ganhos'}</span>
                </button>
              </div>
            ) : (
              displayedCategories.map((cat, index) => {
                const isIncome = cat.type === 'income';

                return (
                  <div
                    key={cat.id}
                    className="w-full bg-white border-2 border-black rounded-2xl p-3 flex items-center justify-between shadow-neo-xs hover:border-black transition-all"
                  >
                    {/* Left: Emoji, Name, Tag & Favorite */}
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                      <div 
                        className="w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center text-xl flex-shrink-0 shadow-neo-xs"
                        style={{ backgroundColor: cat.bgColor || '#EDE9FE' }}
                      >
                        {cat.emoji}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-['Outfit'] font-black text-xs text-black truncate">
                            {cat.name}
                          </span>
                          {cat.isFavorite && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isIncome ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#E4F97E] border border-lime-400 text-emerald-950 text-[10px] font-black leading-none">
                              <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-800 stroke-[3]" />
                              {isEn ? 'Income Tag' : 'Tipo de Entrada (Receita)'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#FFE4E6] border border-rose-300 text-rose-950 text-[10px] font-black leading-none">
                              <ArrowUpRight className="w-2.5 h-2.5 text-rose-700 stroke-[3]" />
                              {isEn ? 'Expense Tag' : 'Categoria de Gasto (Despesa)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Controls (Reorder, Star, Edit, Delete) */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {/* Reorder Buttons */}
                      <button
                        onClick={() => handleMoveUpCat(cat.id)}
                        disabled={index === 0}
                        className="p-1 rounded-lg border border-black/20 hover:border-black bg-neutral-50 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                        title={isEn ? 'Up' : 'Subir'}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveDownCat(cat.id)}
                        disabled={index === displayedCategories.length - 1}
                        className="p-1 rounded-lg border border-black/20 hover:border-black bg-neutral-50 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                        title={isEn ? 'Down' : 'Descer'}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Favorite Toggle */}
                      <button
                        onClick={() => handleToggleFavoriteCat(cat.id)}
                        className={`p-1.5 rounded-lg border border-black/20 hover:border-black cursor-pointer ${
                          cat.isFavorite ? 'bg-amber-100 text-amber-600' : 'bg-neutral-50 text-neutral-400 hover:text-amber-500'
                        }`}
                        title={cat.isFavorite ? (isEn ? 'Unfavorite' : 'Desfavoritar') : (isEn ? 'Favorite' : 'Favoritar')}
                      >
                        <Star className={`w-3.5 h-3.5 ${cat.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleStartEditCat(cat)}
                        className="p-1.5 rounded-lg border border-black/20 hover:border-black bg-[#E0F2FE] text-sky-950 cursor-pointer"
                        title={isEn ? 'Edit' : 'Editar'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 rounded-lg border border-black/20 hover:border-black bg-[#FFE4E6] text-rose-800 hover:bg-rose-200 cursor-pointer"
                        title={isEn ? 'Delete' : 'Excluir'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION: SECURITY (Device Biometrics / PIN) */}
      {activeSection === 'security' && (
        <div className="space-y-3.5" id="section-settings-security">
          {/* Notice if device lacks biometrics or lock configuration (warning only) */}
          {!isPlatformBiometricsAvailable && (
            <div className="p-3.5 bg-[#FEF08A] border-2 border-black rounded-2xl shadow-neo-xs animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-900 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-['Outfit'] font-black text-xs text-amber-950">
                    {isEn ? 'Notice: No device biometrics or PIN detected' : 'Aviso: Aparelho sem biometria ou PIN detectado'}
                  </h4>
                  <p className="text-[11px] text-amber-900 font-medium mt-0.5 leading-snug">
                    {isEn
                      ? 'Configure fingerprint, Face ID, or PIN in your device security settings to use app lock.'
                      : 'Configure a impressão digital, Face ID ou PIN nas configurações de segurança do seu celular para usar o bloqueio.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Card: App Lock & Security */}
          <div className="bg-white border-2 border-black rounded-2xl p-4 sm:p-5 shadow-neo space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] border-2 border-black flex items-center justify-center shadow-neo-xs flex-shrink-0">
                  <Fingerprint className="w-5 h-5 text-purple-700" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-['Outfit'] font-black text-sm text-black truncate">
                    {isEn ? 'Lock App' : 'Bloquear App'}
                  </h4>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    {isEn ? 'Biometrics or PIN' : 'Biometria ou PIN'}
                  </p>
                </div>
              </div>

              {/* Toggle Switch Button */}
              <button
                type="button"
                onClick={handleToggleDeviceSecurity}
                disabled={isTestingBio}
                className={`w-12 h-6 rounded-full border-2 border-black p-0.5 transition-colors cursor-pointer flex-shrink-0 ${
                  deviceSecurityActive ? 'bg-[#B8F256]' : 'bg-neutral-200'
                }`}
                id="toggle-master-device-security"
                aria-label={isEn ? 'Toggle lock' : 'Alternar bloqueio'}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black transition-transform ${
                    deviceSecurityActive ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {bioFeedback && (
              <div
                className={`p-3 rounded-xl border-2 border-black text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-neo-xs ${
                  bioFeedback.type === 'success'
                    ? 'bg-[#DCFCE7] text-emerald-950'
                    : 'bg-[#FFE4E6] text-rose-950'
                }`}
              >
                {bioFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
                )}
                <span>{bioFeedback.text}</span>
              </div>
            )}

            {/* 4-Digit PIN Configuration Row */}
            <div className="p-3 bg-[#F8FAFC] border-2 border-black/15 rounded-xl flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white border border-black/20 flex items-center justify-center flex-shrink-0">
                  <Key className="w-4 h-4 text-neutral-700" />
                </div>
                <div className="min-w-0">
                  <span className="font-['Outfit'] font-black text-xs text-black block truncate">
                    {isEn ? '4-Digit PIN' : 'PIN de 4 Dígitos'}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-medium block">
                    {hasStoredPin
                      ? isEn
                        ? 'Configured & active ✓'
                        : 'Configurado e ativo ✓'
                      : isEn
                      ? 'No PIN set'
                      : 'Nenhum PIN definido'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenPinModal}
                className="py-1.5 px-2.5 bg-white hover:bg-neutral-100 text-black border-2 border-black rounded-lg font-['Outfit'] font-black text-[11px] shadow-neo-xs btn-press cursor-pointer flex-shrink-0"
                id="btn-settings-configure-pin"
              >
                {hasStoredPin
                  ? isEn
                    ? 'Change PIN'
                    : 'Alterar PIN'
                  : isEn
                  ? 'Set PIN'
                  : 'Criar PIN'}
              </button>
            </div>

            {/* Direct interactive actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestDeviceSecurity}
                disabled={isTestingBio}
                className="py-2.5 px-3 bg-[#EDE9FE] hover:bg-[#DDD6FE] text-purple-950 border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press flex items-center justify-center gap-2 cursor-pointer transition-colors"
                id="btn-validate-device-security"
              >
                <Fingerprint className="w-4 h-4 text-purple-800" />
                <span>
                  {isTestingBio
                    ? (isEn ? 'Awaiting...' : 'Aguardando...')
                    : (isEn ? 'Test Security' : 'Testar Segurança')}
                </span>
              </button>

              {deviceSecurityActive && (
                <button
                  type="button"
                  onClick={handleLockNow}
                  className="py-2.5 px-3 bg-neutral-100 hover:bg-[#FEF08A] text-black border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  id="btn-lock-app-now"
                >
                  <Lock className="w-3.5 h-3.5 text-neutral-800" />
                  <span>{isEn ? 'Lock Now' : 'Bloquear Agora'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION: BACKUP & JSON */}
      {activeSection === 'backup' && (
        <div className="space-y-3.5">
          {/* Card: Web3 Digital Wallet */}
          {user.isGuest ? (
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-['Outfit'] font-black text-sm text-black flex items-center gap-2">
                  <Key className="w-4 h-4 text-neutral-500" />
                  <span>{isEn ? 'Web3 Wallet' : 'Carteira Web3'}</span>
                </h4>
                <span className="text-[10px] font-black px-2 py-0.5 bg-neutral-200 text-neutral-800 rounded-md border border-black/30 font-mono">
                  {isEn ? 'Disabled' : 'Desativada'}
                </span>
              </div>

              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                {isEn
                  ? 'In Guest Mode, no private key is connected to the blockchain.'
                  : 'No Modo Visitante, nenhuma chave privada é conectada à blockchain.'}
              </p>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onLogout();
                  }}
                  className="w-full py-2.5 px-3 bg-[#B8F256] hover:bg-[#A3E635] text-black border-2 border-black rounded-xl font-['Outfit'] font-black text-xs btn-press shadow-neo-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  id="btn-guest-connect-for-wallet"
                >
                  <span>{isEn ? 'Connect Account' : 'Conectar Conta'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-['Outfit'] font-black text-sm text-black flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>{isEn ? 'Web3 Wallet' : 'Carteira Web3'}</span>
                </h4>
                <span className="text-[10px] font-black px-2 py-0.5 bg-[#FEF08A] text-amber-950 rounded-md border border-black/30 font-mono">
                  Base L2
                </span>
              </div>

              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                {isEn
                  ? 'Network Base. Export private key for MetaMask or Coinbase.'
                  : 'Rede Base. Exporte sua chave para MetaMask ou Coinbase.'}
              </p>

              {/* Public Address */}
              <div className="bg-[#F8FAFC] border border-black/20 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-neutral-400 block uppercase">
                    {isEn ? 'Address' : 'Endereço'}
                  </span>
                  <span className="font-mono text-xs font-bold text-neutral-800 truncate block select-all">
                    {user.walletAddress || (isEn ? 'No wallet connected' : 'Nenhuma carteira conectada')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const addr = user.walletAddress || '';
                    if (addr) {
                      navigator.clipboard.writeText(addr);
                      triggerHaptic('success');
                      setWalletFeedback(isEn ? 'Address copied!' : 'Endereço copiado!');
                      setTimeout(() => setWalletFeedback(null), 2000);
                    }
                  }}
                  className="p-2 rounded-lg border border-black/20 hover:border-black bg-white text-neutral-700 hover:text-black flex-shrink-0 cursor-pointer shadow-neo-xs btn-press"
                  title={isEn ? 'Copy' : 'Copiar'}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {walletFeedback && (
                <div className="p-2 bg-[#DCFCE7] border border-emerald-600 rounded-xl text-xs text-emerald-950 font-bold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>{walletFeedback}</span>
                </div>
              )}

              {/* Button: Private Key Backup */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    setIsWalletBackupOpen(true);
                  }}
                  className="w-full py-2.5 px-3 bg-[#FEF08A] hover:bg-[#FDE047] text-amber-950 border-2 border-black rounded-xl font-['Outfit'] font-black text-xs btn-press shadow-neo-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  id="btn-open-wallet-backup-tab"
                >
                  <Key className="w-3.5 h-3.5 text-amber-900" />
                  <span>{isEn ? 'Backup Key' : 'Backup da Chave'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Reset button & explanation */}
          <div className="bg-[#FFE4E6] border-2 border-black rounded-2xl p-4 shadow-neo text-left space-y-2.5">
            <div>
              <h4 className="font-['Outfit'] font-black text-xs text-rose-950 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>{isEn ? 'Reset Local Data' : 'Restaurar Dados Locais'}</span>
              </h4>
              <p className="text-[11px] text-rose-900 font-medium mt-0.5">
                {isEn
                  ? 'Clears transactions and goals on this device.'
                  : 'Zera transações e metas neste dispositivo.'}
              </p>
            </div>

            <button
              onClick={handleResetData}
              className="w-full py-2 px-3 bg-white hover:bg-rose-100 text-rose-900 border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press cursor-pointer transition-colors"
            >
              {isEn ? 'Clear Local Data' : 'Zerar Dados Locais'}
            </button>
          </div>

          {/* Permanent Cloud Erasure (LGPD / GDPR Data Privacy) */}
          {!user.isGuest && (
            <div className="bg-rose-100 border-2 border-rose-600 rounded-2xl p-4 shadow-neo text-left space-y-2.5">
              <div>
                <h4 className="font-['Outfit'] font-black text-xs text-rose-950 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-700" />
                  <span>{isEn ? 'Delete Account & Cloud Data' : 'Excluir Conta & Nuvem'}</span>
                </h4>
                <p className="text-[11px] text-rose-900 font-medium mt-0.5">
                  {isEn
                    ? 'Permanently deletes synced cloud data.'
                    : 'Apaga definitivamente dados da nuvem.'}
                </p>
              </div>

              <button
                type="button"
                id="btn-trigger-cloud-delete-backup-tab"
                onClick={() => {
                  triggerHaptic('warning');
                  setIsDeleteConsentChecked(false);
                  setDeleteConsentError(false);
                  setShowCloudDeleteConfirm(true);
                }}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isEn ? 'Delete Cloud Data' : 'Excluir da Nuvem'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Card de Contato & Suporte */}
      <div className="bg-white border-2 border-black rounded-[22px] p-4 sm:p-5 shadow-neo mt-6" id="settings-feedback-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col justify-center min-w-0 pr-2">
            <h3 className="font-['Outfit'] font-black text-xs sm:text-sm text-black leading-tight whitespace-nowrap">
              {isEn ? 'Contact' : 'Contato'}
            </h3>
            <span className="text-[9px] font-mono font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-black/10 w-fit mt-1 tracking-tight">
              {APP_VERSION_LABEL}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsLegalModalOpen(true);
              }}
              className="w-10 h-10 rounded-xl border-2 border-black bg-[#F8FAFC] hover:bg-[#DCFCE7] text-emerald-700 flex items-center justify-center shadow-neo-xs btn-press transition-colors cursor-pointer"
              title={isEn ? 'Privacy' : 'Privacidade'}
              aria-label={isEn ? 'Privacy' : 'Privacidade'}
              id="btn-settings-privacy-policy"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            </button>

            <a
              href={import.meta.env.VITE_FEEDBACK_URL || "https://forms.gle/MBpyniv5zf795wi97"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerHaptic('light')}
              className="w-10 h-10 rounded-xl border-2 border-black bg-[#F8FAFC] hover:bg-[#EDE9FE] text-purple-600 flex items-center justify-center shadow-neo-xs btn-press transition-colors cursor-pointer"
              title={isEn ? 'Feedback' : 'Feedback'}
              aria-label={isEn ? 'Feedback' : 'Feedback'}
              id="btn-settings-feedback-form"
            >
              <MessageSquare className="w-4 h-4 text-purple-600 shrink-0" />
            </a>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                openSupportEmail({
                  userEmail: user.email,
                  userId: user.id,
                  walletAddress: user.walletAddress,
                  actionContext: isEn ? 'Settings and General Support' : 'Configurações e Suporte Geral',
                  language,
                });
              }}
              className="w-10 h-10 rounded-xl border-2 border-black bg-[#F8FAFC] hover:bg-rose-50 text-rose-500 flex items-center justify-center shadow-neo-xs btn-press transition-colors cursor-pointer"
              title={isEn ? 'Support' : 'Suporte'}
              aria-label={isEn ? 'Support' : 'Suporte'}
              id="btn-settings-report-problem"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            </button>

            <a
              href="https://github.com/cofreadminwallet/app"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerHaptic('light')}
              className="w-10 h-10 rounded-xl border-2 border-black bg-[#F8FAFC] hover:bg-sky-50 text-sky-600 flex items-center justify-center shadow-neo-xs btn-press transition-colors cursor-pointer"
              title={isEn ? 'About' : 'Sobre'}
              aria-label={isEn ? 'About' : 'Sobre'}
              id="btn-settings-about-github"
            >
              <Info className="w-4 h-4 text-sky-600 shrink-0" />
            </a>
          </div>
        </div>
      </div>

      {/* Emoji Picker Modal */}
      <EmojiPicker
        isOpen={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        onSelectEmoji={(emoji) => setCatEmoji(emoji)}
        currentEmoji={catEmoji}
      />

      {/* Confirmation Modal for Category Deletion */}
      {catToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setCatToDelete(null)} />
          <div className="relative w-full max-w-xs bg-white border-2 border-black rounded-[22px] shadow-neo-xl p-5 z-10 animate-in zoom-in-95 duration-150 text-center">
            <div 
              className="w-12 h-12 rounded-2xl border-2 border-black flex items-center justify-center text-2xl mx-auto mb-3 shadow-neo-xs"
              style={{ backgroundColor: catToDelete.bgColor || '#EDE9FE' }}
            >
              {catToDelete.emoji}
            </div>
            <h3 className="font-['Outfit'] font-black text-base text-black">
              {isEn ? 'Delete Category?' : 'Excluir Categoria?'}
            </h3>
            <p className="text-xs text-neutral-600 font-medium mt-1 mb-4">
              {isEn ? (
                <>Do you want to delete category <strong>"{catToDelete.name}"</strong>?</>
              ) : (
                <>Deseja excluir a categoria <strong>"{catToDelete.name}"</strong>?</>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-black border-2 border-black rounded-xl font-['Outfit'] font-bold text-xs btn-press"
              >
                {isEn ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press"
              >
                {isEn ? 'Delete' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Factory Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setShowResetConfirm(false)} />
          <div className="relative w-full max-w-sm bg-white border-2 border-black rounded-[24px] shadow-neo-xl p-5 z-10 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FFE4E6] border-2 border-black flex items-center justify-center text-2xl mx-auto mb-3 shadow-neo-xs">
              ⚠️
            </div>
            <h3 className="font-['Outfit'] font-black text-lg text-black">
              {isEn ? 'Reset Factory Defaults?' : 'Redefinir Padrões de Fábrica?'}
            </h3>
            
            <div className="text-left bg-neutral-50 border border-black/10 rounded-xl p-3 my-3 space-y-2 text-xs">
              <p className="font-black text-neutral-800 text-[11px]">
                {isEn ? 'What will happen:' : 'Resumo do que vai acontecer:'}
              </p>
              <ul className="space-y-1.5 text-[11px] text-neutral-600 font-medium">
                <li className="flex items-start gap-1.5">
                  <span className="text-rose-600 font-bold">✕</span>
                  <span>
                    <strong>{isEn ? 'App Data:' : 'Dados do App:'}</strong>{' '}
                    {isEn
                      ? 'Clears manual transactions, notes, and local vaults.'
                      : 'Limpa transações manuais, anotações e cofres internos.'}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-rose-600 font-bold">✕</span>
                  <span>
                    <strong>{isEn ? 'Settings:' : 'Configurações:'}</strong>{' '}
                    {isEn
                      ? 'Restores categories and limits to default values.'
                      : 'Restaura categorias e limites aos padrões.'}
                  </span>
                </li>
                <li className="flex items-start gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg p-1.5">
                  <span className="text-emerald-700 font-bold text-xs">🛡️</span>
                  <span className="text-emerald-950">
                    <strong>{isEn ? 'Real On-Chain Balance:' : 'Saldo Real na Blockchain:'}</strong>{' '}
                    {isEn
                      ? 'Your USDC and ETH balance on Base network remains 100% intact. The app never changes funds on blockchain.'
                      : 'Seu saldo em USDC e ETH na rede Base permanece 100% intacto. O app nunca zera nem altera fundos na blockchain.'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-black border-2 border-black rounded-xl font-['Outfit'] font-bold text-xs btn-press"
              >
                {isEn ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={handleConfirmFactoryReset}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press"
              >
                {isEn ? 'Confirm Reset' : 'Confirmar Redefinição'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for LGPD Cloud Account Deletion */}
      {showCloudDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => !isDeletingCloud && setShowCloudDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm bg-white border-3 border-black rounded-[28px] shadow-neo-xl p-5 z-10 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-black flex items-center justify-center text-2xl mx-auto mb-2.5 shadow-neo-xs text-rose-600">
              🗑️
            </div>
            <h3 className="font-['Outfit'] font-black text-lg text-black">
              {isEn ? 'Delete Account & Data' : 'Excluir Conta & Dados'}
            </h3>
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider mt-0.5">
              {isEn ? 'Permanent & Irreversible Action' : 'Ação Definitiva & Irreversível'}
            </p>
            
            {/* Direct Summary: Irreversibility & Private Key Custody */}
            <div className="text-left bg-rose-50 border-2 border-black/20 rounded-2xl p-3 my-3 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-rose-600 font-black text-sm leading-none shrink-0 mt-0.5">✕</span>
                <p className="text-[11px] text-rose-950 leading-relaxed font-medium">
                  <strong>{isEn ? 'Irreversible Action:' : 'Ação Irreversível:'}</strong>{' '}
                  {isEn
                    ? `All your transactions, incomes, categories, and cloud data (${user.email || 'your account'}) will be deleted permanently. Nothing can be recovered.`
                    : `Todas as suas transações, receitas, categorias e dados na nuvem (${user.email || 'sua conta'}) serão apagados definitivamente. Não é possível recuperar nada após confirmar.`}
                </p>
              </div>

              <div className="flex items-start gap-2 pt-1.5 border-t border-rose-200">
                <span className="text-amber-700 font-black text-sm leading-none shrink-0 mt-0.5">🔑</span>
                <p className="text-[11px] text-amber-950 leading-relaxed font-medium">
                  <strong>{isEn ? 'Private Key & Self-Custody:' : 'Chave Privada & Sua Responsabilidade:'}</strong>{' '}
                  {isEn
                    ? 'CofreAdmin has no custody or access to your on-chain blockchain funds. Backing up your private key is solely your responsibility. Without your backup, access to funds is lost forever.'
                    : 'O CofreAdmin não tem custódia nem acesso aos seus fundos na blockchain. O backup da sua chave privada é sua responsabilidade exclusiva. Sem o seu backup pessoal, o acesso aos valores é perdido para sempre.'}
                </p>
              </div>
            </div>

            {/* Auditable Deletion Consent Box */}
            <div 
              className={`p-3 rounded-2xl border-2 transition-all text-left mb-4 ${
                deleteConsentError
                  ? 'bg-rose-50 border-rose-600 ring-2 ring-rose-300'
                  : isDeleteConsentChecked
                    ? 'bg-amber-50 border-black shadow-neo-xs'
                    : 'bg-neutral-50 border-black/20'
              }`}
            >
              <label 
                htmlFor="checkbox-confirm-deletion-consent"
                className="flex items-start gap-2.5 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  id="checkbox-confirm-deletion-consent"
                  checked={isDeleteConsentChecked}
                  onChange={(e) => {
                    triggerHaptic('light');
                    setIsDeleteConsentChecked(e.target.checked);
                    if (e.target.checked) setDeleteConsentError(false);
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-2 border-black text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600 shrink-0"
                />
                <div className="text-[11px] leading-tight text-neutral-800 font-medium">
                  <span className="font-black text-black">
                    {isEn ? 'Express Consent:' : 'Consentimento Expresso:'}
                  </span>{' '}
                  {isEn ? (
                    <>
                      I declare that I have read and agree with the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          setIsLegalModalOpen(true);
                        }}
                        className="font-black text-black underline hover:text-purple-700 inline cursor-pointer"
                        id="btn-delete-modal-view-terms"
                      >
                        Privacy Policy
                      </button>
                      , I confirm that deletion is <strong>permanent and irreversible</strong>, and I assume <strong>sole responsibility</strong> for the custody and backup of my private key.
                    </>
                  ) : (
                    <>
                      Declaro que li e concordo com a{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          setIsLegalModalOpen(true);
                        }}
                        className="font-black text-black underline hover:text-purple-700 inline cursor-pointer"
                        id="btn-delete-modal-view-terms"
                      >
                        Política de Privacidade
                      </button>
                      , confirmo que a exclusão é <strong>definitiva e irreversível</strong> e que assumo a <strong>exclusiva responsabilidade</strong> pela posse e backup da minha chave privada.
                    </>
                  )}
                </div>
              </label>
              {deleteConsentError && (
                <p className="mt-1.5 text-[10px] font-bold text-rose-700 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>
                    {isEn
                      ? 'You must check this express confirmation to proceed.'
                      : 'Você deve marcar esta confirmação expressa para prosseguir.'}
                  </span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isDeletingCloud}
                onClick={() => setShowCloudDeleteConfirm(false)}
                className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-black border-2 border-black rounded-xl font-['Outfit'] font-bold text-xs btn-press disabled:opacity-50 cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                type="button"
                id="btn-confirm-cloud-delete-modal"
                disabled={isDeletingCloud || !isDeleteConsentChecked}
                onClick={handleConfirmCloudDelete}
                className={`py-2.5 px-3 border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press flex items-center justify-center gap-1.5 transition-all ${
                  !isDeleteConsentChecked || isDeletingCloud
                    ? 'bg-rose-300 text-white cursor-not-allowed opacity-60'
                    : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                }`}
              >
                {isDeletingCloud ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isEn ? 'Deleting...' : 'Excluindo...'}</span>
                  </>
                ) : (
                  <span>{isEn ? 'Yes, Delete Everything' : 'Sim, Excluir Tudo'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Private Key Backup Modal */}
      <WalletBackupModal
        isOpen={isWalletBackupOpen}
        onClose={() => setIsWalletBackupOpen(false)}
        publicAddress={user.walletAddress || ''}
        privateKey={userPrivateKey}
        mnemonic={userMnemonic}
        userEmail={user.email}
        userUid={user.authId || user.id}
        onAcknowledgeBackup={(fingerprint) => {
          onUpdateUser({
            ...user,
            lastBackupAcknowledgedAt: new Date().toISOString(),
            backupAuditFingerprint: fingerprint,
          });
        }}
      />

      {/* 4-Digit Security PIN Setup Modal (Trust Wallet Style) */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-xs bg-white border-3 border-black rounded-[24px] shadow-neo-xl p-5 z-10 flex flex-col items-center text-center">
            {/* Header */}
            <div className="w-full flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] border-2 border-black flex items-center justify-center shadow-neo-xs">
                  <Key className="w-4 h-4 text-purple-700" />
                </div>
                <h4 className="font-['Outfit'] font-black text-sm text-black">
                  {isEn ? 'Security PIN' : 'PIN de Segurança'}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsPinModalOpen(false);
                }}
                className="w-7 h-7 rounded-lg border border-black/20 hover:border-black bg-white hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
                title={isEn ? 'Cancel' : 'Cancelar'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction */}
            <p className="text-xs text-neutral-600 font-bold mb-4">
              {pinModalStep === 'enter'
                ? isEn
                  ? 'Choose a 4-digit PIN to lock your app'
                  : 'Crie seu PIN de 4 dígitos'
                : isEn
                ? 'Confirm your 4-digit PIN'
                : 'Confirme seu PIN de 4 dígitos'}
            </p>

            {/* 4 Visual Indicator Dots */}
            <div className="flex items-center justify-center gap-4 mb-4" id="modal-pin-dots">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pinModalInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 border-black transition-all duration-150 ${
                      isFilled
                        ? 'bg-[#0052FF] scale-125 shadow-neo-xs'
                        : 'bg-white scale-100'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error message */}
            {pinModalError && (
              <div className="w-full mb-3 p-2 bg-rose-50 border-2 border-black rounded-xl text-xs font-bold text-rose-950 flex items-center gap-1.5 shadow-neo-xs animate-in fade-in text-left">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                <span className="text-[11px] leading-tight">{pinModalError}</span>
              </div>
            )}

            {/* Tactile Keypad */}
            <div className="w-full grid grid-cols-3 gap-2 max-w-[240px] mx-auto mb-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinModalDigit(digit)}
                  className="h-12 rounded-xl bg-white hover:bg-neutral-100 active:bg-neutral-200 border-2 border-black font-['Outfit'] font-black text-xl text-black shadow-neo-xs btn-press flex items-center justify-center cursor-pointer transition-transform"
                >
                  {digit}
                </button>
              ))}

              <div className="h-12" />

              <button
                type="button"
                onClick={() => handlePinModalDigit('0')}
                className="h-12 rounded-xl bg-white hover:bg-neutral-100 active:bg-neutral-200 border-2 border-black font-['Outfit'] font-black text-xl text-black shadow-neo-xs btn-press flex items-center justify-center cursor-pointer transition-transform"
              >
                0
              </button>

              <button
                type="button"
                onClick={handlePinModalBackspace}
                className="h-12 rounded-xl bg-white hover:bg-neutral-100 active:bg-neutral-200 border-2 border-black font-['Outfit'] font-black text-black shadow-neo-xs btn-press flex items-center justify-center cursor-pointer transition-transform"
                title={isEn ? 'Backspace' : 'Apagar'}
              >
                <X className="w-5 h-5 text-neutral-800" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Use & Privacy Policy Modal */}
      <LegalTermsModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </div>
  );
});
