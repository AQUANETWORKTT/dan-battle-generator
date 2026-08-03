"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

const themes: Record<string, string> = {
  horizon: "#f97316",
  trident: "#38bdf8",
  paradise: "#d6a65e",
  respawn: "#a3e635",
};

export default function AgencySpace() {
  const params = useParams<{ agency: string }>();
  const agency = params.agency?.toUpperCase() || "AGENCY";
  const color = themes[params.agency] || "#facc15";

  return <main className="space-shell" style={{ "--agency": color } as React.CSSProperties}>
    <nav><Link href="/">← LOG OUT</Link></nav>
    <p>FIRST CLASS · SUB-AGENCY PORTAL</p>
    <div className="agency-space-logo"><Image src={`/agency-logos/${params.agency}.png`} alt={`${agency} agency`} width={700} height={400} priority /></div>
    <section className="tool-dashboard">
      <div><span>TOOLS</span><Link href={`/agency/${params.agency}/generator`}>POSTER GENERATOR</Link></div>
      <div><span>OTHER</span><em>MORE TOOLS COMING SOON</em></div>
    </section>
  </main>;
}
