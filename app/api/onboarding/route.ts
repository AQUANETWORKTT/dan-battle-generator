import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";
import { ONBOARDING_CHECKLIST_LENGTH } from "@/lib/onboarding-checklist";
import { onboardingDays } from "@/lib/onboarding-report-data";

export const dynamic = "force-dynamic";

const RECORD = "first-class-onboarding-workspace";
const TESTING_START = "2026-09-20";
type Row = Record<string, unknown>;
type Entry = { id: string; username: string; manager: string; group: string; days: number; diamonds: number; joinedDate: string; checklist: boolean[]; status: "pending" | "onboarded" | "complete" | "no-chat" | "hidden" | "returned"; onboardedAt?: string; completedAt?: string; notes?: string; startDate?: string };
const text = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const identity = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const username = (row: Row) => text(row.creator_username || row["Creator's username"] || row.username).replace(/^@/, "");
const creatorId = (row: Row) => text(row.creator_id || row["Creator ID"] || username(row));
const managerRaw = (row: Row) => text(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email);
const dayCount = (row: Row) => number(row.days_since_joining || row["Days since joining"]);
const diamonds = (row: Row) => number(row.diamonds || row.Diamonds);
const date = (value: Date) => value.toISOString().slice(0, 10);
const joinedDate = (snapshot: string, days: number) => { const value = new Date(`${snapshot}T12:00:00`); value.setDate(value.getDate() - Math.max(0, days - 1)); return date(value); };
const isQuit = (row: Row) => JSON.stringify(row).toLowerCase().includes("creator has quit the network");
const CHECKLIST_LENGTH = ONBOARDING_CHECKLIST_LENGTH;
const emptyChecklist = () => Array.from({ length: CHECKLIST_LENGTH }, () => false);

function readEntries(value: unknown): Record<string, Entry> {
  const entries = value && typeof value === "object" ? (value as { entries?: unknown }).entries : {};
  if (!entries || typeof entries !== "object") return {};
  return Object.fromEntries(Object.entries(entries as Record<string, Partial<Entry>>).flatMap(([id, entry]) => {
    if (!entry || !text(entry.username)) return [];
    return [[id, { id, username: text(entry.username), manager: text(entry.manager), group: text(entry.group), days: number(entry.days), diamonds: number(entry.diamonds), joinedDate: text(entry.joinedDate), checklist: Array.from({ length: CHECKLIST_LENGTH }, (_, index) => Boolean(entry.checklist?.[index])), status: entry.status === "complete" ? "complete" : entry.status === "onboarded" ? "onboarded" : entry.status === "no-chat" ? "no-chat" : entry.status === "hidden" ? "hidden" : entry.status === "returned" ? "returned" : "pending", onboardedAt: text(entry.onboardedAt), completedAt: text(entry.completedAt), notes: text(entry.notes), startDate: text(entry.startDate) }]];
  }));
}

function firstClass(row: Row, groups: Record<string, string>) {
  const manager = managerRaw(row);
  if (identity(manager) === "firstclassagencydanoutlookcom") return false;
  const group = Object.entries(groups).find(([key]) => identity(key) === identity(manager))?.[1] || "";
  if (/^excluded$/i.test(group)) return false;
  return /^(team (dan|james|mike|indi|andy)|first class)/i.test(group) || /^(firstclassagency|mikehalesjb)/.test(identity(manager));
}


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

async function workspaceNotes() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", RECORD).maybeSingle();
  if (error) throw Error(error.message);
  return String((data?.template_json as { notes?: string } | null)?.notes || "");
}

