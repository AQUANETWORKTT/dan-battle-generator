import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "battle-calendar-settings";
type Battle = { id: string; date: string; time: string; creator: string; manager: string; size: string; opponent: string; agency: string; notified?: number[] };
type Settings = { reminderMinutes?: number[]; battles?: Battle[] };

function londonNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, minutes: Number(value("hour")) * 60 + Number(value("minute")) };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = process.env.BATTLE_CALENDAR_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.BATTLE_CALENDAR_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return NextResponse.json({ error: "Battle bot is not configured." }, { status: 400 });
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const settings = (data?.template_json as Settings | null) || {};
  const now = londonNow(); const reminders = (settings.reminderMinutes || [60, 15]).map(Number); let sent = 0;
  const battles = await Promise.all((settings.battles || []).map(async (battle) => {
    if (battle.date !== now.date) return battle;
    const [hour, minute] = battle.time.split(":").map(Number); const battleMinutes = hour * 60 + minute;
    const due = reminders.filter((lead) => now.minutes >= battleMinutes - lead && now.minutes < battleMinutes - lead + 5 && !(battle.notified || []).includes(lead));
    for (const lead of due) {
      const text = `DF/JD BATTLE REMINDER\n\n${battle.creator} VS ${battle.opponent}\nTIME: ${battle.time}\nSIZE: ${battle.size}\nAGENCY: ${battle.agency}\nMANAGER: ${battle.manager}\n\nSTARTS IN ${lead} MINUTES.`;
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) });
      if (response.ok) { battle.notified = [...new Set([...(battle.notified || []), lead])]; sent += 1; }
    }
    return battle;
  }));
  if (sent) await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: { ...settings, battles }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
  return NextResponse.json({ sent });
}
