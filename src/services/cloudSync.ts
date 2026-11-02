import { db, DEMO_VAULT_IDS, DEMO_TX_TITLES, CURRENT_SCHEMA_VERSION, mergeLocalAndCloudData } from './index';
import type {
  CloudUserData,
  MergedCloudUserData,
  WalletBackupAckParams,
  CloudDeletionConsent,
  UserProfile,
  Category,
  Vault,
  Transaction,
} from './types';

export type { CloudUserData, MergedCloudUserData };
export { DEMO_VAULT_IDS, DEMO_TX_TITLES, CURRENT_SCHEMA_VERSION, mergeLocalAndCloudData };

export const CloudSyncService = {
  saveToCloud: (
    userOrId: UserProfile | string,
    categoriesOrData?: Category[] | Omit<CloudUserData, 'updatedAt'>,
    vaults?: Vault[],
    transactions?: Transaction[]
  ): Promise<boolean> => db.saveToCloud(userOrId, categoriesOrData, vaults, transactions),

  loadFromCloud: (userIdOrEmail: string, email?: string, uid?: string): Promise<CloudUserData | null> =>
    db.loadFromCloud(userIdOrEmail, email, uid),

  purgeSimulatedDataFromCloud: (
    userIdOrEmail: string,
    email?: string,
    currentVaults: Vault[] = []
  ): Promise<{ success: boolean; purgedCount: number }> =>
    db.purgeSimulatedDataFromCloud(userIdOrEmail, email, currentVaults),

  deleteFromCloud: (
    emailOrId: string,
    user?: UserProfile,
    deletionConsent?: CloudDeletionConsent
  ): Promise<boolean> => db.deleteFromCloud(emailOrId, user, deletionConsent),

  logWalletBackupAcknowledgment: (
    paramsOrUserId: WalletBackupAckParams | string,
    email?: string,
    walletAddress?: string,
    action?: 'INITIAL_BACKUP' | 'MANUAL_EXPORT' | 'SEED_REVEAL'
  ): Promise<string | null> =>
    db.logWalletBackupAcknowledgment(paramsOrUserId, email, walletAddress, action),

  resetCache: (): void => db.resetCache(),
};
