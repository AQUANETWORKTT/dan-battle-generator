import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";
import {DEFAULT_AGENCY_TARGET,incrementalTargets,incrementalPrediction} from '@/lib/incremental-targets';

const monthName = (month: string) => `incremental-data-tracking-${month}`;
const targetName=(month:string)=>`incremental-agency-target-${month}`;
const validMonth = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
const currentMonth = () => new Date().toISOString().slice(0, 7);

type Entry = {
  day: number;
  diamonds: number;
  prediction: number;
  targetLabel: string;
  savedAt: string;
};

function normalize(input: unknown): Entry[] {
  if (!Array.isArray(input)) return [];
  const byDay = new Map<number, Entry>();
  for (const item of input) {
    const row = item as Record<string, unknown>;
    const day = Number(row.day);
    const diamonds = Number(row.diamonds);
    const prediction = Number(row.prediction);
    if (!Number.isInteger(day) || day < 1 || day > 31 || !Number.isFinite(diamonds) || diamonds < 0 || !Number.isFinite(prediction)) continue;
    byDay.set(day, { day, diamonds, prediction, targetLabel: String(row.targetLabel || ""), savedAt: String(row.savedAt || new Date().toISOString()) });
  }
  return [...byDay.values()].sort((a, b) => a.day - b.day);
}

export async function GET(request: Request) {
  const requestedMonth = new URL(request.url).searchParams.get("month") || currentMonth();
  if (!validMonth(requestedMonth)) return NextResponse.json({ error: "INVALID MONTH." }, { status: 400 });
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", monthName(requestedMonth)).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const target=await submissionsSupabase.from('poster_templates').select('template_json').eq('name',targetName(requestedMonth)).maybeSingle();
  if(target.error)return NextResponse.json({error:target.error.message},{status:500});
  const agencyTarget=Number(target.data?.template_json?.agencyTarget)||DEFAULT_AGENCY_TARGET;
  const days=new Date(Number(requestedMonth.slice(0,4)),Number(requestedMonth.slice(5)),0).getDate();
  const entries=normalize((data?.template_json as Record<string, unknown> | null)?.entries).map(entry=>({...entry,prediction:incrementalPrediction(entry.diamonds,incrementalTargets(agencyTarget,days,entry.day))}));
  return NextResponse.json({entries,agencyTarget});
}

export async function PATCH(request:Request){
 try{
  const body=await request.json(),month=String(body?.month||currentMonth()),agencyTarget=body?.agencyTarget;
  if(!validMonth(month)||!Number.isSafeInteger(agencyTarget)||agencyTarget<=0||agencyTarget>1000000000000)return NextResponse.json({error:'ENTER A POSITIVE WHOLE-NUMBER AGENCY TARGET.'},{status:400});
  const result=await submissionsSupabase.from('poster_templates').upsert({name:targetName(month),template_json:{agencyTarget},background_url:null,updated_at:new Date().toISOString()},{onConflict:'name'});
  if(result.error)return NextResponse.json({error:result.error.message},{status:500});
  return NextResponse.json({agencyTarget});
 }catch{return NextResponse.json({error:'COULD NOT SAVE THE AGENCY TARGET.'},{status:400});}
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const month = String(body?.month || currentMonth());
    if (!validMonth(month)) return NextResponse.json({ error: "INVALID MONTH." }, { status: 400 });
    const entries = normalize(body?.entries);
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: monthName(month), template_json: { entries }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "INVALID INCREMENTAL TRACKING DATA." }, { status: 400 });
  }
}
