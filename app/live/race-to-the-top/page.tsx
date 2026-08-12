"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Target = { label: string; value: string };
type Track = { id: string; name: string; prize: string; tone: string; glow: string; count: number; targets: Target[] };
type TrackId = "blue" | "bronze" | "silver" | "gold" | "platinum";
type RaceCreator = { creatorId: string; username: string; diamonds: number; lastMonthDiamonds: number; validLiveDays: number; liveHours: number; followers: number; track: TrackId; target: number };
type Creator = Omit<RaceCreator, "track"> & { name: string; pct: number; diamondPct: number; done: number; track: Track; rank: number };

const tracks: Track[] = [
  { id: "blue", name: "Blue", prize: "Flying Jets", tone: "#38bdf8", glow: "rgba(56,189,248,.32)", count: 682, targets: [{ label: "Diamonds", value: "100K" }, { label: "Valid days", value: "8" }, { label: "Live hours", value: "20H" }, { label: "Followers", value: "75" }] },
  { id: "bronze", name: "Bronze", prize: "Sports Car", tone: "#fb923c", glow: "rgba(251,146,60,.32)", count: 300, targets: [{ label: "Diamonds", value: "100K" }, { label: "Valid days", value: "11" }, { label: "Live hours", value: "30H" }, { label: "Followers", value: "100" }, { label: "Rank goal", value: "Maintain" }] },
  { id: "silver", name: "Silver", prize: "Interstellar", tone: "#cbd5e1", glow: "rgba(203,213,225,.28)", count: 200, targets: [{ label: "Diamonds", value: "200K" }, { label: "Valid days", value: "15" }, { label: "Live hours", value: "40H" }, { label: "Followers", value: "150" }, { label: "Rank goal", value: "Maintain" }] },
  { id: "gold", name: "Gold", prize: "Leopard", tone: "#facc15", glow: "rgba(250,204,21,.3)", count: 100, targets: [{ label: "Diamonds", value: "300K" }, { label: "Valid days", value: "18" }, { label: "Live hours", value: "60H" }, { label: "Followers", value: "200" }, { label: "Rank goal", value: "Maintain" }] },
  { id: "platinum", name: "Platinum", prize: "Thunder Falcon", tone: "#f0abfc", glow: "rgba(240,171,252,.35)", count: 18, targets: [{ label: "Diamonds", value: "Individual Maintain Target" }, { label: "Valid days", value: "22" }, { label: "Live hours", value: "80H" }, { label: "Followers", value: "250" }, { label: "Rank goal", value: "Maintain" }] },
];

const prizeImageByTrack: Record<string, string> = {
  blue: "/prize-flying-jets.webp",
  bronze: "/prize-sports-car.webp",
  silver: "/prize-interstellar.webp",
  gold: "/prize-leopard.webp",
  platinum: "/prize-thunder-falcon.webp",
};

const RACE_WINNER_USERNAME = "mavismim";

