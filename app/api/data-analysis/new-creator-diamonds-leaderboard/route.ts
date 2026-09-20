import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

const ASSIGNMENTS_SETTINGS = "manager-assignment-settings";
const LEADERBOARD_SETTINGS = "new-creator-diamonds-leaderboard-settings";
const clean = (value: unknown) => String(value || "").trim();
const key = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const managerIdentity = (value: unknown) => key(value).replace(/(outlook|gmail|mail)com$/, "");
const KJB_MANAGER_IDENTITIES = new Set(["kaybon03", "kaybon03icloudcom", "kbon03", "kban03icloudcom"]);
const label = (raw: string) => {
  const local = raw.split("@")[0].replace(/^firstclassagency[_.-]?/i, "").replace(/[_.-]+/g, " ").trim();
  return local ? `Team ${local.split(" ").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ")}` : "Unassigned";
};

type AssignmentSettings = { managerGroups?: Record<string, string>; managerNames?: Record<string, string>; deletedManagers?: string[] };
type LeaderboardSettings = { diamonds?: Record<string, number> };

export async function GET() {
  try {
    const [{ data: assignmentRow, error: assignmentError }, { data: leaderboardRow, error: leaderboardError }] = await Promise.all([
      submissionsSupabase.from("poster_templates").select("template_json").eq("name", ASSIGNMENTS_SETTINGS).maybeSingle(),
      submissionsSupabase.from("poster_templates").select("template_json").eq("name", LEADERBOARD_SETTINGS).maybeSingle(),
    ]);
    if (assignmentError || leaderboardError) throw new Error(assignmentError?.message || leaderboardError?.message);
    const assignments = ((assignmentRow?.template_json as { assignments?: AssignmentSettings } | null)?.assignments || {});
    const groups = assignments.managerGroups || {};
    const names = assignments.managerNames || {};
    const deleted = new Set((assignments.deletedManagers || []).map(managerIdentity));
    const diamonds = ((leaderboardRow?.template_json as LeaderboardSettings | null)?.diamonds || {});
    const managers = Object.entries(groups)
      .map(([rawManager, group]) => ({ key: managerIdentity(rawManager), name: names[key(rawManager)] || label(rawManager), group }))
      .filter((manager) => manager.key && !KJB_MANAGER_IDENTITIES.has(manager.key) && !deleted.has(manager.key) && manager.group !== "Recruitment" && manager.group !== "Excluded")
      .map((manager) => ({ ...manager, diamonds: Math.max(0, Number(diamonds[manager.key]) || 0) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ groups: [...new Set(managers.map((manager) => manager.group))].sort(), managers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load the new creator diamonds leaderboard." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as LeaderboardSettings;
    const diamonds = Object.fromEntries(Object.entries(body.diamonds || {}).flatMap(([manager, amount]) => {
      const value = Number(amount);
      return managerIdentity(manager) && Number.isFinite(value) && value !== 0 ? [[managerIdentity(manager), Math.max(0, value)]] : [];
    }));
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: LEADERBOARD_SETTINGS, template_json: { diamonds }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ diamonds });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save the new creator diamond values." }, { status: 400 });
  }
}
