"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Battle = { id: string; date: string; time: string; creator: string; manager: string; size: string; opponent: string; agency: string; type?: string; notified?: number[]; reminders?: Record<string, { status: "success" | "failed"; at: string }> };
type Settings = { managerFilter: string; reminderMinutes: number[]; battles: Battle[] };

const blank: Settings = { managerFilter: "DF/JD", reminderMinutes: [60, 15], battles: [] };
const battleTypes = ["ARRANGED BATTLE", "HEAD-TO-HEAD BATTLE", "BIRTHDAY BATTLE", "INTERNATIONAL BATTLE"];
const normal = (value: string) => value.replace(/\s/g, "").toUpperCase();
const usernameFrom = (value: string) => (value.match(/tiktok\.com\/@([^?\s\])]+)/i)?.[1] || value.match(/@([\w.]+)/)?.[1] || "OPPONENT").toUpperCase();

function time24(value: string) {
  const match = value.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return "";
  let hour = Number(match[1]);
  if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function reminderTime(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = (hour * 60 + minute - minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function BattleCalendarPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [settings, setSettings] = useState<Settings>(blank);
  const [paste, setPaste] = useState("");
  const [date, setDate] = useState(today);
  const [manualDate, setManualDate] = useState(today);
  const [manualTime, setManualTime] = useState("19:00");
  const [manualType, setManualType] = useState(battleTypes[1]);
  const [manualCreator, setManualCreator] = useState("");
  const [manualOpponent, setManualOpponent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState("");
  const [savingReminders, setSavingReminders] = useState(false);
  const [remindersSaved, setRemindersSaved] = useState(false);
  const [message, setMessage] = useState("Loading Battle Calendar...");

  useEffect(() => {
    fetch("/api/battle-calendar", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { setSettings({ ...blank, ...data }); setMessage("Ready."); })
      .catch(() => setMessage("Could not load Battle Calendar."));
  }, []);

  const battles = useMemo(() => [...settings.battles].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)), [settings.battles]);

  async function save(next: Settings) {
    setSettings(next);
    const response = await fetch("/api/battle-calendar", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    setMessage(response.ok ? "Saved." : "Could not save.");
  }

  async function saveReminderSettings() {
    setSavingReminders(true);
    setRemindersSaved(false);
    const response = await fetch("/api/battle-calendar", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setSavingReminders(false);
    setRemindersSaved(response.ok);
    setMessage(response.ok ? "Reminder settings saved." : "Could not save reminder settings.");
  }

  function importRows() {
    const lines = paste.split(/\r?\n/).filter(Boolean);
    const imported = lines.flatMap((line) => {
      const row = line.split("\t");
      if (row.length < 8 || normal(row[1] || "") !== normal(settings.managerFilter)) return [];
      const time = time24(row[6] || "");
      if (!time) return [];
      return [{ id: crypto.randomUUID(), date, time, creator: String(row[0] || "").trim().toUpperCase(), manager: String(row[1] || "").trim().toUpperCase(), size: String(row[2] || "").trim().toUpperCase(), opponent: usernameFrom(row[5] || ""), agency: String(row[7] || "").trim().toUpperCase(), type: "ARRANGED BATTLE", notified: [] }];
    });
    if (!imported.length) return setMessage(`No ${settings.managerFilter} battles found in that paste.`);
    const unique = imported.filter((battle) => !settings.battles.some((saved) => saved.date === battle.date && saved.time === battle.time && saved.creator === battle.creator && saved.opponent === battle.opponent));
    void save({ ...settings, battles: [...settings.battles, ...unique] });
    setPaste("");
    setMessage(`${unique.length} battle${unique.length === 1 ? "" : "s"} imported.`);
  }

  function addManualBattle() {
    if (!manualDate || !manualTime || !manualCreator.trim() || !manualOpponent.trim()) return setMessage("Add both usernames, a date and a time for the manual battle.");
    const battle: Battle = { id: crypto.randomUUID(), date: manualDate, time: manualTime, creator: manualCreator.trim().replace(/^@/, "").toUpperCase(), manager: "MANUAL", size: "", opponent: manualOpponent.trim().replace(/^@/, "").toUpperCase(), agency: "", type: manualType, notified: [] };
    void save({ ...settings, battles: [...settings.battles, battle] });
    setManualCreator("");
    setManualOpponent("");
    setMessage(`${manualType} added to the calendar.`);
  }

  function beginEdit(battle: Battle) {
    setEditingId(battle.id);
    setEditDate(battle.date);
    setEditTime(battle.time);
    setEditType(battle.type || "ARRANGED BATTLE");
  }

  function saveEdit(battle: Battle) {
    if (!editDate || !editTime || !editType) return setMessage("Add a date, time and battle type before saving.");
    void save({ ...settings, battles: settings.battles.map((item) => item.id === battle.id ? { ...item, date: editDate, time: editTime, type: editType } : item) });
    setEditingId(null);
    setMessage("Battle updated.");
  }

  async function testBot() {
    setMessage("Sending test...");
    const response = await fetch("/api/battle-calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send-test" }) });
    const data = await response.json();
    setMessage(response.ok ? "Test message sent to DF/JD BATTLES." : data.error || "Telegram test failed.");
  }

  return <main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="flex items-center justify-between gap-4"><Link href="/data/menu" className="text-xs font-black uppercase tracking-[.18em] text-sky-200">← Back to Data Space</Link><button onClick={() => void testBot()} className="rounded-xl border border-sky-300/35 bg-sky-300/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-sky-100">Test Battle Bot</button></header>
    <p className="mt-12 text-xs font-black uppercase tracking-[.3em] text-sky-200/75">DF / JD Operations</p>
    <h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase sm:text-6xl">Battle <span className="text-sky-300">Calendar</span></h1>
    <p className="mt-3 text-white/60">Paste your battle sheet, add special battles, and manage the DF/JD schedule in one place.</p>
    <p className="mt-5 rounded-xl border border-sky-300/20 bg-sky-300/[.06] px-4 py-3 text-sm text-sky-100">{message}</p>

    <section className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-sky-300/20 bg-sky-300/[.035] p-5"><h2 className="font-[family-name:var(--font-norwester)] text-3xl uppercase text-sky-200">Import Arranged Battles</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-black uppercase text-white/50">Manager Filter<input value={settings.managerFilter} onChange={(event) => setSettings({ ...settings, managerFilter: event.target.value })} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" /></label><label className="text-xs font-black uppercase text-white/50">Battle Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" /></label></div><textarea value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="Paste the Excel rows here..." className="mt-4 h-56 w-full rounded-2xl border border-white/15 bg-black/40 p-4 text-sm text-white" /><button onClick={importRows} className="mt-4 rounded-xl bg-sky-300 px-5 py-3 text-xs font-black uppercase text-black">Import {settings.managerFilter || "Manager"} Battles</button></div>
      <div className="rounded-3xl border border-sky-300/20 bg-sky-300/[.035] p-5"><h2 className="font-[family-name:var(--font-norwester)] text-3xl uppercase text-sky-200">Add Manual Battle</h2><p className="mt-2 text-sm text-white/55">Use this for battles that are not in the imported sheet.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-black uppercase text-white/50">Creator Username<input value={manualCreator} onChange={(event) => setManualCreator(event.target.value)} placeholder="@CREATOR" className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" /></label><label className="text-xs font-black uppercase text-white/50">Opponent Username<input value={manualOpponent} onChange={(event) => setManualOpponent(event.target.value)} placeholder="@OPPONENT" className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" /></label><label className="text-xs font-black uppercase text-white/50">Date<input type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" /></label><label className="text-xs font-black uppercase text-white/50">Time<input type="time" value={manualTime} onChange={(event) => setManualTime(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" /></label></div><label className="mt-4 block text-xs font-black uppercase text-white/50">Battle Type<select value={manualType} onChange={(event) => setManualType(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white">{battleTypes.map((type) => <option key={type}>{type}</option>)}</select></label><button onClick={addManualBattle} className="mt-5 rounded-xl bg-sky-300 px-5 py-3 text-xs font-black uppercase text-black">Add to Calendar</button></div>
    </section>

    <section className="mt-8 rounded-3xl border border-sky-300/20 bg-sky-300/[.035] p-5"><h2 className="font-[family-name:var(--font-norwester)] text-3xl uppercase text-sky-200">Reminder Settings</h2><p className="mt-2 text-sm text-white/55">Choose how many minutes before each battle the Telegram reminder is sent.</p><label className="mt-5 block max-w-md text-xs font-black uppercase text-white/50">Reminder Minutes Before Battle<input value={settings.reminderMinutes.join(", ")} onChange={(event) => { setRemindersSaved(false); setSettings({ ...settings, reminderMinutes: event.target.value.split(",").map(Number).filter(Number.isFinite) }); }} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" /></label><button onClick={() => void saveReminderSettings()} disabled={savingReminders} className="mt-4 rounded-xl bg-sky-300 px-5 py-3 text-xs font-black uppercase text-black disabled:opacity-60">{savingReminders ? "Saving..." : remindersSaved ? "Saved ✓" : "Save Reminder Settings"}</button><p className="mt-4 text-xs text-white/40">For example: 60, 15 sends reminders one hour and fifteen minutes before each battle.</p></section>

    <section className="mt-8 rounded-3xl border border-sky-300/20 bg-sky-300/[.035] p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-[family-name:var(--font-norwester)] text-3xl uppercase text-sky-200">Scheduled Battles</h2><span className="text-sm font-black text-sky-200">{battles.length} Total</span></div><div className="mt-5 grid gap-3">{battles.map((battle) => { const lead = [...settings.reminderMinutes].sort((a, b) => b - a)[0]; const status = battle.reminders?.[String(lead)]?.status; return <article key={battle.id} className="rounded-2xl border border-white/10 bg-black/30 p-4"><div className="grid gap-3 md:grid-cols-[180px_180px_1fr_auto]"><div><p className="text-xs text-white/40">Date</p><strong>{battle.date}</strong><p className="mt-2 text-[10px] font-black uppercase tracking-wide text-sky-200">Reminder Due: {reminderTime(battle.time, lead)}</p></div><div><p className="text-xs text-white/40">Time</p><strong className="text-sky-200">{battle.time}</strong><p className={`mt-2 text-[10px] font-black uppercase tracking-wide ${status === "success" ? "text-emerald-300" : status === "failed" ? "text-red-300" : "text-white/40"}`}>{status === "success" ? "Reminder Success" : status === "failed" ? "Reminder Failed" : "Reminder Pending"}</p></div><div><p className="font-black">{battle.creator}{battle.opponent ? <><span className="text-white/40"> VS </span>{battle.opponent}</> : null}</p><p className="mt-1 text-xs font-black uppercase tracking-wide text-sky-200">{battle.type || "ARRANGED BATTLE"}</p>{battle.opponent ? <p className="mt-1 text-xs text-white/55">{battle.size} · {battle.agency} · {battle.manager}</p> : null}</div><div className="flex items-start gap-3"><button onClick={() => beginEdit(battle)} className="text-xs font-black text-sky-200">Edit</button><button onClick={() => void save({ ...settings, battles: settings.battles.filter((item) => item.id !== battle.id) })} className="text-xs font-black text-red-300">Remove</button></div></div>{editingId === battle.id ? <div className="mt-4 grid gap-3 border-t border-sky-300/15 pt-4 sm:grid-cols-[1fr_1fr_1.4fr_auto]"><label className="text-[10px] font-black uppercase text-white/45">Date<input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white" /></label><label className="text-[10px] font-black uppercase text-white/45">Time<input type="time" value={editTime} onChange={(event) => setEditTime(event.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white" /></label><label className="text-[10px] font-black uppercase text-white/45">Battle Type<select value={editType} onChange={(event) => setEditType(event.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white">{battleTypes.map((type) => <option key={type}>{type}</option>)}</select></label><div className="flex items-end gap-2"><button onClick={() => saveEdit(battle)} className="rounded-lg bg-sky-300 px-3 py-2 text-[10px] font-black uppercase text-black">Save</button><button onClick={() => setEditingId(null)} className="rounded-lg border border-white/15 px-3 py-2 text-[10px] font-black uppercase text-white/60">Cancel</button></div></div> : null}</article>; })}{!battles.length ? <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/40">No DF/JD battles imported yet.</p> : null}</div></section>
  </div></main>;
}
