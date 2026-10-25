import React, { useState } from 'react';
import { UserProfile } from '../types';
import { CofreLogo } from './CofreLogo';
import { triggerHaptic } from '../utils/haptics';
import { Sparkles, ShieldCheck, AlertCircle, Check, FileText, X, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LegalTermsModal } from './LegalTermsModal';
import { Web3Service } from '../services/web3Service';
import { WebAuthnService } from '../services/webAuthnService';
import { db, authService } from '../services';
import { isCustomUserAvatar } from '../utils/storage';
import { DEFAULT_USER, DEFAULT_CATEGORIES } from '../utils/initialData';
import { APP_VERSION_LABEL } from '../config/version';
import { AnalyticsService } from '../services/analyticsService';
import { useI18n } from '../services/i18nService';

interface LoginScreenProps {
  onLoginSuccess: (
    userProfileUpdates: Partial<UserProfile>,
    categories?: any[],
    vaults?: any[],
    transactions?: any[]
  ) => void;
}

interface PendingNewUser {
  fbUser: any;
  userEmail: string;
  displayName: string;
  photoURL: string;
  existingAvatar?: string;
  existingDailyLimit?: number;
  isGoogleAuth?: boolean;
  provider?: string;
}

interface AuthErrorDetail {
  title: string;
  badge: string;
  description: string;
  tip: string;
  provider: 'google' | 'discord' | 'general';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
}) => {
  const { language, changeLanguage } = useI18n();
  const isEn = language === 'en-US';
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'discord' | 'register' | null>(null);
  const isLoading = Boolean(loadingProvider);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authErrorDetail, setAuthErrorDetail] = useState<AuthErrorDetail | null>(null);
  const [authStepText, setAuthStepText] = useState<string>(isEn ? 'Checking account...' : 'Verificando cadastro...');
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [pendingNewUser, setPendingNewUser] = useState<PendingNewUser | null>(null);
  const [discordConfigInfo, setDiscordConfigInfo] = useState<{ redirectUri: string } | null>(null);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const discordAuthHandledRef = React.useRef(false);
  const expectedDiscordStateRef = React.useRef<string | null>(null);
  const popupCheckIntervalRef = React.useRef<any>(null);
  const popupGraceTimeoutRef = React.useRef<any>(null);

  const verifyClientDiscordState = React.useCallback((incomingState: unknown): boolean => {
    const expected =
      expectedDiscordStateRef.current ||
      (() => {
        try {
          return sessionStorage.getItem('cofre_discord_oauth_state');
        } catch {
          return null;
        }
      })();
    if (!expected || typeof incomingState !== 'string' || !incomingState) {
      return false;
    }
    return incomingState === expected;
  }, []);

  const clearClientDiscordState = React.useCallback(() => {
    expectedDiscordStateRef.current = null;
    try {
      sessionStorage.removeItem('cofre_discord_oauth_state');
    } catch {}
  }, []);

  // Unified authentication resolution (shared between Google and Discord)
  const processAuthenticatedUser = async ({
    uid,
    email,
    displayName,
    photoURL,
    isGoogleAuth,
    providerName,
  }: {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    isGoogleAuth: boolean;
    providerName: string;
  }) => {
    try {
      const realUserEmail = email.trim();

      // The authDocKey is the strictly isolated unique key (prevents database, avatar, and wallet collisions between Google and Discord)
      const authDocKey = isGoogleAuth
        ? `google_${realUserEmail.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_')}`
        : uid; // For Discord, uid is 'discord_<discord_id>'

      // Immediately activate the isolated profile key in db so all reads target this account
      db.setActiveProfileKey(authDocKey);

      // If logging in with Discord, ensure any lingering Google Firebase Auth session is cleanly signed out
      if (!isGoogleAuth && authService.getCurrentUser()) {
        authService.signOut().catch(() => {});
      }

      setAuthStepText(isEn ? 'Checking profile and account...' : 'Verificando cadastro e dados do perfil...');

      // 1. Asynchronous Firestore verification (for Google Firebase Auth accounts)
      let cloudData: any = null;
      if (isGoogleAuth) {
        try {
          await authService.verifyActiveSessionToken(false).catch(() => {});
          const cloudPromise = db.loadFromCloud(authDocKey, realUserEmail, uid);
          const timeoutCloud = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
          cloudData = await Promise.race([cloudPromise, timeoutCloud]);

          // Secondary confirmation if initial read returned empty right after OAuth popup handshake
          if (!cloudData) {
            await new Promise((resolve) => setTimeout(resolve, 350));
            await authService.verifyActiveSessionToken(true).catch(() => {});
            cloudData = await Promise.race([
              db.loadFromCloud(authDocKey, realUserEmail, uid),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
            ]);
          }
        } catch (cloudErr) {
          console.warn('Aviso de verificação do Firestore no login:', cloudErr);
        }
      }

      const cloudUser = (cloudData && typeof cloudData === 'object' && cloudData.user) ? cloudData.user : cloudData;
      const hasCompleteFirestoreRecord = Boolean(
        cloudData &&
        (
          Boolean(cloudUser && (
            cloudUser.walletAddress ||
            cloudUser.termsAccepted ||
            cloudUser.hasCompletedOnboarding ||
            (cloudUser.email && cloudUser.email.toLowerCase() === realUserEmail.toLowerCase()) ||
            cloudUser.authId
          )) ||
          Boolean(cloudData.walletAddress || cloudData.termsAccepted) ||
          (Array.isArray(cloudData.categories) && cloudData.categories.length > 0) ||
          (Array.isArray(cloudData.transactions) && cloudData.transactions.length > 0) ||
          (Array.isArray(cloudData.vaults) && cloudData.vaults.length > 0) ||
          (cloudData.email && cloudData.email.toLowerCase() === realUserEmail.toLowerCase()) ||
          cloudData.authId
        )
      );

      // Strict scope to isolate Google and Discord while maintaining full backward compatibility with legacy keys
      const sanitizedEmail = realUserEmail.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
      const candidateProfileKeys = isGoogleAuth
        ? [
            authDocKey,
            `google_${sanitizedEmail}`,
            `google_${realUserEmail.toLowerCase()}`,
            sanitizedEmail,
            realUserEmail.toLowerCase(),
            uid,
          ]
        : [
            authDocKey,
            `discord_${uid.replace('discord_', '')}`,
            `discord_${sanitizedEmail}`,
            sanitizedEmail,
            uid,
          ];

      let localExistingUser: UserProfile | null = null;
      for (const candKey of candidateProfileKeys) {
        const u = db.getUser(candKey);
        if (
          u &&
          (u.walletAddress || u.termsAccepted || u.hasCompletedOnboarding || (u.email && u.email.toLowerCase() === realUserEmail.toLowerCase()))
        ) {
          localExistingUser = u;
          break;
        }
      }

      // Check if user already has an existing Web3 wallet stored locally on this device
      let hasLocalWalletStored = false;
      const identityCandidates = Web3Service.getIdentityCandidates(realUserEmail, authDocKey, isGoogleAuth ? 'google' : 'discord');
      for (const idKey of identityCandidates) {
        if (
          localStorage.getItem(`cofreadmin_addr_${idKey}`) ||
          localStorage.getItem(`cofreadmin_pk_${idKey}`)
        ) {
          hasLocalWalletStored = true;
          break;
        }
      }

      // Also check if unscoped cofreadmin_user in localStorage belongs to this user (strictly for corresponding provider)
      if (!localExistingUser && isGoogleAuth) {
        try {
          const rawUnscoped = localStorage.getItem('cofreadmin_user');
          if (rawUnscoped) {
            const parsed = JSON.parse(rawUnscoped);
            if (
              parsed &&
              (parsed.email?.toLowerCase() === realUserEmail.toLowerCase() ||
               parsed.walletAddress ||
               parsed.termsAccepted)
            ) {
              localExistingUser = { ...DEFAULT_USER, ...parsed };
            }
          }
        } catch {}
      }

      const hasCompleteLocalRecord = Boolean(
        localExistingUser &&
        (
          hasLocalWalletStored ||
          localExistingUser.walletAddress ||
          localExistingUser.termsAccepted ||
          localExistingUser.hasCompletedOnboarding ||
          (localExistingUser.email && localExistingUser.email.toLowerCase() === realUserEmail.toLowerCase() && localExistingUser.isLoggedIn)
        )
      );

      const hasCompleteRecord = Boolean(hasCompleteFirestoreRecord || hasCompleteLocalRecord);

      if (hasCompleteRecord) {
        // --- EXISTING REGISTERED USER ---
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 },
        });

        let effectiveUser = ((cloudData && typeof cloudData === 'object' && cloudData.user) ? cloudData.user : cloudData) || localExistingUser;
        // Retrieve local avatar strictly for this authDocKey
        const localCustomAvatar = db.getCustomAvatar(authDocKey);
        const localBackup = db.getPersistedAvatar(authDocKey);
        const cloudCustom = (cloudData as any)?.customAvatarUrl ||
          (isCustomUserAvatar(effectiveUser?.avatarUrl) ? effectiveUser?.avatarUrl : null);

        let resolvedAvatar = photoURL;
        if (cloudCustom && isCustomUserAvatar(cloudCustom)) {
          resolvedAvatar = cloudCustom;
          void db.setCustomAvatar(cloudCustom, authDocKey);
        } else if (effectiveUser?.avatarUrl && isCustomUserAvatar(effectiveUser.avatarUrl)) {
          resolvedAvatar = effectiveUser.avatarUrl;
          void db.setCustomAvatar(effectiveUser.avatarUrl, authDocKey);
        } else if (localCustomAvatar && isCustomUserAvatar(localCustomAvatar)) {
          resolvedAvatar = localCustomAvatar;
        } else if (localBackup && isCustomUserAvatar(localBackup)) {
          resolvedAvatar = localBackup;
        } else if (photoURL && photoURL.startsWith('http')) {
          resolvedAvatar = photoURL;
        }

        let walletAddress = effectiveUser?.walletAddress || '';
        let walletPrivateKey = effectiveUser?.walletPrivateKey || '';
        let walletMnemonic: string | undefined = undefined;

        try {
          const walletRes = await Web3Service.connectGoogleWallet(
            realUserEmail,
            'base',
            authDocKey,
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
        } catch (walletErr) {
          console.warn('Erro ao conectar carteira Web3 segura:', walletErr);
        }

        const currentUser = db.getUser(authDocKey);
        const isDeviceSecActive = Boolean(
          effectiveUser?.deviceSecurityEnabled ||
          effectiveUser?.appLockEnabled ||
          currentUser.deviceSecurityEnabled ||
          currentUser.appLockEnabled ||
          WebAuthnService.isDeviceSecurityEnabled()
        );

        if (isDeviceSecActive) {
          WebAuthnService.setDeviceSecurityEnabled(true);
        }

        const loginPayload: Partial<UserProfile> = {
          isLoggedIn: true,
          isGoogleAuth,
          provider: (providerName as any) || (isGoogleAuth ? 'google' : 'discord'),
          authId: authDocKey,
          discordId: !isGoogleAuth ? uid.replace('discord_', '') : undefined,
          email: realUserEmail,
          name: effectiveUser?.name || displayName,
          username: effectiveUser?.username || displayName || (realUserEmail.includes('@') ? realUserEmail.split('@')[0] : realUserEmail),
          avatarUrl: resolvedAvatar,
          walletAddress: walletAddress,
          walletPrivateKey: walletPrivateKey,
          walletMnemonic: walletMnemonic,
          web3Network: effectiveUser?.web3Network || ('base' as const),
          web3Enabled: true,
          hasCompletedOnboarding: true,
          termsAccepted: true,
          termsAcceptedAt: effectiveUser?.termsAcceptedAt || new Date().toISOString(),
          deviceSecurityEnabled: isDeviceSecActive,
          appLockEnabled: isDeviceSecActive,
          requireAuthForPayments: isDeviceSecActive,
          passkeyEnabled: isDeviceSecActive,
          ...(typeof effectiveUser?.dailySpendLimit === 'number' ? { dailySpendLimit: effectiveUser.dailySpendLimit } : {}),
        };

        const resolvedCategories = cloudData?.categories || db.getCategories(authDocKey);
        const resolvedVaults = cloudData?.vaults || db.getVaults(authDocKey);
        const resolvedTransactions = cloudData?.transactions || db.getTransactions(authDocKey);

        try {
          db.setActiveProfileKey(authDocKey);
          await db.saveUser({ ...currentUser, ...loginPayload }, authDocKey);
          await db.setPersistedAvatar(resolvedAvatar, authDocKey);
          if (resolvedCategories) await db.saveCategories(resolvedCategories, authDocKey);
          if (resolvedVaults) await db.saveVaults(resolvedVaults, authDocKey);
          if (resolvedTransactions) await db.saveTransactions(resolvedTransactions, authDocKey);
        } catch (e) {
          console.warn('Storage save on login warning:', e);
        }

        AnalyticsService.trackLogin(providerName as any);
        onLoginSuccess(
          loginPayload,
          resolvedCategories || [],
          resolvedVaults || [],
          resolvedTransactions || []
        );
        void db.saveToCloud(loginPayload as any, resolvedCategories || [], resolvedVaults || [], resolvedTransactions || []);
        return;
      }

      // Guard: if parallel session listener already restored this account, complete login directly
      const postCheckUser = db.getUser(authDocKey);
      if (
        postCheckUser &&
        postCheckUser.isLoggedIn &&
        (postCheckUser.termsAccepted || postCheckUser.hasCompletedOnboarding || postCheckUser.walletAddress)
      ) {
        onLoginSuccess(
          postCheckUser,
          db.getCategories(authDocKey),
          db.getVaults(authDocKey),
          db.getTransactions(authDocKey)
        );
        return;
      }

      // --- NEW USER (NO RECORD IN FIRESTORE) ---
      let existingAvatar: string | undefined;
      let existingDailyLimit: number | undefined;

      try {
        const localBackup = db.getPersistedAvatar(authDocKey);
        if (localBackup && !localBackup.includes('seed=BaseCofre')) {
          existingAvatar = localBackup;
        }
      } catch {}

      // Clear any previous error alerts before displaying the terms acceptance screen
      setErrorMessage(null);
      setAuthErrorDetail(null);

      setPendingNewUser({
        fbUser: { uid, email: realUserEmail, displayName, photoURL },
        userEmail: realUserEmail,
        displayName,
        photoURL,
        existingAvatar,
        existingDailyLimit,
        isGoogleAuth,
        provider: providerName,
      });
      setIsTermsAccepted(false);
    } catch (err: any) {
      console.warn('Erro no processamento da autenticação:', err);
      setErrorMessage(err.message || (isEn ? 'Failed to authenticate.' : 'Falha ao autenticar.'));
    } finally {
      setLoadingProvider(null);
    }
  };

  // Securely process authenticated Discord account data
  const handleAuthSuccessPayload = React.useCallback((discordUser: any) => {
    if (!discordUser) return;
    discordAuthHandledRef.current = true;

    // Cancel any popup closing timers/intervals immediately
    if (popupCheckIntervalRef.current) {
      clearInterval(popupCheckIntervalRef.current);
      popupCheckIntervalRef.current = null;
    }
    if (popupGraceTimeoutRef.current) {
      clearTimeout(popupGraceTimeoutRef.current);
      popupGraceTimeoutRef.current = null;
    }

    setErrorMessage(null);
    setAuthErrorDetail(null);
    setLoadingProvider('discord');
    setDiscordConfigInfo(null);
    setAuthStepText(isEn ? 'Discord authorized! Loading data...' : 'Discord autorizado! Carregando dados...');

    processAuthenticatedUser({
      uid: `discord_${discordUser.id}`,
      email: discordUser.email || `${discordUser.username}@discord.user`,
      displayName: discordUser.name || discordUser.username,
      photoURL: discordUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(discordUser.username)}`,
      isGoogleAuth: false,
      providerName: 'discord',
    });
  }, []);

  // Storage helper function to bypass iframe/sandboxing restrictions (with strict CSRF state validation)
  const consumeDiscordAuthSuccess = React.useCallback((): boolean => {
    try {
      const raw = authService.consumeOAuthHandshakeSync();
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed?.data?.type === 'OAUTH_AUTH_SUCCESS' && parsed?.data?.user) {
        const age = Date.now() - (parsed.timestamp || 0);
        if (age < 120000 && verifyClientDiscordState(parsed.data.state)) {
          authService.clearOAuthHandshakeSync();
          clearClientDiscordState();
          handleAuthSuccessPayload(parsed.data.user);
          return true;
        }
      }
    } catch (e) {
      console.warn('Aviso no consumo do storage de auth:', e);
    }
    return false;
  }, [handleAuthSuccessPayload, verifyClientDiscordState, clearClientDiscordState]);

  // Discord OAuth popup listener (postMessage, BroadcastChannel, and localStorage)
  React.useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Strict origin validation: only the application's own origin is accepted
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'discord') {
        if (!verifyClientDiscordState(event.data?.state)) {
          console.warn('[Discord OAuth] 🚨 Rejeitado: state CSRF ausente ou divergente no postMessage.');
          return;
        }
        clearClientDiscordState();
        handleAuthSuccessPayload(event.data.user);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR' && event.data?.provider === 'discord') {
        if (event.data?.state && !verifyClientDiscordState(event.data.state)) {
          return;
        }
        clearClientDiscordState();
        discordAuthHandledRef.current = true;
        if (popupCheckIntervalRef.current) {
          clearInterval(popupCheckIntervalRef.current);
          popupCheckIntervalRef.current = null;
        }
        if (popupGraceTimeoutRef.current) {
          clearTimeout(popupGraceTimeoutRef.current);
          popupGraceTimeoutRef.current = null;
        }
        setLoadingProvider(null);
        const rawErr = String(event.data.error || '');
        
        // Handled Web3/modern friendly error message
        setAuthErrorDetail({
          provider: 'discord',
          badge: isEn ? 'DISCORD ACCESS DENIED' : 'ACESSO NEGADO / DISCORD',
          title: isEn ? 'Discord sign-in was cancelled! 💀' : 'Mano, cadê sua conta do Discord logada? 💀',
          description: rawErr.includes('access_denied')
            ? (isEn
                ? 'You cancelled the Discord login or denied access to your account.'
                : 'Você cancelou o login no Discord ou não autorizou o acesso da sua conta. Nem deu bola, aí não rola!')
            : (isEn
                ? 'Your Discord session was not found or authorization was interrupted.'
                : 'Parece que seu Discord não estava logado no navegador ou a autorização foi cancelada no meio do caminho. Zero hype!'),
          tip: isEn
            ? 'Quick tip: Log into discord.com in a new browser tab, then return here and click Sign in with Discord!'
            : 'Dica de Cria: Abra o discord.com no seu navegador, faça login na sua conta Discord e clique de novo em "Entrar com Discord". É GG!',
        });
        setErrorMessage(rawErr || (isEn ? 'No active Discord account detected.' : 'Não identificamos nenhuma conta Discord ativa.'));
      }
    };

    // 1. BroadcastChannel listener for modern browsers (same-origin by specification + state check)
    let bc: BroadcastChannel | null = null;
    try {
      if (window.BroadcastChannel) {
        bc = new BroadcastChannel('cofre_discord_oauth');
        bc.onmessage = (event) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'discord') {
            if (!verifyClientDiscordState(event.data?.state)) {
              return;
            }
            clearClientDiscordState();
            handleAuthSuccessPayload(event.data.user);
          }
        };
      }
    } catch {}

    // 2. Storage Event listener for mobile browsers with isolated tabs
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'cofre_discord_auth_success' && e.newValue) {
        consumeDiscordAuthSuccess();
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('message', handleOAuthMessage);
      window.removeEventListener('storage', handleStorageEvent);
      if (popupCheckIntervalRef.current) {
        clearInterval(popupCheckIntervalRef.current);
      }
      if (popupGraceTimeoutRef.current) {
        clearTimeout(popupGraceTimeoutRef.current);
      }
      if (bc) {
        bc.close();
      }
    };
  }, [handleAuthSuccessPayload, consumeDiscordAuthSuccess, verifyClientDiscordState, clearClientDiscordState]);

  const handleGoogleLogin = async () => {
    triggerHaptic('medium');
    setLoadingProvider('google');
    setErrorMessage(null);
    setAuthErrorDetail(null);
    setDiscordConfigInfo(null);
    setAuthStepText(isEn ? 'Starting Google sign-in...' : 'Iniciando autenticação Google...');

    try {
      setAuthStepText(isEn ? 'Opening Google account selector...' : 'Abrindo seleção de contas Google...');
      const result = await authService.signIn();
      const fbUser = result.user;

      if (!fbUser || !fbUser.email) {
        throw new Error(isEn ? 'No Google account identified. Please sign in to Google first!' : 'Nenhuma conta Google foi identificada. Faça login no Google primeiro!');
      }

      const userEmail = fbUser.email || 'usuario@gmail.com';
      const displayName = fbUser.displayName || userEmail.split('@')[0];
      const photoURL = fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}&backgroundColor=b6e3f4,c0aede,ffd5dc`;

      await processAuthenticatedUser({
        uid: fbUser.uid,
        email: userEmail,
        displayName,
        photoURL,
        isGoogleAuth: true,
        providerName: 'google',
      });
    } catch (err: any) {
      console.warn('Google Auth result notice:', err);
      const isOfflineOrNetwork =
        err.code === 'auth/network-request-failed' ||
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('failed to fetch');

      if (
        err.code === 'auth/popup-closed-by-user' || 
        err.code === 'auth/cancelled-popup-request' ||
        err.message?.includes('Pending promise was never set')
      ) {
        setAuthErrorDetail({
          provider: 'google',
          badge: isEn ? 'SIGN-IN CANCELLED' : 'SEM CONTA GOOGLE / FECHOU A TELA',
          title: isEn ? 'Google sign-in window was closed 👻' : 'Qual foi, mano? Não achamos sua conta Google! 👻',
          description: isEn
            ? 'The Google login window was closed before completing authorization or no account was selected.'
            : 'A janela de login do Google foi fechada ou não tinha nenhuma conta Google conectada para autorizar o cofre.',
          tip: isEn
            ? 'Make sure you are signed into your Google account (gmail.com) in your browser and try again!'
            : 'Bro, entra na sua conta do Google (gmail.com ou google.com) no navegador antes de tentar de novo. Vai dar bom!'
        });
        setErrorMessage(isEn ? 'No Google account selected or the window was closed before authorizing.' : 'Nenhuma conta Google selecionada ou a janela foi fechada antes de autorizar.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthErrorDetail({
          provider: 'google',
          badge: isEn ? 'POP-UP BLOCKED' : 'POP-UP BLOQUEADO',
          title: isEn ? 'Your browser blocked the Google window! 🛑' : 'Seu navegador barrou a janela do Google! 🛑',
          description: isEn
            ? 'The sign-in pop-up was blocked by your browser security settings.'
            : 'O pop-up de login foi travado pelas configurações de segurança do navegador.',
          tip: isEn
            ? 'Enable pop-ups for this site in your address bar (lock/pop-up icon) and click Sign In again!'
            : 'Desbloqueia os pop-ups pro nosso site ali na barra de endereço (ícone de cadeado/pop-up) e clica de novo!'
        });
        setErrorMessage(isEn ? 'Pop-up window was blocked by your browser. Please allow pop-ups to sign in.' : 'A janela pop-up foi bloqueada pelo seu navegador. Permita pop-ups para fazer login.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthErrorDetail({
          provider: 'google',
          badge: isEn ? 'DOMAIN NOT AUTHORIZED' : 'DOMÍNIO FORA DA LISTA',
          title: isEn ? 'Domain not authorized in Firebase 🚫' : 'Domínio ainda não cadastrado no Firebase 🚫',
          description: isEn
            ? 'This domain URL needs to be authorized in Firebase Google OAuth settings.'
            : 'Este link precisa estar liberado nas configurações do Google OAuth do Firebase.',
          tip: isEn
            ? 'Contact support or try testing in offline guest mode.'
            : 'Entre em contato com o suporte ou use outra forma de login.'
        });
        setErrorMessage(isEn ? 'Application domain is not authorized in Firebase console for Google Auth.' : 'Domínio da aplicação não autorizado no console do Firebase para Google Auth.');
      } else if (err.code === 'auth/timeout') {
        setAuthErrorDetail({
          provider: 'google',
          badge: isEn ? 'TIMEOUT ERROR' : 'TIMEOUT / CONEXÃO LENTA',
          title: isEn ? 'Google took too long to respond! ⏳' : 'Google demorou um século pra responder! ⏳',
          description: isEn
            ? 'Your connection or Google servers experienced a delay.'
            : 'Sua conexão ou o servidor do Google deram aquela engasgada básica.',
          tip: isEn
            ? 'Check your Wi-Fi or mobile data and try again in a moment.'
            : 'Confere seu Wi-Fi/4G e clica de novo rapidinho.'
        });
        setErrorMessage(err.message || (isEn ? 'Timed out waiting for Google. Check your connection and try again.' : 'Tempo limite esgotado ao aguardar o Google. Verifique sua conexão e tente novamente.'));
      } else if (isOfflineOrNetwork) {
        setAuthErrorDetail({
          provider: 'google',
          badge: isEn ? 'NETWORK / OFFLINE ERROR' : 'SEM CONEXÃO / OFFLINE',
          title: isEn ? 'No internet connection! Check network 📡' : 'Sem internet! Verifique sua conexão 📡',
          description: isEn
            ? 'Could not connect to Google servers. Please check your internet connection.'
            : 'Não foi possível conectar aos servidores do Google. Verifique sua internet.',
          tip: isEn
            ? 'Check your Wi-Fi or mobile data signal and try signing in again.'
            : 'Verifique seu Wi-Fi ou dados móveis e tente entrar novamente.'
        });
        setErrorMessage(isEn ? 'Network error: Check your internet connection and try again.' : 'Erro de conexão: Verifique sua internet e tente novamente.');
      } else {
        setAuthErrorDetail({
          provider: 'google',
          badge: isEn ? 'ERROR RADAR' : 'ERRO NO RADAR',
          title: isEn ? 'Oops! Something went wrong with Google sign-in 😵‍💫' : 'Eita! Deu xabu ao entrar com o Google 😵‍💫',
          description: isEn
            ? (err.message || 'We could not complete your Google sign-in.')
            : (err.message || 'Não conseguimos identificar sua conta Google no navegador.'),
          tip: isEn
            ? 'Make sure you are online and signed into your Google account in this browser, then try again!'
            : 'Certifique-se de que você está logado na sua conta Google neste navegador e tente de novo!'
        });
        setErrorMessage(err.message || (isEn ? 'Failed to authenticate with Google. Please try again.' : 'Falha ao autenticar com o Google. Tente novamente.'));
      }
      setLoadingProvider(null);
    }
  };

  const handleDiscordLogin = async () => {
    triggerHaptic('medium');
    discordAuthHandledRef.current = false;

    // Sign out any lingering Google Firebase session to completely isolate Discord auth
    authService.signOut().catch(() => {});

    // Clean up any previous timers
    if (popupCheckIntervalRef.current) {
      clearInterval(popupCheckIntervalRef.current);
      popupCheckIntervalRef.current = null;
    }
    if (popupGraceTimeoutRef.current) {
      clearTimeout(popupGraceTimeoutRef.current);
      popupGraceTimeoutRef.current = null;
    }

    authService.clearOAuthHandshakeSync();

    setLoadingProvider('discord');
    setErrorMessage(null);
    setAuthErrorDetail(null);
    setDiscordConfigInfo(null);
    setAuthStepText(isEn ? 'Starting Discord connection...' : 'Iniciando conexão Discord...');

    try {
      const res = await fetch('/api/auth/discord/url');
      const data = await res.json();

      if (!data.configured) {
        setLoadingProvider(null);
        setDiscordConfigInfo({ redirectUri: data.redirectUri });
        setErrorMessage(isEn ? 'To enable Discord login, set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in app environment variables.' : 'Para ativar o login com Discord, defina DISCORD_CLIENT_ID e DISCORD_CLIENT_SECRET nas variáveis de ambiente do app.');
        return;
      }

      if (typeof data.state === 'string' && data.state) {
        expectedDiscordStateRef.current = data.state;
        try {
          sessionStorage.setItem('cofre_discord_oauth_state', data.state);
        } catch {}
      }

      setAuthStepText(isEn ? 'Waiting for Discord authorization...' : 'Aguardando autorização no Discord...');
      const popupWindow = window.open(
        data.url,
        'discord_oauth_popup',
        'width=580,height=720,menubar=no,toolbar=no'
      );

      if (!popupWindow) {
        setLoadingProvider(null);
        setAuthErrorDetail({
          provider: 'discord',
          badge: isEn ? 'POP-UP BLOCKED' : 'POP-UP TRAVADO',
          title: isEn ? 'Discord pop-up was blocked! 🛑' : 'Pop-up do Discord foi bloqueado! 🛑',
          description: isEn ? 'Your browser prevented the Discord authorization window from opening.' : 'O navegador impediu a tela de autorização do Discord de abrir.',
          tip: isEn ? 'Allow pop-ups for this site in your address bar and try again.' : 'Autorize pop-ups para este site na barra de endereços e tente novamente.'
        });
        setErrorMessage(isEn ? 'Pop-up window was blocked by your browser. Please allow pop-ups to authenticate with Discord.' : 'A janela pop-up foi bloqueada pelo navegador. Permita pop-ups para autenticar com o Discord.');
        return;
      }

      // Fast polling interval (every 250ms) checking popup status and storage payload
      popupCheckIntervalRef.current = setInterval(() => {
        try {
          // 1. If authentication succeeded, stop monitoring immediately
          if (discordAuthHandledRef.current) {
            if (popupCheckIntervalRef.current) {
              clearInterval(popupCheckIntervalRef.current);
              popupCheckIntervalRef.current = null;
            }
            return;
          }

          // 2. Attempt storage consumption (in case cross-origin postMessage was blocked)
          if (consumeDiscordAuthSuccess()) {
            if (popupCheckIntervalRef.current) {
              clearInterval(popupCheckIntervalRef.current);
              popupCheckIntervalRef.current = null;
            }
            return;
          }

          // 3. Check if window was closed by the user or callback
          let isClosed = false;
          try {
            isClosed = !popupWindow || popupWindow.closed;
          } catch {
            isClosed = false;
          }

          if (isClosed) {
            if (popupCheckIntervalRef.current) {
              clearInterval(popupCheckIntervalRef.current);
              popupCheckIntervalRef.current = null;
            }

            // Immediate storage check upon popup close detection
            if (consumeDiscordAuthSuccess()) {
              return;
            }

            // Grace period to allow storage/postMessage completion
            let retries = 0;
            const maxRetries = 7; // 7 attempts x 350ms = ~2.5s buffer
            const checkRetry = () => {
              if (discordAuthHandledRef.current) {
                return;
              }
              if (consumeDiscordAuthSuccess()) {
                return;
              }

              retries++;
              if (retries < maxRetries) {
                popupGraceTimeoutRef.current = setTimeout(checkRetry, 350);
              } else {
                // Only show popup closed alert if neither authentication nor terms registration was triggered
                if (!discordAuthHandledRef.current) {
                  setLoadingProvider((curr) => {
                    if (curr === 'discord' && !discordAuthHandledRef.current) {
                      setAuthErrorDetail({
                        provider: 'discord',
                        badge: isEn ? 'DISCORD SIGN-IN CANCELLED' : 'SEM CONTA DISCORD / JANELA FECHADA',
                        title: isEn ? 'Discord sign-in was cancelled! 💀' : 'Cadê seu Discord, mano? Ficou no vácuo! 💀',
                        description: isEn
                          ? 'The Discord window closed before you confirmed your account, or you are not logged in.'
                          : 'A janela do Discord fechou sem você confirmar a conta ou você ainda não está logado no Discord nesse navegador.',
                        tip: isEn
                          ? 'Quick tip: Log into discord.com in a new browser tab, then come back here and click Sign in with Discord!'
                          : 'Dica rápida: Abra uma aba, entra no discord.com pra deixar sua conta logada, depois volta aqui e clica em Entrar com Discord. Sucesso garantido!'
                      });
                      setErrorMessage(isEn ? 'No active Discord account detected or the window was closed.' : 'Não identificamos conta Discord logada ou a janela foi fechada.');
                      return null;
                    }
                    return curr;
                  });
                }
              }
            };

            popupGraceTimeoutRef.current = setTimeout(checkRetry, 350);
          }
        } catch {
          if (popupCheckIntervalRef.current) {
            clearInterval(popupCheckIntervalRef.current);
            popupCheckIntervalRef.current = null;
          }
        }
      }, 250);
    } catch (err: any) {
      setLoadingProvider(null);
      setAuthErrorDetail({
        provider: 'discord',
        badge: isEn ? 'CONNECTION ERROR' : 'ERRO NA CONEXÃO',
        title: isEn ? 'Discord service connection issue! 🌪️' : 'Servidor do Discord deu aquela rateada! 🌪️',
        description: err.message || (isEn ? 'Failed to connect to Discord service.' : 'Falha ao conectar com o serviço do Discord.'),
        tip: isEn ? 'Check your internet connection and try again.' : 'Verifique sua internet e tente de novo em instantes.'
      });
      setErrorMessage(err.message || (isEn ? 'Error starting Discord login.' : 'Erro ao iniciar login com o Discord.'));
    }
  };

  const handleEnterOfflineMode = () => {
    triggerHaptic('medium');
    setLoadingProvider(null);
    setErrorMessage(null);
    setAuthErrorDetail(null);
    setPendingNewUser(null);

    // Sign out any residual Google Auth session to completely isolate guest mode
    authService.signOut().catch(() => {});

    const guestProfileKey = 'guest_offline';
    db.setActiveProfileKey(guestProfileKey);

    const existingGuestUser = db.getUser(guestProfileKey);
    const guestUser: UserProfile = {
      ...DEFAULT_USER,
      ...existingGuestUser,
      id: 'guest_user',
      name: 'Visitante (Offline)',
      username: 'visitante',
      avatarUrl: existingGuestUser.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=GuestTester',
      email: '',
      authId: guestProfileKey,
      provider: 'guest',
      isGoogleAuth: false,
      isLoggedIn: true,
      isGuest: true,
      hasCompletedOnboarding: true,
      termsAccepted: true,
      termsAcceptedAt: new Date().toISOString(),
      walletAddress: '',
      walletPrivateKey: '',
      web3Enabled: false,
      web3Balance: 0,
      dailySpendLimit: typeof existingGuestUser.dailySpendLimit === 'number' ? existingGuestUser.dailySpendLimit : 50,
    };

    const existingCats = db.getCategories(guestProfileKey);
    const resolvedCats = existingCats && existingCats.length > 0 ? existingCats : DEFAULT_CATEGORIES;
    const existingVaults = db.getVaults(guestProfileKey);
    const existingTxs = db.getTransactions(guestProfileKey);

    void db.saveUser(guestUser, guestProfileKey);
    void db.saveCategories(resolvedCats, guestProfileKey);
    void db.saveVaults(existingVaults, guestProfileKey);
    void db.saveTransactions(existingTxs, guestProfileKey);

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
    });

    AnalyticsService.trackLogin('guest');
    onLoginSuccess(guestUser, resolvedCats, existingVaults, existingTxs);
  };

  const handleAcceptTermsAndCompleteRegistration = async () => {
    if (!pendingNewUser) return;
    if (!isTermsAccepted) {
      triggerHaptic('warning');
      setErrorMessage(
        isEn
          ? 'Notice: You must read and check the Privacy Policy acceptance box to proceed.'
          : 'Atenção: Você deve ler e marcar a caixa de aceite da Política de Privacidade para prosseguir.'
      );
      return;
    }

    triggerHaptic('medium');
    setLoadingProvider('register');
    setAuthStepText(isEn ? 'Creating account and wallet...' : 'Criando conta e carteira...');
    setErrorMessage(null);

    try {
      const { fbUser, userEmail, displayName, photoURL, existingAvatar, existingDailyLimit, isGoogleAuth, provider } = pendingNewUser;
      const authDocKey = isGoogleAuth
        ? `google_${userEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_')}`
        : fbUser.uid;

      db.setActiveProfileKey(authDocKey);

      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
      });

      // Connect/recover on-chain cryptographic wallet on Base Mainnet for new user
      let walletAddress = '';
      let walletPrivateKey = '';
      let walletMnemonic: string | undefined = undefined;

      try {
        const walletRes = await Web3Service.connectGoogleWallet(
          userEmail,
          'base',
          authDocKey
        );
        walletAddress = walletRes.address;
        walletPrivateKey = walletRes.privateKey;
        walletMnemonic = walletRes.mnemonic;
      } catch (err) {
        console.warn('Web3 Wallet initialization warning:', err);
      }

      // Audit trail of Clickwrap acceptance (LGPD/GDPR compliance)
      const auditTimestamp = new Date().toISOString();
      const resolvedTermsDocUrl = isEn
        ? 'https://github.com/cofreadminwallet/docs/blob/main/en-us/privacy-policy/privacy-policy.md'
        : 'https://github.com/cofreadminwallet/docs/blob/main/pt-br/termos/termos-e-privacidade.md';
      const clientLocaleString = typeof navigator !== 'undefined'
        ? (navigator.languages ? navigator.languages.join(',') : navigator.language)
        : 'unknown';
      const auditFingerprint = `clickwrap_v2_${fbUser.uid}_${language.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`;

      const currentUser = db.getUser(authDocKey);
      const isDeviceSecActive = Boolean(
        currentUser.deviceSecurityEnabled ||
        currentUser.appLockEnabled ||
        WebAuthnService.isDeviceSecurityEnabled()
      );

      if (isDeviceSecActive) {
        WebAuthnService.setDeviceSecurityEnabled(true);
      }

      const localCustom = db.getCustomAvatar(authDocKey);
      const resolvedAvatar = (localCustom && isCustomUserAvatar(localCustom))
        ? localCustom
        : (photoURL || fbUser.photoURL || existingAvatar);

      if (isCustomUserAvatar(resolvedAvatar)) {
        await db.setCustomAvatar(resolvedAvatar, authDocKey);
      }

      const loginPayload = {
        isLoggedIn: true,
        isGoogleAuth: isGoogleAuth ?? true,
        provider: (provider as any) || (isGoogleAuth ? 'google' : 'discord'),
        authId: authDocKey,
        discordId: !isGoogleAuth ? fbUser.uid.replace('discord_', '') : undefined,
        email: userEmail,
        name: displayName,
        username: userEmail.includes('@') ? (displayName || userEmail.split('@')[0]) : userEmail,
        avatarUrl: resolvedAvatar,
        walletAddress: walletAddress,
        walletPrivateKey: walletPrivateKey,
        walletMnemonic: walletMnemonic,
        web3Network: 'base' as const,
        web3Enabled: true,
        hasCompletedOnboarding: true,
        termsAccepted: true,
        termsAcceptedAt: auditTimestamp,
        termsVersion: 'v2.0-2026-09',
        termsLanguage: language,
        termsDocumentUrl: resolvedTermsDocUrl,
        clientLocale: clientLocaleString,
        termsAuditFingerprint: auditFingerprint,
        deviceSecurityEnabled: isDeviceSecActive,
        appLockEnabled: isDeviceSecActive,
        requireAuthForPayments: isDeviceSecActive,
        passkeyEnabled: isDeviceSecActive,
        ...(existingDailyLimit !== undefined ? { dailySpendLimit: existingDailyLimit } : {}),
      };

      const existingCats = db.getCategories(authDocKey);
      const resolvedCats = existingCats && existingCats.length > 0 ? existingCats : DEFAULT_CATEGORIES;
      const existingVaults = db.getVaults(authDocKey) || [];
      const existingTxs = db.getTransactions(authDocKey) || [];
      const existingLedger = db.getOnChainLedger(authDocKey) || [];

      try {
        db.setActiveProfileKey(authDocKey);
        await db.saveUser({ ...currentUser, ...loginPayload }, authDocKey);
        await db.setPersistedAvatar(resolvedAvatar, authDocKey);
        await db.saveCategories(resolvedCats, authDocKey);
        await db.saveVaults(existingVaults, authDocKey);
        await db.saveTransactions(existingTxs, authDocKey);
        await db.saveOnChainLedger(existingLedger, authDocKey);
      } catch (e) {
        console.warn('Storage save on login warning:', e);
      }

      // Save initial clean state in Firestore for this new user
      try {
        await db.saveToCloud(loginPayload as any, resolvedCats, existingVaults, existingTxs);
      } catch (e) {
        console.warn('Initial cloud save warning:', e);
      }

      AnalyticsService.trackLogin((provider as any) || 'google');
      onLoginSuccess(loginPayload, resolvedCats, existingVaults, existingTxs);
    } catch (err: any) {
      setErrorMessage(err.message || (isEn ? 'Error completing registration.' : 'Erro ao finalizar cadastro.'));
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleCancelNewUserRegistration = () => {
    triggerHaptic('light');
    discordAuthHandledRef.current = false;
    if (popupCheckIntervalRef.current) {
      clearInterval(popupCheckIntervalRef.current);
      popupCheckIntervalRef.current = null;
    }
    if (popupGraceTimeoutRef.current) {
      clearTimeout(popupGraceTimeoutRef.current);
      popupGraceTimeoutRef.current = null;
    }
    setPendingNewUser(null);
    setIsTermsAccepted(false);
    setErrorMessage(null);
    setAuthErrorDetail(null);
    setLoadingProvider(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F6FB] flex items-center justify-center p-3 sm:p-6" id="login-screen-root">
      <div className="w-full max-w-md bg-white border-3 border-black rounded-[32px] shadow-neo-xl p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between">
        
        {/* Background Accent Badges */}
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-1.5 bg-[#B8F256] text-black text-[11px] font-['Outfit'] font-black uppercase px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>{isEn ? 'Secure Access' : 'Acesso Seguro'}</span>
          </span>
          <span className="text-[10px] font-mono-code font-bold bg-[#EDE9FE] text-purple-900 border border-black/30 px-2 py-0.5 rounded-md" id="login-version-badge">
            {APP_VERSION_LABEL}
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center my-4">
          <div className="flex justify-center mb-1">
            <CofreLogo size="lg" isEn={isEn} />
          </div>
          <p className="text-xs text-neutral-600 font-medium mt-5 max-w-xs mx-auto">
            {isEn ? 'Self-Custodial Web3 Personal Finance' : 'Sua grana, suas regras na Web3'}
          </p>
        </div>

        {/* Error alert banner (only displayed when not on new user terms screen) */}
        {!pendingNewUser && (authErrorDetail || errorMessage) && (
          <div 
            className={`border-3 border-black rounded-2xl p-4 text-left my-3 space-y-2.5 shadow-neo-sm animate-in fade-in zoom-in-95 duration-200 ${
              authErrorDetail?.provider === 'discord'
                ? 'bg-[#F2F4FE] border-[#5865F2]'
                : authErrorDetail?.provider === 'google'
                ? 'bg-[#FFFBEB] border-amber-500'
                : 'bg-rose-50 border-rose-400'
            }`}
            id="auth-error-banner"
          >
            {authErrorDetail ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono-code font-black uppercase px-2 py-0.5 rounded-md border border-black shadow-neo-xs ${
                    authErrorDetail.provider === 'discord'
                      ? 'bg-[#5865F2] text-white'
                      : authErrorDetail.provider === 'google'
                      ? 'bg-[#FBBC05] text-black'
                      : 'bg-rose-500 text-white'
                  }`}>
                    {authErrorDetail.badge}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setAuthErrorDetail(null);
                    }}
                    className="text-neutral-500 hover:text-black p-1 rounded-md hover:bg-black/5"
                    title={isEn ? "Close notice" : "Fechar aviso"}
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-['Outfit'] font-black text-black leading-tight flex items-center gap-1.5">
                    <span>{authErrorDetail.title}</span>
                  </h3>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    {authErrorDetail.description}
                  </p>
                </div>

                <div className="p-2.5 bg-white/90 border-2 border-black/15 rounded-xl flex items-start gap-2 shadow-neo-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-['Outfit'] font-bold text-neutral-900 leading-tight">
                    {authErrorDetail.tip}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-['Outfit'] font-bold text-rose-800 leading-tight">
                  {errorMessage}
                </p>
              </div>
            )}

            {discordConfigInfo && (
              <div className="p-2.5 bg-white border-2 border-black rounded-xl text-[11px] text-neutral-700 space-y-1.5 shadow-neo-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-black">{isEn ? 'Redirect URI:' : 'URL de Redirecionamento (Redirect URI):'}</span>
                  {copiedRedirectUri && (
                    <span className="text-emerald-700 font-black text-[10px]">{isEn ? '✓ Copied!' : '✓ Copiado!'}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="bg-neutral-100 p-1.5 rounded font-mono text-[10px] break-all select-all flex-1 text-neutral-800 border border-black/10">
                    {discordConfigInfo.redirectUri}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      navigator.clipboard.writeText(discordConfigInfo.redirectUri);
                      setCopiedRedirectUri(true);
                      setTimeout(() => setCopiedRedirectUri(false), 2000);
                    }}
                    className="px-2 py-1 bg-[#B8F256] text-black border border-black rounded font-black text-[10px] btn-press shadow-neo-xs flex-shrink-0 cursor-pointer"
                  >
                    {isEn ? 'Copy' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- PRIVACY POLICY & TERMS ACCEPTANCE SCREEN (NEW USERS) --- */}
        {pendingNewUser ? (
          <div className="my-3 p-4 bg-[#F8FAFC] border-2 border-black rounded-2xl shadow-neo-sm space-y-4 animate-in fade-in zoom-in-95 duration-200" id="new-user-terms-container">
            <div className="flex items-center justify-between border-b border-black/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] border-2 border-black flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-700" />
                </div>
                <div>
                  <h2 className="text-sm font-['Outfit'] font-black text-black leading-none">
                    {isEn ? 'Privacy Policy' : 'Política de Privacidade'}
                  </h2>
                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wide">
                    {isEn ? 'First Access • New Account' : 'Primeiro Acesso • Novo Cadastro'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelNewUserRegistration}
                className="w-7 h-7 rounded-lg border border-black/30 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 btn-press"
                title={isEn ? "Go back to start" : "Voltar ao início"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-700 leading-relaxed font-medium">
              <p>
                {isEn 
                  ? <>Hello, <strong>{pendingNewUser.displayName}</strong>! We confirmed your {pendingNewUser.provider === 'discord' ? 'Discord' : 'Google'} account (<strong>{pendingNewUser.userEmail}</strong>).</>
                  : <>Olá, <strong>{pendingNewUser.displayName}</strong>! Confirmamos sua conta {pendingNewUser.provider === 'discord' ? 'Discord' : 'Google'} (<strong>{pendingNewUser.userEmail}</strong>).</>}
              </p>
              <p className="mt-1 text-[11px] text-neutral-600">
                {isEn
                  ? <>As this is your first time on <strong>CofreAdmin</strong>, please read and accept the privacy policy below to activate your Web3 on-chain wallet:</>
                  : <>Como este é o seu primeiro acesso ao <strong>CofreAdmin</strong>, leia e marque o aceite da política de privacidade abaixo para ativar sua carteira Web3 on-chain:</>}
              </p>
            </div>

            {/* Clickwrap Checkbox */}
            <div
              className={`p-3 rounded-xl border-2 transition-all ${
                isTermsAccepted
                  ? 'bg-[#F0FDF4] border-emerald-600 shadow-neo-xs'
                  : 'bg-white border-black/80 shadow-neo-xs'
              }`}
            >
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <div className="pt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    id="checkbox-accept-terms-clickwrap"
                    checked={isTermsAccepted}
                    onChange={(e) => {
                      setIsTermsAccepted(e.target.checked);
                      if (e.target.checked) {
                        setErrorMessage(null);
                        triggerHaptic('light');
                      }
                    }}
                    className="w-5 h-5 rounded-md border-2 border-black text-black accent-black focus:ring-black cursor-pointer"
                  />
                </div>
                <div className="text-[11px] leading-snug text-neutral-800">
                  <span className="font-bold">
                    {isEn ? 'I declare that I have read and agree to the ' : 'Declaro que li e concordo integralmente com a '}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setIsLegalModalOpen(true);
                    }}
                    className="text-black font-black underline hover:text-purple-700 inline cursor-pointer"
                    id="btn-clickwrap-view-terms"
                  >
                    {isEn ? 'Privacy Policy' : 'Política de Privacidade'}
                  </button>
                  <span>
                    {isEn 
                      ? '. I acknowledge that CofreAdmin operates without key custody and that blockchain transactions are irreversible.'
                      : '. Reconheço que o CofreAdmin opera sem custódia de chaves e que transações blockchain são irreversíveis.'}
                  </span>
                  {isTermsAccepted && (
                    <span className="flex items-center gap-1 mt-1 text-[10px] font-black text-emerald-700">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      {isEn ? 'Digital acceptance confirmed' : 'Aceite digital confirmado para cadastro'}
                    </span>
                  )}
                </div>
              </label>
            </div>

            {/* Action buttons for new user registration */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleAcceptTermsAndCompleteRegistration}
                disabled={isLoading || !isTermsAccepted}
                className={`w-full py-3.5 px-4 rounded-2xl font-['Outfit'] font-black text-sm border-2 border-black shadow-neo btn-press flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isTermsAccepted
                    ? 'bg-[#B8F256] hover:bg-[#A3E635] text-black'
                    : 'bg-neutral-200 text-neutral-500 cursor-not-allowed border-neutral-400'
                }`}
                id="btn-accept-terms-complete"
              >
                {loadingProvider === 'register' ? (
                  <Loader2 className="w-4 h-4 stroke-[3] animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>
                  {loadingProvider === 'register' ? (authStepText || (isEn ? 'Creating Account & Wallet...' : 'Criando Conta & Carteira...')) : (isEn ? 'Accept & Create Account' : 'Aceitar e Criar Conta')}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCancelNewUserRegistration}
                disabled={isLoading}
                className="w-full py-2 text-xs font-['Outfit'] font-bold text-neutral-500 hover:text-black transition-colors"
              >
                {isEn ? 'Cancel' : 'Cancelar'}
              </button>
            </div>
          </div>
        ) : (
          /* --- MAIN LOGIN SCREEN: SIGN IN WITH PROVIDER SYMBOLS (GOOGLE & DISCORD) --- */
          <div className="my-5 p-4 bg-neutral-50 border-2 border-black rounded-2xl shadow-neo-sm text-center">
            <span className="text-xs font-['Outfit'] font-black uppercase tracking-wider text-neutral-600 block mb-3 select-none">
              {isEn ? 'Sign in with:' : 'Entrar com:'}
            </span>

            {/* Symbol-only provider buttons */}
            <div className="flex items-center justify-center gap-4">
              {/* Google provider symbol button */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                type="button"
                className="w-14 h-14 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-black border-2 border-black rounded-2xl shadow-neo-xs btn-press flex items-center justify-center transition-all cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
                id="btn-google-login-choice"
                title="Google"
                aria-label={isEn ? "Sign in with Google" : "Entrar com Google"}
              >
                {loadingProvider === 'google' ? (
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                ) : (
                  <svg className="w-7 h-7 group-hover:scale-110 transition-transform duration-150" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
              </button>

              {/* Discord provider symbol button */}
              <button
                onClick={handleDiscordLogin}
                disabled={isLoading}
                type="button"
                className="w-14 h-14 bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3C45A5] text-white border-2 border-black rounded-2xl shadow-neo-xs btn-press flex items-center justify-center transition-all cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
                id="btn-discord-login-choice"
                title="Discord"
                aria-label={isEn ? "Sign in with Discord" : "Entrar com Discord"}
              >
                {loadingProvider === 'discord' ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <svg className="w-7 h-7 fill-white group-hover:scale-110 transition-transform duration-150" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Styled divider for Offline / Guest Mode */}
            <div className="relative my-3.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/15" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-neutral-500 font-mono">
                <span className="bg-neutral-50 px-2 select-none">{isEn ? 'or test' : 'ou apenas teste'}</span>
              </div>
            </div>

            {/* Guest / Offline Mode button */}
            <button
              onClick={handleEnterOfflineMode}
              disabled={isLoading}
              type="button"
              className="w-full py-2.5 px-3 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-black border-2 border-black rounded-xl shadow-neo-xs btn-press flex items-center justify-center gap-2 transition-all cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
              id="btn-login-offline-choice"
              title={isEn ? "Guest" : "Visitante"}
            >
              <span className="text-base group-hover:scale-110 transition-transform">🔒</span>
              <span className="text-xs font-['Outfit'] font-black">
                {isEn ? 'Continue as Guest' : 'Entrar como Visitante'}
              </span>
            </button>
            <p className="text-[10px] text-neutral-500 font-medium mt-1.5 leading-tight select-none">
              
            </p>

            {/* Loading status message */}
            {isLoading && authStepText && (
              <p className="text-[11px] font-['Outfit'] font-black text-neutral-600 mt-3 animate-pulse">
                {authStepText}
              </p>
            )}
          </div>
        )}

        {/* Security callout */}
        <div className="bg-[#DCFCE7] border-2 border-black rounded-xl p-3 text-center shadow-neo-xs mb-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-['Outfit'] font-black text-emerald-950">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>{isEn ? '100% Encrypted Data' : 'Dados 100% Criptografados'}</span>
          </div>
        </div>

        {/* Footer info with Privacy Policy link and compact language switch */}
        <div className="text-center mt-2 pt-2 border-t border-black/10 flex items-center justify-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-neutral-400">
            CofreAdmin • Base (L2)
          </span>
          <span className="text-[11px] font-bold text-neutral-400">•</span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsLegalModalOpen(true);
            }}
            className="text-[11px] font-bold text-neutral-500 hover:text-black underline cursor-pointer transition-colors"
            id="btn-login-footer-terms"
          >
            {isEn ? 'Privacy Policy' : 'Política de Privacidade'}
          </button>
          <span className="text-[11px] font-bold text-neutral-400">•</span>
          <div className="inline-flex items-center gap-1">
            <span className="text-[10px] font-bold text-neutral-400">
              {isEn ? 'Lang:' : 'Idioma:'}
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                changeLanguage('en-US');
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-black border transition-colors cursor-pointer ${
                language === 'en-US'
                  ? 'bg-[#B8F256] text-black border-black shadow-neo-2xs'
                  : 'bg-white text-neutral-500 border-neutral-300 hover:text-black'
              }`}
            >
              en-US
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                changeLanguage('pt-BR');
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-black border transition-colors cursor-pointer ${
                language === 'pt-BR'
                  ? 'bg-[#B8F256] text-black border-black shadow-neo-2xs'
                  : 'bg-white text-neutral-500 border-neutral-300 hover:text-black'
              }`}
            >
              pt-BR
            </button>
          </div>
        </div>
      </div>

      {/* Legal Terms & Privacy Modal */}
      <LegalTermsModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab="summary"
      />
    </div>
  );
};
