import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const monthName = (month: string) => `incremental-data-tracking-${month}`;
const validMonth = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
const currentMonth = () => new Date().toISOString().slice(0, 7);

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
    if (!Number.isInteger(day) || day < 1 || day > 31 || !Number.isFinite(diamonds) || diamonds < 0 || !Number.isFinite(prediction)) continue;
    byDay.set(day, { day, diamonds, prediction, targetLabel: String(row.targetLabel || ""), savedAt: String(row.savedAt || new Date().toISOString()) });
  }
  return [...byDay.values()].sort((a, b) => a.day - b.day);
}

export async function GET(request: Request) {
  const requestedMonth = new URL(request.url).searchParams.get("month") || currentMonth();
  if (!validMonth(requestedMonth)) return NextResponse.json({ error: "INVALID MONTH." }, { status: 400 });
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", monthName(requestedMonth)).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: normalize((data?.template_json as Record<string, unknown> | null)?.entries) });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const month = String(body?.month || currentMonth());
    if (!validMonth(month)) return NextResponse.json({ error: "INVALID MONTH." }, { status: 400 });
    const entries = normalize(body?.entries);
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: monthName(month), template_json: { entries }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "INVALID INCREMENTAL TRACKING DATA." }, { status: 400 });
  }
}
