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

    const rows: unknown[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const to = from + pageSize - 1;
      const { data, error } = await submissionsSupabase
        .from("mature_creator_month_totals")
        .select("*")
        .eq("month", month)
        .order("diamonds", { ascending: false })
        .range(from, to);

      if (error) {
        return NextResponse.json(
          {
            error: `Could not load mature month totals. Make sure the mature_creator_month_totals table exists. ${error.message}`,
          },
          { status: 500 }
        );
      }

      const batch = data || [];
      rows.push(...batch);
      hasMore = batch.length === pageSize;
      from += pageSize;
    }

    return NextResponse.json({
      month,
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
