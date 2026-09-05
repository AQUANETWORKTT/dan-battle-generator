"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

const TARGET_LEVELS = [
  { label: "2% TARGET", level: 2, monthlyTotal: 35521407 }, { label: "3% TARGET", level: 3, monthlyTotal: 38058650 }, { label: "4% TARGET", level: 4, monthlyTotal: 40595893 }, { label: "5% TARGET", level: 5, monthlyTotal: 43133137 }, { label: "7% TARGET", level: 7, monthlyTotal: 45670380 }, { label: "8% TARGET", level: 8, monthlyTotal: 48207623 }, { label: "9% TARGET", level: 9, monthlyTotal: 50744866 }, { label: "10% TARGET", level: 10, monthlyTotal: 53282110 }, { label: "11% TARGET", level: 11, monthlyTotal: 55819353 }, { label: "12% TARGET", level: 12, monthlyTotal: 58356596 }, { label: "13% TARGET", level: 13, monthlyTotal: 60893840 }, { label: "14% TARGET", level: 14, monthlyTotal: 63431083 }, { label: "15% TARGET", level: 15, monthlyTotal: 65968326 },
];
const DAYS_IN_MONTH = 30;

type SavedEntry = { day: number; diamonds: number; prediction: number; targetLabel: string; savedAt: string };

const formatDiamonds = (value: number) => new Intl.NumberFormat("en-GB").format(Math.max(0, Math.round(value)));
function parseDiamonds(value: string) { const cleaned = value.trim().toLowerCase().replace(/,/g, ""); const multiplier = cleaned.endsWith("m") ? 1_000_000 : cleaned.endsWith("k") ? 1_000 : 1; const numeric = Number.parseFloat(cleaned.replace(/[mk]$/, "")); return Number.isFinite(numeric) ? numeric * multiplier : 0; }
function chartLevel(value: number) { return value <= 5 ? value : value - 1; }

