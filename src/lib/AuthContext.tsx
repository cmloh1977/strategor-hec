"use client";

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isMaster: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const MASTER_EMAIL = "chee_ming_loh@toyota-tsusho.com";
const MASTER_PASSWORD = "Lokloh77";

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isMaster: false,
  login: async () => {},
  logout: async () => {},
  changePassword: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authResolved = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser?.email || "null");
      setUser(currentUser);
      if (!authResolved.current) {
        authResolved.current = true;
        setTimeout(() => setLoading(false), 100);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const isMaster = email.trim().toLowerCase() === MASTER_EMAIL.toLowerCase();
    
    try {
      if (isMaster && pass === MASTER_PASSWORD) {
        try {
          console.log("Master account auto-provisioning start...");
          await createUserWithEmailAndPassword(auth, email, pass);
          console.log("Master account created successfully.");
          return;
        } catch (createErr: any) {
          console.log("Auto-provisioning note:", createErr.code);
          if (createErr.code === 'auth/operation-not-allowed') {
             throw new Error("ERROR: The 'Email/Password' sign-in provider is not enabled in your Firebase Console (Authentication > Sign-in method). Please go enable it.");
          }
          if (createErr.code === 'auth/weak-password') {
             throw new Error("ERROR: Firebase rejected the password as too weak. Please use a stronger password (e.g. Strategor2026!).");
          }
          if (createErr.code !== 'auth/email-already-in-use') {
            throw createErr;
          }
        }
      }

      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      // Use console.warn (not .error) to avoid triggering Next.js dev error overlay
      console.warn("Login issue:", error.code);
      if (isMaster && error.code === 'auth/invalid-credential') {
        throw new Error(`Master account login issue: ${error.message}. Is the password definitely correct?`);
      }
      if (error.code === 'auth/invalid-credential') {
        throw new Error("Incorrect email or password. Please try again.");
      }
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error("Not authenticated");
    // Re-authenticate first (required by Firebase for sensitive operations)
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    // Sync password to _admin_users BEFORE updating Auth (token may become stale after)
    try {
      await updateDoc(doc(db, "_admin_users", user.uid), { password: newPassword });
      console.log("✅ Admin record password synced for", user.uid);
    } catch (e: any) {
      console.error("❌ Failed to sync password to admin record:", e.code, e.message);
    }
    // Now update Firebase Auth password
    await updatePassword(user, newPassword);
  };

  const isMaster = user?.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();

  return (
    <AuthContext.Provider value={{ user, loading, isMaster, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
