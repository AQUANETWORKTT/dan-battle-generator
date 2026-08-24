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
    if (username && (!imageUrl || imageUrl.startsWith("data:image/"))) {
      values.set(username, { username, imageUrl });
    }
  }
  return Array.from(values.values()).sort((a, b) => a.username.localeCompare(b.username));
}

async function readAvatars() {
  const { data, error } = await submissionsSupabase
    .from("poster_templates")
    .select("template_json")
    .eq("name", SETTINGS_NAME)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return normalize((data?.template_json as Record<string, unknown> | null)?.avatars);
}

async function saveAvatars(avatars: FallbackAvatar[]) {
  const { data, error } = await submissionsSupabase
    .from("poster_templates")
    .upsert(
      { name: SETTINGS_NAME, template_json: { avatars }, background_url: null, updated_at: new Date().toISOString() },
      { onConflict: "name" }
    )
    .select("template_json")
    .single();
  if (error) throw new Error(error.message);
  return normalize((data?.template_json as Record<string, unknown> | null)?.avatars);
}

export async function GET() {
  try {
    return NextResponse.json({ avatars: await readAvatars() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load fallback pictures." }, { status: 500 });
  }
}

// Queue additions merge with the latest shared record, preventing a stale tab
// from removing creators that Picture Check or another user just added.
export async function POST(request: Request) {
  try {
    const incoming = normalize((await request.json())?.avatars);
    const merged = new Map((await readAvatars()).map((avatar) => [avatar.username, avatar]));
    for (const avatar of incoming) {
      const existing = merged.get(avatar.username);
      merged.set(avatar.username, avatar.imageUrl || existing ? { username: avatar.username, imageUrl: avatar.imageUrl || existing?.imageUrl || "" } : avatar);
    }
    return NextResponse.json({ avatars: await saveAvatars(Array.from(merged.values())) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not queue fallback pictures." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    return NextResponse.json({ avatars: await saveAvatars(normalize((await request.json())?.avatars)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save fallback pictures." }, { status: 500 });
  }
}
