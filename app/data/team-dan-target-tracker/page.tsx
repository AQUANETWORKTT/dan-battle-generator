"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Row = { creator_id?: string; creator_username?: string; "Creator's username"?: string; creator_network_manager?: string; manager_email?: string; stat_date?: string; data_period?: string; diamonds?: number; live_hours?: number; live_duration?: string; valid_days?: number; valid_live_days?: number };
type Target = { level: number; days: number; hours: number; diamonds: number };
type Stored = { targets: Record<string, Partial<Target>>; deleted: string[] };
type Creator = { username: string; days: number; hours: number; diamonds: number };
type MatureTotal = { creator_username?: string; diamonds?: number };

const LEVELS = [{ level: 1, days: 8, hours: 20 }, { level: 2, days: 11, hours: 30 }, { level: 3, days: 15, hours: 40 }, { level: 4, days: 18, hours: 60 }, { level: 5, days: 22, hours: 80 }] as const;
const DEFAULT: Target = { ...LEVELS[2], diamonds: 75000 };
const TIER_MINIMUMS = [1, 100000, 200000, 300000, 500000, 700000, 1000000, 1600000, 2500000, 5000000];
const KEY = "fc-dan-target-tracker-v1";
const currentMonth = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; };
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const username = (row: Row) => String(row.creator_username || row["Creator's username"] || "").trim().replace(/^@/, "").toLowerCase();
const creatorId = (row: Row) => String(row.creator_id || username(row)).trim().toLowerCase();
const liveHours = (row: Row) => row.live_hours != null ? number(row.live_hours) : number(String(row.live_duration || "").match(/(\d+(?:\.\d+)?)\s*h/i)?.[1]) + number(String(row.live_duration || "").match(/(\d+(?:\.\d+)?)\s*m/i)?.[1]) / 60;
const isDan = (row: Row) => [row.creator_network_manager, row.manager_email].join("").toLowerCase().replace(/[^a-z0-9]/g, "").includes("firstclassagencydan");
const isMonthTotal = (row: Row) => { const period = String(row.data_period || ""); return /^\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2}$/.test(period) && period.slice(0, 10) !== period.slice(-10); };
const paceClass = (pace: number) => pace >= 0.75 ? "border-emerald-300 bg-emerald-400/[.20]" : pace >= 0.5 ? "border-orange-400 bg-orange-500/[.20]" : "border-red-400 bg-red-500/[.18]";
const paceColour = (pace: number) => pace >= 0.75 ? "bg-emerald-300" : pace >= 0.5 ? "bg-orange-400" : "bg-red-400";

function Bar({ label, value, target, pace }: { label: string; value: number; target: number; pace: number }) {
  const completed = target ? Math.min(1, value / target) : 0;
  return <div><div className="mb-1 text-[10px] font-black uppercase text-white/70">{label}: {value.toLocaleString("en-GB", { maximumFractionDigits: 1 })} / {target.toLocaleString("en-GB")}</div><div className="h-2.5 overflow-hidden rounded-full bg-black/35"><div className={`h-full rounded-full ${paceColour(pace)}`} style={{ width: `${Math.round(completed * 100)}%` }} /></div></div>;
}

function DiamondBar({ value, target, maintenance, rankUp, pace }: { value: number; target: number; maintenance: number | null; rankUp: number | null; pace: number }) {
  const maximum = Math.max(1, target, maintenance || 0, rankUp || 0);
  const completed = Math.min(1, value / maximum);
  const grouped = new Map<number, string[]>();
  ([{ label: "T", value: target }, { label: "M", value: maintenance }, { label: "R", value: rankUp }] as const).forEach(marker => {
    if (!marker.value) return;
    grouped.set(marker.value, [...(grouped.get(marker.value) || []), marker.label]);
  });
  return <div><div className="mb-1 text-[10px] font-black uppercase text-white/70">Diamonds: {value.toLocaleString("en-GB")} / {target.toLocaleString("en-GB")}</div><div className="relative pt-5"><div className="relative h-3 overflow-hidden rounded-sm bg-black/35"><div className={`h-full ${paceColour(pace)}`} style={{ width: `${Math.round(completed * 100)}%` }} />{[...grouped.entries()].map(([markerValue, labels]) => { const position = Math.min(100, Math.max(0, markerValue / maximum * 100)); return <div key={markerValue} title={`${labels.join("/")} · ${markerValue.toLocaleString("en-GB")}`} className="absolute inset-y-0 z-10 w-px bg-white/90" style={{ left: `${position}%` }} />; })}</div>{[...grouped.entries()].map(([markerValue, labels]) => { const position = Math.min(100, Math.max(0, markerValue / maximum * 100)); return <div key={`label-${markerValue}`} title={`${labels.join("/")} · ${markerValue.toLocaleString("en-GB")}`} className="absolute top-0 z-20 -translate-x-1/2 text-[9px] font-black tracking-wide text-white" style={{ left: `${position}%` }}><span className="rounded bg-black/70 px-1">{labels.join("/")}</span><span className="absolute left-1/2 top-3 h-3 w-px -translate-x-1/2 bg-white/90" /></div>; })}</div></div>;
}

