"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Assignee = "JD" | "DF" | "JD / DF" | "PARADISE" | "RESPAWN" | "HORIZON" | "TRIDENT";
type Priority = "URGENT" | "OVERDUE" | "TODAY" | "TOMORROW" | "2 DAYS" | "3+ DAYS" | "WHEN AVAILABLE";
type Task = {
  id: string;
  description: string;
  assignee: Assignee;
  creator: string;
  dueDate: string;
  dueTime: string;
  priority: Priority;
  complete: boolean;
  createdAt: string;
  sourceAgency?: string;
  sourceManagerLabel?: string;
};

const statusStyle: Record<Priority, string> = {
  URGENT: "border-red-300 bg-red-500/25 text-red-100",
  OVERDUE: "border-red-400/70 bg-red-400/10 text-red-200",
  TODAY: "border-orange-300/70 bg-orange-300/10 text-orange-200",
  TOMORROW: "border-yellow-300/70 bg-yellow-300/10 text-yellow-100",
  "2 DAYS": "border-sky-300/60 bg-sky-300/10 text-sky-100",
  "3+ DAYS": "border-indigo-300/60 bg-indigo-300/10 text-indigo-100",
  "WHEN AVAILABLE": "border-white/25 bg-white/5 text-white/70",
};

const sourceColors: Record<string, string> = {
  paradise: "#d6a65e",
  respawn: "#28d7c3",
  horizon: "#f97316",
  trident: "#38bdf8",
};

