"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type CreatorStat = {
  stat_date: string;
  data_period?: string | null;
  creator_username: string;
  agency: string | null;
  team: string | null;
  group_name: string | null;
  manager_email?: string | null;
  diamonds: number | null;
};

type TierBracket = {
  name: string;
  min: number;
};

type CreatorMonthTotal = {
  username: string;
  agency: string;
  team: string;
  diamonds: number;
  latestDate: string;
};

type MatureMonthTotal = {
  month: string;
  creator_username: string;
  agency: string | null;
  team: string | null;
  diamonds: number | null;
};

type MatureRow = {
  username: string;
  agency: string;
  team: string;
  previousDiamonds: number;
  currentDiamonds: number;
  previousTier: TierBracket;
  nextTier: TierBracket | null;
  maintainNeeded: number;
  rankUpNeeded: number | null;
  maintainPercent: number;
  rankUpPercent: number | null;
  progressPercent: number;
  maintainDailyNeeded: number;
  rankUpDailyNeeded: number | null;
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

const MATURE_ENTRY_DIAMONDS = 200000;
const TIER_BRACKETS: TierBracket[] = [
  { name: "Tier 1", min: 1 },
  { name: "Tier 2", min: 100000 },
  { name: "Tier 3", min: 200000 },
  { name: "Tier 4", min: 300000 },
  { name: "Tier 5", min: 500000 },
  { name: "Tier 6", min: 700000 },
  { name: "Tier 7", min: 1000000 },
  { name: "Tier 8", min: 1600000 },
  { name: "Tier 9", min: 2500000 },
  { name: "Tier 10", min: 5000000 },
];

function getCurrentMonth() {
  const now = new Date();
  const value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return MONTHS.some((item) => item.value === value) ? value : "2026-07";
}

function safeNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function getLastDayForMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function getPreviousMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDayNumber(dateValue: string) {
  return Number(dateValue.split("-")[2] || 1);
}

function getTierFromDiamonds(diamonds: number) {
  return [...TIER_BRACKETS].reverse().find((tier) => diamonds >= tier.min) || TIER_BRACKETS[0];
}

function getNextTier(tier: TierBracket) {
  const index = TIER_BRACKETS.findIndex((item) => item.name === tier.name);
  return index >= 0 ? TIER_BRACKETS[index + 1] || null : null;
}

async function fetchMonthRows(month: string) {
  const res = await fetch(`/api/data-analysis/daily-stats?month=${month}&t=${Date.now()}`, {
    cache: "no-store",
  });
  const json = await res.json();

  if (!res.ok) throw new Error(json.error || "Could not load data.");
  return (json.rows || []) as CreatorStat[];
}

async function fetchMatureMonthTotals(month: string) {
  const res = await fetch(`/api/data/mature-creators/month-totals?month=${month}&t=${Date.now()}`, {
    cache: "no-store",
  });
  const json = await res.json();

  if (!res.ok) throw new Error(json.error || "Could not load mature month totals.");
  return (json.rows || []) as MatureMonthTotal[];
}

function monthlyTotalsByCreator(rows: CreatorStat[]) {
  const map = new Map<string, CreatorMonthTotal>();

  for (const row of rows) {
    const key = String(row.creator_username || "").trim().toLowerCase();
    if (!key) continue;

    const existing = map.get(key);
    const agency = String(row.agency || "First Class");
    const team = String(row.team || row.group_name || "Unassigned");

    if (!existing) {
      map.set(key, {
        username: key,
        agency,
        team,
        diamonds: safeNumber(row.diamonds),
        latestDate: row.stat_date,
      });
      continue;
    }

    existing.diamonds += safeNumber(row.diamonds);

    if (row.stat_date >= existing.latestDate) {
      existing.agency = agency;
      existing.team = team;
      existing.latestDate = row.stat_date;
    }
  }

  return map;
}

function matureTotalsByCreator(rows: MatureMonthTotal[]) {
  const map = new Map<string, CreatorMonthTotal>();

  for (const row of rows) {
    const key = String(row.creator_username || "").trim().toLowerCase();
    if (!key) continue;

    map.set(key, {
      username: key,
      agency: String(row.agency || "First Class"),
      team: String(row.team || "Unassigned"),
      diamonds: safeNumber(row.diamonds),
      latestDate: row.month,
    });
  }

  return map;
}

export default function MatureCreatorsTrackerPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [agency, setAgency] = useState("All Agencies");
  const [whatsappAgency, setWhatsappAgency] = useState("All Agencies");
  const [lastMonthFile, setLastMonthFile] = useState<File | null>(null);
  const [previousRows, setPreviousRows] = useState<CreatorStat[]>([]);
  const [previousMonthTotals, setPreviousMonthTotals] = useState<MatureMonthTotal[]>([]);
  const [currentRows, setCurrentRows] = useState<CreatorStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPreviousMonth, setUploadingPreviousMonth] = useState(false);
  const [message, setMessage] = useState("");

  const previousMonth = getPreviousMonth(month);
  const latestCurrentDate = useMemo(() => {
    const dates = currentRows.map((row) => row.stat_date).sort((a, b) => a.localeCompare(b));
    return dates[dates.length - 1] || `${month}-01`;
  }, [currentRows, month]);
  const remainingDays = Math.max(getLastDayForMonth(month) - getDayNumber(latestCurrentDate), 0);
  const hasMatureMonthUpload = previousMonthTotals.length > 0;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      try {
        const [previousData, currentData, matureTotals] = await Promise.all([
          fetchMonthRows(previousMonth),
          fetchMonthRows(month),
          fetchMatureMonthTotals(previousMonth).catch((error) => {
            console.error(error);
            return [] as MatureMonthTotal[];
          }),
        ]);

        setPreviousRows(previousData);
        setCurrentRows(currentData);
        setPreviousMonthTotals(matureTotals);
      } catch (error) {
        console.error(error);
        setPreviousRows([]);
        setPreviousMonthTotals([]);
        setCurrentRows([]);
        setMessage("Could not load mature creator data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [month, previousMonth]);

  const trackerRows = useMemo<MatureRow[]>(() => {
    const previousByCreator = previousMonthTotals.length
      ? matureTotalsByCreator(previousMonthTotals)
      : monthlyTotalsByCreator(previousRows);
    const currentByCreator = monthlyTotalsByCreator(currentRows);

    return Array.from(previousByCreator.values())
      .map((previous) => {
        const current = currentByCreator.get(previous.username);
        const previousDiamonds = previous.diamonds;
        const currentDiamonds = current?.diamonds || 0;
        const previousTier = getTierFromDiamonds(previousDiamonds);
        const nextTier = getNextTier(previousTier);
        const maintainNeeded = Math.max(previousTier.min - currentDiamonds, 0);
        const rankUpNeeded = nextTier ? Math.max(nextTier.min - currentDiamonds, 0) : null;

        return {
          username: previous.username,
          agency: current?.agency || previous.agency,
          team: current?.team || previous.team,
          previousDiamonds,
          currentDiamonds,
          previousTier,
          nextTier,
          maintainNeeded,
          rankUpNeeded,
          maintainPercent: Math.min((currentDiamonds / previousTier.min) * 100, 100),
          rankUpPercent: nextTier ? Math.min((currentDiamonds / nextTier.min) * 100, 100) : null,
          progressPercent:
            currentDiamonds >= previousTier.min && nextTier
              ? Math.min((currentDiamonds / nextTier.min) * 100, 100)
              : Math.min((currentDiamonds / previousTier.min) * 100, 100),
          maintainDailyNeeded: remainingDays > 0 ? maintainNeeded / remainingDays : maintainNeeded,
          rankUpDailyNeeded:
            nextTier && rankUpNeeded !== null
              ? remainingDays > 0
                ? rankUpNeeded / remainingDays
                : rankUpNeeded
              : null,
        };
      })
      .filter((row) => row.previousDiamonds >= MATURE_ENTRY_DIAMONDS)
      .sort((a, b) => b.progressPercent - a.progressPercent || b.currentDiamonds - a.currentDiamonds);
  }, [currentRows, previousMonthTotals, previousRows, remainingDays]);

  const agencies = useMemo(() => {
    const values = Array.from(new Set(trackerRows.map((row) => row.agency))).sort();
    return ["All Agencies", ...values];
  }, [trackerRows]);

  const filteredRows = useMemo(() => {
    return trackerRows.filter((row) => agency === "All Agencies" || row.agency === agency);
  }, [agency, trackerRows]);

  const whatsappRows = useMemo(() => {
    return trackerRows.filter((row) => whatsappAgency === "All Agencies" || row.agency === whatsappAgency);
  }, [trackerRows, whatsappAgency]);

  const maintainedCount = filteredRows.filter((row) => row.maintainNeeded === 0).length;
  const rankedUpCount = filteredRows.filter((row) => row.rankUpNeeded === 0).length;
  const maturedPercent = filteredRows.length ? (maintainedCount / filteredRows.length) * 100 : 0;

  const whatsappText = useMemo(() => {
    const header = [
      "Mature Creators Tracker",
      `Month: ${month}`,
      `Previous month total: ${previousMonth}`,
      "",
    ];

    if (!whatsappRows.length) return [...header, "No mature creators found for this agency."].join("\n");

    return [
      ...header,
      ...whatsappRows.map((creator) => {
        const rankUpLine = creator.nextTier
          ? `Rank up to ${creator.nextTier.name} target ${formatNumber(creator.nextTier.min)}: ${formatNumber(creator.rankUpNeeded || 0)} needed (${formatNumber(creator.rankUpDailyNeeded || 0)}/day)`
          : "Rank up: top tracked tier reached";

        return [
          `>> ${creator.username}`,
          `Agency: ${creator.agency}`,
          `Maintain ${creator.previousTier.name} target ${formatNumber(creator.previousTier.min)}: ${formatNumber(creator.maintainNeeded)} needed (${formatNumber(creator.maintainDailyNeeded)}/day)`,
          rankUpLine,
        ].join("\n");
      }),
    ].join("\n\n");
  }, [month, previousMonth, whatsappRows]);

  async function copyWhatsappText() {
    try {
      await navigator.clipboard.writeText(whatsappText);
      window.alert("Mature creator WhatsApp text copied.");
    } catch (error) {
      console.error(error);
      window.alert("Copy failed. You can still select and copy the text manually.");
    }
  }

  async function uploadPreviousMonthFile() {
    if (!lastMonthFile) {
      setMessage("Please choose the full previous month Excel file first.");
      return;
    }

    setUploadingPreviousMonth(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("month", previousMonth);
      formData.append("mode", "mature_month_total");
      formData.append("mature_month_file", lastMonthFile);

      const res = await fetch("/api/data-analysis/import", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok) {
        setMessage(json.error || "Could not upload previous month file.");
        return;
      }

      const [previousData, currentData] = await Promise.all([
        fetchMonthRows(previousMonth),
        fetchMonthRows(month),
      ]);
      const matureTotals = await fetchMatureMonthTotals(previousMonth);

      setPreviousRows(previousData);
      setCurrentRows(currentData);
      setPreviousMonthTotals(matureTotals);
      setLastMonthFile(null);
      setMessage(
        `Uploaded ${json.totalRows || 0} previous month rows for ${previousMonth}. Mature creator list is now using that monthly total file.`
      );
    } catch (error) {
      console.error(error);
      setMessage("Could not upload previous month file.");
    } finally {
      setUploadingPreviousMonth(false);
    }
  }

  return (
    <DataAccessGuard>
      <main className="min-h-screen bg-[#090303] px-4 py-6 text-white">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-5 flex flex-wrap gap-3">
            <Link href="/data/menu" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase hover:bg-white/10">
              Back to Data
            </Link>
            <Link href="/data-analysis" className="rounded-xl border border-red-300/30 bg-red-400/10 px-5 py-3 text-sm font-black uppercase text-red-100 hover:bg-red-400/20">
              AI Analysis
            </Link>
            <Link href="/graduation-tracker" className="rounded-xl border border-red-300/30 bg-red-400/10 px-5 py-3 text-sm font-black uppercase text-red-100 hover:bg-red-400/20">
              Graduation Tracker
            </Link>
            <Link href="/" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase hover:bg-white/10">
              Back Home
            </Link>
          </div>

          <section className="rounded-[2rem] border border-red-400/30 bg-gradient-to-br from-black via-[#210608] to-[#130202] p-6 shadow-2xl shadow-red-950/30">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-200/70">Data</p>
            <h1 className="mt-3 text-4xl font-black uppercase text-red-200 md:text-6xl">
              Mature Creators Tracker
            </h1>
            <p className="mt-3 max-w-4xl text-white/55">
              Uses the full previous month total to find creators who finished on 200,000+ diamonds, then tracks current month progress to maintain their tier or rank up.
            </p>
          </section>

          <section className="mt-6 grid gap-4 rounded-3xl border border-red-400/20 bg-red-500/[0.04] p-4 xl:grid-cols-[1fr_1fr_1.4fr]">
            <label className="text-xs font-black uppercase text-white/45">
              Month
              <select value={month} onChange={(event) => setMonth(event.target.value)} className="mt-2 w-full rounded-xl border border-red-300/25 bg-black px-3 py-3 text-white">
                {MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>

            <label className="text-xs font-black uppercase text-white/45">
              Table Agency
              <select value={agency} onChange={(event) => setAgency(event.target.value)} className="mt-2 w-full rounded-xl border border-red-300/25 bg-black px-3 py-3 text-white">
                {agencies.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <div className="rounded-2xl border border-red-300/20 bg-black/35 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-red-200/70">
                    Upload Last Month
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Full month file for {previousMonth}. This sets the mature creator list and previous totals.
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                  hasMatureMonthUpload
                    ? "bg-green-400/15 text-green-200"
                    : "bg-white/10 text-white/45"
                }`}>
                  {hasMatureMonthUpload ? "Monthly file active" : "Daily fallback"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                <label className="flex min-h-[48px] cursor-pointer items-center rounded-xl border border-dashed border-red-300/25 bg-black px-3 text-sm font-bold text-white/65 hover:border-red-200">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(event) => setLastMonthFile(event.target.files?.[0] || null)}
                  />
                  <span className="truncate">
                    {lastMonthFile ? lastMonthFile.name : "Choose full month Excel file"}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={uploadPreviousMonthFile}
                  disabled={uploadingPreviousMonth}
                  className="rounded-xl bg-red-300 px-4 py-3 text-xs font-black uppercase text-red-950 hover:bg-red-200 disabled:opacity-40"
                >
                  {uploadingPreviousMonth ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </section>

          {message ? <div className="mt-5 rounded-2xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-red-100">{message}</div> : null}

          <section className="mt-6 rounded-3xl border border-red-300/20 bg-red-500/[0.04] p-4">
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-black uppercase text-red-200">WhatsApp Preview</h2>
                <p className="mt-1 text-sm text-white/45">
                  Choose the agency for the copied message without changing the table below.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[220px]">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                    Report Agency
                  </span>
                  <select
                    value={whatsappAgency}
                    onChange={(event) => setWhatsappAgency(event.target.value)}
                    className="w-full rounded-xl border border-red-300/25 bg-black px-3 py-3 text-sm font-bold text-white outline-none"
                  >
                    {agencies.map((item) => (
                      <option key={`whatsapp-${item}`} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase text-white/50">
                  {whatsappRows.length} creators
                </div>

                <button type="button" onClick={copyWhatsappText} className="rounded-xl bg-red-300 px-4 py-3 text-sm font-black uppercase text-red-950 hover:bg-red-200">
                  Copy WhatsApp Text
                </button>
              </div>
            </div>

            <textarea readOnly value={whatsappText} className="h-[30rem] w-full resize-y rounded-xl border border-red-300/20 bg-black px-4 py-3 font-mono text-sm text-white outline-none" />
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-red-300/20 bg-black/60 p-5">
              <p className="text-xs font-black uppercase text-white/45">Mature Creators</p>
              <p className="mt-3 text-3xl font-black text-red-200">{loading ? "..." : formatNumber(filteredRows.length)}</p>
            </div>
            <div className="rounded-3xl border border-red-300/20 bg-black/60 p-5">
              <p className="text-xs font-black uppercase text-white/45">Maintained</p>
              <p className="mt-3 text-3xl font-black text-red-200">{formatNumber(maintainedCount)}</p>
            </div>
            <div className="rounded-3xl border border-red-300/20 bg-black/60 p-5">
              <p className="text-xs font-black uppercase text-white/45">Ranked Up</p>
              <p className="mt-3 text-3xl font-black text-red-200">{formatNumber(rankedUpCount)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/60 p-5">
              <p className="text-xs font-black uppercase text-white/45">Matured %</p>
              <p className="mt-3 text-3xl font-black text-white">{formatPercent(maturedPercent)}</p>
            </div>
          </section>

          <section className="mt-6 overflow-x-auto rounded-3xl border border-red-300/20 bg-black/50">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-red-500/10 text-xs uppercase text-red-100/70">
                <tr>
                  <th className="p-3">Creator</th>
                  <th className="p-3">Agency</th>
                  <th className="p-3">Previous Month Total</th>
                  <th className="p-3">Current</th>
                  <th className="p-3">Targets</th>
                  <th className="p-3">Maintain</th>
                  <th className="p-3">Rank Up</th>
                  <th className="p-3">Needed / Day</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((creator) => (
                  <tr key={creator.username} className="border-t border-white/10">
                    <td className="p-3 font-black text-white">{creator.username}</td>
                    <td className="p-3 text-white/65">{creator.agency}</td>
                    <td className="p-3"><p className="font-black text-red-200">{formatNumber(creator.previousDiamonds)}</p><p className="text-xs text-white/45">{creator.previousTier.name}</p></td>
                    <td className="p-3 font-black text-white">{formatNumber(creator.currentDiamonds)}</td>
                    <td className="p-3">
                      <p className="font-bold text-red-100">Maintain: {formatNumber(creator.previousTier.min)}</p>
                      <p className="mt-1 font-bold text-red-200">Rank up: {creator.nextTier ? formatNumber(creator.nextTier.min) : "Top tier"}</p>
                    </td>
                    <td className="p-3">
                      <div className="h-3 w-44 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-red-400" style={{ width: `${creator.maintainPercent}%` }} /></div>
                      <p className="mt-1 text-xs text-white/50">{formatPercent(creator.maintainPercent)} / {formatNumber(creator.maintainNeeded)} needed</p>
                    </td>
                    <td className="p-3">
                      {creator.nextTier ? (
                        <>
                          <div className="h-3 w-44 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-red-300" style={{ width: `${creator.rankUpPercent || 0}%` }} /></div>
                          <p className="mt-1 text-xs text-white/50">{creator.nextTier.name}: {formatPercent(creator.rankUpPercent)} / {formatNumber(creator.rankUpNeeded || 0)} needed</p>
                        </>
                      ) : (
                        <span className="rounded-full border border-red-300/30 bg-red-300/10 px-3 py-1 text-xs font-black uppercase text-red-100">Top tracked tier</span>
                      )}
                    </td>
                    <td className="p-3"><p className="font-bold text-red-100">Maintain: {formatNumber(creator.maintainDailyNeeded)}</p><p className="mt-1 font-bold text-red-200">Rank up: {creator.rankUpDailyNeeded === null ? "N/A" : formatNumber(creator.rankUpDailyNeeded)}</p></td>
                  </tr>
                ))}
                {!filteredRows.length ? (
                  <tr><td className="p-4 text-white/50" colSpan={8}>{loading ? "Loading mature creator data..." : "No mature creators found for these filters."}</td></tr>
                ) : null}
              </tbody>
            </table>
          </section>

        </div>
      </main>
    </DataAccessGuard>
  );
}
