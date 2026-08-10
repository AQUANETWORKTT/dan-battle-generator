"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";
import { createLeaderboardPng, downloadLeaderboardPng } from "../../components/LeaderboardPng";

type Manager = { key: string; name: string; group: string; recruits: number };
type Data = { month: string; groups: string[]; managers: Manager[]; totalRecruits: number };
const recruitmentTitleImage = "/leaderboards/recruitment-title.png";
const recruitmentTitleImageWidth = 435;

export default function RecruitmentLeaderboardPage() {
  const [data, setData] = useState<Data>({ month: "", groups: [], managers: [], totalRecruits: 0 });
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("LOADING RECRUITMENT DATA...");
  const [preview, setPreview] = useState("");

  const managers = useMemo(() => data.managers.filter((manager) => !selected.length || selected.includes(manager.group)), [data.managers, selected]);
  const rows = useMemo(() => managers.map((manager) => ({ name: manager.name, value: `${manager.recruits} / 8` })), [managers]);

  async function load() {
    setStatus("LOADING RECRUITMENT DATA...");
    const response = await fetch("/api/data-analysis/recruitment-leaderboard", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error || "COULD NOT LOAD RECRUITMENT DATA.");
    setData(result);
    setStatus("CURRENT MONTH · LIVE DATA");
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

  async function download() {
    setStatus("BUILDING PNG...");
    try {
      await downloadLeaderboardPng({ title: "RECRUITMENT", subtitle: "", rows, titleImage: recruitmentTitleImage, titleImageWidth: recruitmentTitleImageWidth, filename: `RECRUITMENT-LEADERBOARD-${data.month || "CURRENT"}.png` });
      setStatus("PNG DOWNLOADED.");
    } catch {
      setStatus("COULD NOT BUILD PNG.");
    }
  }

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="flex justify-between"><Link href="/data/menu" className="text-xs font-black uppercase tracking-widest text-rose-200">← DATA SPACE</Link><button onClick={() => void load()} className="rounded-xl border border-rose-300/40 px-4 py-3 text-xs font-black uppercase">REFRESH</button></header>
    <section className="mt-9 rounded-3xl border border-rose-300/35 bg-gradient-to-br from-rose-300/15 to-black p-7"><p className="text-xs font-black uppercase tracking-widest text-rose-200">MANAGEMENT · {data.month || "CURRENT MONTH"}</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-5xl uppercase">RECRUITMENT <span className="text-rose-300">LEADERBOARD</span></h1><div className="mt-6 flex flex-wrap gap-2"><button onClick={() => setSelected([])} className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase ${!selected.length ? "border-rose-300 bg-rose-300 text-black" : "border-white/20"}`}>ALL TEAMS</button>{data.groups.map((group) => <button key={group} onClick={() => toggle(group)} className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase ${selected.includes(group) ? "border-rose-300 bg-rose-300 text-black" : "border-white/20"}`}>{group}</button>)}</div><div className="mt-6 flex items-center justify-between"><p className="text-xs font-black uppercase text-rose-100">{managers.length} MANAGERS · {data.totalRecruits} RECRUITS</p><button onClick={() => void download()} className="rounded-xl bg-rose-300 px-5 py-3 text-xs font-black uppercase text-black">DOWNLOAD PNG</button></div><p className="mt-4 text-xs font-black uppercase text-rose-200">{status}</p></section>
    <section className="mt-8 overflow-auto rounded-3xl bg-black/40 p-5"><img src={preview} alt="Recruitment leaderboard preview" className="mx-auto block max-w-full rounded-xl border border-rose-300/55" /></section>
  </div></main></DataAccessGuard>;
}
