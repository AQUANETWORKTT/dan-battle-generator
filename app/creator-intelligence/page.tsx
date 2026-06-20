"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type CreatorStat = {
  [key: string]: unknown;
  stat_date: string;
  data_period?: string | null;
  creator_id?: string | null;
  creator_username?: string | null;
  "Creator's username"?: string | null;
  email?: string | null;
  group_name?: string | null;
  agency?: string | null;
  team?: string | null;
  manager_email?: string | null;
  creator_network_manager?: string | null;
  "Creator Network manager"?: string | null;
  join_time?: string | null;
  days_since_joining?: number | null;
  diamonds?: number | null;
  live_duration?: string | null;
  live_hours?: number | null;
  valid_live_days?: number | null;
  valid_days?: number | null;
  new_followers?: number | null;
  followers?: number | null;
  live_streams?: number | null;
  diamonds_last_month?: number | null;
  live_hours_last_month?: number | null;
  live_duration_last_month?: number | null;
  valid_days_last_month?: number | null;
  followers_last_month?: number | null;
  new_followers_last_month?: number | null;
  live_streams_last_month?: number | null;
  diamonds_vs_last_month?: number | null;
  live_hours_vs_last_month?: number | null;
  valid_days_vs_last_month?: number | null;
  followers_vs_last_month?: number | null;
  live_streams_vs_last_month?: number | null;
  matches?: number | null;
  diamonds_from_matches?: number | null;
  diamonds_from_multiguest?: number | null;
  diamonds_from_multiguest_host?: number | null;
  diamonds_from_multiguest_guest?: number | null;
  graduation_status?: string | null;
  tier_status?: string | null;
  status?: string | null;
};

type HealthStatus = "Elite" | "Healthy" | "Needs Attention" | "Low Performance" | "Low Quality";
type GraduationTrackerStatus = "gold" | "green" | "amber" | "red";

type HealthBreakdown = {
  liveDays: number;
  liveHours: number;
  matches: number;
  dph: number;
};

type CreatorDailyPoint = {
  date: string;
  diamonds: number;
  liveHours: number;
  validDays: number;
  matches: number;
  newFollowers: number;
  dph: number;
  healthScore: number;
};

type ChartMetricKey = "diamonds" | "liveHours" | "validDays" | "matches" | "newFollowers" | "dph" | "healthScore";

type CreatorSummary = {
  key: string;
  id: string;
  username: string;
  email: string;
  group: string;
  agency: string;
  managerRaw: string;
  managerLabel: string;
  graduationStatus: string;
  tierStatus: string;
  sourceStatus: string;
  diamonds: number;
  liveHours: number;
  validDays: number;
  liveStreams: number;
  matches: number;
  newFollowers: number;
  daysSinceJoining: number;
  diamondsLastMonth: number;
  liveHoursLastMonth: number;
  validDaysLastMonth: number;
  followersLastMonth: number;
  liveStreamsLastMonth: number;
  diamondsFromMatches: number;
  diamondsFromMultiguest: number;
  diamondsFromMultiguestHost: number;
  diamondsFromMultiguestGuest: number;
  diamondsChange: number;
  liveHoursChange: number;
  validDaysChange: number;
  followersChange: number;
  liveStreamsChange: number;
  dph: number;
  dailyAverageDiamonds: number;
  isNewCreator: boolean;
  healthWindowDays: number;
  oneHourDays: number;
  twoHourDays: number;
  healthWindowHours: number;
  healthWindowMatches: number;
  healthWindowFollowers: number;
  creatorTags: string[];
  healthBreakdown: HealthBreakdown;
  healthScore: number;
  healthStatus: HealthStatus;
  monthlyHealthScore: number;
  monthlyHealthStatus: HealthStatus;
  monthlyHealthBreakdown: HealthBreakdown;
  dailyPoints: CreatorDailyPoint[];
  latestDate: string;
};

type AgencyHealthTrendPoint = {
  date: string;
  score: number;
  creators: number;
};

type GraduationTrackerRow = {
  username: string;
  manager: string;
  daysSinceJoining: number;
  diamonds: number;
  remainingDiamonds: number;
  remainingDays: number;
  avgNeededPerDay: number;
  progressPercent: number;
  pacePercent: number;
  status: GraduationTrackerStatus;
  statusLabel: string;
};

type WeeklyHealthComparison = {
  creator: CreatorSummary;
  previousScore: number | null;
  change: number | null;
};

type ManagerHealthSummary = {
  manager: string;
  creators: CreatorSummary[];
  totalCreators: number;
  matureCreators: number;
  newCreators: number;
  averageScore: number;
  elite: number;
  healthy: number;
  needsAttention: number;
  lowPerformance: number;
  lowQuality: number;
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

const GRADUATION_TARGET = 200000;
const MINIMUM_TRACKER_DIAMONDS = 1000;
const CHART_METRICS: {
  key: ChartMetricKey;
  label: string;
  color: string;
  format: (value: number) => string;
}[] = [
  { key: "diamonds", label: "Diamonds", color: "#0284c7", format: formatNumber },
  { key: "liveHours", label: "Live Hours", color: "#059669", format: formatHours },
  { key: "validDays", label: "Valid Days", color: "#7c3aed", format: formatNumber },
  { key: "matches", label: "Battles", color: "#ea580c", format: formatNumber },
  { key: "newFollowers", label: "Followers", color: "#db2777", format: formatNumber },
  { key: "dph", label: "DPH (diamonds per hour)", color: "#0f766e", format: formatNumber },
  { key: "healthScore", label: "Health Score", color: "#4f46e5", format: formatNumber },
];

const MANAGER_LABELS: Record<string, string> = {
  "james_aquaagency@outlook.com": "James",
  "alfie_aquaagency@outlook.com": "Alfie",
  "ellie_aquaagency@outlook.com": "Ellie",
  "harryj_aquaagency@outlook.com": "Harry",
  "teamkieran@example.com": "Team Kieran",
};

function safeNumber(value: unknown) {
  const cleaned = String(value || "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  const numberValue = Number(cleaned || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function cleanText(value: unknown, fallback = "") {
  return String(value || fallback).trim();
}

function getLastDayForMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return new Date(Number(year), Number(monthNumber), 0).getDate();
}

function getDayNumber(dateValue: string) {
  return Number(String(dateValue).split("-")[2] || 1);
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

function getChangePercent(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function durationToHours(value: unknown) {
  const text = cleanText(value).toLowerCase();
  if (!text) return 0;

  const hours = Number(text.match(/(\d+(?:\.\d+)?)\s*h/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+(?:\.\d+)?)\s*m/)?.[1] || 0);
  const seconds = Number(text.match(/(\d+(?:\.\d+)?)\s*s/)?.[1] || 0);

  if (hours || minutes || seconds) {
    return Number((hours + minutes / 60 + seconds / 3600).toFixed(2));
  }

  return safeNumber(value);
}

function getText(row: CreatorStat, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = cleanText(row[key]);
    if (value) return value;
  }

  return fallback;
}

function getNumber(row: CreatorStat, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && cleanText(value) !== "") {
      return safeNumber(value);
    }
  }

  return 0;
}

function getDurationHours(row: CreatorStat, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && cleanText(value) !== "") {
      return durationToHours(value);
    }
  }

  return 0;
}

function getAgencyFromGroup(groupValue: string, fallback: string) {
  const clean = groupValue.toLowerCase();

  if (clean.includes("aqua")) return "Aqua";
  if (clean.includes("respawn")) return "Respawn";
  if (clean.includes("paradise")) return "Paradise";
  if (clean.includes("strive")) return "Strive";

  return fallback || "First Class";
}

function isAquaRow(row: CreatorStat) {
  const groupValue = getText(row, ["team", "group_name", "Group"], "");
  const agencyValue = getAgencyFromGroup(groupValue, getText(row, ["agency"], ""));
  return agencyValue === "Aqua";
}

function cleanGraduationStatus(status: string) {
  return status
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");
}

function isGraduationEligibleStatus(status: string) {
  const cleanStatus = cleanGraduationStatus(status);

  if (!cleanStatus) return false;
  if (cleanStatus.includes("non new")) return false;
  if (cleanStatus.includes("quit")) return false;
  if (cleanStatus === "graduated") return false;
  if (cleanStatus.includes("graduated") && !cleanStatus.includes("not graduated")) return false;

  return (
    cleanStatus.includes("not graduated") ||
    cleanStatus.includes("non graduated") ||
    cleanStatus.includes("not reached")
  );
}

function graduationStatusClasses(status: GraduationTrackerStatus) {
  if (status === "gold") return "border-yellow-200 bg-yellow-50 text-yellow-800";
  if (status === "green") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "amber") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function graduationProgressClasses(status: GraduationTrackerStatus) {
  if (status === "gold") return "bg-yellow-500";
  if (status === "green") return "bg-emerald-500";
  if (status === "amber") return "bg-orange-500";
  return "bg-red-500";
}

function getManagerRaw(row: CreatorStat) {
  return getText(row, [
    "manager_email",
    "creator_network_manager",
    "Creator Network manager",
    "email",
  ]);
}

