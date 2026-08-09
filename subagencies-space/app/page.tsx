"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const agencies = [
  { id: "paradise", name: "PARADISE", password: "GEE56", color: "#d6a65e", background: "/agency-backgrounds/paradise.png" },
  { id: "respawn", name: "RESPAWN", password: "NICK12", color: "#28d7c3", background: "" },
  { id: "horizon", name: "HORIZON", password: "DENS34", color: "#f97316", background: "/agency-backgrounds/horizon.png" },
  { id: "trident", name: "TRIDENT", password: "MARCY78", color: "#38bdf8", background: "/agency-backgrounds/trident.png" },
] as const;
const MASTER_ACCESS_PASSWORD = "DAN44";

//

export default function Home() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const selected = agencies.find((agency) => agency.id === selectedId);

  function selectAgency(id: string) { setSelectedId((current) => current === id ? "" : id); setPassword(""); setError(""); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const enteredPassword = password.trim().toUpperCase();
    const hasAgencyAccess = enteredPassword === selected.password;
    const hasMasterAccess = enteredPassword === MASTER_ACCESS_PASSWORD;
    if (!hasAgencyAccess && !hasMasterAccess) {
      setError("ACCESS DENIED");
      window.setTimeout(() => { setSelectedId(""); setPassword(""); setError(""); }, 900);
      return;
    }
    try {
      window.sessionStorage.setItem(`subagency-access-${selected.id}`, "granted");
    } catch {
      // Storage can be unavailable in some mobile and private browsing modes.
    }
    // The master password grants access to the agency selected above; it never
    // changes the destination to First Class or another sub-agency.
    router.push(`/agency/${selected.id}`);
  }

  return <main className="home-shell">
    <div className="portal-background" aria-hidden>
      <i className="portal-scene paradise" />
      <i className="portal-scene respawn" />
      <i className="portal-scene horizon" />
      <i className="portal-scene trident" />
    </div>
    <div className="gold-glow" aria-hidden />
    <header className="hero"><Image className="portal-title" src="/first-class-sub-agencies-title-v2.png" alt="First Class Sub-Agencies" width={2048} height={768} priority /><small>SELECT YOUR AGENCY TO ENTER ITS WORKSPACE</small></header>
    <section className="agency-grid" aria-label="Sub-agency access">{agencies.map((agency) => {
      const isOpen = selectedId === agency.id;
      return <article key={agency.id} className={`agency-entry ${agency.id}`} style={{ "--agency": agency.color, "--card-background": agency.background ? `url(${agency.background})` : "none" } as React.CSSProperties}>
        <button type="button" className="agency-card" onClick={() => selectAgency(agency.id)} aria-label={`Enter ${agency.name} space`}><span className="agency-card-logo"><Image src={`/agency-logos/${agency.id}.png`} alt={`${agency.name} agency`} width={520} height={320} /></span><strong>ENTER SPACE</strong></button>
        <Link href={`/agency/${agency.id}/managers`} className="portal-managers" style={{ "--agency": agency.color, "--card-background": agency.background ? `url(${agency.background})` : "none" } as React.CSSProperties}><Image src={`/agency-logos/${agency.id}.png`} alt="" width={220} height={100}/><strong>MANAGERS</strong></Link>
        <form className={`inline-access ${isOpen ? "open" : ""}`} onSubmit={submit}><div><input autoFocus={isOpen} value={isOpen ? password : ""} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="ENTER PASSWORD" type="password" /><button type="submit">ENTER</button>{error && isOpen && <small>{error}</small>}</div></form>
      </article>;
    })}</section>
  </main>;
}
