"use client";

import { useEffect, useMemo, useState } from "react";
import { FIRST_CLASS_CREATORS, FIRST_CLASS_EVENT, isPlaceholderCreator } from "@/lib/first-class-tournament";

type LeaderboardCreator = (typeof FIRST_CLASS_CREATORS)[number] & { diamonds: number };

const teamColours = [
  "#5eead4", "#93c5fd", "#f9a8d4", "#fde68a", "#c4b5fd",
  "#86efac", "#fda4af", "#67e8f9", "#fdba74", "#a7f3d0",
];

const podiumStyles = [
  { border: "border-amber-300", glow: "shadow-[0_0_22px_rgba(252,211,77,0.65)]", text: "text-amber-200" },
  { border: "border-slate-200", glow: "shadow-[0_0_18px_rgba(226,232,240,0.52)]", text: "text-slate-100" },
  { border: "border-orange-400", glow: "shadow-[0_0_18px_rgba(251,146,60,0.55)]", text: "text-orange-200" },
];

function Avatar({ username, className = "" }: { username: string; className?: string }) {
  const [imageError, setImageError] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const placeholder = isPlaceholderCreator(username);
  const initial = username.replace("creator-", "").slice(-2);

  useEffect(() => {
    if (placeholder) return;
    let cancelled = false;

    fetch("/api/tiktok-avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (!cancelled) setAvatarUrl(data.avatar || "");
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [placeholder, username]);

  if (placeholder || imageError || !avatarUrl) {
    return <span className={`grid place-items-center bg-white/10 font-black text-white/80 ${className}`}>{initial}</span>;
  }

  return (
    <img
      src={`/api/tiktok-avatar-image?url=${encodeURIComponent(avatarUrl)}`}
      alt={username}
      className={`object-cover ${className}`}
      onError={() => setImageError(true)}
    />
  );
}

export default function FirstClassLeaderboard() {
  const [openTeam, setOpenTeam] = useState<number | null>(1);
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/events/first-class/stats", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setScores(data.scores || {}))
      .catch(() => undefined)
  }, []);

  const teams = useMemo(() => {
    return Array.from({ length: FIRST_CLASS_EVENT.teamCount }, (_, index) => {
      const number = index + 1;
      const creators: LeaderboardCreator[] = FIRST_CLASS_CREATORS
        .filter((creator) => creator.teamNumber === number)
        .map((creator) => ({ ...creator, diamonds: Number(scores[creator.username.toLowerCase()] || 0) }))
        .sort((a, b) => b.diamonds - a.diamonds || a.slot - b.slot);
      return { number, creators, total: creators.reduce((sum, creator) => sum + creator.diamonds, 0) };
    }).sort((a, b) => b.total - a.total || a.number - b.number);
  }, [scores]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#061927] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(45,212,191,0.20),transparent_31%),radial-gradient(circle_at_86%_26%,rgba(59,130,246,0.20),transparent_28%),linear-gradient(145deg,#061927_0%,#0b2940_48%,#061927_100%)]" />
      <div className="floating-orb fixed left-[8%] top-24 h-48 w-48 rounded-full bg-teal-300/10 blur-3xl" />
      <div className="floating-orb-delayed fixed bottom-20 right-[6%] h-60 w-60 rounded-full bg-blue-400/10 blur-3xl" />

      <div className="first-class-intro fixed inset-0 z-50 grid place-items-center bg-[#061927]" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(45,212,191,0.16),transparent_32%)]" />
        <img src="/first-class/plane.png" alt="" className="first-class-plane relative w-[145vw] max-w-none sm:w-[115vw]" />
      </div>

      <section className="first-class-content relative mx-auto max-w-6xl px-4 pb-14 pt-5 sm:px-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/15 bg-slate-950/45 px-5 py-9 text-center shadow-2xl backdrop-blur-xl sm:px-10 sm:py-12">
          <img src="/world-cup-2026/agencies/first-class.png" alt="First Class" className="relative mx-auto mb-5 h-14 w-auto object-contain drop-shadow-[0_0_18px_rgba(252,211,77,0.32)] sm:h-20" />
          <p className="relative text-xs font-black uppercase tracking-[0.42em] text-teal-200">Cross Agency Creator Tournament</p>
          <h1 className="relative mt-3 text-4xl font-black uppercase italic tracking-tight sm:text-7xl">First Class <span className="text-teal-300">Ascend</span></h1>
          <p className="relative mx-auto mt-4 max-w-xl text-sm font-medium text-white/65 sm:text-base">20 evenly balanced teams. One leaderboard. Every diamond counts.</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/80">
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">20 teams</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">720 creators</span>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-amber-100">◆ Live points leaderboard</span>
          </div>
        </header>

        <div className="mt-7 flex items-end justify-between gap-4 px-1">
          <div><p className="text-xs font-black uppercase tracking-[0.25em] text-teal-200">Tournament standings</p><h2 className="mt-1 text-2xl font-black uppercase italic sm:text-3xl">Team leaderboard</h2></div>
          <p className="hidden text-right text-xs font-bold text-white/45 sm:block">Tap a team to see all 36 creators</p>
        </div>

        <section className="mt-4 space-y-3">
          {teams.map((team, position) => {
            const leaders = team.creators.slice(0, 3);
            const open = openTeam === team.number;
            const accent = teamColours[(team.number - 1) % teamColours.length];
            return <article key={team.number} className="overflow-hidden rounded-[28px] border border-white/12 bg-slate-950/50 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <button type="button" onClick={() => setOpenTeam(open ? null : team.number)} className="group grid w-full grid-cols-[35px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left sm:grid-cols-[55px_minmax(0,1fr)_185px_145px] sm:gap-5 sm:px-6 sm:py-5">
                <span className="text-2xl font-black italic text-white/45 sm:text-3xl">{position + 1}</span>
                <div className="min-w-0"><div className="flex items-center gap-3"><Avatar username={team.creators[0]?.username || ""} className="h-12 w-12 shrink-0 rounded-full border-2 border-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.45)] sm:h-16 sm:w-16" /><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Team captain</p><h3 className="truncate text-lg font-black uppercase italic text-amber-200 sm:text-2xl">Team {team.creators[0]?.username || "Captain"}</h3></div></div></div>
                <div className="flex items-center justify-self-end gap-2 sm:gap-3">{leaders.map((creator, index) => { const podium = podiumStyles[index]; return <div key={creator.username} className="relative text-center"><Avatar username={creator.username} className={`h-9 w-9 rounded-full border-2 bg-slate-950 text-[9px] sm:h-12 sm:w-12 sm:text-xs ${podium.border} ${podium.glow}`} /><span className={`mt-1 block text-[9px] ${podium.text}`}>◆</span></div>; })}</div>
                <div className="text-right"><p className="text-xl font-black italic sm:text-3xl">{team.total.toLocaleString()}</p><p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/45">Points</p></div>
                <span className="col-span-full -mx-4 -mb-4 mt-3 grid h-10 place-items-center border-t border-white/10 bg-black/15 text-[10px] font-black uppercase tracking-[0.26em] text-teal-100 transition hover:bg-teal-300/10 hover:text-teal-50 sm:-mx-6 sm:-mb-5 sm:mt-4">{open ? "Hide Team" : "View Team"}</span>
              </button>
              {open && <div className="border-t border-white/10 bg-black/15 p-3 sm:p-5"><div className="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)]"><aside className="flex items-center gap-3 rounded-[24px] border border-amber-300/35 bg-amber-300/10 p-4 sm:flex-col sm:justify-center sm:text-center"><Avatar username={team.creators[0]?.username || ""} className="h-16 w-16 shrink-0 rounded-full border-2 border-amber-300 sm:h-24 sm:w-24" /><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Team captain</p><p className="mt-1 break-all text-sm font-black uppercase italic text-white">{team.creators[0]?.username}</p></div></aside><div><div className="mb-4 flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Team roster · {team.creators.length} creators</p><p className="text-xs font-bold text-teal-200">Top 3 leading creators</p></div><div className="grid gap-2 sm:grid-cols-2">{team.creators.map((creator, index) => <div key={creator.username} className={`flex items-center gap-3 rounded-2xl border bg-white/[0.045] px-3 py-2.5 ${index < 3 ? podiumStyles[index].border : "border-white/8"}`}><span className={`w-5 text-center text-xs font-black ${index < 3 ? podiumStyles[index].text : "text-white/35"}`}>{index + 1}</span><Avatar username={creator.username} className={`h-9 w-9 rounded-full border-2 text-[10px] ${index < 3 ? podiumStyles[index].border : "border-transparent"}`} /><span className="min-w-0 flex-1 truncate text-sm font-black uppercase italic">{creator.username}</span><span className="text-sm font-black text-white/65">◆ {creator.diamonds.toLocaleString()}</span></div>)}</div></div></div></div>}
            </article>;
          })}
        </section>
      </section>
      <style jsx global>{`@keyframes captainSlideIn { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } } .captain-card { animation: captainSlideIn .55s cubic-bezier(.2,.8,.2,1) both; }`}</style>
      <style jsx global>{`@keyframes firstClassFloat { 50% { transform: translateY(-24px) translateX(12px); } } @keyframes firstClassPlane { 0% { transform: translateY(-8vh) scale(.08); opacity: 0; } 12% { opacity: 1; } 76% { transform: translateY(3vh) scale(1.25); opacity: 1; } 100% { transform: translateY(5vh) scale(2.25); opacity: 0; } } @keyframes firstClassIntro { 0%, 79% { opacity: 1; visibility: visible; } 100% { opacity: 0; visibility: hidden; } } @keyframes firstClassContent { 0%, 76% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } } .floating-orb { animation: firstClassFloat 10s ease-in-out infinite; } .floating-orb-delayed { animation: firstClassFloat 14s ease-in-out -5s infinite; } .first-class-plane { animation: firstClassPlane 3.4s cubic-bezier(.12,.7,.18,1) both; } .first-class-intro { animation: firstClassIntro 4s ease-out both; } .first-class-content { animation: firstClassContent 4.4s ease-out both; } @media (prefers-reduced-motion: reduce) { .floating-orb, .floating-orb-delayed, .first-class-plane, .first-class-intro, .first-class-content { animation: none; } .first-class-intro { display: none; } }`}</style>
    </main>
  );
}
