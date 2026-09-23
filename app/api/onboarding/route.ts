import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

const RECORD = "first-class-onboarding-workspace";
const TESTING_START = "2026-09-20";
type Row = Record<string, unknown>;
type Entry = { id: string; username: string; manager: string; group: string; days: number; diamonds: number; joinedDate: string; checklist: boolean[]; status: "pending" | "onboarded" | "complete"; onboardedAt?: string; completedAt?: string };
const text = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const identity = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const username = (row: Row) => text(row.creator_username || row["Creator's username"] || row.username).replace(/^@/, "");
const creatorId = (row: Row) => text(row.creator_id || row["Creator ID"] || username(row));
const managerRaw = (row: Row) => text(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email);
const dayCount = (row: Row) => number(row.days_since_joining || row["Days since joining"]);
const diamonds = (row: Row) => number(row.diamonds || row.Diamonds);
const date = (value: Date) => value.toISOString().slice(0, 10);
const joinedDate = (snapshot: string, days: number) => { const value = new Date(`${snapshot}T12:00:00`); value.setDate(value.getDate() - Math.max(0, days)); return date(value); };
const isQuit = (row: Row) => JSON.stringify(row).toLowerCase().includes("creator has quit the network");
const CHECKLIST_LENGTH = 21;
const emptyChecklist = () => Array.from({ length: CHECKLIST_LENGTH }, () => false);

function readEntries(value: unknown): Record<string, Entry> {
  const entries = value && typeof value === "object" ? (value as { entries?: unknown }).entries : {};
  if (!entries || typeof entries !== "object") return {};
  return Object.fromEntries(Object.entries(entries as Record<string, Partial<Entry>>).flatMap(([id, entry]) => {
    if (!entry || !text(entry.username)) return [];
    return [[id, { id, username: text(entry.username), manager: text(entry.manager), group: text(entry.group), days: number(entry.days), diamonds: number(entry.diamonds), joinedDate: text(entry.joinedDate), checklist: Array.from({ length: CHECKLIST_LENGTH }, (_, index) => Boolean(entry.checklist?.[index])), status: entry.status === "complete" ? "complete" : entry.status === "onboarded" ? "onboarded" : "pending", onboardedAt: text(entry.onboardedAt), completedAt: text(entry.completedAt) }]];
  }));
}

function firstClass(row: Row, groups: Record<string, string>) {
  const manager = managerRaw(row);
  const group = Object.entries(groups).find(([key]) => identity(key) === identity(manager))?.[1] || "";
  if (/^team dan( \/ james)?$/i.test(group) || /^(firstclassagency(dan|james)|teamdan|teamjames)$/.test(identity(manager))) return false;
  return /^(team (dan|james|mike|indi|andy)|first class)/i.test(group) || /^(firstclassagencydan|mikehalesjb|firstclassagency.*(james|andy|mike|indi))/.test(identity(manager));
}

const isDanJamesRecord = (entry: Entry) => /^team dan( \/ james)?$/i.test(entry.group) || /^(firstclassagency(dan|james)|teamdan|teamjames)$/.test(identity(entry.manager));

function creator(row: Row, snapshot: string, groups: Record<string, string>, names: Record<string, string>): Entry {
  const manager = managerRaw(row);
  const key = identity(manager);
  const days = dayCount(row);
  const group = Object.entries(groups).find(([saved]) => identity(saved) === key)?.[1] || "First Class";
  return { id: creatorId(row), username: username(row), manager: names[key] || manager || "Unassigned First Class", group, days, diamonds: diamonds(row), joinedDate: joinedDate(snapshot, days), checklist: emptyChecklist(), status: "pending" };
}

async function savedEntries() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", RECORD).maybeSingle();
  if (error) throw new Error(error.message);
  return readEntries(data?.template_json);
}

async function saveEntries(entries: Record<string, Entry>) {
  const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: RECORD, template_json: { entries }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
  if (error) throw new Error(error.message);
}

