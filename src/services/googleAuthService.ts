import { 
  signInWithPopup, 
  UserCredential,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export class GoogleAuthService {
  /**
   * Performs Google authentication via Firebase Web Auth (signInWithPopup).
   * Operates in web browsers and installed Progressive Web Apps (PWA).
   */
  public static async signIn(): Promise<UserCredential> {
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      // Benignly handle internal Firebase assertion if popup is closed by user
      if (
        err?.message?.includes('Pending promise was never set') ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        throw {
          code: 'auth/popup-closed-by-user',
          message: 'A autenticação com o Google foi cancelada ou a janela foi fechada.'
        };
      }
      throw err;
    }
  }

  /**
   * Signs out the current session from Firebase Auth.
   */
  public static async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Firebase signOut notice:', err);
    }
  }
}

