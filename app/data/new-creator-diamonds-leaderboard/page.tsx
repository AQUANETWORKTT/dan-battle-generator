"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";
import { createLeaderboardPng, downloadLeaderboardPng } from "../../components/LeaderboardPng";

type Manager = { key: string; name: string; group: string; diamonds: number };
type Data = { groups: string[]; managers: Manager[]; error?: string };
const titleImage = "/leaderboards/diamonds-for-new-creators-title.png";

export default function NewCreatorDiamondsLeaderboardPage() {
  const [data, setData] = useState<Data>({ groups: [], managers: [] });
  const [selected, setSelected] = useState<string[]>([]);
  const [draftDiamonds, setDraftDiamonds] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("LOADING MANAGERS...");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const managers = useMemo(() => data.managers.map((manager) => ({ ...manager, diamonds: Number(draftDiamonds[manager.key]) || 0 })).filter((manager) => !selected.length || selected.includes(manager.group)).sort((a, b) => b.diamonds - a.diamonds || a.name.localeCompare(b.name)), [data.managers, draftDiamonds, selected]);
  const rows = useMemo(() => managers.map((manager) => ({ name: manager.name, value: Math.round(manager.diamonds).toLocaleString() })), [managers]);

  async function load() {
    setStatus("LOADING MANAGERS...");
    try {
      const response = await fetch("/api/data-analysis/new-creator-diamonds-leaderboard", { cache: "no-store" });
      const result = await response.json() as Data;
      if (!response.ok) throw new Error(result.error || "Could not load managers.");
      setData(result);
      setDraftDiamonds(Object.fromEntries(result.managers.map((manager) => [manager.key, manager.diamonds])));
      setStatus("MANUAL VALUES · READY TO EDIT");
    } catch (error) { setStatus(error instanceof Error ? error.message : "COULD NOT LOAD MANAGERS."); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { let active = true; void createLeaderboardPng({ title: "DIAMONDS FOR NEW CREATORS", subtitle: "MANUAL MONTHLY TOTALS", rows, titleImage }).then((blob) => { if (!active) return; const url = URL.createObjectURL(blob); setPreview((previous) => { if (previous) URL.revokeObjectURL(previous); return url; }); }); return () => { active = false; }; }, [rows]);

  function toggle(group: string) { setSelected((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group]); }
  function updateDiamond(manager: string, value: string) { const number = Number(value.replace(/[^\d.]/g, "")); setDraftDiamonds((current) => ({ ...current, [manager]: Number.isFinite(number) ? number : 0 })); }
  async function save() { setSaving(true); setStatus("SAVING MANUAL DIAMOND VALUES..."); try { const response = await fetch("/api/data-analysis/new-creator-diamonds-leaderboard", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ diamonds: draftDiamonds }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not save values."); setStatus("MANUAL DIAMOND VALUES SAVED."); } catch (error) { setStatus(error instanceof Error ? error.message : "COULD NOT SAVE VALUES."); } finally { setSaving(false); } }
  async function download() { setStatus("BUILDING PNG..."); try { await downloadLeaderboardPng({ title: "DIAMONDS FOR NEW CREATORS", subtitle: "MANUAL MONTHLY TOTALS", rows, titleImage, filename: "DIAMONDS-FOR-NEW-CREATORS-LEADERBOARD.png" }); setStatus("PNG DOWNLOADED."); } catch { setStatus("COULD NOT BUILD PNG."); } }

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex justify-between"><Link href="/data/menu" className="text-xs font-black uppercase tracking-widest text-rose-200">← DATA SPACE</Link><button onClick={() => void load()} className="rounded-xl border border-rose-300/40 px-4 py-3 text-xs font-black uppercase">REFRESH</button></header><section className="mt-9 rounded-3xl border border-rose-300/35 bg-gradient-to-br from-rose-300/15 to-black p-7"><p className="text-xs font-black uppercase tracking-widest text-rose-200">MANAGEMENT · MANUAL TOTALS</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-5xl uppercase">DIAMONDS FOR <span className="text-rose-300">NEW CREATORS</span></h1><p className="mt-3 max-w-2xl text-sm text-white/60">Enter the diamond total for each manager, save once, then download the leaderboard. These values are fully manual and do not pull from Creator Intelligence.</p><div className="mt-6 flex flex-wrap gap-2"><button onClick={() => setSelected([])} className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase ${!selected.length ? "border-rose-300 bg-rose-300 text-black" : "border-white/20"}`}>ALL TEAMS</button>{data.groups.map((group) => <button key={group} onClick={() => toggle(group)} className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase ${selected.includes(group) ? "border-rose-300 bg-rose-300 text-black" : "border-white/20"}`}>{group}</button>)}</div><div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-black uppercase text-rose-100">{managers.length} MANAGERS</p><div className="flex gap-2"><button onClick={() => void save()} disabled={saving} className="rounded-xl border border-rose-300/60 px-5 py-3 text-xs font-black uppercase text-rose-100 disabled:opacity-40">{saving ? "SAVING..." : "SAVE VALUES"}</button><button onClick={() => void download()} className="rounded-xl bg-rose-300 px-5 py-3 text-xs font-black uppercase text-black">DOWNLOAD PNG</button></div></div><p className="mt-4 text-xs font-black uppercase text-rose-200">{status}</p></section><section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]"><div className="grid grid-cols-[minmax(180px,1fr)_minmax(150px,220px)] gap-4 bg-black/30 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/45"><span>Manager</span><span>New creator diamonds</span></div>{managers.map((manager) => <div key={manager.key} className="grid grid-cols-[minmax(180px,1fr)_minmax(150px,220px)] items-center gap-4 border-t border-white/10 px-5 py-3"><div><p className="font-black text-white">{manager.name}</p><p className="mt-1 text-[10px] font-black uppercase text-white/40">{manager.group}</p></div><input inputMode="numeric" value={manager.diamonds || ""} onChange={(event) => updateDiamond(manager.key, event.target.value)} placeholder="0" className="w-full rounded-xl border border-rose-300/25 bg-black px-3 py-2 text-right font-black text-rose-100 outline-none focus:border-rose-300" /></div>)}</section><section className="mt-8 overflow-auto rounded-3xl bg-black/40 p-5">{preview ? <img src={preview} alt="Diamonds for new creators leaderboard preview" className="mx-auto block max-w-full rounded-xl border border-rose-300/55" /> : <p className="py-20 text-center text-xs font-black uppercase tracking-widest text-rose-200">Preparing leaderboard…</p>}</section></div></main></DataAccessGuard>;
}
