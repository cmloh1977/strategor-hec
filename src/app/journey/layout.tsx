"use client";

import { useAuth } from "@/lib/AuthContext";
import { PortfolioProvider, usePortfolio } from "@/lib/PortfolioContext";
import { TeamProvider, useTeam } from "@/lib/TeamContext";
import { MASTER_EMAIL } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, LayoutDashboard, BookOpen, Compass, Layers, ShieldAlert, Lock, Zap, BarChart3, MessageSquare, Target, Settings, KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";

const ANALYSIS_STEPS = [
  { id: "business-model", name: "Business Model", icon: BookOpen },
  { id: "external-analysis", name: "External Analysis", icon: Compass },
  { id: "internal-analysis", name: "Internal Analysis", icon: Layers },
  { id: "swot-synthesis", name: "SWOT Synthesis", icon: ShieldAlert },
];

function SidebarContent() {
  const { user, logout, changePassword } = useAuth();
  const router = useRouter();
  const { portfolio, phase2Unlocked, teamCards } = usePortfolio();
  const { team, isInTeam } = useTeam();
  const searchParams = useSearchParams();

  const currentView = searchParams.get("view") || "dashboard";
  const currentStep = searchParams.get("step") || "";

  const hasAnalysis = !!portfolio.myAnalysis;

  // Change password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPass.length < 6) {
      setPassMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (currentPass === newPass) {
      setPassMsg({ type: "error", text: "New password must be different from current password." });
      return;
    }
    setChangingPass(true);
    try {
      await changePassword(currentPass, newPass);
      setPassMsg({ type: "success", text: "Password changed successfully!" });
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      setTimeout(() => { setShowPasswordModal(false); setPassMsg(null); }, 1500);
    } catch (err: any) {
      let msg = err.message;
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") msg = "Current password is incorrect.";
      if (err.code === "auth/weak-password") msg = "New password is too weak. Use at least 6 characters.";
      if (err.code === "auth/too-many-requests") msg = "Too many attempts. Please try again later.";
      setPassMsg({ type: "error", text: msg });
    }
    setChangingPass(false);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPass("");
    setNewPass("");
    setConfirmPass("");
    setPassMsg(null);
    setShowCurrent(false);
    setShowNew(false);
  };

  return (
    <>
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between shadow-sm z-10">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 mb-4">
          <Zap className="h-6 w-6 text-red-600 mr-3" />
          <h2 className="font-bold text-lg text-slate-800 tracking-tight flex items-center">
            Strategy Coach
            <span className="ml-2 bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">v8.8-galp</span>
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
            <LayoutDashboard className={clsx("h-5 w-5", currentView === "dashboard" ? "text-red-600" : "text-slate-400")} />
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
          <div className="truncate text-sm text-slate-700 font-medium flex-1">
            {user?.email}
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Change Password"
          >
            <KeyRound className="h-4 w-4" />
          </button>
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
          className="flex w-full items-center justify-center space-x-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>

    {/* Change Password Modal */}
    {showPasswordModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closePasswordModal}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">Change Password</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 pr-10"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 pr-10"
                  placeholder="At least 6 characters"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Confirm New Password</label>
              <input
                type={showNew ? "text" : "password"}
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className={clsx(
                  "w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2",
                  confirmPass && confirmPass !== newPass
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                )}
                placeholder="Re-enter new password"
              />
              {confirmPass && confirmPass !== newPass && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Message */}
            {passMsg && (
              <div className={clsx(
                "px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2",
                passMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
              )}>
                {passMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {passMsg.text}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={closePasswordModal} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={changingPass || !currentPass || !newPass || !confirmPass}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {changingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {changingPass ? "Changing..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
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
