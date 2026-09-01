import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "tikleap-live-league-availability";

type Result = { league?: unknown; rank?: unknown; username?: unknown; diamonds?: unknown; diamondText?: unknown; available?: unknown; invitationType?: unknown; reason?: unknown };

function cleanResults(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((row: Result) => {
    const username = String(row?.username || "").trim();
    if (!username || seen.has(username)) return [];
    seen.add(username);
    return [{ league: String(row.league || ""), rank: Number(row.rank || 0), username, diamonds: Number(row.diamonds || 0), diamondText: String(row.diamondText || ""), available: Boolean(row.available), invitationType: String(row.invitationType || ""), reason: String(row.reason || "") }];
  });
}

export async function GET() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.template_json || { results: [], updatedAt: "" });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const results = cleanResults(body?.results);
    const template_json = { results, updatedAt: new Date().toISOString() };
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json, background_url: null, updated_at: template_json.updatedAt }, { onConflict: "name" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(template_json);
  } catch { return NextResponse.json({ error: "Invalid availability results." }, { status: 400 }); }
}
