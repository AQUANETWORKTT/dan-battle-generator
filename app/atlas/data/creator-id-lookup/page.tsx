"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import DataAccessGuard from "@/app/atlas/AtlasGuard";

type StatRow = Record<string, unknown>;
type LookupResult = { creatorId: string; username: string; manager: string; group?: string; joinedDate: string; count: number; nameHistory: {username:string;firstSeen:string;lastSeen:string}[]; timeline: {date:string;title:string;detail:string}[]; rows: StatRow[] };

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function CreatorIdLookupPage() {
  const [creatorId, setCreatorId] = useState("");
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [accounts, setAccounts] = useState<{creatorId:string;username:string}[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setAccounts([]);

    try {
      const response = await fetch(`/api/atlas/data-analysis/creator-lookup?creatorId=${encodeURIComponent(creatorId.trim())}&username=${encodeURIComponent(username.trim())}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not look up that creator.");
      if (payload.accounts) setAccounts(payload.accounts);
      else setResult(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not look up that creator.");
    } finally {
      setLoading(false);
    }
  }

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-6 text-white sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl">
    <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><Link href="/atlas/leadership" className="font-[family-name:var(--font-norwester)] text-lg uppercase tracking-wide text-yellow-300">← Data Space</Link></nav>
    <section className="mt-10 max-w-3xl rounded-[28px] border border-sky-300/25 bg-gradient-to-br from-sky-300/15 via-sky-300/[0.04] to-transparent p-6 sm:p-9"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-200">Creator Intelligence</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-4xl uppercase leading-none sm:text-6xl">Creator ID <span className="text-sky-300">Lookup</span></h1><p className="mt-4 max-w-2xl leading-relaxed text-white/65">Enter either a username or Creator ID. Search any recorded username to find its Creator ID, then explore its full saved history, name changes and management timeline.</p>
      <form onSubmit={search} className="mt-7 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input value={username} onChange={(event) => { setUsername(event.target.value.trim()); setCreatorId(""); }} placeholder="Username, e.g. lil_dumps" className="min-w-0 rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-sky-300" /><input value={creatorId} onChange={(event) => { setCreatorId(event.target.value.replace(/\s/g, "")); setUsername(""); }} inputMode="numeric" placeholder="Creator ID" className="min-w-0 rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-sky-300" /><button type="submit" disabled={loading} className="rounded-xl bg-sky-300 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black disabled:opacity-50">{loading ? "Searching…" : "Search"}</button></form>
      {error ? <p className="mt-4 rounded-xl border border-rose-300/35 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
    </section>
    {accounts.length > 0 && <section className="mt-6 rounded-2xl border border-sky-300/25 p-5"><p>This username appears against multiple accounts. Select a Creator ID, then press Search.</p><div className="mt-3 flex flex-wrap gap-3">{accounts.map(account => <button key={account.creatorId} onClick={() => { setCreatorId(account.creatorId); setUsername(""); }} className="rounded-xl border border-sky-300/30 p-3 font-mono text-sm">{account.creatorId}</button>)}</div></section>}
    {result ? <section className="mt-7"><div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Matching account</p><h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase text-sky-200">{result.username || "Username unavailable"}</h2><p className="mt-2 font-mono text-sm text-white/60">Creator ID: {result.creatorId || "Not recorded in saved history"}</p><div className="mt-4 flex flex-wrap gap-3 text-sm"><p className="rounded-lg border border-white/10 bg-black/25 px-3 py-2"><span className="text-white/45">Manager: </span><strong>{result.manager || "Not recorded"}</strong></p><p className="rounded-lg border border-white/10 bg-black/25 px-3 py-2"><span className="text-white/45">Group: </span><strong>{result.group || "Not recorded"}</strong></p><p className="rounded-lg border border-white/10 bg-black/25 px-3 py-2"><span className="text-white/45">Joined: </span><strong>{result.joinedDate || "Not available"}</strong></p></div></div><p className="rounded-full border border-sky-300/25 bg-sky-300/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-sky-100">{result.count} saved daily record{result.count === 1 ? "" : "s"}</p></div>
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_2fr]"><section className="rounded-2xl border border-sky-300/25 bg-sky-300/5 p-5"><h3 className="text-xl font-bold text-sky-200">Name history</h3><div className="mt-4 space-y-3">{result.nameHistory.map(name => <div key={name.username.toLowerCase()} className="rounded-xl border border-white/10 p-3"><b className="break-all">@{name.username}</b><p className="mt-1 text-xs text-white/50">First seen {name.firstSeen}<br/>Last seen {name.lastSeen}</p></div>)}</div></section><section className="rounded-2xl border border-sky-300/25 p-5"><h3 className="text-xl font-bold text-sky-200">Creator timeline</h3><p className="mt-2 text-sm text-white/50">Changes are dated by the first saved upload showing them. Gaps between uploads may hide the exact change date.</p><ol className="mt-5 space-y-5 border-l border-sky-300/30 pl-5">{result.timeline.map((event,index) => <li key={index}><p className="text-xs font-bold text-sky-300">{event.date}</p><h4 className="mt-1 font-bold">{event.title}</h4><p className="mt-1 break-words text-sm text-white/65">{event.detail}</p></li>)}</ol></section></div><h3 className="mt-8 text-xl font-bold text-sky-200">Daily upload history</h3>
      {!result.rows.length ? <p className="mt-5 rounded-2xl border border-dashed border-white/15 p-6 text-white/60">No saved daily records were found for this username or Creator ID.</p> : <div className="mt-5 space-y-3">{result.rows.map((row, index) => <details key={String(row.id || `${row.stat_date}-${index}`)} className="group rounded-2xl border border-white/10 bg-white/[0.035] open:border-sky-300/25"><summary className="cursor-pointer list-none px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="font-mono text-sm text-sky-200">{displayValue(row.stat_date)}</span><span className="ml-3 text-sm text-white/55">{displayValue(row.data_period)}</span></div><div className="flex gap-4 text-xs font-black uppercase tracking-wider text-white/65"><span>{displayValue(row.diamonds)} diamonds</span><span>{displayValue(row.live_duration)}</span></div></div></summary><div className="border-t border-white/10 p-5"><dl className="grid gap-x-7 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(row).map(([key, value]) => <div key={key}><dt className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">{key.replace(/_/g, " ")}</dt><dd className="mt-1 break-words font-mono text-sm text-white/80">{displayValue(value)}</dd></div>)}</dl></div></details>)}</div>}
    </section> : null}
  </div></main></DataAccessGuard>;
}
