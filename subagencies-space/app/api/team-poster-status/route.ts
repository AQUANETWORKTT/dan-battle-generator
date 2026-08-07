import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const key = (value: unknown) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const LISA_G_MANAGER_IDENTITIES = ["georgialilyglow", "georgialillyglow", "lisaruss1988"];

export async function GET(request: Request) {
  const manager = key(new URL(request.url).searchParams.get("manager"));
  if (!manager) return NextResponse.json({ available: false, posterLabel: "" });
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").like("name", "team-poster-%");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Team G and Team Lisa deliberately share one Team Gee poster. Georgia's
  // current source uses the double-l spelling, so an exact email comparison
  // incorrectly reported that the saved combined poster did not exist.
  const isLisaG = LISA_G_MANAGER_IDENTITIES.some((identity) => manager.includes(identity));
  const available = (data || []).some((template) => {
    const templateManager = key((template.template_json as { managerKey?: unknown } | null)?.managerKey);
    return templateManager === manager || (templateManager === "combinedlisag" && isLisaG);
  });
  return NextResponse.json({ available, posterLabel: isLisaG ? "Team Gee" : "" });
}
