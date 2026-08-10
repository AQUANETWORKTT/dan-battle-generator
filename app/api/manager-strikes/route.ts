import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type Strike = { active: boolean; date: string; note: string };
type StrikeState = Record<string, Strike[]>;
const keyFor = (scope: string) => `manager-strikes-${scope.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
const managerKey = (value: unknown) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function normalize(input: unknown): StrikeState {
  if (!input || typeof input !== "object") return {};
  return Object.fromEntries(Object.entries(input as Record<string, unknown>).map(([manager, values]) => [managerKey(manager), Array.from({ length: 3 }, (_, index) => {
    const value = Array.isArray(values) ? values[index] : null;
    return typeof value === "object" && value ? { active: Boolean((value as Strike).active), date: String((value as Strike).date || ""), note: String((value as Strike).note || "") } : { active: Boolean(value), date: "", note: "" };
  })]));
}

export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope") || "";
  if (!scope) return NextResponse.json({ error: "A strike group is required." }, { status: 400 });
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", keyFor(scope)).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ strikes: normalize((data?.template_json as { strikes?: unknown } | null)?.strikes) });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json(); const scope = String(body?.scope || "");
    if (!scope) return NextResponse.json({ error: "A strike group is required." }, { status: 400 });
    const strikes = normalize(body?.strikes);
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: keyFor(scope), template_json: { strikes }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ strikes });
  } catch { return NextResponse.json({ error: "Invalid strike data." }, { status: 400 }); }
}
