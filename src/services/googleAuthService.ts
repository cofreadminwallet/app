import { authService } from './index';
import type { AuthenticatedSessionUser } from './types';

export type GoogleUserInfo = AuthenticatedSessionUser;

export class GoogleAuthService {
  static async signIn(): Promise<{ user: AuthenticatedSessionUser }> {
    return authService.signIn();
  }

  static async signOut(): Promise<void> {
    return authService.signOut();
  }
}