async function saveEntries(entries: Record<string, Entry>, notes?: string) {
  const savedNotes = notes === undefined ? await workspaceNotes() : notes;
  const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: RECORD, template_json: { entries, notes: savedNotes }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
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
    const notes = await workspaceNotes();
    if (!latestDate) return NextResponse.json({ latestDate: "", notes, pending: [], active: [], noChat: [], hidden: [], previous: Object.values(entries).filter((entry) => entry.status === "complete"), quit: [] });

    const allLatestRows: Row[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await submissionsSupabase.from("creator_daily_stats").select("*")
        .eq("stat_date", latestDate).or("data_period.is.null,data_period.neq.mature_month_total")
        .order("creator_id").order("id").range(offset, offset + 999);
      if (error) throw Error(error.message);
      allLatestRows.push(...(data || []));
      if ((data || []).length < 1000) break;
    }
    const latestRows = allLatestRows.filter((row) => firstClass(row, groups));
    // Fetch daily history for tracked creators and new onboarding candidates only.
    const history = new Map<string, Row[]>();
    const candidates = latestRows.filter((row) => joinedDate(latestDate, dayCount(row)) >= TESTING_START || entries[creatorId(row)]);
    const trackedIds = [...new Set([...candidates.map(creatorId), ...Object.keys(entries)])];
    const monthStart = [...candidates.map((row) => joinedDate(latestDate, dayCount(row))), ...Object.values(entries).flatMap((entry) => [entry.joinedDate,entry.startDate])].filter(Boolean).sort()[0] || `${latestDate.slice(0, 7)}-01`;
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await submissionsSupabase.from("creator_daily_stats")
        .select("creator_id,creator_username,diamonds,stat_date,live_hours,valid_live_days,matches")
        .in("creator_id", trackedIds.length ? trackedIds : ["no-onboarding-creators"])
        .gte("stat_date", monthStart).lte("stat_date", latestDate)
        .order("stat_date").order("creator_id").range(offset, offset + 999);
      if (error) throw new Error(error.message);
      const rows = (data || []) as Row[];
      for (const row of rows) {
        const id = creatorId(row);
        history.set(id, [...(history.get(id) || []), row]);
      }
      if (rows.length < 1000) break;
    }
    const weekStart = new Date(`${latestDate}T12:00:00Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const withMonthTotal = (entry: Entry) => {
      const rows = (history.get(entry.id) || []).filter((row) => text(row.stat_date) >= entry.joinedDate);
      const daily = rows.map((row) => ({ date: text(row.stat_date), diamonds: diamonds(row), hours: number(row.live_hours), liveDays: number(row.valid_live_days), matches: number(row.matches) }));
      const total = (items: typeof daily) => items.reduce((sum, row) => ({ diamonds: sum.diamonds + row.diamonds, hours: sum.hours + row.hours, liveDays: sum.liveDays + row.liveDays, matches: sum.matches + row.matches }), { diamonds: 0, hours: 0, liveDays: 0, matches: 0 });
      const start = entry.startDate || entry.joinedDate;
      const reportDays = onboardingDays(start, latestDate, (history.get(entry.id)||[]).map(row=>({date:text(row.stat_date),diamonds:diamonds(row),hours:number(row.live_hours),liveDays:number(row.valid_live_days),matches:number(row.matches)})));
      const elapsedDays = reportDays.filter(d=>!d.upcoming);
      return { ...entry, ...total(daily), weekly: total(elapsedDays), daily: elapsedDays, reportStart: start, reportEnd: elapsedDays.at(-1)?.date || start };
    };
    const liveCreators = new Map(latestRows.map((row) => { const item = creator(row, latestDate, groups, names); return [item.id, item]; }));
    const statusQuit = latestRows.filter(isQuit).map((row) => creator(row, latestDate, groups, names));
    const quit = [...new Map(statusQuit.map((item) => [item.id, item])).values()].sort((a, b) => a.days - b.days);
    const normalizedEntries = Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id, entry.status === "onboarded" && !entry.onboardedAt ? { ...entry, status: "pending" as const } : entry]));
    const excludedIds = new Set(allLatestRows.filter((row) => identity(managerRaw(row)) === "firstclassagencydanoutlookcom").map(creatorId));
    const merged = Object.values(normalizedEntries).filter((entry) => !excludedIds.has(entry.id) && identity(entry.manager) !== "firstclassagencydanoutlookcom").map((entry) => ({ ...entry, ...(liveCreators.get(entry.id) || {}), checklist: entry.checklist, status: entry.status, onboardedAt: entry.onboardedAt, completedAt: entry.completedAt }));
    const pending: Entry[] = [...liveCreators.values()].filter((item) => {
      const saved = normalizedEntries[item.id];
      const isNewCreator = item.joinedDate >= TESTING_START && (!saved || saved.status === "pending" || saved.status === "returned");
      const wasMovedBack = saved?.status === "pending" || saved?.status === "returned";
      return (isNewCreator || wasMovedBack) && !quit.some((record) => record.id === item.id);
    }).map((item) => ({ ...(normalizedEntries[item.id] || {}), ...item, checklist: normalizedEntries[item.id]?.checklist || item.checklist, notes: normalizedEntries[item.id]?.notes, startDate: normalizedEntries[item.id]?.startDate, status: "pending" as const })).sort((a, b) => b.days - a.days);
    // Preserve saved pending work even when a creator is absent from an upload.
    pending.push(...merged.filter((item) => item.status === "pending" && !liveCreators.has(item.id) && !quit.some((record) => record.id === item.id)).map((item) => ({ ...item, status: "pending" as const })));
    pending.sort((a, b) => b.days - a.days);
    // One-time backlog cutoff: creators already over day 16 on the 14 October upload.
    // Later cohorts remain visible if they become overdue. Returned cards bypass it.
    const backlog = pending.filter(item => item.joinedDate <= "2026-09-28" && entries[item.id]?.status !== "returned");
    const hidden = [...backlog, ...merged.filter(item => item.status === "hidden")];
    const visiblePending = pending.filter(item => !backlog.some(old => old.id === item.id));
    const noChat = merged.filter(item => item.status === "no-chat" && !quit.some(record => record.id === item.id));
    const active = merged.filter((item) => item.status === "onboarded" && !quit.some((record) => record.id === item.id)).sort((a, b) => b.days - a.days);
    const previous = merged.filter((item) => item.status === "complete").sort((a, b) => b.diamonds - a.diamonds);
    return NextResponse.json({ latestDate, notes, testingStart: TESTING_START,
      pending: visiblePending.map(withMonthTotal), noChat: noChat.map(withMonthTotal), hidden: hidden.map(withMonthTotal), active: active.map(withMonthTotal),
      previous: previous.map(withMonthTotal).sort((a, b) => b.diamonds - a.diamonds),
      quit: quit.map(withMonthTotal) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load onboarding workspace." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { creator?: Entry; action?: "onboard" | "complete" | "unboard" | "checklist" | "workspace-notes" | "no-chat" | "restore" | "hide"; checklist?: boolean[]; notes?: string };
    if (body.action === "workspace-notes") {
      if (typeof body.notes !== "string") return NextResponse.json({ error: "Notes must be text." }, { status: 400 });
      await saveEntries(await savedEntries(), body.notes);
      return NextResponse.json({ success: true });
    }
    const creator = body.creator;
    if (!creator?.id || !creator.username || !body.action) return NextResponse.json({ error: "Creator and action are required." }, { status: 400 });
    const entries = await savedEntries();
    const saved = entries[creator.id];
    const current = saved?.status === "onboarded" && !saved.onboardedAt ? { ...saved, status: "pending" as const } : saved || creator;
    const next: Entry = { ...current, ...creator, checklist: body.action === "unboard" ? emptyChecklist() : body.checklist ? Array.from({ length: CHECKLIST_LENGTH }, (_, index) => Boolean(body.checklist?.[index])) : current.checklist || emptyChecklist(), status: body.action === "complete" ? "complete" : body.action === "onboard" ? "onboarded" : body.action === "unboard" ? "pending" : body.action === "no-chat" ? "no-chat" : body.action === "restore" ? "returned" : body.action === "hide" ? "hidden" : current.status || "pending" };
    if (body.action === "onboard") next.onboardedAt = current.onboardedAt || new Date().toISOString();
    if (body.action === "complete") next.completedAt = new Date().toISOString();
    if (body.action === "unboard") { next.onboardedAt = ""; next.completedAt = ""; }
    entries[creator.id] = next;
    await saveEntries(entries);
    return NextResponse.json({ entry: next });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save onboarding progress." }, { status: 500 });
  }
}
