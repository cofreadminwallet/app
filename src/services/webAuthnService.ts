/**
 * WebAuthn & Device Security Service (Web & PWA Standard)
 * Implements WebAuthn Passkeys / Device Biometrics (Fingerprint / Face ID / Windows Hello)
 * natively via standard browser Web APIs for Progressive Web Apps (PWA).
 */

const BIOMETRICS_PREF_KEY = 'cofre_biometrics_enabled';
const PASSKEY_CREDENTIAL_ID_KEY = 'cofre_passkey_cred_id';
const APP_LOCK_PREF_KEY = 'cofre_app_lock_enabled';
const SESSION_UNLOCKED_KEY = 'cofre_session_unlocked';
const DEVICE_SECURITY_PREF_KEY = 'cofre_device_security_master_enabled';

export interface BiometricAuthResult {
  success: boolean;
  message?: string;
  cancelled?: boolean;
}

function safeBase64UrlToUint8Array(b64url: string): Uint8Array | null {
  try {
    let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

const PIN_HASH_KEY = 'cofre_security_pin_hash';
const PIN_SALT_KEY = 'cofre_pin_salt';

async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`cofreadmin_pin_${salt}_${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getOrCreatePinSalt(): string {
  let salt = localStorage.getItem(PIN_SALT_KEY);
  if (!salt) {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    salt = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem(PIN_SALT_KEY, salt);
  }
  return salt;
}

export class WebAuthnService {
  private static activeAbortController: AbortController | null = null;

  /**
   * Abort any ongoing WebAuthn prompt to prevent "request already pending" errors
   */
  public static cancelPendingAuth(): void {
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
      this.activeAbortController = null;
    }
  }
  /**
   * Check if WebAuthn API is supported in current browser context
   */
  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof navigator.credentials !== 'undefined'
    );
  }

  /**
   * Check if the device has a platform authenticator (Face ID, Touch ID, Fingerprint, Windows Hello)
   */
  public static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
      return false;
    } catch (e) {
      console.warn('Error checking platform authenticator availability:', e);
      return false;
    }
  }

  /**
   * Checks whether a 4-digit security PIN is stored locally on this device
   */
  public static hasStoredPin(): boolean {
    try {
      return Boolean(localStorage.getItem(PIN_HASH_KEY));
    } catch {
      return false;
    }
  }

  /**
   * Saves a 4-digit security PIN hashed with SHA-256 and device salt
   */
  public static async saveSecurityPin(pin: string): Promise<boolean> {
    try {
      if (!pin || pin.length < 4) return false;
      const salt = getOrCreatePinSalt();
      const hash = await hashPin(pin, salt);
      localStorage.setItem(PIN_HASH_KEY, hash);
      this.setDeviceSecurityEnabled(true);
      return true;
    } catch (e) {
      console.error('Failed to save security PIN:', e);
      return false;
    }
  }

  /**
   * Verifies an entered 4-digit security PIN against the stored SHA-256 hash
   */
  public static async verifySecurityPin(pin: string): Promise<boolean> {
    try {
      const storedHash = localStorage.getItem(PIN_HASH_KEY);
      if (!storedHash) return false;
      const salt = getOrCreatePinSalt();
      const computedHash = await hashPin(pin, salt);
      const isValid = computedHash === storedHash;
      if (isValid) {
        this.setSessionUnlocked(true);
      }
      return isValid;
    } catch (e) {
      console.error('Failed to verify security PIN:', e);
      return false;
    }
  }

  public static getStoredPinHash(): string | null {
    try {
      return localStorage.getItem(PIN_HASH_KEY);
    } catch {
      return null;
    }
  }

  public static removeStoredPin(): void {
    try {
      localStorage.removeItem(PIN_HASH_KEY);
    } catch {}
  }

  /**
   * Store user biometric preference
   */
  public static setBiometricsEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(BIOMETRICS_PREF_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Check if user enabled biometrics
   */
  public static isBiometricsEnabled(): boolean {
    try {
      return localStorage.getItem(BIOMETRICS_PREF_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Set Master Device Security preference (controls both App Lock and Payments/Transfers via phone's native biometrics/PIN)
   */
  public static setDeviceSecurityEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(DEVICE_SECURITY_PREF_KEY, enabled ? 'true' : 'false');
      localStorage.setItem(BIOMETRICS_PREF_KEY, enabled ? 'true' : 'false');
      localStorage.setItem(APP_LOCK_PREF_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Check if Master Device Security is enabled
   */
  public static isDeviceSecurityEnabled(userPref?: boolean): boolean {
    if (typeof userPref === 'boolean') {
      return userPref;
    }
    try {
      const stored = localStorage.getItem(DEVICE_SECURITY_PREF_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
      // Fallback check on app lock or biometrics pref
      const appLockStored = localStorage.getItem(APP_LOCK_PREF_KEY);
      if (appLockStored !== null) {
        return appLockStored === 'true';
      }
      return localStorage.getItem(BIOMETRICS_PREF_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Set App Lock on launch preference
   */
  public static setAppLockEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(APP_LOCK_PREF_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Check if App Lock is enabled (defaulting to true if biometrics or PIN is active)
   */
  public static isAppLockEnabled(userPref?: boolean): boolean {
    if (typeof userPref === 'boolean') {
      return userPref;
    }
    try {
      const stored = localStorage.getItem(APP_LOCK_PREF_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
      // If user has device security enabled, default to active security
      return this.isDeviceSecurityEnabled() || this.isBiometricsEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Check if the current browser session has already been unlocked
   */
  public static isSessionUnlocked(): boolean {
    try {
      return sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Mark current session as unlocked or locked
   */
  public static setSessionUnlocked(unlocked: boolean): void {
    try {
      if (unlocked) {
        sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
      } else {
        sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Register a new Passkey credential on the device using native WebAuthn
   */
  public static async registerDevicePasskey(
    userEmail = 'usuario@cofreadmin.app',
    userName = 'Usuário Cofre'
  ): Promise<BiometricAuthResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        message: 'Navegador sem suporte a biometria nativa.',
      };
    }

    this.cancelPendingAuth();
    await new Promise((r) => setTimeout(r, 60));

    try {
      const controller = new AbortController();
      this.activeAbortController = controller;

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userId = new TextEncoder().encode(userEmail);

      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isIpOrLocal = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === 'localhost' || hostname === '127.0.0.1';
      const rpId = isIpOrLocal || !hostname ? undefined : hostname;

      const rp: PublicKeyCredentialRpEntity = {
        name: 'CofreAdmin',
      };
      if (rpId) {
        rp.id = rpId;
      }

      const options: PublicKeyCredentialCreationOptions = {
        challenge,
        rp,
        user: {
          id: userId,
          name: userEmail,
          displayName: userName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = (await navigator.credentials.create({
        publicKey: options,
        signal: controller.signal,
      })) as (PublicKeyCredential & { rawId?: ArrayBuffer }) | null;

      if (credential && credential.id) {
        localStorage.setItem(PASSKEY_CREDENTIAL_ID_KEY, credential.id);

        if (credential.rawId && credential.rawId instanceof ArrayBuffer) {
          try {
            const rawBytes = Array.from(new Uint8Array(credential.rawId));
            localStorage.setItem(PASSKEY_CREDENTIAL_ID_KEY + '_raw', JSON.stringify(rawBytes));
          } catch {}
        }

        this.setDeviceSecurityEnabled(true);
        this.setSessionUnlocked(true);
        return {
          success: true,
          message: 'Segurança do aparelho configurada com sucesso!',
        };
      }

      return {
        success: false,
        message: 'Não foi possível registrar a segurança do aparelho.',
      };
    } catch (err: any) {
      console.warn('WebAuthn register error:', err);
      const errMsg = err?.message || '';
      if (errMsg.includes('not allowed in this context') || errMsg.includes('permissions policy')) {
        return {
          success: false,
          message: 'Biometria restrita no modo de visualização. Abra o app em tela cheia/nova aba ou celular.',
        };
      }
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        return {
          success: false,
          cancelled: true,
          message: 'Validação cancelada no aparelho.',
        };
      }
      return {
        success: false,
        message: err.message || 'Erro ao registrar segurança no aparelho.',
      };
    } finally {
      this.activeAbortController = null;
    }
  }

  /**
   * Prompts the device authentication dialog (Biometrics / Passkey / Windows Hello / Screen Lock)
   * Uses standard WebAuthn API compatible with PWAs on mobile (Chrome Android, Safari iOS) and desktop.
   */
  public static async authenticateBiometrics(
    userEmail = 'usuario@cofreadmin.app',
    userName = 'Usuário Cofre'
  ): Promise<BiometricAuthResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        message: 'Navegador sem suporte a biometria nativa.',
      };
    }

    this.cancelPendingAuth();
    await new Promise((r) => setTimeout(r, 60));

    const savedCredId = localStorage.getItem(PASSKEY_CREDENTIAL_ID_KEY);
    const savedRawBytesJson = localStorage.getItem(PASSKEY_CREDENTIAL_ID_KEY + '_raw');

    // If device doesn't have a registered passkey yet, trigger registration directly
    if (!savedCredId && !savedRawBytesJson) {
      return await this.registerDevicePasskey(userEmail, userName);
    }

    const controller = new AbortController();
    this.activeAbortController = controller;

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isIpOrLocal = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === 'localhost' || hostname === '127.0.0.1';
      const rpId = isIpOrLocal || !hostname ? undefined : hostname;

      let rawId: Uint8Array | null = null;
      if (savedRawBytesJson) {
        try {
          const arr = JSON.parse(savedRawBytesJson);
          if (Array.isArray(arr)) {
            rawId = new Uint8Array(arr);
          }
        } catch {}
      }

      if (!rawId && savedCredId) {
        rawId = safeBase64UrlToUint8Array(savedCredId);
      }

      const buildOptions = (withCredFilter: boolean): PublicKeyCredentialRequestOptions => {
        const opts: PublicKeyCredentialRequestOptions = {
          challenge,
          timeout: 60000,
          userVerification: 'required',
        };
        if (rpId) {
          opts.rpId = rpId;
        }

        if (withCredFilter && rawId) {
          opts.allowCredentials = [
            {
              id: rawId,
              type: 'public-key',
              transports: ['internal'],
            },
          ];
        }

        return opts;
      };

      let assertion: Credential | null = null;

      try {
        assertion = await navigator.credentials.get({
          publicKey: buildOptions(Boolean(rawId)),
          signal: controller.signal,
        });
      } catch (firstErr: any) {
        if (rawId && (firstErr.name === 'NotAllowedError' || firstErr.name === 'InvalidStateError')) {
          console.warn('WebAuthn attempt 1 failed, retrying without allowCredentials filter...', firstErr);
          try {
            assertion = await navigator.credentials.get({
              publicKey: buildOptions(false),
              signal: controller.signal,
            });
          } catch (retryErr: any) {
            throw retryErr;
          }
        } else {
          throw firstErr;
        }
      }

      if (assertion) {
        this.setSessionUnlocked(true);
        return { success: true };
      }

      return {
        success: false,
        message: 'Validação no aparelho não concluída.',
      };
    } catch (err: any) {
      console.warn('WebAuthn authentication error:', err);
      const errMsg = err?.message || '';
      if (errMsg.includes('not allowed in this context') || errMsg.includes('permissions policy')) {
        return {
          success: false,
          message: 'Biometria restrita no modo de visualização. Abra o app em tela cheia/nova aba ou celular.',
        };
      }
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        return {
          success: false,
          cancelled: true,
          message: 'Autenticação cancelada no aparelho.',
        };
      }
      return {
        success: false,
        message: err.message || 'Não foi possível validar a biometria no aparelho.',
      };
    } finally {
      this.activeAbortController = null;
    }
  }
}