export default function Page() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stored, setStored] = useState<Stored>({ targets: {}, deleted: [] });
  const [sharedLoaded, setSharedLoaded] = useState(false);
  const [matureTotals, setMatureTotals] = useState<MatureTotal[]>([]);

  useEffect(() => { let active = true; let local: Stored = { targets: {}, deleted: [] }; try { const saved = JSON.parse(localStorage.getItem(KEY) || "{}"); local = { targets: saved.targets || {}, deleted: Array.isArray(saved.deleted) ? saved.deleted : [] }; } catch {} fetch("/api/data/team-target-tracker", { cache: "no-store" }).then(async response => { const body = await response.json(); if (!response.ok) throw Error(body.error || "Could not load shared targets."); if (body.settings) return body.settings as Stored; await fetch("/api/data/team-target-tracker", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(local) }); return local; }).then(settings => { if (active) setStored(settings); }).catch(e => active && setError(e.message)).finally(() => active && setSharedLoaded(true)); return () => { active = false; }; }, []);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(stored)), [stored]);
  useEffect(() => {
    if (!sharedLoaded) return;
    let active = true;
    const refreshShared = async () => {
      try {
        const response = await fetch("/api/data/team-target-tracker", { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw Error(body.error || "Could not refresh shared targets.");
        if (active && body.settings) setStored(body.settings as Stored);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not refresh shared targets.");
      }
    };
    const timer = window.setInterval(() => void refreshShared(), 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [sharedLoaded]);
  useEffect(() => { let active = true; setLoading(true); fetch(`/api/data-analysis/daily-stats?month=${month}&t=${Date.now()}`).then(async response => { const body = await response.json(); if (!response.ok) throw Error(body.error || "Could not load data"); if (active) setRows(body.rows || []); }).catch(e => active && setError(e.message)).finally(() => active && setLoading(false)); return () => { active = false; }; }, [month]);

  const previousMonth = useMemo(() => { const [year, monthNumber] = month.split("-").map(Number); const date = new Date(year, monthNumber - 2, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }, [month]);
  useEffect(() => { let active = true; fetch(`/api/data/mature-creators/month-totals?month=${previousMonth}`, { cache: "no-store" }).then(async response => { const body = await response.json(); if (!response.ok) throw Error(body.error || "Could not load maintenance targets."); if (active) setMatureTotals(body.rows || []); }).catch(e => active && setError(e.message)); return () => { active = false; }; }, [previousMonth]);

  const asOf = useMemo(() => rows.reduce((latest, row) => String(row.stat_date || "") > latest ? String(row.stat_date) : latest, ""), [rows]);
  const monthProgress = useMemo(() => {
    const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const progressDay = month === currentMonthKey ? now.getDate() : Number(asOf.slice(-2)) || daysInMonth;
    return Math.min(1, progressDay / daysInMonth);
  }, [month, asOf]);
  const creators = useMemo(() => { const grouped = new Map<string, Row[]>(); for (const row of rows) { const id = creatorId(row); if (id) grouped.set(id, [...(grouped.get(id) || []), row]); } return [...grouped.values()].flatMap((group): Creator[] => { const latest = group.find(row => row.stat_date === asOf); if (!latest || !isDan(latest) || !username(latest)) return []; const monthTotal = [...group].sort((a, b) => String(b.stat_date).localeCompare(String(a.stat_date))).find(isMonthTotal); const daily = group.filter(row => !isMonthTotal(row)); const hours = monthTotal ? liveHours(monthTotal) : daily.reduce((sum, row) => sum + liveHours(row), 0); const diamonds = monthTotal ? number(monthTotal.diamonds) : daily.reduce((sum, row) => sum + number(row.diamonds), 0); const declaredDays = monthTotal ? number(monthTotal.valid_days ?? monthTotal.valid_live_days) : 0; const days = declaredDays || daily.reduce((sum, row) => sum + (number(row.valid_days ?? row.valid_live_days) || (liveHours(row) >= 1 ? 1 : 0)), 0); return [{ username: username(latest), days, hours, diamonds }]; }); }, [rows, asOf]);
  const previousDiamonds = useMemo(() => new Map(matureTotals.map(row => [String(row.creator_username || "").trim().replace(/^@/, "").toLowerCase(), number(row.diamonds)])), [matureTotals]);

  const target = (name: string): Target => { const saved = stored.targets[`${month}:${name}`] || {}; const level = LEVELS.find(item => item.level === Number(saved.level)) || LEVELS[2]; return { level: level.level, days: level.days, hours: level.hours, diamonds: Math.max(0, number(saved.diamonds || DEFAULT.diamonds)) }; };
  const ranked = useMemo(() => creators.map(creator => { const t = target(creator.username); const dayPace = monthProgress ? creator.days / (t.days * monthProgress) : 0; const hourPace = monthProgress ? creator.hours / (t.hours * monthProgress) : 0; const diamondPace = monthProgress ? creator.diamonds / (t.diamonds * monthProgress) : 0; const priorTotal = previousDiamonds.get(creator.username) || 0; const tierIndex = TIER_MINIMUMS.reduce((current, minimum, index) => priorTotal >= minimum ? index : current, -1); const maintenance = priorTotal >= 200000 && tierIndex >= 0 ? TIER_MINIMUMS[tierIndex] : null; const rankUp = maintenance && tierIndex < TIER_MINIMUMS.length - 1 ? TIER_MINIMUMS[tierIndex + 1] : null; return { ...creator, t, dayPace, hourPace, diamondPace, pace: (dayPace + hourPace + diamondPace) / 3, maintenance, rankUp }; }).sort((a, b) => b.diamonds - a.diamonds), [creators, stored, month, monthProgress, previousDiamonds]);
  const saveShared = (next: Stored) => { setStored(next); localStorage.setItem(KEY, JSON.stringify(next)); if (!sharedLoaded) return; fetch("/api/data/team-target-tracker", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).then(async response => { const body = await response.json(); if (!response.ok) throw Error(body.error || "Could not save shared targets."); return body.settings as Stored; }).then(settings => setStored(settings)).catch(e => setError(e.message)); };
  const setLevel = (name: string, level: number) => { const preset = LEVELS.find(item => item.level === level) || LEVELS[2]; saveShared({ ...stored, targets: { ...stored.targets, [`${month}:${name}`]: { ...target(name), level: preset.level, days: preset.days, hours: preset.hours } } }); };
  const setDiamonds = (name: string, diamonds: string) => saveShared({ ...stored, targets: { ...stored.targets, [`${month}:${name}`]: { ...target(name), diamonds: Math.max(0, number(diamonds)) } } });
  const active = ranked.filter(creator => !stored.deleted.includes(creator.username));
  const removed = ranked.filter(creator => stored.deleted.includes(creator.username));

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-end justify-between gap-5"><div><Link href="/data/menu" className="text-xs font-black uppercase tracking-widest text-yellow-200">&larr; Data Space</Link><p className="mt-7 text-xs font-black uppercase tracking-[.25em] text-sky-200">First Class Agency_Dan</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-5xl uppercase">Target <span className="text-yellow-300">Tracker</span></h1><p className="mt-3 text-sm text-white/55">Monthly targets, ordered by current diamonds.</p></div><label className="text-xs font-black uppercase text-white/55">Calendar month<input type="month" value={month} onChange={e => setMonth(e.target.value)} className="mt-2 block rounded-xl border border-white/20 bg-black px-4 py-3 text-white" /></label></header>{error && <p className="mt-6 rounded-xl bg-red-500/15 p-4 text-red-100">{error}</p>}<p className="mt-8 text-xs font-black uppercase tracking-widest text-yellow-100/70">{loading ? "Loading creators..." : `${active.length} active creators - ${asOf || "latest upload"}`}</p><section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map(creator => <article key={creator.username} className={`rounded-3xl border p-5 ${paceClass(creator.pace)}`}><div className="flex justify-between gap-3"><h2 className="font-black">@{creator.username}</h2><button onClick={() => saveShared({ ...stored, deleted: [...new Set([...stored.deleted, creator.username])] })} className="text-xs font-black uppercase text-red-200">Remove</button></div><div className="mt-5 space-y-4"><Bar label="Days" value={creator.days} target={creator.t.days} pace={creator.dayPace} /><Bar label="Hours" value={creator.hours} target={creator.t.hours} pace={creator.hourPace} /><DiamondBar value={creator.diamonds} target={creator.t.diamonds} maintenance={creator.maintenance} rankUp={creator.rankUp} pace={creator.diamondPace} /></div><div className="mt-5 grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-3 border-t border-white/10 pt-4"><label className="text-[10px] font-black uppercase text-white/55">Level<select value={creator.t.level} onChange={e => setLevel(creator.username, number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 px-2 py-2 text-sm text-white">{LEVELS.map(level => <option key={level.level} value={level.level}>Level {level.level}: {level.days} days / {level.hours} hours</option>)}</select></label><label className="text-[10px] font-black uppercase text-white/55">Diamonds<input type="number" min="0" value={creator.t.diamonds} onChange={e => setDiamonds(creator.username, e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 px-2 py-2 text-sm text-white" /></label></div></article>)}</section><section className="mt-8 rounded-3xl border border-white/15 bg-white/[.035] p-5"><h2 className="font-[family-name:var(--font-norwester)] text-2xl uppercase text-yellow-200">Removed creators</h2><div className="mt-4 flex flex-wrap gap-3">{removed.length ? removed.map(creator => <div key={creator.username} className="flex items-center gap-3 rounded-xl border border-white/15 px-3 py-2"><span>@{creator.username}</span><button onClick={() => saveShared({ ...stored, deleted: stored.deleted.filter(name => name !== creator.username) })} className="rounded-lg bg-yellow-300 px-2 py-1 text-xs font-black text-black">Recover</button></div>) : <p className="text-sm text-white/45">No creators have been removed.</p>}</div></section></div></main></DataAccessGuard>;
}
