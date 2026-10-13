import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const recipient = "firstclassagency_james@outlook.com";
const submissionsAdmin = createClient(
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL || "https://dxupgmsscysvztxdtaku.supabase.co",
  process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY || "",
);

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || clean(body.website, 100)) return NextResponse.json({ error: "Unable to send this application." }, { status: 400 });

  const name = clean(body.name, 80);
  const tiktokUsername = clean(body.tiktokUsername, 80);
  const phoneNumber = clean(body.phoneNumber, 40);
  const countryCode = clean(body.countryCode, 4);
  if (!/^[a-zA-Z\s]+$/.test(name) || !/^\+\d{1,3}$/.test(countryCode) || !/^\d{6,15}$/.test(phoneNumber)) return NextResponse.json({ error: "Please enter your name and a valid phone number." }, { status: 400 });

  const fullPhoneNumber = `${countryCode}${phoneNumber}`;
  const username = tiktokUsername.replace(/^@+/, "").replace(/[^a-zA-Z0-9._-]/g, "");
  const plainApplicationText = ["NEW START YOUR JOURNEY APPLICATION", "", `Name: ${name}`, `TikTok: ${username ? `tiktok.com/@${username}` : "Not provided"}`, `Phone: ${fullPhoneNumber}`].join("\n");
  const telegramText = [
    "<b>NEW START YOUR JOURNEY APPLICATION</b>",
    "",
    `<b>Name:</b> ${escapeHtml(name)}`,
    `<b>TikTok:</b> ${username ? `<a href=\"https://www.tiktok.com/@${encodeURIComponent(username)}\">tiktok.com/@${escapeHtml(username)}</a>` : "Not provided"}`,
    `<b>Phone:</b> <code>${fullPhoneNumber}</code>`,
  ].join("\n");
  const application = { name, tiktokUsername: username, phoneNumber: fullPhoneNumber, createdAt: new Date().toISOString() };
  const { data: saved } = await submissionsAdmin.from("poster_templates").select("template_json").eq("name", "start-your-journey-applications").maybeSingle();
  const existing = Array.isArray((saved?.template_json as { applications?: unknown[] } | null)?.applications) ? (saved!.template_json as { applications: unknown[] }).applications : [];
  const { error: saveError } = await submissionsAdmin.from("poster_templates").upsert({ name: "start-your-journey-applications", template_json: { applications: [application, ...existing].slice(0, 500) }, background_url: null, updated_at: application.createdAt }, { onConflict: "name" });
  if (saveError) return NextResponse.json({ error: "We could not save your application. Please try again." }, { status: 502 });

  const telegramToken = process.env.APPLICATION_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.APPLICATION_TELEGRAM_CHAT_ID || process.env.BATTLE_CALENDAR_TELEGRAM_CHAT_ID || process.env.BATTLE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  if (telegramToken && telegramChatId) await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: telegramChatId, text: telegramText, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
  }).catch(() => undefined);

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  if (resendKey && resendFrom) await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: resendFrom, to: [recipient], subject: `New application — ${name}`, text: plainApplicationText }),
  });
  return NextResponse.json({ ok: true });
}