function normalizedUsername(value: string) {
  return value.replace(/^@/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function CreatorAvatar({ username }: { username: string }) {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "180px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const localUrl = `/creators/${encodeURIComponent(username.trim().toLowerCase())}.jpg`;
    const localImage = new window.Image();
    const loadScrapedAvatar = async () => {
      try {
        const response = await fetch("/api/tiktok-avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
        const data = response.ok ? await response.json() : null;
        if (!cancelled && data?.avatar) setAvatarUrl(data.avatar);
        else if (!cancelled) setFailed(true);
      } catch { if (!cancelled) setFailed(true); }
    };
    localImage.onload = () => { if (!cancelled) setAvatarUrl(localUrl); };
    localImage.onerror = () => { void loadScrapedAvatar(); };
    localImage.src = localUrl;
    return () => { cancelled = true; };
  }, [username, visible]);

  if (avatarUrl && !failed) return <img src={avatarUrl} alt={username} className="h-full w-full object-cover" onError={() => setFailed(true)} />;
  return <span ref={rootRef} className="grid h-full w-full place-items-center bg-[#130a16] font-black text-[10px] text-white/80">{username.slice(0, 2).toUpperCase()}</span>;
}

function formatDiamonds(value: number) {
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
}

function buildCreators(track: Track, roster: RaceCreator[]): Creator[] {
  return roster
    .filter((creator) => creator.track === track.id)
    .map((creator) => {
      const diamondPct = creator.target > 0 ? Math.min(100, (creator.diamonds / creator.target) * 100) : 0;
      const targetProgress = [
        diamondPct,
        Math.min(100, (creator.validLiveDays / Number(track.targets.find((target) => target.label === "Valid days")?.value || 1)) * 100),
        Math.min(100, (creator.liveHours / Number(track.targets.find((target) => target.label === "Live hours")?.value.replace("H", "") || 1)) * 100),
        Math.min(100, (creator.followers / Number(track.targets.find((target) => target.label === "Followers")?.value || 1)) * 100),
      ];
      // Overall progress is the average of the four measurable targets. The
      // maintain-rank goal is shown separately because it is pass/fail.
      const pct = Math.round(targetProgress.reduce((total, value) => total + value, 0) / targetProgress.length);
      const done = targetProgress.filter((value) => value >= 100).length;
      return { ...creator, name: creator.username, pct, diamondPct, done, track, rank: 0 };
    })
    .sort((a, b) => b.pct - a.pct || b.diamonds - a.diamonds || a.name.localeCompare(b.name))
    .map((creator, index) => ({ ...creator, rank: index + 1 }));
}

function ProgressTargets({ creator }: { creator: Creator }) {
  return <div className="lookup-progress" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px", width: "100%" }}>{creator.track.targets.map((target, index) => {
    const achieved = target.label === "Diamonds" ? creator.diamondPct
      : target.label === "Valid days" ? Math.min(100, Math.round((creator.validLiveDays / Number(target.value)) * 100))
        : target.label === "Live hours" ? Math.min(100, Math.round((creator.liveHours / Number(target.value.replace("H", ""))) * 100))
          : target.label === "Followers" ? Math.min(100, Math.round((creator.followers / Number(target.value)) * 100))
            : creator.done >= 4 ? 100 : 0;
    const targetValue = target.label === "Diamonds"
      ? `${formatDiamonds(Math.min(creator.diamonds, creator.target))} / ${formatDiamonds(creator.target)}`
      : target.label === "Valid days"
        ? `${Math.min(creator.validLiveDays, Number(target.value))} / ${target.value}`
      : target.label === "Live hours"
        ? `${Math.min(creator.liveHours, Number(target.value.replace("H", ""))) % 1 === 0 ? Math.min(creator.liveHours, Number(target.value.replace("H", ""))).toFixed(0) : Math.min(creator.liveHours, Number(target.value.replace("H", ""))).toFixed(1)}H / ${target.value}`
        : target.label === "Followers"
          ? `${Math.min(creator.followers, Number(target.value))} / ${target.value}`
        : target.value;
    return <div key={target.label} className="lookup-metric" style={{ display: "grid", minHeight: 156, padding: 17, border: `1px solid ${creator.track.tone}`, borderRadius: 18, background: "rgba(4, 6, 13, .7)" }}><div className="metric-top" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}><span>{target.label}</span><b>{index === 4 ? (achieved ? "MET" : "IN PROGRESS") : `${Math.round(achieved)}%`}</b></div><div className="metric-rail" style={{ alignSelf: "center", height: 12, margin: "12px 0", overflow: "hidden", borderRadius: 999, background: "rgba(255,255,255,.12)" }}><div className="metric-fill" style={{ display: "block", height: "100%", width: `${achieved}%`, borderRadius: 999, background: `linear-gradient(90deg, ${creator.track.tone}, #ffffff)`, boxShadow: `0 0 16px ${creator.track.glow}` }} /></div><strong className="metric-target"><span>Target</span><b>{targetValue}</b></strong></div>;
  })}</div>;
}

