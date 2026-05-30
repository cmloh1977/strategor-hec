"use client";

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { MASTER_EMAIL } from './constants';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isMaster: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

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
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      // Use console.warn (not .error) to avoid triggering Next.js dev error overlay
      console.warn("Login issue:", error.code);
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
    } catch (e: any) {
      console.warn("Password sync to admin record failed:", e.code);
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
