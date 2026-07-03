"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

type DailyStat = {
  stat_date: string;
  dayNumber: number;
  label: string;
  diamonds: number;
  hours: number;
  matches: number;
  activeCreators: number;
  dph: number;
  isWeekend: boolean;
  rowCount: number;
};

type AgencySummary = {
  agency: string;
  diamonds: number;
  hours: number;
  matches: number;
  active: number;
  dph: number;
  agencyDph24: number;
  avgDailyDiamonds: number;
  dailyAverage: number;
  weekendAverage: number;
  weekdayAverage: number;
  weekendDrop: number;
  uploadedDays: number;
};

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
  status: "green" | "amber" | "red";
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
const AGENCY_NAMES = ["First Class", "Aqua", "Respawn", "Paradise", "Strive"];
const GRADUATION_TARGET = 200000;

function safeNumber(value: number | null | undefined) {
  return Number(value || 0);
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function formatHours(value: number) {
  return value.toFixed(1);
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
  return Number(String(dateValue).split("-")[2]);
}

function getCreatorKey(username: string | null | undefined) {
  return String(username || "").trim().toLowerCase();
}

function isWeekend(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getDayLabel(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
  });
}

function buildDailyStats(rows: CreatorStat[]): DailyStat[] {
  const map = new Map<
    string,
    {
      diamonds: number;
      hours: number;
      matches: number;
      rowCount: number;
      activeCreators: Set<string>;
    }
  >();

  for (const row of rows) {
    const existing = map.get(row.stat_date) || {
      diamonds: 0,
      hours: 0,
      matches: 0,
      rowCount: 0,
      activeCreators: new Set<string>(),
    };

    existing.diamonds += safeNumber(row.diamonds);
    existing.hours += safeNumber(row.live_hours);
    existing.matches += safeNumber(row.matches);
    existing.rowCount += 1;

    if (safeNumber(row.live_hours) > 0 || safeNumber(row.diamonds) > 0) {
      existing.activeCreators.add(row.creator_username);
    }

    map.set(row.stat_date, existing);
  }

  return Array.from(map.entries())
    .map(([statDate, value]) => ({
      stat_date: statDate,
      dayNumber: getDayNumber(statDate),
      label: getDayLabel(statDate),
      diamonds: value.diamonds,
      hours: value.hours,
      matches: value.matches,
      activeCreators: value.activeCreators.size,
      dph: value.hours > 0 ? value.diamonds / value.hours : 0,
      isWeekend: isWeekend(statDate),
      rowCount: value.rowCount,
    }))
    .sort((a, b) => a.stat_date.localeCompare(b.stat_date));
}

function getFairWeekendDrop(dailyStats: DailyStat[]) {
  const uploadedDays = dailyStats.filter((day) => day.diamonds > 0 || day.hours > 0);
  const weekdayDays = uploadedDays.filter((day) => !day.isWeekend);
  const weekendDays = uploadedDays.filter((day) => day.isWeekend);

  const totalDiamonds = uploadedDays.reduce((sum, day) => sum + day.diamonds, 0);
  const weekdayDiamonds = weekdayDays.reduce((sum, day) => sum + day.diamonds, 0);
  const weekendDiamonds = weekendDays.reduce((sum, day) => sum + day.diamonds, 0);

  const dailyAverage = uploadedDays.length > 0 ? totalDiamonds / uploadedDays.length : 0;
  const weekdayAverage = weekdayDays.length > 0 ? weekdayDiamonds / weekdayDays.length : 0;
  const weekendAverage = weekendDays.length > 0 ? weekendDiamonds / weekendDays.length : 0;

  const weekendDrop =
    weekdayAverage > 0 ? ((weekdayAverage - weekendAverage) / weekdayAverage) * 100 : 0;

  return {
    dailyAverage,
    weekdayAverage,
    weekendAverage,
    weekendDrop,
    uploadedDays: uploadedDays.length,
    weekdayDays: weekdayDays.length,
    weekendDays: weekendDays.length,
  };
}

function isGraduationEligibleStatus(status: string | null | undefined) {
  const cleanStatus = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");

  if (!cleanStatus) return false;

  return (
    cleanStatus.includes("not graduated") ||
    cleanStatus.includes("not reached") ||
    cleanStatus.includes("not yet")
  );
}

