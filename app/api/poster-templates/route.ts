import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { submissionsSupabase } from "@/lib/submissions-supabase";

const TEAM_DAN_POSTER_TEMPLATE_NAME = "team-dan-poster";
const DEFAULT_SETTING_KEYS = ["poster-template-default", "poster-template-2v2-default"];
const MANAGER_ACCESS_SETTING = 'manager-poster-template-access';

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
      managerTemplateIds: (templatesResult.data || []).find(item=>item.name===MANAGER_ACCESS_SETTING)?.template_json?.allowedIds || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load poster templates." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if((await cookies()).get('first-class-space-auth')?.value!=='true')return NextResponse.json({error:'Leadership access required.'},{status:403});
  try {
    const body=await request.json();
    if(!Array.isArray(body.allowedIds)||body.allowedIds.some((id:unknown)=>typeof id!=='string'))return NextResponse.json({error:'Choose saved template IDs.'},{status:400});
    const {data,error}=await submissionsSupabase.from('poster_templates').select('id,name,template_json');
    if(error)throw Error(error.message);
    const validIds=new Set((data||[]).filter(item=>isBattleTemplate(item.template_json,item.name)).map(item=>item.id));
    const allowedIds=[...new Set<string>(body.allowedIds)];
    if(allowedIds.some(id=>!validIds.has(id)))return NextResponse.json({error:'A selected template no longer exists. Reload the page and try again.'},{status:400});
    const saved=await submissionsSupabase.from('poster_templates').upsert({name:MANAGER_ACCESS_SETTING,template_json:{allowedIds},background_url:null,updated_at:new Date().toISOString()},{onConflict:'name'});
    if(saved.error)throw Error(saved.error.message);
    return NextResponse.json({managerTemplateIds:allowedIds});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not save manager template access.'},{status:500});}
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
