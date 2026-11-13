import "server-only";
import { randomUUID } from "node:crypto";
import { database } from "./creator-api-search/db";

const NAME = "manager-shared-notes-v1";
export type ManagerNote = { id: string; managerKey: string; manager: string; title: string; body: string; createdAt: string };

export async function managerNotes() {
  const result = await database().from("poster_templates").select("template_json").eq("name", NAME).maybeSingle();
  if (result.error) throw Error(result.error.message);
  const records = result.data?.template_json?.records;
  return Array.isArray(records) ? records.filter((note): note is ManagerNote => note && typeof note.id === "string" && typeof note.managerKey === "string" && typeof note.title === "string" && typeof note.body === "string") : [];
}
export async function addManagerNote(input: Omit<ManagerNote, "id" | "createdAt">) {
  const record: ManagerNote = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  const notes = [...(await managerNotes()), record];
  const result = await database().from("poster_templates").upsert({ name: NAME, template_json: { records: notes }, background_url: null, updated_at: record.createdAt }, { onConflict: "name" });
  if (result.error) throw Error(result.error.message);
  return record;
}
