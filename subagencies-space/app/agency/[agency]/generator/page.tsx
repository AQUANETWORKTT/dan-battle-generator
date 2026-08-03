"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function Generator() {
  const params = useParams<{ agency: string }>();
  const agency = params.agency?.toUpperCase() || "AGENCY";

  return <main className="space-shell">
    <nav><Link href={`/agency/${params.agency}`}>← GO BACK</Link><Link href="/">LOG OUT</Link></nav>
    <p>FIRST CLASS · SUB-AGENCY PORTAL</p>
    <div className="agency-space-logo compact"><Image src={`/agency-logos/${params.agency}.png`} alt={`${agency} agency`} width={700} height={400} priority /></div>
    <h1>POSTER GENERATOR</h1>
    <section>
      <span>POSTER GENERATOR</span><h2>FRESH WORKSPACE</h2><button type="button">CREATE NEW POSTER</button>
      <small>Your saved posters will stay separate from the other sub-agencies.</small>
    </section>
  </main>;
}
