import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type CreatorStat = Record<string, unknown> & { stat_date?: string | null };
type ManagerAssignments = Record<string, string>;
const SETTINGS_NAME = "manager-assignment-settings";

const MANAGER_LABELS: Record<string, string> = {
  "firstclassagency_dan@outlook.com": "Dan",
  "firstclassagency_chris@outlook.com": "Chris",
  "firstclassagency_dylan@outlook.com": "Dylan",
  "firstclassagency_luke@outlook.com": "Luke",
  "firstclassagency_ellie@outlook.com": "Ellie",
};

const FIRST_CLASS_MANAGER_CONFIG: Record<string, { name: string; group: string }> = {
  jamesaquaagency: { name: "James", group: "Team Dan" }, cjtokens1237: { name: "CJ", group: "Team Dan" },
  teamalf: { name: "Alf", group: "Team Dan" }, firstclassagencyalf: { name: "Alf", group: "Team Dan" },
  firstclassagencyabbie: { name: "Abbie", group: "Team Dan" }, firstclassagencyolivia: { name: "Liv", group: "Team Dan" },
  sjm20101: { name: "Steven", group: "Team Dan" }, firstclassagencypaige: { name: "Paige", group: "Team Dan" },
  jasminabidzane: { name: "Jasmina", group: "Team Dan" }, connorfirstclass: { name: "Connor", group: "Team Dan" },
  brandyfalconer35: { name: "Brandy", group: "Team Dan" }, fearnegurry1: { name: "Fearne", group: "Team Dan" },
  demileawebster7: { name: "Demi", group: "Team Dan" }, louisesquelch: { name: "Louise", group: "Team Dan" },
  ashwalbridge: { name: "Ash", group: "Team Dan" }, candiceaquaagency: { name: "Candice", group: "Team Dan" }, firstclassagencykyran: { name: "Kyran", group: "Team Dan" },
  bmwe46320d: { name: "Madz", group: "Team Mike / Indi" }, zaliheyoncu: { name: "Zalihe", group: "Team Mike / Indi" },
  firstclassagencykayden: { name: "Kayden", group: "Team Mike / Indi" }, xaramills17: { name: "Xara", group: "Team Mike / Indi" },
  rachellouise18: { name: "Rach", group: "Team Mike / Indi" }, firstclassagencylauren: { name: "Lauren", group: "Team Mike / Indi" },
  liamproctor04: { name: "Liam", group: "Team Mike / Indi" }, abbidl: { name: "Abbi", group: "Team Mike / Indi" },
  kishaunnolan1: { name: "Kash", group: "Team Mike / Indi" }, calliecrawford14: { name: "Callie", group: "Team Mike / Indi" },
  megan25121990: { name: "Megan", group: "Team Mike / Indi" }, hannakingismail92: { name: "Hanna", group: "Team Horizon" },
  stormlive: { name: "Denz", group: "Team Horizon" },
};

function cleanText(value: unknown) { return String(value || "").trim(); }
function normalize(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function hasKey(value: string, keys: string[]) { const clean = normalize(value); return keys.some((key) => clean.includes(key)); }
function titleCase(value: string) { return value.split(/[\s._-]+/).filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase()).join(" "); }
function getText(row: CreatorStat, keys: string[]) { return keys.map((key) => cleanText(row[key])).find(Boolean) || ""; }
function getManagerRaw(row: CreatorStat) { return getText(row, ["manager_email", "creator_network_manager", "Creator Network manager", "email"]); }
function getCreatorKey(row: CreatorStat) {
  const creatorId = getText(row, ["creator_id", "Creator ID"]);
  return /^\d{10,}$/.test(creatorId) ? creatorId : getText(row, ["creator_username", "Creator's username"]).toLowerCase();
}

function getManagerLabel(raw: string, group = "") {
  const clean = raw.replace(/\[|\]/g, "").replace(/\(mailto:|\)/g, "").trim().toLowerCase();
  if (MANAGER_LABELS[clean]) return `Team ${MANAGER_LABELS[clean]}`;
  if (clean.includes("@")) return `Team ${titleCase(clean.split("@")[0].replace(/_?(aqua|respawn|paradise|storm|strive)?agency$/i, "").replace(/respawn\d*$/i, "").replace(/jb$/i, ""))}`;
  if (clean) return `Team ${titleCase(clean)}`;
  return group.toLowerCase().startsWith("team ") ? group : "Unassigned";
}

function getCreatorIntelligenceManagerLabel(row: CreatorStat, managerAssignments: ManagerAssignments = {}) {
  const raw = getManagerRaw(row);
  const group = getText(row, ["team", "group_name", "Group"]) || "Unassigned";
  const base = getManagerLabel(raw, group);
  const details = `${raw} ${base}`;
  const assignedGroup = managerAssignments[normalize(raw)];
  if (assignedGroup === "Team Dan" || assignedGroup === "Team Mike / Indi") {
    return `${base} (First Class — ${assignedGroup})`;
  }
  if (hasKey(details, ["firstclassagencydan", "jamesaquaagency"])) return "Team Dan (First Class — Team Dan)";
  if (hasKey(details, ["firstclassagencymikeindi", "mikeindi"])) return "Team Mike / Indi (First Class — Team Mike / Indi)";
  const configKey = Object.keys(FIRST_CLASS_MANAGER_CONFIG).find((key) => hasKey(details, [key]));
  const config = configKey ? FIRST_CLASS_MANAGER_CONFIG[configKey] : undefined;
  if (config) return `Team ${config.name} (First Class — ${config.group})`;
  if (hasKey(details, ["hannakingismail92", "stormlive"])) return `${base} (Horizon)`;
  return base;
}

function toDateValue(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

export async function GET() {
  try {
    const { data: settings, error: settingsError } = await submissionsSupabase
      .from("poster_templates")
      .select("template_json")
      .eq("name", SETTINGS_NAME)
      .maybeSingle();
    if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });
    const savedAssignments = (settings?.template_json as { assignments?: { managerGroups?: ManagerAssignments } } | null)?.assignments?.managerGroups || {};
    const managerAssignments = Object.fromEntries(
      Object.entries(savedAssignments).map(([manager, group]) => [normalize(manager), group])
    );
    const { data: newest, error: newestError } = await submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1).maybeSingle();
    const latestDate = cleanText(newest?.stat_date);
    if (newestError) return NextResponse.json({ error: newestError.message }, { status: 500 });
    if (!latestDate) return NextResponse.json({ statDate: "", managers: [] });

    const latest = new Date(`${latestDate}T12:00:00`);
    latest.setDate(latest.getDate() - 29);
    const rows: CreatorStat[] = [];
    for (let from = 0, hasMore = true; hasMore; from += 1000) {
      const { data, error } = await submissionsSupabase.from("creator_daily_stats").select("*").gte("stat_date", toDateValue(latest)).lte("stat_date", latestDate).order("stat_date", { ascending: true }).range(from, from + 999);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const batch = (data || []) as CreatorStat[];
      rows.push(...batch);
      hasMore = batch.length === 1000;
    }

    const latestByCreator = new Map<string, CreatorStat>();
    for (const row of rows) { const key = getCreatorKey(row); if (key) latestByCreator.set(key, row); }
    const managers = Array.from(latestByCreator.values()).map((row) => ({ manager_key: getManagerRaw(row), manager_label: getCreatorIntelligenceManagerLabel(row, managerAssignments) })).filter((manager) => manager.manager_key && manager.manager_label !== "Unassigned");

    return NextResponse.json({ statDate: latestDate, managers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load manager sources." }, { status: 500 });
  }
}
