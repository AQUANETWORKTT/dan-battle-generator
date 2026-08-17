import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "team-dan-target-tracker-settings";

type Settings = {
  targets?: Record<string, { days?: number; hours?: number; diamonds?: number }>;
  deleted?: string[];
};

function clean(settings: unknown): Settings {
  const input = (settings && typeof settings === "object" ? settings : {}) as Settings;
  const targets = Object.fromEntries(Object.entries(input.targets || {}).map(([key, target]) => [key, {
    days: Math.max(0, Number(target?.days) || 0),
    hours: Math.max(0, Number(target?.hours) || 0),
    diamonds: Math.max(0, Number(target?.diamonds) || 0),
  }]));
  return { targets, deleted: Array.isArray(input.deleted) ? input.deleted.map(String) : [] };
}

export async function GET() {
  try {
    const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
    if (error) throw Error(error.message);
    return NextResponse.json({ settings: data?.template_json ? clean(data.template_json) : null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load shared targets." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const settings = clean(await request.json());
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: settings, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) throw Error(error.message);
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save shared targets." }, { status: 500 });
  }
}
