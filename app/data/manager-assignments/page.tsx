"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Group = "Team Dan" | "Team Mike / Indi" | "Exempt" | "Trident" | "Horizon" | "Paradise" | "Aqua" | "Respawn" | "Unassigned";
type Manager = { key: string; name: string; group: Group };
type Creator = { key: string; username: string; manager: string };
type Assignments = { managerGroups: Record<string, Group>; creatorManagers: Record<string, string> };

export default function ManagerAssignmentsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [assignments, setAssignments] = useState<Assignments>({ managerGroups: {}, creatorManagers: {} });
  const [status, setStatus] = useState("Loading the latest Creator Intelligence managers…");
  const [saving, setSaving] = useState(false);
  const assignedManagers = useMemo(() => managers.map((manager) => ({ ...manager, group: assignments.managerGroups[manager.key] || manager.group })), [assignments.managerGroups, managers]);
  const assignedCreators = useMemo(() => creators.map((creator) => ({ ...creator, manager: assignments.creatorManagers[creator.key] || creator.manager })), [assignments.creatorManagers, creators]);

  useEffect(() => { void load(); }, []);
  async function load() {
    const response = await fetch("/api/data-analysis/manager-assignments", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setStatus(data.error || "Could not load assignments."); return; }
    setGroups(data.groups); setManagers(data.managers); setCreators(data.creators); setAssignments(data.assignments); setStatus(`Latest upload: ${data.statDate}. Drag managers between groups, and creators between managers.`);
  }
  async function save(next: Assignments) {
    setAssignments(next); setSaving(true); setStatus("Saving assignments…");
    const response = await fetch("/api/data-analysis/manager-assignments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignments: next }) });
    const data = await response.json(); setSaving(false);
    setStatus(response.ok ? "Assignments saved. New managers remain in Unassigned until you place them." : data.error || "Could not save assignments.");
  }
  function onDrop(event: React.DragEvent, group: Group, managerKey?: string) {
    event.preventDefault(); const [type, key] = event.dataTransfer.getData("text/plain").split(":");
    if (!key) return;
    if (type === "manager") void save({ ...assignments, managerGroups: { ...assignments.managerGroups, [key]: group } });
    if (type === "creator" && managerKey) void save({ ...assignments, creatorManagers: { ...assignments.creatorManagers, [key]: managerKey } });
  }
  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-[1700px]"><Link href="/data/menu" className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">← Data Space</Link><p className="mt-10 text-xs font-black uppercase tracking-[0.3em] text-sky-200/75">Data settings</p><h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase sm:text-6xl">Manager <span className="text-yellow-300">Assignments</span></h1><p className="mt-4 max-w-3xl text-white/60">Place every manager in the correct group, then move creators directly between manager teams. New managers are intentionally left unassigned until you place them.</p><p className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-yellow-100">{status}</p><div className="mt-8 grid gap-5 xl:grid-cols-3">{groups.map((group) => <section key={group} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, group)} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4"><h2 className="font-[family-name:var(--font-norwester)] text-2xl uppercase text-yellow-200">{group}</h2><div className="mt-4 space-y-3">{assignedManagers.filter((manager) => manager.group === group).map((manager) => <article key={manager.key} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", `manager:${manager.key}`)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, group, manager.key)} className="cursor-grab rounded-2xl border border-sky-200/20 bg-black/35 p-3 active:cursor-grabbing"><h3 className="font-black uppercase text-white">{manager.name}</h3><div className="mt-3 space-y-1">{assignedCreators.filter((creator) => creator.manager === manager.key).map((creator) => <button key={creator.key} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", `creator:${creator.key}`)} className="block w-full cursor-grab rounded-lg bg-white/[0.06] px-3 py-2 text-left text-sm text-white/80 hover:bg-yellow-300/10">@{creator.username}</button>)}</div></article>)}{!assignedManagers.some((manager) => manager.group === group) && <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/35">Drop a manager here</p>}</div></section>)}</div><p className="mt-5 text-xs text-white/40">{saving ? "Saving…" : "Changes save immediately."}</p></div></main></DataAccessGuard>;
}
