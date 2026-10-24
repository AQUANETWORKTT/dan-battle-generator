"use client";
import { useEffect, useRef, useState } from "react";
import type { Creator as LegacyCreator } from "./Tracker";
import { onboardingSteps, onboardingStep, completeOnboardingStep, type StepProgress } from "@/lib/onboarding-steps";
import { londonToday, onboardingDayNumber } from "@/lib/onboarding-schedule";
import { downloadOnboardingReport } from "./report";
import "./onboarding.css";

type Creator = LegacyCreator & StepProgress & { completedAt?: string; status?: string; streams?: number; lastLive?: string };
type Bucket = "pending" | "active" | "previous" | "quit" | "noChat" | "awaiting";
type View = number | "completed" | "previous" | "quit" | "noChat";
type Data = { latestDate: string; notes?: string } & Record<Bucket, Creator[]>;
type Action = "advance" | "checklist" | "no-chat" | "restore" | "hide" | "quit" | "unboard" | "finish";
const buckets: Bucket[] = ["pending", "active", "previous", "quit", "noChat", "awaiting"];
const empty: Data = { latestDate: "", pending: [], active: [], previous: [], quit: [], noChat: [], awaiting: [] };
const shift = (start: string, offset: number) => { const d = new Date(`${start}T12:00:00Z`); if (!Number.isFinite(+d)) return ""; d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
const fmt = (n: number) => (n || 0).toLocaleString("en-GB", { maximumFractionDigits: 1 });
const formatDate = (s: string) => s ? new Date(s + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }) : "Never";
const ago = (s?: string) => { if (!s) return "Never"; const days = onboardingDayNumber(s, londonToday()) - 1; return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`; };

function CreatorCard({ creator: x, working, open, onExpand, save }: { creator: Creator; working: boolean; open: boolean; onExpand: () => void; save: (x: Creator, action: Action) => void }) {
  const [notes, setNotes] = useState(x.notes || ""), [stepNotes, setStepNotes] = useState(x.stepNotes || {}), [handoverNotes, setHandoverNotes] = useState(x.handoverNotes || "");
  const [pending, setPending] = useState<"no-chat" | "quit" | null>(null), [avatar, setAvatar] = useState("");
  const day = onboardingDayNumber(x.startDate || x.joinedDate, londonToday()), step = onboardingStep(x), start = x.startDate || x.joinedDate;
  const pendingDraft = () => ({ ...x, notes, stepNotes, handoverNotes });
  const dirty = useRef(false), saveRef = useRef(save), draftRef = useRef(pendingDraft());
  saveRef.current = save; draftRef.current = pendingDraft();
  const flush = () => { if (dirty.current) { dirty.current = false; saveRef.current(draftRef.current, "checklist"); } };
  useEffect(() => { if (!dirty.current) return; const timer = setTimeout(flush, 700); return () => clearTimeout(timer); }, [notes, stepNotes, handoverNotes]);
  useEffect(() => () => { if (dirty.current) { dirty.current = false; saveRef.current(draftRef.current, "checklist"); } }, []);
  useEffect(() => { let alive = true; fetch("/api/tiktok-avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: x.username }) }).then(r => r.json()).then(j => { if (alive && j.avatar) setAvatar("/api/tiktok-avatar-image?url=" + encodeURIComponent(j.avatar)); }).catch(() => undefined); return () => { alive = false; }; }, [x.username]);
  const act = (action: Action) => { dirty.current = false; save(pendingDraft(), action); };
  const report = () => downloadOnboardingReport(pendingDraft());
  const toggle = () => { flush(); setPending(null); onExpand(); };
  return <article className={`card ${open ? "card-open" : "card-closed"} ${x.status === "awaiting-final" && day >= 14 ? "ready-card" : ""}`} onClick={e => { if (!open && !(e.target as HTMLElement).closest(".card-head, a, button, input, textarea, select, summary")) toggle(); }}>
    <div className="card-head clickable" role="button" tabIndex={0} aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} details for @${x.username}`} onClick={toggle} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(); } }}><div className="creator-identity">{avatar ? <img className="head-avatar" src={avatar} onError={() => setAvatar("")} alt={`${x.username}\'s profile`} /> : <div className="head-avatar avatar-fallback" aria-hidden="true">{x.username[0]?.toUpperCase()}</div>}<div><a className="name profile" href={`https://www.tiktok.com/@${x.username}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>@{x.username} ↗</a><div className="muted">Manager: {x.manager.replace(/^team\s+/i, "")}</div><span className="pill">Onboarding Day {day}</span><span className="pill">Step {step}</span></div></div><span aria-hidden="true" className="expand-chevron">{open ? "⌃" : "⌄"}</span></div>
    {open && <>
      {x.status === "awaiting-final" && <div className={day >= 14 ? "ready" : "waiting"}>{day >= 14 ? "Ready to finish · Day " + day : "Awaiting day 14 · Currently day " + day}</div>}
      <div className="actions"><button className="btn alt small" disabled={x.status === "no-chat"} onClick={() => setPending("no-chat")}>No Group Chat</button><button className="btn alt danger small" disabled={x.status === "quit"} onClick={() => setPending("quit")}>Quit / Removed</button>{!working && x.status !== "awaiting-final" && <button className="btn small" onClick={() => act("restore")}>Return to Onboarding</button>}</div>
      {pending && <div className="confirm" role="alertdialog" aria-label="Confirm creator move">Move @{x.username} to {pending === "no-chat" ? "No Group Chat" : "Quit / Removed"}? Their notes and dates will be kept.<div className="actions"><button className="btn alt small" onClick={() => setPending(null)}>Cancel</button><button className="btn small" onClick={() => { act(pending); setPending(null); }}>Confirm</button></div></div>}
      {working && day >= 15 && <div className="overdue">Onboarding overdue · Day {day}</div>}
      <div className="stats">{[["Diamonds", fmt(x.diamonds)], ["Live hours", fmt(x.hours)], ["Live days", fmt(x.liveDays)], ["Matches", fmt(x.matches)], ["Streams", fmt(x.streams || 0)], ["Last Live", ago(x.lastLive)]].map(([label, value]) => <div className="stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <div className="muted">Last Live date: {formatDate(x.lastLive || "")} (data may be one day behind)</div>
      <div className="section"><h3>Onboarding dates</h3><div className="muted">Joined agency: {formatDate(x.joinedDate)}</div><div className="field"><label htmlFor={`start-${x.id}`}>Onboarding start date (editable)</label><input id={`start-${x.id}`} type="date" key={start} defaultValue={start} onChange={e => { if (e.target.value && e.target.value !== start) { dirty.current = false; save({ ...pendingDraft(), startDate: e.target.value }, "checklist"); } }} /></div><div className="dategrid">{[["Actual onboarding day", `Day ${day}`], ["Planned end", formatDate(shift(start, 13))]].map(([label, value]) => <div className="datecell" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div>
      <div className="section"><h3>Step {step} · {onboardingSteps[step - 1].title}</h3><div className="muted">{onboardingSteps[step - 1].advice}</div><div className="field"><label htmlFor={`notes-${x.id}`}>Notes for this step (auto-saved)</label><textarea id={`notes-${x.id}`} value={stepNotes[step] || ""} onChange={e => { dirty.current = true; setStepNotes({ ...stepNotes, [step]: e.target.value }); }} onBlur={flush} /></div>{(step === 12 || handoverNotes) && <div className="field"><label htmlFor={`handover-${x.id}`}>Notes to pass on to the manager</label><textarea id={`handover-${x.id}`} value={handoverNotes} onChange={e => { dirty.current = true; setHandoverNotes(e.target.value); }} onBlur={flush} placeholder="Final handover, progress and anything the manager needs to know…" /></div>}{working && <button className="btn" onClick={() => act("advance")}>{step === 12 ? "Mark as completed" : `Complete & move to Day ${step + 1}`} →</button>}
      <details className="section"><summary>Previous step notes</summary><div className="history">{onboardingSteps.filter(s => s.day !== step && stepNotes[s.day]).map(s => `Day ${s.day}: ${stepNotes[s.day]}`).join("\n\n") || "No previous notes recorded."}</div></details></div>
      {x.status === "awaiting-final" && <section className="section legacy"><h3>Day 14 · Final steps</h3><div className="muted">{day >= 14 ? "Ready to finish" : `Awaiting day 14 · ${formatDate(shift(start, 13))}`}</div>{([[22,"Change creator profile picture"],[33,"Send leaving message"],[21,"Leave chat"]] as const).map(([id,label]) => <label key={id}><input type="checkbox" checked={!!x.checklist[id]} onChange={() => { dirty.current = false; const checklist = [...x.checklist]; checklist[id] = !checklist[id]; save({ ...pendingDraft(), checklist }, "checklist"); }} />{label}</label>)}<button className="btn" disabled={day < 14 || ![21,22,33].every(id => x.checklist[id])} onClick={() => act("finish")}>Move to Previously Onboarded →</button></section>}
      <section className="section"><h3>General notes</h3><div className="field"><label className="sr-only" htmlFor={`general-${x.id}`}>General notes</label><textarea id={`general-${x.id}`} value={notes} onChange={e => { dirty.current = true; setNotes(e.target.value); }} onBlur={flush} /></div><div className="actions"><button className="btn alt small" onClick={report}>Download manager report ↓</button>{working && <button className="btn alt small" onClick={() => act("hide")}>Move to previously onboarded</button>}</div></section>

    </>}
  </article>;
}

export default function StepTracker() {
  const [data, setData] = useState<Data>(empty), [view, setView] = useState<View>(1), [search, setSearch] = useState(""), [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const changeView = (next: View) => { setView(next); setExpanded(null); setSearch(""); };
  const [notesOpen, setNotesOpen] = useState(false), [notes, setNotes] = useState("");
  const state = useRef(data), queue = useRef(Promise.resolve()), savedNotes = useRef("");
  const update = (next: Data) => { state.current = next; setData(next); };
  useEffect(() => { fetch("/api/onboarding", { cache: "no-store" }).then(async r => { const j = await r.json(); if (!r.ok) throw Error(j.error || "Could not load onboarding"); update(j); const first = [...j.pending, ...j.active].filter((x: Creator) => onboardingStep(x) === 1).sort((a: Creator, b: Creator) => onboardingDayNumber(b.startDate || b.joinedDate, londonToday()) - onboardingDayNumber(a.startDate || a.joinedDate, londonToday()))[0]; setExpanded(first?.id || null); setNotes(j.notes || ""); savedNotes.current = j.notes || ""; }).catch(e => setError(e.message)); }, []);
  const saveNotes = () => { const value = notes; if (value === savedNotes.current) return; const job = queue.current.then(async () => { const r = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "workspace-notes", notes: value }) }); if (!r.ok) throw Error("Could not save workspace notes. Retry by closing notes again."); savedNotes.current = value; }); queue.current = job.catch(e => setError(e.message)); };
  const save = (creator: Creator, action: Action) => {
    const before = state.current, source = buckets.find(b => before[b].some(x => x.id === creator.id)); if (!source) return;
    const step = onboardingStep(creator);
    const target: Bucket = action === "finish" ? "previous" : action === "advance" ? step === 12 ? "awaiting" : "pending" : action === "hide" ? "previous" : action === "quit" ? "quit" : action === "no-chat" ? "noChat" : action === "restore" || action === "unboard" ? "pending" : source;
    let changed: Creator = { ...creator, currentStep: step };
    if (action === "advance") changed = { ...completeOnboardingStep(changed), status: step === 12 ? "awaiting-final" : "pending" };
    if (action === "finish") changed = { ...changed, status: "complete", completedAt: new Date().toISOString() };
    if (action === "no-chat") changed.status = "no-chat";
    if (action === "quit") changed.status = "quit";
    if (action === "hide") changed.status = "hidden";
    if (action === "restore") changed.status = "returned";
    if (action === "unboard") changed = { ...changed, status: "pending", currentStep: 1, completedSteps: [], completedAt: "", checklist: changed.checklist.map(() => false) };
    const next = { ...before }; for (const b of buckets) next[b] = before[b].filter(x => x.id !== creator.id); next[target] = [changed, ...next[target]]; update(next);
    const job = queue.current.then(async () => { const r = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creator: { ...creator, currentStep: step }, action, checklist: creator.checklist }) }); if (!r.ok) { const j = await r.json(); throw Error(j.error || "Could not save creator"); } setError("");
      if (creator.startDate !== before[source].find(x => x.id === creator.id)?.startDate) { const fresh = await fetch("/api/onboarding", { cache: "no-store" }); if (fresh.ok) { const j = await fresh.json() as Data; const report = buckets.flatMap(b => j[b]).find(x => x.id === creator.id); if (report) { const current = { ...state.current }; for (const b of buckets) current[b] = current[b].map(x => x.id === creator.id && x.startDate === creator.startDate ? { ...x, weekly: report.weekly, daily: report.daily, reportStart: report.reportStart, reportEnd: report.reportEnd } : x); update(current); } } }
    });
    queue.current = job.catch(e => { setError(e.message + " Your change was not saved. Refresh before retrying."); const rollback = { ...state.current }; for (const b of buckets) rollback[b] = rollback[b].filter(x => x.id !== creator.id); rollback[source] = [before[source].find(x => x.id === creator.id)!, ...rollback[source]]; update(rollback); });
  };
  const active = [...new Map([...data.pending, ...data.active].map(x => [x.id, x])).values()];
  const completed = data.awaiting || [], previous = data.previous;
  const readyCount = completed.filter(x => onboardingDayNumber(x.startDate || x.joinedDate, londonToday()) >= 14).length;
  const forView = (v: View) => typeof v === "number" ? active.filter(x => onboardingStep(x) === v) : v === "completed" ? completed : v === "previous" ? previous : data[v];
  const visible = forView(view).filter(x => `${x.username} ${x.manager}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => onboardingDayNumber(b.startDate || b.joinedDate, londonToday()) - onboardingDayNumber(a.startDate || a.joinedDate, londonToday()));
  const title = typeof view === "number" ? `Day ${view} · ${onboardingSteps[view - 1].title}` : { completed: "Completed · Awaiting day 14", previous: "Previously onboarded", noChat: "No Group Chat", quit: "Quit / Removed" }[view];
  return <main className="onboarding-demo"><div className="app">
    <header className="top"><div><h1>Onboarding Space</h1><div className="muted">Latest upload: {data.latestDate ? formatDate(data.latestDate) : "Loading…"}</div></div><div className="top-actions"><button className="btn alt small" onClick={() => { if (notesOpen) saveNotes(); setNotesOpen(!notesOpen); }}>{notesOpen ? "Close notes" : "Notes"}</button></div></header>
    {notesOpen && <section className="panel notesbox"><h2>Shared workspace notes</h2><textarea aria-label="Shared workspace notes" value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes} className="workspace-note" /></section>}
    <div className="layout"><nav className="side" aria-label="Onboarding stages">{onboardingSteps.map(s => <button key={s.day} onClick={() => changeView(s.day)} aria-current={view === s.day ? "page" : undefined} className={view === s.day ? "active" : ""}><b>Day {s.day} ({forView(s.day).length})</b><small>{s.title}</small></button>)}<hr />{([["completed","Completed"],["previous","Previously Onboarded"],["noChat","No Group Chat"],["quit","Quit / Removed"]] as const).map(([id,label]) => <button key={id} onClick={() => changeView(id)} className={view === id ? "active" : ""}>{label} ({forView(id).length}){id === "completed" && <small className="ready-count">{readyCount} ready to finish</small>}</button>)}</nav>
      <section className={`panel ${visible.some(x => x.id === expanded) ? "focus-mode" : ""}`}><h2>{title}</h2><input className="search" aria-label="Search creator or manager" placeholder="Search creator or manager" value={search} onChange={e => setSearch(e.target.value)} /><div className="count">Creators are automatically listed by actual onboarding day, highest first.</div>{error && <p role="alert" className="error">{error}</p>}
        {visible.map(x => <CreatorCard key={`${x.id}:${onboardingStep(x)}`} creator={x} working={typeof view === "number"} open={expanded === x.id} onExpand={() => setExpanded(expanded === x.id ? null : x.id)} save={save} />)}
        {!data.latestDate ? <div className="empty">Loading creators…</div> : !visible.length ? <div className="empty">No creators in this section</div> : null}
      </section></div><p className="note">Notes and progress are shared across devices. Days 13 and 14 allow for delays. Completing a step does not change its planned day.</p>
  </div></main>;
}

