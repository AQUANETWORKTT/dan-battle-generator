"use client";

import { useEffect, useMemo, useState } from "react";
import { FIRST_CLASS_CAPTAINS, FIRST_CLASS_CREATORS, FIRST_CLASS_EVENT, FIRST_CLASS_VICE_CAPTAINS, isPlaceholderCreator } from "@/lib/first-class-tournament";

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

const teamPlacementStyles = [
  "text-amber-300 drop-shadow-[0_0_14px_rgba(252,211,77,0.65)]",
  "text-slate-200 drop-shadow-[0_0_14px_rgba(226,232,240,0.55)]",
  "text-orange-400 drop-shadow-[0_0_14px_rgba(251,146,60,0.6)]",
];

const teamPlacementCardStyles = [
  "border-amber-300/70 bg-gradient-to-r from-amber-300/15 via-slate-950/60 to-slate-950/50 shadow-[0_0_28px_rgba(252,211,77,0.15)]",
  "border-slate-200/65 bg-gradient-to-r from-slate-200/12 via-slate-950/60 to-slate-950/50 shadow-[0_0_24px_rgba(226,232,240,0.12)]",
  "border-orange-400/65 bg-gradient-to-r from-orange-400/12 via-slate-950/60 to-slate-950/50 shadow-[0_0_24px_rgba(251,146,60,0.12)]",
];

// Paste your future uploaded asset paths here when they are ready.
const FIRST_CLASS_BACKGROUND_IMAGE = "/first-class/champion-background.png";
const FIRST_CLASS_TITLE_LOGO = "/first-class/rise-to-glory-title.png";
const FIRST_CLASS_EVENT_FROM = "2026-07-24";
const FIRST_CLASS_EVENT_TO = "2026-07-31";

