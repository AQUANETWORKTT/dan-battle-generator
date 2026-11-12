"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

import {DEFAULT_AGENCY_TARGET,incrementalTargets,incrementalPrediction,parseAgencyTarget} from '@/lib/incremental-targets';

type Reconciliation={currentRosterDiamonds:number;retainedDiamonds:number;absentCreators:{username:string;diamonds:number;lastSeen:string}[]};
type SavedEntry = { day: number; diamonds: number; prediction: number; targetLabel: string; savedAt: string };

const formatDiamonds = (value: number) => new Intl.NumberFormat("en-GB").format(Math.max(0, Math.round(value)));
function parseDiamonds(value: string) { const cleaned = value.trim().toLowerCase().replace(/,/g, ""); const multiplier = cleaned.endsWith("m") ? 1_000_000 : cleaned.endsWith("k") ? 1_000 : 1; const numeric = Number.parseFloat(cleaned.replace(/[mk]$/, "")); return Number.isFinite(numeric) ? numeric * multiplier : 0; }
function chartLevel(value: number) { return value <= 5 ? value : value - 1; }
function previousDayDetails() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return {
    month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    day: date.getDate(),
    daysInMonth: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
  };
}
function monthLabel(month: string) { return new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }); }

export default function IncrementalDataTrackingPage() {
  const [{ month, day: defaultDay, daysInMonth }] = useState(previousDayDetails);
  const [day, setDay] = useState(defaultDay);
  const [diamondInput, setDiamondInput] = useState("");
  const [previewInput, setPreviewInput] = useState("");
  const [history, setHistory] = useState<SavedEntry[]>([]);
  const [reconciliation,setReconciliation]=useState<Reconciliation|null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [status, setStatus] = useState("LOADING SAVED DAYS...");
  const [agencyTarget,setAgencyTarget]=useState(DEFAULT_AGENCY_TARGET);
  const [targetInput,setTargetInput]=useState(""),[targetStatus,setTargetStatus]=useState("LOADING AGENCY TARGET…"),[targetSaving,setTargetSaving]=useState(false),[targetLoaded,setTargetLoaded]=useState(false);
  const actualDiamonds = parseDiamonds(previewInput);
  const previewReady = diamondInput === previewInput;

  const targetRows = useMemo(() => incrementalTargets(agencyTarget,daysInMonth,day), [agencyTarget,day,daysInMonth]);
  const currentIndex = useMemo(() => actualDiamonds ? Math.max(0, targetRows.reduce((latest, row, index) => actualDiamonds >= row.dayTarget ? index : latest, -1)) : -1, [actualDiamonds, targetRows]);
  const currentTarget = currentIndex >= 0 ? targetRows[currentIndex] : null;
  const nearbyTargets = useMemo(() => { if (currentIndex < 0) return []; const first = Math.min(Math.max(0, currentIndex - 1), Math.max(0, targetRows.length - 3)); return targetRows.slice(first, first + 3); }, [currentIndex, targetRows]);
  const prediction = useMemo(()=>incrementalPrediction(actualDiamonds,targetRows),[actualDiamonds,targetRows]);
  const displayedHistory=useMemo(()=>history.map(entry=>({...entry,prediction:incrementalPrediction(entry.diamonds,incrementalTargets(agencyTarget,daysInMonth,entry.day))})),[history,agencyTarget,daysInMonth]);

  useEffect(()=>{let alive=true;void(async()=>{try{const response=await fetch(`/api/data/incremental-tracking?month=${month}`,{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'COULD NOT LOAD SAVED DAYS.');if(alive){setHistory(data.entries||[]);setReconciliation(data.reconciliation||null);const latest=data.entries?.at(-1);if(data.automatic&&latest){setDay(latest.day);setDiamondInput(String(latest.diamonds));setPreviewInput(String(latest.diamonds));}setAgencyTarget(data.agencyTarget||DEFAULT_AGENCY_TARGET);setTargetInput(formatDiamonds(data.agencyTarget||DEFAULT_AGENCY_TARGET));setTargetLoaded(true);setTargetStatus('SAVED FOR '+monthLabel(month).toUpperCase());setStatus(data.automatic?'AUTOMATIC DAILY TOTALS':'SAVED DAILY HISTORY');}}catch(error){if(alive){setStatus(error instanceof Error?error.message:'COULD NOT LOAD SAVED DAYS.');setTargetStatus('COULD NOT LOAD AGENCY TARGET. REFRESH TO RETRY.');}}})();return()=>{alive=false;};},[month]);
  async function applyTarget(){
    const value=parseAgencyTarget(targetInput);if(value===null){setTargetStatus('ENTER A POSITIVE DIAMOND TARGET, E.G. 50,000,000 OR 50M.');return;}
    setTargetSaving(true);setTargetStatus('SAVING AGENCY TARGET…');
    try{const response=await fetch('/api/data/incremental-tracking',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({month,agencyTarget:value})});const data=await response.json();if(!response.ok)throw Error(data.error||'COULD NOT SAVE AGENCY TARGET.');setAgencyTarget(data.agencyTarget);setTargetInput(formatDiamonds(data.agencyTarget));setTargetStatus('AGENCY TARGET SAVED. ALL 13 THRESHOLDS UPDATED.');}
    catch(error){setTargetStatus(error instanceof Error?error.message:'COULD NOT SAVE AGENCY TARGET.');}finally{setTargetSaving(false);}
  }
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
    const response = await fetch("/api/data/incremental-tracking", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, entries: next }) }); const data = await response.json();
    if (!response.ok) return setStatus(data.error || "COULD NOT SAVE DAY.");
    setHistory(data.entries || next); setStatus(`DAY ${day} SAVED.`);
  }

  const latestSaved = history.at(-1) || null;
  const chartPoints = displayedHistory.map((entry) => ({ ...entry, x: 52 + ((entry.day - 1) / (daysInMonth - 1)) * 864, y: 440 - Math.min(14, Math.max(0, chartLevel(entry.prediction))) / 14 * 390 }));
  const hoveredEntry = chartPoints.find((point) => point.day === hoveredDay) || null;
  const savedChart = <section className="mt-7 rounded-3xl border border-white/15 bg-white/[.035] p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.24em] text-yellow-200">SAVED MOVEMENT</p><h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase">INCREMENTAL <span className="text-yellow-300">CHART</span></h2></div><div className="text-right"><p className="text-xs font-black uppercase tracking-widest text-white/45">{status}</p>{hoveredEntry && <p className="mt-2 text-sm font-black text-yellow-100">DAY {hoveredEntry.day} · {formatDiamonds(hoveredEntry.diamonds)} · {hoveredEntry.prediction.toFixed(0)}%</p>}</div></div>{history.length ? <div className="mt-6 overflow-x-auto"><svg viewBox="0 0 960 490" onMouseMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width * 960; const nearest = chartPoints.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best); setHoveredDay(nearest.day); }} onMouseLeave={() => setHoveredDay(null)} className="min-w-[700px] w-full cursor-crosshair"><defs><linearGradient id="incremental-line" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#facc15"/><stop offset="1" stopColor="#67e8f9"/></linearGradient></defs>{[1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((level) => { const y = 440 - chartLevel(level) / 14 * 390; return <g key={level}><line x1="52" x2="916" y1={y} y2={y} stroke={level % 5 === 0 ? "rgba(250,204,21,.30)" : "rgba(255,255,255,.10)"} strokeDasharray="4 6"/><text x="14" y={y + 5} fill={level % 5 === 0 ? "rgba(250,204,21,.90)" : "rgba(255,255,255,.52)"} fontSize="12" fontWeight="800">{level}%</text></g>; })}<line x1="52" x2="916" y1="440" y2="440" stroke="rgba(250,204,21,.4)"/>{chartPoints.length > 1 && <polyline points={chartPoints.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="url(#incremental-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>}{chartPoints.map((point) => <g key={point.day}><circle cx={point.x} cy={point.y} r={hoveredDay === point.day ? "8" : "4.5"} fill="#facc15" stroke="#080806" strokeWidth="2"/><text x={point.x} y="466" textAnchor="middle" fill="rgba(255,255,255,.65)" fontSize="11" fontWeight="800">D{point.day}</text><title>DAY {point.day}: {formatDiamonds(point.diamonds)} · {point.prediction.toFixed(0)}%</title></g>)}</svg></div> : <p className="mt-6 rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm font-bold text-white/45">YOUR CHART APPEARS WHEN DAILY DATA IS AVAILABLE.</p>}</section>;

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-center justify-between gap-4"><Link href="/data/menu" className="text-xs font-black uppercase tracking-[.18em] text-yellow-200">← DATA SPACE</Link><p className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.18em] text-yellow-100">{monthLabel(month)} TARGET LADDER</p></header>
    <section aria-label="Agency target settings" className="mt-8 rounded-3xl border border-yellow-300/30 bg-yellow-300/[.06] p-5 sm:p-7">
      <form onSubmit={event=>{event.preventDefault();void applyTarget();}} className="flex flex-wrap items-end gap-4">
        <label className="min-w-0 flex-1 text-xs font-black uppercase tracking-widest text-yellow-100">INPUT AGENCY TARGET
          <input aria-label="Input agency target" value={targetInput} onChange={event=>setTargetInput(event.target.value)} disabled={!targetLoaded||targetSaving} inputMode="decimal" placeholder="E.G. 50,000,000 OR 50M" className="mt-3 w-full rounded-xl border border-yellow-300/40 bg-black px-4 py-3 text-xl font-black text-white placeholder:text-white/30 disabled:opacity-45"/>
        </label>
        <button type="submit" disabled={!targetLoaded||targetSaving} className="rounded-xl bg-yellow-300 px-6 py-4 text-xs font-black uppercase text-black disabled:opacity-45">{targetSaving?'SAVING…':'SET AGENCY TARGET'}</button>
      </form>
      <p className="mt-4 text-sm leading-6 text-white/65">Enter the full monthly diamond target. 70% unlocks 2% incremental, 100% is 9%, and 130% is 15%. All daily targets and predictions calculate automatically.</p>
      <p role="status" className="mt-3 text-xs font-bold text-yellow-100">{targetStatus}</p>
      <details className="mt-5 border-t border-white/10 pt-4"><summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-yellow-200">VIEW ALL 13 TARGET THRESHOLDS</summary><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="text-xs text-white/50"><tr><th className="p-3">INCREMENTAL</th><th className="p-3">COMPLETION</th><th className="p-3">MONTHLY DIAMONDS</th><th className="p-3">DAY {day}</th></tr></thead><tbody>{targetRows.map(row=><tr key={row.level} className={'border-t border-white/10 '+(row.level===9?'bg-yellow-300/10 text-yellow-100':'text-white/75')}><th className="p-3">{row.level}%</th><td className="p-3">{row.completion}%</td><td className="p-3">{formatDiamonds(row.monthlyTotal)}</td><td className="p-3">{formatDiamonds(row.dayTarget)}</td></tr>)}</tbody></table></div></details>
    </section>
    <section className="mt-10 rounded-[32px] border border-yellow-300/30 bg-[radial-gradient(circle_at_90%_0%,rgba(250,204,21,.16),transparent_32%),linear-gradient(135deg,rgba(250,204,21,.08),rgba(0,0,0,.75))] p-6 sm:p-9"><p className="text-xs font-black uppercase tracking-[.28em] text-yellow-200">INCREMENTAL PREDICTION</p><h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase leading-none sm:text-7xl">INCREMENTAL <span className="text-yellow-300">DATA TRACKING</span></h1><p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65">Choose a day and enter the month-to-date diamonds after the Backstage update. Saved days stay in the chart below.</p><div className="mt-8 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]"><label className="rounded-2xl border border-white/15 bg-black/45 p-4 text-xs font-black uppercase tracking-widest text-yellow-100">DAY OF {monthLabel(month)}<select value={day} onChange={(event) => chooseDay(Number(event.target.value))} className="mt-3 w-full cursor-pointer rounded-xl border border-yellow-300/35 bg-black px-4 py-3 text-lg font-black text-white">{Array.from({ length: daysInMonth }, (_, index) => index + 1).map((value) => <option key={value} value={value}>DAY {value}</option>)}</select></label><label className="rounded-2xl border border-yellow-300/35 bg-black/45 p-4 text-xs font-black uppercase tracking-widest text-yellow-100">MONTH-TO-DATE DIAMONDS<input value={diamondInput} onChange={(event) => setDiamondInput(event.target.value)} inputMode="decimal" placeholder="E.G. 7,500,000 OR 7.5M" className="mt-3 w-full rounded-xl border border-yellow-300/40 bg-black px-4 py-3 text-xl font-black text-white placeholder:text-white/30" />{!previewReady && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-yellow-100/70">PREVIEW UPDATES ONE SECOND AFTER YOU STOP TYPING.</p>}</label></div></section>
    {diamondInput.trim() ? <><div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-4"><p className="text-xs font-black uppercase tracking-widest text-yellow-100">SAVE THIS AS DAY {day}&apos;S INCREMENTAL POSITION</p><button onClick={() => void saveDay()} disabled={!previewReady||targetSaving||!targetLoaded} className="rounded-xl bg-yellow-300 px-5 py-3 text-xs font-black uppercase text-black disabled:cursor-not-allowed disabled:opacity-45">SAVE DAY {day}</button></div><section className="mt-7 rounded-3xl border border-white/15 bg-white/[.035] p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.24em] text-yellow-200">DAY {day} NEAREST TARGETS</p><h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase">WHERE YOU ARE <span className="text-yellow-300">TODAY</span></h2></div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/45">LATEST SAVED TOTAL{latestSaved ? ` · DAY ${latestSaved.day}` : ""}</p><p className="mt-1 font-[family-name:var(--font-norwester)] text-2xl text-white">{latestSaved ? formatDiamonds(latestSaved.diamonds) : "—"}</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-3">{nearbyTargets.map((target) => { const active = target.label === currentTarget?.label; const difference = actualDiamonds - target.dayTarget; return <div key={target.label} className={`rounded-2xl border p-5 ${active ? "border-yellow-300 bg-yellow-300/15 shadow-[0_0_28px_rgba(250,204,21,.16)]" : "border-white/15 bg-black/30"}`}><p className={`text-xs font-black uppercase tracking-[.2em] ${active ? "text-yellow-200" : "text-white/45"}`}>{active ? "YOUR CURRENT PREDICTION" : "NEARBY TARGET"}</p><p className={`mt-3 font-[family-name:var(--font-norwester)] text-4xl ${active ? "text-yellow-300" : "text-white"}`}>{target.label}</p><p className="mt-5 text-xs font-black uppercase tracking-widest text-white/50">DAY {day} TARGET</p><p className="mt-1 text-2xl font-black text-white">{formatDiamonds(target.dayTarget)}</p><p className={`mt-4 text-sm font-black ${difference >= 0 ? "text-emerald-200" : "text-red-200"}`}>{difference >= 0 ? "+" : "−"}{formatDiamonds(Math.abs(difference))} {difference >= 0 ? "AHEAD" : "BEHIND"}</p></div>; })}</div></section></> : <section className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[.02] p-5 text-center text-sm font-bold text-white/45">DAY {day} IS READY FOR A NEW DIAMOND TOTAL. SAVED HISTORY IS STILL SHOWN BELOW.</section>}
    {reconciliation&&<details className="mt-6 rounded-2xl border border-yellow-300/25 bg-black/30 p-5"><summary className="cursor-pointer text-sm font-bold text-yellow-100">Agency total breakdown{latestSaved?' · day '+latestSaved.day:''}</summary><div className="mt-4 grid gap-3 sm:grid-cols-3">{[['Current roster',reconciliation.currentRosterDiamonds],['Earnings retained from absent creators',reconciliation.retainedDiamonds],['Agency total',reconciliation.currentRosterDiamonds+reconciliation.retainedDiamonds]].map(([label,value])=><div className="rounded-xl bg-white/5 p-4" key={String(label)}><p className="text-xs text-white/60">{label}</p><strong className="mt-2 block text-xl text-yellow-100">{formatDiamonds(Number(value))}</strong></div>)}</div><p className="mt-4 text-sm text-white/65">Earlier earnings still count when a creator no longer appears in the latest roster.</p><div className="mt-4 max-h-80 overflow-auto">{reconciliation.absentCreators.map(c=><div className="flex items-center justify-between gap-4 border-t border-white/10 py-3 text-sm" key={c.username+':'+c.lastSeen}><span className="break-all">@{c.username}</span><strong className="shrink-0 text-yellow-100">{formatDiamonds(c.diamonds)}</strong></div>)}</div></details>}
    {savedChart}
  </div></main></DataAccessGuard>;
}
