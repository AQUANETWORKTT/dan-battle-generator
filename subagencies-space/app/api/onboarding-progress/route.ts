import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

const RECORD_NAME = "manager-onboarding-progress";

type Progress = {
  agency: string;
  manager: string;
  username: string;
  welcomeDate?: string;
  training1Date?: string;
  training2Date?: string;
  training3Date?: string;
  training4Date?: string;
  feedbackWeek1?: boolean;
  feedbackWeek2?: boolean;
  feedbackWeek1Url?: string;
  feedbackWeek2Url?: string;
  appLinkSent?: boolean;
  pfpChanged?: boolean;
  submitted?: boolean;
  confirmed?: boolean;
};

async function loadEntries() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", RECORD_NAME).maybeSingle();
  if (error) throw new Error(error.message);
  const raw = data?.template_json as { entries?: Record<string, Progress> } | null;
  return raw?.entries || {};
}

export async function GET() {
  try { return NextResponse.json({ entries: await loadEntries() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load onboarding progress." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: "update" | "confirm"; id?: string; entry?: Progress };
    const entries = await loadEntries();
    if (!body.id || !body.action) return NextResponse.json({ error: "Missing onboarding entry." }, { status: 400 });
    if (body.action === "confirm") {
      if (!entries[body.id]) return NextResponse.json({ error: "Onboarding entry not found." }, { status: 404 });
      entries[body.id] = { ...entries[body.id], confirmed: true };
    } else if (body.entry) {
      entries[body.id] = { ...entries[body.id], ...body.entry, confirmed: false };
    } else return NextResponse.json({ error: "Missing onboarding update." }, { status: 400 });
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: RECORD_NAME, template_json: { entries }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ entry: entries[body.id] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save onboarding progress." }, { status: 500 }); }
}
