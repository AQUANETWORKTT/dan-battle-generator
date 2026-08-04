import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const NAME = "events-archive-status";

export async function GET() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", NAME).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const archived = Array.isArray((data?.template_json as { archived?: unknown[] } | null)?.archived) ? (data?.template_json as { archived: unknown[] }).archived.map(String) : [];
  return NextResponse.json({ archived });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const archived = Array.isArray(body?.archived) ? body.archived.map(String) : [];
  const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: NAME, template_json: { archived }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ archived });
}
