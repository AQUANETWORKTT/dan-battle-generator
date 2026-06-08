"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DayFileMap = Record<number, File | null>;
type ExistingDayMap = Record<number, number>;

const MONTHS = [
  { value: "2026-01", label: "January 2026", days: 31 },
  { value: "2026-02", label: "February 2026", days: 28 },
  { value: "2026-03", label: "March 2026", days: 31 },
  { value: "2026-04", label: "April 2026", days: 30 },
  { value: "2026-05", label: "May 2026", days: 31 },
  { value: "2026-06", label: "June 2026", days: 30 },
  { value: "2026-07", label: "July 2026", days: 31 },
  { value: "2026-08", label: "August 2026", days: 31 },
  { value: "2026-09", label: "September 2026", days: 30 },
  { value: "2026-10", label: "October 2026", days: 31 },
  { value: "2026-11", label: "November 2026", days: 30 },
  { value: "2026-12", label: "December 2026", days: 31 },
];

export default function DataAnalysisUploadPage() {
  const [month, setMonth] = useState("2026-05");
  const [files, setFiles] = useState<DayFileMap>({});
  const [existingDays, setExistingDays] = useState<ExistingDayMap>({});
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedMonth =
    MONTHS.find((item) => item.value === month) || MONTHS[4];

  const days = useMemo(
    () => Array.from({ length: selectedMonth.days }, (_, index) => index + 1),
    [selectedMonth.days]
  );

  useEffect(() => {
    setFiles({});
    setMessage("");
    loadExistingDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function loadExistingDays() {
    setStatusLoading(true);

    try {
      const res = await fetch(
        `/api/data-analysis/upload-status?month=${month}&t=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      const json = await res.json();

      if (!res.ok) {
        setExistingDays({});
        setStatusLoading(false);
        return;
      }

      setExistingDays(json.days || {});
      setStatusLoading(false);
    } catch (error) {
      console.error(error);
      setExistingDays({});
      setStatusLoading(false);
    }
  }

  function setDayFile(day: number, file: File | null) {
    setFiles((prev) => ({
      ...prev,
      [day]: file,
    }));
  }

  async function handleImport() {
    setLoading(true);
    setMessage("");

    const uploadedCount = days.filter((day) => files[day]).length;

    if (uploadedCount === 0) {
      setLoading(false);
      setMessage("Please upload at least one Excel file.");
      return;
    }

    const formData = new FormData();
    formData.append("month", month);

    days.forEach((day) => {
      const file = files[day];
      if (file) {
        formData.append(`day_${day}`, file);
      }
    });

    const res = await fetch("/api/data-analysis/import", {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.error || "Import failed.");
      return;
    }

    setFiles({});
    await loadExistingDays();

    setMessage(
      `Imported ${json.totalRows} rows from ${json.filesImported} files. Existing data for those days was overwritten.`
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4">
          <Link
            href="/data-analysis"
            className="inline-flex rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-black uppercase text-white transition hover:bg-white/10"
          >
            ← Back to Analysis
          </Link>
        </div>

        <div className="mb-8 rounded-[2rem] border border-yellow-300/30 bg-gradient-to-br from-black via-[#111] to-[#1b1300] p-6">
          <h1 className="text-4xl font-black uppercase text-yellow-300">
            Upload Creator Stats
          </h1>

          <p className="mt-3 text-white/60">
            Select the month, add each Excel file into the correct day slot, then
            import. Re-uploading a day overwrites that day.
          </p>
        </div>

        <div className="mb-6 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-black uppercase text-white/50">
              Month
            </label>

            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-4 py-3 text-white"
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm font-black uppercase text-white/50">
              Files selected now
            </p>
            <p className="mt-2 text-3xl font-black text-yellow-300">
              {days.filter((day) => files[day]).length}/{selectedMonth.days}
            </p>
          </div>

          <div>
            <p className="text-sm font-black uppercase text-white/50">
              Days already uploaded
            </p>
            <p className="mt-2 text-3xl font-black text-green-300">
              {statusLoading
                ? "..."
                : `${Object.keys(existingDays).length}/${selectedMonth.days}`}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-end gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <button
            onClick={loadExistingDays}
            disabled={statusLoading || loading}
            className="rounded-xl border border-green-300/30 bg-green-400/10 px-5 py-3 font-black uppercase text-green-300 disabled:opacity-40"
          >
            {statusLoading ? "Refreshing..." : "Refresh Uploaded Days"}
          </button>

          <button
            onClick={handleImport}
            disabled={loading}
            className="rounded-xl bg-yellow-300 px-6 py-3 font-black uppercase text-black disabled:opacity-40"
          >
            {loading ? "Importing..." : "Import Selected Files"}
          </button>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-white/80">
            {message}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {days.map((day) => {
            const file = files[day];
            const existingRowCount = Number(existingDays[day] || 0);
            const hasExistingUpload = existingRowCount > 0;

            return (
              <div
                key={day}
                className={`rounded-3xl border p-4 ${
                  hasExistingUpload && !file
                    ? "border-green-300/40 bg-green-400/10"
                    : "border-yellow-300/20 bg-black/60"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) setDayFile(day, droppedFile);
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xl font-black uppercase text-yellow-300">
                    {day} {selectedMonth.label.split(" ")[0]}
                  </h2>

                  {file ? (
                    <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-black uppercase text-yellow-300">
                      Replace
                    </span>
                  ) : hasExistingUpload ? (
                    <span className="rounded-full bg-green-400/20 px-3 py-1 text-xs font-black uppercase text-green-300">
                      Uploaded
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-white/40">
                      Empty
                    </span>
                  )}
                </div>

                {hasExistingUpload && !file ? (
                  <p className="mb-3 rounded-xl bg-green-400/10 px-3 py-2 text-xs font-bold text-green-200">
                    ✅ Existing upload found: {existingRowCount} rows saved.
                    Upload a new file here to overwrite this day.
                  </p>
                ) : null}

                <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-yellow-300/25 bg-white/[0.03] p-4 text-center hover:border-yellow-300/60">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0] || null;
                      setDayFile(day, selectedFile);
                    }}
                  />

                  {file ? (
                    <>
                      <p className="break-all text-sm font-bold text-white">
                        {file.name}
                      </p>
                      <p className="mt-2 text-xs text-white/40">
                        Click to replace before importing
                      </p>
                    </>
                  ) : hasExistingUpload ? (
                    <>
                      <p className="text-sm font-bold text-green-200">
                        Existing file uploaded
                      </p>
                      <p className="mt-2 text-xs text-green-300/70">
                        Click to replace this day
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-white/70">
                        Drop Excel file here
                      </p>
                      <p className="mt-2 text-xs text-white/40">
                        or click to choose
                      </p>
                    </>
                  )}
                </label>

                {file && (
                  <button
                    onClick={() => setDayFile(day, null)}
                    className="mt-3 w-full rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black uppercase text-red-300"
                  >
                    Remove Selected File
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}