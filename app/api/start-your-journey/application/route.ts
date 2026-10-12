import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const runtime = "nodejs";

const recipient = "firstclassagency_james@outlook.com";

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || clean(body.website, 100)) return NextResponse.json({ error: "Unable to send this application." }, { status: 400 });

  const name = clean(body.name, 80);
  const tiktokUsername = clean(body.tiktokUsername, 80);
  const phoneNumber = clean(body.phoneNumber, 40);
  const age = clean(body.age, 2);
  if (!name || !phoneNumber || !/^\d{1,2}$/.test(age)) return NextResponse.json({ error: "Please enter your name, phone number and a valid age." }, { status: 400 });

  const applicationText = ["NEW FIRST CLASS APPLICATION", "", `Name: ${name}`, `TikTok: ${tiktokUsername ? `@${tiktokUsername.replace(/^@+/, "")}` : "Not provided"}`, `Phone: ${phoneNumber}`, `Age: ${age}`].join("\n");
  const application = { name, tiktokUsername: tiktokUsername.replace(/^@+/, ""), phoneNumber, age: Number(age), createdAt: new Date().toISOString() };
  const { data: saved } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", "start-your-journey-applications").maybeSingle();
  const existing = Array.isArray((saved?.template_json as { applications?: unknown[] } | null)?.applications) ? (saved!.template_json as { applications: unknown[] }).applications : [];
  const { error: saveError } = await submissionsSupabase.from("poster_templates").upsert({ name: "start-your-journey-applications", template_json: { applications: [application, ...existing].slice(0, 500) }, background_url: null, updated_at: application.createdAt }, { onConflict: "name" });
  if (saveError) return NextResponse.json({ error: "We could not save your application. Please try again." }, { status: 502 });

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.APPLICATION_TELEGRAM_CHAT_ID || process.env.BATTLE_CALENDAR_TELEGRAM_CHAT_ID || process.env.BATTLE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  if (telegramToken && telegramChatId) await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: telegramChatId, text: applicationText }),
  }).catch(() => undefined);

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  if (resendKey && resendFrom) await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: resendFrom, to: [recipient], subject: `New application — ${name}`, text: applicationText }),
  });
  return NextResponse.json({ ok: true });
}