function titleCaseName(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getManagerLabel(value: string, groupValue = "") {
  const clean = value
    .replace(/\[|\]/g, "")
    .replace(/\(mailto:|\)/g, "")
    .trim()
    .toLowerCase();

  if (MANAGER_LABELS[clean] || MANAGER_LABELS[value.toLowerCase()]) {
    return `Team ${MANAGER_LABELS[clean] || MANAGER_LABELS[value.toLowerCase()]}`;
  }

  if (clean.includes("@")) {
    const localPart = clean.split("@")[0];
    const namePart = localPart
      .replace(/_?(aqua|respawn|paradise|strive)?agency$/i, "")
      .replace(/respawn\d*$/i, "")
      .replace(/jb$/i, "");
    return `Team ${titleCaseName(namePart)}`;
  }

  if (clean) return `Team ${titleCaseName(clean)}`;
  if (groupValue.toLowerCase().startsWith("team ")) return groupValue;
  return "Unassigned";
}

function getPlainManagerName(managerLabel: string) {
  return managerLabel.replace(/^Team\s+/i, "");
}

function getCreatorMetaLine(creator: Pick<CreatorSummary, "agency" | "group" | "managerLabel">) {
  const managerName = getPlainManagerName(creator.managerLabel);
  const cleanGroup = creator.group.replace(/^Unassigned\s+/i, "").trim();

  if (creator.managerLabel === "Unassigned") return `${creator.agency} / Unassigned`;
  if (cleanGroup && cleanGroup.toLowerCase() !== managerName.toLowerCase()) {
    return `${creator.agency} / ${managerName}`;
  }

  return `${creator.agency} / ${managerName}`;
}

function getUsername(row: CreatorStat) {
  return getText(row, ["creator_username", "Creator's username", "creator_id", "Creator ID"], "Unknown");
}

function capScore(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function getHealthBreakdown(
  creatorRows: CreatorStat[],
  windowDates: string[],
  period: "weekly" | "monthly" = "weekly"
) {
  const rowsByDate = new Map(creatorRows.map((row) => [row.stat_date, row]));
  const currentDates = period === "monthly" ? windowDates : windowDates.slice(-7);
  const windowDays = Math.max(currentDates.length, 1);
  let liveDays = 0;
  let totalHours = 0;
  let totalMatches = 0;
  let totalFollowers = 0;
  let totalDiamonds = 0;

  for (const date of currentDates) {
    const row = rowsByDate.get(date);
    const hours = row ? getDurationHours(row, ["live_hours", "LIVE duration"]) : 0;
    const matches = row ? getNumber(row, ["matches", "Matches"]) : 0;
    const followers = row ? getNumber(row, ["new_followers", "New followers", "followers"]) : 0;
    const diamonds = row ? getNumber(row, ["diamonds", "Diamonds"]) : 0;

    if (hours > 0) liveDays += 1;

    totalHours += hours;
    totalMatches += matches;
    totalFollowers += followers;
    totalDiamonds += diamonds;

  }

  const dph = totalHours > 0 ? totalDiamonds / totalHours : 0;

  const liveDaysScore =
    period === "monthly" ? capScore((liveDays / 28) * 35, 35) : capScore(liveDays * 5, 35);
  const liveHoursScore =
    period === "monthly"
      ? totalHours >= 80
        ? 30
        : totalHours >= 60
          ? 22
          : totalHours >= 40
            ? 15
            : totalHours >= 20
              ? 8
              : 0
      : totalHours >= 20
        ? 30
        : totalHours >= 15
          ? 22
          : totalHours >= 10
            ? 15
            : totalHours >= 5
              ? 8
              : 0;
  const matchesScore = capScore(Math.floor(totalMatches / (period === "monthly" ? 28 : 7)), 10);
  const dphScore =
    dph >= 2500 ? 25 : dph >= 2000 ? 20 : dph >= 1500 ? 15 : dph >= 1000 ? 10 : dph >= 500 ? 5 : dph >= 100 ? 1 : 0;

  return {
    healthWindowDays: windowDays,
    oneHourDays: liveDays,
    twoHourDays: currentDates.filter((date) => {
      const row = rowsByDate.get(date);
      return row ? getDurationHours(row, ["live_hours", "LIVE duration"]) >= 2 : false;
    }).length,
    healthWindowHours: totalHours,
    healthWindowMatches: totalMatches,
    healthWindowFollowers: totalFollowers,
    healthBreakdown: {
      liveDays: liveDaysScore,
      liveHours: liveHoursScore,
      matches: matchesScore,
      dph: dphScore,
    },
    healthScore: Math.round(
      liveDaysScore + liveHoursScore + matchesScore + dphScore
    ),
  };
}

function getDailyPoint(row: CreatorStat): CreatorDailyPoint {
  const liveHours = getDurationHours(row, ["live_hours", "LIVE duration"]);
  const diamonds = getNumber(row, ["diamonds", "Diamonds"]);
  const matches = getNumber(row, ["matches", "Matches"]);
  const newFollowers = getNumber(row, ["new_followers", "New followers", "followers"]);

  return {
    date: row.stat_date,
    diamonds,
    liveHours,
    validDays:
      getNumber(row, ["valid_live_days", "valid_days", "Valid go LIVE days"]) ||
      (liveHours > 0 ? 1 : 0),
    matches,
    newFollowers,
    dph: liveHours > 0 ? diamonds / liveHours : 0,
    healthScore: getHealthBreakdown([row], [row.stat_date]).healthScore,
  };
}

function getHealthStatus(score: number, diamonds = 0): HealthStatus {
  if (score >= 85) return "Elite";
  if (score >= 70) return "Healthy";
  if (score >= 50) return "Needs Attention";
  if (diamonds >= 5000) return "Low Performance";
  return "Low Quality";
}

function statusClasses(status: HealthStatus) {
  if (status === "Elite") return "border-purple-200 bg-purple-50 text-purple-700";
  if (status === "Healthy") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Needs Attention") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "Low Performance") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function getCreatorTags(creator: {
  healthWindowDays: number;
  oneHourDays: number;
  healthWindowHours: number;
  healthWindowMatches: number;
  dph: number;
  diamondsChange: number;
  followersChange: number;
  diamonds: number;
  tierStatus: string;
  healthScore: number;
  isNewCreator: boolean;
}) {
  const tags: string[] = [];

  if (creator.isNewCreator) tags.push("New Creator");
  if (creator.oneHourDays < creator.healthWindowDays) tags.push("Missed Live Days");
  if (creator.healthWindowHours < 10) tags.push("Low Hours");
  if (creator.healthWindowMatches < 28) tags.push("Low Battles");
  if (creator.dph < 1000) tags.push("Low DPH (diamonds per hour)");
  if (creator.diamondsChange < -10) tags.push("Declining Diamonds");
  if (creator.followersChange < -10) tags.push("Declining Followers");
  if (creator.healthScore >= 85 || (creator.diamondsChange >= 20 && creator.followersChange >= 20)) {
    tags.push("Rising Star");
  }
  if (/maintained|ranked up|tier/i.test(creator.tierStatus)) tags.push("Tier Performer");
  if (creator.healthScore < 40) tags.push("Needs Intervention");

  return tags;
}

function buildCreatorSummaries(rows: CreatorStat[]) {
  const byCreator = new Map<string, CreatorStat[]>();
  const windowDates = Array.from(new Set(rows.map((row) => row.stat_date)))
    .sort((a, b) => a.localeCompare(b))
    .slice(-7);

  for (const row of rows) {
    const username = getUsername(row).toLowerCase();
    if (!byCreator.has(username)) byCreator.set(username, []);
    byCreator.get(username)?.push(row);
  }

  return Array.from(byCreator.entries())
    .map(([key, creatorRows]) => {
      const sortedRows = [...creatorRows].sort((a, b) => a.stat_date.localeCompare(b.stat_date));
      const latest = sortedRows[sortedRows.length - 1] || creatorRows[0];
      const groupValue = getText(latest, ["team", "group_name", "Group"], "Unassigned");
      const agencyValue = getAgencyFromGroup(groupValue, getText(latest, ["agency"], "First Class"));
      const validDaysFromRows = creatorRows.filter((row) => getDurationHours(row, ["live_hours", "LIVE duration"]) > 0).length;
      const managerRaw = getManagerRaw(latest);
      const diamonds = creatorRows.reduce((sum, row) => sum + getNumber(row, ["diamonds", "Diamonds"]), 0);
      const liveHours = creatorRows.reduce(
        (sum, row) => sum + getDurationHours(row, ["live_hours", "LIVE duration"]),
        0
      );
      const validDays =
        creatorRows.reduce(
          (sum, row) => sum + getNumber(row, ["valid_live_days", "valid_days", "Valid go LIVE days"]),
          0
        ) || validDaysFromRows;
      const liveStreams = creatorRows.reduce((sum, row) => sum + getNumber(row, ["live_streams", "LIVE streams"]), 0);
      const newFollowers =
        creatorRows.reduce((sum, row) => sum + getNumber(row, ["new_followers", "New followers"]), 0) ||
        Math.max(...creatorRows.map((row) => getNumber(row, ["followers"])), 0);
      const diamondsLastMonth = getNumber(latest, ["diamonds_last_month", "Diamonds last month"]);
      const liveHoursLastMonth =
        getDurationHours(latest, ["live_hours_last_month", "live_duration_last_month", "LIVE duration (hours) last month"]) ||
        getNumber(latest, ["LIVE duration last month"]);
      const validDaysLastMonth = getNumber(latest, ["valid_days_last_month", "Valid go LIVE days last month"]);
      const followersLastMonth = getNumber(latest, [
        "new_followers_last_month",
        "followers_last_month",
        "New followers last month",
      ]);
      const liveStreamsLastMonth = getNumber(latest, ["live_streams_last_month", "LIVE streams last month"]);
      const diamondsChange =
        getNumber(latest, ["diamonds_vs_last_month", "Diamonds - vs. last month"]) ||
        getChangePercent(diamonds, diamondsLastMonth);
      const liveHoursChange =
        getNumber(latest, ["live_hours_vs_last_month", "LIVE duration - vs. last month"]) ||
        getChangePercent(liveHours, liveHoursLastMonth);
      const validDaysChange =
        getNumber(latest, ["valid_days_vs_last_month", "Valid go LIVE days - vs. last month"]) ||
        getChangePercent(validDays, validDaysLastMonth);
      const followersChange =
        getNumber(latest, ["followers_vs_last_month", "New followers - vs. last month"]) ||
        getChangePercent(newFollowers, followersLastMonth);
      const liveStreamsChange =
        getNumber(latest, ["live_streams_vs_last_month", "LIVE streams - vs. last month"]) ||
        getChangePercent(liveStreams, liveStreamsLastMonth);
      const health = getHealthBreakdown(creatorRows, windowDates);
      const daysSinceJoining = Math.max(
        ...creatorRows.map((row) => getNumber(row, ["days_since_joining", "Days since joining"])),
        0
      );
      const activeDataDays = Math.max(
        creatorRows.filter(
          (row) =>
            getDurationHours(row, ["live_hours", "LIVE duration"]) > 0 ||
            getNumber(row, ["diamonds", "Diamonds"]) > 0
        ).length,
        1
      );
      const monthlyHealth = getHealthBreakdown(
        creatorRows,
        Array.from(new Set(creatorRows.map((row) => row.stat_date))).sort((a, b) =>
          a.localeCompare(b)
        ),
        "monthly"
      );
      const dailyPoints = sortedRows.map(getDailyPoint);
      const base = {
        key,
        id: getText(latest, ["creator_id", "Creator ID"], key),
        username: getUsername(latest),
        email: getText(latest, ["creator_email", "Creator email"], "No email"),
        group: groupValue,
        agency: agencyValue,
        managerRaw,
        managerLabel: getManagerLabel(managerRaw, groupValue),
        graduationStatus: getText(latest, ["graduation_status", "Graduation status"], "Unknown"),
        tierStatus: getText(latest, ["tier_status", "Tier status"], "Unknown"),
        sourceStatus: getText(latest, ["status", "Status"], ""),
        diamonds,
        liveHours,
        validDays,
        liveStreams,
        matches: creatorRows.reduce((sum, row) => sum + getNumber(row, ["matches", "Matches"]), 0),
        newFollowers,
        daysSinceJoining,
        diamondsLastMonth,
        liveHoursLastMonth,
        validDaysLastMonth,
        followersLastMonth,
        liveStreamsLastMonth,
        diamondsFromMatches: creatorRows.reduce(
          (sum, row) => sum + getNumber(row, ["diamonds_from_matches", "Diamonds from matches"]),
          0
        ),
        diamondsFromMultiguest: creatorRows.reduce(
          (sum, row) => sum + getNumber(row, ["diamonds_from_multiguest", "Diamonds from multi-guest"]),
          0
        ),
        diamondsFromMultiguestHost: creatorRows.reduce(
          (sum, row) =>
            sum + getNumber(row, ["diamonds_from_multiguest_host", "Diamonds from multi-guest (as host)"]),
          0
        ),
        diamondsFromMultiguestGuest: creatorRows.reduce(
          (sum, row) =>
            sum + getNumber(row, ["diamonds_from_multiguest_guest", "Diamonds from multi-guest (as guest)"]),
          0
        ),
        diamondsChange,
        liveHoursChange,
        validDaysChange,
        followersChange,
        liveStreamsChange,
        dph: 0,
        dailyAverageDiamonds: diamonds / activeDataDays,
        isNewCreator: daysSinceJoining > 0 && daysSinceJoining <= 14,
        healthWindowDays: health.healthWindowDays,
        oneHourDays: health.oneHourDays,
        twoHourDays: health.twoHourDays,
        healthWindowHours: health.healthWindowHours,
        healthWindowMatches: health.healthWindowMatches,
        healthWindowFollowers: health.healthWindowFollowers,
        healthBreakdown: health.healthBreakdown,
        monthlyHealthScore: monthlyHealth.healthScore,
        monthlyHealthStatus: getHealthStatus(monthlyHealth.healthScore, diamonds),
        monthlyHealthBreakdown: monthlyHealth.healthBreakdown,
        dailyPoints,
        latestDate: latest.stat_date,
      };

      base.dph = base.liveHours > 0 ? base.diamonds / base.liveHours : 0;
      const healthScore = health.healthScore;

      const summary = {
        ...base,
        healthScore,
        healthStatus: getHealthStatus(healthScore, base.diamonds),
      };

      return {
        ...summary,
        creatorTags: getCreatorTags(summary),
      };
    })
    .sort((a, b) => b.diamonds - a.diamonds);
}

function buildInsights(creator: CreatorSummary) {
  const insights: string[] = [];
  const diamondsChange = creator.diamondsChange;
  const hoursChange = creator.liveHoursChange;
  const followersChange = creator.followersChange;

  insights.push(`${creator.oneHourDays}/${creator.healthWindowDays} live days completed.`);
  insights.push(`${formatHours(creator.healthWindowHours)} live hours completed.`);
  insights.push(`${formatNumber(creator.healthWindowMatches)} battles completed.`);
  insights.push(`${formatNumber(creator.healthWindowFollowers)} new followers gained.`);

  if (creator.diamondsLastMonth) {
    insights.push(
      `Diamonds are ${diamondsChange >= 0 ? "up" : "down"} ${formatPercent(
        Math.abs(diamondsChange)
      )} compared with last month.`
    );
  }

  if (Math.abs(hoursChange) < 5 && diamondsChange < -15) {
    insights.push("Hours are stable but diamonds are dropping, so gifting quality may need attention.");
  } else if (creator.liveHoursLastMonth) {
    insights.push(
      `Live hours are ${hoursChange >= 0 ? "up" : "down"} ${formatPercent(
        Math.abs(hoursChange)
      )} compared with last month.`
    );
  }

  if (creator.matches <= 0) insights.push("Battles are very low, which may be limiting battle diamonds.");
  if (creator.liveHours >= 20 && creator.dph < 1000) {
    insights.push("Creator has high hours but low diamonds per hour.");
  }
  if (followersChange < 0) insights.push("Followers are down compared with last month.");
  if (!insights.length) insights.push("Creator performance is steady for the selected filters.");

  return insights;
}

function buildCreatorReportActions(creator: CreatorSummary) {
  const actions: string[] = [];

  if (creator.oneHourDays < creator.healthWindowDays) {
    actions.push("Push for a consistent daily live routine.");
  }
  if (creator.oneHourDays === creator.healthWindowDays && creator.healthWindowHours < 14) {
    actions.push("You are showing up daily. Next target: push more sessions closer to two hours.");
  } else if (creator.healthWindowHours < creator.oneHourDays) {
    actions.push("Start by making each live at least one full hour.");
  } else if (creator.healthWindowHours < 20) {
    actions.push("Build towards a stronger weekly total by extending the shorter live sessions.");
  }
  if (creator.healthWindowMatches < 70) {
    actions.push("Add more battles to increase battle rhythm and battle diamonds.");
  }
  if (creator.dph < 1000) {
    actions.push("Focus on better battle selection and stronger gifting moments.");
  }
  if (creator.healthWindowFollowers < 100) {
    actions.push("Network with new creators and battle larger rooms to reach new followers.");
  }
  if (!actions.length) {
    actions.push("Keep the same routine and set one stretch target for the next week.");
  }

  return actions;
}

function buildCreatorReportTips(creator: CreatorSummary) {
  const tips: { title: string; description: string }[] = [];

  if (creator.oneHourDays < creator.healthWindowDays) {
    tips.push({
      title: "Build a reliable live routine",
      description:
        "Try to make going LIVE part of the same daily rhythm. Even a steady one-hour session gives you a stronger base to grow from.",
    });
  }

  if (creator.oneHourDays === creator.healthWindowDays && creator.healthWindowHours < 14) {
    tips.push({
      title: "Turn daily lives into stronger sessions",
      description:
        "You are showing up consistently. The next step is pushing more sessions closer to two hours so the weekly total becomes more powerful.",
    });
  } else if (creator.healthWindowHours < creator.oneHourDays) {
    tips.push({
      title: "Make each live count",
      description:
        "Short lives make it harder to build strong weekly results. Start with a simple target of one full hour whenever you go live.",
    });
  } else if (creator.healthWindowHours < 20) {
    tips.push({
      title: "Grow your weekly live hours",
      description:
        "Set a minimum session target before you go live. Ten to fifteen hours is a solid base, but twenty hours gives you a much stronger growth week.",
    });
  }

  if (creator.healthWindowMatches < 70) {
    tips.push({
      title: "Add more quality battles",
      description:
        "Battle volume helps create more gifting moments. Aim to build towards around ten strong battles per live day with creators who keep the room active.",
    });
  }

  if (creator.dph < 1000) {
    tips.push({
      title: "Improve diamonds per hour",
      description:
        "Focus on better battle choices, stronger moments in the room, and keeping energy high during the parts of the live where supporters are most active.",
    });
  }

  if (creator.healthWindowFollowers < 100) {
    tips.push({
      title: "Reach new audiences",
      description:
        "Network with new creators and battle larger rooms with more viewers. The right rooms can help more people discover you while you are live.",
    });
  }

  if (!tips.length) {
    tips.push({
      title: "Keep the routine strong",
      description:
        "Your weekly pattern is in a good place. Keep the consistency and set one stretch goal for the next report.",
    });
  }

  return tips;
}

function buildCreatorReportWins(creator: CreatorSummary) {
  const wins: { title: string; description: string }[] = [];

  if (creator.oneHourDays >= 5) {
    wins.push({
      title: "&#9989; Strong live consistency",
      description: `${creator.oneHourDays}/${creator.healthWindowDays} tracked days included a live session, which gives the week a solid base.`,
    });
  }
  if (creator.healthWindowHours >= 20) {
    wins.push({
      title: "&#9201; Excellent weekly hours",
      description: `${formatHours(creator.healthWindowHours)} hours streamed this week. That is a strong activity level to build from.`,
    });
  } else if (creator.healthWindowHours >= 10) {
    wins.push({
      title: "&#9201; Good weekly hours",
      description: `${formatHours(creator.healthWindowHours)} hours streamed this week. Keep pushing sessions closer to two hours.`,
    });
  }
  if (creator.healthWindowMatches >= 70) {
    wins.push({
      title: "&#9876; Strong battle volume",
      description: `${formatNumber(creator.healthWindowMatches)} battles this week. Battle activity is a key part of creating more gifting moments.`,
    });
  }
  if (creator.dph >= 1500) {
    wins.push({
      title: "&#128142; Strong diamonds per hour",
      description: `${formatNumber(creator.dph)} DPH shows the live time is converting well into diamonds.`,
    });
  }
  if (creator.healthWindowFollowers >= 100) {
    wins.push({
      title: "&#128200; Strong follower growth",
      description: `${formatNumber(creator.healthWindowFollowers)} new followers this week shows discovery is moving in the right direction.`,
    });
  }

  if (!wins.length) {
    wins.push({
      title: "&#9989; Week completed",
      description: "There is useful data from this week. The next step is building stronger habits from the improvement points below.",
    });
  }

  return wins.slice(0, 4);
}

function reportToneClass(status: HealthStatus) {
  if (status === "Elite") return "elite";
  if (status === "Healthy") return "healthy";
  if (status === "Needs Attention") return "attention";
  if (status === "Low Performance") return "performance";
  return "quality";
}

function getCreatorReportScoreLabel(status: HealthStatus) {
  if (status === "Elite") return "Elite";
  if (status === "Healthy") return "High Quality";
  return "";
}

function buildScoreImprovementTips(creator: CreatorSummary) {
  const tips: string[] = [];
  const breakdown = creator.healthBreakdown;

  if (breakdown.liveDays < 35) {
    tips.push(`Live Days: ${35 - Math.round(breakdown.liveDays)} more points available by going live on every tracked day.`);
  }
  if (breakdown.liveHours < 30) {
    tips.push(`Live Hours: ${30 - Math.round(breakdown.liveHours)} more points available by reaching 20 total live hours.`);
  }
  if (breakdown.matches < 10) {
    tips.push(`Battles: ${10 - Math.round(breakdown.matches)} more points available by moving closer to 70 weekly battles.`);
  }
  if (breakdown.dph < 25) {
    tips.push(`DPH (diamonds per hour): ${25 - Math.round(breakdown.dph)} more points available by improving diamonds per hour.`);
  }

  if (!tips.length) tips.push("This creator is already close to the maximum score.");

  return tips;
}

function buildManagerActions(creator: CreatorSummary) {
  const actions: string[] = [];

  if (creator.oneHourDays < creator.healthWindowDays) {
    actions.push("Set a daily live expectation and check whether missed days have a clear reason.");
  }
  if (creator.healthWindowHours < 20) {
    actions.push("Coach the creator toward longer planned sessions rather than short reactive lives.");
  }
  if (creator.healthWindowMatches < 70) {
    actions.push("Review battle volume and help the creator find better battle opportunities.");
  }
  if (creator.dph < 1000) {
    actions.push("Review battle quality, room choice and gifting moments to improve DPH (diamonds per hour).");
  }
  if (creator.healthWindowFollowers < 100) {
    actions.push("Push discovery activity: better battle partners, stronger networking and more visible rooms.");
  }

  actions.push(`Set a clear check-in plan for ${creator.username} with ${creator.managerLabel}.`);
  actions.push("Prioritise the weakest score area first: live days, live hours, battles, or DPH (diamonds per hour).");

  return actions;
}

function buildManagerFocusDetail(creator: CreatorSummary) {
  const focus: string[] = [];
  const missedDays = Math.max(creator.healthWindowDays - creator.oneHourDays, 0);
  const hoursGap = Math.max(20 - creator.healthWindowHours, 0);
  const battlesGap = Math.max(70 - creator.healthWindowMatches, 0);

  if (missedDays > 0) {
    if (creator.oneHourDays >= 6) {
      focus.push(
        `Live routine is strong: ${creator.oneHourDays}/${creator.healthWindowDays} days live. The focus is simply fitting in the final day where possible so daily live becomes the normal routine.`
      );
    } else if (creator.oneHourDays === 5) {
      focus.push(
        `Live routine is decent but can be stronger: ${creator.oneHourDays}/${creator.healthWindowDays} days live. Keep the five-day base, then try to add one extra planned day.`
      );
    } else {
      focus.push(
        `Live routine is inconsistent: only ${creator.oneHourDays}/${creator.healthWindowDays} days live. Put them on a simple weekly schedule, confirm which days they can commit to, and check missed days have a real reason.`
      );
    }
  }
  if (hoursGap > 0) {
    const target =
      creator.healthWindowHours < creator.oneHourDays
        ? "start with a minimum one-hour live every time they go on"
        : "push their shorter sessions closer to two hours";
    focus.push(
      `Hours are holding the score down: ${formatHours(creator.healthWindowHours)}h this week, ${formatHours(hoursGap)}h short of the 20h high-performance target. Put them on a simple schedule and ${target}.`
    );
  }
  if (battlesGap > 0) {
    focus.push(
      `Battle volume needs work: ${formatNumber(creator.healthWindowMatches)} battles this week, ${formatNumber(battlesGap)} short of the 70 battle target. Coach them on finding creators to battle, joining active rooms, introducing themselves properly and building repeat battle partners.`
    );
  }
  if (creator.dph < 1000) {
    focus.push(
      `DPH is low at ${formatNumber(creator.dph)}. Check the basics: lighting, sound, camera angle, background, confidence on camera, whether they are entertaining, how they speak to viewers, gifting prompts and whether they are choosing rooms that can actually convert into diamonds.`
    );
  }
  if (creator.diamondsFromMatches <= 0 && creator.healthWindowMatches > 0) {
    focus.push(
      `Battles are not showing diamond value yet. Review whether they are battling the right creators, explaining battles properly to viewers, keeping energy high during battles and asking for support clearly.`
    );
  }
  if (creator.diamonds < 5000 && creator.healthWindowHours > 5) {
    focus.push(
      `They are putting in some time but not converting it into diamonds. Watch a recent live, check confidence on camera, room energy, conversation quality and whether they are giving viewers a reason to stay and gift.`
    );
  }
  if (creator.healthWindowFollowers < 50) {
    focus.push(
      `Follower growth is weak with ${formatNumber(creator.healthWindowFollowers)} new followers. They may not be networking enough or reaching new rooms. Push battles with larger or more active creators, better first impressions and stronger viewer engagement in the first 30 seconds.`
    );
  }
  if (creator.healthScore >= 85 || creator.dailyAverageDiamonds >= 2000) {
    focus.push(
      `Opportunity creator: performance is strong enough to consider tournaments, campaigns, extra exposure or a manager check-in focused on scaling what is already working.`
    );
  }

  if (!focus.length) {
    focus.push("Keep the current routine stable and set one stretch target: more quality battles, stronger DPH or one extra high-value session this week.");
  }

  return focus;
}

function getScoreMovementReason(creator: CreatorSummary, previousScore: number | null, change: number | null) {
  if (previousScore === null || change === null) return "No previous-week comparison available yet.";
  const direction = change > 0 ? "up" : change < 0 ? "down" : "stable";
  const mainIssue = buildManagerFocusDetail(creator)[0];

  if (direction === "up") {
    return `Up ${formatNumber(change)} points. The current focus is to protect the routine: ${mainIssue}`;
  }
  if (direction === "down") {
    return `Down ${formatNumber(Math.abs(change))} points. The likely pressure point is: ${mainIssue}`;
  }

  return `Stable week-on-week. Push one clear improvement area next: ${mainIssue}`;
}

function getFriendlyDate(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function buildWeeklyReportRows(creator: CreatorSummary) {
  return creator.dailyPoints.slice(-7).map((point) => ({
    date: getFriendlyDate(point.date),
    wentLive: point.liveHours > 0,
    hours: formatHours(point.liveHours),
    diamonds: formatNumber(point.diamonds),
    matches: formatNumber(point.matches),
    followers: formatNumber(point.newFollowers),
  }));
}

function buildCreatorReportHtml({
  creator,
  agencyLogo,
  weekRows,
}: {
  creator: CreatorSummary;
  agencyLogo: string;
  weekRows: ReturnType<typeof buildWeeklyReportRows>;
}) {
  const tips = buildCreatorReportTips(creator);
  const wins = buildCreatorReportWins(creator);
  const toneClass = reportToneClass(creator.healthStatus);
  const weeklyPoints = creator.dailyPoints.slice(-7);
  const weeklyDiamonds = weeklyPoints.reduce((sum, point) => sum + point.diamonds, 0);
  const weeklyHours = weeklyPoints.reduce((sum, point) => sum + point.liveHours, 0);
  const weeklyLiveDays = weeklyPoints.filter((point) => point.liveHours > 0).length;
  const weeklyMatches = weeklyPoints.reduce((sum, point) => sum + point.matches, 0);
  const weeklyDph = weeklyHours > 0 ? weeklyDiamonds / weeklyHours : 0;
  const maxDiamonds = Math.max(...weeklyPoints.map((point) => point.diamonds), 1);
  const averageSessionLength = weeklyLiveDays > 0 ? weeklyHours / weeklyLiveDays : weeklyHours;
  const bestDay = [...weeklyPoints]
    .sort((a, b) => b.diamonds - a.diamonds)[0];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${creator.username} - Weekly Creator Report</title>
  <style>
    @font-face { font-family: Norwester; src: url("${window.location.origin}/fonts/Norwester.otf") format("opentype"); }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #020817;
      color: #eaf6ff;
      font-family: Arial, sans-serif;
    }
    main {
      max-width: 980px;
      margin: 0 auto;
      min-height: 100vh;
      padding: 44px;
      background:
        linear-gradient(180deg, rgba(14, 165, 233, .14), transparent 360px),
        radial-gradient(circle at 85% 0%, rgba(37, 99, 235, .28), transparent 280px),
        #020817;
    }
    .hero {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 36px;
      align-items: center;
      min-height: 230px;
      border: 1px solid rgba(125, 211, 252, .22);
      background: linear-gradient(135deg, rgba(14, 165, 233, .18), rgba(15, 23, 42, .72));
      border-radius: 28px;
      padding: 34px;
      box-shadow: 0 24px 80px rgba(2, 132, 199, .12);
    }
    .eyebrow { color: #38bdf8; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; font-size: 13px; }
    h1 { font-family: Norwester, Impact, sans-serif; font-size: 68px; line-height: .9; margin: 14px 0 8px; color: white; letter-spacing: .02em; }
    h2 { margin: 28px 0 14px; color: #bae6fd; font-size: 14px; text-transform: uppercase; letter-spacing: .08em; }
    .meta { color: #8fb7d4; font-size: 14px; }
    .logo { width: 230px; max-height: 150px; object-fit: contain; filter: drop-shadow(0 18px 28px rgba(56, 189, 248, .18)); }
    .score { margin-top: 22px; display: inline-flex; align-items: baseline; gap: 8px; border: 1px solid rgba(56, 189, 248, .35); background: rgba(8, 47, 73, .62); border-radius: 18px; padding: 14px 18px; }
    .score strong { font-size: 34px; color: #7dd3fc; }
    .score.elite { border-color: rgba(192, 132, 252, .6); background: rgba(88, 28, 135, .5); }
    .score.elite strong { color: #d8b4fe; }
    .score.healthy { border-color: rgba(52, 211, 153, .6); background: rgba(6, 78, 59, .48); }
    .score.healthy strong { color: #6ee7b7; }
    .score.attention { border-color: rgba(251, 146, 60, .65); background: rgba(124, 45, 18, .52); }
    .score.attention strong { color: #fdba74; }
    .score.performance { border-color: rgba(56, 189, 248, .6); background: rgba(8, 47, 73, .58); }
    .score.performance strong { color: #7dd3fc; }
    .score.quality { border-color: rgba(248, 113, 113, .65); background: rgba(127, 29, 29, .52); }
    .score.quality strong { color: #fca5a5; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 22px; }
    .card { border: 1px solid rgba(125, 211, 252, .18); background: rgba(15, 23, 42, .86); border-radius: 18px; padding: 16px; }
    .card .label { color: #8fb7d4; font-size: 12px; }
    .card .value { margin-top: 10px; font-size: 28px; font-weight: 900; color: #38bdf8; }
    .card.diamonds .value { color: #facc15; }
    .card.hours .value { color: #38bdf8; }
    .card.days .value { color: #34d399; }
    .card.battles .value { color: #f472b6; }
    .wide { border: 1px solid rgba(125, 211, 252, .18); background: rgba(15, 23, 42, .78); border-radius: 20px; padding: 18px; margin-top: 14px; }
    .week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
    .day { border: 2px solid rgba(125, 211, 252, .28); background: linear-gradient(180deg, rgba(8, 47, 73, .72), rgba(2, 6, 23, .7)); border-radius: 20px; padding: 16px 12px; min-height: 178px; box-shadow: inset 0 1px 0 rgba(255,255,255,.06); }
    .day .name { color: white; font-size: 17px; font-weight: 900; line-height: 1.15; }
    .day .status { margin: 14px 0 10px; font-size: 40px; line-height: 1; }
    .day .hours { color: #7dd3fc; font-size: 26px; font-weight: 900; margin-bottom: 8px; }
    .day .small { color: #c6e3f7; font-size: 14px; font-weight: 700; line-height: 1.55; }
    .tips { display: grid; gap: 12px; }
    .tip { border-left: 5px solid #38bdf8; background: rgba(8, 47, 73, .48); border-radius: 16px; padding: 16px 18px; }
    .tip.good { border-left-color: #22c55e; background: rgba(6, 78, 59, .46); }
    .tip strong { display: block; color: white; margin-bottom: 7px; font-size: 17px; }
    .tip span { color: #b6d5e8; font-size: 14px; line-height: 1.45; }
    .tier-card { border: 1px solid rgba(125, 211, 252, .22); background: linear-gradient(135deg, rgba(14, 165, 233, .14), rgba(15, 23, 42, .82)); border-radius: 20px; padding: 20px; margin-top: 14px; }
    .tier-card strong { display: block; color: white; font-size: 28px; margin-bottom: 6px; }
    .tier-card span { color: #bae6fd; font-size: 14px; line-height: 1.45; }
    .formula { border: 1px solid rgba(250, 204, 21, .58); background: linear-gradient(135deg, rgba(113, 63, 18, .72), rgba(15, 23, 42, .86)); border-radius: 20px; padding: 22px; font-size: 19px; font-weight: 900; color: #fef3c7; box-shadow: 0 0 30px rgba(250, 204, 21, .1); }
    .formula b { color: #facc15; }
    .formula span { display: block; margin-top: 8px; color: #fde68a; font-size: 15px; }
    .diamond-chart { display: grid; grid-template-columns: 74px 1fr; gap: 14px; height: 250px; border: 1px solid rgba(125, 211, 252, .22); background: rgba(2, 6, 23, .52); border-radius: 20px; padding: 18px 18px 34px; }
    .scale { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; height: 198px; color: #9ccce8; font-size: 12px; font-weight: 800; padding-top: 4px; }
    .bars { position: relative; display: flex; align-items: end; gap: 12px; height: 198px; border-left: 2px solid rgba(148, 163, 184, .5); border-bottom: 2px solid rgba(148, 163, 184, .5); padding: 0 10px; background: repeating-linear-gradient(to top, rgba(148, 163, 184, .12), rgba(148, 163, 184, .12) 1px, transparent 1px, transparent 49px); }
    .bar-wrap { flex: 1; height: 100%; position: relative; display: flex; align-items: end; justify-content: center; }
    .bar { width: 72%; min-height: 3px; border-radius: 9px 9px 0 0; background: linear-gradient(180deg, #7dd3fc, #0284c7 55%, #1d4ed8); box-shadow: 0 0 18px rgba(56, 189, 248, .18); }
    .bar-value { position: absolute; bottom: calc(var(--height) + 8px); color: white; font-size: 12px; font-weight: 900; white-space: nowrap; }
    .bar-label { position: absolute; bottom: -27px; color: #bae6fd; font-size: 12px; font-weight: 900; }
    footer { margin-top: 26px; color: #4f7895; font-size: 12px; text-align: center; }
    @media (max-width: 760px) {
      main { padding: 24px; }
      .grid { grid-template-columns: repeat(2, 1fr); }
      .week { grid-template-columns: 1fr; }
      .diamond-chart { grid-template-columns: 56px 1fr; overflow-x: auto; }
      .bars { min-width: 620px; }
      .hero { grid-template-columns: 1fr; }
      .logo { width: 170px; }
      h1 { font-size: 44px; }
    }
  </style>
</head>
<body>
<main>
  <section class="hero">
    <div>
      <div class="eyebrow">Weekly Performance Report</div>
      <h1>@${creator.username}</h1>
      <div class="meta">${getCreatorMetaLine(creator)} &bull; ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
      <div class="score ${toneClass}"><strong>${creator.healthScore}</strong><span>/100 weekly performance${getCreatorReportScoreLabel(creator.healthStatus) ? ` &bull; ${getCreatorReportScoreLabel(creator.healthStatus)}` : ""}</span></div>
    </div>
    ${agencyLogo ? `<img class="logo" src="${agencyLogo}" alt="Aqua logo" />` : ""}
  </section>

  <section class="grid">
    <div class="card diamonds"><div class="label">&#128142; Weekly Diamonds</div><div class="value">${formatNumber(weeklyDiamonds)}</div></div>
    <div class="card hours"><div class="label">&#9201; Weekly Hours</div><div class="value">${formatHours(weeklyHours)}h</div></div>
    <div class="card days"><div class="label">&#9989; LIVE Days This Week</div><div class="value">${formatNumber(weeklyLiveDays)}</div></div>
    <div class="card battles"><div class="label">&#9876; Weekly Battles</div><div class="value">${formatNumber(weeklyMatches)}</div></div>
  </section>

  <h2>Tier Status</h2>
  <section class="tier-card">
    <strong>${creator.tierStatus || "Tier status not available"}</strong>
    <span>${creator.sourceStatus ? `Current status: ${creator.sourceStatus}. ` : ""}Keep using the weekly targets to protect or improve tier position.</span>
  </section>

  <h2>Weekly Live Breakdown</h2>
  <section class="week">
    ${weekRows
      .map(
        (row) => `<div class="day">
          <div class="name">${row.date}</div>
          <div class="status">${row.wentLive ? "&#10003;" : "&#10005;"}</div>
          <div class="hours">${row.hours}h</div>
          <div class="small">${row.diamonds} diamonds</div>
          <div class="small">${row.matches} battles</div>
        </div>`
      )
      .join("")}
  </section>

  <h2>What You Did Well</h2>
  <section class="tips">
    ${wins
      .map((win) => `<div class="tip good"><strong>${win.title}</strong><span>${win.description}</span></div>`)
      .join("")}
  </section>

  <h2>What To Improve Next</h2>
  <section class="tips">
    ${tips
      .slice(0, 5)
      .map((tip) => `<div class="tip"><strong>${tip.title}</strong><span>${tip.description}</span></div>`)
      .join("")}
  </section>

  <h2>Winning Pattern</h2>
  <section class="formula">
    &#127942; <b>Power Pattern:</b> Go LIVE consistently &bull; Push stronger session length &bull; Add more quality battles
    <span>Average live day: ${formatHours(averageSessionLength)}h &bull; Weekly DPH: ${formatNumber(weeklyDph)} &bull; Best day: ${bestDay ? getFriendlyDate(bestDay.date) : "Not enough data"}</span>
  </section>

  <h2>Diamonds This Week</h2>
  <section class="diamond-chart">
    <div class="scale">
      <span>${formatNumber(maxDiamonds)}</span>
      <span>${formatNumber(maxDiamonds / 2)}</span>
      <span>0</span>
    </div>
    <div class="bars">
      ${weeklyPoints
        .map((point) => {
          const height = Math.max(3, (point.diamonds / maxDiamonds) * 100);
          return `<div class="bar-wrap">
            <div class="bar-value" style="--height:${height}%">${formatNumber(point.diamonds)}</div>
            <div class="bar" style="height:${height}%"></div>
            <div class="bar-label">${String(point.date).slice(5)}</div>
          </div>`;
        })
        .join("")}
    </div>
  </section>

  <footer>Keep pushing every live session.</footer>
</main>
</body>
</html>`;
}

function MetricCard({
  label,
  value,
  previous,
  suffix = "",
}: {
  label: string;
  value: string;
  previous?: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      {typeof previous === "number" ? (
        <p className="mt-1 text-xs text-slate-400">
          Previous: {suffix}
          {formatNumber(previous)}
        </p>
      ) : null}
    </div>
  );
}

function ComparisonChart({
  points,
  selectedMetrics,
  onToggleMetric,
}: {
  points: CreatorDailyPoint[];
  selectedMetrics: ChartMetricKey[];
  onToggleMetric: (metric: ChartMetricKey) => void;
}) {
  const activeMetrics = CHART_METRICS.filter((metric) => selectedMetrics.includes(metric.key));
  const primaryMetric = activeMetrics[0];
  const primaryValues = primaryMetric
    ? points.map((point) => safeNumber(point[primaryMetric.key]))
    : [];
  const primaryMax = Math.max(...primaryValues, 1);
  const primaryMin = Math.min(...primaryValues, 0);
  const width = 820;
  const height = 300;
  const chartTop = 62;
  const chartBottom = 242;
  const chartLeft = 78;
  const chartRight = 650;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div>
          <p className="text-sm font-black uppercase text-slate-700">Chart Metrics</p>
          <div className="mt-3 space-y-2">
            {CHART_METRICS.map((metric) => (
              <label key={metric.key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                <input
                  checked={selectedMetrics.includes(metric.key)}
                  onChange={() => onToggleMetric(metric.key)}
                  type="checkbox"
                />
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: metric.color }} />
                {metric.label}
              </label>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[820px]">
            {[0, 1, 2, 3, 4].map((line) => {
              const y = chartTop + ((chartBottom - chartTop) / 4) * line;
              const tickValue = primaryMax - ((primaryMax - primaryMin) / 4) * line;
              return (
                <g key={line}>
                  <text x={chartLeft - 10} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">
                    {primaryMetric ? primaryMetric.format(tickValue) : ""}
                  </text>
                  <line
                    x1={chartLeft}
                    x2={chartRight}
                    y1={y}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {activeMetrics.map((metric) => {
              const values = points.map((point) => safeNumber(point[metric.key]));
              const max = Math.max(...values, 1);
              const min = Math.min(...values, 0);
              const range = Math.max(max - min, 1);
              const linePoints = values
                .map((value, index) => {
                  const x =
                    points.length <= 1
                      ? chartLeft
                      : chartLeft + (index / (points.length - 1)) * (chartRight - chartLeft);
                  const y = chartBottom - ((value - min) / range) * (chartBottom - chartTop);
                  return `${x},${y}`;
                })
                .join(" ");

              return (
                <g key={metric.key}>
                  <text x={chartRight + 12} y={16 + activeMetrics.indexOf(metric) * 16} fill={metric.color} fontSize="11" fontWeight="700">
                    {metric.format(min)} - {metric.format(max)}
                  </text>
                  <polyline
                    fill="none"
                    points={linePoints}
                    stroke={metric.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  />
                  <text x={chartLeft} y={16 + activeMetrics.indexOf(metric) * 16} fill={metric.color} fontSize="12" fontWeight="700">
                    {metric.label}: {values.length ? metric.format(values[values.length - 1]) : "0"}
                  </text>
                </g>
              );
            })}

            {points.map((point, index) => {
              const x =
                points.length <= 1
                  ? chartLeft
                  : chartLeft + (index / (points.length - 1)) * (chartRight - chartLeft);
              const label = String(point.date).slice(5);

              return (
                <g key={point.date}>
                  <line x1={x} x2={x} y1={chartBottom} y2={chartBottom + 5} stroke="#94a3b8" />
                  <text x={x} y={chartBottom + 22} textAnchor="middle" fill="#64748b" fontSize="11">
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

function AgencyHealthTrendChart({ points }: { points: AgencyHealthTrendPoint[] }) {
  const width = 760;
  const height = 260;
  const chartTop = 28;
  const chartBottom = 205;
  const chartLeft = 62;
  const chartRight = 720;
  const scores = points.map((point) => point.score);
  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);
  const range = Math.max(max - min, 1);
  const linePoints = points
    .map((point, index) => {
      const x =
        points.length <= 1
          ? chartLeft
          : chartLeft + (index / (points.length - 1)) * (chartRight - chartLeft);
      const y = chartBottom - ((point.score - min) / range) * (chartBottom - chartTop);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-xl font-black uppercase text-sky-900">Aqua Health Score Trend</h3>
          <p className="text-sm text-slate-500">
            Average mature creator health score, excluding new creators.
          </p>
        </div>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
          {points.length ? `${formatNumber(points[points.length - 1].score)}/100 latest` : "No trend yet"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px]">
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = chartBottom - ((tick - min) / range) * (chartBottom - chartTop);
            return (
              <g key={tick}>
                <text x={chartLeft - 10} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">
                  {tick}
                </text>
                <line x1={chartLeft} x2={chartRight} y1={y} y2={y} stroke="#e2e8f0" />
              </g>
            );
          })}

          <line x1={chartLeft} x2={chartLeft} y1={chartTop} y2={chartBottom} stroke="#94a3b8" />
          <line x1={chartLeft} x2={chartRight} y1={chartBottom} y2={chartBottom} stroke="#94a3b8" />

          {linePoints ? (
            <polyline fill="none" points={linePoints} stroke="#0284c7" strokeLinecap="round" strokeWidth="4" />
          ) : null}

          {points.map((point, index) => {
            const x =
              points.length <= 1
                ? chartLeft
                : chartLeft + (index / (points.length - 1)) * (chartRight - chartLeft);
            const y = chartBottom - ((point.score - min) / range) * (chartBottom - chartTop);
            const label = point.date.split("-").slice(1).join("/");

            return (
              <g key={point.date}>
                <circle cx={x} cy={y} r="4" fill="#0284c7" />
                <text x={x} y={chartBottom + 22} textAnchor="middle" fill="#64748b" fontSize="11">
                  {label}
                </text>
                <text x={x} y={y - 10} textAnchor="middle" fill="#075985" fontSize="11" fontWeight="700">
                  {formatNumber(point.score)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function CreatorListPanel({
  title,
  creators,
  tone,
}: {
  title: string;
  creators: CreatorSummary[];
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black uppercase">{title}</h3>
        <span className="text-sm font-black">{creators.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {creators.slice(0, 8).map((creator) => (
          <div key={`${title}-${creator.key}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm">
            <span className="truncate font-bold">{creator.username}</span>
            <span className="shrink-0 text-slate-500">{creator.healthScore}/100</span>
          </div>
        ))}
        {!creators.length ? <p className="text-sm text-slate-400">None found.</p> : null}
      </div>
    </div>
  );
}

function downloadReport(creator: CreatorSummary, reportType: "creator" | "internal") {
  const insights = buildInsights(creator);
  const agencyLogo =
    reportType === "creator" && creator.agency === "Aqua"
      ? `${window.location.origin}/logos/aqua.png`
      : "";
  const title =
    reportType === "creator"
      ? `${creator.username} - Weekly Creator Report`
      : `${creator.username} Internal Data Report`;
  const actions =
    reportType === "creator"
      ? buildCreatorReportActions(creator)
      : buildManagerActions(creator);
  const improvementTips = buildScoreImprovementTips(creator);
  const weekRows = buildWeeklyReportRows(creator);
  const weeklyPoints = creator.dailyPoints.slice(-7);
  const weeklyDiamonds = weeklyPoints.reduce((sum, point) => sum + point.diamonds, 0);
  const weeklyHours = weeklyPoints.reduce((sum, point) => sum + point.liveHours, 0);
  const weeklyLiveDays = weeklyPoints.filter((point) => point.liveHours > 0).length;
  const weeklyMatches = weeklyPoints.reduce((sum, point) => sum + point.matches, 0);
  const weeklyMatchDiamonds = weeklyPoints.reduce((sum, point) => {
    const share = creator.matches > 0 ? point.matches / creator.matches : 0;
    return sum + creator.diamondsFromMatches * share;
  }, 0);
  const weeklyFollowers = weeklyPoints.reduce((sum, point) => sum + point.newFollowers, 0);
  const rows = [
    [
      "Weekly performance",
      reportType === "creator"
        ? `${creator.healthScore}/100`
        : `${creator.healthScore}/100 ${creator.healthStatus}`,
    ],
    ["Weekly diamonds", formatNumber(weeklyDiamonds)],
    ["Weekly live hours", formatHours(weeklyHours)],
    ["Weekly live days", formatNumber(weeklyLiveDays)],
    ["Weekly battles", formatNumber(weeklyMatches)],
    ["Weekly diamonds from battles", formatNumber(weeklyMatchDiamonds)],
    ["Weekly new followers", formatNumber(weeklyFollowers)],
  ];
  const creatorHtml =
    reportType === "creator"
      ? buildCreatorReportHtml({
          creator,
          agencyLogo,
          weekRows,
        })
      : "";
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; color: #102033; background: #eef7ff; }
    main { max-width: 900px; margin: 0 auto; background: white; min-height: 100vh; padding: 40px; border-top: 8px solid #0ea5e9; }
    h1 { margin-bottom: 4px; color: #075985; }
    h2 { color: #0369a1; }
    .report-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
    .agency-logo { max-height: 72px; max-width: 180px; object-fit: contain; }
    table { border-collapse: collapse; width: 100%; margin: 24px 0; }
    td { border: 1px solid #d8e8f5; padding: 10px; }
    td:first-child { font-weight: 700; background: #eff8ff; width: 240px; color: #075985; }
    .tick { color: #047857; font-weight: 800; }
    .cross { color: #b91c1c; font-weight: 800; }
    li { margin: 8px 0; }
    .note { color: #555; }
  </style>
</head>
<body>
<main>
  <div class="report-header">
    <div>
      <h1>${title}</h1>
      <p class="note">${getCreatorMetaLine(creator)}</p>
    </div>
    ${agencyLogo ? `<img class="agency-logo" src="${agencyLogo}" alt="Aqua logo" />` : ""}
  </div>
  <table>${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("")}</table>
  <h2>Weekly breakdown</h2>
  <table>
    <tr><td>Day</td><td>Live result</td><td>Hours</td><td>Diamonds</td><td>Battles</td><td>Followers</td></tr>
    ${weekRows
      .map(
        (row) =>
          `<tr><td>${row.date}</td><td>${
            row.wentLive
              ? '<span class="tick">&#10003;</span>'
              : '<span class="cross">&#10005;</span>'
          }</td><td>${row.hours}</td><td>${row.diamonds}</td><td>${row.matches}</td><td>${row.followers}</td></tr>`
      )
      .join("")}
  </table>
  ${
    reportType === "internal"
      ? `<h2>Points still available</h2><ul>${improvementTips
          .map((tip) => `<li>${tip}</li>`)
          .join("")}</ul>`
      : ""
  }
  <h2>Insights</h2>
  <ul>${insights.map((insight) => `<li>${insight}</li>`).join("")}</ul>
  <h2>${reportType === "creator" ? "Next week target" : "Recommended manager actions"}</h2>
  <ul>${actions.map((action) => `<li>${action}</li>`).join("")}</ul>
  </main>
</body>
</html>`;
  const finalHtml = reportType === "creator" ? creatorHtml : html;
  const blob = new Blob([finalHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  link.href = url;
  link.download = `${creator.username}-${reportType === "creator" ? "weekly-creator-report" : "internal-data-report"}-${timestamp}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadManagerReport(
  managerSummary: ManagerHealthSummary,
  movementItems: WeeklyHealthComparison[]
) {
  const matureCreators = managerSummary.creators.filter((creator) => !creator.isNewCreator);
  const creatorsForStats = matureCreators.length ? matureCreators : managerSummary.creators;
  const strongestCreators = [...creatorsForStats].sort((a, b) => b.healthScore - a.healthScore).slice(0, 8);
  const lowestCreators = [...creatorsForStats].sort((a, b) => a.healthScore - b.healthScore).slice(0, 12);
  const improvingCreators = movementItems.filter((item) => item.change !== null && item.change > 0);
  const decliningCreators = movementItems.filter((item) => item.change !== null && item.change < 0);
  const stableCreators = movementItems.filter((item) => item.change !== null && item.change === 0);
  const reportDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const totalDiamonds = managerSummary.creators.reduce((sum, creator) => sum + creator.diamonds, 0);
  const totalHours = managerSummary.creators.reduce((sum, creator) => sum + creator.healthWindowHours, 0);
  const totalBattles = managerSummary.creators.reduce((sum, creator) => sum + creator.healthWindowMatches, 0);
  const averageDph =
    totalHours > 0
      ? managerSummary.creators.reduce((sum, creator) => sum + creator.diamonds, 0) / totalHours
      : 0;
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(managerSummary.manager)} - Manager Team Health Report</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #102033; background: #eef7ff; }
    main { max-width: 1120px; margin: 0 auto; min-height: 100vh; background: white; padding: 40px; border-top: 8px solid #0284c7; }
    h1 { margin: 0; color: #082f49; font-size: 34px; }
    h2 { margin-top: 34px; color: #075985; font-size: 22px; }
    .muted { color: #64748b; }
    .hero { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
    .score { border: 1px solid #bae6fd; background: #e0f2fe; color: #075985; border-radius: 18px; padding: 18px 22px; text-align: right; min-width: 190px; }
    .score strong { display: block; font-size: 42px; line-height: 1; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 28px; }
    .card { border: 1px solid #dbeafe; background: #f8fbff; border-radius: 16px; padding: 16px; }
    .label { color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .value { margin-top: 8px; color: #0f172a; font-size: 24px; font-weight: 900; }
    .value.elite-value { color: #7e22ce; }
    .value.good { color: #047857; }
    .value.warn { color: #c2410c; }
    .value.performance-value { color: #0369a1; }
    .value.bad { color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
    th { background: #e0f2fe; color: #075985; text-align: left; padding: 10px; border: 1px solid #bae6fd; }
    td { padding: 10px; border: 1px solid #dbeafe; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fbff; }
    .pill { display: inline-block; border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 800; }
    .elite { background: #f3e8ff; color: #7e22ce; }
    .healthy { background: #dcfce7; color: #047857; }
    .attention { background: #ffedd5; color: #c2410c; }
    .performance { background: #e0f2fe; color: #0369a1; }
    .quality { background: #fee2e2; color: #b91c1c; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .panel { border: 1px solid #dbeafe; border-radius: 18px; padding: 18px; background: #f8fbff; }
    ul { margin: 10px 0 0; padding-left: 20px; }
    li { margin: 7px 0; }
    @media print {
      body { background: white; }
      main { max-width: none; border-top: 0; }
      .panel, .card, table { break-inside: avoid; }
    }
  </style>
</head>
<body>
<main>
  <section class="hero">
    <div>
      <p class="label">Manager Team Health Report</p>
      <h1>${escapeHtml(managerSummary.manager)}</h1>
      <p class="muted">${reportDate} &bull; Aqua Creator Intelligence</p>
    </div>
    <div class="score">
      <span class="label">Team Health</span>
      <strong>${formatNumber(managerSummary.averageScore)}</strong>
      <span>/100 average</span>
    </div>
  </section>

  <section class="grid">
    <div class="card"><div class="label">Creators</div><div class="value">${formatNumber(managerSummary.totalCreators)}</div></div>
    <div class="card"><div class="label">Scored Creators</div><div class="value">${formatNumber(managerSummary.matureCreators)}</div></div>
    <div class="card"><div class="label">Improving</div><div class="value good">${formatNumber(improvingCreators.length)}</div></div>
    <div class="card"><div class="label">New Creators</div><div class="value">${formatNumber(managerSummary.newCreators)}</div></div>
    <div class="card"><div class="label">Weekly Diamonds</div><div class="value">${formatNumber(totalDiamonds)}</div></div>
    <div class="card"><div class="label">Weekly Hours</div><div class="value">${formatHours(totalHours)}h</div></div>
    <div class="card"><div class="label">Weekly Battles</div><div class="value">${formatNumber(totalBattles)}</div></div>
    <div class="card"><div class="label">Average DPH</div><div class="value">${formatNumber(averageDph)}</div></div>
  </section>

  <h2>Team Mix</h2>
  <section class="grid">
    <div class="card"><div class="label">Elite</div><div class="value elite-value">${formatNumber(managerSummary.elite)}</div></div>
    <div class="card"><div class="label">Healthy</div><div class="value good">${formatNumber(managerSummary.healthy)}</div></div>
    <div class="card"><div class="label">Needs Attention</div><div class="value warn">${formatNumber(managerSummary.needsAttention)}</div></div>
    <div class="card"><div class="label">Low Performance</div><div class="value performance-value">${formatNumber(managerSummary.lowPerformance)}</div></div>
    <div class="card"><div class="label">Low Quality</div><div class="value bad">${formatNumber(managerSummary.lowQuality)}</div></div>
  </section>

  <h2>Manager Action Summary</h2>
  <section class="panel">
    <ul>
      <li>Move the lowest scoring creators first. They are having the biggest negative impact on the team average.</li>
      <li>Target creators below 50 for live-day consistency, weekly hours and battle rhythm before chasing DPH.</li>
      <li>Protect healthy and elite creators by keeping their routine stable, then use them as examples for the team.</li>
      <li>Use the week-on-week movement section to decide who needs urgent manager follow-up and who needs their routine protected.</li>
    </ul>
  </section>

  <h2>Week-On-Week Movement</h2>
  <section class="grid">
    <div class="card"><div class="label">Improving</div><div class="value good">${formatNumber(improvingCreators.length)}</div></div>
    <div class="card"><div class="label">Stable</div><div class="value">${formatNumber(stableCreators.length)}</div></div>
    <div class="card"><div class="label">Declining</div><div class="value bad">${formatNumber(decliningCreators.length)}</div></div>
  </section>
  <table>
    <tr><th>Creator</th><th>Movement</th><th>Reason / Focus</th></tr>
    ${movementItems
      .filter((item) => item.change !== null)
      .sort((a, b) => (a.change ?? 0) - (b.change ?? 0))
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.creator.username)}</td><td>${formatNumber(item.previousScore ?? 0)} to ${formatNumber(
            item.creator.healthScore
          )} (${item.change && item.change > 0 ? "+" : ""}${formatNumber(item.change ?? 0)})</td><td>${escapeHtml(
            getScoreMovementReason(item.creator, item.previousScore, item.change)
          )}</td></tr>`
      )
      .join("")}
  </table>

  <section class="two-col">
    <div>
      <h2>Biggest Contributors</h2>
      <div class="panel">
        <table>
          <tr><th>Creator</th><th>Score</th><th>Why</th></tr>
          ${strongestCreators
            .map(
              (creator) =>
                `<tr><td>${escapeHtml(creator.username)}</td><td>${formatNumber(creator.healthScore)}/100</td><td>${escapeHtml(
                  creator.creatorTags.slice(0, 3).join(", ") || "Strong weekly performance"
                )}</td></tr>`
            )
            .join("")}
        </table>
      </div>
    </div>
    <div>
      <h2>Bringing The Average Down</h2>
      <div class="panel">
        <table>
          <tr><th>Creator</th><th>Score</th><th>First Fix</th></tr>
          ${lowestCreators
            .map((creator) => {
              const firstFix = buildManagerFocusDetail(creator)[0] || "Review weekly activity and set one clear target.";
              return `<tr><td>${escapeHtml(creator.username)}</td><td>${formatNumber(creator.healthScore)}/100</td><td>${escapeHtml(firstFix)}</td></tr>`;
            })
            .join("")}
        </table>
      </div>
    </div>
  </section>

  <h2>Full Creator Detail</h2>
  <table>
    <tr>
      <th>Creator</th>
      <th>Status</th>
      <th>Score</th>
      <th>Score Contribution</th>
      <th>Live Days</th>
      <th>Hours</th>
      <th>Battles</th>
      <th>DPH</th>
      <th>Diamonds</th>
      <th>Manager Focus</th>
    </tr>
    ${managerSummary.creators
      .map((creator) => {
        const statusClass = reportToneClass(creator.healthStatus);
        const contribution =
          creator.isNewCreator || !creatorsForStats.length
            ? "New creator"
            : `${formatNumber(creator.healthScore / creatorsForStats.length)} avg pts`;
        const focus = buildManagerFocusDetail(creator).slice(0, 2).join(" ");

        return `<tr>
          <td><strong>${escapeHtml(creator.username)}</strong><br><span class="muted">${escapeHtml(creator.tierStatus)}</span></td>
          <td><span class="pill ${statusClass}">${escapeHtml(creator.healthStatus)}</span></td>
          <td>${formatNumber(creator.healthScore)}/100</td>
          <td>${contribution}</td>
          <td>${formatNumber(creator.oneHourDays)}/${formatNumber(creator.healthWindowDays)}</td>
          <td>${formatHours(creator.healthWindowHours)}h</td>
          <td>${formatNumber(creator.healthWindowMatches)}</td>
          <td>${formatNumber(creator.dph)}</td>
          <td>${formatNumber(creator.diamonds)}</td>
          <td>${escapeHtml(focus || "Keep monitoring weekly performance.")}</td>
        </tr>`;
      })
      .join("")}
  </table>
</main>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${managerSummary.manager.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-manager-team-health-${timestamp}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function CreatorIntelligencePage() {
  const [month, setMonth] = useState("2026-06");
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(getLastDayForMonth("2026-06"));
  const [manager, setManager] = useState("All Managers");
  const [graduationStatus, setGraduationStatus] = useState("All Graduation");
  const [tierStatus, setTierStatus] = useState("All Tiers");
  const [healthStatus, setHealthStatus] = useState("All Health");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CreatorStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCreatorKey, setSelectedCreatorKey] = useState("");
  const [expandedManager, setExpandedManager] = useState("");
  const [floatingProfileOpen, setFloatingProfileOpen] = useState(false);
  const [selectedChartMetrics, setSelectedChartMetrics] = useState<ChartMetricKey[]>([
    "diamonds",
    "liveHours",
    "matches",
  ]);

  const lastDay = getLastDayForMonth(month);
  const dayOptions = useMemo(
    () => Array.from({ length: lastDay }, (_, index) => index + 1),
    [lastDay]
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const startDate = `${month}-01`;
      const endDate = `${month}-${String(getLastDayForMonth(month)).padStart(2, "0")}`;
      const allRows: CreatorStat[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await submissionsSupabase
          .from("creator_daily_stats")
          .select("*")
          .gte("stat_date", startDate)
          .lte("stat_date", endDate)
          .order("stat_date", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error(error);
          setRows([]);
          setLoading(false);
          return;
        }

        const batch = (data || []) as CreatorStat[];
        allRows.push(...batch);
        hasMore = batch.length === pageSize;
        from += pageSize;
      }

      setRows(allRows);
      setLoading(false);
    }

    loadData();
  }, [month]);

  const dateRangeRows = useMemo(() => {
    return rows.filter((row) => {
      const day = getDayNumber(row.stat_date);
      return day >= startDay && day <= endDay;
    });
  }, [rows, startDay, endDay]);

  const allSummaries = useMemo(() => buildCreatorSummaries(dateRangeRows), [dateRangeRows]);
  const aquaRows = useMemo(() => dateRangeRows.filter(isAquaRow), [dateRangeRows]);
  const latestAquaDate = useMemo(() => {
    const dates = aquaRows.map((row) => row.stat_date).sort((a, b) => a.localeCompare(b));
    return dates[dates.length - 1] || "";
  }, [aquaRows]);
  const activeAquaCreatorKeys = useMemo(() => {
    const latestRows = latestAquaDate
      ? aquaRows.filter((row) => row.stat_date === latestAquaDate)
      : aquaRows;

    return new Set(latestRows.map((row) => getUsername(row).toLowerCase()));
  }, [aquaRows, latestAquaDate]);
  const aquaSummaries = useMemo(
    () =>
      allSummaries.filter(
        (creator) => creator.agency === "Aqua" && activeAquaCreatorKeys.has(creator.key)
      ),
    [activeAquaCreatorKeys, allSummaries]
  );

  const managers = useMemo(() => {
    const values = new Set(aquaSummaries.map((item) => item.managerLabel).filter(Boolean));
    return ["All Managers", ...Array.from(values).sort()];
  }, [aquaSummaries]);

  const activeManager = managers.includes(manager) ? manager : "All Managers";

  const graduationStatuses = useMemo(() => {
    const values = new Set(aquaSummaries.map((item) => item.graduationStatus).filter(Boolean));
    return ["All Graduation", ...Array.from(values).sort()];
  }, [aquaSummaries]);

  const tierStatuses = useMemo(() => {
    const coreTiers = Array.from({ length: 10 }, (_, index) => `Tier ${index + 1}`);
    const uploadedTiers = Array.from(
      new Set(aquaSummaries.map((item) => item.tierStatus).filter(Boolean))
    ).filter((item) => !coreTiers.some((tier) => tier.toLowerCase() === item.toLowerCase()));
    return ["All Tiers", ...coreTiers, ...uploadedTiers.sort()];
  }, [aquaSummaries]);

  const filteredCreators = useMemo(() => {
    return aquaSummaries.filter((creator) => {
      const managerMatch = activeManager === "All Managers" || creator.managerLabel === activeManager;
      const graduationMatch =
        graduationStatus === "All Graduation" || creator.graduationStatus === graduationStatus;
      const tierMatch =
        tierStatus === "All Tiers" || creator.tierStatus.toLowerCase() === tierStatus.toLowerCase();
      const healthMatch = healthStatus === "All Health" || creator.healthStatus === healthStatus;
      const haystack = [
        creator.username,
        creator.email,
        creator.agency,
        creator.group,
        creator.managerLabel,
        creator.managerRaw,
        creator.graduationStatus,
        creator.tierStatus,
      ]
        .join(" ")
        .toLowerCase();
      const searchMatch = !search.trim() || haystack.includes(search.toLowerCase());

      return (
        managerMatch &&
        graduationMatch &&
        tierMatch &&
        healthMatch &&
        searchMatch
      );
    });
  }, [
    aquaSummaries,
    graduationStatus,
    healthStatus,
    activeManager,
    search,
    tierStatus,
  ]);

  const matureFilteredCreators = useMemo(
    () => filteredCreators.filter((creator) => !creator.isNewCreator),
    [filteredCreators]
  );

  const managerHealthSummaries = useMemo<ManagerHealthSummary[]>(() => {
    const managerFilteredCreators = aquaSummaries.filter((creator) => {
      const graduationMatch =
        graduationStatus === "All Graduation" || creator.graduationStatus === graduationStatus;
      const tierMatch =
        tierStatus === "All Tiers" || creator.tierStatus.toLowerCase() === tierStatus.toLowerCase();
      const healthMatch = healthStatus === "All Health" || creator.healthStatus === healthStatus;
      const haystack = [
        creator.username,
        creator.agency,
        creator.group,
        creator.managerLabel,
        creator.managerRaw,
        creator.graduationStatus,
        creator.tierStatus,
      ]
        .join(" ")
        .toLowerCase();
      const searchMatch = !search.trim() || haystack.includes(search.toLowerCase());

      return graduationMatch && tierMatch && healthMatch && searchMatch;
    });
    const grouped = new Map<string, CreatorSummary[]>();

    for (const creator of managerFilteredCreators) {
      const managerName = creator.managerLabel || "Unassigned";
      grouped.set(managerName, [...(grouped.get(managerName) || []), creator]);
    }

    return Array.from(grouped.entries())
      .map(([managerName, creators]) => {
        const matureCreators = creators.filter((creator) => !creator.isNewCreator);
        const scoreBase = matureCreators.length ? matureCreators : creators;
        const averageScore =
          scoreBase.length > 0
            ? scoreBase.reduce((sum, creator) => sum + creator.healthScore, 0) / scoreBase.length
            : 0;

        return {
          manager: managerName,
          creators: creators.sort((a, b) => a.healthScore - b.healthScore),
          totalCreators: creators.length,
          matureCreators: matureCreators.length,
          newCreators: creators.length - matureCreators.length,
          averageScore,
          elite: matureCreators.filter((creator) => creator.healthStatus === "Elite").length,
          healthy: matureCreators.filter((creator) => creator.healthStatus === "Healthy").length,
          needsAttention: matureCreators.filter((creator) => creator.healthStatus === "Needs Attention").length,
          lowPerformance: matureCreators.filter((creator) => creator.healthStatus === "Low Performance").length,
          lowQuality: matureCreators.filter((creator) => creator.healthStatus === "Low Quality").length,
        };
      })
      .sort((a, b) => a.averageScore - b.averageScore);
  }, [aquaSummaries, graduationStatus, healthStatus, search, tierStatus]);

  const newCreators = useMemo(
    () =>
      filteredCreators
        .filter((creator) => creator.isNewCreator)
        .sort((a, b) => b.dailyAverageDiamonds - a.dailyAverageDiamonds),
    [filteredCreators]
  );

  const hiddenPotentialCreators = useMemo(
    () =>
      newCreators.filter(
        (creator) =>
          creator.dailyAverageDiamonds >= 1200 ||
          creator.dph >= 1000 ||
          creator.healthScore >= 70
      ),
    [newCreators]
  );

  const inactiveNewCreators = useMemo(
    () =>
      newCreators.filter(
        (creator) =>
          creator.daysSinceJoining >= 3 &&
          creator.diamonds <= 0 &&
          creator.liveHours <= 0 &&
          creator.healthWindowHours <= 0
      ),
    [newCreators]
  );

  const focusCreators = useMemo(
    () => {
      const lowPerformance = matureFilteredCreators
        .filter((creator) => creator.healthStatus === "Low Performance")
        .sort((a, b) => a.healthScore - b.healthScore);
      const needsAttention = matureFilteredCreators
        .filter((creator) => creator.healthStatus === "Needs Attention")
        .sort((a, b) => a.healthScore - b.healthScore);
      const lowQuality = matureFilteredCreators
        .filter((creator) => creator.healthStatus === "Low Quality")
        .sort((a, b) => a.healthScore - b.healthScore);
      const lowQualityFocusLimit = Math.ceil(lowQuality.length * 0.1);
      const healthy = matureFilteredCreators
        .filter((creator) => creator.healthStatus === "Healthy")
        .sort((a, b) => a.healthScore - b.healthScore);

      return [
        ...lowQuality.slice(0, lowQualityFocusLimit),
        ...lowPerformance,
        ...needsAttention,
        ...healthy,
      ];
    },
    [matureFilteredCreators]
  );

  const lowQualityCreators = useMemo(
    () =>
      matureFilteredCreators
        .filter((creator) => creator.healthStatus === "Low Quality")
        .sort((a, b) => b.healthScore - a.healthScore),
    [matureFilteredCreators]
  );

  const totals = useMemo(() => {
    const totalDiamonds = filteredCreators.reduce((sum, row) => sum + row.diamonds, 0);
    const totalHours = filteredCreators.reduce((sum, row) => sum + row.liveHours, 0);
    const totalMatches = filteredCreators.reduce((sum, row) => sum + row.matches, 0);
    const totalFollowers = filteredCreators.reduce((sum, row) => sum + row.newFollowers, 0);

    return {
      totalCreators: filteredCreators.length,
      newCreators: newCreators.length,
      elite: matureFilteredCreators.filter((row) => row.healthStatus === "Elite").length,
      healthy: matureFilteredCreators.filter((row) => row.healthStatus === "Healthy").length,
      needsAttention: matureFilteredCreators.filter((row) => row.healthStatus === "Needs Attention").length,
      lowPerformance: matureFilteredCreators.filter((row) => row.healthStatus === "Low Performance").length,
      lowQuality: matureFilteredCreators.filter((row) => row.healthStatus === "Low Quality").length,
      averageDph: totalHours > 0 ? totalDiamonds / totalHours : 0,
      totalDiamonds,
      totalHours,
      totalMatches,
      totalFollowers,
    };
  }, [filteredCreators, matureFilteredCreators, newCreators.length]);

  const agencyHealthTrend = useMemo<AgencyHealthTrendPoint[]>(() => {
    const dates = Array.from(new Set(aquaRows.map((row) => row.stat_date))).sort((a, b) =>
      a.localeCompare(b)
    );

    return dates.map((date) => {
      const rowsUpToDate = aquaRows.filter(
        (row) => row.stat_date <= date && activeAquaCreatorKeys.has(getUsername(row).toLowerCase())
      );
      const matureCreators = buildCreatorSummaries(rowsUpToDate).filter(
        (creator) => creator.agency === "Aqua" && !creator.isNewCreator
      );
      const average =
        matureCreators.length > 0
          ? matureCreators.reduce((sum, creator) => sum + creator.healthScore, 0) /
            matureCreators.length
          : 0;

      return {
        date,
        score: Math.round(average),
        creators: matureCreators.length,
      };
    });
  }, [activeAquaCreatorKeys, aquaRows]);

  const weeklyHealthComparison = useMemo<WeeklyHealthComparison[]>(() => {
    if (!latestAquaDate) return [];

    const uploadedDates = Array.from(new Set(aquaRows.map((row) => row.stat_date))).sort((a, b) =>
      a.localeCompare(b)
    );
    const previousUploadedDates = uploadedDates.slice(-14, -7);
    const previousUploadedDateSet = new Set(previousUploadedDates);
    const previousRows = aquaRows.filter(
      (row) =>
        previousUploadedDateSet.has(row.stat_date) &&
        activeAquaCreatorKeys.has(getUsername(row).toLowerCase())
    );
    const previousSummaries = buildCreatorSummaries(previousRows).filter(
      (creator) => creator.agency === "Aqua" && !creator.isNewCreator
    );
    const previousByCreator = new Map(
      previousSummaries.map((creator) => [creator.key, creator.healthScore])
    );

    return matureFilteredCreators
      .map((creator) => {
        const previousScore = previousByCreator.get(creator.key) ?? null;

        return {
          creator,
          previousScore,
          change: previousScore === null ? null : creator.healthScore - previousScore,
        };
      })
      .sort((a, b) => {
        const aChange = a.change ?? -999;
        const bChange = b.change ?? -999;
        return aChange - bChange;
      });
  }, [activeAquaCreatorKeys, aquaRows, latestAquaDate, matureFilteredCreators]);

  const improvingCreators = useMemo(
    () =>
      weeklyHealthComparison
        .filter((item) => item.change !== null && item.change > 0)
        .sort((a, b) => (b.change ?? 0) - (a.change ?? 0)),
    [weeklyHealthComparison]
  );

  const notImprovingCreators = useMemo(
    () =>
      weeklyHealthComparison
        .filter((item) => item.change !== null && item.change < -15)
        .sort((a, b) => (a.change ?? 0) - (b.change ?? 0)),
    [weeklyHealthComparison]
  );

  const stableCreators = useMemo(
    () =>
      weeklyHealthComparison
        .filter((item) => item.change !== null && item.change <= 0 && item.change >= -15)
        .sort((a, b) => (a.change ?? 0) - (b.change ?? 0)),
    [weeklyHealthComparison]
  );

  const latestGraduationUploadDay = useMemo(() => {
    const uploadedDays = aquaRows
      .filter(
        (row) =>
          getNumber(row, ["diamonds", "Diamonds"]) > 0 ||
          getDurationHours(row, ["live_hours", "LIVE duration"]) > 0 ||
          getNumber(row, ["matches", "Matches"]) > 0
      )
      .map((row) => getDayNumber(row.stat_date))
      .filter((day) => day > 0);

    return uploadedDays.length ? Math.min(Math.max(...uploadedDays), lastDay) : Math.min(endDay, lastDay);
  }, [aquaRows, endDay, lastDay]);

  const graduationTrackerRows = useMemo<GraduationTrackerRow[]>(() => {
    const currentMonthDay = Math.min(latestGraduationUploadDay, lastDay);
    const targetToDate = (GRADUATION_TARGET / lastDay) * currentMonthDay;
    const remainingDays = Math.max(lastDay - currentMonthDay, 0);

    return filteredCreators
      .filter(
        (creator) =>
          creator.diamonds >= MINIMUM_TRACKER_DIAMONDS &&
          isGraduationEligibleStatus(creator.graduationStatus)
      )
      .map((creator) => {
        const remainingDiamonds = Math.max(GRADUATION_TARGET - creator.diamonds, 0);
        const avgNeededPerDay =
          remainingDays > 0 ? remainingDiamonds / remainingDays : remainingDiamonds;
        const progressPercent = Math.min((creator.diamonds / GRADUATION_TARGET) * 100, 100);
        const pacePercent = targetToDate > 0 ? (creator.diamonds / targetToDate) * 100 : 0;
        let status: GraduationTrackerStatus = "red";
        let statusLabel = "Far Behind";

        if (creator.diamonds >= GRADUATION_TARGET) {
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
          username: creator.username,
          manager: creator.managerLabel,
          daysSinceJoining: creator.daysSinceJoining,
          diamonds: creator.diamonds,
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
          const order: Record<GraduationTrackerStatus, number> = {
            gold: 0,
            green: 1,
            amber: 2,
            red: 3,
          };
          return order[a.status] - order[b.status];
        }

        return b.progressPercent - a.progressPercent;
      });
  }, [filteredCreators, lastDay, latestGraduationUploadDay]);

  const groupedCreators = useMemo(
    () => {
      const coreGroups = [
        { title: "Low Performance", status: "Low Performance" as HealthStatus, creators: matureFilteredCreators.filter((creator) => creator.healthStatus === "Low Performance") },
        { title: "Low Quality", status: "Low Quality" as HealthStatus, creators: matureFilteredCreators.filter((creator) => creator.healthStatus === "Low Quality") },
        { title: "Needs Attention", status: "Needs Attention" as HealthStatus, creators: matureFilteredCreators.filter((creator) => creator.healthStatus === "Needs Attention") },
        { title: "Healthy", status: "Healthy" as HealthStatus, creators: matureFilteredCreators.filter((creator) => creator.healthStatus === "Healthy") },
        { title: "Elite", status: "Elite" as HealthStatus, creators: matureFilteredCreators.filter((creator) => creator.healthStatus === "Elite") },
      ];

      if (healthStatus !== "All Health") {
        return coreGroups.filter((groupItem) => groupItem.status === healthStatus);
      }

      return coreGroups;
    },
    [matureFilteredCreators, healthStatus]
  );
  const visibleCreators = useMemo(
    () => groupedCreators.flatMap((groupItem) => groupItem.creators),
    [groupedCreators]
  );
  const activeSelectedCreatorKey =
    filteredCreators.find((creator) => creator.key === selectedCreatorKey)?.key ||
    visibleCreators[0]?.key ||
    filteredCreators[0]?.key ||
    "";
  const selectedCreator = filteredCreators.find(
    (creator) => creator.key === activeSelectedCreatorKey
  );
  const selectedInsights = selectedCreator ? buildInsights(selectedCreator) : [];

  function copyWhatsAppText(title: string, lines: string[]) {
    const text = [title, ...lines].join("\n\n");
    void navigator.clipboard.writeText(text);
  }

  function copyNewCreatorsText() {
    copyWhatsAppText(
      "New Aqua Creators",
      newCreators.length
        ? newCreators.map((creator) =>
            [
              `💎 ${creator.username}`,
              `• Days since joining: ${formatNumber(creator.daysSinceJoining)}`,
              `• Diamonds: ${formatNumber(creator.diamonds)}`,
            ].join("\n")
          )
        : ["No new creators found for the current filters."]
    );
  }

  function copyHiddenPotentialText() {
    copyWhatsAppText(
      "High Potential Aqua Creators",
      hiddenPotentialCreators.length
        ? hiddenPotentialCreators.map((creator) =>
            [
              `💎 ${creator.username}`,
              `• Days since joining: ${formatNumber(creator.daysSinceJoining)}`,
              `• Diamonds: ${formatNumber(creator.diamonds)}`,
              `• DPH: ${formatNumber(creator.dph)}`,
            ].join("\n")
          )
        : ["No hidden potential creators found for the current filters."]
    );
  }

  function copyGraduationPaceText() {
    const graduationPaceCreators = graduationTrackerRows.filter((creator) => creator.pacePercent >= 70);
    copyWhatsAppText(
      "Aqua Graduation Progress",
      graduationPaceCreators.length
        ? graduationPaceCreators.map((creator) =>
            [
              `💎 ${creator.username}`,
              `• Diamonds: ${formatNumber(creator.diamonds)}`,
              `• Progress: ${formatNumber(creator.progressPercent)}%`,
            ].join("\n")
          )
        : ["No creators are currently over 70% graduation pace for these filters."]
    );
  }

  function toggleChartMetric(metric: ChartMetricKey) {
    setSelectedChartMetrics((current) => {
      if (current.includes(metric)) {
        return current.length > 1 ? current.filter((item) => item !== metric) : current;
      }

      return [...current, metric];
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 text-center md:pl-40">
            <Link href="/" className="text-sm font-bold text-sky-700 hover:text-sky-600">
              Back home
            </Link>
            <Image
              src="/logos/aqua.png"
              alt="Aqua"
              width={240}
              height={120}
              className="mx-auto mt-3 h-20 w-auto object-contain md:h-28"
              priority
            />
            <h1 className="mt-2 text-4xl font-black uppercase text-sky-950 md:text-6xl">
              Creator Intelligence
            </h1>
            <p className="mx-auto mt-2 max-w-3xl text-sm text-slate-500 md:text-base">
              Aqua-only creator health tracker with manager focus, graduation tracking, new creator performance and report views.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
            {loading ? "Loading creator data..." : `${formatNumber(rows.length)} uploaded rows loaded`}
          </div>
        </div>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
            This page is locked to Aqua creators. Uploads can still contain every agency; this dashboard only reads Aqua for intelligence.
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <label className="text-xs font-bold uppercase text-slate-500">
              Month
              <select
                value={month}
                onChange={(event) => {
                  const nextMonth = event.target.value;
                  setMonth(nextMonth);
                  setStartDay(1);
                  setEndDay(getLastDayForMonth(nextMonth));
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {MONTHS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold uppercase text-slate-500">
              Start
              <select
                value={startDay}
                onChange={(event) => setStartDay(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    Day {day}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold uppercase text-slate-500">
              End
              <select
                value={endDay}
                onChange={(event) => setEndDay(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    Day {day}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold uppercase text-slate-500">
              Manager
              <select
                value={activeManager}
                onChange={(event) => setManager(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {managers.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold uppercase text-slate-500">
              Health
              <select
                value={healthStatus}
                onChange={(event) => setHealthStatus(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {["All Health", "Elite", "Healthy", "Needs Attention", "Low Performance", "Low Quality"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold uppercase text-slate-500">
              Search
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Creator..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 placeholder:text-slate-300"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold uppercase text-slate-500">
              Graduation
              <select
                value={graduationStatus}
                onChange={(event) => setGraduationStatus(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {graduationStatuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold uppercase text-slate-500">
              Tier
              <select
                value={tierStatus}
                onChange={(event) => setTierStatus(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {tierStatuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total creators" value={formatNumber(totals.totalCreators)} />
          <MetricCard
            label="Average health score"
            value={
              agencyHealthTrend.length
                ? `${formatNumber(agencyHealthTrend[agencyHealthTrend.length - 1].score)}/100`
                : "0/100"
            }
          />
          <MetricCard label="Low performance creators" value={formatNumber(totals.lowPerformance)} />
          <MetricCard label="Low quality creators" value={formatNumber(totals.lowQuality)} />
          <MetricCard label="Needs attention" value={formatNumber(totals.needsAttention)} />
          <MetricCard label="Healthy creators" value={formatNumber(totals.healthy)} />
          <MetricCard label="Elite creators" value={formatNumber(totals.elite)} />
          <MetricCard label="New creators" value={formatNumber(totals.newCreators)} />
          <MetricCard label="Average DPH (diamonds per hour)" value={formatNumber(totals.averageDph)} />
          <MetricCard label="Total diamonds" value={formatNumber(totals.totalDiamonds)} />
          <MetricCard label="Total live hours" value={formatHours(totals.totalHours)} />
          <MetricCard label="Total battles" value={formatNumber(totals.totalMatches)} />
          <MetricCard label="Total new followers" value={formatNumber(totals.totalFollowers)} />
        </section>

        <section className="mb-6">
          <AgencyHealthTrendChart points={agencyHealthTrend} />
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-black uppercase text-sky-900">Manager Team Health</h2>
              <p className="mt-1 text-sm text-slate-500">
                Team average by manager, with new creators counted separately from scored creators.
              </p>
            </div>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
              {formatNumber(managerHealthSummaries.length)} managers
            </span>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {managerHealthSummaries.map((managerSummary) => {
              const scoreWidth = Math.min(Math.max(managerSummary.averageScore, 0), 100);

              return (
                <div
                  key={managerSummary.manager}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 ${
                    activeManager === managerSummary.manager
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-slate-950">{managerSummary.manager}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {formatNumber(managerSummary.totalCreators)} creators /{" "}
                        {formatNumber(managerSummary.matureCreators)} scored /{" "}
                        {formatNumber(managerSummary.newCreators)} new
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-sm font-black ${
                        managerSummary.averageScore >= 70
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : managerSummary.averageScore >= 50
                            ? "border-orange-200 bg-orange-50 text-orange-700"
                            : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {formatNumber(managerSummary.averageScore)}/100
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="h-3 overflow-hidden rounded-full bg-white">
                      <div
                        className={`h-full ${
                          managerSummary.averageScore >= 70
                            ? "bg-emerald-500"
                            : managerSummary.averageScore >= 50
                              ? "bg-orange-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${scoreWidth}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Team average across scored creators
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-purple-50 p-2 font-bold text-purple-700">
                      <p>{formatNumber(managerSummary.elite)}</p>
                      <p className="mt-1 text-[10px] uppercase">Elite</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2 font-bold text-emerald-700">
                      <p>{formatNumber(managerSummary.healthy)}</p>
                      <p className="mt-1 text-[10px] uppercase">Healthy</p>
                    </div>
                    <div className="rounded-xl bg-orange-50 p-2 font-bold text-orange-700">
                      <p>{formatNumber(managerSummary.needsAttention)}</p>
                      <p className="mt-1 text-[10px] uppercase">Attention</p>
                    </div>
                    <div className="rounded-xl bg-sky-50 p-2 font-bold text-sky-700">
                      <p>{formatNumber(managerSummary.lowPerformance)}</p>
                      <p className="mt-1 text-[10px] uppercase">Low Perf</p>
                    </div>
                    <div className="rounded-xl bg-red-50 p-2 font-bold text-red-700">
                      <p>{formatNumber(managerSummary.lowQuality)}</p>
                      <p className="mt-1 text-[10px] uppercase">Low Qual</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedManager((current) =>
                          current === managerSummary.manager ? "" : managerSummary.manager
                        )
                      }
                      className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-700 hover:bg-sky-50"
                    >
                      {expandedManager === managerSummary.manager ? "Hide Team" : "View Team"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setManager(managerSummary.manager)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                      Filter Page
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadManagerReport(
                          managerSummary,
                          weeklyHealthComparison.filter(
                            (item) => item.creator.managerLabel === managerSummary.manager
                          )
                        )
                      }
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                    >
                      Download Manager Report
                    </button>
                  </div>

                  {expandedManager === managerSummary.manager ? (
                    <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
                      {[...managerSummary.creators].sort((a, b) => b.healthScore - a.healthScore).map((creator) => (
                        <button
                          key={`manager-team-${managerSummary.manager}-${creator.key}`}
                          type="button"
                          onClick={() => {
                            setSelectedCreatorKey(creator.key);
                            setFloatingProfileOpen(true);
                          }}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left hover:border-sky-200 hover:bg-sky-50"
                        >
                          <span>
                            <span className="block font-black text-slate-950">{creator.username}</span>
                            <span className="block text-xs text-slate-500">{creator.healthStatus}</span>
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses(creator.healthStatus)}`}>
                            {creator.healthScore}/100
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!managerHealthSummaries.length ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No manager health data found for these filters.
            </p>
          ) : null}
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-3xl font-black uppercase text-sky-900">Manager Focus Queue</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Uses the selected manager filter. Priority order is Low Quality, Low Performance, Needs Attention, then Healthy, each lowest score first.
                </p>
              </div>
              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                {formatNumber(focusCreators.length)}
              </span>
            </div>

            <div className="max-h-[760px] overflow-y-auto pr-2">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {focusCreators.map((creator) => (
                <button
                  key={`focus-${creator.key}`}
                  type="button"
                  onClick={() => setSelectedCreatorKey(creator.key)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-sky-300 hover:bg-sky-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{creator.username}</p>
                      <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(creator)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses(creator.healthStatus)}`}>
                      {creator.healthStatus} {creator.healthScore}/100
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    Focus: {creator.creatorTags.slice(0, 3).join(", ") || "Build consistency"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Diamonds: {formatNumber(creator.diamonds)}
                  </p>
                </button>
              ))}
              </div>
              {!focusCreators.length ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No creators found for the manager focus queue in these filters.
                </p>
              ) : null}
            </div>
        </section>

        {selectedCreator ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-sky-700">Selected Creator Profile</p>
                <h2 className="mt-1 text-3xl font-black text-slate-950 md:text-5xl">
                  {selectedCreator.username}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {getCreatorMetaLine(selectedCreator)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${statusClasses(
                    selectedCreator.healthStatus
                  )}`}
                >
                  Weekly performance {selectedCreator.healthScore}/100 {selectedCreator.healthStatus}
                </span>
                <span
                  className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${statusClasses(
                    selectedCreator.monthlyHealthStatus
                  )}`}
                >
                  Monthly performance {selectedCreator.monthlyHealthScore}/100 {selectedCreator.monthlyHealthStatus}
                </span>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => downloadReport(selectedCreator, "creator")}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
              >
                Download Creator Report
              </button>
              <button
                type="button"
                onClick={() => downloadReport(selectedCreator, "internal")}
                className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-700 hover:bg-sky-100"
              >
                Download Internal Data Report
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard
                label="Diamonds"
                value={formatNumber(selectedCreator.diamonds)}
                previous={selectedCreator.diamondsLastMonth}
              />
              <MetricCard
                label="Live hours"
                value={formatHours(selectedCreator.liveHours)}
                previous={selectedCreator.liveHoursLastMonth}
              />
              <MetricCard
                label="Valid days"
                value={formatNumber(selectedCreator.validDays)}
                previous={selectedCreator.validDaysLastMonth}
              />
              <MetricCard
                label="Live streams"
                value={formatNumber(selectedCreator.liveStreams)}
                previous={selectedCreator.liveStreamsLastMonth}
              />
              <MetricCard label="Battles" value={formatNumber(selectedCreator.matches)} />
              <MetricCard
                label="Battle diamonds"
                value={formatNumber(selectedCreator.diamondsFromMatches)}
              />
              <MetricCard label="New followers" value={formatNumber(selectedCreator.newFollowers)} />
              <MetricCard label="DPH (diamonds per hour)" value={formatNumber(selectedCreator.dph)} />
              <MetricCard label="Graduation" value={selectedCreator.graduationStatus} />
              <MetricCard label="Tier" value={selectedCreator.tierStatus} />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-xl font-black uppercase text-sky-900">Health Score Breakdown</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <MetricCard
                  label="Live days"
                  value={`${Math.round(selectedCreator.healthBreakdown.liveDays)}/35`}
                />
                <MetricCard
                  label="Live hours"
                  value={`${Math.round(selectedCreator.healthBreakdown.liveHours)}/30`}
                />
                <MetricCard
                  label="Battles"
                  value={`${Math.round(selectedCreator.healthBreakdown.matches)}/10`}
                />
                <MetricCard
                  label="DPH (diamonds per hour)"
                  value={`${Math.round(selectedCreator.healthBreakdown.dph)}/25`}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedCreator.creatorTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-xl font-black uppercase text-sky-900">Creator Charts</h3>
              <div className="mt-4">
                <ComparisonChart
                  points={selectedCreator.dailyPoints}
                  selectedMetrics={selectedChartMetrics}
                  onToggleMetric={toggleChartMetric}
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-xl font-black uppercase text-sky-900">Creator Insights</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {selectedInsights.map((insight) => (
                  <div key={insight} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}


        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-sky-950">Weekly Health Movement</h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest uploaded week compared with the previous week. Uses the selected manager filter and excludes new creators.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {formatNumber(improvingCreators.length)} improving
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                {formatNumber(stableCreators.length)} stable
              </span>
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                {formatNumber(notImprovingCreators.length)} not improving
              </span>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div>
              <h3 className="mb-3 text-lg font-black uppercase text-emerald-700">Improving</h3>
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-2">
                {improvingCreators.map((item) => (
                  <button
                    key={`improving-${item.creator.key}`}
                    type="button"
                    onClick={() => setSelectedCreatorKey(item.creator.key)}
                    className="w-full rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-left hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{item.creator.username}</p>
                        <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(item.creator)}</p>
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black text-emerald-700">
                        +{formatNumber(item.change ?? 0)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatNumber(item.previousScore ?? 0)} to {formatNumber(item.creator.healthScore)} health score
                    </p>
                  </button>
                ))}
                {!improvingCreators.length ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No improving creators found for these filters.
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-black uppercase text-slate-700">Stable</h3>
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-2">
                {stableCreators.map((item) => (
                  <button
                    key={`stable-${item.creator.key}`}
                    type="button"
                    onClick={() => setSelectedCreatorKey(item.creator.key)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-sky-200 hover:bg-sky-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{item.creator.username}</p>
                        <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(item.creator)}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                        {formatNumber(item.change ?? 0)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatNumber(item.previousScore ?? 0)} to {formatNumber(item.creator.healthScore)} health score
                    </p>
                  </button>
                ))}
                {!stableCreators.length ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No stable creators found for these filters.
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-black uppercase text-red-700">Not Improving</h3>
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-2">
                {notImprovingCreators.map((item) => (
                  <button
                    key={`not-improving-${item.creator.key}`}
                    type="button"
                    onClick={() => setSelectedCreatorKey(item.creator.key)}
                    className="w-full rounded-xl border border-red-100 bg-red-50/60 p-3 text-left hover:border-red-200 hover:bg-red-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{item.creator.username}</p>
                        <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(item.creator)}</p>
                      </div>
                      <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-700">
                        {formatNumber(item.change ?? 0)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatNumber(item.previousScore ?? 0)} to {formatNumber(item.creator.healthScore)} health score
                    </p>
                  </button>
                ))}
                {!notImprovingCreators.length ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No non-improving creators found for these filters.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-red-700">Low Quality List</h2>
              <p className="mt-1 text-sm text-slate-500">
                Below 50 score and under 5,000 diamonds. These stay separate from the manager focus queue.
              </p>
            </div>
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
              {formatNumber(lowQualityCreators.length)}
            </span>
          </div>

          <div className="max-h-[360px] overflow-y-auto pr-2">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {lowQualityCreators.map((creator) => (
                <button
                  key={`low-quality-${creator.key}`}
                  type="button"
                  onClick={() => setSelectedCreatorKey(creator.key)}
                  className="rounded-xl border border-red-100 bg-red-50/60 p-3 text-left hover:border-red-200 hover:bg-red-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{creator.username}</p>
                      <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(creator)}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-700">
                      {creator.healthScore}/100
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {!lowQualityCreators.length ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No Low Quality creators in these filters.
              </p>
            ) : null}
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-sky-950">Health Tracker</h2>
              <p className="mt-1 text-sm text-slate-500">
                Last seven uploaded days. Below 50 with 5,000+ diamonds is Low Performance; below 50 under 5,000 diamonds is Low Quality.
              </p>
            </div>
            <p className="text-sm font-bold text-slate-500">
              {formatNumber(matureFilteredCreators.length)} mature creators
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {(["Elite", "Healthy", "Needs Attention", "Low Performance", "Low Quality"] as HealthStatus[]).map((status) => {
              const count = matureFilteredCreators.filter((creator) => creator.healthStatus === status).length;
              const selected = healthStatus === status;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setHealthStatus(selected ? "All Health" : status)}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                    selected
                      ? "border-sky-400 bg-sky-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/70"
                  }`}
                >
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses(status)}`}>
                    {status}
                  </span>
                  <p className="mt-4 text-4xl font-black text-slate-950">{formatNumber(count)}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-slate-400">Creators</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {filteredCreators.length ? (
              groupedCreators
                .map((groupItem) => (
                  <div key={groupItem.status} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses(groupItem.status)}`}>
                        {groupItem.title}
                      </span>
                      <span className="text-sm font-bold text-slate-500">
                        Showing all {formatNumber(groupItem.creators.length)}
                      </span>
                    </div>

                    <div className="grid max-h-[720px] gap-2 overflow-y-auto p-3 pr-2">
                      {groupItem.creators
                        .sort((a, b) => a.healthScore - b.healthScore)
                        .map((creator) => {
                          const selected = creator.key === activeSelectedCreatorKey;

                          return (
                            <button
                              key={creator.key}
                              type="button"
                              onClick={() => setSelectedCreatorKey(creator.key)}
                            className={`rounded-xl border p-4 text-left transition hover:border-sky-300 hover:bg-sky-50 ${
                                selected
                                  ? "border-sky-400 bg-sky-50"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black text-slate-950">{creator.username}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {getCreatorMetaLine(creator)}
                                  </p>
                                </div>
                                <span className="text-lg font-black text-sky-800">{creator.healthScore}</span>
                              </div>
                              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                                <div>
                                  <p className="text-slate-400">Live days</p>
                                  <p className="font-bold">
                                    {creator.oneHourDays}/{creator.healthWindowDays} days
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Hours</p>
                                  <p className="font-bold">{formatHours(creator.healthWindowHours)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Battles</p>
                                  <p className="font-bold">{formatNumber(creator.healthWindowMatches)}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      {!groupItem.creators.length ? (
                        <p className="p-4 text-sm text-slate-400">No creators in this bucket.</p>
                      ) : null}
                    </div>
                  </div>
                ))
            ) : (
              <div className="rounded-2xl border border-slate-200 p-4 text-slate-500">
                No creator data found for these filters.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-sky-950">Aqua Graduation Tracker</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tracks eligible Aqua creators towards {formatNumber(GRADUATION_TARGET)} diamonds. Pace is measured against the latest uploaded day.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyGraduationPaceText}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
              >
                Copy WhatsApp Text
              </button>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
                Target pace day {latestGraduationUploadDay}:{" "}
                {formatNumber((GRADUATION_TARGET / lastDay) * Math.min(latestGraduationUploadDay, lastDay))}
              </div>
            </div>
          </div>

          <div className="mb-4 grid gap-4 md:grid-cols-4">
            <MetricCard label="Tracker creators" value={formatNumber(graduationTrackerRows.length)} />
            <MetricCard
              label="Graduated"
              value={formatNumber(graduationTrackerRows.filter((creator) => creator.status === "gold").length)}
            />
            <MetricCard
              label="On target"
              value={formatNumber(graduationTrackerRows.filter((creator) => creator.status === "green").length)}
            />
            <MetricCard label="Minimum entry" value={formatNumber(MINIMUM_TRACKER_DIAMONDS)} />
          </div>

          <div className="max-h-[620px] overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Creator</th>
                  <th className="p-3">Manager</th>
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
                {graduationTrackerRows.map((creator) => (
                  <tr key={`graduation-${creator.username}`} className="border-t border-slate-100">
                    <td className="p-3 font-black text-slate-950">{creator.username}</td>
                    <td className="p-3 text-slate-600">{creator.manager}</td>
                    <td className="p-3">{formatNumber(creator.daysSinceJoining)}</td>
                    <td className="p-3 font-bold text-sky-800">{formatNumber(creator.diamonds)}</td>
                    <td className="p-3">
                      <div className="h-3 w-36 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full ${graduationProgressClasses(creator.status)}`}
                          style={{ width: `${creator.progressPercent}%` }}
                        />
                      </div>
                      <span className="mt-1 block text-xs text-slate-500">
                        {formatPercent(creator.progressPercent)}
                      </span>
                    </td>
                    <td className="p-3">{formatPercent(creator.pacePercent)}</td>
                    <td className="p-3">{formatNumber(creator.remainingDiamonds)}</td>
                    <td className="p-3">{formatNumber(creator.remainingDays)}</td>
                    <td className="p-3 font-bold text-slate-800">{formatNumber(creator.avgNeededPerDay)}</td>
                    <td className="p-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${graduationStatusClasses(creator.status)}`}>
                        {creator.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
                {!graduationTrackerRows.length ? (
                  <tr>
                    <td className="p-4 text-slate-500" colSpan={10}>
                      No eligible Aqua graduation creators found for these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black uppercase text-sky-900">New Creators</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Creators 14 days in or less are shown here instead of being placed into health buckets.
                </p>
              </div>
              <button
                type="button"
                onClick={copyNewCreatorsText}
                className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
              >
                Copy WhatsApp Text
              </button>
            </div>
            {inactiveNewCreators.length ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <h3 className="text-sm font-black uppercase text-red-700">Needs removal check</h3>
                <p className="mt-1 text-xs text-red-600">
                  New creators who are 3+ days in with no live hours and no diamonds.
                </p>
                <div className="mt-3 grid gap-2">
                  {inactiveNewCreators.map((creator) => (
                    <button
                      key={`inactive-new-${creator.key}`}
                      type="button"
                      onClick={() => setSelectedCreatorKey(creator.key)}
                      className="flex items-center justify-between rounded-xl border border-red-100 bg-white px-3 py-2 text-left hover:border-red-200"
                    >
                      <span className="font-bold text-red-900">{creator.username}</span>
                      <span className="text-xs font-black text-red-700">
                        Day {formatNumber(creator.daysSinceJoining)} / 0 diamonds
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-5 grid gap-3">
              {newCreators.slice(0, 12).map((creator) => (
                <button
                  key={`new-${creator.key}`}
                  type="button"
                  onClick={() => setSelectedCreatorKey(creator.key)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-sky-300 hover:bg-sky-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{creator.username}</p>
                      <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(creator)}</p>
                    </div>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                      Day {formatNumber(creator.daysSinceJoining)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Avg diamonds/day</p>
                      <p className="font-bold">{formatNumber(creator.dailyAverageDiamonds)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">DPH (diamonds per hour)</p>
                      <p className="font-bold">{formatNumber(creator.dph)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Health</p>
                      <p className="font-bold">{creator.healthScore}/100</p>
                    </div>
                  </div>
                </button>
              ))}
              {!newCreators.length ? <p className="text-sm text-slate-400">No new creators in these filters.</p> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black uppercase text-emerald-700">Hidden Potential</h2>
                <p className="mt-1 text-sm text-slate-500">
                  New creators already showing strong early diamonds, DPH (diamonds per hour) or health signals.
                </p>
              </div>
              <button
                type="button"
                onClick={copyHiddenPotentialText}
                className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
              >
                Copy WhatsApp Text
              </button>
            </div>
            <div className="mt-5">
              <CreatorListPanel
                title="High Performing New Creators"
                creators={hiddenPotentialCreators}
                tone="border-emerald-100 bg-emerald-50 text-emerald-800"
              />
            </div>
          </div>
        </section>

        {selectedCreator ? (
          <>
            <button
              type="button"
              onClick={() => setFloatingProfileOpen(true)}
              className="fixed bottom-6 right-6 z-40 rounded-full border border-sky-200 bg-sky-600 px-5 py-4 text-sm font-black text-white shadow-2xl hover:bg-sky-700"
            >
              Profile
            </button>
            {floatingProfileOpen ? (
              <aside className="fixed right-6 top-24 z-50 w-[min(420px,calc(100vw-48px))] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-sky-700">Quick Creator Profile</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedCreator.username}</h2>
                    <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(selectedCreator)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFloatingProfileOpen(false)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <MetricCard
                    label="Weekly performance"
                    value={`${selectedCreator.healthScore}/100`}
                  />
                  <MetricCard label="Status" value={selectedCreator.healthStatus} />
                  <MetricCard label="Diamonds" value={formatNumber(selectedCreator.diamonds)} />
                  <MetricCard label="Hours" value={formatHours(selectedCreator.healthWindowHours)} />
                  <MetricCard label="Battles" value={formatNumber(selectedCreator.healthWindowMatches)} />
                  <MetricCard label="DPH" value={formatNumber(selectedCreator.dph)} />
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-black uppercase text-slate-700">Manager Focus</h3>
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    {buildManagerFocusDetail(selectedCreator)
                      .slice(0, 3)
                      .map((focus) => (
                        <li key={focus}>{focus}</li>
                      ))}
                  </ul>
                </div>
              </aside>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
