import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const agencies = new Set(["paradise", "respawn", "horizon", "trident"]);
type Task = { id: string; description: string; assignee: "OWNER" | "DF / JD"; creator: string; dueDate: string; dueTime: string; highPriority: boolean; createdAt: string; forwardedToMain?: boolean; sourceAgency?: string; sourceManager?: string; sourceManagerLabel?: string };
const key = (agency: string) => `sub-owner-tasks-${agency}`;

async function notifyMain(task: Task, agency: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN; const chatId = process.env.BATTLE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: ["NEW DF / JD SUB-AGENCY TASK", `AGENCY: ${agency.toUpperCase()}`, `TASK: ${task.description}`, `FOR: ${task.creator || "NOT SPECIFIED"}`, `DUE: ${task.dueDate || "NO DATE"}${task.dueTime ? ` ${task.dueTime}` : ""}`].join("\n") }) });
}

function normalize(input: unknown): Task[] {
  return (Array.isArray(input) ? input : []).flatMap((item) => { const row = item as Record<string, unknown>; const description = String(row.description || "").trim(); if (!description) return []; return [{ id: String(row.id || crypto.randomUUID()), description, assignee: String(row.assignee) === "DF / JD" ? "DF / JD" : "OWNER", creator: String(row.creator || ""), dueDate: String(row.dueDate || ""), dueTime: String(row.dueTime || ""), highPriority: Boolean(row.highPriority), createdAt: String(row.createdAt || new Date().toISOString()), forwardedToMain: Boolean(row.forwardedToMain), sourceAgency: String(row.sourceAgency || ""), sourceManager: String(row.sourceManager || ""), sourceManagerLabel: String(row.sourceManagerLabel || "") }]; });
}

export async function GET(request: Request) { const agency = new URL(request.url).searchParams.get("agency")?.toLowerCase() || ""; if (!agencies.has(agency)) return NextResponse.json({ error: "Unknown agency." }, { status: 400 }); const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", key(agency)).maybeSingle(); return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ tasks: normalize((data?.template_json as { tasks?: unknown } | null)?.tasks) }); }

export async function PUT(request: Request) {
  const body = await request.json(); const agency = String(body?.agency || "").toLowerCase(); if (!agencies.has(agency)) return NextResponse.json({ error: "Unknown agency." }, { status: 400 }); let tasks = normalize(body?.tasks);
  const incomplete = tasks.find((task) => task.assignee === "DF / JD" && !task.creator.trim()); if (incomplete) return NextResponse.json({ error: "ADD WHO THE DF / JD TASK IS FOR." }, { status: 400 });
  const toForward = tasks.filter((task) => task.assignee === "DF / JD" && !task.forwardedToMain);
  if (toForward.length) {
    const { data } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", "agency-task-space").maybeSingle();
    const main = ((data?.template_json as { tasks?: unknown } | null)?.tasks as Record<string, unknown>[] || []); const ids = new Set(main.map((task) => String(task.id)));
    for (const task of toForward) if (!ids.has(task.id)) main.unshift({ ...task, assignee: "JD / DF", complete: false, sourceAgency: agency });
    tasks = tasks.map((task) => task.assignee === "DF / JD" ? { ...task, forwardedToMain: true, sourceAgency: agency } : task);
    const { error: mainError } = await submissionsSupabase.from("poster_templates").upsert({ name: "agency-task-space", template_json: { tasks: main }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (mainError) return NextResponse.json({ error: mainError.message }, { status: 500 });
    await Promise.all(toForward.map((task) => notifyMain(task, agency)));
  }
  const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: key(agency), template_json: { tasks }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ tasks });
}
