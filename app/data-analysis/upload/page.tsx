"use client";

import { useState } from "react";

type DayFileMap = Record<number, File | null>;

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

export default function DataAnalysisUploadPage() {
  const [files, setFiles] = useState<DayFileMap>(
    Object.fromEntries(DAYS.map((day) => [day, null]))
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function setDayFile(day: number, file: File | null) {
    setFiles((prev) => ({
      ...prev,
      [day]: file,
    }));
  }

  async function handleImport() {
    setLoading(true);
    setMessage("");

    const formData = new FormData();

    DAYS.forEach((day) => {
      const file = files[day];
      if (file) {
        formData.append(`day_${day}`, file);
      }
    });

    const uploadedCount = DAYS.filter((day) => files[day]).length;

    if (uploadedCount === 0) {
      setLoading(false);
      setMessage("Please upload at least one Excel file.");
      return;
    }

    const res = await fetch("/api/data-analysis/import", {
      method: "POST",
      body: formData,
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.error || "Import failed.");
      return;
    }

    setMessage(
      `Imported ${json.totalRows} rows from ${json.filesImported} files.`
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-[2rem] border border-yellow-300/30 bg-gradient-to-br from-black via-[#111] to-[#1b1300] p-6">
          <h1 className="text-4xl font-black uppercase text-yellow-300">
            Upload May Creator Stats
          </h1>

          <p className="mt-3 text-white/60">
            Add each Excel file into the correct May day slot, then import all
            selected files together.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div>
            <p className="text-sm font-black uppercase text-white/50">
              Files selected
            </p>
            <p className="text-3xl font-black text-yellow-300">
              {DAYS.filter((day) => files[day]).length}/31
            </p>
          </div>

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
          {DAYS.map((day) => {
            const file = files[day];

            return (
              <div
                key={day}
                className="rounded-3xl border border-yellow-300/20 bg-black/60 p-4"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedFile = e.dataTransfer.files?.[0];

                  if (droppedFile) {
                    setDayFile(day, droppedFile);
                  }
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xl font-black uppercase text-yellow-300">
                    {day} May
                  </h2>

                  {file ? (
                    <span className="rounded-full bg-green-400/20 px-3 py-1 text-xs font-black uppercase text-green-300">
                      Ready
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-white/40">
                      Empty
                    </span>
                  )}
                </div>

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
                        Click to replace
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
                    Remove File
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