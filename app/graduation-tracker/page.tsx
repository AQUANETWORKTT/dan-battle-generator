"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type CreatorStat = {
  stat_date: string;
  creator_username: string;
  email: string | null;
  group_name: string | null;
  agency: string | null;
  team: string | null;
  diamonds: number | null;
  live_hours: number | null;
  matches: number | null;
  live_streams: number | null;
  followers: number | null;
  days_since_joining: number | null;
  graduation_status: string | null;
};

type GraduationStatus = "gold" | "green" | "amber" | "red";

type GraduationTrackerRow = {
  username: string;
  agency: string;
  team: string;
  daysSinceJoining: number;
  diamonds: number;
  targetToDate: number;
  remainingDiamonds: number;
  remainingDays: number;
  avgNeededPerDay: number;
  progressPercent: number;
  pacePercent: number;
  status: GraduationStatus;
  statusLabel: string;
};

const MONTHS = [
  { value: "2026-01", label: "January 2026" },
  { value: "2026-02", label: "February 2026" },
  { value: "2026-03", label: "March 2026" },
  { value: "2026-04", label: "April 2026" },
  { value: "2026-05", label: "May 2026" },
  { value: "2026-06", label: "June 2026" },
  { value: "2026-07", label: "July 2026" },
  { value: "2026-08", label: "August 2026" },
  { value: "2026-09", label: "September 2026" },
  { value: "2026-10", label: "October 2026" },
  { value: "2026-11", label: "November 2026" },
  { value: "2026-12", label: "December 2026" },
];

const AGENCIES = ["All", "First Class", "Aqua", "Respawn", "Paradise", "Strive"];
const GRADUATION_TARGET = 200000;
const MINIMUM_TRACKER_DIAMONDS = 1000;
const REPORT_MINIMUM_PROGRESS = 15;

function safeNumber(value: number | null | undefined) {
  return Number(value || 0);
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function getLastDayForMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return new Date(Number(year), Number(monthNumber), 0).getDate();
}

function getMonthFromDate(dateValue: string) {
  return dateValue.slice(0, 7);
}

function getDayNumber(dateValue: string) {
  const dayText = String(dateValue || "").split("T")[0].split("-")[2];
  return Number(dayText || 0);
}

function cleanGraduationStatus(status: string | null | undefined) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");
}

function isGraduationEligibleStatus(status: string | null | undefined) {
  const cleanStatus = cleanGraduationStatus(status);

  if (!cleanStatus) return false;
  if (cleanStatus.includes("non new")) return false;
  if (cleanStatus.includes("quit")) return false;
  if (cleanStatus === "graduated") return false;
  if (cleanStatus.includes("graduated") && !cleanStatus.includes("not graduated")) {
    return false;
  }

  return (
    cleanStatus.includes("not graduated") ||
    cleanStatus.includes("non graduated") ||
    cleanStatus.includes("not reached")
  );
}

function getStatusBadgeClasses(status: GraduationStatus) {
  if (status === "gold") {
    return "border border-yellow-100/70 bg-gradient-to-r from-yellow-800 via-yellow-200 to-yellow-600 text-yellow-950 shadow-lg shadow-yellow-500/40";
  }

  if (status === "green") {
    return "bg-green-400 text-green-950";
  }

  // Slightly Behind = lighter orange
  if (status === "amber") {
    return "bg-orange-400 text-orange-950 shadow-md shadow-orange-500/20";
  }

  // Far Behind = dark orange
  return "bg-orange-700 text-orange-50 shadow-md shadow-orange-900/30";
}

function getProgressBarClasses(status: GraduationStatus) {
  if (status === "gold") {
    return "bg-gradient-to-r from-yellow-700 via-yellow-200 to-yellow-500 shadow-[0_0_12px_rgba(250,204,21,0.65)]";
  }

  if (status === "green") {
    return "bg-green-400";
  }

  // Slightly Behind = lighter orange
  if (status === "amber") {
    return "bg-orange-400";
  }

  // Far Behind = dark orange
  return "bg-orange-700";
}