function Avatar({ username, className = "" }: { username: string; className?: string }) {
  const [imageError, setImageError] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const placeholder = isPlaceholderCreator(username);
  const initial = username.replace("creator-", "").slice(-2);

  useEffect(() => {
    if (placeholder) return;
    let cancelled = false;

    const localAvatarUrl = `/creators/${encodeURIComponent(username.trim().toLowerCase())}.jpg`;
    const localImage = new window.Image();

    const loadPublicAvatar = () => {
      fetch("/api/tiktok-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((data) => {
          if (!cancelled) {
            setImageError(false);
            setAvatarUrl(data.avatar || "");
          }
        })
        .catch(() => undefined);
    };

    localImage.onload = () => {
      if (!cancelled) {
        setImageError(false);
        setAvatarUrl(localAvatarUrl);
      }
    };

    localImage.onerror = loadPublicAvatar;
    localImage.src = localAvatarUrl;

    return () => { cancelled = true; };
  }, [placeholder, username]);

  if (placeholder || imageError || !avatarUrl) {
    return <span className={`grid place-items-center bg-white/10 font-black text-white/80 ${className}`}>{initial}</span>;
  }

  return (
    <img
      src={avatarUrl.startsWith("/") ? avatarUrl : `/api/tiktok-avatar-image?url=${encodeURIComponent(avatarUrl)}`}
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
    fetch(`/api/events/first-class/stats?from=${FIRST_CLASS_EVENT_FROM}&to=${FIRST_CLASS_EVENT_TO}`, { cache: "no-store" })
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
      {FIRST_CLASS_BACKGROUND_IMAGE && <img src={FIRST_CLASS_BACKGROUND_IMAGE} alt="" className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-80" />}
      <div className="floating-orb fixed left-[8%] top-24 h-48 w-48 rounded-full bg-teal-300/10 blur-3xl" />
      <div className="floating-orb-delayed fixed bottom-20 right-[6%] h-60 w-60 rounded-full bg-blue-400/10 blur-3xl" />

      <section className="relative mx-auto max-w-6xl px-4 pb-14 pt-5 sm:px-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/15 bg-slate-950/45 px-5 py-9 text-center shadow-2xl backdrop-blur-xl sm:px-10 sm:py-12">
          <div className="relative mb-7 grid w-full grid-cols-5 items-center gap-1 sm:mb-9 sm:gap-5"><img src="/logos/aqua.png" alt="Aqua" className="h-14 w-full object-contain sm:h-28" /><img src="/first-class/respawn-header.png" alt="Respawn" className="h-14 w-full object-contain sm:h-28" /><img src="/world-cup-2026/agencies/first-class.png" alt="First Class" className="h-14 w-full object-contain drop-shadow-[0_0_24px_rgba(252,211,77,0.38)] sm:h-28" /><img src="/first-class/storm-transparent.png" alt="Storm" className="h-14 w-full object-contain sm:h-28" /><img src="/first-class/paradise-header.png" alt="Paradise" className="h-14 w-full object-contain sm:h-28" /></div>
          <p className="relative text-xs font-black uppercase tracking-[0.42em] text-teal-200">Cross Agency Creator Tournament</p>
          {FIRST_CLASS_TITLE_LOGO ? <img src={FIRST_CLASS_TITLE_LOGO} alt="Rise to Glory" className="relative mx-auto mt-4 h-40 w-full max-w-none object-contain sm:h-72" /> : <h1 className="relative mt-3 text-4xl font-black uppercase italic tracking-tight sm:text-7xl">First Class <span className="text-teal-300">Ascend</span></h1>}
          <p className="relative mx-auto mt-4 max-w-xl text-sm font-medium text-white/65 sm:text-base">20 evenly balanced teams. One leaderboard. Every diamond counts.</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/80">
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">20 teams</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">{FIRST_CLASS_CREATORS.length} creators</span>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-amber-100">◆ Live points leaderboard</span>
            <span className="rounded-full border border-teal-300/30 bg-teal-300/10 px-4 py-2 text-teal-100">24–31 July 2026</span>
          </div>
        </header>

        <div className="mt-7 flex items-end justify-between gap-4 px-1">
          <div><p className="text-xs font-black uppercase tracking-[0.25em] text-teal-200">Tournament standings</p><h2 className="mt-1 text-2xl font-black uppercase italic sm:text-3xl">Team leaderboard</h2></div>
          <p className="hidden text-right text-xs font-bold text-white/45 sm:block">Tap a team to see its full roster</p>
        </div>

        <section className="mt-4 space-y-3">
          {teams.map((team, position) => {
            const leaders = team.creators.slice(0, 3);
            const open = openTeam === team.number;
            const captainUsername = FIRST_CLASS_CAPTAINS[team.number] || team.creators[0]?.username || "";
            const viceCaptainUsername = FIRST_CLASS_VICE_CAPTAINS[team.number] || "";
            return <article key={team.number} className={`overflow-hidden rounded-[28px] border shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl ${teamPlacementCardStyles[position] || "border-white/12 bg-slate-950/50"}`}>
              <button type="button" onClick={() => setOpenTeam(open ? null : team.number)} className="group grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-4 text-left sm:grid-cols-[55px_minmax(0,1fr)_185px_145px] sm:gap-5 sm:px-6 sm:py-5">
                <span className={`text-2xl font-black italic sm:text-3xl ${teamPlacementStyles[position] || "text-white/45"}`}>{position + 1}</span>
<div className="min-w-0"><div className="flex items-center gap-2 sm:gap-3"><div className="flex -space-x-3"><Avatar username={captainUsername} className="relative z-10 h-12 w-12 shrink-0 rounded-full border-2 border-amber-300 shadow-[0_0_20px_rgba(252,211,77,0.55)] sm:h-[72px] sm:w-[72px]" /><Avatar username={viceCaptainUsername} className="mt-7 h-8 w-8 shrink-0 rounded-full border-2 border-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.38)] sm:mt-11 sm:h-11 sm:w-11" /></div><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/45 sm:text-[10px] sm:tracking-[0.2em]">Team {team.number}</p><h3 className="whitespace-nowrap text-sm font-black uppercase italic tracking-tight text-amber-200 sm:text-2xl sm:tracking-normal">{captainUsername || "Captain"}</h3><p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100/60 sm:text-[10px]">Captain</p><p className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.12em] text-sky-200 sm:text-[10px]">VC · {viceCaptainUsername}</p></div></div></div>
                <div className="hidden items-center justify-self-end gap-2 sm:flex sm:gap-3">{leaders.map((creator, index) => { const podium = podiumStyles[index]; return <div key={creator.username} className="relative text-center"><Avatar username={creator.username} className={`h-9 w-9 rounded-full border-2 bg-slate-950 text-[9px] sm:h-12 sm:w-12 sm:text-xs ${podium.border} ${podium.glow}`} /><span className={`mt-1 block text-[9px] ${podium.text}`}>◆</span></div>; })}</div>
                <div className="justify-self-end whitespace-nowrap text-right"><p className="text-xl font-black italic sm:text-3xl">{team.total.toLocaleString()}</p><p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/45 sm:tracking-[0.2em]">Points</p></div>
                <span className="col-span-full -mx-4 -mb-4 mt-3 grid h-10 place-items-center border-t border-white/10 bg-black/15 text-[10px] font-black uppercase tracking-[0.26em] text-teal-100 transition hover:bg-teal-300/10 hover:text-teal-50 sm:-mx-6 sm:-mb-5 sm:mt-4">{open ? "Hide Team" : "View Team"}</span>
              </button>
              {open && <div className="border-t border-white/10 bg-black/15 p-3 sm:p-5"><div className="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)]"><aside className="flex items-center gap-3 rounded-[24px] border border-amber-300/35 bg-amber-300/10 p-4 sm:flex-col sm:justify-center sm:text-center"><Avatar username={captainUsername} className="h-16 w-16 shrink-0 rounded-full border-2 border-amber-300 sm:h-24 sm:w-24" /><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Team captain</p><p className="mt-1 break-all text-sm font-black uppercase italic text-white">{captainUsername}</p></div></aside><div><div className="mb-4 flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Team roster · {team.creators.length} creators</p><p className="text-xs font-bold text-teal-200">Top 3 leading creators</p></div><div className="grid gap-2 sm:grid-cols-2">{team.creators.map((creator, index) => <div key={creator.username} className={`flex items-center gap-3 rounded-2xl border bg-white/[0.045] px-3 py-2.5 ${index < 3 ? podiumStyles[index].border : "border-white/8"}`}><span className={`w-5 text-center text-xs font-black ${index < 3 ? podiumStyles[index].text : "text-white/35"}`}>{index + 1}</span><Avatar username={creator.username} className={`h-9 w-9 rounded-full border-2 text-[10px] ${index < 3 ? podiumStyles[index].border : "border-transparent"}`} /><span className="min-w-0 flex-1 truncate text-sm font-black uppercase italic">{creator.username}</span><span className="text-sm font-black text-white/65">◆ {creator.diamonds.toLocaleString()}</span></div>)}</div></div></div></div>}
            </article>;
          })}
        </section>
      </section>
      <style jsx global>{`@keyframes captainSlideIn { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } } .captain-card { animation: captainSlideIn .55s cubic-bezier(.2,.8,.2,1) both; }`}</style>
      <style jsx global>{`@keyframes firstClassFloat { 50% { transform: translateY(-24px) translateX(12px); } } @keyframes firstClassPlane { 0% { transform: translateY(-8vh) scale(.08); opacity: 0; } 12% { opacity: 1; } 76% { transform: translateY(3vh) scale(1.25); opacity: 1; } 100% { transform: translateY(5vh) scale(2.25); opacity: 0; } } @keyframes firstClassIntro { 0%, 79% { opacity: 1; visibility: visible; } 100% { opacity: 0; visibility: hidden; } } @keyframes firstClassContent { 0%, 76% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } } .floating-orb { animation: firstClassFloat 10s ease-in-out infinite; } .floating-orb-delayed { animation: firstClassFloat 14s ease-in-out -5s infinite; } .first-class-plane { animation: firstClassPlane 3.4s cubic-bezier(.12,.7,.18,1) both; } .first-class-intro { animation: firstClassIntro 4s ease-out both; } .first-class-content { animation: firstClassContent 4.4s ease-out both; } @media (prefers-reduced-motion: reduce) { .floating-orb, .floating-orb-delayed, .first-class-plane, .first-class-intro, .first-class-content { animation: none; } .first-class-intro { display: none; } }`}</style>
    </main>
  );
}