export default function TaskSpacePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<Assignee>("JD / DF");
  const [forWho, setForWho] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/tasks", { cache: "no-store" });
    const data = await response.json();
    setTasks(data.tasks || []);
    setSelected([]);
    setMessage(response.ok ? "UP TO DATE." : data.error || "COULD NOT REFRESH TASKS.");
  }

  async function save(next: Task[], successMessage = "SAVED.") {
    setTasks(next);
    const response = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: next }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "COULD NOT SAVE.");
      void load();
      return;
    }
    setTasks(data.tasks);
    setMessage(successMessage);
  }

  useEffect(() => {
    void load();
  }, []);

  function openDatePicker(event: React.MouseEvent<HTMLInputElement>) {
    (event.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
  }

  function add() {
    if (!description.trim()) {
      setMessage("ADD WHAT NEEDS DOING FIRST.");
      return;
    }

    const task: Task = {
      id: crypto.randomUUID(),
      description: description.trim(),
      assignee,
      creator: forWho.trim(),
      dueDate: urgent ? "" : dueDate,
      dueTime: "",
      priority: urgent ? "URGENT" : "WHEN AVAILABLE",
      complete: false,
      createdAt: new Date().toISOString(),
    };
    setDescription("");
    setForWho("");
    setDueDate("");
    setUrgent(false);
    void save([task, ...tasks]);
  }

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function completeTask(task: Task) {
    if (task.complete || !window.confirm(`MARK “${task.description}” AS FINISHED?`)) return;
    void save(tasks.map((entry) => entry.id === task.id ? { ...entry, complete: true } : entry), "TASK COMPLETED.");
  }

  function updateDueDate(id: string, nextDueDate: string) {
    setEditingDueDate(null);
    void save(tasks.map((task) => task.id === id ? { ...task, dueDate: nextDueDate } : task), nextDueDate ? "DUE DATE UPDATED." : "DUE DATE CLEARED.");
  }

  function updateUrgency(id: string, nextUrgent: boolean) {
    setEditingDueDate(null);
    void save(tasks.map((task) => task.id === id ? { ...task, priority: nextUrgent ? "URGENT" : "WHEN AVAILABLE", dueDate: nextUrgent ? "" : task.dueDate } : task), nextUrgent ? "TASK MARKED URGENT." : "URGENT STATUS REMOVED.");
  }

  function completeSelected() {
    if (!selected.length || !window.confirm(`COMPLETE ${selected.length} SELECTED TASK(S)?`)) return;
    void save(tasks.map((task) => selected.includes(task.id) ? { ...task, complete: true } : task));
    setSelected([]);
  }

  function removeSelected() {
    if (!selected.length || !window.confirm(`REMOVE ${selected.length} SELECTED TASK(S)?`)) return;
    void save(tasks.filter((task) => !selected.includes(task.id)));
    setSelected([]);
  }

  const allSelected = !!tasks.length && selected.length === tasks.length;

  return (
    <main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xs font-black uppercase tracking-[.18em] text-yellow-200">← FIRST CLASS LEADERSHIP SPACE</Link>
          <button onClick={() => void load()} className="rounded-xl border border-emerald-300/35 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase text-emerald-100">REFRESH TASKS</button>
        </header>

        <p className="mt-12 text-xs font-black uppercase tracking-[.3em] text-emerald-200/75">AGENCY PLANNING</p>
        <h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase sm:text-6xl">TASK <span className="text-emerald-300">SPACE</span></h1>

        <section className="mt-10 rounded-3xl border border-emerald-300/20 bg-white/[.04] p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What needs doing?" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-lg text-white" />
            <input value={forWho} onChange={(event) => setForWho(event.target.value)} placeholder="Who is the task for? (Optional)" className="rounded-xl border border-emerald-300/35 bg-black/40 px-4 py-3 text-lg text-white" />
            <select value={assignee} onChange={(event) => setAssignee(event.target.value as Assignee)} className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-lg font-bold text-white">
              <option value="JD">JD</option><option value="DF">DF</option><option value="JD / DF">JD / DF</option><option value="PARADISE">PARADISE</option><option value="RESPAWN">RESPAWN</option><option value="HORIZON">HORIZON</option><option value="TRIDENT">TRIDENT</option>
            </select>
            <label className="flex items-center gap-3 rounded-xl border border-red-300/35 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-red-100"><input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} /> URGENT — NO DUE DATE</label>
            <input type="date" value={dueDate} disabled={urgent} onClick={openDatePicker} onChange={(event) => setDueDate(event.target.value)} className="w-full cursor-pointer rounded-xl border border-emerald-300/35 bg-black/40 px-4 py-3 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-35" />
          </div>
          <button onClick={add} className="mt-3 rounded-xl bg-emerald-300 px-5 py-3 text-xs font-black uppercase text-black">ADD TASK</button>
          {message && <p className="mt-3 text-sm font-bold text-emerald-100">{message}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
            {!selectionMode ? (
              <button onClick={() => setSelectionMode(true)} className="rounded-lg border border-emerald-300/45 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-emerald-100">SELECT TASKS</button>
            ) : (
              <>
                <label className="text-xs font-black uppercase tracking-widest"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : tasks.map((task) => task.id))} /> {selected.length} SELECTED</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={completeSelected} disabled={!selected.length} className="rounded-lg bg-emerald-300 px-3 py-2 text-[10px] font-black uppercase text-black disabled:opacity-40">CONFIRM COMPLETED</button>
                  <button onClick={removeSelected} disabled={!selected.length} className="rounded-lg border border-red-300/60 px-3 py-2 text-[10px] font-black uppercase text-red-200 disabled:opacity-40">REMOVE SELECTED</button>
                  <button onClick={() => { setSelectionMode(false); setSelected([]); }} className="rounded-lg border border-white/25 px-3 py-2 text-[10px] font-black uppercase text-white/75">CANCEL SELECT</button>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {tasks.map((task) => {
              const sourceKey = task.sourceAgency?.toLowerCase();
              const isEditing = editingDueDate === task.id;
              const isUrgent = task.priority === "URGENT";
              return (
                <article
                  key={task.id}
                  onClick={() => setEditingDueDate(isEditing ? null : task.id)}
                  style={sourceKey ? { borderLeftWidth: 8, borderLeftColor: sourceColors[sourceKey] || "#fff" } : undefined}
                  className={`cursor-pointer rounded-2xl border p-4 transition hover:border-emerald-200/40 ${task.complete ? "border-white/10 bg-black/20 opacity-55" : "border-white/10 bg-black/30"}`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    {selectionMode ? (
                      <input type="checkbox" checked={selected.includes(task.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggle(task.id)} aria-label={`Select ${task.description}`} />
                    ) : (
                      <input type="checkbox" checked={task.complete} onClick={(event) => event.stopPropagation()} onChange={() => completeTask(task)} className="h-5 w-5 cursor-pointer accent-emerald-300" aria-label={`Mark ${task.description} as finished`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={task.complete ? "line-through" : "font-black"}>{task.description}</p>
                      <p className="mt-2 text-sm font-bold text-emerald-100">
                        {task.creator ? `FOR: ${task.creator}` : "NO PERSON ASSIGNED"}
                        {task.dueDate ? ` · DUE ${task.dueDate}` : ""}
                        {task.sourceAgency ? ` · FROM ${task.sourceAgency.toUpperCase()}${task.sourceManagerLabel ? ` / ${task.sourceManagerLabel}` : ""}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${statusStyle[task.priority]}`}>{task.priority}</span>
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">{task.assignee}</span>
                    {sourceKey ? <img src={`/agency-logos/${sourceKey}.png?v=1`} alt={`${task.sourceAgency} logo`} className="h-11 w-20 object-contain" /> : null}
                  </div>

                  {isEditing && (
                    <div onClick={(event) => event.stopPropagation()} className="mt-4 flex flex-wrap items-end gap-3 border-t border-white/10 pt-4">
                      {!isUrgent && <><label className="flex min-w-56 flex-col gap-2 text-xs font-black uppercase tracking-widest text-emerald-100">
                        CHANGE DUE DATE
                        <input type="date" value={task.dueDate} onClick={openDatePicker} onChange={(event) => updateDueDate(task.id, event.target.value)} className="cursor-pointer rounded-lg border border-emerald-300/40 bg-black px-3 py-2 text-base font-bold text-white" />
                      </label>
                      <button onClick={() => updateDueDate(task.id, "")} className="rounded-lg border border-white/25 px-3 py-2 text-xs font-black uppercase text-white/80">CLEAR DATE</button></>}
                      <button onClick={() => updateUrgency(task.id, !isUrgent)} className={`rounded-lg px-3 py-2 text-xs font-black uppercase ${isUrgent ? "border border-white/25 text-white/80" : "bg-red-400 text-black"}`}>{isUrgent ? "REMOVE URGENT" : "MARK URGENT"}</button>
                    </div>
                  )}
                </article>
              );
            })}
            {!tasks.length && <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm font-bold text-white/45">NO TASKS YET.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
