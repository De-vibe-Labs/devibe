import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import bundledConfig from "../firebase-applet-config.json";

// Vite env vars (set VITE_FIREBASE_* in .env to override the bundled config).
const env = ((import.meta as unknown as { env: Record<string, string | undefined> }).env) ?? {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || (bundledConfig as any).apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || (bundledConfig as any).authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || (bundledConfig as any).projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || (bundledConfig as any).storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || (bundledConfig as any).messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || (bundledConfig as any).appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || (bundledConfig as any).measurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services. firestoreDatabaseId is optional — undefined falls back to "(default)".
const firestoreDbId = (bundledConfig as any).firestoreDatabaseId as string | undefined;
export const db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Force the account chooser so users on shared machines don't auto-sign-in.
googleProvider.setCustomParameters({
  prompt: "select_account",
});

/** The deployed origin Firebase needs to allowlist — useful for error messages. */
export const currentOrigin: string =
  typeof window !== "undefined" ? window.location.origin : "";

/** Direct link to the Firebase Console authorized-domains settings page. */
export const firebaseAuthSettingsUrl: string =
  `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };
