"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Group = "Team Dan" | "Team Mike / Indi" | "Exempt" | "Trident" | "Horizon" | "Paradise" | "Aqua" | "Respawn" | "Unassigned" | "Excluded";
type Manager = { key: string; name: string; group: Group };
type Assignments = { managerGroups: Record<string, Group> };

export default function ManagerAssignmentsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [assignments, setAssignments] = useState<Assignments>({ managerGroups: {} });
  const [status, setStatus] = useState("Loading the latest Creator Intelligence managers…");
  const [saving, setSaving] = useState(false);
  const assignedManagers = useMemo(() => managers.map((manager) => ({ ...manager, group: assignments.managerGroups[manager.key] || manager.group })), [assignments.managerGroups, managers]);

  useEffect(() => { void load(); }, []);
  async function load() {
    const response = await fetch("/api/data-analysis/manager-assignments", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setStatus(data.error || "Could not load assignments."); return; }
    setGroups(data.groups); setManagers(data.managers); setAssignments(data.assignments); setStatus(`Latest upload: ${data.statDate}. Drag managers into the correct group.`);
  }
  async function save(next: Assignments) {
    setAssignments(next); setSaving(true); setStatus("Saving assignments…");
    const response = await fetch("/api/data-analysis/manager-assignments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignments: next }) });
    const data = await response.json(); setSaving(false);
    setStatus(response.ok ? "Assignments saved. New managers remain in Unassigned until you place them." : data.error || "Could not save assignments.");
  }
  function onDrop(event: React.DragEvent, group: Group) {
    event.preventDefault(); const [type, key] = event.dataTransfer.getData("text/plain").split(":");
    if (!key) return;
    if (type === "manager") void save({ ...assignments, managerGroups: { ...assignments.managerGroups, [key]: group } });
  }
  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-[1700px]"><Link href="/data/menu" className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">← Data Space</Link><p className="mt-10 text-xs font-black uppercase tracking-[0.3em] text-sky-200/75">Data settings</p><h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase sm:text-6xl">Manager <span className="text-yellow-300">Assignments</span></h1><p className="mt-4 max-w-3xl text-white/60">A simple manager-only board. Drag a team card into its correct group. Any new manager stays in Unassigned until you place them.</p><p className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-yellow-100">{status}</p><div className="mt-8 grid gap-5 xl:grid-cols-3">{groups.map((group) => <section key={group} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, group)} className="min-h-44 rounded-3xl border border-white/10 bg-white/[0.035] p-4"><h2 className="font-[family-name:var(--font-norwester)] text-2xl uppercase text-yellow-200">{group}</h2><div className="mt-4 space-y-2">{assignedManagers.filter((manager) => manager.group === group).map((manager) => <article key={manager.key} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", `manager:${manager.key}`)} className="cursor-grab rounded-xl border border-sky-200/20 bg-black/35 px-4 py-3 font-black uppercase text-white active:cursor-grabbing">{manager.name}</article>)}{!assignedManagers.some((manager) => manager.group === group) && <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/35">Drop a manager here</p>}</div></section>)}</div><p className="mt-5 text-xs text-white/40">{saving ? "Saving…" : "Changes save immediately."}</p></div></main></DataAccessGuard>;
}
