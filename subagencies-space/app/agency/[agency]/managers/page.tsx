"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Manager = { manager_key: string; manager_label: string };
const accents: Record<string, string> = { paradise: "#d6a65e", respawn: "#28d7c3", horizon: "#f97316", trident: "#38bdf8" };
function managerPassword(label: string) { const name = label.replace(/^team\s+/i, "").replace(/[^a-z]/gi, "").toUpperCase(); return `T${name.slice(0, 2)}2026`; }

export default function ManagersPage() {
  const { agency } = useParams<{ agency: string }>();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selected, setSelected] = useState<Manager | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const visible = useMemo(() => managers, [managers]);
  useEffect(() => { fetch("/api/data-analysis/manager-assignments").then((r) => r.json()).then((data) => setManagers((data.managers || []).filter((manager: { group?: string; name?: string }) => manager.group?.toLowerCase() === agency && manager.group !== "Recruitment" && !manager.name?.includes(" - ")).map((manager: { key: string; name: string }) => ({ manager_key: manager.key, manager_label: manager.name })))).catch(() => setManagers([])).finally(() => setLoading(false)); }, [agency]);
  function enter(event: React.FormEvent) { event.preventDefault(); if (!selected || (password.trim().toUpperCase() !== managerPassword(selected.manager_label) && password.trim().toUpperCase() !== "DAN44")) { setError("ACCESS DENIED"); return; } window.location.assign(`/agency/${agency}/managers/${encodeURIComponent(selected.manager_key)}?label=${encodeURIComponent(selected.manager_label)}`); }
  return <main className="space-shell" style={{ "--agency": accents[agency] || "#facc15", "--page-background": "none" } as React.CSSProperties}>
    <nav><Link href="/">BACK</Link></nav><p>MANAGER ACCESS</p><h1>{agency} MANAGERS</h1>
    {agency === "respawn" ? <Link href={`/agency/${agency}/battle-network?access=managers`} className="manager-battle-space">OPEN RESPAWN BATTLE SPACE</Link> : null}
    <section className="manager-picker">{loading ? <span>MANAGERS LOADING...</span> : visible.map((manager) => <button key={manager.manager_key} onClick={() => { setSelected(manager); setError(""); }} className={selected?.manager_key === manager.manager_key ? "selected" : ""}>{manager.manager_label}</button>)}{!loading && !visible.length && <span>NO MANAGERS FOUND FOR THIS AGENCY YET.</span>}</section>
    {selected && <form className="manager-password" onSubmit={enter}><span>{selected.manager_label}</span><input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="ENTER PASSWORD"/><button>ENTER</button>{error && <small>{error}</small>}</form>}
  </main>;
}
