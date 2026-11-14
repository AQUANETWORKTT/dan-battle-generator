import { NextRequest, NextResponse } from "next/server";
import { MANAGER_COOKIE, accountForSession } from "@/lib/manager-portal";
import { fullManagerAccess } from "@/lib/manager-portal-mode";
import { database } from "@/lib/creator-api-search/db";

const nameFor = (reminderId: string, managerKey: string) => `manager-reminder-completion-v1:${reminderId}:${managerKey}`;
export async function POST(request: NextRequest) {
  const account = await accountForSession(request.cookies.get(MANAGER_COOKIE)?.value);
  if (!fullManagerAccess(account)) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = await request.json();
  if (typeof body.reminderId !== "string" || !/^[a-f0-9-]{36}$/.test(body.reminderId)) return NextResponse.json({ error: "Invalid reminder." }, { status: 400 });
  const result = await database().from("poster_templates").upsert({ name: nameFor(body.reminderId, account!.manager_key), template_json: { completed: true, at: new Date().toISOString() }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
