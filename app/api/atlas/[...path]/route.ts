import { NextRequest, NextResponse } from "next/server";
import { ATLAS_COOKIE, atlasPasswordMatches, atlasSessionToken, atlasSessionValid } from "@/lib/atlas-auth";
import { changeAtlasWorkspace, readAtlasWorkspace, type AtlasTemplate } from "@/lib/atlas-generator-store";
import { submissionsSupabase } from "@/lib/submissions-supabase";
import { POST as tiktokAvatar } from "@/app/api/tiktok-avatar/route";
import { GET as tiktokImage } from "@/app/api/tiktok-avatar-image/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const team = (name: string) => name === "atlas-team-poster" || name.startsWith("team-poster-");
const battle = (t: AtlasTemplate) => Boolean(t.template_json.avatar1 && t.template_json.avatar2 && t.template_json.username1 && t.template_json.username2);
async function handle(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/^\/api\/atlas\//, "");
  if (request.method !== "GET" && request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (path === "login" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (!atlasPasswordMatches(String(body.password || ""))) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    const response = NextResponse.json({ success: true });
    response.cookies.set(ATLAS_COOKIE, atlasSessionToken(), { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "strict", path: "/", maxAge: 12 * 60 * 60 });
    return response;
  }
  if (!atlasSessionValid(request.cookies.get(ATLAS_COOKIE)?.value)) return NextResponse.json({ error: "Atlas access required." }, { status: 401 });
  try {
    if (path === "tiktok-avatar" && request.method === "POST") return tiktokAvatar(request);
    if (path === "tiktok-avatar-image" && request.method === "GET") {
      const raw = request.nextUrl.searchParams.get("url") || "";
      let url: URL; try { url = new URL(raw); } catch { return new NextResponse("Invalid image URL", { status: 400 }); }
      if (url.protocol !== "https:" || !["tiktokcdn.com","tiktokcdn-us.com","tiktokcdn-eu.com","byteoversea.com","ibytedtos.com","ibyteimg.com","pstatp.com"].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return new NextResponse("Unsupported image host", { status: 400 });
      return tiktokImage(request);
    }
    if (path === "logout" && request.method === "POST") { const r = NextResponse.json({ success: true }); r.cookies.delete(ATLAS_COOKIE); return r; }
    if (path === "upload" && request.method === "POST") {
      const file = (await request.formData()).get("file");
      if (!(file instanceof File) || !["image/png","image/jpeg","image/webp","image/gif"].includes(file.type) || file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Choose a PNG, JPG, WebP or GIF under 15MB." }, { status: 400 });
      const ext = ({"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif"} as Record<string,string>)[file.type];
      const key = `atlas/${crypto.randomUUID()}.${ext}`;
      const { error } = await submissionsSupabase.storage.from("poster-backgrounds").upload(key, file, { contentType: file.type });
      if (error) throw Error(error.message);
      return NextResponse.json({ url: submissionsSupabase.storage.from("poster-backgrounds").getPublicUrl(key).data.publicUrl });
    }
    if (path === "poster-templates" || path === "team-poster-templates" || path === "records") {
      if (request.method === "GET") {
        const w = await readAtlasWorkspace();
        return NextResponse.json({ templates: w.templates.filter(t => path === "records" || (path === "poster-templates" ? battle(t) : team(t.name))), defaults: w.defaults });
      }
      const body = await request.json();
      const result = await changeAtlasWorkspace(w => {
        if (path === "poster-templates" && request.method === "PUT") {
          if (!["poster-template-default","poster-template-2v2-default"].includes(body.settingKey) || !w.templates.some(t => t.id === body.templateId && battle(t))) throw Error("Choose a saved Atlas template first.");
          w.defaults[body.settingKey] = body.templateId; return { ok: true };
        }
        if (request.method === "DELETE") {
          const target = w.templates.find(t => body.id ? t.id === body.id : t.name === body.name);
          if (!target) throw Error("Atlas template not found.");
          w.templates = w.templates.filter(t => t.id !== target.id);
          for (const [key, id] of Object.entries(w.defaults)) if (id === target.id) delete w.defaults[key];
          return { ok: true };
        }
        const raw = path === "team-poster-templates" ? { name: body.name, template_json: body.template } : body.template;
        if (!raw?.name?.trim() || !raw.template_json || typeof raw.template_json !== "object" || Array.isArray(raw.template_json)) throw Error("Invalid Atlas template.");
        const existing = raw.id ? w.templates.find(t => t.id === raw.id) : w.templates.find(t => t.name === raw.name.trim());
        if (raw.id && !existing) throw Error("Atlas template not found.");
        const template: AtlasTemplate = { id: existing?.id || crypto.randomUUID(), name: raw.name.trim(), template_json: raw.template_json, background_url: raw.template_json.backgroundUrl || null, updated_at: new Date().toISOString() };
        if (path === "poster-templates" && !battle(template)) throw Error("Invalid poster layout.");
        if (path === "team-poster-templates" && !team(template.name)) throw Error("Invalid team template name.");
        w.templates = [...w.templates.filter(t => t.id !== template.id), template];
        return { template };
      });
      return NextResponse.json(result);
    }
    if (path === "data-analysis/fallback-avatars") return NextResponse.json({ avatars: [] });
    if (path === "data-analysis/manager-sources") return NextResponse.json({ managers: [] });
    if (path === "data-analysis/manager-assignments") return NextResponse.json({ assignments: { managerGroups: {}, managerNames: {}, deletedManagers: [] }, managers: [] });
    if (path === "data-analysis/excluded-creators") return NextResponse.json({ creators: [], excluded: [] });
    if (path === "data-analysis/daily-stats") return NextResponse.json({ rows: [], stats: [], data: [], date: "" });
    if (path === "events/atlas/stats") return NextResponse.json({ error: "Atlas has no event data connected. Enter the leaderboard manually." }, { status: 400 });
    if (path === "battle-calendar") return NextResponse.json({ error: "Atlas has no battle calendar connected. Your posters can still be downloaded." }, { status: 400 });
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Atlas request failed." }, { status: 400 }); }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
