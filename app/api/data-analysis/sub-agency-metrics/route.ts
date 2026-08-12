import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type MetricKey = "whole" | "main" | "danJames" | "mikeIndi" | "paradise" | "respawn" | "trident" | "horizon" | "unassigned";

type Metric = {
  key: MetricKey;
  name: string;
  diamonds: number;
  previousDiamonds: number;
  previousMonthDiamonds: number;
  diamondsChange: number | null;
  totalCreators: number;
  recruits: number;
  recruitDiamonds: number;
  recruitmentContribution: number | null;
  recruitmentGrowth: number | null;
  creatorGrowth: number | null;
  quitCreators: number;
  quitDiamonds: number;
  performanceBands: { over1600k: number; from500kTo1600k: number; from200kTo500k: number; from30kTo200k: number; from1kTo30k: number; from10To1k: number; under10: number; zero: number };
};

const SETTINGS_NAME = "manager-assignment-settings";

const text = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => Number(text(value).replace(/[^\d.-]/g, "")) || 0;
const key = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const managerKey = (row: Row) => key(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email);
const creatorKey = (row: Row) => {
  const id = text(row.creator_id || row["Creator ID"]);
  return /^\d{8,}$/.test(id) ? id : key(row.creator_username || row["Creator's username"]);
};

function dateJoined(row: Row) {
  const statDate = text(row.stat_date);
  const days = number(row.days_since_joining || row["Days since joining"]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(statDate) || days < 1) return "";
  const date = new Date(`${statDate}T12:00:00`);
  date.setDate(date.getDate() - (days - 1));
  return date.toISOString().slice(0, 10);
}

function hasQuitNetworkMarker(row: Row) {
  return /creator\s+has\s+quit\s+the\s+network/i.test(text(row.creator_id || row["Creator ID"]));
}

function resolvedAssignmentGroup(row: Row, savedGroup: string) {
  if (savedGroup) return savedGroup;

  const sourceGroup = text(row.group_name || row.Group).toLowerCase();
  const mikeIndiGroups = [
    "team megan",
    "rach first class",
    "kayden unknown",
    "kash rapper",
    "first class lauren",
    "indi first class",
    "first class dam it chan",
    "abbi first class",
  ];

  return mikeIndiGroups.includes(sourceGroup) ? "Team Mike / Indi" : "";
}

function subAgencyForRow(row: Row, assignedGroup: string) {
  const source = `${row.team || ""} ${row.group_name || ""} ${row.Group || ""} ${row.agency || ""}`.toLowerCase();
  const manager = managerKey(row);
  if (source.includes("respawn")) return "Respawn";
  if (source.includes("paradise")) return "Paradise";
  if (source.includes("trident") || manager === "trident125mailcom" || manager === "trident125gmailcom") return "Trident";
  if (source.includes("horizon") || source.includes("storm") || source.includes("strive") || manager === "stormliveagencyoutlookcom" || manager === "hannakingismail92gmailcom") return "Horizon";
  return ["Paradise", "Respawn", "Trident", "Horizon"].includes(assignedGroup) ? assignedGroup : "";
}

function matchesMetric(metric: MetricKey, assignedGroup: string, row?: Row) {
  // Whole Agency intentionally contains every creator in the uploaded data,
  // including creators whose manager has not been assigned yet.
  if (metric === "whole") return true;
  if (metric === "main") return assignedGroup === "Team Dan / James" || assignedGroup === "Team Mike / Indi";
  if (metric === "danJames") return assignedGroup === "Team Dan / James";
  if (metric === "mikeIndi") return assignedGroup === "Team Mike / Indi";
  if (metric === "unassigned") {
    const isMain = assignedGroup === "Team Dan / James" || assignedGroup === "Team Mike / Indi";
    return !isMain && !subAgencyForRow(row || {}, assignedGroup);
  }
  return subAgencyForRow(row || {}, assignedGroup) === ({ paradise: "Paradise", respawn: "Respawn", trident: "Trident", horizon: "Horizon" } as const)[metric];
}

const definitions: Array<Pick<Metric, "key" | "name">> = [
  { key: "whole", name: "First Class — Whole Agency" },
  { key: "main", name: "First Class — Main" },
  { key: "danJames", name: "First Class — D&J" },
  { key: "mikeIndi", name: "First Class — M&I" },
  { key: "paradise", name: "First Class — Paradise" },
  { key: "respawn", name: "First Class — Respawn" },
  { key: "trident", name: "First Class — Trident" },
  { key: "horizon", name: "First Class — Horizon" },
  { key: "unassigned", name: "First Class — Unassigned / Legacy" },
];

