import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const creatorId = new URL(request.url).searchParams.get("creatorId")?.trim() || "";

  if (!/^\d{10,}$/.test(creatorId)) {
    return NextResponse.json({ error: "Enter a valid numeric Creator ID." }, { status: 400 });
  }

  const { data, error } = await submissionsSupabase
    .from("creator_daily_stats")
    .select("*")
    .eq("creator_id", creatorId)
    .or("data_period.is.null,data_period.neq.mature_month_total")
    .order("stat_date", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  return NextResponse.json({
    creatorId,
    username: rows.find((row) => row.creator_username)?.creator_username || "",
    count: rows.length,
    rows,
  });
}
