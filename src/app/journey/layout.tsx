"use client";

import { useAuth } from "@/lib/AuthContext";
import { PortfolioProvider, usePortfolio } from "@/lib/PortfolioContext";
import { TeamProvider, useTeam } from "@/lib/TeamContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, LayoutDashboard, BookOpen, Compass, Layers, ShieldAlert, Lock, Zap, BarChart3, MessageSquare, Target, Settings } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";

const MASTER_EMAIL = "chee_ming_loh@toyota-tsusho.com";

const ANALYSIS_STEPS = [
  { id: "business-model", name: "Business Model", icon: BookOpen },
  { id: "external-analysis", name: "External Analysis", icon: Compass },
  { id: "internal-analysis", name: "Internal Analysis", icon: Layers },
  { id: "swot-synthesis", name: "SWOT Synthesis", icon: ShieldAlert },
];

function SidebarContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { portfolio, phase2Unlocked, teamCards } = usePortfolio();
  const { team, isInTeam } = useTeam();
  const searchParams = useSearchParams();

  const currentView = searchParams.get("view") || "dashboard";
  const currentStep = searchParams.get("step") || "";

  const hasAnalysis = !!portfolio.myAnalysis;

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between shadow-sm z-10">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 mb-4">
          <Zap className="h-6 w-6 text-indigo-600 mr-3" />
          <h2 className="font-bold text-lg text-slate-800 tracking-tight flex items-center">
            Strategy Coach
            <span className="ml-2 bg-indigo-600 text-white px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">v8.3-hec</span>
          </h2>
        </div>

        <nav className="px-4 space-y-1">
          {/* Dashboard */}
          <Link
            href="/journey?view=dashboard"
            className={clsx(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              currentView === "dashboard"
                ? "bg-red-50 text-red-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <LayoutDashboard className={clsx("h-5 w-5", currentView === "dashboard" ? "text-indigo-600" : "text-slate-400")} />
            <span>Dashboard</span>
          </Link>

          {/* My Analysis Section */}
          {hasAnalysis && (
            <>
              <p className="px-2 pt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                📋 My Analysis
              </p>
              <div className="ml-1 pl-3 border-l-2 border-slate-200 space-y-0.5">
                {ANALYSIS_STEPS.map((step) => {
                  const isActive = currentView === "analysis" && currentStep === step.id;
                  return (
                    <Link
                      key={step.id}
                      href={`/journey?view=analysis&step=${step.id}`}
                      className={clsx(
                        "flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-red-50 text-red-700 font-semibold"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      <step.icon className={clsx("h-4 w-4", isActive ? "text-red-500" : "text-slate-400")} />
                      <span>{step.name}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {/* Team Constellation Section */}
          <p className="px-2 pt-6 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            👥 Team Constellation
            {teamCards.length > 0 && (
              <span className="ml-2 bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {teamCards.length}
              </span>
            )}
          </p>

          <Link
            href={isInTeam ? "/journey?view=constellation" : "#"}
            className={clsx(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              currentView === "constellation"
                ? "bg-indigo-50 text-indigo-700"
                : isInTeam
                  ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  : "text-slate-300 cursor-not-allowed"
            )}
            onClick={(e) => { if (!isInTeam) e.preventDefault(); }}
          >
            {isInTeam ? (
              <BarChart3 className={clsx("h-5 w-5", currentView === "constellation" ? "text-indigo-500" : "text-slate-400")} />
            ) : (
              <Lock className="h-5 w-5 text-slate-300" />
            )}
            <span>Constellation</span>
            {team && (
              <span className="ml-auto text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">
                {team.memberCards.length}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        <div className="flex items-center mb-3 px-2">
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs mr-3">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="truncate text-sm text-slate-700 font-medium">
            {user?.email}
          </div>
        </div>
        {user?.email?.toLowerCase() === MASTER_EMAIL.toLowerCase() && (
          <Link
            href="/admin"
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-900"
          >
            <Settings className="h-4 w-4" />
            <span>User Management</span>
          </Link>
        )}
        <button
          onClick={() => { logout(); router.replace("/"); }}
          className="flex w-full items-center justify-center space-x-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-indigo-600"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  return (
    <PortfolioProvider>
      <TeamProvider>
        <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
          <SidebarContent />
          <main className="flex-1 flex flex-col relative h-full">
            {children}
          </main>
        </div>
      </TeamProvider>
    </PortfolioProvider>
  );
}
