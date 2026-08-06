"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Assignee = "JD" | "DF" | "JD / DF" | "PARADISE" | "RESPAWN" | "HORIZON" | "TRIDENT";
type Task = { id: string; description: string; assignee: Assignee; creator: string; dueDate: string; dueTime: string; highPriority: boolean; complete: boolean; createdAt: string };

export default function TaskSpacePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<Assignee>("JD / DF");
  const [forWho, setForWho] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [highPriority, setHighPriority] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setMessage("Refreshing...");
    const response = await fetch("/api/tasks", { cache: "no-store" });
    const data = await response.json();
    setTasks(data.tasks || []);
    setMessage(response.ok ? "Up to date." : data.error || "Could not refresh tasks.");
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  async function save(next: Task[]) {
    setTasks(next);
    const response = await fetch("/api/tasks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tasks: next }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Could not save.");
    setTasks(data.tasks);
    setMessage("Saved.");
  }
  function add() {
    if (!description.trim()) return setMessage("Add what needs doing first.");
    const task: Task = { id: crypto.randomUUID(), description: description.trim(), assignee, creator: forWho.trim(), dueDate, dueTime, highPriority, complete: false, createdAt: new Date().toISOString() };
    setDescription(""); setForWho(""); setDueDate(""); setDueTime(""); setHighPriority(false);
    void save([task, ...tasks]);
  }
  function removeTask(task: Task) { if (window.confirm(`Are you sure you want to remove “${task.description}”?`)) void save(tasks.filter((item) => item.id !== task.id)); }

  return <main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-5xl">
    <header className="flex items-center justify-between gap-4"><Link href="/" className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">← FIRST CLASS LEADERSHIP SPACE</Link><button type="button" onClick={() => void load()} className="rounded-xl border border-emerald-300/35 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-100 hover:bg-emerald-300/20">REFRESH TASKS</button></header>
    <p className="mt-12 text-xs font-black uppercase tracking-[0.3em] text-emerald-200/75">AGENCY PLANNING</p><h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase sm:text-6xl">TASK <span className="text-emerald-300">SPACE</span></h1>
    <section className="mt-10 rounded-3xl border border-emerald-300/20 bg-white/[0.04] p-5"><div className="grid gap-3 md:grid-cols-2">
      <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="WHAT NEEDS DOING?" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-lg text-white placeholder:text-white/65"/>
      <input value={forWho} onChange={(event) => setForWho(event.target.value)} placeholder="WHO’S THE TASK FOR? (OPTIONAL)" className="rounded-xl border border-emerald-300/35 bg-black/40 px-4 py-3 text-lg font-bold text-white placeholder:text-emerald-100/80"/>
      <select value={assignee} onChange={(event) => setAssignee(event.target.value as Assignee)} className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-lg font-bold text-white"><option value="JD">JD</option><option value="DF">DF</option><option value="JD / DF">JD / DF</option><option value="PARADISE">PARADISE</option><option value="RESPAWN">RESPAWN</option><option value="HORIZON">HORIZON</option><option value="TRIDENT">TRIDENT</option></select>
      <div className="flex gap-3"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-emerald-300/35 bg-black/40 px-4 py-3 text-lg font-bold text-white"/><input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-emerald-300/35 bg-black/40 px-4 py-3 text-lg font-bold text-white"/></div>
    </div><div className="mt-3 flex items-center justify-between"><label className="text-sm font-bold text-red-200"><input type="checkbox" checked={highPriority} onChange={(event) => setHighPriority(event.target.checked)}/> HIGH PRIORITY</label><button type="button" onClick={add} className="rounded-xl bg-emerald-300 px-5 py-3 text-xs font-black uppercase text-black">ADD TASK</button></div>{message && <p className="mt-3 text-sm text-emerald-100">{message}</p>}<div className="mt-6 space-y-3">{tasks.map((task) => <article key={task.id} className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 ${task.highPriority ? "border-red-300/50 bg-red-300/10" : "border-white/10 bg-black/30"}`}><input type="checkbox" checked={task.complete} onChange={(event) => void save(tasks.map((item) => item.id === task.id ? { ...item, complete: event.target.checked } : item))}/><div className="flex-1"><p className={task.complete ? "line-through text-white/40" : "font-black"}>{task.description}</p><p className="mt-2 text-base font-bold text-emerald-100">{task.creator ? `FOR: ${task.creator}` : "NO PERSON ASSIGNED"}{task.dueDate ? ` · DUE ${task.dueDate}${task.dueTime ? ` ${task.dueTime}` : ""}` : ""}</p></div>{task.highPriority && <span className="rounded-full bg-red-300 px-3 py-1 text-xs font-black text-black">HIGH</span>}<span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">{task.assignee}</span><button type="button" onClick={() => removeTask(task)} className="text-xs font-black text-red-300">REMOVE</button></article>)}</div></section>
  </div></main>;
}
