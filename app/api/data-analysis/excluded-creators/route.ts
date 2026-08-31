import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "excluded-creators-settings";
const RESTORED_CREATOR_USERNAMES = new Set(["kayjb3"]);

type ExcludedCreator = { username: string; excludeFromLeaderboards: boolean; hiddenFromDownloads: boolean };

function normalize(items: unknown): ExcludedCreator[] {
  if (!Array.isArray(items)) return [];
  const byUsername = new Map<string, ExcludedCreator>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const value = item as Record<string, unknown>;
    const username = String(value.username || "").replace(/^@/, "").trim().toLowerCase();
    if (!username) continue;
    // This creator was restored to every leaderboard. Ignore an older saved
    // visibility entry so it cannot keep reappearing as an exclusion.
    if (RESTORED_CREATOR_USERNAMES.has(username.replace(/[^a-z0-9]/g, ""))) continue;
    byUsername.set(username, {
      username,
      excludeFromLeaderboards: Boolean(value.excludeFromLeaderboards),
      hiddenFromDownloads: Boolean(value.hiddenFromDownloads),
    });
  }
  return Array.from(byUsername.values()).sort((a, b) => a.username.localeCompare(b.username));
}

export async function GET() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creators: normalize((data?.template_json as Record<string, unknown> | null)?.creators) });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const creators = normalize(body?.creators);
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: { creators }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ creators });
  } catch {
    return NextResponse.json({ error: "Invalid excluded creator settings." }, { status: 400 });
  }
}
