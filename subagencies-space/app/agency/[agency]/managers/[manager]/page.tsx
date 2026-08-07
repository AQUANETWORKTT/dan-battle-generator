"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Creator = { username: string; daysSinceJoining: number };
const accents: Record<string, string> = { paradise: "#d6a65e", respawn: "#28d7c3", horizon: "#f97316", trident: "#38bdf8" };

export default function ManagerPortal() {
  const { agency, manager } = useParams<{ agency: string; manager: string }>();
  const searchParams = useSearchParams();
  const managerLabel = searchParams.get("label") || "MANAGER";
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    fetch(`/api/onboarding?manager=${encodeURIComponent(manager)}&agency=${agency}`)
      .then((response) => response.json())
      .then((data) => setCreators(data.creators || []));
  }, [agency, manager]);

  return <main className="space-shell manager-portal" style={{ "--agency": accents[agency], "--accent": accents[agency] } as React.CSSProperties}>
    <nav><Link href={`/agency/${agency}/managers`}>BACK TO MANAGERS</Link></nav>
    <div className="manager-portal-logo"><Image src={`/agency-logos/${agency}.png`} alt={`${agency} agency`} width={360} height={180} priority /></div>
    <p>{managerLabel}</p>
    <h1>MANAGER PORTAL</h1>
    <div className="agency-workspace">
      <Link className="poster-generator-link" href={`/agency/${agency}/managers/${manager}/onboarding?label=${encodeURIComponent(managerLabel)}`}>
        <span>CREATOR CARE</span><strong>ONBOARDING</strong><span className="poster-generator-cta">{creators.length} NEW CREATORS →</span>
      </Link>
      <Link className="poster-generator-link" href={`/agency/${agency}/managers/${manager}/tasks?label=${encodeURIComponent(managerLabel)}`}>
        <span>MANAGER TOOL</span><strong>TASK<br />SPACE</strong><span className="poster-generator-cta">OPEN TASKS →</span>
      </Link>
    </div>
  </main>;
}
