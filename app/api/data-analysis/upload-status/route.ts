import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || "2026-05";

    const year = Number(month.split("-")[0]);
    const monthNumber = Number(month.split("-")[1]);
    const lastDay = new Date(year, monthNumber, 0).getDate();

    const days: Record<number, number> = {};

    for (let day = 1; day <= lastDay; day++) {
      const statDate = `${month}-${String(day).padStart(2, "0")}`;

      const { count, error } = await submissionsSupabase
        .from("creator_daily_stats")
        .select("*", { count: "exact", head: true })
        .eq("stat_date", statDate);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (count && count > 0) {
        days[day] = count;
      }
    }

    return NextResponse.json({ days });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}