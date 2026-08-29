"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Job = {
  id: string;
  date: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

export default function Page() {
  const now = new Date();

  const [month, setMonth] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );

  const [jobs, setJobs] = useState<Job[]>([]);
  const [day, setDay] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const today = localDateKey();

  async function loadJobs() {
    try {
      const response = await fetch("/api/data/todo-calendar", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();

      if (Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      }
    } catch {}
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadJobs();
    }, 0);

    // Keeps shared calendar changes appearing for everyone.
    const timer = window.setInterval(() => {
      void loadJobs();
    }, 2000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, []);

  async function save(next: Job[]) {
    setJobs(next);

    const response = await fetch("/api/data/todo-calendar", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobs: next }),
    });

    if (!response.ok) {
      await loadJobs();
      return false;
    }

    const data = await response.json();

    if (Array.isArray(data.jobs)) {
      setJobs(data.jobs);
    }

    return true;
  }

  const year = month.getFullYear();
  const monthNumber = month.getMonth();

  const daysInMonth = new Date(year, monthNumber + 1, 0).getDate();
  const startDay = new Date(year, monthNumber, 1).getDay();

  const dateKey = (date: number) =>
    `${year}-${pad(monthNumber + 1)}-${pad(date)}`;

  const jobsForDay = (date: string) =>
    jobs
      .filter((job) => job.date === date)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const selectedDayJobs = useMemo(
    () => jobsForDay(day),
    [jobs, day]
  );

  const selectedJob =
    selectedDayJobs.find((job) => job.id === selectedJobId) || null;

  function openDay(date: string) {
    const list = jobsForDay(date);

    setDay(date);
    setSelectedJobId(list[0]?.id || "");
  }

  function closeDay() {
    setDay("");
    setSelectedJobId("");
    setAddOpen(false);
  }

  function openAddJob() {
    setTitle("");
    setDescription("");
    setAddOpen(true);
  }

  async function addJob() {
    const cleanTitle = title.trim();

    if (!cleanTitle || !day || saving) return;

    const job: Job = {
      id: crypto.randomUUID(),
      date: day,
      title: cleanTitle,
      description: description.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setSaving(true);

    const ok = await save([...jobs, job]);

    setSaving(false);

    if (ok) {
      setTitle("");
      setDescription("");
      setAddOpen(false);
      setSelectedJobId(job.id);
    }
  }

  async function toggleJob(job: Job) {
    await save(
      jobs.map((item) =>
        item.id === job.id
          ? {
              ...item,
              completed: !item.completed,
            }
          : item
      )
    );
  }

  async function deleteJob(job: Job) {
    const next = jobs.filter((item) => item.id !== job.id);

    const remainingDayJobs = next.filter(
      (item) => item.date === job.date
    );

    if (selectedJobId === job.id) {
      setSelectedJobId(remainingDayJobs[0]?.id || "");
    }

    await save(next);
  }

  function dayColour(date: string, dateJobs: Job[]) {
    if (dateJobs.some((job) => !job.completed)) {
      return "border-red-500/60 bg-red-500/15";
    }

    if (dateJobs.length > 0) {
      return "border-emerald-400/60 bg-emerald-500/15";
    }

    if (date <= today) {
      return "border-emerald-400/50 bg-emerald-500/10";
    }

    return "border-white/10 bg-black";
  }

  return (
    <DataAccessGuard>
      <main className="min-h-screen bg-[#080806] p-6 text-white">
        <div className="mx-auto max-w-[1500px]">
          <Link
            href="/data/menu"
            className="text-xs font-black uppercase text-pink-200"
          >
            ← Data Space
          </Link>

          <h1 className="mt-8 font-[family-name:var(--font-norwester)] text-6xl uppercase">
            To-Do List{" "}
            <span className="text-pink-300">Calendar</span>
          </h1>

          <div className="mt-8 rounded-3xl border border-pink-300/30 p-6">
            <div className="mb-5 flex items-center justify-between">
              <button
                onClick={() =>
                  setMonth(new Date(year, monthNumber - 1, 1))
                }
                className="rounded-xl px-4 py-2 font-bold hover:bg-white/10"
              >
                ← Previous
              </button>

              <b className="text-2xl">
                {month.toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </b>

              <button
                onClick={() =>
                  setMonth(new Date(year, monthNumber + 1, 1))
                }
                className="rounded-xl px-4 py-2 font-bold hover:bg-white/10"
              >
                Next →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {"Sun Mon Tue Wed Thu Fri Sat"
                .split(" ")
                .map((name) => (
                  <b
                    key={name}
                    className="pb-2 text-center text-xs uppercase text-white/60"
                  >
                    {name}
                  </b>
                ))}

              {Array.from({ length: startDay }).map((_, index) => (
                <div key={`blank-${index}`} />
              ))}

              {Array.from({ length: daysInMonth }, (_, index) => {
                const number = index + 1;
                const date = dateKey(number);
                const dateJobs = jobsForDay(date);

                return (
                  <button
                    key={date}
                    onClick={() => openDay(date)}
                    className={`min-h-44 overflow-hidden rounded-2xl border p-3 text-left transition hover:brightness-125 ${dayColour(
                      date,
                      dateJobs
                    )}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <b className="text-lg">{number}</b>

                      {date === today && (
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-black uppercase">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {dateJobs.map((job) => (
                        <div
                          key={job.id}
                          className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                            job.completed
                              ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-50"
                              : "border-red-400/60 bg-red-500/25 text-red-50"
                          }`}
                        >
                          <div
                            className={`break-words whitespace-normal ${
                              job.completed
                                ? "line-through opacity-60"
                                : ""
                            }`}
                          >
                            {job.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {day && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-6">
              <section className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11110f] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-7 py-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-pink-300">
                      To-Do List
                    </p>

                    <h2 className="mt-1 text-3xl font-black">
                      {new Date(`${day}T12:00:00`).toLocaleDateString(
                        "en-GB",
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </h2>
                  </div>

                  <button
                    onClick={closeDay}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl hover:bg-white/20"
                  >
                    ×
                  </button>
                </div>

                <div className="grid min-h-0 flex-1 md:grid-cols-[420px_1fr]">
                  {/* LEFT SIDE */}
                  <div className="flex min-h-0 flex-col border-r border-white/10">
                    <div className="flex items-center justify-between border-b border-white/10 p-5">
                      <div>
                        <b className="text-lg">Jobs</b>
                        <p className="text-xs text-white/45">
                          {selectedDayJobs.length}{" "}
                          {selectedDayJobs.length === 1
                            ? "job"
                            : "jobs"}
                        </p>
                      </div>

                      <button
                        onClick={openAddJob}
                        className="rounded-xl bg-pink-300 px-5 py-3 font-black text-black transition hover:bg-pink-200"
                      >
                        + Add Job
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                      {selectedDayJobs.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/45">
                          No jobs for this day.
                        </div>
                      )}

                      {selectedDayJobs.map((job) => (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJobId(job.id)}
                          className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                            selectedJobId === job.id
                              ? "border-pink-300 bg-pink-300/10"
                              : job.completed
                              ? "border-emerald-400/30 bg-emerald-500/10"
                              : "border-red-400/30 bg-red-500/10"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleJob(job);
                            }}
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-xl font-black ${
                              job.completed
                                ? "border-emerald-400 bg-emerald-400 text-black"
                                : "border-red-400 bg-red-500/10"
                            }`}
                          >
                            {job.completed ? "✓" : ""}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div
                              className={`break-words font-black ${
                                job.completed
                                  ? "line-through opacity-50"
                                  : ""
                              }`}
                            >
                              {job.title}
                            </div>

                            <div
                              className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                                job.completed
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}
                            >
                              {job.completed
                                ? "Completed"
                                : "Incomplete"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT SIDE */}
                  <div className="min-h-0 overflow-y-auto p-8">
                    {!selectedJob && (
                      <div className="flex h-full min-h-72 items-center justify-center text-center text-white/40">
                        <div>
                          <div className="text-5xl">✓</div>
                          <p className="mt-4 font-bold">
                            Select a job to view its details.
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedJob && (
                      <div>
                        <div className="flex items-start justify-between gap-5">
                          <div className="min-w-0">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${
                                selectedJob.completed
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}
                            >
                              {selectedJob.completed
                                ? "Completed"
                                : "Incomplete"}
                            </span>

                            <h3
                              className={`mt-5 break-words text-4xl font-black ${
                                selectedJob.completed
                                  ? "line-through opacity-50"
                                  : ""
                              }`}
                            >
                              {selectedJob.title}
                            </h3>
                          </div>

                          <button
                            onClick={() =>
                              void deleteJob(selectedJob)
                            }
                            className="shrink-0 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        </div>

                        <div className="mt-8">
                          <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-white/35">
                            Job Description
                          </p>

                          <div className="min-h-44 rounded-2xl border border-white/10 bg-black/20 p-6">
                            {selectedJob.description ? (
                              <p className="whitespace-pre-wrap break-words text-lg leading-8 text-white/80">
                                {selectedJob.description}
                              </p>
                            ) : (
                              <p className="italic text-white/30">
                                No description provided.
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => void toggleJob(selectedJob)}
                          className={`mt-7 rounded-xl px-6 py-4 font-black ${
                            selectedJob.completed
                              ? "bg-white/10 text-white"
                              : "bg-emerald-400 text-black"
                          }`}
                        >
                          {selectedJob.completed
                            ? "Mark as Incomplete"
                            : "✓ Mark as Completed"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ADD JOB MODAL */}
          {day && addOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-6">
              <section className="w-full max-w-xl rounded-3xl border border-pink-300/30 bg-[#181413] p-7 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-pink-300">
                      New Job
                    </p>
                    <h3 className="mt-1 text-3xl font-black">
                      Add Job
                    </h3>
                  </div>

                  <button
                    onClick={() => setAddOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <label className="mt-7 block">
                  <span className="mb-2 block text-xs font-black uppercase text-white/50">
                    Job Title
                  </span>

                  <input
                    autoFocus
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    maxLength={160}
                    placeholder="Enter job title..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-4 outline-none focus:border-pink-300/70"
                  />
                </label>

                <label className="mt-5 block">
                  <span className="mb-2 block text-xs font-black uppercase text-white/50">
                    Job Description
                  </span>

                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    maxLength={2000}
                    placeholder="Enter the full job description..."
                    className="min-h-48 w-full resize-y rounded-xl border border-white/10 bg-black/40 p-4 outline-none focus:border-pink-300/70"
                  />
                </label>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setAddOpen(false)}
                    className="rounded-xl bg-white/10 px-5 py-4 font-black"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => void addJob()}
                    disabled={!title.trim() || saving}
                    className="rounded-xl bg-pink-300 px-7 py-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? "Saving..." : "Save Job"}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </DataAccessGuard>
  );
}