function MiniBarChart({
  title,
  subtitle,
  data,
  valueKey,
  valueFormatter,
}: {
  title: string;
  subtitle: string;
  data: DailyStat[];
  valueKey: keyof Pick<DailyStat, "diamonds" | "hours" | "dph">;
  valueFormatter: (value: number) => string;
}) {
  const maxValue = Math.max(...data.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <div className="rounded-3xl border border-yellow-300/20 bg-black/60 p-5">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-black uppercase text-yellow-300">{title}</h3>
          <p className="mt-1 text-sm text-white/45">{subtitle}</p>
        </div>
      </div>

      {data.length ? (
        <div className="flex h-96 items-end gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {data.map((item) => {
            const value = Number(item[valueKey]) || 0;
            const height = Math.max(5, (value / maxValue) * 100);

            return (
              <div key={`${title}-${item.stat_date}`} className="group flex min-w-[42px] flex-1 flex-col items-center justify-end gap-2">
                <div className="hidden rounded-lg bg-black px-2 py-1 text-center text-[10px] font-bold text-white group-hover:block">
                  {item.label}<br />{valueFormatter(value)}
                </div>
                <div className="flex h-72 w-full items-end">
                  <div
                    className={`w-full rounded-t-xl ${
                      item.isWeekend ? "bg-red-300/70" : "bg-yellow-300/80"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className={`text-[10px] font-bold ${item.isWeekend ? "text-red-200" : "text-white/45"}`}>
                  {item.dayNumber}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/45">
          No chart data for this filter.
        </div>
      )}
    </div>
  );
}

export default function DataAnalysisPage() {
  const [month, setMonth] = useState("2026-06");
  const monthManuallySelectedRef = useRef(false);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(getLastDayForMonth("2026-06"));
  const [agency, setAgency] = useState("All");
  const [team, setTeam] = useState("All Teams");
  const [search, setSearch] = useState("");
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

      if (!monthManuallySelectedRef.current && MONTHS.some((item) => item.value === latestMonth)) {
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

  const latestUploadDate = useMemo(() => {
    return rows.map((row) => row.stat_date).sort((a, b) => a.localeCompare(b)).at(-1) || "";
  }, [rows]);

  const activeCreatorKeys = useMemo(() => {
    if (!latestUploadDate) return new Set<string>();

    return new Set(
      rows
        .filter((row) => row.stat_date === latestUploadDate)
        .map((row) => getCreatorKey(row.creator_username))
        .filter(Boolean)
    );
  }, [latestUploadDate, rows]);

  const dateRangeRows = useMemo(() => {
    return rows.filter((row) => {
      const dayNumber = getDayNumber(row.stat_date);
      const isInRange = dayNumber >= startDay && dayNumber <= endDay;
      const isCurrentCreator =
        activeCreatorKeys.size === 0 || activeCreatorKeys.has(getCreatorKey(row.creator_username));
      return isInRange && isCurrentCreator;
    });
  }, [rows, startDay, endDay, activeCreatorKeys]);

  const teams = useMemo(() => {
    const uniqueTeams = Array.from(
      new Set(dateRangeRows.map((row) => row.team || "Unassigned").filter(Boolean))
    ).sort();

    return ["All Teams", ...uniqueTeams];
  }, [dateRangeRows]);

  const baseRowsForAgencyCards = useMemo(() => {
    return dateRangeRows.filter((row) => {
      const teamMatch = team === "All Teams" || row.team === team;

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
      return teamMatch && searchMatch;
    });
  }, [dateRangeRows, team, search]);

  const filteredRows = useMemo(() => {
    return dateRangeRows.filter((row) => {
      const agencyMatch = agency === "All" || row.agency === agency;
      const teamMatch = team === "All Teams" || row.team === team;

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
      return agencyMatch && teamMatch && searchMatch;
    });
  }, [dateRangeRows, agency, team, search]);

  const dailyStats = useMemo(() => buildDailyStats(filteredRows), [filteredRows]);
  const fairWeekend = useMemo(() => getFairWeekendDrop(dailyStats), [dailyStats]);

  const creatorTotals = useMemo(() => {
    const map = new Map<string, CreatorStat & { days_live: number }>();

    for (const row of filteredRows) {
      const username = row.creator_username;
      const existing = map.get(username);

      if (!existing) {
        map.set(username, {
          ...row,
          diamonds: safeNumber(row.diamonds),
          live_hours: safeNumber(row.live_hours),
          matches: safeNumber(row.matches),
          live_streams: safeNumber(row.live_streams),
          followers: safeNumber(row.followers),
          days_live: safeNumber(row.live_hours) > 0 ? 1 : 0,
        });
      } else {
        existing.diamonds = safeNumber(existing.diamonds) + safeNumber(row.diamonds);
        existing.live_hours = safeNumber(existing.live_hours) + safeNumber(row.live_hours);
        existing.matches = safeNumber(existing.matches) + safeNumber(row.matches);
        existing.live_streams = safeNumber(existing.live_streams) + safeNumber(row.live_streams);
        existing.followers = Math.max(
          safeNumber(existing.followers),
          safeNumber(row.followers)
        );
        existing.days_since_joining = Math.max(
          safeNumber(existing.days_since_joining),
          safeNumber(row.days_since_joining)
        );
        existing.days_live += safeNumber(row.live_hours) > 0 ? 1 : 0;
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => safeNumber(b.diamonds) - safeNumber(a.diamonds)
    );
  }, [filteredRows]);

  const totals = useMemo(() => {
    const totalDiamonds = filteredRows.reduce(
      (sum, row) => sum + safeNumber(row.diamonds),
      0
    );
    const totalHours = filteredRows.reduce(
      (sum, row) => sum + safeNumber(row.live_hours),
      0
    );
    const totalMatches = filteredRows.reduce(
      (sum, row) => sum + safeNumber(row.matches),
      0
    );

    const activeCreators = new Set(
      filteredRows
        .filter((row) => safeNumber(row.live_hours) > 0 || safeNumber(row.diamonds) > 0)
        .map((row) => row.creator_username)
    ).size;

    const bestDay = [...dailyStats].sort((a, b) => b.diamonds - a.diamonds)[0];
    const worstDay = [...dailyStats].filter((day) => day.diamonds > 0).sort((a, b) => a.diamonds - b.diamonds)[0];
    const bestDphDay = [...dailyStats].sort((a, b) => b.dph - a.dph)[0];

    return {
      totalDiamonds,
      totalHours,
      totalMatches,
      activeCreators,
      diamondsPerHour: totalHours > 0 ? totalDiamonds / totalHours : 0,
      avgDailyDiamonds: dailyStats.length > 0 ? totalDiamonds / dailyStats.length : 0,
      agencyDph24:
        dailyStats.length > 0 ? totalDiamonds / dailyStats.length / 24 : 0,
      bestDay,
      worstDay,
      bestDphDay,
    };
  }, [filteredRows, dailyStats]);

  const agencyCards = useMemo<AgencySummary[]>(() => {
    return AGENCY_NAMES.map((agencyName) => {
      const agencyRows = baseRowsForAgencyCards.filter((row) => row.agency === agencyName);
      const agencyDailyStats = buildDailyStats(agencyRows);
      const fairDrop = getFairWeekendDrop(agencyDailyStats);

      const diamonds = agencyRows.reduce((sum, row) => sum + safeNumber(row.diamonds), 0);
      const hours = agencyRows.reduce((sum, row) => sum + safeNumber(row.live_hours), 0);
      const matches = agencyRows.reduce((sum, row) => sum + safeNumber(row.matches), 0);

      const active = new Set(
        agencyRows
          .filter((row) => safeNumber(row.live_hours) > 0 || safeNumber(row.diamonds) > 0)
          .map((row) => row.creator_username)
      ).size;

      return {
        agency: agencyName,
        diamonds,
        hours,
        matches,
        active,
        dph: hours > 0 ? diamonds / hours : 0,
        agencyDph24:
          agencyDailyStats.length > 0 ? diamonds / agencyDailyStats.length / 24 : 0,
        avgDailyDiamonds: agencyDailyStats.length > 0 ? diamonds / agencyDailyStats.length : 0,
        dailyAverage: fairDrop.dailyAverage,
        weekendAverage: fairDrop.weekendAverage,
        weekdayAverage: fairDrop.weekdayAverage,
        weekendDrop: fairDrop.weekendDrop,
        uploadedDays: agencyDailyStats.length,
      };
    });
  }, [baseRowsForAgencyCards]);

  const agencyRankings = useMemo(() => {
    return [...agencyCards]
      .filter((agencyItem) => agencyItem.diamonds > 0 || agencyItem.hours > 0)
      .sort((a, b) => b.dph - a.dph);
  }, [agencyCards]);

  const bestWeekendRetentionAgency = useMemo(() => {
    return [...agencyCards]
      .filter((agencyItem) => agencyItem.dailyAverage > 0 && agencyItem.weekendAverage > 0)
      .sort((a, b) => a.weekendDrop - b.weekendDrop)[0];
  }, [agencyCards]);

  const worstWeekendRetentionAgency = useMemo(() => {
    return [...agencyCards]
      .filter((agencyItem) => agencyItem.dailyAverage > 0)
      .sort((a, b) => b.weekendDrop - a.weekendDrop)[0];
  }, [agencyCards]);

  const weekendProblemRows = useMemo(() => {
    const byCreator = new Map<
      string,
      {
        username: string;
        agency: string;
        team: string;
        dayStats: Map<
          string,
          {
            hours: number;
            diamonds: number;
            isWeekend: boolean;
          }
        >;
      }
    >();

    for (const row of filteredRows) {
      const existing = byCreator.get(row.creator_username) || {
        username: row.creator_username,
        agency: row.agency || "—",
        team: row.team || "—",
        dayStats: new Map<
          string,
          {
            hours: number;
            diamonds: number;
            isWeekend: boolean;
          }
        >(),
      };

      const day = existing.dayStats.get(row.stat_date) || {
        hours: 0,
        diamonds: 0,
        isWeekend: isWeekend(row.stat_date),
      };

      day.hours += safeNumber(row.live_hours);
      day.diamonds += safeNumber(row.diamonds);

      existing.dayStats.set(row.stat_date, day);
      byCreator.set(row.creator_username, existing);
    }

    return Array.from(byCreator.values())
      .map((creator) => {
        const uploadedDays = Array.from(creator.dayStats.values()).filter(
          (day) => day.hours > 0 || day.diamonds > 0
        );
        const weekdayDays = uploadedDays.filter((day) => !day.isWeekend);
        const weekendDays = uploadedDays.filter((day) => day.isWeekend);

        const weekdayHours = weekdayDays.reduce((sum, day) => sum + day.hours, 0);
        const weekendHours = weekendDays.reduce((sum, day) => sum + day.hours, 0);
        const weekdayDiamonds = weekdayDays.reduce((sum, day) => sum + day.diamonds, 0);
        const weekendDiamonds = weekendDays.reduce((sum, day) => sum + day.diamonds, 0);

        const avgDailyHours = weekdayDays.length > 0 ? weekdayHours / weekdayDays.length : 0;
        const avgWeekendHours = weekendDays.length > 0 ? weekendHours / weekendDays.length : 0;
        const avgDailyDiamonds =
          weekdayDays.length > 0 ? weekdayDiamonds / weekdayDays.length : 0;
        const avgWeekendDiamonds =
          weekendDays.length > 0 ? weekendDiamonds / weekendDays.length : 0;

        const weekendDrop =
          avgDailyDiamonds > 0
            ? ((avgDailyDiamonds - avgWeekendDiamonds) / avgDailyDiamonds) * 100
            : 0;

        let issue = "";
        if (avgDailyHours > 0 && avgWeekendHours === 0) {
          issue = "No weekend streams";
        } else if (avgDailyHours > 0 && avgWeekendHours < avgDailyHours * 0.5) {
          issue = "Weekend hours below weekday average";
        } else if (avgDailyDiamonds > 0 && weekendDrop > 50) {
          issue = "Weekend diamonds down 50%+ vs weekdays";
        }

        return {
          username: creator.username,
          agency: creator.agency,
          team: creator.team,
          avgDailyHours,
          avgWeekendHours,
          avgDailyDiamonds,
          avgWeekendDiamonds,
          issue,
        };
      })
      .filter((creator) => creator.issue)
      .sort((a, b) => b.avgDailyDiamonds - a.avgDailyDiamonds)
      .slice(0, 20);
  }, [filteredRows]);

  function checkPassword() {
    if (password === "A") {
      setAuthenticated(true);
    } else {
      alert("Incorrect password");
    }
  }

  function handleMonthChange(newMonth: string) {
    monthManuallySelectedRef.current = true;
    const newLastDay = getLastDayForMonth(newMonth);
    setMonth(newMonth);
    setStartDay(1);
    setEndDay(newLastDay);
    setTeam("All Teams");
  }

  function handleStartDayChange(value: number) {
    setStartDay(value);
    if (value > endDay) setEndDay(value);
  }

  function handleEndDayChange(value: number) {
    setEndDay(value);
    if (value < startDay) setStartDay(value);
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-yellow-300/20 bg-black p-8">
          <h1 className="text-3xl font-black text-yellow-300 mb-4">AI Data Analysis</h1>
          <p className="text-white/50 mb-6">Enter password to continue.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") checkPassword();
            }}
            className="w-full rounded-xl border border-yellow-300/20 bg-black px-4 py-3 text-white outline-none"
            placeholder="Password"
          />
          <button
            onClick={checkPassword}
            className="mt-4 w-full rounded-xl bg-yellow-300 py-3 font-black text-black"
          >
            ENTER
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white">
      <div className="mx-auto max-w-[1600px]">
        <section className="mb-8 rounded-[2rem] border border-yellow-300/30 bg-gradient-to-br from-black via-[#111] to-[#1b1300] p-6 shadow-2xl shadow-yellow-900/20">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300/70">
                First Class Intelligence
              </p>
              <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-yellow-300 md:text-6xl">
                AI Data Analysis
              </h1>
              <p className="mt-4 max-w-4xl text-white/60">
                Analyse creator performance, fair weekend drops, agency efficiency,
                daily peaks, live hours, diamonds, matches and creator trends.
              </p>
            </div>

            <Link
              href="/data-analysis/upload?from=analysis"
              className="shrink-0 rounded-xl bg-yellow-300 px-6 py-3 text-center font-black uppercase text-black transition hover:scale-[1.02] hover:bg-yellow-200"
            >
              Upload Data
            </Link>
          </div>
        </section>

        <section className="mb-6 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-5">
          <div>
            <label className="text-xs font-black uppercase text-white/40">Month</label>
            <select
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white"
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-white/40">Start Day</label>
            <select
              value={startDay}
              onChange={(e) => handleStartDayChange(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white"
            >
              {dayOptions.map((day) => (
                <option key={`start-${day}`} value={day}>
                  {day} {selectedMonth.label.split(" ")[0]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-white/40">End Day</label>
            <select
              value={endDay}
              onChange={(e) => handleEndDayChange(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white"
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
              className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white"
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
              className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white"
            >
              {teams.map((teamName) => (
                <option key={teamName}>{teamName}</option>
              ))}
            </select>
          </div>
        </section>

        {loading && (
          <div className="mb-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-yellow-100">
            Loading all month data...
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Total Diamonds", formatNumber(totals.totalDiamonds)],
            ["Total Hours", formatHours(totals.totalHours)],
            ["Agency DPH / 24h", formatNumber(totals.agencyDph24)],
            ["Active Creators", formatNumber(totals.activeCreators)],
            ["Avg Daily", formatNumber(totals.avgDailyDiamonds)],
            ["Avg Weekend", formatNumber(fairWeekend.weekendAverage)],
          ].map(([title, value]) => (
            <div key={title} className="rounded-3xl border border-yellow-300/20 bg-black/60 p-5">
              <p className="text-xs font-black uppercase text-white/40">{title}</p>
              <p className="mt-3 text-3xl font-black text-yellow-300">{value}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-3xl border border-yellow-300/30 bg-yellow-300/10 p-6">
          <h2 className="text-2xl font-black uppercase text-yellow-300">🤖 AI Insights</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl bg-black/40 p-4">
              Weekend change: <strong className="text-yellow-200">{formatPercent(fairWeekend.weekendDrop)}</strong>.
              This compares average daily diamonds across the selected range against average weekend diamonds per uploaded weekend day.
            </div>

            <div className="rounded-2xl bg-black/40 p-4">
              Agency diamonds per hour across a 24-hour day: <strong className="text-yellow-200">{formatNumber(totals.agencyDph24)}</strong>.
            </div>

            <div className="rounded-2xl bg-black/40 p-4">
              Average daily diamonds in this range: <strong className="text-yellow-200">{formatNumber(totals.avgDailyDiamonds)}</strong>.
            </div>

            <div className="rounded-2xl bg-black/40 p-4">
              Best day: <strong className="text-yellow-200">{totals.bestDay ? `${totals.bestDay.label} — ${formatNumber(totals.bestDay.diamonds)}` : "No data"}</strong>.
            </div>

            <div className="rounded-2xl bg-black/40 p-4">
              Worst active day: <strong className="text-yellow-200">{totals.worstDay ? `${totals.worstDay.label} — ${formatNumber(totals.worstDay.diamonds)}` : "No data"}</strong>.
            </div>

            <div className="rounded-2xl bg-black/40 p-4">
              Highest DPH day: <strong className="text-yellow-200">{totals.bestDphDay ? `${totals.bestDphDay.label} — ${formatNumber(totals.bestDphDay.dph)}` : "No data"}</strong>.
            </div>

            <div className="rounded-2xl bg-black/40 p-4">
              Best weekend performance: <strong className="text-yellow-200">{bestWeekendRetentionAgency ? `${bestWeekendRetentionAgency.agency} (${formatPercent(bestWeekendRetentionAgency.weekendDrop)})` : "No data"}</strong>.
            </div>

            <div className="rounded-2xl bg-black/40 p-4">
              Biggest weekend change: <strong className="text-yellow-200">{worstWeekendRetentionAgency ? `${worstWeekendRetentionAgency.agency} (${formatPercent(worstWeekendRetentionAgency.weekendDrop)})` : "No data"}</strong>.
            </div>

            <div className="rounded-2xl bg-black/40 p-4">
              Weekend issue creators found: <strong className="text-yellow-200">{weekendProblemRows.length}</strong>.
            </div>
          </div>
        </section>

        <section className="mb-6 space-y-4">
          <MiniBarChart
            title="Daily Diamonds"
            subtitle="Shows peaks and drops across the selected range. Red bars are weekend days."
            data={dailyStats}
            valueKey="diamonds"
            valueFormatter={formatNumber}
          />
          <MiniBarChart
            title="Daily Hours"
            subtitle="Shows activity volume by day."
            data={dailyStats}
            valueKey="hours"
            valueFormatter={formatHours}
          />
          <MiniBarChart
            title="Daily DPH"
            subtitle="Live DPH by day. Agency DPH / 24h is shown in the summary cards."
            data={dailyStats}
            valueKey="dph"
            valueFormatter={formatNumber}
          />
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {agencyCards.map((card) => (
            <div key={card.agency} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-xl font-black uppercase text-white">{card.agency}</h3>
              <div className="mt-4 space-y-2 text-sm text-white/60">
                <p>Diamonds: <span className="text-yellow-200">{formatNumber(card.diamonds)}</span></p>
                <p>Hours: <span className="text-yellow-200">{formatHours(card.hours)}</span></p>
                <p>Live DPH: <span className="text-yellow-200">{formatNumber(card.dph)}</span></p>
                <p>Agency DPH / 24h: <span className="text-yellow-200">{formatNumber(card.agencyDph24)}</span></p>
                <p>Avg Daily Diamonds: <span className="text-yellow-200">{formatNumber(card.avgDailyDiamonds)}</span></p>
                <p>Weekend Change: <span className="text-yellow-200">{formatPercent(card.weekendDrop)}</span></p>
                <p>Active Creators: <span className="text-yellow-200">{formatNumber(card.active)}</span></p>
              </div>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-black uppercase text-yellow-300">Agency Efficiency Ranking (Ranked on DPH)</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-black/60 text-white/40">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Agency</th>
                  <th className="p-3">Diamonds</th>
                  <th className="p-3">Hours</th>
                  <th className="p-3">Live DPH</th>
                  <th className="p-3">Agency DPH / 24h</th>
                  <th className="p-3">Avg Daily Diamonds</th>
                  <th className="p-3">Weekend Change</th>
                </tr>
              </thead>
              <tbody>
                {agencyRankings.length ? (
                  agencyRankings.map((item, index) => (
                    <tr key={item.agency} className="border-t border-white/10">
                      <td className="p-3 font-black text-yellow-300">#{index + 1}</td>
                      <td className="p-3 font-bold">{item.agency}</td>
                      <td className="p-3">{formatNumber(item.diamonds)}</td>
                      <td className="p-3">{formatHours(item.hours)}</td>
                      <td className="p-3">{formatNumber(item.dph)}</td>
                      <td className="p-3">{formatNumber(item.agencyDph24)}</td>
                      <td className="p-3">{formatNumber(item.avgDailyDiamonds)}</td>
                      <td className="p-3">{formatPercent(item.weekendDrop)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-white/10">
                    <td className="p-3 text-white/50" colSpan={8}>No agency data for this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-red-400/30 bg-red-500/10 p-6">
          <h2 className="text-2xl font-black uppercase text-red-300">Weekend Problem Finder</h2>
          <p className="mt-2 text-sm text-white/50">
            Finds creators where weekend daily averages are below weekday daily averages in the selected range.
          </p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-black/50 text-white/40">
                <tr>
                  <th className="p-3">Creator</th>
                  <th className="p-3">Agency</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Avg Weekday Hrs</th>
                  <th className="p-3">Avg Weekend Hrs</th>
                  <th className="p-3">Avg Weekday Diamonds</th>
                  <th className="p-3">Avg Weekend Diamonds</th>
                  <th className="p-3">Issue</th>
                </tr>
              </thead>
              <tbody>
                {weekendProblemRows.length ? (
                  weekendProblemRows.map((creator) => (
                    <tr key={creator.username} className="border-t border-white/10">
                      <td className="p-3 font-bold">{creator.username}</td>
                      <td className="p-3">{creator.agency}</td>
                      <td className="p-3">{creator.team}</td>
                      <td className="p-3">{formatHours(creator.avgDailyHours)}</td>
                      <td className="p-3">{formatHours(creator.avgWeekendHours)}</td>
                      <td className="p-3">{formatNumber(creator.avgDailyDiamonds)}</td>
                      <td className="p-3">{formatNumber(creator.avgWeekendDiamonds)}</td>
                      <td className="p-3 text-red-300">{creator.issue}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-white/10">
                    <td className="p-3 text-white/50" colSpan={8}>No weekend problems found for this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-black uppercase text-yellow-300">Creator Deep Dive</h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creator, email, agency or team..."
              className="w-full rounded-xl border border-yellow-300/20 bg-black px-4 py-3 text-white md:w-96"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-black/60 text-white/40">
                <tr>
                  <th className="p-3">Creator</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Agency</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Days Live</th>
                  <th className="p-3">Followers</th>
                  <th className="p-3">Diamonds</th>
                  <th className="p-3">Hours</th>
                  <th className="p-3">Matches</th>
                  <th className="p-3">DPH</th>
                </tr>
              </thead>

              <tbody>
                {creatorTotals.length ? (
                  creatorTotals.map((creator) => {
                    const dph =
                      safeNumber(creator.live_hours) > 0
                        ? safeNumber(creator.diamonds) / safeNumber(creator.live_hours)
                        : 0;

                    return (
                      <tr key={creator.creator_username} className="border-t border-white/10">
                        <td className="p-3 font-bold">{creator.creator_username}</td>
                        <td className="p-3">{creator.email || "—"}</td>
                        <td className="p-3">{creator.agency || "—"}</td>
                        <td className="p-3">{creator.team || "—"}</td>
                        <td className="p-3">{creator.days_live}</td>
                        <td className="p-3">{formatNumber(safeNumber(creator.followers))}</td>
                        <td className="p-3">{formatNumber(safeNumber(creator.diamonds))}</td>
                        <td className="p-3">{formatHours(safeNumber(creator.live_hours))}</td>
                        <td className="p-3">{formatNumber(safeNumber(creator.matches))}</td>
                        <td className="p-3">{formatNumber(dph)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="border-t border-white/10">
                    <td className="p-3 font-bold" colSpan={10}>
                      No creator data yet for this month/filter.
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
