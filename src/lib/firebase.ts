// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const metaEnv = (import.meta as any).env || {};
const envConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || (firebaseConfig as any).firestoreDatabaseId || '(default)'
};

const app = getApps().length === 0 ? initializeApp(envConfig) : getApp();

// Initialize Firestore with explicit database ID if provided
export const db = getFirestore(app, envConfig.firestoreDatabaseId);

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
  const user = auth.currentUser;
  
  if (!user) {
    console.log("ensureVerified: No current user");
    return false;
  }

  try {
    // Production-ready: Reload and refresh token to catch latest state
    await user.reload();
    await user.getIdToken(true);
    const updatedUser = auth.currentUser;
    
    if (!updatedUser) return false;

    const isGoogleUser = updatedUser.providerData.some(
      provider => provider.providerId === "google.com"
    );

    const isVerified = updatedUser.emailVerified || isGoogleUser;

    console.log("Current User:", updatedUser.uid);
    console.log("Email Verified:", updatedUser.emailVerified);
    console.log("Provider Data:", updatedUser.providerData);
    console.log("Is Google User:", isGoogleUser);
    console.log("Final Verification Status:", isVerified);

    if (!isVerified) {
      console.warn("User attempted save but is not verified.");
      return false;
    }

    return true;
  } catch (err) {
    console.error("Verification check failed", err);
    return false;
  }
}

// Analytics remains optional
export const analytics = typeof window !== 'undefined' ? 
  isSupported().then(yes => yes ? getAnalytics(app) : null).catch(() => null) : 
  null;

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
