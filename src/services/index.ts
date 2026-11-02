import type { IDatabaseService, IAuthService, IBillingService } from './types';
import { CurrentDatabaseService, CurrentAuthService, CurrentBillingService } from './currentDb';

/**
 * ============================================================================
 * SINGLE DEPENDENCY INJECTION ENTRYPOINT (Repository Pattern / Service Layer)
 * ============================================================================
 *
 * To swap the database in the future (e.g. Supabase, PostgreSQL, REST API),
 * simply create a class implementing `IDatabaseService` and change ONLY 1 LINE below:
 *
 * Example 1 (Supabase):
 *   // import { SupabaseDatabaseService } from './supabaseDb';
 *   // export const db: IDatabaseService = new SupabaseDatabaseService();
 *
 * Example 2 (REST API / Node.js / Cloud SQL):
 *   // import { RestApiDatabaseService } from './restApiDb';
 *   // export const db: IDatabaseService = new RestApiDatabaseService();
 */
export const db: IDatabaseService = new CurrentDatabaseService();

/**
 * Singleton instance of the authentication service (Firebase Auth / OAuth).
 * To switch to Supabase Auth or Auth0 in the future:
 *   // export const authService: IAuthService = new SupabaseAuthService();
 */
export const authService: IAuthService = new CurrentAuthService();

/**
 * Singleton instance of the billing plans, quotas, and protocol fees service.
 */
export const billingService: IBillingService = new CurrentBillingService();

export * from './types';
export { getProfileStorageKey, isCustomUserAvatar, isDefaultOrPlaceholderAvatar } from './localStorageDb';
export { DEMO_VAULT_IDS, DEMO_TX_TITLES, CURRENT_SCHEMA_VERSION, mergeLocalAndCloudData } from './firebaseDb';
