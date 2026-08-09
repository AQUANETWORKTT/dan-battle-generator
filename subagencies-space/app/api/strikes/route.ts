import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type StrikeState = Record<string, boolean[]>;
const agencies = new Set(["paradise", "respawn", "horizon", "trident"]);
const managerKey = (value: unknown) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const recordName = (agency: string) => `manager-strikes-sub-${agency}`;
function normalize(input: unknown): StrikeState { if (!input || typeof input !== "object") return {}; return Object.fromEntries(Object.entries(input as Record<string, unknown>).map(([manager, strikes]) => [managerKey(manager), Array.from({ length: 3 }, (_, index) => Boolean(Array.isArray(strikes) && strikes[index]))])); }

export async function GET(request: Request) {
  const agency = new URL(request.url).searchParams.get("agency")?.toLowerCase() || "";
  if (!agencies.has(agency)) return NextResponse.json({ error: "Unknown agency." }, { status: 400 });
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", recordName(agency)).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ strikes: normalize((data?.template_json as { strikes?: unknown } | null)?.strikes) });
}

export async function PUT(request: Request) {
  try { const body = await request.json(); const agency = String(body?.agency || "").toLowerCase(); if (!agencies.has(agency)) return NextResponse.json({ error: "Unknown agency." }, { status: 400 }); const strikes = normalize(body?.strikes); const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: recordName(agency), template_json: { strikes }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" }); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ strikes }); } catch { return NextResponse.json({ error: "Invalid strike data." }, { status: 400 }); }
}
