"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import clsx from "clsx";

interface Participant {
  id: string;
  name: string;
  email: string;
  status: "Completed" | "In Progress" | "Not Started";
  currentModule: string;
  lastActive: string;
}

// Dummy data for the prototype
const dummyData: Participant[] = [
  { id: "1", name: "Akihiro Tanaka", email: "akihiro.t@toyota-tsusho.com", status: "Completed", currentModule: "Strategic Options", lastActive: "2 min ago" },
  { id: "2", name: "Hiroshi Sato", email: "hiroshi.s@toyota-tsusho.com", status: "In Progress", currentModule: "Internal Analysis", lastActive: "1 hour ago" },
  { id: "3", name: "Kenzo Watanabe", email: "kenzo.w@toyota-tsusho.com", status: "In Progress", currentModule: "External Analysis", lastActive: "3 hours ago" },
  { id: "4", name: "Mariko Ito", email: "mariko.i@toyota-tsusho.com", status: "Not Started", currentModule: "-", lastActive: "Never" },
  { id: "5", name: "Yuki Nakamura", email: "yuki.n@toyota-tsusho.com", status: "In Progress", currentModule: "Business Model", lastActive: "1 day ago" },
  // ... Imagine 22 participants here
];

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>(dummyData);

  useEffect(() => {
    // Basic protection: In a real app, verify admin custom claim
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GALP Facilitator Dashboard</h1>
            <p className="text-slate-500 mt-2">Monitor progress of the 22 participants before the Paris module.</p>
          </div>
          <div className="flex space-x-4">
            <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
              <Users className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Total</p>
                <p className="text-lg font-bold text-slate-800">22</p>
              </div>
            </div>
            <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Completed</p>
                <p className="text-lg font-bold text-slate-800">1</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Participant</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Current Module</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{p.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                      p.status === "Completed" && "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
                      p.status === "In Progress" && "bg-amber-50 text-amber-700 border border-amber-200/50",
                      p.status === "Not Started" && "bg-slate-100 text-slate-600 border border-slate-200/50"
                    )}>
                      {p.status === "Completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {p.status === "In Progress" && <Clock className="h-3.5 w-3.5" />}
                      {p.status === "Not Started" && <AlertCircle className="h-3.5 w-3.5" />}
                      <span>{p.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {p.currentModule}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {p.lastActive}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium transition-colors">
                      <FileText className="h-4 w-4" />
                      <span>View Analysis</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
