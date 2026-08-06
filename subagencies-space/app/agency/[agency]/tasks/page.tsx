"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Task = { id: string; description: string; assignee: "OWNER" | "DF / JD"; creator: string; dueDate: string; dueTime: string; highPriority: boolean; createdAt: string; forwardedToMain?: boolean };
const accents: Record<string, string> = { paradise: "#d6a65e", respawn: "#28d7c3", horizon: "#f97316", trident: "#38bdf8" };

export default function OwnerTasksPage() {
  const { agency = "" } = useParams<{ agency: string }>();
  const accent = accents[agency] || "#facc15";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<Task["assignee"]>("OWNER");
  const [creator, setCreator] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [highPriority, setHighPriority] = useState(false);
  const [message, setMessage] = useState("LOADING TASKS...");

  async function load() {
    const response = await fetch(`/api/owner-tasks?agency=${agency}`, { cache: "no-store" });
    const data = await response.json();
    setTasks(data.tasks || []);
    setMessage(response.ok ? "UP TO DATE." : data.error || "COULD NOT LOAD TASKS.");
  }

  async function save(next: Task[]) {
    setTasks(next);
    const response = await fetch("/api/owner-tasks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agency, tasks: next }) });
    const data = await response.json();
    if (response.ok) setTasks(data.tasks || next);
    setMessage(response.ok ? "TASKS SAVED." : data.error || "COULD NOT SAVE TASKS.");
  }

  useEffect(() => { if (agency) void load(); }, [agency]);

  function add() {
    if (!description.trim()) return setMessage("ADD WHAT NEEDS DOING FIRST.");
    if (assignee === "DF / JD" && !creator.trim()) return setMessage("ADD WHO THE DF / JD TASK IS FOR.");
    const task: Task = { id: crypto.randomUUID(), description: description.trim().toUpperCase(), assignee, creator: creator.trim().toUpperCase(), dueDate, dueTime, highPriority, createdAt: new Date().toISOString() };
    setDescription(""); setCreator(""); setDueDate(""); setDueTime(""); setHighPriority(false);
    void save([task, ...tasks]);
  }

  return <main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8" style={{ "--task-accent": accent } as React.CSSProperties}>
    <div className="mx-auto max-w-5xl">
      <header className="flex items-center justify-between gap-4"><Link href={`/agency/${agency}`} className="text-xs font-black uppercase tracking-[.18em]" style={{ color: accent }}>← BACK TO OWNER SPACE</Link><button type="button" onClick={() => void load()} className="rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-widest" style={{ borderColor: accent, color: accent }}>REFRESH TASKS</button></header>
      <p className="mt-12 text-xs font-black uppercase tracking-[.3em]" style={{ color: accent }}>{agency.toUpperCase()} OWNER SPACE</p>
      <h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase sm:text-6xl">TASK <span style={{ color: accent }}>SPACE</span></h1>
      <section className="mt-10 rounded-3xl border bg-white/[.04] p-5" style={{ borderColor: `${accent}55` }}>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="WHAT NEEDS DOING?" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-lg font-bold uppercase text-white" />
          <input value={creator} required={assignee === "DF / JD"} onChange={(event) => setCreator(event.target.value)} placeholder={assignee === "DF / JD" ? "WHO IS THE DF / JD TASK FOR? *" : "WHO IS THE TASK FOR? (OPTIONAL)"} className="rounded-xl border bg-black/40 px-4 py-3 text-lg font-bold uppercase text-white" style={{ borderColor: `${accent}88` }} />
          <select value={assignee} onChange={(event) => setAssignee(event.target.value as Task["assignee"])} className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-lg font-bold text-white"><option value="OWNER">OWNER</option><option value="DF / JD">DF / JD</option></select>
          <div className="flex gap-3"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="min-w-0 flex-1 rounded-xl border bg-black/40 px-4 py-3 text-lg font-bold text-white" style={{ borderColor: `${accent}88` }} /><input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} className="min-w-0 flex-1 rounded-xl border bg-black/40 px-4 py-3 text-lg font-bold text-white" style={{ borderColor: `${accent}88` }} /></div>
        </div>
        <div className="mt-3 flex items-center justify-between"><label className="text-sm font-bold text-red-200"><input type="checkbox" checked={highPriority} onChange={(event) => setHighPriority(event.target.checked)} /> HIGH PRIORITY</label><button type="button" onClick={add} className="rounded-xl px-5 py-3 text-xs font-black uppercase text-black" style={{ background: accent }}>ADD TASK</button></div>
        <p className="mt-3 text-sm font-bold" style={{ color: accent }}>{message}</p>
        <div className="mt-6 space-y-3">{tasks.map((task) => <article key={task.id} className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 ${task.highPriority ? "border-red-300/50 bg-red-300/10" : "border-white/10 bg-black/30"}`}><input type="checkbox" aria-label="COMPLETE TASK" onChange={() => void save(tasks.filter((item) => item.id !== task.id))} /><div className="flex-1"><p className="font-black">{task.description}</p><p className="mt-2 text-base font-bold" style={{ color: accent }}>{task.creator ? `FOR: ${task.creator}` : "NO PERSON ASSIGNED"}{task.dueDate ? ` · DUE ${task.dueDate}${task.dueTime ? ` ${task.dueTime}` : ""}` : ""}</p></div>{task.highPriority ? <span className="rounded-full bg-red-300 px-3 py-1 text-xs font-black text-black">HIGH</span> : null}<span className="rounded-full border px-3 py-1 text-xs font-black" style={{ borderColor: `${accent}66`, color: accent }}>{task.assignee}</span><button type="button" onClick={() => void save(tasks.filter((item) => item.id !== task.id))} className="text-xs font-black text-red-300">REMOVE</button></article>)}{!tasks.length ? <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm font-bold text-white/45">NO TASKS FOR THIS AGENCY YET.</p> : null}</div>
      </section>
    </div>
  </main>;
}
