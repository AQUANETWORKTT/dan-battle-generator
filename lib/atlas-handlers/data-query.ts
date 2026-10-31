import { NextResponse } from "next/server";
import { atlasSupabase as db } from "@/lib/atlas-supabase";
const fields = new Set(["id","stat_date","creator_id","creator_username","email","manager_email","agency","team","data_period","diamonds"]);
export async function POST(req:Request) {
  const body = await req.json();
  const start=Number(body.start || 0),end=Number(body.end ?? 999);
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end-start>=1000) return NextResponse.json({error:"Invalid data range."},{status:400});
  let query:any=db.from("creator_daily_stats").select("*");
  for(const filter of body.filters || []) {
    if(filter.op==="or" && filter.value==="data_period.is.null,data_period.neq.mature_month_total") {query=query.or(filter.value); continue;}
    if(!fields.has(filter.key)||!["eq","gte","lte","in"].includes(filter.op)) return NextResponse.json({error:"Unsupported stats filter."},{status:400});
    if(filter.op==="in") query=query.in(filter.key,Array.isArray(filter.value)?filter.value:[]);
    else if(filter.op==="gte") query=query.gte(filter.key,filter.value);
    else if(filter.op==="lte") query=query.lte(filter.key,filter.value);
    else query=query.eq(filter.key,filter.value);
  }
  for(const order of body.orders || []) {if(!fields.has(order.key)) return NextResponse.json({error:"Unsupported sort."},{status:400}); query=query.order(order.key,{ascending:order.ascending!==false});}
  const {data,error}=await query.order("id").range(start,end);
  if(error) throw Error(error.message);
  return NextResponse.json({rows:data || []});
}
