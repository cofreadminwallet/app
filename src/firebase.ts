// Legacy compatibility entrypoint: all Firebase SDK initialization and imports
// reside exclusively within `src/services/firebaseDb.ts` (Clean Architecture).
export {
  auth,
  firestoreDb as db,
  googleProvider,
  effectiveFirebaseConfig,
} from './services/firebaseDb';
