import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type Recruit = { id: string; username: string; joined: string; managerKey: string; manager: string; group: string; diamonds: number; hours: number; dph: number };

const SETTINGS_NAME = "manager-assignment-settings";
const text = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => Number(text(value).replace(/[^\d.-]/g, "")) || 0;
const key = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const managerIdentity = (value: unknown) => key(value).replace(/(outlook|gmail|mail)com$/, "");
const KJB_MANAGER_IDENTITIES = new Set(["kaybon03", "kaybon03icloudcom", "kbon03", "kban03icloudcom"]);
const KJB_TEAM_KEY = "teamdanjames";
const KJB_TEAM_NAME = "Dan & James";
const KJB_TEAM_GROUP = "Team Dan / James";

const isKjbManager = (value: unknown) => KJB_MANAGER_IDENTITIES.has(managerIdentity(value));
const isExcludedManager = (value: unknown) => managerIdentity(value) === "mikehalesjb";
const managerRaw = (row: Row) => text(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email);
// TikTok creator ID is permanent. A username is display-only because it can change.
const creatorId = (row: Row) => {
  const id = text(row.creator_id || row["Creator ID"]);
  return /^\d{8,}$/.test(id) ? id : "";
};
const username = (row: Row) => text(row.creator_username || row["Creator's username"] || row.username).replace(/^@/, "");
const hasQuitNetwork = (row: Row) => /creator\s+has\s+quit\s+(the\s+)?network|quit\s+(the\s+)?creator\s+network/i.test(JSON.stringify(row));
const date = (value: Date) => value.toISOString().slice(0, 10);
const joinedOn = (statDate: string, days: number) => {
  const value = new Date(`${statDate}T12:00:00`);
  value.setDate(value.getDate() - Math.max(0, days - 2));
  return date(value);
};
const label = (raw: string) => {
  const local = raw.split("@")[0].replace(/^firstclassagency[_.-]?/i, "").replace(/[_.-]+/g, " ").trim();
  return local ? `Team ${local.split(" ").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ")}` : "Unassigned";
};

