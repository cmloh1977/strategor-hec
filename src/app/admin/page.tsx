"use client";

import { useAuth } from "@/lib/AuthContext";
import { MASTER_EMAIL } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Users, UserPlus, Trash2, Key, Loader2, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, BarChart3, Circle, Upload, Download, FileSpreadsheet, Filter, Pencil, Check, X, MessageSquare } from "lucide-react";
import clsx from "clsx";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword, deleteUser, signOut } from "firebase/auth";
import { doc, setDoc, getDocs, collection, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as XLSX from "xlsx";
import CohortPulse from "@/components/CohortPulse";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getSecondaryAuth() {
  const secondaryApp = initializeApp(firebaseConfig, "adminHelper_" + Date.now());
  return { auth: getAuth(secondaryApp), app: secondaryApp };
}

interface UserRecord {
  email: string;
  uid: string;
  createdAt: string;
  password?: string;
  name?: string;
  cohort?: string;
}

// Match the PortfolioContext structure
interface PillarData { points: string[]; populated: boolean; }
interface MyAnalysis {
  businessName: string;
  businessDescription: string;
  ownerName: string;
  ownerRegion: string;
  color: string;
  businessModel: { valueProposition: PillarData; valueArchitecture: PillarData; contributions: PillarData; };
  fiveForces: { newEntrants: PillarData; suppliers: PillarData; rivalry: PillarData; buyers: PillarData; substitutes: PillarData; };
  vrio: { valuable: PillarData; rare: PillarData; inimitable: PillarData; organized: PillarData; };
  swot: { strengths: PillarData; weaknesses: PillarData; opportunities: PillarData; threats: PillarData; };
}

interface PortfolioSnapshot {
  myAnalysis: MyAnalysis | null;
  shareCode: string | null;
  teamCards: any[];
}

interface EngagementMetrics {
  totalUserMessages: number;
  totalCoachMessages: number;
  avgWordsPerMessage: number;
  modulesWithChat: number;
  perModule: { moduleId: string; userMessages: number; avgWords: number }[];
  score: number; // 0-100
  label: "Ghost" | "Surface" | "Engaged" | "Deep Thinker";
}

interface ParticipantProgress {
  user: UserRecord;
  portfolio: PortfolioSnapshot | null;
  progress: { done: number; total: number; percent: number };
  modules: {
    businessModel: { done: number; total: number };
    fiveForces: { done: number; total: number };
    vrio: { done: number; total: number };
    swot: { done: number; total: number };
  };
  status: "Not Started" | "In Progress" | "Completed";
  currentModule: string;
  engagement: EngagementMetrics;
}

const CHAT_MODULES = ["business-model", "external-analysis", "internal-analysis", "swot-synthesis"];
const CHAT_MODULE_LABELS: Record<string, string> = {
  "business-model": "BM", "external-analysis": "5F", "internal-analysis": "VRIO", "swot-synthesis": "SWOT",
};

function calcEngagement(chats: { moduleId: string; messages: { role: string; text: string }[] }[]): EngagementMetrics {
  let totalUserMessages = 0;
  let totalCoachMessages = 0;
  let totalWords = 0;
  let modulesWithChat = 0;
  const perModule: EngagementMetrics["perModule"] = [];

  for (const moduleId of CHAT_MODULES) {
    const chat = chats.find(c => c.moduleId === moduleId);
    const userMsgs = chat ? chat.messages.filter(m => m.role === "user") : [];
    const coachMsgs = chat ? chat.messages.filter(m => m.role === "coach") : [];
    const words = userMsgs.reduce((sum, m) => sum + m.text.split(/\s+/).filter(Boolean).length, 0);
    const avgWords = userMsgs.length > 0 ? Math.round(words / userMsgs.length) : 0;

    totalUserMessages += userMsgs.length;
    totalCoachMessages += coachMsgs.length;
    totalWords += words;
    if (userMsgs.length > 0) modulesWithChat++;
    perModule.push({ moduleId, userMessages: userMsgs.length, avgWords });
  }

  const avgWordsPerMessage = totalUserMessages > 0 ? Math.round(totalWords / totalUserMessages) : 0;

  // Score: weighted formula normalized to 0-100
  const messageScore = Math.min(totalUserMessages * 2.5, 40); // up to 40 pts for 16+ messages
  const depthScore = Math.min(avgWordsPerMessage * 0.6, 30);   // up to 30 pts for 50+ avg words
  const coverageScore = (modulesWithChat / 4) * 30;            // up to 30 pts for all 4 modules
  const rawScore = Math.round(messageScore + depthScore + coverageScore);
  const score = Math.min(rawScore, 100);

  let label: EngagementMetrics["label"] = "Ghost";
  if (score > 75) label = "Deep Thinker";
  else if (score > 45) label = "Engaged";
  else if (score > 15) label = "Surface";

  return { totalUserMessages, totalCoachMessages, avgWordsPerMessage, modulesWithChat, perModule, score, label };
}

function calcProgress(p: PortfolioSnapshot | null): ParticipantProgress["progress"] & { modules: ParticipantProgress["modules"]; status: ParticipantProgress["status"]; currentModule: string } {
  if (!p?.myAnalysis) {
    return {
      done: 0, total: 16, percent: 0,
      modules: {
        businessModel: { done: 0, total: 3 },
        fiveForces: { done: 0, total: 5 },
        vrio: { done: 0, total: 4 },
        swot: { done: 0, total: 4 },
      },
      status: "Not Started",
      currentModule: "—",
    };
  }

  const a = p.myAnalysis;
  const bm = [a.businessModel.valueProposition, a.businessModel.valueArchitecture, a.businessModel.contributions].filter(p => p?.populated).length;
  const ff = [a.fiveForces.newEntrants, a.fiveForces.suppliers, a.fiveForces.rivalry, a.fiveForces.buyers, a.fiveForces.substitutes].filter(p => p?.populated).length;
  const vr = [a.vrio.valuable, a.vrio.rare, a.vrio.inimitable, a.vrio.organized].filter(p => p?.populated).length;
  const sw = [a.swot.strengths, a.swot.weaknesses, a.swot.opportunities, a.swot.threats].filter(p => p?.populated).length;

  const done = bm + ff + vr + sw;
  const percent = Math.round((done / 16) * 100);

  let currentModule = "—";
  let status: ParticipantProgress["status"] = "Not Started";

  if (done === 16) {
    status = "Completed";
    currentModule = "All Complete";
  } else if (done > 0) {
    status = "In Progress";
    if (sw > 0 && sw < 4) currentModule = "SWOT Synthesis";
    else if (vr > 0 && vr < 4) currentModule = "Internal Analysis (VRIO)";
    else if (ff > 0 && ff < 5) currentModule = "External Analysis (5 Forces)";
    else if (bm > 0 && bm < 3) currentModule = "Business Model";
    else if (bm === 3 && ff === 0) currentModule = "External Analysis (5 Forces)";
    else if (ff === 5 && vr === 0) currentModule = "Internal Analysis (VRIO)";
    else if (vr === 4 && sw === 0) currentModule = "SWOT Synthesis";
    else currentModule = "In Progress";
  }

  return {
    done, total: 16, percent,
    modules: {
      businessModel: { done: bm, total: 3 },
      fiveForces: { done: ff, total: 5 },
      vrio: { done: vr, total: 4 },
      swot: { done: sw, total: 4 },
    },
    status,
    currentModule,
  };
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [participants, setParticipants] = useState<ParticipantProgress[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCohort, setNewCohort] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bulk import
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [resetPass, setResetPass] = useState("");
  const [resetting, setResetting] = useState(false);

  // Active tab
  const [tab, setTab] = useState<"progress" | "users">("progress");

  // Inline cohort edit
  const [editingCohortUid, setEditingCohortUid] = useState<string | null>(null);
  const [editCohortValue, setEditCohortValue] = useState("");

  // Cohort filter
  const [selectedCohort, setSelectedCohort] = useState<string>("all");

  // Cohort Pulse
  const [showPulse, setShowPulse] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!loading && (!user || user.email?.toLowerCase() !== MASTER_EMAIL.toLowerCase())) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.email?.toLowerCase() === MASTER_EMAIL.toLowerCase()) {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, "_admin_users"));
      const list: UserRecord[] = [];
      snap.forEach((d) => list.push(d.data() as UserRecord));
      list.sort((a, b) => a.email.localeCompare(b.email));
      setUsers(list);
      await loadProgress(list);
    } catch (e) {
      console.error("Failed to load users:", e);
    }
    setLoadingUsers(false);
  };

  const loadProgress = async (userList: UserRecord[]) => {
    setLoadingProgress(true);
    const results: ParticipantProgress[] = [];

    const emptyEngagement: EngagementMetrics = {
      totalUserMessages: 0, totalCoachMessages: 0, avgWordsPerMessage: 0,
      modulesWithChat: 0, perModule: CHAT_MODULES.map(m => ({ moduleId: m, userMessages: 0, avgWords: 0 })),
      score: 0, label: "Ghost",
    };

    for (const u of userList) {
      try {
        const portfolioDoc = await getDoc(doc(db, "users", u.uid, "portfolio", "current"));
        const portfolio = portfolioDoc.exists() ? (portfolioDoc.data() as PortfolioSnapshot) : null;
        const prog = calcProgress(portfolio);

        // Load chat history for engagement scoring
        const chatData: { moduleId: string; messages: { role: string; text: string }[] }[] = [];
        for (const moduleId of CHAT_MODULES) {
          try {
            const chatDoc = await getDoc(doc(db, "users", u.uid, "chats", moduleId));
            if (chatDoc.exists()) {
              const data = chatDoc.data();
              chatData.push({ moduleId, messages: data.messages || [] });
            }
          } catch (_) { /* skip unreadable chats */ }
        }
        const engagement = chatData.length > 0 ? calcEngagement(chatData) : emptyEngagement;

        results.push({
          user: u,
          portfolio,
          progress: { done: prog.done, total: prog.total, percent: prog.percent },
          modules: prog.modules,
          status: prog.status,
          currentModule: prog.currentModule,
          engagement,
        });
      } catch (e) {
        console.error(`Failed to load progress for ${u.email}:`, e);
        results.push({
          user: u,
          portfolio: null,
          progress: { done: 0, total: 16, percent: 0 },
          modules: { businessModel: { done: 0, total: 3 }, fiveForces: { done: 0, total: 5 }, vrio: { done: 0, total: 4 }, swot: { done: 0, total: 4 } },
          status: "Not Started",
          currentModule: "—",
          engagement: emptyEngagement,
        });
      }
    }

    results.sort((a, b) => b.progress.percent - a.progress.percent);
    setParticipants(results);
    setLoadingProgress(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) return;
    setCreating(true);
    setCreateMsg(null);

    let secondaryApp: any = null;
    try {
      const { auth: secondaryAuth, app } = getSecondaryAuth();
      secondaryApp = app;
      const result = await createUserWithEmailAndPassword(secondaryAuth, newEmail.trim(), newPassword.trim());
      await signOut(secondaryAuth);
      await deleteApp(app);
      secondaryApp = null;

      const record: UserRecord = {
        email: newEmail.trim(),
        uid: result.user.uid,
        createdAt: new Date().toISOString(),
        password: newPassword.trim(),
        ...(newName.trim() ? { name: newName.trim() } : {}),
        ...(newCohort.trim() ? { cohort: newCohort.trim() } : {}),
      };
      await setDoc(doc(db, "_admin_users", result.user.uid), record);

      setCreateMsg({ type: "success", text: `✓ Created ${newEmail.trim()}` });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      // Keep cohort for consecutive additions to same cohort
      await loadUsers();
    } catch (err: any) {
      if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (_) {} }
      let msg = err.message;
      if (err.code === "auth/email-already-in-use") msg = "A user with this email already exists.";
      if (err.code === "auth/invalid-email") msg = "Invalid email format.";
      if (err.code === "auth/weak-password") msg = "Password too weak. Use at least 6 characters.";
      setCreateMsg({ type: "error", text: msg });
    }
    setCreating(false);
  };

  // ── Bulk Import ──
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Name", "Email", "Password", "Cohort"],
      ["John Doe", "john.doe@company.com", "password123", "Cohort 2026"],
      ["Jane Smith", "jane.smith@company.com", "password123", "Cohort 2026"],
    ]);
    ws["!cols"] = [{ wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "user-import-template.xlsx");
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportProgress(null);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        setImportProgress({ current: 0, total: 0, errors: ["No data rows found in file."] });
        setImporting(false);
        return;
      }

      const errors: string[] = [];
      const total = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = (row["Name"] || row["name"] || "").toString().trim();
        const email = (row["Email"] || row["email"] || "").toString().trim();
        const password = (row["Password"] || row["password"] || "").toString().trim();
        const cohort = (row["Cohort"] || row["cohort"] || "").toString().trim();

        setImportProgress({ current: i + 1, total, errors: [...errors] });

        if (!email || !password) {
          errors.push(`Row ${i + 2}: Missing email or password`);
          continue;
        }

        let secondaryApp: any = null;
        try {
          const { auth: secondaryAuth, app } = getSecondaryAuth();
          secondaryApp = app;
          const result = await createUserWithEmailAndPassword(secondaryAuth, email, password);
          await signOut(secondaryAuth);
          await deleteApp(app);
          secondaryApp = null;

          const record: UserRecord = {
            email,
            uid: result.user.uid,
            createdAt: new Date().toISOString(),
            password,
            ...(name ? { name } : {}),
            ...(cohort ? { cohort } : {}),
          };
          await setDoc(doc(db, "_admin_users", result.user.uid), record);
        } catch (err: any) {
          if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (_) {} }
          let msg = err.message;
          if (err.code === "auth/email-already-in-use") msg = "already exists";
          if (err.code === "auth/invalid-email") msg = "invalid email";
          if (err.code === "auth/weak-password") msg = "weak password";
          errors.push(`Row ${i + 2} (${email}): ${msg}`);
        }
      }

      setImportProgress({ current: total, total, errors });
      await loadUsers();
    } catch (err: any) {
      setImportProgress({ current: 0, total: 0, errors: [`Failed to parse file: ${err.message}`] });
    }

    setImporting(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (record: UserRecord) => {
    setDeleting(true);
    let secondaryApp: any = null;
    try {
      const { auth: secondaryAuth, app } = getSecondaryAuth();
      secondaryApp = app;
      if (record.password) {
        const cred = await signInWithEmailAndPassword(secondaryAuth, record.email, record.password);
        await deleteUser(cred.user);
      }
      try { await deleteApp(app); secondaryApp = null; } catch (_) {}
      await deleteDoc(doc(db, "_admin_users", record.uid));
      setDeleteTarget(null);
      await loadUsers();
    } catch (err: any) {
      if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (_) {} }
      console.error("Delete failed:", err);
      alert("Delete failed: " + err.message);
    }
    setDeleting(false);
  };

  const handleResetPassword = async (record: UserRecord) => {
    if (!resetPass.trim()) return;
    setResetting(true);
    let secondaryApp: any = null;
    try {
      const { auth: secondaryAuth, app } = getSecondaryAuth();
      secondaryApp = app;
      if (record.password) {
        const cred = await signInWithEmailAndPassword(secondaryAuth, record.email, record.password);
        await updatePassword(cred.user, resetPass.trim());
        await signOut(secondaryAuth);
      }
      try { await deleteApp(app); secondaryApp = null; } catch (_) {}
      await setDoc(doc(db, "_admin_users", record.uid), { ...record, password: resetPass.trim() });
      setResetTarget(null);
      setResetPass("");
      await loadUsers();
    } catch (err: any) {
      if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (_) {} }
      console.error("Reset failed:", err);
      alert("Reset password failed: " + err.message);
    }
    setResetting(false);
  };

  const handleSaveCohort = async (record: UserRecord) => {
    try {
      const updated = { ...record, cohort: editCohortValue.trim() || undefined };
      await setDoc(doc(db, "_admin_users", record.uid), updated);
      setEditingCohortUid(null);
      await loadUsers();
    } catch (err: any) {
      console.error("Failed to update cohort:", err);
      alert("Failed to update cohort: " + err.message);
    }
  };

  if (loading || !user || user.email?.toLowerCase() !== MASTER_EMAIL.toLowerCase()) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Cohort list for filter
  const allCohorts = [...new Set(users.map(u => u.cohort).filter(Boolean))] as string[];
  allCohorts.sort();

  // Filtered data
  const filteredUsers = selectedCohort === "all" ? users : users.filter(u => u.cohort === selectedCohort);
  const filteredParticipants = selectedCohort === "all" ? participants : participants.filter(p => p.user.cohort === selectedCohort);

  // Summary stats (from filtered)
  const completed = filteredParticipants.filter(p => p.status === "Completed").length;
  const inProgress = filteredParticipants.filter(p => p.status === "In Progress").length;
  const notStarted = filteredParticipants.filter(p => p.status === "Not Started").length;

  // Helper to get status for a user in the Users tab
  const getUserStatus = (u: UserRecord) => {
    const p = participants.find(pp => pp.user.uid === u.uid);
    return p?.status || "Not Started";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => router.push("/journey")} className="text-slate-400 hover:text-slate-600 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
