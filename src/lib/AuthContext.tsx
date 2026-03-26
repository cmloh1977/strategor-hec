"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // DEV MODE: auto-login to skip login screen
    setUser({ email: "chee_ming_loh@toyota-tsusho.com", uid: "mock-uid-123" } as User);
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    if (email === "chee_ming_loh@toyota-tsusho.com" && pass === "123456") {
      setUser({ email, uid: "mock-uid-123" } as User);
      return;
    }
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    if (user?.uid === "mock-uid-123") {
      setUser(null);
      return;
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
