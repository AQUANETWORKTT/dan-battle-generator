"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Scope = "direct" | "team";
type Sort = "username" | "hours" | "days" | "diamonds" | "diamondsPerHour" | "quality" | "lastLive";
type Decision = "KEEP" | "REVIEW" | "GO TO A MANAGER" | "AGE BAND" | "REMOVE" | "HIGH QUALITY BUT INACTIVE";
type Creator = { id: string; username: string; manager: string; scope: Scope; hours: number; days: number; diamonds: number; diamondsPerHour: number; lastLive: string; daysSinceLive: number | null; quality: number };
type Payload = { latestDate: string; startDate: string; decisions: Record<string, Decision>; creators: Creator[]; error?: string };
const options: Decision[] = ["KEEP", "REVIEW", "GO TO A MANAGER", "AGE BAND", "REMOVE", "HIGH QUALITY BUT INACTIVE"];
const format = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

function qualityTone(quality: number) { return quality >= 75 ? "text-emerald-200" : quality >= 50 ? "text-yellow-200" : quality >= 25 ? "text-orange-200" : "text-rose-200"; }
function qualityLabel(quality: number) { return quality >= 75 ? "HIGH QUALITY" : quality >= 50 ? "MEDIUM QUALITY" : quality >= 25 ? "LOW QUALITY" : "VERY LOW QUALITY"; }
function lastLiveText(creator: Creator) { return creator.lastLive ? `${creator.lastLive} · ${creator.daysSinceLive === 0 ? "LIVE YESTERDAY" : `${creator.daysSinceLive}D AGO`}` : "NO LIVE DATA"; }

