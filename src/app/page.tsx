"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Shield, ArrowRight, Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!loading && user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/journey");
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError("");
    try {
      await login(email, password);
      // onAuthStateChanged will fire → useEffect will redirect
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
      setIsLoggingIn(false);
    }
  };

  // Show spinner while loading or already authenticated
  if (loading || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <Loader2 className="h-10 w-10 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4 sm:p-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/50">
        
        {/* Header Decorator */}
        <div className="h-2 w-full bg-gradient-to-r from-red-600 to-red-500"></div>
        
        <div className="px-8 py-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 ring-8 ring-white">
              <Shield className="h-8 w-8" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">HEC Strategy Coach</h1>
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">v8.5-hec</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Master Strategic Analysis.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email Address</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  placeholder="your.name@toyota-tsusho.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm flex-1 font-semibold text-white shadow-md transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In Securely</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 px-8 py-4 text-center text-xs text-slate-500">
          Powered by the Strategor Framework
        </div>
      </div>
    </div>
  );
}