export async function GET() {
  try {
    const [{ data: latestRow, error: latestError }, { data: settingsRow, error: settingsError }] = await Promise.all([
      submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1).maybeSingle(),
      submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle(),
    ]);
    if (latestError || settingsError) throw new Error(latestError?.message || settingsError?.message);

    const latestDate = text(latestRow?.stat_date);
    if (!latestDate) return NextResponse.json({ latestDate: "", metrics: [] });

    const month = latestDate.slice(0, 7);
    const [year, monthNumber] = month.split("-").map(Number);
    const elapsedDays = Number(latestDate.slice(-2));
    const previousYear = monthNumber === 1 ? year - 1 : year;
    const previousMonthNumber = monthNumber === 1 ? 12 : monthNumber - 1;
    const previousMonth = `${previousYear}-${String(previousMonthNumber).padStart(2, "0")}`;
    const previousMonthDays = new Date(Date.UTC(previousYear, previousMonthNumber, 0)).getUTCDate();
    const previousEnd = `${previousMonth}-${String(Math.min(elapsedDays, previousMonthDays)).padStart(2, "0")}`;
    const currentStart = `${month}-01`;
    const previousStart = `${previousMonth}-01`;
    const assignments = ((settingsRow?.template_json as { assignments?: { managerGroups?: Record<string, string> } } | null)?.assignments || {});
    const groups = assignments.managerGroups || {};

    const rows: Row[] = [];
    for (let from = 0, more = true; more; from += 1000) {
      const { data, error } = await submissionsSupabase
        .from("creator_daily_stats")
        .select("*")
        .gte("stat_date", previousStart)
        .lte("stat_date", latestDate)
        .order("stat_date", { ascending: true })
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      const page = (data || []) as Row[];
      rows.push(...page);
      more = page.length === 1000;
    }

    // A creator can change manager during the month.  Attribute all of their
    // month-to-date rows to the manager shown on their most recent snapshot,
    // rather than leaving earlier rows in an old team.
    const latestRowsByCreator = new Map<string, Row>();
    for (const row of rows) {
      const id = creatorKey(row);
      if (!id) continue;
      const existing = latestRowsByCreator.get(id);
      if (!existing || text(row.stat_date) >= text(existing.stat_date)) latestRowsByCreator.set(id, row);
    }
    const placementFor = (row: Row) => {
      const latestCreatorRow = latestRowsByCreator.get(creatorKey(row)) || row;
      return {
        assignedGroup: resolvedAssignmentGroup(latestCreatorRow, groups[managerKey(latestCreatorRow)] || ""),
        row: latestCreatorRow,
      };
    };

    const recruitIds = new Set<string>();
    for (const row of rows) {
      const id = creatorKey(row);
      const joined = dateJoined(row);
      if (id && joined >= currentStart && joined <= latestDate) recruitIds.add(id);
    }

    const metrics: Metric[] = definitions.map((definition) => ({
      ...definition,
      diamonds: 0,
      previousDiamonds: 0,
      previousMonthDiamonds: 0,
      diamondsChange: null,
      totalCreators: 0,
      recruits: 0,
      recruitDiamonds: 0,
      recruitmentContribution: null,
      recruitmentGrowth: null,
      creatorGrowth: null,
      quitCreators: 0,
      quitDiamonds: 0,
      performanceBands: { over1600k: 0, from500kTo1600k: 0, from200kTo500k: 0, from30kTo200k: 0, from1kTo30k: 0, from10To1k: 0, under10: 0, zero: 0 },
    }));

    for (const row of rows) {
      const date = text(row.stat_date);
      const placement = placementFor(row);
      const diamonds = number(row.diamonds || row.Diamonds);
      const isCurrent = date >= currentStart && date <= latestDate;
      const isPrevious = date >= previousStart && date <= previousEnd;
      const isPreviousMonth = date >= previousStart && date < currentStart;
      const isRecruit = recruitIds.has(creatorKey(row));

      for (const metric of metrics) {
        if (!matchesMetric(metric.key, placement.assignedGroup, placement.row)) continue;
        if (isCurrent) {
          metric.diamonds += diamonds;
          if (isRecruit) metric.recruitDiamonds += diamonds;
        }
        if (isPrevious) metric.previousDiamonds += diamonds;
        if (isPreviousMonth) metric.previousMonthDiamonds += diamonds;
      }
    }

    for (const metric of metrics) {
      metric.totalCreators = Array.from(latestRowsByCreator.values()).filter((creator) => text(creator.stat_date) === latestDate && !hasQuitNetworkMarker(creator)).filter((creator) => {
        const placement = placementFor(creator);
        return matchesMetric(metric.key, placement.assignedGroup, placement.row);
      }).length;
      const currentCreatorDiamonds = new Map<string, number>();
      for (const row of rows) {
        if (text(row.stat_date) < currentStart || text(row.stat_date) > latestDate) continue;
        const placement = placementFor(row);
        if (!matchesMetric(metric.key, placement.assignedGroup, placement.row)) continue;
        const id = creatorKey(row);
        if (id) currentCreatorDiamonds.set(id, (currentCreatorDiamonds.get(id) || 0) + number(row.diamonds || row.Diamonds));
      }
      for (const diamonds of currentCreatorDiamonds.values()) {
        if (diamonds >= 1_600_000) metric.performanceBands.over1600k += 1;
        else if (diamonds >= 500_000) metric.performanceBands.from500kTo1600k += 1;
        else if (diamonds >= 200_000) metric.performanceBands.from200kTo500k += 1;
        else if (diamonds >= 30_000) metric.performanceBands.from30kTo200k += 1;
        else if (diamonds >= 1_000) metric.performanceBands.from1kTo30k += 1;
        else if (diamonds >= 10) metric.performanceBands.from10To1k += 1;
        else if (diamonds > 0) metric.performanceBands.under10 += 1;
        else metric.performanceBands.zero += 1;
      }
      metric.recruits = [...recruitIds].filter((id) => {
        const latestCreatorRow = latestRowsByCreator.get(id);
        if (!latestCreatorRow) return false;
        const placement = placementFor(latestCreatorRow);
        return matchesMetric(metric.key, placement.assignedGroup, placement.row);
      }).length;
      metric.diamondsChange = metric.previousDiamonds ? ((metric.diamonds - metric.previousDiamonds) / metric.previousDiamonds) * 100 : null;
      metric.recruitmentContribution = metric.diamonds ? (metric.recruitDiamonds / metric.diamonds) * 100 : null;
      metric.recruitmentGrowth = metric.previousMonthDiamonds ? (metric.recruitDiamonds / metric.previousMonthDiamonds) * 100 : null;
      const existingCurrentDiamonds = metric.diamonds - metric.recruitDiamonds;
      const existingPreviousDiamonds = rows.reduce((total, row) => {
        const date = text(row.stat_date);
        if (date < previousStart || date > previousEnd || recruitIds.has(creatorKey(row))) return total;
        const placement = placementFor(row);
        return matchesMetric(metric.key, placement.assignedGroup, placement.row) ? total + number(row.diamonds || row.Diamonds) : total;
      }, 0);
      metric.creatorGrowth = existingPreviousDiamonds ? ((existingCurrentDiamonds - existingPreviousDiamonds) / existingPreviousDiamonds) * 100 : null;
    }

    const quitEvents = new Map<string, Row>();
    for (const row of rows) {
      const username = key(row.creator_username || row["Creator's username"]);
      const date = text(row.stat_date);
      if (!username || !hasQuitNetworkMarker(row) || date < currentStart || date > latestDate) continue;
      const existing = quitEvents.get(username);
      if (!existing || date < text(existing.stat_date)) quitEvents.set(username, row);
    }

    for (const [username, quitRow] of quitEvents) {
      const quitDate = text(quitRow.stat_date);
      const lastSnapshot = rows
        .filter((row) => key(row.creator_username || row["Creator's username"]) === username && text(row.stat_date) < quitDate && !hasQuitNetworkMarker(row))
        .sort((a, b) => text(b.stat_date).localeCompare(text(a.stat_date)))[0];
      if (!lastSnapshot) continue;

      const placement = placementFor(lastSnapshot);
      const diamonds = number(lastSnapshot.diamonds || lastSnapshot.Diamonds);
      for (const metric of metrics) {
        if (!matchesMetric(metric.key, placement.assignedGroup, placement.row)) continue;
        metric.quitCreators += 1;
        metric.quitDiamonds += diamonds;
      }
    }

    return NextResponse.json({ latestDate, month, previousMonth, metrics });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load sub-agency metrics." }, { status: 500 });
  }
}
