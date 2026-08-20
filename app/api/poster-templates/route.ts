import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const TEAM_DAN_POSTER_TEMPLATE_NAME = "team-dan-poster";
const DEFAULT_SETTING_KEYS = ["poster-template-default", "poster-template-2v2-default"];

function isBattleTemplate(template: unknown, name: unknown) {
  const layout = template as Record<string, unknown> | null;
  return Boolean(
    layout?.avatar1 &&
      layout?.avatar2 &&
      layout?.username1 &&
      layout?.username2 &&
      name !== TEAM_DAN_POSTER_TEMPLATE_NAME &&
      !String(name || "").startsWith("team-poster-")
  );
}

export async function GET() {
  try {
    const [templatesResult, defaultsResult] = await Promise.all([
      submissionsSupabase
        .from("poster_templates")
        .select("id,name,background_url,template_json")
        .order("created_at", { ascending: true }),
      submissionsSupabase
        .from("poster_template_defaults")
        .select("setting_key,template_id")
        .in("setting_key", DEFAULT_SETTING_KEYS),
    ]);

    if (templatesResult.error) throw new Error(templatesResult.error.message);

    const defaults = Object.fromEntries(
      (defaultsResult.data || []).map((item) => [item.setting_key, item.template_id])
    );

    return NextResponse.json({
      templates: (templatesResult.data || []).filter((item) => isBattleTemplate(item.template_json, item.name)),
      defaults,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load poster templates." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const template = body?.template;
    const name = String(template?.name || "").trim();
    if (!name || !isBattleTemplate(template?.template_json, name)) {
      return NextResponse.json({ error: "Invalid poster template." }, { status: 400 });
    }

    const values = {
      name,
      background_url: template.template_json.backgroundUrl || null,
      template_json: template.template_json,
      updated_at: new Date().toISOString(),
    };
    const query = template.id
      ? submissionsSupabase.from("poster_templates").update(values).eq("id", template.id)
      : submissionsSupabase.from("poster_templates").insert(values);
    const { data, error } = await query.select("id,name,background_url,template_json").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ template: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save poster template." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const settingKey = String(body?.settingKey || "");
    const templateId = String(body?.templateId || "");
    if (!DEFAULT_SETTING_KEYS.includes(settingKey) || !templateId) {
      return NextResponse.json({ error: "Invalid default template." }, { status: 400 });
    }

    const { error } = await submissionsSupabase.from("poster_template_defaults").upsert(
      { setting_key: settingKey, template_id: templateId, updated_at: new Date().toISOString() },
      { onConflict: "setting_key" }
    );
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the default template." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing template ID." }, { status: 400 });
    const { error } = await submissionsSupabase.from("poster_templates").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete poster template." },
      { status: 500 }
    );
  }
}
