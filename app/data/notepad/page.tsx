"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type NotepadData = { note?: string; updatedAt?: string | null; error?: string };

export default function NotepadPage() {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("LOADING...");
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestNoteRef = useRef("");

  const load = useCallback(async (keepTyping = false) => {
    try {
      const response = await fetch("/api/data/notepad", { cache: "no-store" });
      const data = await response.json() as NotepadData;
      if (!response.ok) throw Error(data.error || "COULD NOT LOAD NOTEPAD.");
      if (!keepTyping && !dirtyRef.current) {
        latestNoteRef.current = data.note || "";
        setNote(data.note || "");
      }
      if (!dirtyRef.current) setStatus("LIVE · SAVES 5 SECONDS AFTER YOU STOP TYPING");
    } catch (error) {
      setStatus(error instanceof Error ? error.message.toUpperCase() : "COULD NOT LOAD NOTEPAD.");
    }
  }, []);

  const save = useCallback(async () => {
    const next = latestNoteRef.current;
    setStatus("SAVING...");
    try {
      const response = await fetch("/api/data/notepad", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: next }) });
      const data = await response.json() as NotepadData;
      if (!response.ok) throw Error(data.error || "COULD NOT SAVE NOTEPAD.");
      dirtyRef.current = false;
      setStatus("SAVED · LIVE FOR EVERYONE");
    } catch (error) {
      setStatus(error instanceof Error ? error.message.toUpperCase() : "COULD NOT SAVE NOTEPAD.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void load(); }, 0);
    const refresh = setInterval(() => { if (!dirtyRef.current) void load(true); }, 5000);
    return () => { clearTimeout(initialLoad); clearInterval(refresh); if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [load]);

  function update(value: string) {
    setNote(value);
    latestNoteRef.current = value;
    dirtyRef.current = true;
    setStatus("SAVING 5 SECONDS AFTER YOU STOP TYPING...");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { saveTimerRef.current = null; void save(); }, 5000);
  }

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl"><Link href="/data/menu" className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">← Data Space</Link><p className="mt-10 text-xs font-black uppercase tracking-[0.3em] text-sky-200/75">Shared space</p><h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase sm:text-6xl">Notepad</h1><p className="mt-4 max-w-2xl text-white/60">A shared blank page for anything the team needs to write down. Changes are saved automatically and appear for everyone.</p><p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-200">{status}</p><textarea aria-label="Shared notepad" value={note} onChange={(event) => update(event.target.value)} placeholder="START TYPING..." rows={20} className="mt-5 min-h-[560px] w-full resize-y rounded-[28px] border border-sky-300/25 bg-white/[0.035] p-6 text-base leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-sky-300/60 sm:p-8" /></div></main></DataAccessGuard>;
}
