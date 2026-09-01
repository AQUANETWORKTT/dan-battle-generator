"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Item = {
  username: string;
  creatorId: string;
  managers: string[];
  groups: string[];
  diamonds: number;
  daysSinceJoining?: number;
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
  const [loading, setLoading] = useState(true);
  const [loadingNew, setLoadingNew] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [sort, setSort] = useState<"recent" | "diamonds">("recent");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingReason, setEditingReason] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [savingReason, setSavingReason] = useState(false);

  async function loadRecords() {
    setLoading(true);
    try {
      const r = await fetch("/api/data-analysis/quitting-records", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load quitting records.");
      setSaved(d.records || []);
      void detectAndSaveRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load quitting records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, []);

  const groups = useMemo(
    () => [...new Set(saved.filter((r) => Number(r.daysSinceJoining || 0) < 15).flatMap((r) => r.groups || []))].filter(Boolean).sort(),
    [saved],
  );

  const managers = useMemo(
    () => [...new Set(saved.flatMap((r) => r.managers || []))].filter(Boolean).sort(),
    [saved],
  );

  const shown = useMemo(
    () =>
      saved.filter(
        (r) =>
          Number(r.daysSinceJoining || 0) < 15 &&
          (!selectedGroups.length || (r.groups || []).some((name) => selectedGroups.includes(name))),
      ),
    [saved, selectedGroups],
  );

  const sortedShown = useMemo(() => [...shown].sort((a, b) => sort === "diamonds" ? (b.diamonds || 0) - (a.diamonds || 0) : (b.createdAt || "").localeCompare(a.createdAt || "")), [shown, sort]);

  const summaryCounts = useMemo(() =>
    groups.map((name) => ({
      name,
      count: saved.filter((record) => Number(record.daysSinceJoining || 0) < 15 && (record.groups || []).includes(name)).length,
    })),
    [groups, saved],
  );

  function toggleGroup(name: string) { setSelectedGroups((current) => current.includes(name) ? current.filter((group) => group !== name) : [...current, name]); }

  async function detectAndSaveRecords() {
    setLoadingNew(true);
    try {
      const r = await fetch("/api/data-analysis/quitting-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backfill-and-save" }),
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

          <p className="mt-10 text-xs font-black uppercase tracking-[.25em] text-sky-200">Management</p>
          <h1 className="mt-3 font-[family-name:var(--font-norwester)] text-5xl uppercase">
            Quitting <span className="text-sky-300">Records</span>
          </h1>
            <p className="mt-4 max-w-3xl text-sm text-white/60">
            Shared, ongoing quit register. Paste creators in bulk, or automatically find creators missing from the newest full upload.
          </p>

          <section className="mt-7">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <div className="rounded-xl border border-sky-300/25 bg-sky-300/10 p-4">
                <p className="text-[10px] font-black uppercase text-white/55">Recorded quits ever</p>
                <p className="mt-1 text-3xl font-black text-sky-100">{saved.length}</p>
              </div>
              {summaryCounts.map(({ name, count }) => (
                <button key={name} onClick={() => toggleGroup(name)} className={`rounded-xl border p-4 text-left ${selectedGroups.includes(name) ? "border-sky-300 bg-sky-300/15" : "border-white/10 bg-white/[.035]"}`}>
                  <p className="text-[10px] font-black uppercase text-white/55">{name}</p>
                  <p className="mt-1 text-3xl font-black text-white">{count}</p>
                </button>
              ))}
            </div>
          </section>

          {message ? <p className="mt-4 text-xs font-black uppercase text-yellow-200">{message}</p> : null}
          {loadingNew ? <p className="mt-4 text-xs font-black uppercase text-sky-200">Loading new records from uploaded history…</p> : null}

          <section className="mt-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-white/40">Shared register</p>
                <h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase">Saved records</h2>
              </div>

              <div className="flex gap-3"><button onClick={() => setSort("recent")} className={`rounded-xl px-4 py-3 text-xs font-black uppercase ${sort === "recent" ? "bg-sky-300 text-black" : "border border-white/15"}`}>Most recent</button><button onClick={() => setSort("diamonds")} className={`rounded-xl px-4 py-3 text-xs font-black uppercase ${sort === "diamonds" ? "bg-sky-300 text-black" : "border border-white/15"}`}>Most diamonds</button></div>
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
                          Added {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "date not recorded"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-start gap-3">
                        <strong className="hidden text-right text-sm text-sky-200 sm:block">{fmt.format(r.diamonds || 0)} diamonds</strong>
                        <button
                          type="button"
                          onClick={() => openReasonEditor(r)}
                          aria-label={`${r.reason ? "Edit" : "Add"} quit reason for @${r.username}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-300/30 bg-sky-300/10 text-lg font-black text-sky-100 hover:bg-sky-300/20"
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
                          <p className="mt-1 text-sm font-bold text-sky-200">{fmt.format(r.diamonds || 0)}</p>
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
                          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-sky-300/60"
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
                <p className="rounded-xl border border-sky-300/25 bg-sky-300/[.06] p-5 text-sm font-bold text-sky-100">
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
