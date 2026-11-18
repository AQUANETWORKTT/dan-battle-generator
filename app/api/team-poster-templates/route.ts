import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const ORIGINAL_TEMPLATE = "team-dan-poster";
const isTeamTemplate = (name: unknown) => name === ORIGINAL_TEMPLATE || String(name || "").startsWith("team-poster-");

export async function GET() {
  try {
    const templates: {name:string;template_json:unknown;background_url:string|null;updated_at:string}[]=[];
    for(let from=0;;from+=500){
      const {data,error}=await submissionsSupabase.from("poster_templates")
        .select("name,template_json,background_url,updated_at")
        .or(`name.eq.${ORIGINAL_TEMPLATE},name.like.team-poster-%`)
        .order("updated_at",{ascending:false}).order("name").range(from,from+499);
      if(error)throw new Error(error.message);
      templates.push(...(data||[]).filter(item=>isTeamTemplate(item.name)));
      if((data||[]).length<500)break;
    }
    return NextResponse.json({templates},{headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load team poster templates." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name || "");
    if (!isTeamTemplate(name) || !body?.template) return NextResponse.json({ error: "Invalid team poster template." }, { status: 400 });
    const { data, error } = await submissionsSupabase
      .from("poster_templates")
      .upsert({ name, background_url: body.template.backgroundUrl || null, template_json: body.template, updated_at: new Date().toISOString() }, { onConflict: "name" })
      .select("name,template_json,background_url,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ template: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save team poster template." }, { status: 500 });
  }
}
