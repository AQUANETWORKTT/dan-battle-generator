"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";

const agencies = [
  { id: "paradise", name: "PARADISE", password: "GEE56", color: "#d6a65e", background: "/agency-backgrounds/paradise.png" },
  { id: "respawn", name: "RESPAWN", password: "NICK12", color: "#28d7c3", background: "" },
  { id: "horizon", name: "HORIZON", password: "DENS34", color: "#f97316", background: "/agency-backgrounds/horizon.png" },
  { id: "trident", name: "TRIDENT", password: "MARCY78", color: "#38bdf8", background: "/agency-backgrounds/trident.png" },
] as const;

export default function Home() {
  const [selectedId, setSelectedId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const denialTimer = useRef<number | null>(null);
  const selected = agencies.find((agency) => agency.id === selectedId);

  function selectAgency(id: string) {
    if (denialTimer.current) window.clearTimeout(denialTimer.current);
    setSelectedId((current) => current === id ? "" : id);
    setPassword("");
    setError("");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const enteredPassword = password.trim().toUpperCase();
    if (enteredPassword !== selected.password && enteredPassword !== "DAN44") {
      setError("ACCESS DENIED");
      denialTimer.current = window.setTimeout(() => { setSelectedId(""); setPassword(""); setError(""); }, 900);
      return;
    }
    try {
      window.sessionStorage.setItem(`subagency-access-${selected.id}`, "granted");
    } catch {
      // Storage can be unavailable in some mobile and private browsing modes.
    }
    window.location.assign(`/agency/${selected.id}`);
  }

  return <main className="home-shell">
    <div className="portal-background" aria-hidden>
      <i className="portal-scene paradise" />
      <i className="portal-scene respawn" />
      <i className="portal-scene horizon" />
      <i className="portal-scene trident" />
    </div>
    <div className="gold-glow" aria-hidden />
    <header className="hero"><Image src="/first-class-agency-logo.png" alt="First Class Agency" width={360} height={245} priority /><h1>SUB-AGENCY <span>PORTAL</span></h1><small>SELECT YOUR AGENCY TO ENTER ITS WORKSPACE</small></header>
    <section className="agency-grid" aria-label="Sub-agency access">{agencies.map((agency) => {
      const isOpen = selectedId === agency.id;
      return <article key={agency.id} className={`agency-entry ${agency.id}`} style={{ "--agency": agency.color, "--card-background": agency.background ? `url(${agency.background})` : "none" } as React.CSSProperties}>
        <button type="button" className="agency-card" onClick={() => selectAgency(agency.id)} aria-label={`Enter ${agency.name} space`}><span className="agency-card-logo"><Image src={`/agency-logos/${agency.id}.png`} alt={`${agency.name} agency`} width={520} height={320} /></span><strong>ENTER SPACE</strong></button>
        <form className={`inline-access ${isOpen ? "open" : ""}`} onSubmit={submit}><div><input autoFocus={isOpen} value={isOpen ? password : ""} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="ENTER PASSWORD" type="password" /><button type="submit">ENTER</button>{error && isOpen && <small>{error}</small>}</div></form>
      </article>;
    })}</section>
  </main>;
}
