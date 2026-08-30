"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type StatRow = Record<string, unknown>;
type LookupResult = { creatorId: string; username: string; count: number; rows: StatRow[] };

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function CreatorIdLookupPage() {
  const [creatorId, setCreatorId] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`/api/data-analysis/creator-lookup?creatorId=${encodeURIComponent(creatorId.trim())}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not look up that creator.");
      setResult(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not look up that creator.");
    } finally {
      setLoading(false);
    }
  }

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-6 text-white sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl">
    <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><Link href="/data/menu" className="font-[family-name:var(--font-norwester)] text-lg uppercase tracking-wide text-yellow-300">← Data Space</Link></nav>
    <section className="mt-10 max-w-3xl rounded-[28px] border border-sky-300/25 bg-gradient-to-br from-sky-300/15 via-sky-300/[0.04] to-transparent p-6 sm:p-9"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-200">Creator Intelligence</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-4xl uppercase leading-none sm:text-6xl">Creator ID <span className="text-sky-300">Lookup</span></h1><p className="mt-4 max-w-2xl leading-relaxed text-white/65">Enter a creator ID from a Tmash upload. This searches Supabase and shows the most recent 30 saved daily records for that exact account, even if the username has changed.</p>
      <form onSubmit={search} className="mt-7 flex flex-col gap-3 sm:flex-row"><input value={creatorId} onChange={(event) => setCreatorId(event.target.value.replace(/\s/g, ""))} inputMode="numeric" placeholder="Creator ID, e.g. 7550710802802704400" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-sky-300" /><button type="submit" disabled={loading} className="rounded-xl bg-sky-300 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black disabled:opacity-50">{loading ? "Searching…" : "Search"}</button></form>
      {error ? <p className="mt-4 rounded-xl border border-rose-300/35 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
    </section>
    {result ? <section className="mt-7"><div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Matching account</p><h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase text-sky-200">{result.username || "Username unavailable"}</h2><p className="mt-2 font-mono text-sm text-white/60">Creator ID: {result.creatorId}</p></div><p className="rounded-full border border-sky-300/25 bg-sky-300/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-sky-100">{result.count} most recent record{result.count === 1 ? "" : "s"}</p></div>
      {!result.rows.length ? <p className="mt-5 rounded-2xl border border-dashed border-white/15 p-6 text-white/60">No saved daily records were found for this Creator ID.</p> : <div className="mt-5 space-y-3">{result.rows.map((row, index) => <details key={String(row.id || `${row.stat_date}-${index}`)} className="group rounded-2xl border border-white/10 bg-white/[0.035] open:border-sky-300/25"><summary className="cursor-pointer list-none px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="font-mono text-sm text-sky-200">{displayValue(row.stat_date)}</span><span className="ml-3 text-sm text-white/55">{displayValue(row.data_period)}</span></div><div className="flex gap-4 text-xs font-black uppercase tracking-wider text-white/65"><span>{displayValue(row.diamonds)} diamonds</span><span>{displayValue(row.live_duration)}</span></div></div></summary><div className="border-t border-white/10 p-5"><dl className="grid gap-x-7 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(row).map(([key, value]) => <div key={key}><dt className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">{key.replace(/_/g, " ")}</dt><dd className="mt-1 break-words font-mono text-sm text-white/80">{displayValue(value)}</dd></div>)}</dl></div></details>)}</div>}
    </section> : null}
  </div></main></DataAccessGuard>;
}
