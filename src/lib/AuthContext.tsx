"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isMaster: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const MASTER_EMAIL = "chee_ming_loh@toyota-tsusho.com";
const MASTER_PASSWORD = "Lokloh77";

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isMaster: false,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
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
      console.error("Login Error:", error.code, error.message);
      if (isMaster && error.code === 'auth/invalid-credential') {
        throw new Error(`Master account login issue: ${error.message}. Is the password definitely correct?`);
      }
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isMaster = user?.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();

  return (
    <AuthContext.Provider value={{ user, loading, isMaster, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
