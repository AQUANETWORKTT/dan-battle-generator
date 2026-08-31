import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const NAME = "data-space-notepad";
const MAX_LENGTH = 50_000;

function note(value: unknown) {
  return typeof value === "string" ? value.slice(0, MAX_LENGTH) : "";
}

export async function GET() {
  try {
    const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json,updated_at").eq("name", NAME).maybeSingle();
    if (error) throw Error(error.message);
    return NextResponse.json({ note: note(data?.template_json?.note), updatedAt: data?.updated_at || null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load notepad." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (typeof body?.note !== "string") return NextResponse.json({ error: "INVALID NOTEPAD CONTENT." }, { status: 400 });
    const updatedAt = new Date().toISOString();
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: NAME, template_json: { note: note(body.note) }, background_url: null, updated_at: updatedAt }, { onConflict: "name" });
    if (error) throw Error(error.message);
    return NextResponse.json({ note: note(body.note), updatedAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save notepad." }, { status: 500 });
  }
}
