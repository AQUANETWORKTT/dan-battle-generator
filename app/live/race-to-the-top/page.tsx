"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type RaceCreator = { creatorId: string; username: string; diamonds: number; track: "blue" | "bronze" | "silver" | "gold" | "platinum"; target: number };
const trackColours = { blue: "#38bdf8", bronze: "#fb923c", silver: "#d7dee9", gold: "#facc15", platinum: "#f0abfc" };
const number = new Intl.NumberFormat("en-GB");

function RestoredLeaderboard() {
  const [track, setTrack] = useState<RaceCreator["track"]>("blue");
  const [creators, setCreators] = useState<RaceCreator[]>([]);
  const [message, setMessage] = useState("Loading August leaderboard…");
  useEffect(() => { fetch("/api/race-to-the-top", { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setCreators(data.creators || []); setMessage(`${(data.creators || []).length} creators restored`); }).catch(() => setMessage("The August roster is currently unavailable.")); }, []);
  const rows = useMemo(() => creators.filter((creator) => creator.track === track).sort((a, b) => b.diamonds - a.diamonds), [creators, track]);
  return <section className="restored-board"><div className="restored-tabs">{Object.keys(trackColours).map((id) => <button key={id} onClick={() => setTrack(id as RaceCreator["track"])} className={track === id ? "selected" : ""} style={{ "--tier": trackColours[id as RaceCreator["track"]] } as React.CSSProperties}>{id}</button>)}</div><p className="restored-status">{message}</p><div className="restored-list">{rows.map((creator, index) => { const pct = Math.min(100, Math.round((creator.diamonds / Math.max(creator.target, 1)) * 100)); return <div key={creator.creatorId || creator.username}><b style={{ color: trackColours[track] }}>{index + 1}</b><strong>{creator.username}</strong><span><i style={{ width: `${pct}%`, background: trackColours[track] }} /></span><em>{pct}%</em><small>{number.format(creator.diamonds)} / {number.format(creator.target)}</small></div>; })}{!rows.length && <p>No creators are listed in this track.</p>}</div></section>;
}

export default function RaceToTheTopPage() {
  return (
    <main className="finished-event" aria-labelledby="event-finished-title">
      <section className="finished-event-card">
        <Image
          src="/race-to-the-top-logo-transparent.png"
          alt="Race to the Top"
          className="finished-event-logo"
          width={1536}
          height={1024}
          priority
        />
        <p className="archived-label">Reactivated August event</p>
        <h1 id="event-finished-title">Race to the Top Leaderboard</h1>
        <RestoredLeaderboard />
      </section>

      <style jsx>{`
        .finished-event {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px 20px;
          background:
            linear-gradient(rgba(9, 10, 15, 0.84), rgba(9, 10, 15, 0.94)),
            url("/race-to-the-top-background.png") center / cover;
          color: #e5e7eb;
        }

        .finished-event-card {
          width: min(100%, 920px);
          padding: 46px 32px;
          border: 1px solid rgba(203, 213, 225, 0.22);
          border-radius: 28px;
          background: rgba(29, 32, 42, 0.82);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.36);
          text-align: center;
        }

        .finished-event-logo {
          display: block;
          width: min(100%, 390px);
          height: auto;
          margin: 0 auto 24px;
          filter: grayscale(1) brightness(0.82) opacity(0.68);
        }

        .archived-label {
          margin: 0 0 12px;
          color: #94a3b8;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          color: #f1f5f9;
          font-family: var(--font-norwester), sans-serif;
          font-size: clamp(1.85rem, 6vw, 3rem);
          line-height: 1.08;
          text-transform: uppercase;
        }
        .restored-board { margin-top: 28px; text-align: left; }
        .restored-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 7px; }
        .restored-tabs button { border: 1px solid color-mix(in srgb, var(--tier) 58%, transparent); border-radius: 11px; background: rgba(0,0,0,.35); color: var(--tier); padding: 10px 5px; font: 800 11px Arial,sans-serif; text-transform: uppercase; cursor: pointer; }
        .restored-tabs button.selected { background: color-mix(in srgb, var(--tier) 20%, transparent); box-shadow: 0 0 16px color-mix(in srgb, var(--tier) 35%, transparent); }
        .restored-status { margin: 15px 0 8px; color: rgba(255,255,255,.5); font-size: 11px; text-align: center; }
        .restored-list { overflow: hidden; border: 1px solid rgba(255,255,255,.1); border-radius: 15px; }
        .restored-list > div { display: grid; grid-template-columns: 32px minmax(0,1fr) minmax(80px,1.5fr) 48px; gap: 8px; align-items: center; padding: 11px; border-bottom: 1px solid rgba(255,255,255,.08); }
        .restored-list > div:last-child { border-bottom: 0; }.restored-list strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }.restored-list span { height:7px; overflow:hidden; border-radius:9px; background:rgba(255,255,255,.1); }.restored-list i{display:block;height:100%;border-radius:inherit}.restored-list em{font-style:normal;font-weight:800;font-size:12px}.restored-list small{grid-column:2/-1;color:rgba(255,255,255,.4);font-size:10px}
      `}</style>
    </main>
  );
}
