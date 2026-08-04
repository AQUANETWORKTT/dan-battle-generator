import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const agency = String(form.get("agency") || "").replace(/[^a-z0-9-]/gi, "");
    const manager = String(form.get("manager") || "").replace(/[^a-z0-9-]/gi, "");
    const username = String(form.get("username") || "").replace(/[^a-z0-9_.-]/gi, "");
    const week = String(form.get("week") || "").replace(/[^12]/g, "");
    if (!(file instanceof File) || !agency || !manager || !username || !week) return NextResponse.json({ error: "Choose a valid screenshot first." }, { status: 400 });
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Use an image under 10 MB." }, { status: 400 });
    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "png";
    const path = `onboarding-evidence/${agency}/${manager}/${username}-week-${week}.${extension}`;
    const { error } = await submissionsSupabase.storage.from("poster-backgrounds").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
    if (error) throw new Error(error.message);
    const { data } = submissionsSupabase.storage.from("poster-backgrounds").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload screenshot." }, { status: 500 }); }
}
