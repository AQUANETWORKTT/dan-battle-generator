"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Row = { creator_id?: string; creator_username?: string; "Creator's username"?: string; creator_network_manager?: string; manager_email?: string; stat_date?: string; data_period?: string; diamonds?: number; live_hours?: number; live_duration?: string; valid_days?: number; valid_live_days?: number };
type Target = { days: number; hours: number; diamonds: number };
type Stored = { targets: Record<string, Target>; deleted: string[] };
type Creator = { username: string; days: number; hours: number; diamonds: number };

const DEFAULT: Target = { days: 20, hours: 40, diamonds: 75000 };
const KEY = "fc-dan-target-tracker-v1";
const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const username = (r: Row) => String(r.creator_username || r["Creator's username"] || "").trim().replace(/^@/, "").toLowerCase();
const creatorId = (r: Row) => String(r.creator_id || username(r)).trim().toLowerCase();
const number = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
const liveHours = (r: Row) => r.live_hours != null ? number(r.live_hours) : number(String(r.live_duration || "").match(/(\d+(?:\.\d+)?)\s*h/i)?.[1]) + number(String(r.live_duration || "").match(/(\d+(?:\.\d+)?)\s*m/i)?.[1]) / 60;
const isDan = (r: Row) => [r.creator_network_manager, r.manager_email].join("").toLowerCase().replace(/[^a-z0-9]/g, "").includes("firstclassagencydan");
const isMonthTotal = (r: Row) => { const period = String(r.data_period || ""); return /^\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2}$/.test(period) && period.slice(0, 10) !== period.slice(-10); };

function paceClass(pace: number) { return pace >= 0.9 ? "border-emerald-300 bg-emerald-400/[.20]" : pace >= 0.5 ? "border-orange-400 bg-orange-500/[.20]" : "border-red-400 bg-red-500/[.18]"; }
function paceColour(pace: number) { return pace >= 0.9 ? "bg-emerald-300" : pace >= 0.5 ? "bg-orange-400" : "bg-red-400"; }

function Bar({ label, value, target, pace }: { label: string; value: number; target: number; pace: number }) {
  const actualPercent = target ? value / target * 100 : 0;
  return <div>
    <div className="mb-1 flex justify-between text-[10px] font-black uppercase text-white/70"><span>{label}: {value.toLocaleString("en-GB", { maximumFractionDigits: 1 })} / {target.toLocaleString("en-GB")}</span><span>{Math.round(pace * 100)}% pace</span></div>
    <div className="h-2.5 overflow-hidden rounded-full bg-black/35"><div className={`h-full rounded-full ${paceColour(pace)}`} style={{ width: `${Math.min(100, Math.round(pace * 100))}%` }} /></div>
    <p className="mt-1 text-[10px] text-white/55">{Math.round(actualPercent)}% of full-month target</p>
  </div>;
}

