"use client";

import { useAuth } from "@/lib/AuthContext";
import { DiagramProvider } from "@/lib/DiagramContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { LogOut, BookOpen, Layers, Target, Compass, Zap, ShieldAlert } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const modules = [
  { id: "business-model", name: "1. Business Model", icon: BookOpen },
  { id: "external-analysis", name: "2. External Analysis", icon: Compass },
  { id: "internal-analysis", name: "3. Internal Analysis", icon: Layers },
  { id: "swot-synthesis", name: "4. SWOT Synthesis", icon: ShieldAlert },
  { id: "strategic-options", name: "5. Strategic Options", icon: Target },
];

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-amber-200 flex flex-col justify-between shadow-sm z-10">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-100 mb-6 relative">
            <Zap className="h-6 w-6 text-red-600 mr-3" />
            <h2 className="font-bold text-lg text-slate-800 tracking-tight flex items-center">
              Strategy Coach
              <span className="ml-2 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border border-amber-200">v2.0dev</span>
            </h2>
          </div>
          
          <nav className="px-4 space-y-1">
            <p className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">GALP Modules</p>
            {modules.map((mod) => {
              const isActive = pathname.includes(mod.id) || (pathname === '/journey' && mod.id === 'business-model');
              return (
                <Link
                  key={mod.id}
                  href={`/journey?module=${mod.id}`}
                  className={clsx(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-red-50 text-red-700" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <mod.icon className={clsx("h-5 w-5", isActive ? "text-red-600" : "text-slate-400")} />
                  <span>{mod.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs mr-3">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="truncate text-sm text-slate-700 font-medium">
              {user.email}
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push("/"); }}
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-white border border-amber-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full">
        <DiagramProvider>
          {children}
        </DiagramProvider>
      </main>
    </div>
  );
}
