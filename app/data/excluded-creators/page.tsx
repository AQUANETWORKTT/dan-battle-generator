"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type ExcludedCreator = { username: string; excludeFromLeaderboards: boolean; hiddenFromDownloads: boolean };

export default function ExcludedCreatorsPage() {
  const [creators, setCreators] = useState<ExcludedCreator[]>([]);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("Loading settings...");

  useEffect(() => {
    fetch("/api/data-analysis/excluded-creators", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      setCreators(data.creators || []);
      setMessage("");
    }).catch(() => setMessage("Could not load excluded creator settings."));
  }, []);

  async function save(next: ExcludedCreator[]) {
    setCreators(next);
    setMessage("Saving...");
    const response = await fetch("/api/data-analysis/excluded-creators", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creators: next }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Could not save settings."); return; }
    setCreators(data.creators || next);
    setMessage("Saved.");
  }

  function addCreator() {
    const clean = username.replace(/^@/, "").trim().toLowerCase();
    if (!clean) return;
    if (creators.some((creator) => creator.username === clean)) { setMessage("That creator is already on the list."); return; }
    setUsername("");
    void save([...creators, { username: clean, excludeFromLeaderboards: true, hiddenFromDownloads: true }]);
  }

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-4xl"><Link href="/data/menu" className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">← Data Space</Link><p className="mt-12 text-xs font-black uppercase tracking-[0.3em] text-orange-200/75">Visibility controls</p><h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase sm:text-6xl">Excluded <span className="text-yellow-300">Creators</span></h1><p className="mt-4 max-w-2xl text-white/60">Creators remain in Creator Intelligence data. Use the switches to remove them from leaderboards or hide them from public-facing/downloadable PNGs and tournament-style outputs.</p><section className="mt-10 rounded-3xl border border-orange-300/20 bg-white/[0.04] p-5"><div className="flex gap-3"><input value={username} onChange={(event) => setUsername(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addCreator(); }} placeholder="Creator username, e.g. @example" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none focus:border-yellow-300"/><button type="button" onClick={addCreator} className="rounded-xl bg-yellow-300 px-5 py-3 text-xs font-black uppercase tracking-widest text-black">Add creator</button></div>{message ? <p className="mt-4 text-sm text-yellow-100">{message}</p> : null}<div className="mt-5 space-y-3">{creators.map((creator) => <div key={creator.username} className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4"><p className="min-w-40 flex-1 font-black text-yellow-100">@{creator.username}</p><label className="flex items-center gap-2 text-sm text-white/75"><input type="checkbox" checked={creator.excludeFromLeaderboards} onChange={(event) => void save(creators.map((item) => item.username === creator.username ? { ...item, excludeFromLeaderboards: event.target.checked } : item))}/> Exclude from leaderboards</label><label className="flex items-center gap-2 text-sm text-white/75"><input type="checkbox" checked={creator.hiddenFromDownloads} onChange={(event) => void save(creators.map((item) => item.username === creator.username ? { ...item, hiddenFromDownloads: event.target.checked } : item))}/> Hide from PNGs & downloads</label><button type="button" onClick={() => void save(creators.filter((item) => item.username !== creator.username))} className="text-xs font-black uppercase tracking-widest text-red-300">Remove</button></div>)}{!creators.length && !message ? <p className="py-6 text-sm text-white/45">No excluded creators yet.</p> : null}</div></section></div></main></DataAccessGuard>;
}
