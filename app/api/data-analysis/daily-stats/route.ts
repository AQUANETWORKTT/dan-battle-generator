import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || "";

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month. Please select a month in YYYY-MM format." },
        { status: 400 }
      );
    }

    const [yearText, monthText] = month.split("-");
    const year = Number(yearText);
    const monthNumber = Number(monthText);

    if (monthNumber < 1 || monthNumber > 12) {
      return NextResponse.json(
        { error: "Invalid month number." },
        { status: 400 }
      );
    }

    const startDate = `${month}-01`;
    const endDate = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}`;
    const rows: unknown[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const to = from + pageSize - 1;
      const { data, error } = await submissionsSupabase
        .from("creator_daily_stats")
        .select("*")
        .gte("stat_date", startDate)
        .lte("stat_date", endDate)
        .order("stat_date", { ascending: true })
        .range(from, to);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const batch = data || [];
      rows.push(...batch);
      hasMore = batch.length === pageSize;
      from += pageSize;
    }

    return NextResponse.json({
      month,
      startDate,
      endDate,
      count: rows.length,
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
