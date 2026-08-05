import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "battle-calendar-settings";
type ReminderStatus = { status: "success" | "failed"; at: string };
type Battle = { id: string; date: string; time: string; creator: string; manager: string; size: string; opponent: string; agency: string; type?: string; notified?: number[]; reminders?: Record<string, ReminderStatus> };
type Settings = { managerFilter: string; reminderMinutes: number[]; battles: Battle[] };

function calendarTime(value: unknown) {
  const match = String(value || "").trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return "";
  let hour = Number(match[1]);
  if (match[3]?.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (match[3]?.toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function normalize(input: unknown): Settings {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const battles = Array.isArray(value.battles) ? value.battles.flatMap((item) => {
    const row = item as Record<string, unknown>;
    const date = String(row.date || ""); const time = String(row.time || ""); const creator = String(row.creator || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !creator) return [];
    const reminders = (row.reminders && typeof row.reminders === "object" ? Object.fromEntries(Object.entries(row.reminders as Record<string, unknown>).flatMap(([lead, status]) => { const value = status as Record<string, unknown>; return value && (value.status === "success" || value.status === "failed") ? [[lead, { status: value.status as ReminderStatus["status"], at: String(value.at || "") }]] : []; })) : {}) as Record<string, ReminderStatus>;
    for (const lead of Array.isArray(row.notified) ? row.notified.map(Number).filter(Number.isFinite) : []) reminders[String(lead)] ||= { status: "success", at: "" };
    return [{ id: String(row.id || crypto.randomUUID()), date, time, creator, manager: String(row.manager || ""), size: String(row.size || ""), opponent: String(row.opponent || ""), agency: String(row.agency || ""), type: String(row.type || "ARRANGED BATTLE"), notified: Array.isArray(row.notified) ? row.notified.map(Number).filter(Number.isFinite) : [], reminders }];
  }) : [];
  const reminders = Array.isArray(value.reminderMinutes) ? value.reminderMinutes.map(Number).filter((item) => Number.isFinite(item) && item >= 0 && item <= 1440) : [60, 15];
  return { managerFilter: String(value.managerFilter || "DF/JD"), reminderMinutes: reminders.length ? reminders : [60, 15], battles };
}

async function load() { const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle(); if (error) throw new Error(error.message); return normalize(data?.template_json); }
async function save(settings: Settings) { const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: settings, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" }); if (error) throw new Error(error.message); }

export async function GET() { try { return NextResponse.json(await load()); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load Battle Calendar." }, { status: 500 }); } }
export async function PUT(request: Request) { try { const settings = normalize(await request.json()); await save(settings); return NextResponse.json(settings); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save Battle Calendar." }, { status: 400 }); } }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body?.action === "import-dfjd-battles") {
      const sourceRows: unknown[] = Array.isArray(body.rows) ? body.rows : [];
      const settings = await load();
      const candidates = sourceRows.flatMap((row) => {
        const item = row as Record<string, unknown>;
        const manager = String(item.manager || "").trim().toUpperCase();
        const date = String(item.date || ""); const time = calendarTime(item.time);
        const creator = String(item.creator || "").trim().replace(/^@/, "").toUpperCase(); const opponent = String(item.opponent || "").trim().replace(/^@/, "").toUpperCase();
        if (manager.replace(/\s/g, "") !== "DF/JD" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time || !creator || !opponent) return [];
        return [{ id: crypto.randomUUID(), date, time, creator, opponent, manager: "DF/JD", size: String(item.size || "").trim().toUpperCase(), agency: String(item.agency || "").trim().toUpperCase(), type: "ARRANGED BATTLE", notified: [], reminders: {} }];
      });
      const unique = candidates.filter((battle) => !settings.battles.some((saved) => saved.date === battle.date && saved.manager === battle.manager && saved.time === battle.time && saved.creator === battle.creator && saved.opponent === battle.opponent));
      if (unique.length) await save({ ...settings, battles: [...settings.battles, ...unique] });
      return NextResponse.json({ added: unique.length, skipped: candidates.length - unique.length });
    }
    if (body?.action !== "send-test") return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    const token = process.env.BATTLE_CALENDAR_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.BATTLE_CALENDAR_TELEGRAM_CHAT_ID;
    if (!token || !chatId) return NextResponse.json({ error: "Add the Battle Calendar bot token and group ID to the environment settings first." }, { status: 400 });
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: "DF/JD BATTLE CALENDAR CONNECTED ✓" }) });
    if (!response.ok) return NextResponse.json({ error: "Telegram could not send the test message." }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not send the Telegram test." }, { status: 500 }); }
}
