import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "fallback-avatar-settings";
const ENTRY_PREFIX = "fallback-avatar-entry-";
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
  const [{ data: legacyData, error: legacyError }, { data: entryData, error: entryError }] = await Promise.all([
    submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle(),
    submissionsSupabase.from("poster_templates").select("name, template_json").like("name", `${ENTRY_PREFIX}%`),
  ]);
  if (legacyError || entryError) throw new Error(legacyError?.message || entryError?.message);
  const avatars = new Map(normalize((legacyData?.template_json as Record<string, unknown> | null)?.avatars).map((avatar) => [avatar.username, avatar]));
  for (const entry of entryData || []) {
    const avatar = normalize([(entry.template_json as Record<string, unknown> | null)?.avatar])[0];
    if (avatar) avatars.set(avatar.username, avatar);
  }
  return Array.from(avatars.values()).sort((a, b) => a.username.localeCompare(b.username));
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

// Queue additions are separate small records. This avoids rewriting the large
// legacy image list, which can exceed the database statement timeout.
export async function POST(request: Request) {
  try {
    const incoming = normalize((await request.json())?.avatars);
    if (incoming.length) {
      const { error } = await submissionsSupabase.from("poster_templates").upsert(
        incoming.map((avatar) => ({
          name: `${ENTRY_PREFIX}${avatar.username}`,
          template_json: { avatar },
          background_url: null,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "name" }
      );
      if (error) throw new Error(error.message);
    }
    return NextResponse.json({ avatars: await readAvatars() });
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
