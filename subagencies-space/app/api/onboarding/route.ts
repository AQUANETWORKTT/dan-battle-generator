import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

const clean = (value: unknown) => String(value || "").trim();
const managerKey = (row: Record<string, unknown>) => clean(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email).toLowerCase().replace(/[^a-z0-9]/g, "");
const username = (row: Record<string, unknown>) => clean(row.creator_username || row["Creator's username"]).replace(/^@/, "").toLowerCase();
const inferredAgency = (row: Record<string, unknown>) => {
  const source = clean(row.group_name || row.team || row.agency).toLowerCase();
  return ["paradise", "respawn", "horizon", "trident"].find((name) => source.includes(name)) || "";
};

export async function GET(request: Request) {
  const manager = new URL(request.url).searchParams.get("manager") || "";
  const agency = new URL(request.url).searchParams.get("agency") || "";
  const { data: settings } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", "manager-assignment-settings").maybeSingle();
  const assignments = ((settings?.template_json as { assignments?: { managerGroups?: Record<string, string>; managerNames?: Record<string, string> } } | null)?.assignments || {});
  const groups = assignments.managerGroups || {};
  const names = assignments.managerNames || {};
  const { data: latest, error: latestError } = await submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1).maybeSingle();
  const latestDate = clean(latest?.stat_date);
  if (latestError || !latestDate) return NextResponse.json({ error: latestError?.message || "No recent export found." }, { status: 500 });
  const start = new Date(`${latestDate}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 14);
  // Supabase returns at most 1,000 rows per request. A 14-day export is larger,
  // so paginate it; otherwise recently-added creators can vanish at random.
  const data: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: page, error } = await submissionsSupabase.from("creator_daily_stats").select("*").gte("stat_date", start.toISOString().slice(0, 10)).lte("stat_date", latestDate).range(offset, offset + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    data.push(...((page || []) as Record<string, unknown>[]));
    if (!page || page.length < 1000) break;
  }
  const latestByCreator = new Map<string, Record<string, unknown>>();
  const diamondsByCreator = new Map<string, number>();
  for (const row of data) {
    const key = managerKey(row);
    if (manager && key !== manager) continue;
    // Use the assignment first. Older assignments did not persist every group,
    // so their export's sub-agency is a safe fallback until they are saved again.
    const assignedAgency = groups[key]?.toLowerCase() || inferredAgency(row);
    if (agency && assignedAgency !== agency.toLowerCase()) continue;
    // Recruiter accounts are rolled into their owner for data, but never belong
    // in a manager or owner onboarding list themselves.
    if ((names[key] || "").includes(" - ")) continue;
    const name = username(row); if (!name) continue;
    diamondsByCreator.set(name, (diamondsByCreator.get(name) || 0) + Number(row.diamonds || 0));
    const days = Number(row.days_since_joining || row["Days since joining"] || 0);
    // The export uses day 0 for a creator who joined today, so include it.
    // Keep unconfirmed creators visible beyond the original two-week window.
    if (days < 0 || days > 30) continue;
    const previous = latestByCreator.get(name);
    if (!previous || clean(row.stat_date) > clean(previous.stat_date)) latestByCreator.set(name, row);
  }
  return NextResponse.json({ latestDate, creators: [...latestByCreator.values()].map((row) => ({ username: username(row), daysSinceJoining: Number(row.days_since_joining || row["Days since joining"] || 0), diamonds: diamondsByCreator.get(username(row)) || 0, managerKey: managerKey(row), manager: names[managerKey(row)] || managerKey(row) })) });
}
