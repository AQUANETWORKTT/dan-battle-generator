import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const key = (value: unknown) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export async function GET(request: Request) {
  const manager = key(new URL(request.url).searchParams.get("manager"));
  if (!manager) return NextResponse.json({ available: false });
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").like("name", "team-poster-%");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const available = (data || []).some((template) => key((template.template_json as { managerKey?: unknown } | null)?.managerKey) === manager);
  return NextResponse.json({ available });
}
