// @ts-nocheck
import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS = "leave-requests";
const text = (value: unknown) => String(value || "").trim();
const key = (value: unknown) => text(value).replace(/^@/, "").toLowerCase();
const clean = (value: unknown) => {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { ...record, username: key(record.username) };
};

async function read() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS).maybeSingle();
  if (error) throw new Error(error.message);
  return (Array.isArray(data?.template_json?.records) ? data.template_json.records : []).map(clean).filter((record) => record.username);
}

async function write(records: Record<string, unknown>[]) {
  const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS, template_json: { records }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
  if (error) throw new Error(error.message);
  return records;
}

export async function GET() { try { return NextResponse.json({ records: await read() }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load leave requests." }, { status: 500 }); } }
export async function POST(request: Request) { try { const input = await request.json(); const records = (await read()).filter((record) => record.username !== key(input.username)); return NextResponse.json({ records: await write(records) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not remove leave request." }, { status: 500 }); } }
