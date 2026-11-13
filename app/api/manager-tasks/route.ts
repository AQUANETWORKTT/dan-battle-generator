import { NextRequest, NextResponse } from "next/server";
import { SEARCH_COOKIE, searchSessionValid } from "@/lib/creator-api-search/auth";
import { accountForSession, managerAndJuniorKeys, MANAGER_COOKIE } from "@/lib/manager-portal";
import { fullManagerAccess } from "@/lib/manager-portal-mode";
import { database } from "@/lib/creator-api-search/db";

const NAME = "manager-task-completions-v1";
type Task = { id: string; managerKey: string; completed: boolean; completedAt?: string };

async function tasks() {
  const result = await database().from("poster_templates").select("template_json").eq("name", NAME).maybeSingle();
  if (result.error) throw Error(result.error.message);
  const records = result.data?.template_json?.records;
  return Array.isArray(records) ? records.filter((task): task is Task => task && typeof task.id === "string" && typeof task.managerKey === "string" && typeof task.completed === "boolean") : [];
}
async function save(records: Task[]) {
  const result = await database().from("poster_templates").upsert({ name: NAME, template_json: { records }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
  if (result.error) throw Error(result.error.message);
}

async function handle(request: NextRequest) {
  const owner = searchSessionValid(request.cookies.get(SEARCH_COOKIE)?.value);
  const account = owner ? null : await accountForSession(request.cookies.get(MANAGER_COOKIE)?.value);
  const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
  if (!owner && !fullManagerAccess(account)) return json({ error: "Please sign in." }, 401);
  try {
    const managedKeys = owner ? null : new Set(await managerAndJuniorKeys(account!.manager_key));
    const all = await tasks();
    if (request.method === "GET") return json({ records: all.filter((task) => owner || managedKeys!.has(task.managerKey)) });
    const body = await request.json();
    if (typeof body.id !== "string" || typeof body.managerKey !== "string" || typeof body.completed !== "boolean" || !/^(profile|app-link):/.test(body.id)) return json({ error: "Invalid task." }, 400);
    if (!owner && !managedKeys!.has(body.managerKey)) return json({ error: "Not allowed." }, 403);
    const record: Task = { id: body.id, managerKey: body.managerKey, completed: body.completed, ...(body.completed ? { completedAt: new Date().toISOString() } : {}) };
    const next = [...all.filter((task) => !(task.id === record.id && task.managerKey === record.managerKey)), record];
    await save(next);
    return json({ records: next.filter((task) => owner || managedKeys!.has(task.managerKey)) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not save task." }, 400);
  }
}
export const GET = handle;
export const POST = handle;
