"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type RecordItem = { username: string; creatorId?: string; groups?: string[]; managers?: string[]; daysSinceJoining?: number; createdAt?: string };

export default function Page() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [message, setMessage] = useState("");
  async function load() { const response = await fetch("/api/data-analysis/leave-requests", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setRecords(data.records || []); }
  useEffect(() => { void load().catch((error) => setMessage(error.message || "Could not load leave requests.")); }, []);
  async function remove(record: RecordItem) { if (!window.confirm(`Remove @${record.username} from Leave Requests?`)) return; const response = await fetch("/api/data-analysis/leave-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: record.username }) }); const data = await response.json(); if (!response.ok) { setMessage(data.error || "Could not remove leave request."); return; } setRecords(data.records || []); setMessage(`@${record.username} removed.`); }
  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white"><div className="mx-auto max-w-6xl"><Link href="/data/menu" className="text-xs font-black uppercase tracking-widest text-yellow-200">← Data Space</Link><p className="mt-10 text-xs font-black uppercase tracking-[.25em] text-yellow-200">Management</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-5xl uppercase">Leave <span className="text-yellow-300">Requests</span></h1><p className="mt-4 text-sm text-white/60">Creators detected as missing after 15 or more days with the agency.</p>{message ? <p className="mt-4 text-xs font-black uppercase text-yellow-200">{message}</p> : null}<section className="mt-8 space-y-3">{records.map((record) => <article key={record.username} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="flex items-start justify-between gap-4"><div><strong className="text-lg">@{record.username}</strong><p className="mt-1 text-sm text-white/55">{record.daysSinceJoining || 15} days with agency · {(record.groups || []).join(" → ") || "Group not recorded"}</p><p className="mt-1 text-xs text-white/40">{(record.managers || []).join(" → ") || "Manager not recorded"}</p></div><button onClick={() => void remove(record)} className="rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-[10px] font-black uppercase text-red-100">Remove</button></div></article>)}{!records.length ? <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/45">No leave requests recorded.</p> : null}</section></div></main></DataAccessGuard>;
}
