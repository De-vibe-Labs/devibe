import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  currentOrigin,
  firebaseAuthSettingsUrl,
  User,
} from "../firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    }, (err) => {
      console.error("Auth helper error:", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Sign-In failed:", err);
      let msg = err.message || "An unexpected error occurred during Google Auth.";
      if (err.code === "auth/popup-closed-by-user") {
        msg = "The authentication popup was closed before completing.";
      } else if (err.code === "auth/cancelled-popup-request") {
        msg = "The auth popup request was cancelled.";
      } else if (err.code === "auth/network-request-failed") {
        msg = "Network connectivity issue detected. Please check your internet connection.";
      } else if (err.code === "auth/unauthorized-domain") {
        // The fix is server-side — surface it in the message so the user can act.
        msg =
          `auth/unauthorized-domain: this origin (${currentOrigin}) isn't allowed for Google sign-in. ` +
          `Add it at Firebase Console → Authentication → Settings → Authorized domains, then retry. ` +
          `Open: ${firebaseAuthSettingsUrl}`;
      } else if (err.code === "auth/operation-not-allowed") {
        msg =
          "Google sign-in is disabled for this Firebase project. " +
          "Enable it at Firebase Console → Authentication → Sign-in method.";
      } else if (err.code === "auth/popup-blocked") {
        msg = "Your browser blocked the sign-in popup. Allow popups for this site and retry.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Sign-out failed:", err);
      setError(err.message || "An error occurred during sign-out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
