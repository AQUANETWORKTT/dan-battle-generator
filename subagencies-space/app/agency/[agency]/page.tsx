"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const themes: Record<string, { structure: string; accent: string; background: string }> = {
  horizon: { structure: "#f97316", accent: "#f97316", background: "/agency-page-backgrounds/horizon.png" },
  trident: { structure: "#38bdf8", accent: "#38bdf8", background: "/agency-page-backgrounds/trident.png" },
  paradise: { structure: "#d6a65e", accent: "#d6a65e", background: "/agency-page-backgrounds/paradise.png" },
  respawn: { structure: "#28d7c3", accent: "#28d7c3", background: "" },
};

function expectedBackstageDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (name: string) => parts.find((part) => part.type === name)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export default function AgencySpace() {
  const params = useParams<{ agency: string }>();
  const [backstage, setBackstage] = useState<{ updatedToday: boolean; latestDate: string } | null>(null);
  const [checkingBackstage, setCheckingBackstage] = useState(false);
  const agency = params.agency?.toUpperCase() || "AGENCY";
  const theme = themes[params.agency] || { structure: "#facc15", accent: "#facc15", background: "" };

  async function checkBackstage() {
    setCheckingBackstage(true);
    try {
      const response = await fetch("/api/data-analysis/upload-status?latest=true", { cache: "no-store" });
      const status = response.ok ? await response.json() : null;
      setBackstage(status ? { latestDate: String(status.latestDate || ""), updatedToday: String(status.latestDate || "") === expectedBackstageDate() } : { latestDate: "", updatedToday: false });
    } catch { setBackstage({ latestDate: "", updatedToday: false }); }
    finally { setCheckingBackstage(false); }
  }
  useEffect(() => {
    void checkBackstage();
  }, []);

  const updatedToday = backstage?.updatedToday === true;

  return <main className="space-shell" style={{ "--agency": theme.structure, "--accent": theme.accent, "--page-background": theme.background ? `url(${theme.background})` : "none" } as React.CSSProperties}>
    <nav><Link href="/">← LOG OUT</Link></nav>
    <div className="agency-space-logo"><Image src={`/agency-logos/${params.agency}.png`} alt={`${agency} agency`} width={700} height={400} priority /></div>
    <div className="agency-workspace">
      <div className={`backstage-status ${updatedToday ? "updated" : "pending"}`}>
        <span>{updatedToday ? "BACKSTAGE UPDATED TODAY" : "BACKSTAGE NOT UPDATED"}</span>
        <button type="button" onClick={() => void checkBackstage()} disabled={checkingBackstage}>{checkingBackstage ? "CHECKING BACKSTAGE" : backstage?.latestDate ? `LATEST DATA: ${backstage.latestDate} · REFRESH` : "CHECK BACKSTAGE"}</button>
      </div>
      <Link className="poster-generator-link" href={`/agency/${params.agency}/generator`}>
        <span className="poster-generator-kicker">POSTER TOOL</span>
        <strong>BATTLE POSTER<br />GENERATOR</strong>
        <span className="poster-generator-cta">OPEN WORKSPACE&nbsp; →</span>
      </Link>
      {updatedToday ? <Link className="poster-generator-link diamond-hours-card ready" href={`/agency/${params.agency}/diamond-hours`}>
        <span>DAILY POSTERS</span>
        <strong>DIAMOND / HOURS<br />POSTERS</strong>
        <span className="poster-generator-cta">OPEN DOWNLOADS&nbsp;&rarr;</span>
      </Link> : <div className="coming-soon-card diamond-hours-card" aria-disabled="true">
        <span>POSTER TOOL</span>
        <strong>DIAMOND / HOURS<br />POSTERS</strong>
        <em>WAITING FOR BACKSTAGE</em>
      </div>}
      <div className="coming-soon-card health-score-card" aria-disabled="true">
        <span>AGENCY TOOL</span>
        <strong>HEALTH SCORE<br />SYSTEM</strong>
        <em>COMING SOON</em>
      </div>
      <Link className="poster-generator-link managers-link" href={`/agency/${params.agency}/tasks`}>
        <span>OWNER TOOL</span><strong>TASK<br />SPACE</strong><span className="poster-generator-cta">OPEN TASKS&nbsp;&rarr;</span>
      </Link>
      <div className="poster-generator-link managers-link cursor-not-allowed opacity-40 grayscale" aria-disabled="true">
        <span>NETWORK TOOL</span><strong>BATTLE<br />NETWORK</strong><span className="poster-generator-cta">COMING SOON</span>
      </div>
      {params.agency === "paradise" ? <Link className="poster-generator-link managers-link" href={`/agency/${params.agency}/onboarding-progress`}>
        <span>AGENCY VIEW</span><strong>MANAGER ONBOARDING<br />PROGRESS</strong><span className="poster-generator-cta">REVIEW COMPLETIONS&nbsp;&rarr;</span>
      </Link> : null}
    </div>
  </main>;
}
