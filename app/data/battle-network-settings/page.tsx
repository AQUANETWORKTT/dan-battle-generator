"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Agency = { id: string; name: string; accent: string; logoUrl?: string; externalOnly?: boolean; password?: string };
type Draft = { id?: string; name: string; accent: string; logoUrl: string; password: string };
type Incompatibility = { first: string; second: string; reason: string };

const BUILT_INS = new Set(["paradise", "respawn", "horizon", "trident", "first-class-dan-james", "honey-bloom", "external-agency"]);
const blank: Draft = { name: "", accent: "#38bdf8", logoUrl: "", password: "" };

export default function BattleNetworkSettingsPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [draft, setDraft] = useState<Draft>(blank);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [managerSettings, setManagerSettings] = useState<Record<string, { name: string; initials: string }[]>>({});
  const [managerDrafts, setManagerDrafts] = useState<Record<string, { name: string; initials: string }>>({});
  const [editingManager, setEditingManager] = useState<Record<string, number | undefined>>({});
  const [incompatibilities, setIncompatibilities] = useState<Incompatibility[]>([]);
  const [incompatibilityDraft, setIncompatibilityDraft] = useState<Incompatibility>({ first: "", second: "", reason: "" });

  async function load() {
    const response = await fetch("/api/battle-network?settings=1", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) { setAgencies(data.agencies || []); setManagerSettings(data.managerSettings || {}); setIncompatibilities(data.incompatibilities || []); }
    else setMessage(data.error || "COULD NOT LOAD AGENCIES.");
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { const colourInput = document.querySelector('input[type="color"]'); const container = colourInput?.parentElement?.parentElement; if (!container || document.getElementById("external-agency-password")) return; const label = document.createElement("label"); label.className = "text-xs font-black uppercase text-white/55"; label.textContent = "Agency password"; const input = document.createElement("input"); input.id = "external-agency-password"; input.type = "text"; input.placeholder = "LEAVE BLANK TO REMOVE PASSWORD"; input.className = "mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white"; input.value = draft.password; input.oninput = () => setDraft((value) => ({ ...value, password: input.value })); label.append(input); container.append(label); return () => label.remove(); }, [draft.id]);

  async function fileToLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((value) => ({ ...value, logoUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) { setMessage("ENTER AN AGENCY NAME FIRST."); return; }
    setSaving(true);
    setMessage("");
    try {
      const action = draft.id ? "save-external-agency" : "register-external-agency";
      const response = await fetch("/api/battle-network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "save-external-agency" ? { action, agency: draft } : { action, ...draft }),
      });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || "COULD NOT SAVE AGENCY."); return; }
      setDraft(blank);
      setMessage(action === "save-external-agency" ? "AGENCY UPDATED." : "EXTERNAL AGENCY ADDED.");
      await load();
    } catch {
      setMessage("COULD NOT REACH BATTLE NETWORK. REFRESH AND TRY AGAIN.");
    } finally {
      setSaving(false);
    }
  }

  function edit(agency: Agency) {
    setDraft({ id: agency.id, name: agency.name, accent: agency.accent, logoUrl: agency.logoUrl || "", password: agency.password || "" });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveManagers() { const response = await fetch("/api/battle-network", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-manager-settings", managerSettings }) }); setMessage(response.ok ? "MANAGER SETTINGS SAVED." : "COULD NOT SAVE MANAGERS."); }
  async function saveIncompatibilities(next: Incompatibility[]) { setIncompatibilities(next); const response = await fetch("/api/battle-network", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-incompatibilities", incompatibilities: next }) }); const data = await response.json(); if (!response.ok) { setMessage(data.error || "COULD NOT SAVE INCOMPATIBLE CREATORS."); await load(); return; } setIncompatibilities(data.incompatibilities || []); setMessage("INCOMPATIBLE CREATOR LIST SAVED."); }
  function addIncompatibility() { const first = incompatibilityDraft.first.trim().replace(/^@/, ""), second = incompatibilityDraft.second.trim().replace(/^@/, ""); if (!first || !second || first.toLowerCase() === second.toLowerCase()) { setMessage("ENTER TWO DIFFERENT CREATOR USERNAMES."); return; } void saveIncompatibilities([...incompatibilities, { first, second, reason: incompatibilityDraft.reason.trim() }]); setIncompatibilityDraft({ first: "", second: "", reason: "" }); }
  function addManager(agencyId: string) { const draft = managerDrafts[agencyId]; if (!draft?.name?.trim()) return; const manager = { name: draft.name.trim(), initials: draft.initials.trim().toUpperCase().slice(0, 5) }; const index = editingManager[agencyId]; setManagerSettings((current) => ({ ...current, [agencyId]: index === undefined ? [...(current[agencyId] || []), manager] : (current[agencyId] || []).map((item, itemIndex) => itemIndex === index ? manager : item) })); setManagerDrafts((current) => ({ ...current, [agencyId]: { name: "", initials: "" } })); setEditingManager((current) => ({ ...current, [agencyId]: undefined })); }
  function editManager(agencyId: string, index: number) { const manager = managerSettings[agencyId]?.[index]; if (!manager) return; setManagerDrafts((current) => ({ ...current, [agencyId]: manager })); setEditingManager((current) => ({ ...current, [agencyId]: index })); }

  async function remove(agency: Agency) {
    if (!window.confirm(`REMOVE ${agency.name}?`)) return;
    const response = await fetch("/api/battle-network", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-agency", agencyId: agency.id }),
    });
    const data = await response.json();
    setMessage(response.ok ? "AGENCY REMOVED." : data.error || "COULD NOT REMOVE AGENCY.");
    if (response.ok) await load();
  }

  const custom = agencies.filter((agency) => !BUILT_INS.has(agency.id) && agency.externalOnly);

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-5xl">
    <Link href="/data/menu" className="text-xs font-black uppercase tracking-[.18em] text-sky-200">← BACK TO DATA SPACE</Link>
    <p className="mt-12 text-xs font-black uppercase tracking-[.3em] text-sky-200/75">DATA SETTINGS</p>
    <h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase">BATTLE NETWORK <span className="text-sky-300">SETTINGS</span></h1>
    <p className="mt-4 max-w-2xl text-white/60">ADD EXTERNAL AGENCIES, THEIR LOGOS AND ACCENT COLOURS. THEY CAN BE SELECTED WHEN PAIRING A BATTLE, BUT THEY DO NOT GET A PASSWORD OR A PRIVATE BATTLE SHEET.</p>
    <form onSubmit={save} className="mt-8 rounded-3xl border border-sky-300/25 bg-white/[.035] p-6">
      <div className="flex items-center justify-between gap-4"><h2 className="font-[family-name:var(--font-norwester)] text-2xl uppercase">{draft.id ? "EDIT AGENCY" : "ADD EXTERNAL AGENCY"}</h2>{draft.id ? <button type="button" onClick={() => setDraft(blank)} className="text-xs font-black uppercase text-white/55">CANCEL EDIT</button> : null}</div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-black uppercase text-white/55">AGENCY NAME<input required value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} placeholder="AGENCY NAME" className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" /></label>
        <label className="text-xs font-black uppercase text-white/55">ACCENT COLOUR<input type="color" value={draft.accent} onChange={(event) => setDraft((value) => ({ ...value, accent: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-black/40 p-1" /></label>
        <label className="text-xs font-black uppercase text-white/55 sm:col-span-2">LOGO IMAGE<input type="file" accept="image/*" onChange={fileToLogo} className="mt-2 block w-full text-xs text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-300 file:px-3 file:py-2 file:text-xs file:font-black file:text-black" /></label>
      </div>
      {draft.logoUrl ? <div className="mt-5 flex items-center gap-4 rounded-xl border border-white/10 bg-black/30 p-4"><img src={draft.logoUrl} alt="Agency logo preview" className="h-14 w-24 object-contain" /><button type="button" onClick={() => setDraft((value) => ({ ...value, logoUrl: "" }))} className="text-xs font-black uppercase text-red-300">REMOVE LOGO</button></div> : null}
      <button type="submit" disabled={saving} className="mt-6 rounded-xl bg-sky-300 px-5 py-3 text-xs font-black uppercase text-black disabled:opacity-50">{saving ? "SAVING…" : draft.id ? "SAVE AGENCY" : "ADD AGENCY"}</button>
    </form>
    <p className="mt-4 min-h-6 text-xs font-black uppercase text-yellow-100">{message}</p>
    <section className="mt-12"><h2 className="font-[family-name:var(--font-norwester)] text-3xl uppercase">INTERNAL AGENCY MANAGERS</h2><p className="mt-2 text-sm text-white/60">Add each manager name and manager code (up to five characters). These are used in the Battle Network manager dropdown.</p><div className="mt-4 grid gap-4">{agencies.filter((agency) => !agency.externalOnly).map((agency) => { const draft = managerDrafts[agency.id] || { name: "", initials: "" }; return <article key={agency.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><h3 className="font-black uppercase" style={{ color: agency.accent }}>{agency.name}</h3><div className="mt-3 flex flex-wrap gap-2">{(managerSettings[agency.id] || []).map((manager, index) => <span key={`${manager.initials}-${index}`} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-black">{manager.initials} - {manager.name}<button onClick={() => editManager(agency.id, index)} className="ml-3 text-sky-200">EDIT</button><button onClick={() => setManagerSettings((current) => ({ ...current, [agency.id]: current[agency.id].filter((_, itemIndex) => itemIndex !== index) }))} className="ml-3 text-red-300">REMOVE</button></span>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_110px_auto]"><input value={draft.name} onChange={(event) => setManagerDrafts((current) => ({ ...current, [agency.id]: { ...draft, name: event.target.value } }))} placeholder="MANAGER NAME" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white"/><input value={draft.initials} onChange={(event) => setManagerDrafts((current) => ({ ...current, [agency.id]: { ...draft, initials: event.target.value } }))} placeholder="INITIALS" maxLength={5} className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white"/><button onClick={() => addManager(agency.id)} className="rounded-xl bg-sky-300 px-4 py-3 text-xs font-black uppercase text-black">{editingManager[agency.id] === undefined ? "ADD MANAGER" : "SAVE MANAGER"}</button></div></article>; })}</div><div className="sticky bottom-4 z-20 mt-5 flex justify-end"><button onClick={() => void saveManagers()} className="rounded-xl bg-yellow-300 px-6 py-4 text-xs font-black uppercase text-black shadow-2xl ring-2 ring-black">SAVE MANAGERS</button></div></section>
    <section className="mt-12 rounded-3xl border border-red-400/35 bg-red-500/[.08] p-6"><h2 className="font-[family-name:var(--font-norwester)] text-3xl uppercase text-red-200">INCOMPATIBLE CREATOR PAIRS</h2><p className="mt-2 max-w-2xl text-sm text-white/60">Add two creators who must never be matched. The reason is stored privately for the warning hover state; battle claims and manual matching are blocked for every saved pair.</p><div className="mt-5 grid gap-3 md:grid-cols-2"><input value={incompatibilityDraft.first} onChange={(event) => setIncompatibilityDraft((value) => ({ ...value, first: event.target.value }))} placeholder="FIRST CREATOR USERNAME" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" /><input value={incompatibilityDraft.second} onChange={(event) => setIncompatibilityDraft((value) => ({ ...value, second: event.target.value }))} placeholder="SECOND CREATOR USERNAME" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" /><input value={incompatibilityDraft.reason} onChange={(event) => setIncompatibilityDraft((value) => ({ ...value, reason: event.target.value }))} placeholder="REASON (PRIVATE)" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white md:col-span-2" /></div><button onClick={addIncompatibility} className="mt-4 rounded-xl bg-red-400 px-5 py-3 text-xs font-black uppercase text-black">ADD INCOMPATIBLE PAIR</button><div className="mt-5 grid gap-3">{incompatibilities.map((pair, index) => <article key={`${pair.first}-${pair.second}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300/25 bg-black/25 p-4"><p className="font-black text-red-100">⚠ @{pair.first} <span className="text-white/40">×</span> @{pair.second}</p><button onClick={() => void saveIncompatibilities(incompatibilities.filter((_, pairIndex) => pairIndex !== index))} className="text-xs font-black uppercase text-red-300">REMOVE</button></article>)}{!incompatibilities.length ? <p className="text-sm text-white/45">NO INCOMPATIBLE CREATOR PAIRS ADDED YET.</p> : null}</div></section>
    <section className="mt-12"><h2 className="font-[family-name:var(--font-norwester)] text-3xl uppercase">EXTERNAL AGENCY LIST</h2><div className="mt-4 grid gap-3">
      {custom.map((agency) => <article key={agency.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-4">{agency.logoUrl ? <img src={agency.logoUrl} alt="" className="h-12 w-20 object-contain" /> : <div className="grid h-12 w-20 place-items-center rounded-lg border border-white/15 text-[9px] font-black text-white/35">NO LOGO</div>}<strong>{agency.name}</strong></div><div className="flex gap-2"><button onClick={() => edit(agency)} className="rounded-lg border border-sky-300/40 px-3 py-2 text-xs font-black uppercase text-sky-200">EDIT</button><button onClick={() => void remove(agency)} className="rounded-lg border border-red-300/40 px-3 py-2 text-xs font-black uppercase text-red-300">REMOVE</button></div></article>)}
      {!custom.length ? <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/45">NO EXTERNAL AGENCIES ADDED YET.</p> : null}
    </div></section>
  </div></main></DataAccessGuard>;
}
