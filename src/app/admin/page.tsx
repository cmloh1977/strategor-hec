"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, UserPlus, Trash2, Key, Loader2, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { initializeApp, deleteApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword, deleteUser, signOut } from "firebase/auth";
import { doc, setDoc, getDocs, collection, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MASTER_EMAIL = "chee_ming_loh@toyota-tsusho.com";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Helper: create a temporary second Firebase app instance
// so user creation doesn't log out the admin
function getSecondaryAuth() {
  const secondaryApp = initializeApp(firebaseConfig, "adminHelper");
  return { auth: getAuth(secondaryApp), app: secondaryApp };
}

interface UserRecord {
  email: string;
  uid: string;
  createdAt: string;
  password?: string; // stored for admin reference
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Create form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [resetPass, setResetPass] = useState("");
  const [resetting, setResetting] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!loading && (!user || user.email?.toLowerCase() !== MASTER_EMAIL.toLowerCase())) {
      router.replace("/");
    }
  }, [user, loading, router]);

  // Load user registry from Firestore
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
    } catch (e) {
      console.error("Failed to load users:", e);
    }
    setLoadingUsers(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) return;
    setCreating(true);
    setCreateMsg(null);

    let secondaryApp: any = null;
    try {
      // Use a SECONDARY Firebase app so the admin stays logged in
      const { auth: secondaryAuth, app } = getSecondaryAuth();
      secondaryApp = app;

      const result = await createUserWithEmailAndPassword(secondaryAuth, newEmail.trim(), newPassword.trim());
      
      // Sign out of the secondary app immediately
      await signOut(secondaryAuth);
      await deleteApp(app);
      secondaryApp = null;

      // Track in Firestore for listing
      const record: UserRecord = {
        email: newEmail.trim(),
        uid: result.user.uid,
        createdAt: new Date().toISOString(),
        password: newPassword.trim(),
      };
      await setDoc(doc(db, "_admin_users", result.user.uid), record);

      setCreateMsg({ type: "success", text: `✓ Created ${newEmail.trim()}` });
      setNewEmail("");
      setNewPassword("");
      await loadUsers();
    } catch (err: any) {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch (_) {}
      }
      let msg = err.message;
      if (err.code === "auth/email-already-in-use") msg = "A user with this email already exists.";
      if (err.code === "auth/invalid-email") msg = "Invalid email format.";
      if (err.code === "auth/weak-password") msg = "Password too weak. Use at least 6 characters.";
      setCreateMsg({ type: "error", text: msg });
    }
    setCreating(false);
  };

  const handleDelete = async (record: UserRecord) => {
    setDeleting(true);
    let secondaryApp: any = null;
    try {
      // Sign in as the user on a secondary app, then delete them
      const { auth: secondaryAuth, app } = getSecondaryAuth();
      secondaryApp = app;

      if (record.password) {
        const cred = await signInWithEmailAndPassword(secondaryAuth, record.email, record.password);
        await deleteUser(cred.user);
      }
      try { await deleteApp(app); secondaryApp = null; } catch (_) {}

      // Remove from Firestore registry
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

      // Update stored password
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

  if (loading || !user || user.email?.toLowerCase() !== MASTER_EMAIL.toLowerCase()) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => router.push("/journey")} className="text-slate-400 hover:text-slate-600 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin · User Management</h1>
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">v2.0</span>
            </div>
            <p className="text-sm text-slate-500 ml-8">Create and manage participant accounts for GALP.</p>
          </div>
          <button onClick={loadUsers} disabled={loadingUsers} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
            <RefreshCw className={clsx("h-4 w-4", loadingUsers && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Create User Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-red-600" />
            <h2 className="font-bold text-slate-800">Create New User</h2>
          </div>
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="participant@toyota-tsusho.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div className="w-48">
              <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
              <input
                type="text" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="password123"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <button
              type="submit" disabled={creating}
              className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
            </button>
          </form>
          {createMsg && (
            <div className={clsx(
              "mt-3 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2",
              createMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
            )}>
              {createMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {createMsg.text}
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <Users className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-800">Registered Users</h2>
            <span className="ml-auto text-xs text-slate-400 font-medium">{users.length} users</span>
          </div>

          {loadingUsers ? (
            <div className="p-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p>No users found. Create one above.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Password</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-medium text-slate-800">{u.email}</span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs font-mono">
                      {u.password || "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setResetTarget(u); setResetPass(""); }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                        >
                          <Key className="h-3 w-3" /> Reset PW
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
              <h3 className="font-bold text-slate-900 mb-2">Delete User?</h3>
              <p className="text-sm text-slate-500 mb-4">Are you sure you want to delete <strong>{deleteTarget.email}</strong>? This cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
                <button onClick={() => handleDelete(deleteTarget)} disabled={deleting} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
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
              <input
                type="text" value={resetPass} onChange={(e) => setResetPass(e.target.value)}
                placeholder="New password"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none mb-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
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
    </div>
  );
}