export default function CreatorPerformanceReview() {
  const [data, setData] = useState<Payload | null>(null);
  const [scope, setScope] = useState<Scope>("direct");
  const [sort, setSort] = useState<Sort>("quality");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { fetch("/api/data-analysis/creator-performance-review", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw Error(body.error || "Could not load creator review."); setData(body); }).catch((error) => setData({ latestDate: "", startDate: "", decisions: {}, creators: [], error: error.message })); }, []);

  const creators = useMemo(() => {
    const term = query.trim().toLowerCase();
    const multiplier = direction === "asc" ? 1 : -1;
    return (data?.creators || []).filter((creator) => creator.scope === scope && (!term || creator.username.includes(term) || creator.manager.toLowerCase().includes(term))).sort((a, b) => {
      const left = sort === "username" ? a.username : sort === "lastLive" ? a.lastLive || "" : a[sort];
      const right = sort === "username" ? b.username : sort === "lastLive" ? b.lastLive || "" : b[sort];
      const comparison = typeof left === "string" && typeof right === "string" ? left.localeCompare(right) : Number(left) - Number(right);
      return comparison * multiplier || (b.quality - a.quality);
    });
  }, [data, scope, sort, direction, query]);
  const totals = useMemo(() => creators.reduce((summary, creator) => ({ hours: summary.hours + creator.hours, days: summary.days + creator.days, diamonds: summary.diamonds + creator.diamonds }), { hours: 0, days: 0, diamonds: 0 }), [creators]);
  const selectSort = (next: Sort) => { if (sort === next) setDirection((current) => current === "desc" ? "asc" : "desc"); else { setSort(next); setDirection(next === "username" ? "asc" : "desc"); } };
  const sortLabel = (column: Sort, label: string) => <button onClick={() => selectSort(column)} className="inline-flex items-center gap-1 text-left hover:text-white">{label}<span className={sort === column ? "text-yellow-300" : "text-white/25"}>{sort === column ? direction === "desc" ? "↓" : "↑" : "↕"}</span></button>;
  const setDecision = async (creator: Creator, decision: Decision) => {
    if (!data) return;
    setData({ ...data, decisions: { ...data.decisions, [creator.username]: decision } });
    setSaving(creator.username);
    try {
      const response = await fetch("/api/data-analysis/creator-performance-review", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creator: creator.username, decision }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error || "Could not save decision.");
      setData((current) => current ? { ...current, decisions: body.decisions } : current);
    } catch (error) {
      setData((current) => current ? { ...current, error: error instanceof Error ? error.message : "Could not save decision." } : current);
    } finally { setSaving(null); }
  };

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-4 py-7 text-white sm:px-8"><div className="mx-auto max-w-[1600px]">
    <Link href="/data/menu" className="text-xs font-black uppercase tracking-[.18em] text-yellow-200">← Data Space</Link>
    <header className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[.26em] text-sky-200/80">Rolling 30-day performance review</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-4xl uppercase sm:text-6xl">Creator <span className="text-yellow-300">Review</span></h1><p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/60">The current roster comes from the most recent daily upload. Quality uses the rolling 30 days ending on that upload: diamonds earned, live hours, regular valid live days, and recent activity. Diamonds per hour stays visible, but is not used as the quality score.</p></div><p className="rounded-2xl border border-yellow-300/30 bg-yellow-300/10 px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-yellow-100">{data?.latestDate ? <>Current roster: {data.latestDate}<br /><span className="text-white/55">Rolling data from {data.startDate}</span></> : "Loading review…"}</p></header>
    {data?.error ? <p className="mt-6 rounded-xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-100">{data.error}</p> : null}
    <section className="mt-8 grid gap-3 md:grid-cols-4"><Metric label="Creators shown" value={creators.length} /><Metric label="Two-month live hours" value={format.format(totals.hours)} /><Metric label="Valid live days" value={format.format(totals.days)} /><Metric label="Diamonds" value={format.format(totals.diamonds)} /></section>
    <section className="mt-7 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="flex rounded-xl border border-white/15 p-1"><button onClick={() => setScope("direct")} className={`rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wide ${scope === "direct" ? "bg-yellow-300 text-black" : "text-white/55"}`}>First Class Agency_Dan</button><button onClick={() => setScope("team")} className={`rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wide ${scope === "team" ? "bg-yellow-300 text-black" : "text-white/55"}`}>Team Dan / James</button></div><p className="text-[10px] font-black uppercase tracking-wide text-white/45">Click any table heading to sort.</p><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SEARCH CREATOR OR MANAGER" className="min-w-[230px] flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white placeholder:text-white/30" /></section>
    <section className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/[.025]"><div className="overflow-x-auto"><table className="w-full min-w-[1100px] border-collapse text-left"><thead className="bg-white/[.06] text-[10px] font-black uppercase tracking-[.14em] text-yellow-100"><tr><th className="px-5 py-4">#</th><th className="px-5 py-4">{sortLabel("username", "Creator / manager")}</th><th className="px-5 py-4 text-right">{sortLabel("hours", "Hours")}</th><th className="px-5 py-4 text-right">{sortLabel("days", "Days")}</th><th className="px-5 py-4 text-right">{sortLabel("diamonds", "Diamonds")}</th><th className="px-5 py-4 text-right">{sortLabel("diamondsPerHour", "Diamonds / hour")}</th><th className="px-5 py-4 text-right">{sortLabel("quality", "Quality")}</th><th className="px-5 py-4">{sortLabel("lastLive", "Last live")}</th><th className="px-5 py-4">Decision</th></tr></thead><tbody>{creators.map((creator, index) => { const inactiveOver30 = creator.daysSinceLive === null || creator.daysSinceLive > 30; return <tr key={creator.id} className={`border-t text-sm ${inactiveOver30 ? "border-red-400/55 bg-red-500/[.14] hover:bg-red-500/[.20]" : "border-white/[.07] hover:bg-yellow-300/[.035]"}`}><td className="px-5 py-4 font-black text-white/35">{index + 1}</td><td className="px-5 py-4"><strong className="block font-black uppercase text-white">@{creator.username}</strong><span className="mt-1 block text-[10px] uppercase tracking-wide text-white/40">{creator.manager || "Unassigned"}</span>{inactiveOver30 ? <span className="mt-2 inline-flex rounded-md border-2 border-red-200 bg-red-600 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-white shadow-[0_0_18px_rgba(239,68,68,.7)]">Inactive 30+ days</span> : null}</td><td className="px-5 py-4 text-right font-bold">{format.format(creator.hours)}</td><td className="px-5 py-4 text-right font-bold">{creator.days}</td><td className="px-5 py-4 text-right font-bold text-yellow-100">{format.format(creator.diamonds)}</td><td className="px-5 py-4 text-right font-bold">{format.format(creator.diamondsPerHour)}</td><td className={`px-5 py-4 text-right text-[10px] font-black uppercase tracking-wide ${qualityTone(creator.quality)}`}>{qualityLabel(creator.quality)}</td><td className={`px-5 py-4 text-[11px] font-black uppercase tracking-wide ${inactiveOver30 ? "text-red-100" : creator.daysSinceLive !== null && creator.daysSinceLive > 14 ? "text-rose-200" : "text-white/65"}`}>{lastLiveText(creator)}</td><td className="px-5 py-4"><select disabled={saving === creator.username} value={data?.decisions[creator.username] || ""} onChange={(event) => event.target.value && void setDecision(creator, event.target.value as Decision)} className="w-[210px] rounded-lg border border-yellow-300/35 bg-black px-3 py-2 text-[10px] font-black uppercase tracking-wide text-yellow-100 disabled:opacity-50"><option value="">Choose action…</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></td></tr>; })}{!creators.length && <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-white/45">{data ? "No creators match this view." : "Loading creator data…"}</td></tr>}</tbody></table></div></section>
  </div></main></DataAccessGuard>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><p className="text-[10px] font-black uppercase tracking-[.15em] text-white/45">{label}</p><p className="mt-2 text-2xl font-black text-yellow-100">{value}</p></article>; }
