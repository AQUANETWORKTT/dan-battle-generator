import { NextResponse } from "next/server";
import { FIRST_CLASS_CREATORS, isPlaceholderCreator } from "@/lib/first-class-tournament";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

const EVENT_FROM = "2026-07-24";
const EVENT_TO = "2026-07-31";

type StatRow = {
  creator_username: string;
  diamonds: number | null;
};

export async function GET(req: Request) {
  const usernames = FIRST_CLASS_CREATORS.map((creator) => creator.username.toLowerCase());

  // Keep the public board at zero until the tournament begins.
  if (new Date().toISOString().slice(0, 10) < EVENT_FROM) {
    return NextResponse.json({ scores: {}, updatedAt: new Date().toISOString() });
  }

  // Do not make a database request until real usernames have replaced the starter roster.
  if (usernames.every(isPlaceholderCreator)) {
    return NextResponse.json({ scores: {}, updatedAt: new Date().toISOString() });
  }

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || EVENT_FROM;
    const to = searchParams.get("to") || EVENT_TO;
    let query = submissionsSupabase
      .from("creator_daily_stats")
      .select("creator_username, diamonds")
      .in("creator_username", usernames)
      .or("data_period.is.null,data_period.neq.mature_month_total");

    if (from) query = query.gte("stat_date", from);
    if (to) query = query.lte("stat_date", to);

    const scores: Record<string, number> = {};
    let fromRow = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await query.range(fromRow, fromRow + pageSize - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const rows = (data || []) as StatRow[];
      rows.forEach((row) => {
        const username = String(row.creator_username || "").toLowerCase();
        scores[username] = (scores[username] || 0) + Number(row.diamonds || 0);
      });

      if (rows.length < pageSize) break;
      fromRow += pageSize;
    }

    return NextResponse.json({ scores, updatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load leaderboard scores." },
      { status: 500 }
    );
  }
}
