"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Creator = { username: string; daysSinceJoining: number };
const accents: Record<string, string> = { paradise: "#d6a65e", respawn: "#28d7c3", horizon: "#f97316", trident: "#38bdf8" };
function expectedBackstageDate() { const date = new Date(); date.setUTCDate(date.getUTCDate() - 1); const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const get = (type: string) => parts.find((part) => part.type === type)?.value || ""; return `${get("year")}-${get("month")}-${get("day")}`; }

export default function ManagerPortal() {
  const { agency, manager } = useParams<{ agency: string; manager: string }>(); const searchParams = useSearchParams(); const managerLabel = searchParams.get("label") || "TEAM POSTER";
  const [creators, setCreators] = useState<Creator[]>([]); const [backstageReady, setBackstageReady] = useState(false); const [posterAvailable, setPosterAvailable] = useState(false); const [posterFrame, setPosterFrame] = useState("");
  useEffect(() => { fetch(`/api/onboarding?manager=${encodeURIComponent(manager)}&agency=${agency}`).then((response) => response.json()).then((data) => setCreators(data.creators || [])); fetch(`/api/team-poster-status?manager=${encodeURIComponent(manager)}`).then((response) => response.json()).then((data) => setPosterAvailable(Boolean(data.available))).catch(() => setPosterAvailable(false)); }, [agency, manager]);
  useEffect(() => { fetch("/api/data-analysis/upload-status?latest=true", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((status) => setBackstageReady(String(status?.latestDate || "") === expectedBackstageDate())).catch(() => setBackstageReady(false)); }, []);
  const canDownload = backstageReady && posterAvailable;
  function downloadPoster() { if (!canDownload) return; setPosterFrame(`/agency/${agency}/diamond-hours?manager=${encodeURIComponent(managerLabel)}&download=true&embedded=true&t=${Date.now()}`); }
  return <main className="space-shell manager-portal" style={{ "--agency": accents[agency], "--accent": accents[agency] } as React.CSSProperties}><nav><Link href={`/agency/${agency}/managers`}>BACK TO MANAGERS</Link></nav><div className="manager-portal-logo"><Image src={`/agency-logos/${agency}.png`} alt={`${agency} agency`} width={360} height={180} priority /></div><h1>MANAGER PORTAL</h1><div className="agency-workspace"><button type="button" className={`poster-generator-link manager-poster-action ${canDownload ? "" : "is-locked"}`} onClick={downloadPoster} disabled={!canDownload}><span>TEAM POSTER</span><strong>TEAM<br />POSTER</strong><span className="poster-generator-cta">{!backstageReady ? "WAITING FOR BACKSTAGE" : posterAvailable ? "DOWNLOAD POSTER →" : "NO POSTER AVAILABLE"}</span></button><Link className="poster-generator-link" href={`/agency/${agency}/managers/${manager}/onboarding?label=${encodeURIComponent(managerLabel)}`}><span>CREATOR CARE</span><strong>ONBOARDING</strong><span className="poster-generator-cta">{creators.length} NEW CREATORS →</span></Link><Link className="poster-generator-link" href={`/agency/${agency}/managers/${manager}/tasks?label=${encodeURIComponent(managerLabel)}`}><span>MANAGER TOOL</span><strong>TASK<br />SPACE</strong><span className="poster-generator-cta">OPEN TASKS →</span></Link></div>{posterFrame ? <iframe title="Team poster download" className="manager-download-frame" src={posterFrame} /> : null}</main>;
}
