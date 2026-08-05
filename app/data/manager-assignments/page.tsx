"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Group = "Team Dan" | "Team Mike / Indi" | "Exempt" | "Trident" | "Horizon" | "Paradise" | "Aqua" | "Respawn" | "Recruitment" | "New Managers" | "Excluded";
type Manager = { key: string; name: string; group: Group };
type Assignments = { managerGroups: Record<string, Group>; managerNames: Record<string, string>; deletedManagers: string[]; ownerManagers: string[]; assignedAt: Record<string, string> };

export default function ManagerAssignmentsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [assignments, setAssignments] = useState<Assignments>({ managerGroups: {}, managerNames: {}, deletedManagers: [], ownerManagers: [], assignedAt: {} });
  const [status, setStatus] = useState("Loading the latest Creator Intelligence managers...");
  const [saving, setSaving] = useState(false);
  const assignedManagers = useMemo(
    () => managers.filter((manager) => !assignments.deletedManagers.includes(manager.key)).map((manager) => ({ ...manager, group: assignments.managerGroups[manager.key] || manager.group })),
    [assignments.deletedManagers, assignments.managerGroups, managers]
  );

  useEffect(() => { void load(); }, []);

  async function load() {
    const response = await fetch("/api/data-analysis/manager-assignments", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setStatus(data.error || "Could not load assignments."); return; }
    setGroups(data.groups);
    setManagers(data.managers);
    setAssignments(data.assignments);
    setStatus(`Latest upload: ${data.statDate}. Drag managers into the correct group or rename them.`);
  }

  async function save(next: Assignments) {
    setAssignments(next);
    setSaving(true);
    setStatus("Saving assignments...");
    const response = await fetch("/api/data-analysis/manager-assignments", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignments: next }),
    });
    const data = await response.json();
    setSaving(false);
    setStatus(response.ok ? "Assignments and display names saved." : data.error || "Could not save assignments.");
  }

  function onDrop(event: React.DragEvent, group: Group) {
    event.preventDefault();
    const [type, key] = event.dataTransfer.getData("text/plain").split(":");
    if (type === "manager" && key) void save({ ...assignments, managerGroups: { ...assignments.managerGroups, [key]: group }, ownerManagers: assignments.ownerManagers.filter((ownerKey) => ownerKey !== key), assignedAt: { ...assignments.assignedAt, [key]: assignments.assignedAt[key] || new Date().toISOString() } });
  }

  function renameManager(manager: Manager) {
    const name = window.prompt("Manager display name", assignments.managerNames[manager.key] || manager.name);
    if (name === null) return;
    const displayName = name.trim();
    void save({ ...assignments, managerNames: { ...assignments.managerNames, ...(displayName ? { [manager.key]: displayName } : {}) } });
  }
  function deleteManager(manager: Manager) { if (window.confirm(`Remove ${assignments.managerNames[manager.key] || manager.name} from Manager Assignments?`)) void save({ ...assignments, deletedManagers: [...new Set([...assignments.deletedManagers, manager.key]) ] }); }

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-[1700px]">
    <Link href="/data/menu" className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">Back to Data Space</Link>
    <p className="mt-10 text-xs font-black uppercase tracking-[0.3em] text-sky-200/75">Data settings</p>
    <h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase sm:text-6xl">Manager <span className="text-yellow-300">Assignments</span></h1>
    <p className="mt-4 max-w-3xl text-white/60">Drag a team card into its correct group, or use Rename to set the display name used across manager and poster tools.</p>
    <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-yellow-100">{status}</p>
    <div className="mt-8 grid gap-5 xl:grid-cols-3">{groups.map((group) => <section key={group} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, group)} className="min-h-44 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <h2 className="font-[family-name:var(--font-norwester)] text-2xl uppercase text-yellow-200">{group}</h2>
      <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const [, key] = event.dataTransfer.getData("text/plain").split(":"); if (key) void save({ ...assignments, ownerManagers: [...new Set([...assignments.ownerManagers, key])], managerGroups: { ...assignments.managerGroups, [key]: group }, assignedAt: { ...assignments.assignedAt, [key]: assignments.assignedAt[key] || new Date().toISOString() } }); }} className="mt-3 rounded-xl border border-dashed border-yellow-300/35 bg-yellow-300/5 p-3 text-xs font-black uppercase text-yellow-100">Owner Slot — drag a {group} manager here{assignedManagers.filter((manager) => manager.group === group && assignments.ownerManagers.includes(manager.key)).map((manager) => <article key={manager.key} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", `manager:${manager.key}`)} className="mt-2 flex cursor-grab items-center gap-2 rounded-lg bg-yellow-300/15 px-3 py-2 text-white"><span className="min-w-0 flex-1">{assignments.managerNames[manager.key] || manager.name}</span><button type="button" onClick={() => renameManager(manager)} className="rounded border border-white/25 px-2 py-1 text-[9px]">Rename</button><button type="button" onClick={() => void save({ ...assignments, ownerManagers: assignments.ownerManagers.filter((ownerKey) => ownerKey !== manager.key) })} className="rounded border border-white/25 px-2 py-1 text-[9px]">Remove Owner</button></article>)}</div>
      <div className="mt-4 space-y-2">{assignedManagers.filter((manager) => manager.group === group && !assignments.ownerManagers.includes(manager.key)).map((manager) => <article key={manager.key} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", `manager:${manager.key}`)} className="flex cursor-grab items-center gap-3 rounded-xl border border-sky-200/20 bg-black/35 px-4 py-3 font-black uppercase text-white active:cursor-grabbing">
        <span className="min-w-0 flex-1">{assignments.managerNames[manager.key] || manager.name}</span>
        <button type="button" draggable={false} onClick={() => renameManager(manager)} className="rounded-lg border border-white/20 px-2 py-1 text-[10px] tracking-widest text-yellow-200 hover:border-yellow-300">Rename</button>
        <button type="button" draggable={false} onClick={() => deleteManager(manager)} className="rounded-lg border border-rose-300/30 px-2 py-1 text-[10px] tracking-widest text-rose-200 hover:border-rose-300">Delete</button>
      </article>)}{!assignedManagers.some((manager) => manager.group === group) && <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/35">Drop a manager here</p>}</div>
    </section>)}</div>
    <p className="mt-5 text-xs text-white/40">{saving ? "Saving..." : "Changes save immediately."}</p>
  </div></main></DataAccessGuard>;
}