export default function Page() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stored, setStored] = useState<Stored>({ targets: {}, deleted: [] });

  useEffect(() => { try { const p = JSON.parse(localStorage.getItem(KEY) || "{}"); setStored({ targets: p.targets || {}, deleted: Array.isArray(p.deleted) ? p.deleted : [] }); } catch {} }, []);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(stored)), [stored]);
  useEffect(() => { let active = true; setLoading(true); fetch(`/api/data-analysis/daily-stats?month=${month}&t=${Date.now()}`).then(async r => { const j = await r.json(); if (!r.ok) throw Error(j.error || "Could not load data"); if (active) setRows(j.rows || []); }).catch(e => active && setError(e.message)).finally(() => active && setLoading(false)); return () => { active = false; }; }, [month]);

  const asOf = useMemo(() => rows.reduce((latest, row) => String(row.stat_date || "") > latest ? String(row.stat_date) : latest, ""), [rows]);
  const progress = useMemo(() => { const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate(); return Math.min(1, (Number(asOf.slice(-2)) || 0) / days); }, [month, asOf]);
  const creators = useMemo(() => {
    const grouped = new Map<string, Row[]>();
    for (const row of rows) { const id = creatorId(row); if (id) grouped.set(id, [...(grouped.get(id) || []), row]); }
    return [...grouped.values()].flatMap((group): Creator[] => {
      const latest = group.find(row => row.stat_date === asOf);
      if (!latest || !isDan(latest) || !username(latest)) return [];
      const monthTotal = [...group].sort((a, b) => String(b.stat_date).localeCompare(String(a.stat_date))).find(isMonthTotal);
      const daily = group.filter(row => !isMonthTotal(row));
      const hours = monthTotal ? liveHours(monthTotal) : daily.reduce((sum, row) => sum + liveHours(row), 0);
      const diamonds = monthTotal ? number(monthTotal.diamonds) : daily.reduce((sum, row) => sum + number(row.diamonds), 0);
      const declaredDays = monthTotal ? number(monthTotal.valid_days ?? monthTotal.valid_live_days) : 0;
      const days = declaredDays || daily.reduce((sum, row) => sum + (number(row.valid_days ?? row.valid_live_days) || (liveHours(row) >= 1 ? 1 : 0)), 0);
      return [{ username: username(latest), days, hours, diamonds }];
    });
  }, [rows, asOf]);

  const target = (name: string) => stored.targets[`${month}:${name}`] || DEFAULT;
  const paced = useMemo(() => creators.map(creator => {
    const t = target(creator.username);
    const dayPace = progress && t.days ? creator.days / (t.days * progress) : 0;
    const hourPace = progress && t.hours ? creator.hours / (t.hours * progress) : 0;
    const diamondPace = progress && t.diamonds ? creator.diamonds / (t.diamonds * progress) : 0;
    const totalPercent = (t.days ? creator.days / t.days * 100 : 0) + (t.hours ? creator.hours / t.hours * 100 : 0) + (t.diamonds ? creator.diamonds / t.diamonds * 100 : 0);
    return { ...creator, t, dayPace, hourPace, diamondPace, totalPercent, pace: progress ? totalPercent / (progress * 300) : 0 };
  }).sort((a, b) => b.pace - a.pace), [creators, stored, month, progress]);
  const update = (name: string, key: keyof Target, value: string) => setStored(s => ({ ...s, targets: { ...s.targets, [`${month}:${name}`]: { ...target(name), [key]: Math.max(0, number(value)) } } }));
  const active = paced.filter(creator => !stored.deleted.includes(creator.username));
  const removed = paced.filter(creator => stored.deleted.includes(creator.username));

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-5"><div><Link href="/data/menu" className="text-xs font-black uppercase tracking-widest text-yellow-200">&larr; Data Space</Link><p className="mt-7 text-xs font-black uppercase tracking-[.25em] text-sky-200">First Class Agency_Dan</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-5xl uppercase">Target <span className="text-yellow-300">Tracker</span></h1><p className="mt-3 text-sm text-white/55">Cards are ranked by combined pace across all three targets (300% total).</p></div><label className="text-xs font-black uppercase text-white/55">Calendar month<input type="month" value={month} onChange={e => setMonth(e.target.value)} className="mt-2 block rounded-xl border border-white/20 bg-black px-4 py-3 text-white" /></label></header>
    {error && <p className="mt-6 rounded-xl bg-red-500/15 p-4 text-red-100">{error}</p>}
    <p className="mt-8 text-xs font-black uppercase tracking-widest text-yellow-100/70">{loading ? "Loading creators..." : `${active.length} active creators — ${Math.round(progress * 300)}% combined target expected by ${asOf || "latest upload"}`}</p>
    <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map(creator => <article key={creator.username} className={`rounded-3xl border p-5 ${paceClass(creator.pace)}`}><div className="flex justify-between gap-3"><div><h2 className="font-black">@{creator.username}</h2><p className="text-xs font-black text-white/75">{Math.round(creator.totalPercent)}% / {Math.round(progress * 300)}% expected</p></div><button onClick={() => setStored(s => ({ ...s, deleted: [...new Set([...s.deleted, creator.username])]}))} className="text-xs font-black uppercase text-red-200">Remove</button></div><div className="mt-5 space-y-4"><Bar label="Days" value={creator.days} target={creator.t.days} pace={creator.dayPace} /><Bar label="Hours" value={creator.hours} target={creator.t.hours} pace={creator.hourPace} /><Bar label="Diamonds" value={creator.diamonds} target={creator.t.diamonds} pace={creator.diamondPace} /></div><div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">{([['days', 'Days'], ['hours', 'Hours'], ['diamonds', 'Diamonds']] as const).map(([key, label]) => <label key={key} className="text-[10px] font-black uppercase text-white/55">{label}<input type="number" min="0" value={creator.t[key]} onChange={e => update(creator.username, key, e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 px-2 py-2 text-sm text-white" /></label>)}</div></article>)}</section>
    <section className="mt-8 rounded-3xl border border-white/15 bg-white/[.035] p-5"><h2 className="font-[family-name:var(--font-norwester)] text-2xl uppercase text-yellow-200">Removed creators</h2><div className="mt-4 flex flex-wrap gap-3">{removed.length ? removed.map(creator => <div key={creator.username} className="flex items-center gap-3 rounded-xl border border-white/15 px-3 py-2"><span>@{creator.username}</span><button onClick={() => setStored(s => ({ ...s, deleted: s.deleted.filter(name => name !== creator.username) }))} className="rounded-lg bg-yellow-300 px-2 py-1 text-xs font-black text-black">Recover</button></div>) : <p className="text-sm text-white/45">No creators have been removed.</p>}</div></section>
  </div></main></DataAccessGuard>;
}