export async function GET() {
  try {
    const [{ data: latest }, { data: settings }] = await Promise.all([
      submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1).maybeSingle(),
      submissionsSupabase.from("poster_templates").select("template_json").eq("name", "manager-assignment-settings").maybeSingle(),
    ]);
    const latestDate = text(latest?.stat_date);
    const assignment = ((settings?.template_json as { assignments?: { managerGroups?: Record<string, string>; managerNames?: Record<string, string> } } | null)?.assignments || {});
    const groups = assignment.managerGroups || {}, names = assignment.managerNames || {};
    const entries = await savedEntries();
    if (!latestDate) return NextResponse.json({ latestDate: "", pending: [], active: [], previous: Object.values(entries).filter((entry) => entry.status === "complete"), quit: [] });

    const latestRowsResult = await submissionsSupabase.from("creator_daily_stats").select("*").eq("stat_date", latestDate);
    if (latestRowsResult.error) throw new Error(latestRowsResult.error.message);
    const latestRows = ((latestRowsResult.data || []) as Row[]).filter((row) => firstClass(row, groups));
    const liveCreators = new Map(latestRows.map((row) => { const item = creator(row, latestDate, groups, names); return [item.id, item]; }));
    const statusQuit = latestRows.filter(isQuit).map((row) => creator(row, latestDate, groups, names));
    const quit = [...new Map(statusQuit.map((item) => [item.id, item])).values()].sort((a, b) => a.days - b.days);
    const normalizedEntries = Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id, entry.status === "onboarded" && !entry.onboardedAt ? { ...entry, status: "pending" as const } : entry]));
    const merged = Object.values(normalizedEntries).map((entry) => ({ ...entry, ...(liveCreators.get(entry.id) || {}), checklist: entry.checklist, status: entry.status, onboardedAt: entry.onboardedAt, completedAt: entry.completedAt }));
    const pending = [...liveCreators.values()].filter((item) => item.days <= 14 && item.joinedDate >= TESTING_START && (!normalizedEntries[item.id] || normalizedEntries[item.id].status === "pending") && !quit.some((record) => record.id === item.id)).map((item) => ({ ...item, ...(normalizedEntries[item.id] || {}), status: "pending" as const })).sort((a, b) => b.days - a.days);
    const active = merged.filter((item) => item.status === "onboarded" && !isDanJamesRecord(item) && !quit.some((record) => record.id === item.id)).sort((a, b) => b.days - a.days);
    const previous = merged.filter((item) => item.status === "complete" && !isDanJamesRecord(item)).sort((a, b) => b.diamonds - a.diamonds);
    return NextResponse.json({ latestDate, testingStart: TESTING_START, pending, active, previous, quit });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load onboarding workspace." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { creator?: Entry; action?: "onboard" | "complete" | "checklist"; checklist?: boolean[] };
    const creator = body.creator;
    if (!creator?.id || !creator.username || !body.action) return NextResponse.json({ error: "Creator and action are required." }, { status: 400 });
    const entries = await savedEntries();
    const saved = entries[creator.id];
    const current = saved?.status === "onboarded" && !saved.onboardedAt ? { ...saved, status: "pending" as const } : saved || creator;
    const next: Entry = { ...current, ...creator, checklist: body.checklist ? Array.from({ length: CHECKLIST_LENGTH }, (_, index) => Boolean(body.checklist?.[index])) : current.checklist || emptyChecklist(), status: body.action === "complete" ? "complete" : body.action === "onboard" ? "onboarded" : current.status || "pending" };
    if (body.action === "onboard") next.onboardedAt = current.onboardedAt || new Date().toISOString();
    if (body.action === "complete") next.completedAt = new Date().toISOString();
    entries[creator.id] = next;
    await saveEntries(entries);
    return NextResponse.json({ entry: next });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save onboarding progress." }, { status: 500 });
  }
}
