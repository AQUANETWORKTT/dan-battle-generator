import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "agency-task-space";
const ASSIGNMENTS_NAME = "manager-assignment-settings";
type Task = { id: string; description: string; assignee: "JD" | "DF" | "JD / DF"; creator: string; dueDate: string; dueTime: string; highPriority: boolean; complete: boolean; createdAt: string; autoKey?: string };
type AssignmentSettings = { managerGroups?: Record<string, string>; managerNames?: Record<string, string>; assignedAt?: Record<string, string> };
type TemplateRow = { name: string; template_json: { managerKey?: unknown } | null };

function managerKey(value: unknown) { return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function normalize(input: unknown): Task[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item) => {
    const row = item as Record<string, unknown>;
    const description = String(row?.description || "").trim();
    if (!description) return [];
    return [{ id: String(row.id || crypto.randomUUID()), description, assignee: ["JD", "DF", "JD / DF"].includes(String(row.assignee)) ? String(row.assignee) as Task["assignee"] : "JD / DF", creator: String(row.creator || "").trim(), dueDate: String(row.dueDate || ""), dueTime: String(row.dueTime || ""), highPriority: Boolean(row.highPriority), complete: Boolean(row.complete), createdAt: String(row.createdAt || new Date().toISOString()), autoKey: String(row.autoKey || "") || undefined }];
  }).sort((a, b) => Number(a.complete) - Number(b.complete) || Number(b.highPriority) - Number(a.highPriority) || `${a.dueDate || "9999-12-31"}T${a.dueTime || "23:59"}`.localeCompare(`${b.dueDate || "9999-12-31"}T${b.dueTime || "23:59"}`));
}

function taskText(event: "NEW TASK" | "TASK COMPLETED", task: Task) { return [event, `Task: ${task.description}`, `Assigned to: ${task.assignee}`, `For: ${task.creator || "Not specified"}`, `Due: ${task.dueDate || "No date"}${task.dueTime ? ` ${task.dueTime}` : ""}`, `Priority: ${task.highPriority ? "HIGH" : "Normal"}`].join("\n"); }
async function notify(event: "NEW TASK" | "TASK COMPLETED", task: Task) { const token = process.env.TELEGRAM_BOT_TOKEN; const chatId = process.env.BATTLE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID; if (!token || !chatId) return; await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: taskText(event, task) }) }); }

async function addMissingPosterTasks(tasks: Task[]) {
  const [{ data: assignmentRow }, { data: templates }] = await Promise.all([
    submissionsSupabase.from("poster_templates").select("template_json").eq("name", ASSIGNMENTS_NAME).maybeSingle(),
    submissionsSupabase.from("poster_templates").select("name,template_json").like("name", "team-poster-%"),
  ]);
  const settings = ((assignmentRow?.template_json as { assignments?: AssignmentSettings } | null)?.assignments || {});
  const groups = settings.managerGroups || {};
  const names = settings.managerNames || {};
  const assignedAt = settings.assignedAt || {};
  const savedTemplateManagers = new Set(
    ((templates || []) as TemplateRow[])
      .map((template) => managerKey(template.template_json?.managerKey))
      .filter(Boolean)
  );
  const excludedGroups = new Set(["Excluded", "Recruitment", "New Managers"]);
  const existingAutoTasks = new Set(tasks.map((task) => task.autoKey).filter(Boolean));
  const additions = Object.entries(groups).flatMap(([rawKey, group]) => {
    const key = managerKey(rawKey);
    const timestamp = assignedAt[key] || assignedAt[rawKey];
    if (!timestamp || excludedGroups.has(group) || savedTemplateManagers.has(key)) return [];
    const autoKey = `missing-poster:${key}:${timestamp}`;
    if (existingAutoTasks.has(autoKey)) return [];
    const name = names[key] || names[rawKey] || `Team ${rawKey}`;
    return [{ id: crypto.randomUUID(), description: `ADD NEW POSTER FOR ${name}`, assignee: "JD" as const, creator: `DATA SOURCE: ${rawKey} · ${group}`, dueDate: "", dueTime: "", highPriority: false, complete: false, createdAt: new Date().toISOString(), autoKey }];
  });
  return additions.length ? [...additions, ...tasks] : tasks;
}

export async function GET() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const tasks = normalize((data?.template_json as Record<string, unknown> | null)?.tasks);
  const nextTasks = await addMissingPosterTasks(tasks);
  if (nextTasks.length !== tasks.length) {
    const { error: saveError } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: { tasks: nextTasks }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
  }
  return NextResponse.json({ tasks: nextTasks });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const tasks = normalize(body?.tasks);
    const { data: current } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
    const previous = new Map(normalize((current?.template_json as Record<string, unknown> | null)?.tasks).map((task) => [task.id, task]));
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: { tasks }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await Promise.all(tasks.flatMap((task) => { const old = previous.get(task.id); if (!old) return [notify(task.complete ? "TASK COMPLETED" : "NEW TASK", task)]; if (!old.complete && task.complete) return [notify("TASK COMPLETED", task)]; return []; }));
    return NextResponse.json({ tasks });
  } catch { return NextResponse.json({ error: "Invalid task settings." }, { status: 400 }); }
}
