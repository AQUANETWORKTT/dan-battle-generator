import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";
import { buildCreatorHistory } from "@/lib/creator-history";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
 try {
  const params = new URL(request.url).searchParams;
  let creatorId = (params.get("creatorId") || "").trim();
  const username = (params.get("username") || "").trim().replace(/^https?:\/\/(?:www\.)?tiktok\.com\/@/i, "").split(/[/?#]/)[0].replace(/^@+/, "").toLowerCase();
  if (!creatorId && !username) return NextResponse.json({error:"Enter a Creator ID or username."},{status:400});
  if (creatorId && !/^\d{10,}$/.test(creatorId)) return NextResponse.json({error:"Creator ID must be numeric."},{status:400});
  if (!creatorId && !/^[a-z0-9._-]+$/i.test(username)) return NextResponse.json({error:"Enter a valid username."},{status:400});
  if (!creatorId) {
   const pattern = username.replace(/_/g, "\\_");
   const ids = new Map<string,string>();
   for (let offset=0;;offset+=1000) {
    const {data,error}=await submissionsSupabase.from("creator_daily_stats").select("creator_id,creator_username,stat_date").or(`creator_username.ilike.${pattern},creator_username.ilike.@${pattern}`).order("stat_date",{ascending:false}).order("creator_id").range(offset,offset+999);
    if(error) throw Error(error.message);
    for(const row of data||[]) { const id=String(row.creator_id||""); if(/^\d{10,}$/.test(id)) ids.set(id,String(row.creator_username||username)); }
    if((data||[]).length<1000)break;
   }
   if(ids.size>1) return NextResponse.json({accounts:[...ids].map(([creatorId,username])=>({creatorId,username})),message:"This username appears against multiple Creator IDs. Choose an account to view its history."});
   creatorId=[...ids.keys()][0]||"";
   if(!creatorId)return NextResponse.json({error:"No saved account with a Creator ID was found for that username."},{status:404});
  }
  const rows:Record<string,unknown>[]=[];
  for(let offset=0;;offset+=1000){
   const {data,error}=await submissionsSupabase.from("creator_daily_stats").select("*").eq("creator_id",creatorId).or("data_period.is.null,data_period.neq.mature_month_total").order("stat_date").order("id").range(offset,offset+999);
   if(error)throw Error(error.message);
   rows.push(...(data||[]));
   if((data||[]).length<1000)break;
  }
  const history=buildCreatorHistory(rows);
  return NextResponse.json({creatorId,...history,count:rows.length});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not load creator history."},{status:500});}
}
