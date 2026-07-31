import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

const SETTINGS_NAME = "manager-assignment-settings";
const GROUPS = ["Team Dan", "Team Mike / Indi", "Exempt", "Trident", "Horizon", "Paradise", "Aqua", "Respawn", "Unassigned", "Excluded"] as const;
const PRESET_EXCLUDED_MANAGER_KEYS = ["jamesaquaagency", "teddie1", "teamalf", "firstclassagencyalf", "firstclassagencydan", "teamdan", "firstclassagencyjenson", "firstclassagencyjacob", "teamjacob", "cscott1232005", "trident125", "firstclassindi", "firstclassagencyindi", "teritilcock1994", "mikehalesjb"];
type Group = (typeof GROUPS)[number];
type CreatorStat = Record<string, unknown>;
type SavedAssignments = { managerGroups: Record<string, Group> };

function clean(value: unknown) { return String(value || "").trim(); }
function key(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9]/g, ""); }
function managerRaw(row: CreatorStat) { return clean(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email); }
function managerName(raw: string) {
  const local = raw.split("@")[0].replace(/^firstclassagency[_.-]?/i, "").replace(/[_.-]?(aquaagency|respawnagency|paradiseagency)$/i, "").replace(/[_.-]+/g, " ").trim();
  return local ? `Team ${local.split(" ").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ")}` : "Unassigned";
}
function defaultGroup(row: CreatorStat): Group {
  const manager = key(managerRaw(row));
  const source = `${row.team || ""} ${row.group_name || ""} ${row.agency || ""}`.toLowerCase();
  if (/(trident125gmailcom|trident125mailcom)/.test(manager) || source.includes("trident")) return "Trident";
  if (/(hannakingismail92|stormlive)/.test(manager) || /(storm|strive|horizon)/.test(source)) return "Horizon";
  if (/(firstclassagencydan|firstclassagencymikeindi|mikeindi)/.test(manager) || source.includes("exempt")) return "Exempt";
  if (/(cjtokens1237|teamalf|firstclassagencyalf|firstclassagencyabbie|firstclassagencyolivia|sjm20101|firstclassagencypaige|jasminabidzane|connorfirstclass|brandyfalconer35|fearnegurry1|demileawebster7|louisesquelch|ashwalbridge|candiceaquaagency|firstclassagencykyran|kbon03|kaybon03)/.test(manager)) return "Team Dan";
  if (/(bmwe46320d|zaliheyoncu|firstclassagencykayden|xaramills17|rachellouise18|firstclassagencylauren|liamproctor04|abbidl|kishaunnolan1|calliecrawford14|megan25121990)/.test(manager)) return "Team Mike / Indi";
  if (source.includes("paradise")) return "Paradise";
  if (source.includes("respawn")) return "Respawn";
  if (source.includes("aqua")) return "Aqua";
  return "Unassigned";
}
function normalize(input: unknown): SavedAssignments {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const managerGroups: Record<string, Group> = {};
  for (const [manager, group] of Object.entries(value.managerGroups as Record<string, unknown> || {})) if (GROUPS.includes(group as Group)) managerGroups[key(manager)] = group as Group;
  return { managerGroups };
}

export async function GET() {
  const { data: settings, error: settingsError } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });
  const assignments = normalize((settings?.template_json as Record<string, unknown> | null)?.assignments);
  const { data: latestRows, error: latestError } = await submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1);
  const statDate = clean(latestRows?.[0]?.stat_date);
  if (latestError || !statDate) return NextResponse.json({ error: latestError?.message || "No uploaded Creator Intelligence data." }, { status: 500 });
  const monthStartDate = `${statDate.slice(0, 7)}-01`;
  const rows: CreatorStat[] = [];
  for (let from = 0, hasMore = true; hasMore; from += 1000) {
    const { data, error } = await submissionsSupabase
      .from("creator_daily_stats")
      .select("*")
      .gte("stat_date", monthStartDate)
      .lte("stat_date", statDate)
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const page = (data || []) as CreatorStat[];
    rows.push(...page);
    hasMore = page.length === 1000;
  }
  const managers = new Map<string, { key: string; name: string; group: Group }>();
  for (const row of rows) {
    const manager = key(managerRaw(row));
    if (manager && !managers.has(manager)) managers.set(manager, { key: manager, name: managerName(managerRaw(row)), group: assignments.managerGroups[manager] || (PRESET_EXCLUDED_MANAGER_KEYS.some((excluded) => manager.includes(excluded)) ? "Excluded" : defaultGroup(row)) });
  }
  for (const [manager, group] of Object.entries(assignments.managerGroups)) if (!managers.has(manager)) managers.set(manager, { key: manager, name: `Team ${manager}`, group });
  const managerList = [...managers.values()].sort((a, b) => a.name.localeCompare(b.name));
  const managerGroups = Object.fromEntries(managerList.map((manager) => [manager.key, manager.group]));
  return NextResponse.json({ statDate, groups: GROUPS, managers: managerList, managerGroups, assignments });
}

export async function PUT(request: Request) {
  try {
    const assignments = normalize((await request.json())?.assignments);
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: { assignments }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ assignments });
  } catch { return NextResponse.json({ error: "Invalid assignment data." }, { status: 400 }); }
}
