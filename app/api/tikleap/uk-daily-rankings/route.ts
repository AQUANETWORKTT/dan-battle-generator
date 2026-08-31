import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "tikleap-uk-daily-rankings";

function dateKey(value: unknown) {
  const date = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function usernames(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((username) => String(username || "").replace(/^@/, "").trim()).filter(Boolean))].slice(0, 99);
}

export async function GET() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const saved = data?.template_json as { date?: unknown; usernames?: unknown } | null;
  return NextResponse.json({ date: dateKey(saved?.date), usernames: usernames(saved?.usernames) });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const date = dateKey(body?.date);
    const rankingUsernames = usernames(body?.usernames);
    if (!date || !rankingUsernames.length) return NextResponse.json({ error: "A ranking date and at least one username are required." }, { status: 400 });
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: { date, usernames: rankingUsernames }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ date, usernames: rankingUsernames });
  } catch {
    return NextResponse.json({ error: "Invalid rankings data." }, { status: 400 });
  }
}
