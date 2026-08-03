"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

const themes: Record<string, { structure: string; accent: string; background: string }> = {
  horizon: { structure: "#f97316", accent: "#f97316", background: "/agency-page-backgrounds/horizon.png" },
  trident: { structure: "#38bdf8", accent: "#38bdf8", background: "/agency-page-backgrounds/trident.png" },
  paradise: { structure: "#d6a65e", accent: "#d6a65e", background: "/agency-page-backgrounds/paradise.png" },
  respawn: { structure: "#facc15", accent: "#28d7c3", background: "" },
};

export default function AgencySpace() {
  const params = useParams<{ agency: string }>();
  const agency = params.agency?.toUpperCase() || "AGENCY";
  const theme = themes[params.agency] || { structure: "#facc15", accent: "#facc15", background: "" };

  return <main className="space-shell" style={{ "--agency": theme.structure, "--accent": theme.accent, "--page-background": theme.background ? `url(${theme.background})` : "none" } as React.CSSProperties}>
    <nav><Link href="/">← LOG OUT</Link></nav>
    <p>FIRST CLASS · SUB-AGENCY PORTAL</p>
    <div className="agency-space-logo"><Image src={`/agency-logos/${params.agency}.png`} alt={`${agency} agency`} width={700} height={400} priority /></div>
    <section className="tool-dashboard">
      <div><span>TOOLS</span><Link href={`/agency/${params.agency}/generator`}>POSTER GENERATOR</Link></div>
      <div><span>OTHER</span><em>MORE TOOLS COMING SOON</em></div>
    </section>
  </main>;
}
