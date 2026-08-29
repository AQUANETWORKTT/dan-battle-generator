import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const NAME = "todo-calendar-settings";
type Job = { id: string; date: string; title: string; description: string; completed: boolean; createdAt: string };

function clean(value: unknown): Job | null {
  if (!value || typeof value !== "object") return null;
  const job = value as Record<string, unknown>;
  const id = String(job.id || "").trim(), date = String(job.date || "").trim(), title = String(job.title || "").trim();
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !title) return null;
  return { id, date, title: title.slice(0, 160), description: String(job.description || "").trim().slice(0, 2000), completed: job.completed === true, createdAt: typeof job.createdAt === "string" && job.createdAt ? job.createdAt : new Date().toISOString() };
}

export async function GET() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", NAME).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  const rawJobs = data?.template_json?.jobs;
  const jobs = Array.isArray(rawJobs) ? rawJobs.map(clean).filter((job): job is Job => job !== null) : [];
  return NextResponse.json({ jobs }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.jobs)) return NextResponse.json({ error: "INVALID JOBS." }, { status: 400 });
    const rawJobs: unknown[] = body.jobs;
    const jobs = rawJobs.map(clean).filter((job): job is Job => job !== null);
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: NAME, template_json: { jobs }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ jobs }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "INVALID REQUEST." }, { status: 400 }); }
}
