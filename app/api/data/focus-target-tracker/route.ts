import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "focus-target-tracker-settings";

function clean(value: unknown) {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { selected: Array.isArray(input.selected) ? [...new Set(input.selected.map((name) => String(name).trim().replace(/^@/, "").toLowerCase()).filter(Boolean))] : [] };
}

export async function GET() {
  try {
    const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
    if (error) throw Error(error.message);
    return NextResponse.json({ settings: clean(data?.template_json) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load focus creators." }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const settings = clean(await request.json());
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: settings, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) throw Error(error.message);
    return NextResponse.json({ settings });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save focus creators." }, { status: 500 }); }
}