<h1 className="text-2xl font-bold text-slate-900 tracking-tight">HEC Admin Dashboard</h1>
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">v9.0-hec</span>
            </div>
            <p className="text-sm text-slate-500 ml-8">Monitor participant progress and manage accounts.</p>
          </div>
          <button onClick={loadUsers} disabled={loadingUsers} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
            <RefreshCw className={clsx("h-4 w-4", loadingUsers && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Summary + Filter Row */}
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-semibold uppercase">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{filteredParticipants.length}</p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> {completed} Completed</span>
            <span className="text-slate-200">|</span>
            <span className="flex items-center gap-1 text-amber-600"><BarChart3 className="h-3.5 w-3.5" /> {inProgress} In Progress</span>
            <span className="text-slate-200">|</span>
            <span className="flex items-center gap-1 text-slate-400"><Circle className="h-3.5 w-3.5" /> {notStarted} Not Started</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            >
              <option value="all">All Cohorts</option>
              {allCohorts.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Tab Switcher + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-sm w-fit">
            <button
              onClick={() => setTab("progress")}
              className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-colors", tab === "progress" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-700")}
            >
              📊 Participant Progress
            </button>
            <button
              onClick={() => setTab("users")}
              className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-colors", tab === "users" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-700")}
            >
              👤 User Management
            </button>
          </div>
          {tab === "progress" && filteredParticipants.length > 0 && (
            <button
              onClick={() => setShowPulse(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
            >
              ⚡ Cohort Pulse
            </button>
          )}
        </div>

        {/* ═══ PROGRESS TAB ═══ */}
        {tab === "progress" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-slate-800">Participant Progress</h2>
              </div>
              <span className="text-xs text-slate-400">{filteredParticipants.length} participants</span>
            </div>

            {loadingProgress || loadingUsers ? (
              <div className="p-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" />
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p>No participants yet. Create users in the User Management tab.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredParticipants.map((p) => (
                  <div key={p.user.uid} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* User info */}
                      <div className="w-48 flex-shrink-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{p.user.name || p.portfolio?.myAnalysis?.ownerName || p.user.email.split("@")[0]}</p>
                        <p className="text-xs text-slate-400 truncate">{p.user.email}</p>
                        {p.user.cohort && <span className="inline-block mt-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">{p.user.cohort}</span>}
                      </div>

                      {/* Status badge */}
                      <span className={clsx(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0",
                        p.status === "Completed" && "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
                        p.status === "In Progress" && "bg-amber-50 text-amber-700 border border-amber-200/50",
                        p.status === "Not Started" && "bg-slate-100 text-slate-500 border border-slate-200/50",
                      )}>
                        {p.status === "Completed" && <CheckCircle2 className="h-3 w-3" />}
                        {p.status === "In Progress" && <BarChart3 className="h-3 w-3" />}
                        {p.status === "Not Started" && <Circle className="h-3 w-3" />}
                        {p.status}
                      </span>

                      {/* Progress bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={clsx(
                                "h-full rounded-full transition-all duration-500",
                                p.progress.percent === 100 ? "bg-emerald-500" : p.progress.percent > 0 ? "bg-amber-500" : "bg-slate-200"
                              )}
                              style={{ width: `${p.progress.percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-10 text-right">{p.progress.percent}%</span>
                        </div>

                        {/* Module breakdown dots */}
                        <div className="flex items-center gap-4 mt-1.5">
                          <ModuleDots label="BM" done={p.modules.businessModel.done} total={p.modules.businessModel.total} />
                          <ModuleDots label="5F" done={p.modules.fiveForces.done} total={p.modules.fiveForces.total} />
                          <ModuleDots label="VRIO" done={p.modules.vrio.done} total={p.modules.vrio.total} />
                          <ModuleDots label="SWOT" done={p.modules.swot.done} total={p.modules.swot.total} />
                        </div>
                      </div>

                      {/* Engagement Score */}
                      <EngagementBadge engagement={p.engagement} />

                      {/* Business name */}
                      <div className="w-32 flex-shrink-0 text-right">
                        {p.portfolio?.myAnalysis ? (
                          <p className="text-xs font-medium text-slate-600 truncate">{p.portfolio.myAnalysis.businessName}</p>
                        ) : (
                          <p className="text-xs text-slate-300 italic">No analysis</p>
                        )}
                        {p.portfolio?.shareCode && (
                          <p className="text-[10px] font-mono text-indigo-500 mt-0.5">Code: {p.portfolio.shareCode}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ USERS TAB ═══ */}
        {tab === "users" && (
          <>
            {/* Create User Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-slate-800">Create New User</h2>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                    <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="participant@company.com"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
                  </div>
                </div>
                <div className="flex gap-3 items-end">
                  <div className="w-48">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                    <input type="text" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="password123"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
                  </div>
                  <div className="w-48">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cohort</label>
                    <input type="text" value={newCohort} onChange={(e) => setNewCohort(e.target.value)}
                      placeholder="Cohort 2026"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
                  </div>
                  <button type="submit" disabled={creating}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
                  </button>
                </div>
              </form>
              {createMsg && (
                <div className={clsx("mt-3 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2",
                  createMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200")}>
                  {createMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {createMsg.text}
                </div>
              )}
            </div>

            {/* Bulk Import */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <h2 className="font-bold text-slate-800">Bulk Import Users</h2>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  <Download className="h-4 w-4" />
                  Download Excel Template
                </button>
                <div className="flex-1 relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleBulkImport}
                    disabled={importing}
                    className="hidden"
                    id="bulk-import-file"
                  />
                  <label htmlFor="bulk-import-file"
                    className={clsx(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors",
                      importing ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                    )}>
                    <Upload className="h-4 w-4" />
                    {importing ? "Importing..." : "Upload Excel File"}
                  </label>
                </div>
              </div>

              {/* Import Progress */}
              {importProgress && (
                <div className="mt-4 space-y-2">
                  {importProgress.total > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">{importProgress.current}/{importProgress.total}</span>
                    </div>
                  )}
                  {importProgress.current === importProgress.total && importProgress.total > 0 && (
                    <p className="text-sm text-emerald-700 font-medium">
                      ✓ Import complete: {importProgress.total - importProgress.errors.length} succeeded, {importProgress.errors.length} failed
                    </p>
                  )}
                  {importProgress.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-32 overflow-y-auto">
                      {importProgress.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                <Users className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-slate-800">Registered Users</h2>
                <span className="ml-auto text-xs text-slate-400 font-medium">{filteredUsers.length} users</span>
              </div>
              {loadingUsers ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-400"><p>No users found. Create one above.</p></div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">User</th>
                      <th className="px-6 py-3">Cohort</th>
                      <th className="px-6 py-3">Password</th>
                      <th className="px-6 py-3">Created</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((u) => {
                      const status = getUserStatus(u);
                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              {/* Status icon */}
                              {status === "Completed" && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                              {status === "In Progress" && <BarChart3 className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                              {status === "Not Started" && <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />}
                              <div>
                                {u.name && <p className="font-semibold text-slate-800 text-sm">{u.name}</p>}
                                <p className={clsx("text-slate-600", u.name ? "text-xs" : "font-medium")}>{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            {editingCohortUid === u.uid ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editCohortValue}
                                  onChange={(e) => setEditCohortValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveCohort(u); if (e.key === "Escape") setEditingCohortUid(null); }}
                                  autoFocus
                                  className="w-28 rounded-lg border border-indigo-300 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                                  placeholder="Cohort name"
                                />
                                <button onClick={() => handleSaveCohort(u)} className="text-emerald-600 hover:text-emerald-800"><Check className="h-3.5 w-3.5" /></button>
                                <button onClick={() => setEditingCohortUid(null)} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingCohortUid(u.uid); setEditCohortValue(u.cohort || ""); }}
                                className="group flex items-center gap-1 hover:bg-indigo-50 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
                              >
                                {u.cohort ? (
                                  <span className="text-xs font-medium text-indigo-600">{u.cohort}</span>
                                ) : (
                                  <span className="text-xs text-slate-300">—</span>
                                )}
                                <Pencil className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-3 text-slate-500 text-xs font-mono">{u.password || "—"}</td>
                          <td className="px-6 py-3 text-slate-500 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => { setResetTarget(u); setResetPass(""); }} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                                <Key className="h-3 w-3" /> Reset PW
                              </button>
                              <button onClick={() => setDeleteTarget(u)} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                                <Trash2 className="h-3 w-3" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Delete Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
              <h3 className="font-bold text-slate-900 mb-2">Delete User?</h3>
              <p className="text-sm text-slate-500 mb-4">Delete <strong>{deleteTarget.email}</strong>? This cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
                <button onClick={() => handleDelete(deleteTarget)} disabled={deleting} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-red-700 disabled:opacity-50">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {resetTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
              <h3 className="font-bold text-slate-900 mb-2">Reset Password</h3>
              <p className="text-sm text-slate-500 mb-4">Set a new password for <strong>{resetTarget.email}</strong></p>
              <input type="text" value={resetPass} onChange={(e) => setResetPass(e.target.value)}
                placeholder="New password"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none mb-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setResetTarget(null); setResetPass(""); }} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
                <button onClick={() => handleResetPassword(resetTarget)} disabled={resetting || !resetPass.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                  {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cohort Pulse Modal */}
      {showPulse && (
        <CohortPulse
          cohortName={selectedCohort === "all" ? "All Participants" : selectedCohort}
          participants={filteredParticipants.map(p => ({
            name: p.user.name || p.portfolio?.myAnalysis?.ownerName || p.user.email.split("@")[0],
            email: p.user.email,
            cohort: p.user.cohort,
            businessName: p.portfolio?.myAnalysis?.businessName,
            ownerRegion: p.portfolio?.myAnalysis?.ownerRegion,
            progressPercent: p.progress.percent,
            status: p.status,
            modules: p.modules,
            engagement: {
              totalUserMessages: p.engagement.totalUserMessages,
              modulesWithChat: p.engagement.modulesWithChat,
              score: p.engagement.score,
              label: p.engagement.label,
            },
          }))}
          onClose={() => setShowPulse(false)}
        />
      )}
    </div>
  );
}

// Small component for module progress dots
function ModuleDots({ label, done, total }: { label: string; done: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-slate-400 font-medium w-8">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              "h-1.5 w-1.5 rounded-full transition-colors",
              i < done ? "bg-emerald-500" : "bg-slate-200"
            )}
          />
        ))}
      </div>
    </div>
  );
}

// Engagement score badge with hover tooltip
function EngagementBadge({ engagement }: { engagement: EngagementMetrics }) {
  const [showDetail, setShowDetail] = useState(false);

  const colorMap = {
    "Ghost": { bg: "bg-slate-100", text: "text-slate-400", ring: "ring-slate-200", bar: "bg-slate-300" },
    "Surface": { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-200", bar: "bg-amber-400" },
    "Engaged": { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-200", bar: "bg-blue-500" },
    "Deep Thinker": { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200", bar: "bg-emerald-500" },
  };
  const colors = colorMap[engagement.label];

  return (
    <div className="relative w-20 flex-shrink-0">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className={clsx(
          "flex flex-col items-center gap-0.5 w-full rounded-xl px-2 py-1.5 ring-1 transition-all cursor-pointer hover:shadow-sm",
          colors.bg, colors.ring
        )}
      >
        <div className="flex items-center gap-1">
          <MessageSquare className={clsx("h-3 w-3", colors.text)} />
          <span className={clsx("text-sm font-bold", colors.text)}>{engagement.score}</span>
        </div>
        <span className={clsx("text-[9px] font-semibold leading-tight", colors.text)}>{engagement.label}</span>
        {/* Mini bar */}
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
          <div className={clsx("h-full rounded-full transition-all", colors.bar)} style={{ width: `${engagement.score}%` }} />
        </div>
      </button>

      {/* Detail popover */}
      {showDetail && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-56 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700">AI Coach Engagement</h4>
            <button onClick={() => setShowDetail(false)} className="text-slate-300 hover:text-slate-500">
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] mb-3">
            <div className="bg-slate-50 rounded-lg px-2 py-1.5">
              <p className="text-slate-400 text-[10px]">Messages</p>
              <p className="font-bold text-slate-700">{engagement.totalUserMessages}</p>
            </div>
            <div className="bg-slate-50 rounded-lg px-2 py-1.5">
              <p className="text-slate-400 text-[10px]">Avg Words</p>
              <p className="font-bold text-slate-700">{engagement.avgWordsPerMessage}</p>
            </div>
            <div className="bg-slate-50 rounded-lg px-2 py-1.5">
              <p className="text-slate-400 text-[10px]">Modules</p>
              <p className="font-bold text-slate-700">{engagement.modulesWithChat}/4</p>
            </div>
            <div className="bg-slate-50 rounded-lg px-2 py-1.5">
              <p className="text-slate-400 text-[10px]">Score</p>
              <p className={clsx("font-bold", colors.text)}>{engagement.score}/100</p>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Per Module</p>
          <div className="space-y-1">
            {engagement.perModule.map((m) => (
              <div key={m.moduleId} className="flex items-center gap-2 text-[11px]">
                <span className="w-10 text-slate-400 font-medium">{CHAT_MODULE_LABELS[m.moduleId]}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full", m.userMessages > 0 ? "bg-blue-400" : "bg-slate-200")}
                    style={{ width: `${Math.min(m.userMessages * 10, 100)}%` }}
                  />
                </div>
                <span className="text-slate-500 w-14 text-right">
                  {m.userMessages > 0 ? `${m.userMessages} msg` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
