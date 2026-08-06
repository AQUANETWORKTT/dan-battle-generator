import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const agencies = new Set(["paradise", "respawn", "horizon", "trident"]);
type Task = { id: string; description: string; assignee: "OWN TASK" | "OWNER"; creator: string; dueDate: string; dueTime: string; highPriority: boolean; createdAt: string; forwardedToOwner?: boolean };
const clean = (value: unknown) => String(value || "").trim();
const managerKey = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const privateKey = (agency: string, manager: string) => `sub-manager-tasks-${agency}-${managerKey(manager)}`;
const ownerKey = (agency: string) => `sub-owner-tasks-${agency}`;

function normalize(input: unknown): Task[] {
  return (Array.isArray(input) ? input : []).flatMap((item) => {
    const row = item as Record<string, unknown>;
    const description = clean(row.description);
    if (!description) return [];
    return [{ id: clean(row.id) || crypto.randomUUID(), description, assignee: clean(row.assignee) === "OWNER" ? "OWNER" : "OWN TASK", creator: clean(row.creator), dueDate: clean(row.dueDate), dueTime: clean(row.dueTime), highPriority: Boolean(row.highPriority), createdAt: clean(row.createdAt) || new Date().toISOString(), forwardedToOwner: Boolean(row.forwardedToOwner) }];
  });
}

async function readTasks(name: string) {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", name).maybeSingle();
  if (error) throw new Error(error.message);
  return normalize((data?.template_json as { tasks?: unknown } | null)?.tasks);
}

export async function GET(request: Request) {
  const url = new URL(request.url); const agency = clean(url.searchParams.get("agency")).toLowerCase(); const manager = clean(url.searchParams.get("manager"));
  if (!agencies.has(agency) || !manager) return NextResponse.json({ error: "Unknown manager task space." }, { status: 400 });
  try { return NextResponse.json({ tasks: await readTasks(privateKey(agency, manager)) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load tasks." }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json(); const agency = clean(body?.agency).toLowerCase(); const manager = clean(body?.manager); let tasks = normalize(body?.tasks);
    if (!agencies.has(agency) || !manager) return NextResponse.json({ error: "Unknown manager task space." }, { status: 400 });
    const outgoing = tasks.filter((task) => task.assignee === "OWNER" && !task.forwardedToOwner);
    if (outgoing.length) {
      const ownerTasks = await readTasks(ownerKey(agency));
      const ids = new Set(ownerTasks.map((task) => task.id));
      for (const task of outgoing) if (!ids.has(task.id)) ownerTasks.unshift({ ...task, assignee: "OWNER", creator: task.creator || manager, forwardedToOwner: true, sourceManager: manager, sourceManagerLabel: clean(body?.managerLabel) } as Task & { sourceManager: string; sourceManagerLabel: string });
      const { error: ownerError } = await submissionsSupabase.from("poster_templates").upsert({ name: ownerKey(agency), template_json: { tasks: ownerTasks }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
      if (ownerError) throw new Error(ownerError.message);
      tasks = tasks.map((task) => task.assignee === "OWNER" ? { ...task, forwardedToOwner: true } : task);
    }
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: privateKey(agency, manager), template_json: { tasks }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ tasks });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save tasks." }, { status: 500 }); }
}