async function rowsBetween(start: string, end: string) {
  const rows: Row[] = [];
  for (let from = 0, more = true; more; from += 1000) {
    const { data, error } = await submissionsSupabase.from("creator_daily_stats").select("*").gte("stat_date", start).lte("stat_date", end).order("stat_date", { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    const batch = (data || []) as Row[];
    rows.push(...batch);
    more = batch.length === 1000;
  }
  return rows;
}

export async function GET(request: Request) {
  try {
    const period = new URL(request.url).searchParams.get("period") || "month";
    const maxDays = period === "14" ? 14 : period === "month" ? 31 : 7;
    const [{ data: latest }, { data: settings, error: settingsError }] = await Promise.all([
      submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1).maybeSingle(),
      submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle(),
    ]);
    if (settingsError) throw new Error(settingsError.message);
    const endDate = text(latest?.stat_date);
    if (!endDate) return NextResponse.json({ recruits: [], managers: [], groups: [], startDate: "", endDate: "" });

    const end = new Date(`${endDate}T12:00:00`);
    const start = period === "month" ? new Date(end.getFullYear(), end.getMonth(), 1, 12) : new Date(end);
    if (period !== "month") start.setDate(start.getDate() - (maxDays - 1));
    const startDate = date(start);
    const assignment = ((settings?.template_json as { assignments?: { managerGroups?: Record<string, string>; managerNames?: Record<string, string>; deletedManagers?: string[] } } | null)?.assignments || {});
    const groups = assignment.managerGroups || {};
    const names = assignment.managerNames || {};
    const deleted = new Set((assignment.deletedManagers || []).map(managerIdentity));
    const groupForManager = (manager: string) => Object.entries(groups).find(([savedManager]) => managerIdentity(savedManager) === managerIdentity(manager))?.[1] || "Unassigned";
    const nameForManager = (manager: string) => Object.entries(names).find(([savedManager]) => managerIdentity(savedManager) === managerIdentity(manager))?.[1] || "";

    // Every upload in the period is used. This means a creator who leaves later
    // still contributes the diamonds they earned before disappearing.
    const periodRows = await rowsBetween(startDate, endDate);
    const activeCreatorIds = new Set(periodRows.filter((row) => text(row.stat_date) === endDate).map(creatorId).filter(Boolean));
    const byCreator = new Map<string, Row[]>();
    for (const row of periodRows) {
      if (text(row.data_period).toLowerCase() === "mature_month_total") continue;
      const id = creatorId(row);
      if (id) byCreator.set(id, [...(byCreator.get(id) || []), row]);
    }

    const recruits: Recruit[] = [];
    for (const [id, unsortedRows] of byCreator) {
      const rows = [...unsortedRows].sort((a, b) => text(a.stat_date).localeCompare(text(b.stat_date)));
      const first = rows[0];
      const last = rows.at(-1)!;
      const firstDays = number(first.days_since_joining || first["Days since joining"]);
      const lastDays = number(last.days_since_joining || last["Days since joining"]);
      const joined = joinedOn(text(first.stat_date), firstDays);
      const isNewRecruit = period === "month" ? joined >= startDate && joined <= endDate : firstDays >= 0 && firstDays <= maxDays;
      if (!isNewRecruit) continue;
      // Early leavers never qualify. A creator who has reached day 15 keeps their
      // recruitment credit and diamonds even if they disappear on a later upload.
      if (lastDays < 15 && (hasQuitNetwork(last) || !activeCreatorIds.has(id))) continue;

      const sourceManagerKey = managerIdentity(managerRaw(first));
      const managerKey = isKjbManager(sourceManagerKey) ? KJB_TEAM_KEY : sourceManagerKey;
      if (!sourceManagerKey || deleted.has(sourceManagerKey) || isExcludedManager(sourceManagerKey)) continue;
      const diamonds = rows.reduce((sum, row) => sum + number(row.diamonds || row.Diamonds), 0);
      const hours = rows.reduce((sum, row) => sum + number(row.live_hours || row["Live hours"]), 0);
      recruits.push({
        id,
        username: username(last) || username(first) || id,
        joined,
        managerKey,
        manager: isKjbManager(sourceManagerKey) ? KJB_TEAM_NAME : nameForManager(sourceManagerKey) || label(managerRaw(first)),
        group: isKjbManager(sourceManagerKey) ? KJB_TEAM_GROUP : groupForManager(sourceManagerKey),
        diamonds,
        hours,
        dph: hours ? Math.round(diamonds / hours) : 0,
      });
    }

    recruits.sort((a, b) => b.diamonds - a.diamonds || a.username.localeCompare(b.username));
    const managers = new Map<string, { key: string; manager: string; group: string; recruits: number; diamonds: number; hours: number; dph: number }>();
    for (const [savedManager, group] of Object.entries(groups)) {
      const managerKey = managerIdentity(savedManager);
      if (!managerKey || deleted.has(managerKey) || isExcludedManager(managerKey) || isKjbManager(managerKey) || group === "Excluded") continue;
      managers.set(managerKey, { key: managerKey, manager: nameForManager(savedManager) || label(savedManager), group, recruits: 0, diamonds: 0, hours: 0, dph: 0 });
    }
    for (const recruit of recruits) {
      const current = managers.get(recruit.managerKey) || { key: recruit.managerKey, manager: recruit.manager, group: recruit.group, recruits: 0, diamonds: 0, hours: 0, dph: 0 };
      current.recruits += 1;
      current.diamonds += recruit.diamonds;
      current.hours += recruit.hours;
      current.dph = current.hours ? Math.round(current.diamonds / current.hours) : 0;
      managers.set(recruit.managerKey, current);
    }
    const managerList = [...managers.values()].sort((a, b) => b.recruits - a.recruits || a.manager.localeCompare(b.manager));
    return NextResponse.json({ period, startDate, endDate, recruits, managers: managerList, groups: [...new Set(managerList.map((manager) => manager.group))].sort() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load recruitment leaderboard." }, { status: 500 });
  }
}
