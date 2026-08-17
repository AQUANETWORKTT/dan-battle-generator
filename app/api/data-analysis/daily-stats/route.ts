import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || "";
    const date = searchParams.get("date") || "";
    const posterDate = searchParams.get("posterDate") || "";

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: "Invalid date. Please use YYYY-MM-DD." }, { status: 400 });
      }

      const { data, error } = await submissionsSupabase
        .from("creator_daily_stats")
        .select("*")
        .eq("stat_date", date)
        .or("data_period.is.null,data_period.neq.mature_month_total");

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ date, count: data?.length || 0, rows: data || [] });
    }

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
        .or("data_period.is.null,data_period.neq.mature_month_total")
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

    const posterRows = posterDate && /^\d{4}-\d{2}-\d{2}$/.test(posterDate)
      ? (() => {
          const byCreator = new Map<string, any[]>();
          for (const row of rows as any[]) {
            const key = String(row.creator_id || row.creator_username || "").toLowerCase();
            if (key) byCreator.set(key, [...(byCreator.get(key) || []), row]);
          }
          return (rows as any[]).filter((row) => row.stat_date === posterDate).map((row) => {
            const period = String(row.data_period || "");
            const match = period.match(/^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/);
            if (!match || match[1] === match[2]) return row;
            const key = String(row.creator_id || row.creator_username || "").toLowerCase();
            const prior = (byCreator.get(key) || []).filter((item) => item.stat_date >= match[1] && item.stat_date < posterDate && String(item.data_period || "") === `${item.stat_date} ~ ${item.stat_date}`);
            return { ...row, diamonds: Math.max(0, Number(row.diamonds || 0) - prior.reduce((sum, item) => sum + Number(item.diamonds || 0), 0)), live_hours: Math.max(0, Number(row.live_hours || 0) - prior.reduce((sum, item) => sum + Number(item.live_hours || 0), 0)), data_period: `${posterDate} ~ ${posterDate}` };
          });
        })()
      : rows;
    return NextResponse.json({
      month,
      startDate,
      endDate,
      count: posterRows.length,
      rows: posterRows,
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
