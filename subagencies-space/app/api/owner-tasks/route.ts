import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const agencies = new Set(["paradise", "respawn", "horizon", "trident"]);
type Task = { id: string; description: string; assignee: string; creator: string; dueDate: string; dueTime: string; highPriority: boolean; createdAt: string };

function key(agency: string) { return `sub-owner-tasks-${agency}`; }
function normalize(input: unknown): Task[] {
  const items = Array.isArray(input) ? input : [];
  return items.flatMap((item) => { const row = item as Record<string, unknown>; const description = String(row.description || "").trim(); if (!description) return []; return [{ id: String(row.id || crypto.randomUUID()), description, assignee: String(row.assignee || "OWNER"), creator: String(row.creator || ""), dueDate: String(row.dueDate || ""), dueTime: String(row.dueTime || ""), highPriority: Boolean(row.highPriority), createdAt: String(row.createdAt || new Date().toISOString()) }]; }).sort((a, b) => Number(b.highPriority) - Number(a.highPriority) || `${a.dueDate || "9999-12-31"}T${a.dueTime || "23:59"}`.localeCompare(`${b.dueDate || "9999-12-31"}T${b.dueTime || "23:59"}`));
}

export async function GET(request: Request) {
  const agency = new URL(request.url).searchParams.get("agency")?.toLowerCase() || "";
  if (!agencies.has(agency)) return NextResponse.json({ error: "Unknown agency." }, { status: 400 });
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", key(agency)).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: normalize((data?.template_json as { tasks?: unknown } | null)?.tasks) });
}

export async function PUT(request: Request) {
  const body = await request.json(); const agency = String(body?.agency || "").toLowerCase();
  if (!agencies.has(agency)) return NextResponse.json({ error: "Unknown agency." }, { status: 400 });
  const tasks = normalize(body?.tasks);
  const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: key(agency), template_json: { tasks }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks });
}