export default function RaceToTheTopPage() {
  const [activeId, setActiveId] = useState("blue");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [expandedCreator, setExpandedCreator] = useState<string | null>(null);
  const [raceCreators, setRaceCreators] = useState<RaceCreator[]>([]);
  const [rosterStatus, setRosterStatus] = useState("Loading the Race to the Top roster...");
  const activeTrack = tracks.find((item) => item.id === activeId) ?? tracks[0];
  const creatorsByTrack = useMemo(() => new Map(tracks.map((track) => [track.id, buildCreators(track, raceCreators)])), [raceCreators]);
  const rows = creatorsByTrack.get(activeTrack.id) ?? [];
  const winner = rows.find((creator) => normalizedUsername(creator.name) === RACE_WINNER_USERNAME && creator.done === 4) ?? null;
  const leaderboardRows = winner ? rows.filter((creator) => creator.creatorId !== winner.creatorId && creator.name !== winner.name) : rows;
  const foundCreator = useMemo(() => {
    const exactName = submittedQuery.trim().toLocaleLowerCase();
    if (!exactName) return null;
    return Array.from(creatorsByTrack.values()).flat().find((creator) => creator.name.toLocaleLowerCase() === exactName) ?? null;
  }, [creatorsByTrack, submittedQuery]);
  const hasSearch = Boolean(submittedQuery.trim());

  useEffect(() => {
    async function loadRoster() {
      try {
        const response = await fetch("/api/race-to-the-top", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load the Race to the Top roster.");
        setRaceCreators(data.creators || []);
        setRosterStatus(data.hasRaceProgress ? `${(data.creators || []).length} creators loaded with August progress.` : `${(data.creators || []).length} creators sorted from July totals. August progress starts at 0%.`);
      } catch (error) {
        setRosterStatus(error instanceof Error ? error.message : "Could not load the Race to the Top roster.");
      }
    }
    void loadRoster();
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query);
  }

  return <main className="race-page" style={{ "--track": activeTrack.tone, "--glow": activeTrack.glow } as React.CSSProperties}>
    <section className="hero"><div className="logo-placeholder" aria-label="Race to the Top logo" /><p>FIRST CLASS · AUGUST 1–31</p><h1>RACE TO THE <span>TOP</span></h1><small>Maintain your track targets to secure your prize.</small></section>
    <section className="creator-search" aria-label="Creator progress search"><div><p>CREATOR LOOKUP</p><h2>FIND YOUR PROGRESS</h2><small>ENTER YOUR EXACT CREATOR NAME TO SEE YOUR TRACK, POSITION AND TARGET PROGRESS.</small><small className="roster-status">{rosterStatus}</small></div><form onSubmit={submitSearch}><label htmlFor="creator-name">EXACT CREATOR NAME</label><div><input id="creator-name" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="USERNAME" autoComplete="off" /><button type="submit">SEARCH</button></div></form></section>
    {hasSearch && <section className="lookup-result" style={{ "--lookup-track": foundCreator?.track.tone ?? activeTrack.tone, "--lookup-glow": foundCreator?.track.glow ?? activeTrack.glow } as React.CSSProperties}>{foundCreator ? <><header><div><span>CREATOR FOUND</span><h2>{foundCreator.name}</h2></div><strong>{foundCreator.pct}% COMPLETE</strong></header><div className="lookup-summary"><div><span>TRACK</span><b>{foundCreator.track.name}</b></div><div><span>POSITION</span><b>#{foundCreator.rank}</b></div><div><span>TARGETS HIT</span><b>{foundCreator.done}/4</b></div><div><span>PRIZE</span><b>{foundCreator.track.prize}</b></div></div><ProgressTargets creator={foundCreator} /></> : <div className="no-result"><b>NO EXACT MATCH FOUND</b><span>CHECK THE SPELLING AND ENTER THE FULL CREATOR NAME.</span></div>}</section>}
    <nav className="track-tabs">{tracks.map((item) => <button key={item.id} onClick={() => setActiveId(item.id)} className={item.id === activeTrack.id ? "active" : ""} style={{ "--tab": item.tone, "--tab-glow": item.glow } as React.CSSProperties}><strong>{item.name}</strong><b>{item.prize}</b><small>VIEW TRACK</small></button>)}</nav>
    {winner && <section className="winner-card" aria-label="Race winner"><span>WINNER</span><div><strong>{winner.name}</strong></div><small>{activeTrack.name} TRACK · ALL TARGETS HIT</small></section>}
    <section className="track-shell"><header className="track-header"><div><p>{activeTrack.name} TRACK</p><h2>{activeTrack.name} LEADERBOARD</h2></div><div className="prize"><span>PRIZE</span><strong><span>{activeTrack.prize}</span><img src={prizeImageByTrack[activeTrack.id]} alt="" /></strong></div></header><div className="targets">{activeTrack.targets.map((target) => <div key={target.label} className={target.value === "Individual Maintain Target" ? "long-target" : ""}><span>{target.label}</span><strong>{target.value}</strong><small>TARGET</small></div>)}</div><div className="race-list">{leaderboardRows.map((row) => { const rowKey = row.creatorId || row.name.toLowerCase(); const completedTarget = row.done === 4; return <div key={rowKey} className="creator-entry"><button type="button" className={`race-row ${completedTarget ? "completed-target" : ""} ${expandedCreator === rowKey ? "expanded" : ""}`} onClick={() => setExpandedCreator((current) => current === rowKey ? null : rowKey)} aria-expanded={expandedCreator === rowKey}><b className="rank">#{row.rank}</b><div className="avatar overflow-hidden"><CreatorAvatar username={row.name} /></div><div className="creator"><div><h3>{row.name}</h3><span>{completedTarget ? "COMPLETED TARGET" : `${row.done}/4 TARGETS HIT`}</span></div><div className="rail"><i style={{ width: `${row.pct}%` }} /></div></div><strong className="percent">{row.pct}%</strong><span className="expand-icon">{expandedCreator === rowKey ? "−" : "+"}</span></button>{expandedCreator === rowKey && <section className="creator-dropdown"><header><div><span>{row.track.name} TRACK · POSITION #{row.rank}</span><h3>{row.name}</h3></div><strong>{row.pct}% COMPLETE</strong></header><ProgressTargets creator={row} /></section>}</div>; })}</div></section>
    <style jsx>{`
      .race-row.completed-target{border-color:#fde68a;background:linear-gradient(120deg,rgba(102,61,0,.78),rgba(250,204,21,.28),rgba(70,40,0,.78));box-shadow:inset 0 0 18px rgba(250,204,21,.18),0 0 15px rgba(250,204,21,.16)}.race-row.completed-target .rank,.race-row.completed-target .creator span,.race-row.completed-target .percent{color:#fde68a}.race-row.completed-target .avatar{border-color:#facc15;color:#fde68a}.race-row.completed-target .rail i{background:linear-gradient(90deg,#b77900,#facc15,#fff2ad);box-shadow:0 0 14px rgba(250,204,21,.75)}
    `}</style>
    <style jsx>{`
      .winner-card{position:relative;z-index:1;display:grid;gap:5px;max-width:960px;margin:18px auto 0;overflow:hidden;padding:22px 26px;border:1px solid #fde68a;border-radius:24px;background:linear-gradient(120deg,#5d3700 0%,#f8d15b 33%,#fff2ad 50%,#d79515 67%,#4b2a00 100%);box-shadow:0 0 18px #facc15,0 0 55px rgba(250,204,21,.66),inset 0 0 22px rgba(255,255,255,.65);color:#281300;text-align:center;text-shadow:0 1px 0 #fff0a6}.winner-card:before{position:absolute;inset:-35% -70%;content:"";background:linear-gradient(110deg,transparent 42%,rgba(255,255,255,.92) 50%,transparent 58%);animation:winner-shine 2.8s linear infinite;pointer-events:none}.winner-card>*{position:relative}.winner-card>span{font-size:13px;font-weight:1000;letter-spacing:.42em}.winner-card>div{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 16px}.winner-card strong{font-family:var(--font-norwester),Impact,sans-serif;font-size:clamp(30px,5vw,52px);line-height:1}.winner-card small{font-size:10px;font-weight:900;letter-spacing:.15em}@keyframes winner-shine{from{transform:translateX(-55%) rotate(8deg)}to{transform:translateX(55%) rotate(8deg)}}
    `}</style>
  </main>;
}
