import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: latest, error: latestError } = await submissionsSupabase
      .from("creator_daily_stats")
      .select("stat_date")
      .or("data_period.is.null,data_period.neq.mature_month_total")
      .order("stat_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) return NextResponse.json({ error: latestError.message }, { status: 500 });
    if (!latest?.stat_date) return NextResponse.json({ statDate: "", managers: [] });

    // Use every uploaded day here. A single newest day can be a partial upload,
    // which would make most managers disappear from the template selector.
    const managers: unknown[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await submissionsSupabase
        .from("creator_daily_stats")
        .select("manager_email,creator_network_manager,Creator Network manager,email,team,group_name,agency,stat_date")
        .or("data_period.is.null,data_period.neq.mature_month_total")
        .order("stat_date", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const batch = data || [];
      managers.push(...batch);
      hasMore = batch.length === pageSize;
      from += pageSize;
    }

    return NextResponse.json({ statDate: latest.stat_date, managers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load manager sources." }, { status: 500 });
  }
}
