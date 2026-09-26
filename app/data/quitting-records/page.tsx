"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import DataAccessGuard from "../../components/DataAccessGuard";

type Item = {
  username: string;
  creatorId: string;
  managers: string[];
  groups: string[];
  diamonds: number;
  daysSinceJoining?: number;
  quitAt?: string;
  reason: string;
  createdAt: string;
  noHistory?: boolean;
};

const fmt = new Intl.NumberFormat("en-GB");

const normalizeUsername = (value: string) => value.trim().replace(/^@/, "").toLowerCase();

const parseUsernames = (value: string) =>
  [...new Set(value.split(/[\n,]+/).map(normalizeUsername).filter(Boolean))];

export default function Page() {
  const [saved, setSaved] = useState<Item[]>([]);
  const [managerNames, setManagerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingNew, setLoadingNew] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [sort, setSort] = useState<"recent" | "diamonds">("recent");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingReason, setEditingReason] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [savingReason, setSavingReason] = useState(false);

  async function loadRecords() {
    setLoading(true);
    try {
      const [r, assignments] = await Promise.all([fetch("/api/data-analysis/quitting-records", { cache: "no-store" }), fetch("/api/data-analysis/manager-assignments", { cache: "no-store" })]);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load quitting records.");
      setSaved(d.records || []);
      if (assignments.ok) { const data = await assignments.json(); setManagerNames(data.assignments?.managerNames || {}); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load quitting records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, []);

  const eligibleRecords = useMemo(() => saved.filter((record) => Number(record.daysSinceJoining || 0) < 15), [saved]);

  const groups = useMemo(
    () => [...new Set(eligibleRecords.flatMap((r) => r.groups || []))].filter(Boolean).sort(),
    [eligibleRecords],
  );

  const managers = useMemo(
    () => [...new Set(saved.flatMap((r) => r.managers || []))].filter(Boolean).sort(),
    [saved],
  );

  const months = useMemo(() => [...new Set(saved.map((record) => (record.quitAt || record.createdAt || "").slice(0, 7)).filter(Boolean))].sort().reverse(), [saved]);

  const shown = useMemo(
    () =>
      eligibleRecords.filter(
        (r) =>
          (selectedMonth === "ALL" || (r.quitAt || r.createdAt || "").startsWith(selectedMonth)) &&
          (!selectedGroups.length || (r.groups || []).some((name) => selectedGroups.includes(name))),
      ),
    [eligibleRecords, selectedGroups, selectedMonth],
  );

  const sortedShown = useMemo(() => [...shown].sort((a, b) => sort === "diamonds" ? (b.diamonds || 0) - (a.diamonds || 0) : (b.createdAt || "").localeCompare(a.createdAt || "")), [shown, sort]);

  const summaryCounts = useMemo(() =>
    groups.map((name) => ({
      name,
      count: shown.filter((record) => (record.groups || []).includes(name)).length,
    })),
    [groups, shown],
  );

  function toggleGroup(name: string) { setSelectedGroups((current) => current.includes(name) ? current.filter((group) => group !== name) : [...current, name]); }
  const managerLabel = (value: string) => managerNames[value.toLowerCase().replace(/[^a-z0-9]/g, "")] || value.split("@")[0].replace(/^firstclassagency[_.-]?/i, "").replace(/[_.-]+/g, " ");

  function createQuitRecordPdf() { const pdf = new jsPDF({ unit: "pt", format: "a4" }); const byMonth = sortedShown.reduce<Record<string, Item[]>>((all, record) => { const month = (record.quitAt || record.createdAt).slice(0, 7); (all[month] ||= []).push(record); return all; }, {}); const page = () => { pdf.setFillColor(8, 7, 5); pdf.rect(0, 0, 595, 842, "F"); }; const drawMonth = (month: string, continuation = false) => { page(); pdf.setTextColor(244, 198, 91); pdf.setFontSize(10); pdf.text("FIRST CLASS AGENCY - MANAGEMENT", 42, 48); pdf.setTextColor(255, 255, 255); pdf.setFontSize(26); pdf.text(`${new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }).toUpperCase()} QUIT RECORD${continuation ? " - CONTINUED" : ""}`, 42, 82); pdf.setTextColor(190, 168, 112); pdf.setFontSize(10); pdf.text("Early leavers only - creators who left before day 15", 42, 105); }; const line = (text: string, x: number, y: number, size = 9, color: [number, number, number] = [245, 241, 229]) => { pdf.setTextColor(...color); pdf.setFontSize(size); pdf.text(text, x, y); }; let firstPage = true; for (const month of Object.keys(byMonth).sort().reverse()) { if (!firstPage) pdf.addPage(); firstPage = false; drawMonth(month); let y = 140; const managers = Object.values(byMonth[month].reduce<Record<string, Item[]>>((all, record) => { const manager = managerLabel((record.managers || []).at(-1) || "Unassigned"); (all[manager] ||= []).push(record); return all; }, {})).sort((a, b) => String(b[0].quitAt || b[0].createdAt).localeCompare(String(a[0].quitAt || a[0].createdAt))); for (const records of managers) { records.sort((a, b) => String(b.quitAt || b.createdAt).localeCompare(String(a.quitAt || a.createdAt))); if (y > 710) { pdf.addPage(); drawMonth(month, true); y = 140; } const manager = managerLabel((records[0].managers || []).at(-1) || "Unassigned"); const diamonds = records.reduce((sum, record) => sum + (record.diamonds || 0), 0); pdf.setFillColor(49, 37, 15); pdf.rect(38, y - 16, 520, 23, "F"); line(`${manager.toUpperCase()} - ${records.length} QUIT${records.length === 1 ? "" : "S"} - ${fmt.format(diamonds)} DIAMONDS LOST`, 44, y, 9, [244, 198, 91]); y += 27; for (const record of records) { if (y > 780) { pdf.addPage(); drawMonth(month, true); y = 140; } line(`@${record.username}`, 44, y, 9); line(`Day ${record.daysSinceJoining || 0}`, 290, y, 9); line(`${fmt.format(record.diamonds || 0)} diamonds`, 360, y, 9); line((record.quitAt || record.createdAt).slice(0, 10), 485, y, 8, [190, 168, 112]); y += 22; } y += 12; } } pdf.save(`FIRST-CLASS-QUIT-RECORD-${selectedMonth === "ALL" ? "ALL-MONTHS" : selectedMonth}.pdf`); }

  async function detectAndSaveRecords() {
    setLoadingNew(true);
    try {
      const r = await fetch("/api/data-analysis/quitting-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect-and-save" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not check the latest upload.");
      setSaved(d.records || []);
      if (d.detected) setMessage(`${d.detected} new quitting record${d.detected === 1 ? "" : "s"} added.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not check the latest upload.");
    } finally {
      setLoadingNew(false);
    }
  }

  function openReasonEditor(record: Item) {
    const key = normalizeUsername(record.username);
    if (editingReason === key) {
      setEditingReason(null);
      setReasonDraft("");
      return;
    }
    setEditingReason(key);
    setReasonDraft(record.reason || "");
  }

  async function saveReason(record: Item) {
    setSavingReason(true);
    setMessage("");

    try {
      const r = await fetch("/api/data-analysis/quitting-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-reason",
          username: normalizeUsername(record.username),
          reason: reasonDraft.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save quit reason.");

      setSaved(d.records || []);
      setEditingReason(null);
      setReasonDraft("");
      setMessage(`Reason saved for @${record.username}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save quit reason.");
    } finally {
      setSavingReason(false);
    }
  }

  async function deleteRecord(record: Item) {
    if (!window.confirm(`Remove @${record.username} from the quitting records?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/data-analysis/quitting-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-record", username: normalizeUsername(record.username) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not remove quitting record.");
      setSaved(d.records || []);
      setMessage(`@${record.username} removed from the quitting records.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove quitting record.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DataAccessGuard>
      <main className="min-h-screen bg-[#080806] px-5 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <Link href="/data/menu" className="text-xs font-black uppercase tracking-widest text-yellow-200">
            ← Data Space
          </Link>

          <p className="mt-10 text-xs font-black uppercase tracking-[.25em] text-yellow-200">Management</p>
          <h1 className="mt-3 font-[family-name:var(--font-norwester)] text-5xl uppercase">
            Quitting <span className="text-yellow-300">Records</span>
          </h1>
            <p className="mt-4 max-w-3xl text-sm text-white/60">
            Shared, ongoing quit register. Paste creators in bulk, or automatically find creators missing from the newest full upload.
          </p>

          <section className="mt-7">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <div className="rounded-xl border border-yellow-300/25 bg-yellow-300/10 p-4">
                <p className="text-[10px] font-black uppercase text-white/55">Recorded quits ever</p>
                <p className="mt-1 text-3xl font-black text-yellow-100">{shown.length}</p>
              </div>
              {summaryCounts.map(({ name, count }) => (
                <button key={name} onClick={() => toggleGroup(name)} className={`rounded-xl border p-4 text-left ${selectedGroups.includes(name) ? "border-yellow-300 bg-yellow-300/15" : "border-white/10 bg-white/[.035]"}`}>
                  <p className="text-[10px] font-black uppercase text-white/55">{name}</p>
                  <p className="mt-1 text-3xl font-black text-white">{count}</p>
                </button>
              ))}
            </div>
          </section>

          {message ? <p className="mt-4 text-xs font-black uppercase text-yellow-200">{message}</p> : null}
          {loadingNew ? <p className="mt-4 text-xs font-black uppercase text-yellow-200">Loading new records from uploaded history…</p> : null}

          <section className="mt-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-white/40">Shared register</p>
                <h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase">Saved records</h2>
              </div>

              <div className="flex flex-wrap gap-3"><button onClick={() => void detectAndSaveRecords()} disabled={loadingNew} className="rounded-xl bg-yellow-300 px-4 py-3 text-xs font-black uppercase text-black disabled:opacity-50">{loadingNew ? "Checking…" : "Find early quits"}</button><button onClick={createQuitRecordPdf} disabled={!sortedShown.length} className="rounded-xl border border-yellow-300/50 px-4 py-3 text-xs font-black uppercase text-yellow-100 disabled:opacity-50">Create Quit Record PDF</button><select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-xs font-black uppercase text-white"><option value="ALL">All months</option>{months.map((month) => <option key={month} value={month}>{new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</option>)}</select><button onClick={() => setSort("recent")} className={`rounded-xl px-4 py-3 text-xs font-black uppercase ${sort === "recent" ? "bg-yellow-300 text-black" : "border border-white/15"}`}>Most recent</button><button onClick={() => setSort("diamonds")} className={`rounded-xl px-4 py-3 text-xs font-black uppercase ${sort === "diamonds" ? "bg-yellow-300 text-black" : "border border-white/15"}`}>Most diamonds</button></div>
            </div>

            <div className="mt-5 space-y-3">
              {sortedShown.map((r) => {
                const key = normalizeUsername(r.username);
                const isEditing = editingReason === key;
                return (
                  <article key={key} className="rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <strong className="break-all text-lg">@{r.username}</strong>
                        <p className="mt-1 text-xs text-white/45">
                          Confirmed quit {r.quitAt ? new Date(`${r.quitAt}T12:00:00`).toLocaleDateString("en-GB") : r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "date not recorded"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-start gap-3">
                        <strong className="hidden text-right text-sm text-yellow-200 sm:block">{fmt.format(r.diamonds || 0)} diamonds</strong>
                        <button
                          type="button"
                          onClick={() => openReasonEditor(r)}
                          aria-label={`${r.reason ? "Edit" : "Add"} quit reason for @${r.username}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-yellow-300/30 bg-yellow-300/10 text-lg font-black text-yellow-100 hover:bg-yellow-300/20"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteRecord(r)}
                          disabled={busy}
                          aria-label={`Remove quitting record for @${r.username}`}
                          className="flex h-8 items-center justify-center rounded-lg border border-red-300/30 bg-red-300/10 px-2 text-[10px] font-black uppercase text-red-100 hover:bg-red-300/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {r.noHistory ? (
                      <div className="mt-4 rounded-xl border border-yellow-300/20 bg-yellow-300/[.06] px-4 py-3 text-sm font-bold text-yellow-100">
                        Quit too quickly for data
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl bg-black/25 p-3">
                          <p className="text-[10px] font-black uppercase text-white/35">Creator ID</p>
                          <p className="mt-1 break-all text-sm font-bold">{r.creatorId || "Not recorded"}</p>
                        </div>
                        <div className="rounded-xl bg-black/25 p-3">
                          <p className="text-[10px] font-black uppercase text-white/35">Manager history</p>
                          <p className="mt-1 text-sm">{(r.managers || []).join(" → ") || "Unassigned"}</p>
                        </div>
                        <div className="rounded-xl bg-black/25 p-3">
                          <p className="text-[10px] font-black uppercase text-white/35">Group history</p>
                          <p className="mt-1 text-sm">{(r.groups || []).join(" → ") || "Not recorded"}</p>
                        </div>
                        <div className="rounded-xl bg-black/25 p-3">
                          <p className="text-[10px] font-black uppercase text-white/35">Recorded diamonds</p>
                          <p className="mt-1 text-sm font-bold text-yellow-200">{fmt.format(r.diamonds || 0)}</p>
                        </div>
                      </div>
                    )}

                    {r.reason ? <p className="mt-4 text-sm text-white/85"><span className="font-black">Reason:</span> {r.reason}</p> : null}

                    {isEditing ? (
                      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/25 p-3 sm:flex-row">
                        <input
                          autoFocus
                          value={reasonDraft}
                          onChange={(e) => setReasonDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !savingReason) void saveReason(r);
                            if (e.key === "Escape") {
                              setEditingReason(null);
                              setReasonDraft("");
                            }
                          }}
                          placeholder="Quit reason (optional)"
                          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-yellow-300/60"
                        />
                        <button
                          type="button"
                          onClick={() => void saveReason(r)}
                          disabled={savingReason}
                          className="rounded-lg bg-yellow-300 px-5 py-2.5 text-xs font-black uppercase text-black disabled:opacity-50"
                        >
                          {savingReason ? "Saving…" : "Save"}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}

              {loading ? (
                <p className="rounded-xl border border-yellow-300/25 bg-yellow-300/[.06] p-5 text-sm font-bold text-yellow-100">
                  Loading quitting records from uploaded history…
                </p>
              ) : !sortedShown.length ? (
                <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/45">
                  No saved quitting records match these filters.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </DataAccessGuard>
  );
}