export default function IncrementalDataTrackingPage() {
  const [day, setDay] = useState(() => Math.min(DAYS_IN_MONTH, Math.max(1, new Date().getDate() - 1)));
  const [diamondInput, setDiamondInput] = useState("");
  const [previewInput, setPreviewInput] = useState("");
  const [history, setHistory] = useState<SavedEntry[]>([]);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [status, setStatus] = useState("LOADING SAVED DAYS...");
  const actualDiamonds = parseDiamonds(previewInput);
  const previewReady = diamondInput === previewInput;

  const targetRows = useMemo(() => TARGET_LEVELS.map((target) => ({ ...target, dayTarget: Math.round((target.monthlyTotal / DAYS_IN_MONTH) * day) })), [day]);
  const currentIndex = useMemo(() => actualDiamonds ? Math.max(0, targetRows.reduce((latest, row, index) => actualDiamonds >= row.dayTarget ? index : latest, -1)) : -1, [actualDiamonds, targetRows]);
  const currentTarget = currentIndex >= 0 ? targetRows[currentIndex] : null;
  const nearbyTargets = useMemo(() => { if (currentIndex < 0) return []; const first = Math.min(Math.max(0, currentIndex - 1), Math.max(0, targetRows.length - 3)); return targetRows.slice(first, first + 3); }, [currentIndex, targetRows]);
  const prediction = useMemo(() => {
    if (!actualDiamonds) return 0;
    if (actualDiamonds <= targetRows[0].dayTarget) return Math.max(0, actualDiamonds / targetRows[0].dayTarget * targetRows[0].level);
    for (let index = 1; index < targetRows.length; index += 1) { const lower = targetRows[index - 1], upper = targetRows[index]; if (actualDiamonds <= upper.dayTarget) return lower.level + ((actualDiamonds - lower.dayTarget) / (upper.dayTarget - lower.dayTarget)) * (upper.level - lower.level); }
    const last = targetRows.at(-1)!, beforeLast = targetRows.at(-2)!;
    return last.level + ((actualDiamonds - last.dayTarget) / (last.dayTarget - beforeLast.dayTarget)) * (last.level - beforeLast.level);
  }, [actualDiamonds, targetRows]);

  useEffect(() => { void (async () => { const response = await fetch("/api/data/incremental-tracking", { cache: "no-store" }); const data = await response.json(); if (!response.ok) return setStatus(data.error || "COULD NOT LOAD SAVED DAYS."); const entries = data.entries || []; setHistory(entries); const latest = entries.at(-1) as SavedEntry | undefined; if (latest) { setDay(latest.day); setDiamondInput(String(latest.diamonds)); setPreviewInput(String(latest.diamonds)); } setStatus("SAVED DAILY HISTORY"); })(); }, []);
  useEffect(() => { if (diamondInput === previewInput) return; const timer = window.setTimeout(() => setPreviewInput(diamondInput), 1000); return () => window.clearTimeout(timer); }, [diamondInput, previewInput]);

  function chooseDay(nextDay: number) {
    setDay(nextDay);
    const saved = history.find((entry) => entry.day === nextDay);
    const value = saved ? String(saved.diamonds) : "";
    setDiamondInput(value);
    setPreviewInput(value);
  }
  async function saveDay() {
    if (!previewReady) return setStatus("WAITING FOR THE 1-SECOND PREVIEW.");
    if (!actualDiamonds || !currentTarget) return;
    const entry: SavedEntry = { day, diamonds: actualDiamonds, prediction, targetLabel: currentTarget.label, savedAt: new Date().toISOString() };
    const next = [...history.filter((saved) => saved.day !== day), entry].sort((a, b) => a.day - b.day);
    setHistory(next); setStatus("SAVING DAY...");
    const response = await fetch("/api/data/incremental-tracking", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries: next }) }); const data = await response.json();
    if (!response.ok) return setStatus(data.error || "COULD NOT SAVE DAY.");
    setHistory(data.entries || next); setStatus(`DAY ${day} SAVED.`);
  }

  const latestSaved = history.at(-1) || null;
  const chartPoints = history.map((entry) => ({ ...entry, x: 52 + ((entry.day - 1) / (DAYS_IN_MONTH - 1)) * 864, y: 440 - Math.min(14, Math.max(0, chartLevel(entry.prediction))) / 14 * 390 }));
  const hoveredEntry = chartPoints.find((point) => point.day === hoveredDay) || null;
  const savedChart = <section className="mt-7 rounded-3xl border border-white/15 bg-white/[.035] p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.24em] text-yellow-200">SAVED MOVEMENT</p><h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase">INCREMENTAL <span className="text-yellow-300">CHART</span></h2></div><div className="text-right"><p className="text-xs font-black uppercase tracking-widest text-white/45">{status}</p>{hoveredEntry && <p className="mt-2 text-sm font-black text-yellow-100">DAY {hoveredEntry.day} · {formatDiamonds(hoveredEntry.diamonds)} · {hoveredEntry.prediction.toFixed(2)}%</p>}</div></div>{history.length ? <div className="mt-6 overflow-x-auto"><svg viewBox="0 0 960 490" onMouseMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width * 960; const nearest = chartPoints.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best); setHoveredDay(nearest.day); }} onMouseLeave={() => setHoveredDay(null)} className="min-w-[700px] w-full cursor-crosshair"><defs><linearGradient id="incremental-line" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#facc15"/><stop offset="1" stopColor="#67e8f9"/></linearGradient></defs>{[1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((level) => { const y = 440 - chartLevel(level) / 14 * 390; return <g key={level}><line x1="52" x2="916" y1={y} y2={y} stroke={level % 5 === 0 ? "rgba(250,204,21,.30)" : "rgba(255,255,255,.10)"} strokeDasharray="4 6"/><text x="14" y={y + 5} fill={level % 5 === 0 ? "rgba(250,204,21,.90)" : "rgba(255,255,255,.52)"} fontSize="12" fontWeight="800">{level}%</text></g>; })}<line x1="52" x2="916" y1="440" y2="440" stroke="rgba(250,204,21,.4)"/>{chartPoints.length > 1 && <polyline points={chartPoints.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="url(#incremental-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>}{chartPoints.map((point) => <g key={point.day}><circle cx={point.x} cy={point.y} r={hoveredDay === point.day ? "8" : "4.5"} fill="#facc15" stroke="#080806" strokeWidth="2"/><text x={point.x} y="466" textAnchor="middle" fill="rgba(255,255,255,.65)" fontSize="11" fontWeight="800">D{point.day}</text><title>DAY {point.day}: {formatDiamonds(point.diamonds)} · {point.prediction.toFixed(2)}%</title></g>)}</svg></div> : <p className="mt-6 rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm font-bold text-white/45">SAVE A DAY TO START YOUR MOVEMENT CHART.</p>}</section>;

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-center justify-between gap-4"><Link href="/data/menu" className="text-xs font-black uppercase tracking-[.18em] text-yellow-200">← DATA SPACE</Link><p className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.18em] text-yellow-100">SEPTEMBER 2026 TARGET LADDER</p></header>
    <section className="mt-10 rounded-[32px] border border-yellow-300/30 bg-[radial-gradient(circle_at_90%_0%,rgba(250,204,21,.16),transparent_32%),linear-gradient(135deg,rgba(250,204,21,.08),rgba(0,0,0,.75))] p-6 sm:p-9"><p className="text-xs font-black uppercase tracking-[.28em] text-yellow-200">INCREMENTAL PREDICTION</p><h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase leading-none sm:text-7xl">INCREMENTAL <span className="text-yellow-300">DATA TRACKING</span></h1><p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65">Choose a day and enter the month-to-date diamonds after the Backstage update. Saved days stay in the chart below.</p><div className="mt-8 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]"><label className="rounded-2xl border border-white/15 bg-black/45 p-4 text-xs font-black uppercase tracking-widest text-yellow-100">DAY OF SEPTEMBER<select value={day} onChange={(event) => chooseDay(Number(event.target.value))} className="mt-3 w-full cursor-pointer rounded-xl border border-yellow-300/35 bg-black px-4 py-3 text-lg font-black text-white">{Array.from({ length: 30 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>DAY {value}</option>)}</select></label><label className="rounded-2xl border border-yellow-300/35 bg-black/45 p-4 text-xs font-black uppercase tracking-widest text-yellow-100">MONTH-TO-DATE DIAMONDS<input value={diamondInput} onChange={(event) => setDiamondInput(event.target.value)} inputMode="decimal" placeholder="E.G. 7,500,000 OR 7.5M" className="mt-3 w-full rounded-xl border border-yellow-300/40 bg-black px-4 py-3 text-xl font-black text-white placeholder:text-white/30" />{!previewReady && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-yellow-100/70">PREVIEW UPDATES ONE SECOND AFTER YOU STOP TYPING.</p>}</label></div></section>
    {diamondInput.trim() ? <><div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-4"><p className="text-xs font-black uppercase tracking-widest text-yellow-100">SAVE THIS AS DAY {day}&apos;S INCREMENTAL POSITION</p><button onClick={() => void saveDay()} disabled={!previewReady} className="rounded-xl bg-yellow-300 px-5 py-3 text-xs font-black uppercase text-black disabled:cursor-not-allowed disabled:opacity-45">SAVE DAY {day}</button></div><section className="mt-7 rounded-3xl border border-white/15 bg-white/[.035] p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.24em] text-yellow-200">DAY {day} NEAREST TARGETS</p><h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase">WHERE YOU ARE <span className="text-yellow-300">TODAY</span></h2></div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/45">LATEST SAVED TOTAL{latestSaved ? ` · DAY ${latestSaved.day}` : ""}</p><p className="mt-1 font-[family-name:var(--font-norwester)] text-2xl text-white">{latestSaved ? formatDiamonds(latestSaved.diamonds) : "—"}</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-3">{nearbyTargets.map((target) => { const active = target.label === currentTarget?.label; const difference = actualDiamonds - target.dayTarget; return <div key={target.label} className={`rounded-2xl border p-5 ${active ? "border-yellow-300 bg-yellow-300/15 shadow-[0_0_28px_rgba(250,204,21,.16)]" : "border-white/15 bg-black/30"}`}><p className={`text-xs font-black uppercase tracking-[.2em] ${active ? "text-yellow-200" : "text-white/45"}`}>{active ? "YOUR CURRENT PREDICTION" : "NEARBY TARGET"}</p><p className={`mt-3 font-[family-name:var(--font-norwester)] text-4xl ${active ? "text-yellow-300" : "text-white"}`}>{target.label}</p><p className="mt-5 text-xs font-black uppercase tracking-widest text-white/50">DAY {day} TARGET</p><p className="mt-1 text-2xl font-black text-white">{formatDiamonds(target.dayTarget)}</p><p className={`mt-4 text-sm font-black ${difference >= 0 ? "text-emerald-200" : "text-red-200"}`}>{difference >= 0 ? "+" : "−"}{formatDiamonds(Math.abs(difference))} {difference >= 0 ? "AHEAD" : "BEHIND"}</p></div>; })}</div></section></> : <section className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[.02] p-5 text-center text-sm font-bold text-white/45">DAY {day} IS READY FOR A NEW DIAMOND TOTAL. SAVED HISTORY IS STILL SHOWN BELOW.</section>}
    {savedChart}
  </div></main></DataAccessGuard>;
}
