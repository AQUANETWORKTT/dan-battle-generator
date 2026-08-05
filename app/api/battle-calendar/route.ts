import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "battle-calendar-settings";
type Battle = { id: string; date: string; time: string; creator: string; manager: string; size: string; opponent: string; agency: string; notified?: number[] };
type Settings = { managerFilter: string; reminderMinutes: number[]; battles: Battle[] };

function normalize(input: unknown): Settings {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const battles = Array.isArray(value.battles) ? value.battles.flatMap((item) => {
    const row = item as Record<string, unknown>;
    const date = String(row.date || ""); const time = String(row.time || ""); const creator = String(row.creator || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !creator) return [];
    return [{ id: String(row.id || crypto.randomUUID()), date, time, creator, manager: String(row.manager || ""), size: String(row.size || ""), opponent: String(row.opponent || ""), agency: String(row.agency || ""), notified: Array.isArray(row.notified) ? row.notified.map(Number).filter(Number.isFinite) : [] }];
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
    if (body?.action !== "send-test") return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    const token = process.env.BATTLE_CALENDAR_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.BATTLE_CALENDAR_TELEGRAM_CHAT_ID;
    if (!token || !chatId) return NextResponse.json({ error: "Add the Battle Calendar bot token and group ID to the environment settings first." }, { status: 400 });
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: "DF/JD BATTLE CALENDAR CONNECTED ✓" }) });
    if (!response.ok) return NextResponse.json({ error: "Telegram could not send the test message." }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not send the Telegram test." }, { status: 500 }); }
}
