import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const NAME = "event-planner-settings";

export async function GET() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", NAME).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: Array.isArray(data?.template_json?.events) ? data.template_json.events : [] });
}

export async function PUT(request: Request) {
  const { events } = await request.json();
  if (!Array.isArray(events)) return NextResponse.json({ error: "INVALID EVENTS." }, { status: 400 });
  const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: NAME, template_json: { events }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events });
}
