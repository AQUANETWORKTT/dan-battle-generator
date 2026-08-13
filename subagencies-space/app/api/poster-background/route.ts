import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") || "";
  if (!path || path.includes("..")) return new Response("Missing background", { status: 400 });
  const { data, error } = await submissionsSupabase.storage.from("poster-backgrounds").download(path);
  if (error || !data) return new Response("Background not found", { status: 404 });
  return new Response(data, { headers: { "Content-Type": data.type || "image/png", "Cache-Control": "no-store" } });
}
