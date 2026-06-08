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

function safeNumber(value: number | null | undefined) {
  return Number(value || 0);
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function formatHours(value: number) {
  return value.toFixed(1);
}

function isWeekend(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = date.getDay();
  return day === 0 || day === 6;
}

export default function DataAnalysisPage() {
  const [month, setMonth] = useState("2026-05");
  const [agency, setAgency] = useState("All");
  const [team, setTeam] = useState("All Teams");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CreatorStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [year, monthNumber] = month.split("-");
      const lastDay = new Date(Number(year), Number(monthNumber), 0).getDate();
      const startDate = `${month}-01`;
      const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

      const { data, error } = await submissionsSupabase
        .from("creator_daily_stats")
        .select("*")
        .gte("stat_date", startDate)
        .lte("stat_date", endDate)
        .order("stat_date", { ascending: true });

      if (error) {
        console.error(error);
        setRows([]);
      } else {
        setRows((data || []) as CreatorStat[]);
      }

      setLoading(false);
    }

    loadData();
  }, [month]);

  const teams = useMemo(() => {
    const uniqueTeams = Array.from(
      new Set(rows.map((row) => row.team || "Unassigned").filter(Boolean))
    ).sort();

    return ["All Teams", ...uniqueTeams];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
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
  }, [rows, agency, team, search]);

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
        existing.followers = Math.max(safeNumber(existing.followers), safeNumber(row.followers));
        existing.days_since_joining = Math.max(safeNumber(existing.days_since_joining), safeNumber(row.days_since_joining));
        existing.days_live += safeNumber(row.live_hours) > 0 ? 1 : 0;
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => safeNumber(b.diamonds) - safeNumber(a.diamonds)
    );
  }, [filteredRows]);

  const totals = useMemo(() => {
    const totalDiamonds = filteredRows.reduce((sum, row) => sum + safeNumber(row.diamonds), 0);
    const totalHours = filteredRows.reduce((sum, row) => sum + safeNumber(row.live_hours), 0);
    const totalMatches = filteredRows.reduce((sum, row) => sum + safeNumber(row.matches), 0);
    const activeCreators = new Set(
      filteredRows
        .filter((row) => safeNumber(row.live_hours) > 0 || safeNumber(row.diamonds) > 0)
        .map((row) => row.creator_username)
    ).size;

    const weekendRows = filteredRows.filter((row) => isWeekend(row.stat_date));
    const weekdayRows = filteredRows.filter((row) => !isWeekend(row.stat_date));
    const weekendDiamonds = weekendRows.reduce((sum, row) => sum + safeNumber(row.diamonds), 0);
    const weekdayDiamonds = weekdayRows.reduce((sum, row) => sum + safeNumber(row.diamonds), 0);
    const weekendDrop = weekdayDiamonds > 0 ? ((weekdayDiamonds - weekendDiamonds) / weekdayDiamonds) * 100 : 0;

    return {
      totalDiamonds,
      totalHours,
      totalMatches,
      activeCreators,
      weekendDiamonds,
      weekdayDiamonds,
      weekendDrop,
      diamondsPerHour: totalHours > 0 ? totalDiamonds / totalHours : 0,
    };
  }, [filteredRows]);

  const agencyCards = useMemo(() => {
    return ["First Class", "Aqua", "Respawn", "Paradise", "Strive"].map((agencyName) => {
      const agencyRows = rows.filter((row) => row.agency === agencyName);
      const diamonds = agencyRows.reduce((sum, row) => sum + safeNumber(row.diamonds), 0);
      const hours = agencyRows.reduce((sum, row) => sum + safeNumber(row.live_hours), 0);
      const matches = agencyRows.reduce((sum, row) => sum + safeNumber(row.matches), 0);
      const active = new Set(
        agencyRows
          .filter((row) => safeNumber(row.live_hours) > 0 || safeNumber(row.diamonds) > 0)
          .map((row) => row.creator_username)
      ).size;
      const weekendDiamonds = agencyRows
        .filter((row) => isWeekend(row.stat_date))
        .reduce((sum, row) => sum + safeNumber(row.diamonds), 0);
      const weekdayDiamonds = agencyRows
        .filter((row) => !isWeekend(row.stat_date))
        .reduce((sum, row) => sum + safeNumber(row.diamonds), 0);
      const drop = weekdayDiamonds > 0 ? ((weekdayDiamonds - weekendDiamonds) / weekdayDiamonds) * 100 : 0;
      return { agency: agencyName, diamonds, hours, matches, active, drop };
    });
  }, [rows]);

  const weekendProblemRows = useMemo(() => {
    const byCreator = new Map<string, { username: string; weekdayHours: number; weekendHours: number; weekdayDiamonds: number; weekendDiamonds: number }>();

    for (const row of filteredRows) {
      const existing = byCreator.get(row.creator_username) || {
        username: row.creator_username,
        weekdayHours: 0,
        weekendHours: 0,
        weekdayDiamonds: 0,
        weekendDiamonds: 0,
      };

      if (isWeekend(row.stat_date)) {
        existing.weekendHours += safeNumber(row.live_hours);
        existing.weekendDiamonds += safeNumber(row.diamonds);
      } else {
        existing.weekdayHours += safeNumber(row.live_hours);
        existing.weekdayDiamonds += safeNumber(row.diamonds);
      }

      byCreator.set(row.creator_username, existing);
    }

    return Array.from(byCreator.values())
      .filter((creator) => creator.weekdayHours > 0 && creator.weekendHours === 0)
      .sort((a, b) => b.weekdayHours - a.weekdayHours)
      .slice(0, 12);
  }, [filteredRows]);

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-yellow-300/30 bg-gradient-to-br from-black via-[#111] to-[#1b1300] p-6 shadow-2xl shadow-yellow-900/20">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300/70">First Class Intelligence</p>
              <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-yellow-300 md:text-6xl">AI Data Analysis</h1>
              <p className="mt-4 max-w-3xl text-white/60">Analyse creator performance, weekend drops, agency activity, live hours, diamonds, matches and creator trends.</p>
            </div>
            <Link href="/data-analysis/upload" className="shrink-0 rounded-xl bg-yellow-300 px-6 py-3 text-center font-black uppercase text-black transition hover:scale-[1.02] hover:bg-yellow-200">Upload Data</Link>
          </div>
        </section>

        <section className="mb-6 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-black uppercase text-white/40">Month</label>
            <select value={month} onChange={(e) => { setMonth(e.target.value); setTeam("All Teams"); }} className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white">
              {MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase text-white/40">Agency</label>
            <select value={agency} onChange={(e) => { setAgency(e.target.value); setTeam("All Teams"); }} className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white">
              {AGENCIES.map((agencyName) => <option key={agencyName}>{agencyName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase text-white/40">Team</label>
            <select value={team} onChange={(e) => setTeam(e.target.value)} className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white">
              {teams.map((teamName) => <option key={teamName}>{teamName}</option>)}
            </select>
          </div>
        </section>

        {loading && <div className="mb-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-yellow-100">Loading month data...</div>}

        <section className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            ["Total Diamonds", formatNumber(totals.totalDiamonds)],
            ["Total Hours", formatHours(totals.totalHours)],
            ["Total Matches", formatNumber(totals.totalMatches)],
            ["Active Creators", formatNumber(totals.activeCreators)],
            ["Weekend Diamonds", formatNumber(totals.weekendDiamonds)],
            ["Weekend Drop %", `${totals.weekendDrop.toFixed(1)}%`],
          ].map(([title, value]) => (
            <div key={title} className="rounded-3xl border border-yellow-300/20 bg-black/60 p-5">
              <p className="text-xs font-black uppercase text-white/40">{title}</p>
              <p className="mt-3 text-3xl font-black text-yellow-300">{value}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-3xl border border-yellow-300/30 bg-yellow-300/10 p-6">
          <h2 className="text-2xl font-black uppercase text-yellow-300">🤖 AI Insights</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-black/40 p-4">Weekend diamonds are currently <strong className="text-yellow-200">{totals.weekendDrop.toFixed(1)}%</strong> below weekday diamonds for the selected month/filter.</div>
            <div className="rounded-2xl bg-black/40 p-4">Average diamonds per live hour: <strong className="text-yellow-200">{formatNumber(totals.diamondsPerHour)}</strong>.</div>
            <div className="rounded-2xl bg-black/40 p-4">{weekendProblemRows.length} creators went live during weekdays but have no weekend live hours in this filter.</div>
            <div className="rounded-2xl bg-black/40 p-4">Uploaded rows loaded: <strong className="text-yellow-200">{filteredRows.length}</strong>.</div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-5">
          {agencyCards.map((card) => (
            <div key={card.agency} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-xl font-black uppercase text-white">{card.agency}</h3>
              <div className="mt-4 space-y-2 text-sm text-white/60">
                <p>Diamonds: {formatNumber(card.diamonds)}</p>
                <p>Hours: {formatHours(card.hours)}</p>
                <p>Matches: {formatNumber(card.matches)}</p>
                <p>Active: {formatNumber(card.active)}</p>
                <p>Weekend Drop: {card.drop.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-3xl border border-red-400/30 bg-red-500/10 p-6">
          <h2 className="text-2xl font-black uppercase text-red-300">Weekend Problem Finder</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-black/50 text-white/40">
                <tr><th className="p-3">Creator</th><th className="p-3">Weekday Hrs</th><th className="p-3">Weekend Hrs</th><th className="p-3">Weekday Diamonds</th><th className="p-3">Weekend Diamonds</th><th className="p-3">Issue</th></tr>
              </thead>
              <tbody>
                {weekendProblemRows.length ? weekendProblemRows.map((creator) => (
                  <tr key={creator.username} className="border-t border-white/10">
                    <td className="p-3 font-bold">{creator.username}</td><td className="p-3">{formatHours(creator.weekdayHours)}</td><td className="p-3">{formatHours(creator.weekendHours)}</td><td className="p-3">{formatNumber(creator.weekdayDiamonds)}</td><td className="p-3">{formatNumber(creator.weekendDiamonds)}</td><td className="p-3 text-red-300">No weekend streams</td>
                  </tr>
                )) : <tr className="border-t border-white/10"><td className="p-3 text-white/50" colSpan={6}>No weekend problems found yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-black uppercase text-yellow-300">Creator Deep Dive</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search creator, email, agency or team..." className="w-full rounded-xl border border-yellow-300/20 bg-black px-4 py-3 text-white md:w-96" />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-black/60 text-white/40">
                <tr><th className="p-3">Creator</th><th className="p-3">Email</th><th className="p-3">Agency</th><th className="p-3">Team</th><th className="p-3">Days Live</th><th className="p-3">Followers</th><th className="p-3">Diamonds</th><th className="p-3">Hours</th><th className="p-3">Matches</th><th className="p-3">DPH</th></tr>
              </thead>
              <tbody>
                {creatorTotals.length ? creatorTotals.slice(0, 200).map((creator) => {
                  const dph = safeNumber(creator.live_hours) > 0 ? safeNumber(creator.diamonds) / safeNumber(creator.live_hours) : 0;
                  return (
                    <tr key={creator.creator_username} className="border-t border-white/10">
                      <td className="p-3 font-bold">{creator.creator_username}</td><td className="p-3">{creator.email || "—"}</td><td className="p-3">{creator.agency || "—"}</td><td className="p-3">{creator.team || "—"}</td><td className="p-3">{creator.days_live}</td><td className="p-3">{formatNumber(safeNumber(creator.followers))}</td><td className="p-3">{formatNumber(safeNumber(creator.diamonds))}</td><td className="p-3">{formatHours(safeNumber(creator.live_hours))}</td><td className="p-3">{formatNumber(safeNumber(creator.matches))}</td><td className="p-3">{formatNumber(dph)}</td>
                    </tr>
                  );
                }) : <tr className="border-t border-white/10"><td className="p-3 font-bold" colSpan={10}>No creator data yet for this month/filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
