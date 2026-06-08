import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || "2026-05";

  const year = Number(month.split("-")[0]);
  const monthNumber = Number(month.split("-")[1]);
  const lastDay = new Date(year, monthNumber, 0).getDate();

  const startDate = `${month}-01`;
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await submissionsSupabase
    .from("creator_daily_stats")
    .select("stat_date")
    .gte("stat_date", startDate)
    .lte("stat_date", endDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const days: Record<number, number> = {};

  for (const row of data || []) {
    const day = Number(String(row.stat_date).split("-")[2]);
    days[day] = (days[day] || 0) + 1;
  }

  return NextResponse.json({ days });
}
