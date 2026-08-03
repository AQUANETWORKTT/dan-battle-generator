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
    <div className="agency-space-logo"><Image src={`/agency-logos/${params.agency}.png`} alt={`${agency} agency`} width={700} height={400} priority /></div>
    <section className="agency-workspace">
      <Link className="poster-generator-link" href={`/agency/${params.agency}/generator`}>POSTER GENERATOR</Link>
    </section>
  </main>;
}
