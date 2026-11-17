import { NextRequest, NextResponse } from "next/server";
import {
  SEARCH_COOKIE,
  searchSessionValid,
} from "@/lib/creator-api-search/auth";
import {
  accountForSession,
  managerAndJuniorKeys,
  MANAGER_COOKIE,
} from "@/lib/manager-portal";
import { fullManagerAccess } from "@/lib/manager-portal-mode";
import { database } from "@/lib/creator-api-search/db";
import { randomUUID } from "node:crypto";

const NAME = "manager-task-completions-v1";
type Task = {
  id: string;
  managerKey: string;
  completed: boolean;
  completedAt?: string;
};
type CustomTask = {
  id: string;
  text: string;
  scope: "manager" | "master";
  managerKey?: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

async function tasks() {
  const result = await database()
    .from("poster_templates")
    .select("template_json")
    .eq("name", NAME)
    .maybeSingle();
  if (result.error) throw Error(result.error.message);
  const records = result.data?.template_json?.records;
  const customTasks = result.data?.template_json?.customTasks;
  return {
    records: Array.isArray(records)
      ? records.filter(
          (task): task is Task =>
            task &&
            typeof task.id === "string" &&
            typeof task.managerKey === "string" &&
            typeof task.completed === "boolean",
        )
      : [],
    customTasks: Array.isArray(customTasks)
      ? customTasks.filter(
          (task): task is CustomTask =>
            task &&
            typeof task.id === "string" &&
            typeof task.text === "string" &&
            (task.scope === "manager" || task.scope === "master") &&
            typeof task.completed === "boolean",
        )
      : [],
  };
}
async function save(records: Task[], customTasks: CustomTask[]) {
  const result = await database().from("poster_templates").upsert(
    {
      name: NAME,
      template_json: { records, customTasks },
      background_url: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" },
  );
  if (result.error) throw Error(result.error.message);
}

async function handle(request: NextRequest) {
  const owner = searchSessionValid(request.cookies.get(SEARCH_COOKIE)?.value);
  const account = owner
    ? null
    : await accountForSession(request.cookies.get(MANAGER_COOKIE)?.value);
  const json = (data: unknown, status = 200) =>
    NextResponse.json(data, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  if (!owner && !fullManagerAccess(account))
    return json({ error: "Please sign in." }, 401);
  try {
    const managedKeys = owner
      ? null
      : new Set(await managerAndJuniorKeys(account!.manager_key));
    const all = await tasks();
    const visibleRecords = all.records.filter(
      (task) => owner || managedKeys!.has(task.managerKey),
    );
    const visibleCustom = owner
      ? all.customTasks.filter((task) => task.scope === "master")
      : all.customTasks.filter(
          (task) =>
            (task.scope === "manager" &&
              task.managerKey === account!.manager_key) ||
            (task.scope === "master" &&
              task.managerKey &&
              managedKeys!.has(task.managerKey)),
        );
    if (request.method === "GET")
      return json({ records: visibleRecords, customTasks: visibleCustom });
    const body = await request.json();
    if (body.action === "create-custom") {
      if (
        typeof body.text !== "string" ||
        !body.text.trim() ||
        body.text.length > 500
      )
        return json({ error: "Enter a task up to 500 characters." }, 400);
      if (owner && (typeof body.managerKey !== "string" || !body.managerKey))
        return json({ error: "Choose a manager for this task." }, 400);
      const task: CustomTask = {
        id: `custom:${randomUUID()}`,
        text: body.text.trim(),
        scope: owner ? "master" : "manager",
        managerKey: owner ? body.managerKey : account!.manager_key,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      const next = [...all.customTasks, task];
      await save(all.records, next);
      return json({
        records: visibleRecords,
        customTasks: owner
          ? next.filter((item) => item.scope === "master")
          : next.filter(
              (item) =>
                (item.scope === "manager" &&
                  item.managerKey === account!.manager_key) ||
                (item.scope === "master" &&
                  item.managerKey &&
                  managedKeys!.has(item.managerKey)),
            ),
      });
    }
    if (body.action === "toggle-custom") {
      if (typeof body.id !== "string" || typeof body.completed !== "boolean")
        return json({ error: "Invalid task." }, 400);
      const target = all.customTasks.find((task) => task.id === body.id);
      if (
        !target ||
        (owner
          ? target.scope !== "master"
          : target.scope === "manager"
            ? target.managerKey !== account!.manager_key
            : !target.managerKey || !managedKeys!.has(target.managerKey))
      )
        return json({ error: "Not allowed." }, 403);
      const next = all.customTasks.map((task) =>
        task.id === target.id
          ? {
              ...task,
              completed: body.completed,
              ...(body.completed
                ? { completedAt: new Date().toISOString() }
                : { completedAt: undefined }),
            }
          : task,
      );
      await save(all.records, next);
      return json({
        records: visibleRecords,
        customTasks: owner
          ? next.filter((item) => item.scope === "master")
          : next.filter(
              (item) =>
                (item.scope === "manager" &&
                  item.managerKey === account!.manager_key) ||
                (item.scope === "master" &&
                  item.managerKey &&
                  managedKeys!.has(item.managerKey)),
            ),
      });
    }
    if (
      typeof body.id !== "string" ||
      typeof body.managerKey !== "string" ||
      typeof body.completed !== "boolean" ||
      !/^(profile|app-link):/.test(body.id)
    )
      return json({ error: "Invalid task." }, 400);
    if (!owner && !managedKeys!.has(body.managerKey))
      return json({ error: "Not allowed." }, 403);
    const record: Task = {
      id: body.id,
      managerKey: body.managerKey,
      completed: body.completed,
      ...(body.completed ? { completedAt: new Date().toISOString() } : {}),
    };
    const next = [
      ...all.records.filter(
        (task) =>
          !(task.id === record.id && task.managerKey === record.managerKey),
      ),
      record,
    ];
    await save(next, all.customTasks);
    return json({
      records: next.filter(
        (task) => owner || managedKeys!.has(task.managerKey),
      ),
      customTasks: visibleCustom,
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Could not save task.",
      },
      400,
    );
  }
}
export const GET = handle;
export const POST = handle;
