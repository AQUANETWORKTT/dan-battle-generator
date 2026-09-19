"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";
import { createLeaderboardPng, downloadLeaderboardPng } from "../../components/LeaderboardPng";

type Manager = { key: string; manager: string; group: string; recruits: number };
type Recruit = { id: string; username: string; managerKey: string };
type Assignments = { managerGroups: Record<string, string>; managerNames: Record<string, string>; deletedManagers: string[]; ownerManagers: string[]; assignedAt: Record<string, string>; recruitmentAdjustments?: Record<string, number> };
type Data = { period: string; startDate: string; endDate: string; groups: string[]; managers: Manager[]; recruits: Recruit[]; recruitmentAdjustments?: Record<string, number>; error?: string };
const recruitmentTitleImage = "/leaderboards/recruitment-title.png";
const recruitmentTitleImageWidth = 435;

export default function RecruitmentLeaderboardPage() {
  const [data, setData] = useState<Data>({ period: "month", startDate: "", endDate: "", groups: [], managers: [], recruits: [] });
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("LOADING RECRUITMENT DATA...");
  const [preview, setPreview] = useState("");
  const [assignments, setAssignments] = useState<Assignments | null>(null);
  const [draftAdjustments, setDraftAdjustments] = useState<Record<string, number>>({});
  const [openAdjustment, setOpenAdjustment] = useState("");
  const [savingAdjustment, setSavingAdjustment] = useState("");

  const managers = useMemo(() => data.managers.filter((manager) => !selected.length || selected.includes(manager.group)), [data.managers, selected]);
  const displayManagers = useMemo(() => managers.map((manager) => ({ ...manager, recruits: Math.max(0, manager.recruits + (Number(draftAdjustments[manager.key]) || 0) - (Number(assignments?.recruitmentAdjustments?.[manager.key]) || 0)) })), [assignments?.recruitmentAdjustments, draftAdjustments, managers]);
  const rows = useMemo(() => displayManagers.map((manager) => ({ name: manager.manager, value: `${manager.recruits} / 8` })), [displayManagers]);
  const hasDraftChanges = useMemo(() => JSON.stringify(draftAdjustments) !== JSON.stringify(assignments?.recruitmentAdjustments || {}), [assignments?.recruitmentAdjustments, draftAdjustments]);

  async function load() {
    setStatus("LOADING RECRUITMENT DATA...");
    try {
      const [response, assignmentsResponse] = await Promise.all([
        fetch("/api/data-analysis/recruitment-leaderboard?period=month", { cache: "no-store" }),
        fetch("/api/data-analysis/manager-assignments", { cache: "no-store" }),
      ]);
      const [result, assignmentResult] = await Promise.all([response.json() as Promise<Data>, assignmentsResponse.json() as Promise<{ assignments?: Assignments }>]);
      if (!response.ok) return setStatus(result.error || "COULD NOT LOAD RECRUITMENT DATA.");
      setData(result);
      if (assignmentsResponse.ok && assignmentResult.assignments) {
        setAssignments(assignmentResult.assignments);
        setDraftAdjustments(assignmentResult.assignments.recruitmentAdjustments || {});
      }
      setStatus("CURRENT MONTH · LIVE DATA");
    } catch {
      setStatus("COULD NOT LOAD RECRUITMENT DATA.");
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    let active = true;
    void createLeaderboardPng({ title: "RECRUITMENT", subtitle: "", rows, titleImage: recruitmentTitleImage, titleImageWidth: recruitmentTitleImageWidth }).then((blob) => {
      if (!active) return;
      const url = URL.createObjectURL(blob);
      setPreview((previous) => { if (previous) URL.revokeObjectURL(previous); return url; });
    });
    return () => { active = false; };
  }, [rows]);

  function toggle(group: string) {
    setSelected((groups) => groups.includes(group) ? groups.filter((item) => item !== group) : [...groups, group]);
  }

  function changeRecruitmentAdjustment(manager: Manager, amount: number) {
    setDraftAdjustments((current) => {
      const next = { ...current };
      const nextAmount = (Number(next[manager.key]) || 0) + amount;
      if (nextAmount) next[manager.key] = nextAmount;
      else delete next[manager.key];
      return next;
    });
  }

  async function saveRecruitmentAdjustments() {
    if (!assignments || savingAdjustment || !hasDraftChanges) return;
    const next = { ...assignments, recruitmentAdjustments: draftAdjustments };
    setSavingAdjustment("all");
    setStatus("SAVING MANUAL RECRUITMENT CHANGES...");
    try {
      const response = await fetch("/api/data-analysis/manager-assignments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignments: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save adjustment.");
      setAssignments(next);
      setData((current) => ({ ...current, managers: current.managers.map((manager) => ({ ...manager, recruits: Math.max(0, manager.recruits + (Number(draftAdjustments[manager.key]) || 0) - (Number(assignments.recruitmentAdjustments?.[manager.key]) || 0)) })), recruitmentAdjustments: draftAdjustments }));
      setStatus("MANUAL RECRUITMENT CHANGES SAVED.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "COULD NOT SAVE MANUAL CHANGE.");
    } finally {
      setSavingAdjustment("");
    }
  }

  async function download() {
    setStatus("BUILDING PNG...");
    try {
      await downloadLeaderboardPng({ title: "RECRUITMENT", subtitle: "", rows, titleImage: recruitmentTitleImage, titleImageWidth: recruitmentTitleImageWidth, filename: `RECRUITMENT-LEADERBOARD-${data.endDate || "CURRENT"}.png` });
      setStatus("PNG DOWNLOADED.");
    } catch {
      setStatus("COULD NOT BUILD PNG.");
    }
  }

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="flex justify-between"><Link href="/data/menu" className="text-xs font-black uppercase tracking-widest text-rose-200">← DATA SPACE</Link><button onClick={() => void load()} className="rounded-xl border border-rose-300/40 px-4 py-3 text-xs font-black uppercase">REFRESH</button></header>
    <section className="mt-9 rounded-3xl border border-rose-300/35 bg-gradient-to-br from-rose-300/15 to-black p-7"><p className="text-xs font-black uppercase tracking-widest text-rose-200">MANAGEMENT · {data.endDate || "CURRENT MONTH"}</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-5xl uppercase">RECRUITMENT <span className="text-rose-300">LEADERBOARD</span></h1><div className="mt-6 flex flex-wrap gap-2"><button onClick={() => setSelected([])} className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase ${!selected.length ? "border-rose-300 bg-rose-300 text-black" : "border-white/20"}`}>ALL TEAMS</button>{data.groups.map((group) => <button key={group} onClick={() => toggle(group)} className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase ${selected.includes(group) ? "border-rose-300 bg-rose-300 text-black" : "border-white/20"}`}>{group}</button>)}</div><div className="mt-6 flex items-center justify-between"><p className="text-xs font-black uppercase text-rose-100">{managers.length} MANAGERS · {data.recruits.length} RECRUITS</p><button onClick={() => void download()} className="rounded-xl bg-rose-300 px-5 py-3 text-xs font-black uppercase text-black">DOWNLOAD PNG</button></div><p className="mt-4 text-xs font-black uppercase text-rose-200">{status}</p></section>
    <section className="mt-6 rounded-3xl border border-rose-300/25 bg-white/[0.035] p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-[family-name:var(--font-norwester)] text-2xl uppercase text-rose-200">Manual Recruitment Changes</h2><p className="mt-1 text-sm text-white/55">Use + or − as many times as needed, then save all changes together. The live recruitment list stays untouched.</p></div><button type="button" onClick={() => void saveRecruitmentAdjustments()} disabled={!hasDraftChanges || Boolean(savingAdjustment)} className="rounded-xl bg-rose-300 px-5 py-3 text-xs font-black uppercase text-black disabled:opacity-40">{savingAdjustment ? "Saving..." : "Save manual changes"}</button></div><div className="mt-5 grid gap-3 md:grid-cols-2">{displayManagers.map((manager) => { const adjustment = Number(draftAdjustments[manager.key]) || 0; const recorded = Math.max(0, manager.recruits - adjustment); const isOpen = openAdjustment === manager.key; const recruits = data.recruits.filter((recruit) => recruit.managerKey === manager.key); return <article key={manager.key} className="rounded-2xl border border-white/10 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black text-white">{manager.manager}</p><p className="mt-1 text-xs font-bold uppercase text-white/45">{manager.group} · {recorded} recorded{adjustment ? ` · ${adjustment > 0 ? "+" : ""}${adjustment} manual` : ""}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => changeRecruitmentAdjustment(manager, -1)} disabled={Boolean(savingAdjustment)} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-300/40 text-lg font-black text-rose-200 disabled:opacity-40">−</button><span className="min-w-8 text-center font-black text-rose-100">{manager.recruits}</span><button type="button" onClick={() => changeRecruitmentAdjustment(manager, 1)} disabled={Boolean(savingAdjustment)} className="grid h-9 w-9 place-items-center rounded-lg border border-emerald-300/40 text-lg font-black text-emerald-200 disabled:opacity-40">+</button></div></div><button type="button" onClick={() => setOpenAdjustment(isOpen ? "" : manager.key)} className="mt-3 text-[10px] font-black uppercase tracking-widest text-rose-200">{isOpen ? "Hide recorded recruits" : `Show ${recruits.length} recorded recruits`}</button>{isOpen ? <div className="mt-3 border-t border-white/10 pt-3 text-sm text-white/65">{recruits.length ? recruits.map((recruit) => <p key={recruit.id}>{recruit.username}</p>) : <p>No recruits are currently recorded.</p>}</div> : null}</article>; })}</div></section>
    <section className="mt-8 overflow-auto rounded-3xl bg-black/40 p-5">{preview ? <img src={preview} alt="Recruitment leaderboard preview" className="mx-auto block max-w-full rounded-xl border border-rose-300/55" /> : <p className="py-20 text-center text-xs font-black uppercase tracking-widest text-rose-200">Preparing leaderboard…</p>}</section>
  </div></main></DataAccessGuard>;
}
