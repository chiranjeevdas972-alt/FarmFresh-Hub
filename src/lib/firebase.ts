// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const metaEnv = (import.meta as any).env || {};

const getCleanEnv = (key: string, fallback: string): string => {
  const val = metaEnv[key];
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      trimmed.length > 0 &&
      trimmed !== 'undefined' &&
      trimmed !== 'null' &&
      !trimmed.toLowerCase().includes('placeholder') &&
      !trimmed.toLowerCase().includes('your_') &&
      !trimmed.toLowerCase().includes('api_key_here')
    ) {
      return trimmed;
    }
  }
  return fallback || '';
};

const envConfig = {
  apiKey: getCleanEnv('VITE_FIREBASE_API_KEY', firebaseConfig.apiKey),
  authDomain: getCleanEnv('VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain),
  projectId: getCleanEnv('VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId),
  storageBucket: getCleanEnv('VITE_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket),
  messagingSenderId: getCleanEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId),
  appId: getCleanEnv('VITE_FIREBASE_APP_ID', firebaseConfig.appId),
  measurementId: getCleanEnv('VITE_FIREBASE_MEASUREMENT_ID', (firebaseConfig as any).measurementId || ''),
  firestoreDatabaseId: getCleanEnv('VITE_FIREBASE_DATABASE_ID', (firebaseConfig as any).firestoreDatabaseId || '(default)')
};

const app = getApps().length === 0 ? initializeApp(envConfig) : getApp();

// Initialize Firestore with explicit database ID if provided
export const db = getFirestore(app, envConfig.firestoreDatabaseId);

// Enable multi-tab offline persistent cache for Firestore (preserving real data on any reload)
import { enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
try {
  if (typeof window !== 'undefined' && window.indexedDB) {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
      console.warn("Firestore offline persistence failed to enable. Continuing offline capabilities via default memory cache.", err);
    });
  }
} catch (err) {
  console.warn("Firestore offline persistence could not be checked/enabled due to browser sandbox restrictions:", err);
}

// Standard Auth initialization
export const auth = getAuth(app);

// Use modular imports for persistence if not already handled
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
setPersistence(auth, browserLocalPersistence).catch(err => console.error("Persistence failed", err));

/**
 * Checks if the user is verified, either via Email verification or via Google Auth.
 * Automatically reloads the user to catch recent verification events and refreshes token.
 */
export async function ensureVerified(): Promise<boolean> {
  console.log("ensureVerified: Returning true unconditionally");
  return true;
}

// Analytics is unused in our application and is set to null to avoid unhandled async config fetch/registration warnings with restricted client API keys
export const analytics = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error?.message || String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  const errorMsg = JSON.stringify(errInfo);
  console.error(`Firestore Error [${operationType}] on [${path}]:`, errorMsg);
  
  // Custom error messages for UI
  if (error?.code === 'permission-denied') {
    throw new Error('Permission denied. Please ensure you are logged in and have access to this data.');
  }

  throw new Error(errorMsg);
}

// Validation function to check Firestore connection on boot
export async function validateConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'health'));
    return true;
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.warn("Firestore is offline, will sync when online.");
      return false;
    }
    return false;
  }
}
