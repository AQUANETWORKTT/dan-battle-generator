import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export async function POST(request: Request) {
  const form = await request.formData(); const file = form.get("file"); const type = String(form.get("type") || "event");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return NextResponse.json({ error: "UPLOAD AN IMAGE." }, { status: 400 });
  const path = `event-planner/${type}-${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9._-]/gi, "-")}`;
  const { error } = await submissionsSupabase.storage.from("event-planner").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = submissionsSupabase.storage.from("event-planner").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
