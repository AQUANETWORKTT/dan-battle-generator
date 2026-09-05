import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "incremental-data-tracking-2026-09";

type Entry = {
  day: number;
  diamonds: number;
  prediction: number;
  targetLabel: string;
  savedAt: string;
};

function normalize(input: unknown): Entry[] {
  if (!Array.isArray(input)) return [];
  const byDay = new Map<number, Entry>();
  for (const item of input) {
    const row = item as Record<string, unknown>;
    const day = Number(row.day);
    const diamonds = Number(row.diamonds);
    const prediction = Number(row.prediction);
    if (!Number.isInteger(day) || day < 1 || day > 30 || !Number.isFinite(diamonds) || diamonds < 0 || !Number.isFinite(prediction)) continue;
    byDay.set(day, { day, diamonds, prediction, targetLabel: String(row.targetLabel || ""), savedAt: String(row.savedAt || new Date().toISOString()) });
  }
  return [...byDay.values()].sort((a, b) => a.day - b.day);
}

export async function GET() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: normalize((data?.template_json as Record<string, unknown> | null)?.entries) });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const entries = normalize(body?.entries);
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: { entries }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "INVALID INCREMENTAL TRACKING DATA." }, { status: 400 });
  }
}