export default function GraduationTrackerPage() {
  const [month, setMonth] = useState("2026-05");
  const [endDay, setEndDay] = useState(getLastDayForMonth("2026-05"));
  const [agency, setAgency] = useState("All");
  const [team, setTeam] = useState("All Teams");
  const [search, setSearch] = useState("");
  const [graduationReportAgency, setGraduationReportAgency] = useState("All");
  const [rows, setRows] = useState<CreatorStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const selectedMonth = MONTHS.find((item) => item.value === month) || MONTHS[4];
  const lastDay = getLastDayForMonth(month);
  const dayOptions = useMemo(
    () => Array.from({ length: lastDay }, (_, index) => index + 1),
    [lastDay]
  );

  useEffect(() => {
    async function selectLatestDataMonth() {
      const { data, error } = await submissionsSupabase
        .from("creator_daily_stats")
        .select("stat_date")
        .order("stat_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data?.stat_date) return;

      const latestMonth = getMonthFromDate(data.stat_date);
      const latestDay = getDayNumber(data.stat_date);

      if (MONTHS.some((item) => item.value === latestMonth)) {
        setMonth(latestMonth);
        setEndDay(latestDay || getLastDayForMonth(latestMonth));
      }
    }

    selectLatestDataMonth();
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const lastMonthDay = getLastDayForMonth(month);
      const startDate = `${month}-01`;
      const endDate = `${month}-${String(lastMonthDay).padStart(2, "0")}`;

      const allData: CreatorStat[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const to = from + pageSize - 1;

        const { data, error } = await submissionsSupabase
          .from("creator_daily_stats")
          .select("*")
          .gte("stat_date", startDate)
          .lte("stat_date", endDate)
          .order("stat_date", { ascending: true })
          .range(from, to);

        if (error) {
          console.error(error);
          setRows([]);
          setLoading(false);
          return;
        }

        const batch = (data || []) as CreatorStat[];
        allData.push(...batch);

        if (batch.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      }

      setRows(allData);
      setLoading(false);
    }

    loadData();
  }, [month]);

  const rowsUntilEndDay = useMemo(() => {
    return rows.filter((row) => {
      const dayNumber = getDayNumber(row.stat_date);
      return dayNumber >= 1 && dayNumber <= endDay;
    });
  }, [rows, endDay]);

  const teams = useMemo(() => {
    const uniqueTeams = Array.from(
      new Set(rowsUntilEndDay.map((row) => row.team || "Unassigned").filter(Boolean))
    ).sort();

    return ["All Teams", ...uniqueTeams];
  }, [rowsUntilEndDay]);

  const latestGraduationUploadDay = useMemo(() => {
    const uploadedDayNumbers = rowsUntilEndDay
      .filter(
        (row) =>
          safeNumber(row.diamonds) > 0 ||
          safeNumber(row.live_hours) > 0 ||
          safeNumber(row.matches) > 0
      )
      .map((row) => getDayNumber(row.stat_date))
      .filter((dayNumber) => dayNumber > 0);

    if (!uploadedDayNumbers.length) {
      return Math.min(endDay, lastDay);
    }

    return Math.min(Math.max(...uploadedDayNumbers), lastDay);
  }, [rowsUntilEndDay, endDay, lastDay]);

  const graduationTrackerRows = useMemo<GraduationTrackerRow[]>(() => {
    const currentTotals = new Map<string, number>();

    for (const row of rowsUntilEndDay) {
      currentTotals.set(
        row.creator_username,
        (currentTotals.get(row.creator_username) || 0) + safeNumber(row.diamonds)
      );
    }

    const eligibleMonthRows = rowsUntilEndDay
      .filter((row) => {
        const rowAgency = String(row.agency || "").trim().toLowerCase();
        const selectedAgency = String(agency || "").trim().toLowerCase();
        const rowTeam = String(row.team || "").trim().toLowerCase();
        const selectedTeam = String(team || "").trim().toLowerCase();

        const agencyMatch = agency === "All" || rowAgency === selectedAgency;
        const teamMatch = team === "All Teams" || rowTeam === selectedTeam;

        const searchText = [
          row.creator_username,
          row.email,
          row.agency,
          row.team,
          row.group_name,
        ]
          .join(" ")
          .toLowerCase();

        const searchMatch = !search.trim() || searchText.includes(search.toLowerCase());
        const totalDiamonds = currentTotals.get(row.creator_username) || 0;

        return (
          agencyMatch &&
          teamMatch &&
          searchMatch &&
          totalDiamonds >= MINIMUM_TRACKER_DIAMONDS &&
          isGraduationEligibleStatus(row.graduation_status)
        );
      })
      .sort((a, b) => a.stat_date.localeCompare(b.stat_date));

    const startingCohort = new Map<string, CreatorStat>();

    for (const row of eligibleMonthRows) {
      if (!startingCohort.has(row.creator_username)) {
        startingCohort.set(row.creator_username, row);
      }
    }

    const currentMonthDay = Math.min(latestGraduationUploadDay, lastDay);
    const targetToDate = (GRADUATION_TARGET / lastDay) * currentMonthDay;
    const remainingDays = Math.max(lastDay - currentMonthDay, 0);

    return Array.from(startingCohort.values())
      .map((creator) => {
        const diamonds = currentTotals.get(creator.creator_username) || 0;
        const remainingDiamonds = Math.max(GRADUATION_TARGET - diamonds, 0);
        const avgNeededPerDay =
          remainingDays > 0 ? remainingDiamonds / remainingDays : remainingDiamonds;
        const progressPercent = Math.min((diamonds / GRADUATION_TARGET) * 100, 100);
        const pacePercent = targetToDate > 0 ? (diamonds / targetToDate) * 100 : 0;

        let status: GraduationStatus = "red";
        let statusLabel = "Far Behind";

        if (diamonds >= GRADUATION_TARGET) {
          status = "gold";
          statusLabel = "Graduated";
        } else if (pacePercent >= 100) {
          status = "green";
          statusLabel = "On Target";
        } else if (pacePercent >= 75) {
          status = "amber";
          statusLabel = "Slightly Behind";
        }

        return {
          username: creator.creator_username,
          agency: creator.agency || "—",
          team: creator.team || "—",
          daysSinceJoining: safeNumber(creator.days_since_joining),
          diamonds,
          targetToDate,
          remainingDiamonds,
          remainingDays,
          avgNeededPerDay,
          progressPercent,
          pacePercent,
          status,
          statusLabel,
        };
      })
      .sort((a, b) => {
        if (a.status !== b.status) {
          const order: Record<GraduationStatus, number> = {
            gold: 0,
            green: 1,
            amber: 2,
            red: 3,
          };
          return order[a.status] - order[b.status];
        }

        return a.remainingDiamonds - b.remainingDiamonds;
      });
  }, [rowsUntilEndDay, agency, team, search, latestGraduationUploadDay, lastDay]);

  const graduationReportRows = useMemo(() => {
    return graduationTrackerRows
      .filter((creator) => {
        const agencyMatch =
          graduationReportAgency === "All" ||
          String(creator.agency || "").trim().toLowerCase() ===
            String(graduationReportAgency || "").trim().toLowerCase();
        const hasGraduationChance =
          creator.progressPercent >= REPORT_MINIMUM_PROGRESS || creator.status === "green";
        const stillNeedsToGraduate = creator.diamonds < GRADUATION_TARGET;

        return agencyMatch && hasGraduationChance && stillNeedsToGraduate;
      })
      .sort((a, b) => {
        if (a.status !== b.status) {
          const order: Record<GraduationStatus, number> = {
            gold: 0,
            green: 1,
            amber: 2,
            red: 3,
          };
          return order[a.status] - order[b.status];
        }

        return b.progressPercent - a.progressPercent;
      });
  }, [graduationTrackerRows, graduationReportAgency]);

  const graduationWhatsappReport = useMemo(() => {
    const header = [
      "🎓 Graduation Eligibility Report",
      `Agency: ${graduationReportAgency}`,
      `Includes: on-target creators or ${REPORT_MINIMUM_PROGRESS}%+ progress`,
      `Target: ${formatNumber(GRADUATION_TARGET)} diamonds`,
      "",
    ];

    if (!graduationReportRows.length) {
      return [
        ...header,
        `No graduation report creators found for this agency on target or at ${REPORT_MINIMUM_PROGRESS}%+ progress.`,
      ].join("\n");
    }

    const creatorLines = graduationReportRows.map((creator) => {
      return [
        `➡️ ${creator.username}`,
        `🏢 ${creator.agency} · ${creator.team}`,
        `💎 ${formatNumber(creator.diamonds)} / ${formatNumber(GRADUATION_TARGET)}`,
        `📈 Needed: ${formatNumber(creator.remainingDiamonds)}`,
        `📅 Needed/day: ${formatNumber(creator.avgNeededPerDay)}`,
      ].join("\n");
    });

    return [...header, ...creatorLines].join("\n\n");
  }, [graduationReportRows, graduationReportAgency]);

  async function copyGraduationWhatsappReport() {
    try {
      await navigator.clipboard.writeText(graduationWhatsappReport);
      window.alert("Graduation report copied.");
    } catch (error) {
      console.error(error);
      window.alert("Copy failed. You can still select and copy the text manually.");
    }
  }

  function downloadGraduationWhatsappReport() {
    const blob = new Blob([graduationWhatsappReport], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `graduation-report-${month}-${graduationReportAgency
      .replace(/\s+/g, "-")
      .toLowerCase()}-on-target-or-${REPORT_MINIMUM_PROGRESS}-percent-plus.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function checkPassword() {
    if (password === "G") {
      setAuthenticated(true);
    } else {
      alert("Incorrect password");
    }
  }

  function handleMonthChange(newMonth: string) {
    const newLastDay = getLastDayForMonth(newMonth);
    setMonth(newMonth);
    setEndDay(newLastDay);
    setAgency("All");
    setTeam("All Teams");
    setGraduationReportAgency("All");
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-green-300/20 bg-black p-8">
          <h1 className="text-3xl font-black text-green-300 mb-4">Graduation Tracker</h1>
          <p className="text-white/50 mb-6">Enter password to continue.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") checkPassword();
            }}
            className="w-full rounded-xl border border-green-300/20 bg-black px-4 py-3 text-white outline-none"
            placeholder="Password"
          />
          <button
            onClick={checkPassword}
            className="mt-4 w-full rounded-xl bg-green-300 py-3 font-black text-black"
          >
            ENTER
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white">
      <style>{`
        @keyframes graduationShimmer {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(220%);
          }
        }
      `}</style>
      <div className="mx-auto max-w-[1600px]">
        <section className="mb-8 rounded-[2rem] border border-green-400/30 bg-gradient-to-br from-black via-[#06140c] to-[#021107] p-6 shadow-2xl shadow-green-900/20">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-green-300/70">
                Graduation Intelligence
              </p>
              <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-green-300 md:text-6xl">
                Graduation Tracker
              </h1>
              <p className="mt-4 max-w-4xl text-white/60">
                Tracks creators towards 200,000 diamonds. Creators appear once they have an eligible graduation status and have reached at least 1,000 diamonds in the selected month-to-date.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
              <Link
                href="/"
                className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-center font-black uppercase text-white transition hover:scale-[1.02] hover:bg-white/10"
              >
                🏠 Home
              </Link>

              <Link
                href="/data-analysis"
                className="rounded-xl border border-green-300/30 bg-green-400/10 px-6 py-3 text-center font-black uppercase text-green-300 transition hover:scale-[1.02] hover:bg-green-400/20"
              >
                📊 Back to Analysis
              </Link>

              <Link
                href="/data-analysis/upload"
                className="rounded-xl bg-yellow-300 px-6 py-3 text-center font-black uppercase text-black transition hover:scale-[1.02] hover:bg-yellow-200"
              >
                📤 Upload Data
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-5">
          <div>
            <label className="text-xs font-black uppercase text-white/40">Month</label>
            <select
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-green-300/20 bg-black px-3 py-3 text-white"
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-white/40">End Day</label>
            <select
              value={endDay}
              onChange={(e) => setEndDay(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-green-300/20 bg-black px-3 py-3 text-white"
            >
              {dayOptions.map((day) => (
                <option key={`end-${day}`} value={day}>
                  {day} {selectedMonth.label.split(" ")[0]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-white/40">Agency</label>
            <select
              value={agency}
              onChange={(e) => {
                setAgency(e.target.value);
                setTeam("All Teams");
              }}
              className="mt-2 w-full rounded-xl border border-green-300/20 bg-black px-3 py-3 text-white"
            >
              {AGENCIES.map((agencyName) => (
                <option key={agencyName}>{agencyName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-white/40">Team</label>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="mt-2 w-full rounded-xl border border-green-300/20 bg-black px-3 py-3 text-white"
            >
              {teams.map((teamName) => (
                <option key={teamName}>{teamName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-white/40">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Creator, email, agency..."
              className="mt-2 w-full rounded-xl border border-green-300/20 bg-black px-3 py-3 text-white outline-none"
            />
          </div>
        </section>

        {loading && (
          <div className="mb-6 rounded-2xl border border-green-300/20 bg-green-300/10 px-4 py-3 text-green-100">
            Loading graduation data...
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-green-300/20 bg-black/60 p-5">
            <p className="text-xs font-black uppercase text-white/40">Tracker Creators</p>
            <p className="mt-3 text-3xl font-black text-green-300">{formatNumber(graduationTrackerRows.length)}</p>
          </div>
          <div className="rounded-3xl border border-yellow-300/20 bg-black/60 p-5">
            <p className="text-xs font-black uppercase text-white/40">Graduated</p>
            <p className="mt-3 text-3xl font-black text-yellow-300">
              {formatNumber(graduationTrackerRows.filter((creator) => creator.status === "gold").length)}
            </p>
          </div>
          <div className="rounded-3xl border border-green-300/20 bg-black/60 p-5">
            <p className="text-xs font-black uppercase text-white/40">Target Pace</p>
            <p className="mt-3 text-3xl font-black text-green-300">
              {formatNumber((GRADUATION_TARGET / lastDay) * Math.min(latestGraduationUploadDay, lastDay))}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/60 p-5">
            <p className="text-xs font-black uppercase text-white/40">Minimum Entry</p>
            <p className="mt-3 text-3xl font-black text-white">{formatNumber(MINIMUM_TRACKER_DIAMONDS)}</p>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-green-400/30 bg-green-500/10 p-6">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-green-300">Graduation Eligibility Tracker</h2>
              <p className="mt-2 text-sm text-white/50">
                Creators are added once they have an eligible graduation status and have reached 1,000+ diamonds month-to-date. Pace is judged against the latest uploaded day, not the full selected month.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/60">
              Target pace by latest upload day {latestGraduationUploadDay}: <strong className="text-green-200">{formatNumber((GRADUATION_TARGET / lastDay) * Math.min(latestGraduationUploadDay, lastDay))}</strong>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-green-400/20 bg-black/40 p-4">
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-black uppercase text-green-200">WhatsApp Graduation Report</h3>
                <p className="mt-1 text-sm text-white/45">
                  Select an agency for this report. On-target creators and creators at {REPORT_MINIMUM_PROGRESS}%+ progress are included while they are under 200k diamonds.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[220px]">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                    Report Agency
                  </span>
                  <select
                    value={graduationReportAgency}
                    onChange={(event) => setGraduationReportAgency(event.target.value)}
                    className="w-full rounded-xl border border-green-300/20 bg-black px-3 py-3 text-sm font-bold text-white outline-none"
                  >
                    {AGENCIES.map((agencyName) => (
                      <option key={`graduation-report-${agencyName}`} value={agencyName}>
                        {agencyName}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase text-white/50">
                  {graduationReportRows.length} target creators
                </div>

                <button
                  type="button"
                  onClick={copyGraduationWhatsappReport}
                  className="rounded-xl bg-green-400 px-4 py-3 text-xs font-black uppercase text-green-950 transition hover:scale-[1.02]"
                >
                  Copy WhatsApp Text
                </button>

                <button
                  type="button"
                  onClick={downloadGraduationWhatsappReport}
                  className="rounded-xl border border-green-300/40 bg-green-300/10 px-4 py-3 text-xs font-black uppercase text-green-200 transition hover:bg-green-300/20"
                >
                  Download Report
                </button>
              </div>
            </div>

            <textarea
              readOnly
              value={graduationWhatsappReport}
              className="h-72 w-full resize-y rounded-xl border border-white/10 bg-black px-4 py-3 font-mono text-sm text-white outline-none"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-black/60 text-white/40">
                <tr>
                  <th className="p-3">Creator</th>
                  <th className="p-3">Agency</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Days Joined</th>
                  <th className="p-3">Diamonds</th>
                  <th className="p-3">Progress</th>
                  <th className="p-3">Pace</th>
                  <th className="p-3">Needed</th>
                  <th className="p-3">Days Left</th>
                  <th className="p-3">Avg Needed / Day</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {graduationTrackerRows.length ? (
                  graduationTrackerRows.map((creator) => (
                    <tr key={creator.username} className="border-t border-white/10">
                      <td className="p-3 font-bold">{creator.username}</td>
                      <td className="p-3">{creator.agency}</td>
                      <td className="p-3">{creator.team}</td>
                      <td className="p-3">{formatNumber(creator.daysSinceJoining)}</td>
                      <td className="p-3 text-green-200">{formatNumber(creator.diamonds)}</td>
                      <td className="p-3">
                        <div className="h-3 w-40 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full ${getProgressBarClasses(creator.status)}`}
                            style={{ width: `${creator.progressPercent}%` }}
                          />
                        </div>
                        <span className="mt-1 block text-xs text-white/45">
                          {formatPercent(creator.progressPercent)}
                        </span>
                      </td>
                      <td className="p-3">{formatPercent(creator.pacePercent)}</td>
                      <td className="p-3">{formatNumber(creator.remainingDiamonds)}</td>
                      <td className="p-3">{formatNumber(creator.remainingDays)}</td>
                      <td className="p-3 font-bold text-yellow-200">{formatNumber(creator.avgNeededPerDay)}</td>
                      <td className="p-3">
                        <span
                          className={`relative inline-flex overflow-hidden rounded-full px-4 py-1 text-xs font-black uppercase ${getStatusBadgeClasses(creator.status)}`}
                        >
                          {creator.status === "gold" ? (
                            <span
                              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent"
                              style={{ animation: "graduationShimmer 2.2s linear infinite" }}
                            />
                          ) : null}

                          <span className="relative z-10">
                            {creator.statusLabel}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-white/10">
                    <td className="p-3 text-white/50" colSpan={11}>
                      No eligible graduation creators found for this month/filter. Check that graduation_status is imported and creators have reached at least 1,000 diamonds.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
