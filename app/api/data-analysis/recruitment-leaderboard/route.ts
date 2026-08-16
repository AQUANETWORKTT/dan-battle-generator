import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type AssignmentSettings = { managerGroups?: Record<string, string>; managerNames?: Record<string, string>; deletedManagers?: string[]; ownerManagers?: string[] };
const SETTINGS_NAME = "manager-assignment-settings";
const excludedGroups = new Set(["Recruitment", "Excluded"]);

const text = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => Number(text(value).replace(/[^\d.-]/g, "")) || 0;
const key = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const managerKey = (value: unknown) => { const normalized = key(value); return normalized === "ashwalbridge" || normalized.includes("firstclassagencyash") || normalized.includes("firstcoedensash") ? "ashwalbridge" : normalized; };
const managerRaw = (row: Row) => text(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email);
const creatorKey = (row: Row) => {
  const id = text(row.creator_id || row["Creator ID"]);
  return /^\d{8,}$/.test(id) ? id : key(row.creator_username || row["Creator's username"]);
};
const displayName = (raw: string) => {
  if (/(kaybon03|kbon03)/.test(managerKey(raw))) return "Team KJB";
  const local = raw.split("@")[0].replace(/^firstclassagency[_.-]?/i, "").replace(/[_.-]+/g, " ").trim();
  return local ? `Team ${local.split(" ").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ")}` : `Team ${raw}`;
};
const daysSinceJoining = (row: Row) => Number(text(row.days_since_joining || row["Days since joining"]).replace(/[^\d.-]/g, "")) || 0;
function inferredGroup(manager: string) {
  if (/(kaybon03|kbon03)/.test(manager)) return "Team Dan / James";
  if (/(bmwe46320d|zaliheyoncu|firstclassagencykayden|xaramills17|rachellouise18|firstclassagencylauren|liamproctor04|abbidl|kishaunnolan1|calliecrawford14|megan25121990|mikehalesjb)/.test(manager)) return "Team Mike / Indi";
  if (/(cjtokens1237|firstclassagencyabbie|firstclassagencyolivia|sjm20101|firstclassagencypaige|brandyfalconer35|fearnegurry1|demileawebster7|louisesquelch|ashwalbridge|firstclassagencyash|firstclassagencykyran)/.test(manager)) return "Team Dan / James";
  return "";
}
const dateForJoin = (row: Row) => {
  const statDate = text(row.stat_date);
  const days = daysSinceJoining(row);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(statDate) || days < 1) return "";
  const date = new Date(`${statDate}T12:00:00`);
  date.setDate(date.getDate() - (days - 1));
  return date.toISOString().slice(0, 10);
};

export async function GET() {
  try {
    const [{ data: latestRow, error: latestError }, { data: settingsRow, error: settingsError }] = await Promise.all([
      submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1).maybeSingle(),
      submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle(),
    ]);
    if (latestError || settingsError) throw new Error(latestError?.message || settingsError?.message);
    const latestDate = text(latestRow?.stat_date);
    if (!latestDate) return NextResponse.json({ month: "", groups: [], managers: [] });
    const month = latestDate.slice(0, 7);
    const settings = ((settingsRow?.template_json as { assignments?: AssignmentSettings } | null)?.assignments || {});
    const groups = settings.managerGroups || {};
    const names = settings.managerNames || {};
    const deleted = new Set((settings.deletedManagers || []).map(managerKey));
    const owners = new Set((settings.ownerManagers || []).map(managerKey));
    const eligible = Object.entries(groups).filter(([manager, group]) => !deleted.has(managerKey(manager)) && !owners.has(managerKey(manager)) && !excludedGroups.has(group));
    const nameFor = (manager: string) => Object.entries(names).find(([raw]) => managerKey(raw) === manager)?.[1] || displayName(manager);
    const managers = new Map(eligible.map(([manager, group]) => { const canonical = managerKey(manager); return [canonical, { key: canonical, name: nameFor(canonical), group, recruits: 0, diamonds: 0 }]; }));

    const rows: Row[] = [];
    for (let from = 0, more = true; more; from += 1000) {
      const { data, error } = await submissionsSupabase.from("creator_daily_stats").select("*").gte("stat_date", `${month}-01`).lte("stat_date", latestDate).order("stat_date", { ascending: true }).range(from, from + 999);
      if (error) throw new Error(error.message);
      const batch = (data || []) as Row[];
      rows.push(...batch);
      more = batch.length === 1000;
    }

    // A few existing managers were named in Manager Assignments before their
    // group was saved there. Keep those recognised Team Dan/James and Team
    // Mike/Indi managers in this leaderboard, without allowing unrelated raw
    // export managers back in.
    for (const row of rows) {
      const raw = managerRaw(row);
      const manager = managerKey(raw);
      const group = managers.get(manager)?.group || inferredGroup(manager);
      if (!manager || managers.has(manager) || !group || deleted.has(manager) || owners.has(manager)) continue;
      managers.set(manager, { key: manager, name: nameFor(manager), group, recruits: 0, diamonds: 0 });
    }

    // Every historical row from this calendar month is considered, so a
    // recruit remains counted even when they are no longer on today's export.
    const recruits = new Map<string, { managerKey: string; joined: string }>();
    for (const row of rows) {
      const identity = creatorKey(row);
      const manager = managerKey(managerRaw(row));
      const joined = dateForJoin(row);
      if (!identity || !managers.has(manager) || !joined.startsWith(month)) continue;
      const existing = recruits.get(identity);
      if (!existing || joined < existing.joined) recruits.set(identity, { managerKey: manager, joined });
    }
    for (const recruit of recruits.values()) { const manager = managers.get(recruit.managerKey); if (manager) manager.recruits += 1; }
    const rowsByCreator = new Map<string, Row[]>();
    for (const row of rows) { const identity = creatorKey(row); if (identity) rowsByCreator.set(identity, [...(rowsByCreator.get(identity) || []), row]); }
    for (const creatorRows of rowsByCreator.values()) {
      const latest = [...creatorRows].sort((a, b) => text(a.stat_date).localeCompare(text(b.stat_date))).at(-1);
      const manager = latest ? managers.get(managerKey(managerRaw(latest))) : undefined;
      if (manager) manager.diamonds += creatorRows.reduce((sum, row) => sum + number(row.diamonds || row.Diamonds), 0);
    }
    const leaderboard = Array.from(managers.values()).sort((a, b) => b.recruits - a.recruits || a.name.localeCompare(b.name));
    return NextResponse.json({ month, groups: Array.from(new Set(leaderboard.map((manager) => manager.group))).sort(), managers: leaderboard, totalRecruits: recruits.size });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not build the recruitment leaderboard." }, { status: 500 });
  }
}
