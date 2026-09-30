"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Track = "bronze" | "silver" | "gold" | "platinum";
type Creator = { id: string; username: string; diamonds: number; liveDays: number; liveHours: number; followers: number; track: Track; target: number; completedAt?: string | null };
type Tier = { label: string; prize: string; colour: string; glow: string; diamondTarget: number; days: number; hours: number; followers: number };

const tiers: Record<Track, Tier> = {
  bronze: { label: "BRONZE", prize: "£50", colour: "#FB923C", glow: "rgba(251,146,60,.42)", diamondTarget: 100000, days: 15, hours: 40, followers: 100 },
  silver: { label: "SILVER", prize: "£75", colour: "#E5E7EB", glow: "rgba(229,231,235,.3)", diamondTarget: 200000, days: 15, hours: 40, followers: 150 },
  gold: { label: "GOLD", prize: "£125", colour: "#FACC15", glow: "rgba(250,204,21,.42)", diamondTarget: 300000, days: 18, hours: 60, followers: 200 },
  platinum: { label: "PLATINUM", prize: "£250", colour: "#E9B7FF", glow: "rgba(233,183,255,.42)", diamondTarget: 500000, days: 22, hours: 80, followers: 250 },
};
const number = new Intl.NumberFormat("en-GB");

export default function RaceToTheTopOctoberPage() {
  const [track, setTrack] = useState<Track>("bronze");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [roster, setRoster] = useState<Creator[]>([]);
  const [rosterMessage, setRosterMessage] = useState("LOADING OCTOBER CREATORS...");
  const tier = tiers[track];
  const creators = useMemo(() => roster.filter((creator) => creator.track === track).sort((a, b) => b.diamonds - a.diamonds), [roster, track]);
  const winners = useMemo(() => {
    const completed = roster.filter((creator) => creator.track === track && creator.completedAt && creator.diamonds >= creator.target && creator.liveDays >= tier.days && creator.liveHours >= tier.hours && creator.followers >= tier.followers);
    const firstTime = completed.reduce<string | null>((first, creator) => !first || creator.completedAt! < first ? creator.completedAt! : first, null);
    return firstTime ? completed.filter((creator) => creator.completedAt === firstTime) : [];
  }, [roster, track, tier]);
  useEffect(() => { fetch("/api/race-to-the-top-october", { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setRoster(data.creators as Creator[]); setRosterMessage(`${data.creators.length} CREATORS LOADED`); }).catch(() => setRosterMessage("OCTOBER ROSTER IS UNAVAILABLE.")); }, []);
  const chooseTrack = (id: Track) => { setTrack(id); setExpanded(null); };
  return <main className="race-page" style={{ "--tier": tier.colour, "--glow": tier.glow } as React.CSSProperties}>
    <section className="wrap">
      <header className="hero"><Image src="/race-to-the-top-october-logo-clean.png" alt="RACE TO THE TOP" width={1600} height={900} priority /><p>1ST - 31ST OCTOBER</p><h1>RACE TO THE TOP <span>OCTOBER</span></h1><small>COMPLETE EVERY TARGET IN YOUR TIER TO WIN THE PRIZE.</small></header>
      <section className="prizes" aria-label="PRIZES">{(Object.keys(tiers) as Track[]).map((id) => <button key={id} className={track === id ? "selected" : ""} onClick={() => chooseTrack(id)} style={{ "--card": tiers[id].colour, "--card-glow": tiers[id].glow } as React.CSSProperties}><span>{tiers[id].label}</span><b>{tiers[id].prize}</b></button>)}</section>
      <section className="board"><nav>{(Object.keys(tiers) as Track[]).map((id) => <button key={id} className={track === id ? "active" : ""} onClick={() => chooseTrack(id)} style={{ "--tab": tiers[id].colour } as React.CSSProperties}>{tiers[id].label}</button>)}</nav>
        <header className="board-head"><p>{tier.label} LEADERBOARD</p><div className="requirements"><div className="requirement-box"><span>DIAMOND TARGET</span><strong>{track === "platinum" ? "MAINTAIN" : `${tier.diamondTarget / 1000}K`}</strong></div><div className="requirement-box"><span>VALID LIVE DAYS</span><strong>{tier.days}</strong></div><div className="requirement-box"><span>LIVE HOURS</span><strong>{tier.hours}</strong></div><div className="requirement-box"><span>FOLLOWERS</span><strong>{tier.followers}</strong></div></div></header>
        <div className="creator-list">{creators.map((creator, index) => { const expandedCreator = expanded === creator.id; const pct = Math.min(100, Math.round(creator.diamonds / creator.target * 100)); return <article key={creator.id}><button className={`creator-card ${expandedCreator ? "open" : ""}`} onClick={() => setExpanded(expandedCreator ? null : creator.id)} aria-expanded={expandedCreator}><b>{index + 1}</b><CreatorAvatar username={creator.username} /><strong>{creator.username.toUpperCase()}</strong><div className="rail"><i style={{ width: `${pct}%` }} /></div><em>{pct}%</em><span>{expandedCreator ? "−" : "+"}</span></button>{expandedCreator && <CreatorTargets creator={creator} tier={tier} rank={index + 1} pct={pct} />}</article>; })}</div>
        <p className="note">{rosterMessage} · CLICK A CREATOR TO VIEW INDIVIDUAL TARGETS.</p>
      </section>
    </section>
    <style jsx global>{`
      .race-page,.race-page button,.race-page strong,.race-page small,.race-page span,.race-page p{font-family:var(--font-norwester),Impact,sans-serif}.race-page{min-height:100vh;padding:28px 16px 64px;background:radial-gradient(circle at 50% 0,rgba(255,94,0,.21),transparent 30%),#050403;color:white}.wrap{max-width:960px;margin:auto}.hero,.board{border:1px solid color-mix(in srgb,var(--tier) 55%,transparent);border-radius:28px;background:linear-gradient(145deg,rgba(29,14,4,.95),rgba(3,3,3,.98));box-shadow:0 0 48px var(--glow)}.hero{padding:22px;text-align:center}.hero img{display:block;width:min(100%,620px);height:auto;margin:auto}.hero p{margin:7px 0;color:#fed7aa;font-size:clamp(11px,2vw,16px);letter-spacing:.14em}.hero h1{margin:14px 0 0;font-size:clamp(40px,8vw,72px);line-height:.9}.hero h1 span{color:#fb923c}.hero small{display:block;margin-top:15px;color:#ddd;font-size:11px;letter-spacing:.15em}.prizes{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:16px 0}.prizes button{position:relative;isolation:isolate;overflow:hidden;min-height:128px;border:1px solid color-mix(in srgb,var(--card) 65%,transparent);border-radius:17px;background:linear-gradient(145deg,color-mix(in srgb,var(--card) 15%,#070707),#070707);color:var(--card);cursor:pointer}.prizes button::after{position:absolute;z-index:0;inset:-25% auto -25% -70%;width:45%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);content:"";pointer-events:none;transform:skewX(-20deg);animation:prize-glimmer 3.8s ease-in-out infinite}.prizes button:nth-child(2)::after{animation-delay:.55s}.prizes button:nth-child(3)::after{animation-delay:1.1s}.prizes button:nth-child(4)::after{animation-delay:1.65s}@keyframes prize-glimmer{0%,35%{left:-70%;opacity:0}42%{opacity:.8}62%,100%{left:135%;opacity:0}}.prizes button.selected,.prizes button:hover{box-shadow:0 0 30px var(--card-glow);transform:translateY(-2px)}.prizes span,.prizes b{position:relative;z-index:1;display:block}.prizes span{font-size:11px;letter-spacing:.2em}.prizes b{margin-top:9px;font-size:clamp(42px,6vw,60px)}.board{overflow:hidden;background:linear-gradient(145deg,rgba(23,22,21,.96),rgba(3,3,3,.98))}.board nav{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px;border-bottom:1px solid rgba(255,255,255,.09)}.board nav button{border:1px solid color-mix(in srgb,var(--tab) 55%,transparent);border-radius:10px;background:#070707;color:var(--tab);padding:11px;font-size:11px;letter-spacing:.13em;cursor:pointer}.board nav button.active{background:color-mix(in srgb,var(--tab) 20%,#070707);box-shadow:0 0 16px color-mix(in srgb,var(--tab) 35%,transparent)}.board-head{display:grid;justify-items:center;gap:16px;padding:23px 20px 18px;text-align:center}.board-head p{margin:0;color:var(--tier);font-size:clamp(18px,3vw,28px);letter-spacing:.08em}.requirements{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;width:min(100%,760px)}.requirement-box{display:grid;min-height:86px;align-content:center;gap:6px;border:1px solid color-mix(in srgb,var(--tier) 72%,#fff);border-radius:14px;background:linear-gradient(145deg,color-mix(in srgb,#fff 38%,var(--tier)),var(--tier) 55%,color-mix(in srgb,#000 16%,var(--tier)));box-shadow:inset 0 1px 0 rgba(255,255,255,.72),inset 0 -4px 0 rgba(0,0,0,.2),0 5px 12px color-mix(in srgb,var(--tier) 32%,transparent);color:#15100b;padding:10px;text-align:center;text-shadow:0 1px 0 rgba(255,255,255,.38)}.requirement-box span{font-size:clamp(9px,1.25vw,11px);letter-spacing:.08em;line-height:1.1}.requirement-box strong{font-size:clamp(22px,3.4vw,34px);line-height:.9;letter-spacing:.03em}.creator-list{display:grid;gap:10px;margin:0 14px}.creator-list article{overflow:hidden;border-radius:17px}.creator-card{width:100%;display:grid;grid-template-columns:35px 36px minmax(0,1.35fr) minmax(80px,2fr) 44px 20px;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.14);border-radius:17px;background:rgba(0,0,0,.54);color:#fff;padding:12px;cursor:pointer;text-align:left}.creator-card:hover,.creator-card.open{border-color:var(--tier);box-shadow:0 0 18px var(--glow)}.creator-card>b,.creator-card em,.creator-card>span{color:var(--tier);font-size:20px;text-align:center}.creator-card strong{min-width:0;overflow:hidden;font-size:clamp(10px,1.35vw,14px);letter-spacing:.04em;text-overflow:ellipsis;white-space:nowrap}.creator-avatar{display:grid;height:36px;width:36px;place-items:center;overflow:hidden;border:1px solid color-mix(in srgb,var(--tier) 70%,transparent);border-radius:999px;background:color-mix(in srgb,var(--tier) 18%,#080808);color:var(--tier);font-size:13px;line-height:1}.creator-avatar img{height:100%;width:100%;object-fit:cover}.rail{height:8px;overflow:hidden;border-radius:20px;background:rgba(255,255,255,.12)}.rail i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--tier),#fff);box-shadow:0 0 10px var(--tier)}.target-panel{margin-top:-1px;border:1px solid color-mix(in srgb,var(--tier) 62%,transparent);border-radius:0 0 17px 17px;background:linear-gradient(145deg,color-mix(in srgb,var(--tier) 14%,#040404),#040404);padding:17px}.target-panel header{display:flex;align-items:center;justify-content:space-between;gap:14px}.target-panel p{margin:0;color:var(--tier);font-size:10px;letter-spacing:.14em}.target-panel h3{margin:5px 0 0;font-size:28px}.target-panel header>strong{color:var(--tier);font-size:15px}.target-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.target-grid>div{display:grid;gap:7px;min-width:0;border:1px solid color-mix(in srgb,var(--tier) 46%,transparent);border-radius:13px;background:rgba(0,0,0,.42);padding:13px}.target-grid span{color:#aaa;font-size:9px;letter-spacing:.1em}.target-grid b{color:var(--tier);font-size:11px}.target-grid i{height:7px;overflow:hidden;border-radius:20px;background:rgba(255,255,255,.12)}.target-grid i em{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--tier),#fff)}.target-grid strong{font-size:13px}.note{margin:17px;color:#888;font-size:9px;letter-spacing:.14em;text-align:center}@media(max-width:700px){.prizes{grid-template-columns:repeat(2,1fr)}.requirements{grid-template-columns:repeat(2,minmax(0,1fr))}.requirement-box{min-height:78px}.creator-card{grid-template-columns:28px 30px minmax(0,1fr) 38px 18px;gap:7px}.creator-avatar{height:30px;width:30px}.creator-card .rail{grid-column:3/-1;grid-row:2}.target-grid{grid-template-columns:repeat(2,1fr)}.target-panel header{align-items:flex-start;flex-direction:column}}
    `}</style>
  </main>;
}

