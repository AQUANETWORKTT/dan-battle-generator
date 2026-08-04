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
        .or("data_period.is.null,data_period.neq.mature_month_total")
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
        .eq("stat_date", statDate)
        .or("data_period.is.null,data_period.neq.mature_month_total");

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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || "";
    const day = Number(searchParams.get("day") || 0);

    if (!/^\d{4}-\d{2}$/.test(month) || day < 1 || day > 31) {
      return NextResponse.json(
        { error: "Invalid month or day." },
        { status: 400 }
      );
    }

    const [yearText, monthText] = month.split("-");
    const year = Number(yearText);
    const monthNumber = Number(monthText);
    const lastDay = new Date(year, monthNumber, 0).getDate();

    if (day > lastDay) {
      return NextResponse.json(
        { error: "Invalid day for selected month." },
        { status: 400 }
      );
    }

    const statDate = `${month}-${String(day).padStart(2, "0")}`;
    const { error } = await submissionsSupabase
      .from("creator_daily_stats")
      .delete()
      .eq("stat_date", statDate)
      .or("data_period.is.null,data_period.neq.mature_month_total");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, statDate });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
