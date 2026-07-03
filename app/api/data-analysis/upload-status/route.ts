import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const latest = searchParams.get("latest") === "true";

    if (latest) {
      const { data, error } = await submissionsSupabase
        .from("creator_daily_stats")
        .select("stat_date")
        .order("stat_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const latestDate = data?.stat_date || "";

      return NextResponse.json({
        latestDate,
        latestMonth: latestDate ? latestDate.slice(0, 7) : "",
      });
    }

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