function CreatorAvatar({ username }: { username: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "160px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    fetch("/api/tiktok-avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data?.avatar) setAvatar(String(data.avatar)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [username, visible]);

  return <span ref={ref} className="creator-avatar" aria-label={`${username} profile picture`}>
    {avatar ? <img src={avatar} alt="" loading="lazy" onError={() => setAvatar("")} /> : username.slice(0, 1).toUpperCase()}
  </span>;
}

function CreatorTargets({ creator, tier, rank, pct }: { creator: Creator; tier: Tier; rank: number; pct: number }) {
  const targets = [{ label: "DIAMOND TARGET", value: creator.diamonds, target: creator.target, suffix: "" }, { label: "VALID LIVE DAYS", value: creator.liveDays, target: tier.days, suffix: "" }, { label: "LIVE HOURS", value: creator.liveHours, target: tier.hours, suffix: "H" }, { label: "FOLLOWERS", value: creator.followers, target: tier.followers, suffix: "" }];
  return <section className="target-panel"><header><div><p>{tier.label} TRACK · POSITION #{rank}</p><h3>{creator.username.toUpperCase()}</h3></div><strong>{pct}% COMPLETE</strong></header><div className="target-grid">{targets.map((target) => { const progress = Math.min(100, Math.round(target.value / target.target * 100)); return <div key={target.label}><span>{target.label}</span><b>{progress}%</b><i><em style={{ width: `${progress}%` }} /></i><strong>{number.format(Math.min(target.value, target.target))}{target.suffix} / {number.format(target.target)}{target.suffix}</strong></div>; })}</div></section>;
}
