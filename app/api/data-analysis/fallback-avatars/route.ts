import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "fallback-avatar-settings";
type FallbackAvatar = { username: string; imageUrl: string };
function normalize(input: unknown): FallbackAvatar[] {
  if (!Array.isArray(input)) return [];
  const values = new Map<string, FallbackAvatar>();
  for (const item of input) {
    const row = item as Record<string, unknown>;
    const username = String(row?.username || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const imageUrl = String(row?.imageUrl || "");
    // An empty image is intentional: it is a creator queued for a fallback photo.
    if (username && (!imageUrl || imageUrl.startsWith("data:image/"))) values.set(username, { username, imageUrl });
  }
  return Array.from(values.values()).sort((a, b) => a.username.localeCompare(b.username));
}
export async function GET() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ avatars: normalize((data?.template_json as Record<string, unknown> | null)?.avatars) });
}
export async function PUT(request: Request) {
  try {
    const body = await request.json(); const avatars = normalize(body?.avatars);
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: { avatars }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ avatars });
  } catch { return NextResponse.json({ error: "Invalid fallback avatar settings." }, { status: 400 }); }
}
