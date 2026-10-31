import { NextResponse } from "next/server";
import { atlasSupabase as db } from "@/lib/atlas-supabase";
const record = "atlas-manager-assignments";
const key = (value: unknown) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const groups = ["New Managers", "Atlas", "Excluded"];
function normalize(value: any) {
  const names = Object.fromEntries(Object.entries(value?.managerNames || {}).map(([id, name]) => [key(id), String(name).trim().slice(0, 100)]));
  const assigned = Object.fromEntries(Object.entries(value?.managerGroups || {}).filter(([,group]) => groups.includes(String(group))).map(([id,group]) => [key(id), String(group)]));
  return { managerNames: names, managerGroups: assigned, deletedManagers: Array.isArray(value?.deletedManagers) ? value.deletedManagers.map(key) : [], ownerManagers: [], assignedAt: value?.assignedAt || {}, bTierManagers: [], managerParents: value?.managerParents || {} };
}
export async function GET() {
  const {data: saved,error} = await db.from("poster_templates").select("template_json").eq("name",record).maybeSingle();
  if (error) throw Error(error.message);
  const assignments = normalize(saved?.template_json);
  const found = new Map<string, {key:string;email:string;name:string;group:string}>();
  for (let start = 0; ; start += 1000) {
    const {data,error} = await db.from("creator_daily_stats").select("manager_email,email").order("id").range(start,start+999);
    if(error) throw Error(error.message);
    for(const row of data || []) {
      const email = String(row.manager_email || row.email || "").trim().toLowerCase(); if(!email) continue;
      const id = key(email);
      const defaultName = email.split("@")[0].replace(/^(atlas(?:agency)?|firstclassagency)[_.-]?/i, "").replace(/[_.-]+/g," ").replace(/\b\w/g, letter => letter.toUpperCase());
      if(!assignments.deletedManagers.includes(id)) found.set(id,{key:id,email,name:assignments.managerNames[id] || defaultName || email, group:assignments.managerGroups[id] || "New Managers"});
    }
    if(!data || data.length<1000) break;
  }
  return NextResponse.json({ assignments, managers:[...found.values()].sort((a,b)=>a.name.localeCompare(b.name)), groups, managerGroups: assignments.managerGroups, managerNames: assignments.managerNames });
}
export async function PUT(req: Request) {
  const body = await req.json(); const assignments = normalize(body.assignments);
  const {error} = await db.from("poster_templates").upsert({name:record,template_json:assignments,updated_at:new Date().toISOString()},{onConflict:"name"});
  if(error) throw Error(error.message);
  return NextResponse.json({assignments,success:true});
}
export async function sources() {
  const {managers} = await (await GET()).json();
  return NextResponse.json({managers:managers.filter((m:any)=>m.group!=="Excluded").map((m:any)=>({manager_key:m.key,manager_label:m.name,manager_email:m.email,email:m.email,key:m.key,name:m.name,group:m.group}))});
}
