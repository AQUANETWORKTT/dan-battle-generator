import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const SETTINGS_NAME = "manager-assignment-settings";
const text = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => Number(text(value).replace(/[^\d.-]/g, "")) || 0;
const key = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]/g, "");
// Manager Assignments can contain an agency address while the daily export
// contains the same manager's Gmail or Outlook address. Their local identity
// is stable, so use it to join the two sources.
const managerIdentity = (value: unknown) => key(value).replace(/(outlook|gmail|mail)com$/, "");
const isExcludedManager = (value: unknown) => managerIdentity(value) === "mikehalesjb";
const managerRaw = (row: Row) => text(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email);
const date = (value: Date) => value.toISOString().slice(0, 10);
const label = (raw: string) => {
  const local = raw.split("@")[0].replace(/^firstclassagency[_.-]?/i, "").replace(/[_.-]+/g, " ").trim();
  return local ? `Team ${local.split(" ").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ")}` : "Unassigned";
};

async function rowsBetween(start: string, end: string) {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await submissionsSupabase.from("creator_daily_stats").select("*").gte("stat_date", start).lte("stat_date", end).or("data_period.is.null,data_period.neq.mature_month_total").range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data || []) as Row[]));
    if (!data || data.length < 1000) return rows;
  }
}

export async function GET() {
  try {
    const [{ data: latest }, { data: settings, error: settingsError }] = await Promise.all([
      submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1).maybeSingle(),
      submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle(),
    ]);
    if (settingsError) throw new Error(settingsError.message);
    const endDate = text(latest?.stat_date);
    if (!endDate) return NextResponse.json({ month: "", groups: [], managers: [] });
    const end = new Date(`${endDate}T12:00:00`);
    const startDate = date(new Date(end.getFullYear(), end.getMonth(), 1, 12));
    const assignments = ((settings?.template_json as { assignments?: { managerGroups?: Record<string, string>; managerNames?: Record<string, string>; deletedManagers?: string[] } } | null)?.assignments || {});
    const savedGroups = assignments.managerGroups || {};
    const savedNames = assignments.managerNames || {};
    const groupForManager = (manager: string) => Object.entries(savedGroups).find(([savedManager]) => managerIdentity(savedManager) === managerIdentity(manager))?.[1] || "Unassigned";
    const nameForManager = (manager: string) => Object.entries(savedNames).find(([savedManager]) => managerIdentity(savedManager) === managerIdentity(manager))?.[1] || "";
    const deleted = new Set((assignments.deletedManagers || []).map(managerIdentity));
    const managers = new Map<string, { key: string; name: string; group: string; diamonds: number }>();

    // Begin with Manager Assignments so group filters always offer the full
    // current roster, including a manager with no diamonds yet this month.
    for (const [savedManager, group] of Object.entries(savedGroups)) {
      const managerKey = managerIdentity(savedManager);
      if (!managerKey || deleted.has(managerKey) || isExcludedManager(managerKey) || group === "Recruitment" || group === "Excluded") continue;
      managers.set(managerKey, { key: managerKey, name: nameForManager(savedManager) || label(savedManager), group, diamonds: 0 });
    }

    for (const row of await rowsBetween(startDate, endDate)) {
      const raw = managerRaw(row), managerKey = managerIdentity(raw);
      if (!managerKey || deleted.has(managerKey) || isExcludedManager(managerKey)) continue;
      const group = groupForManager(managerKey);
      if (group === "Recruitment" || group === "Excluded") continue;
      const current = managers.get(managerKey) || { key: managerKey, name: nameForManager(managerKey) || label(raw), group, diamonds: 0 };
      current.diamonds += number(row.diamonds || row.Diamonds);
      managers.set(managerKey, current);
    }
    const list = [...managers.values()].sort((a, b) => b.diamonds - a.diamonds || a.name.localeCompare(b.name));
    return NextResponse.json({ month: endDate.slice(0, 7), startDate, endDate, groups: [...new Set(list.map((manager) => manager.group))].sort(), managers: list });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load manager totals." }, { status: 500 });
  }
}
