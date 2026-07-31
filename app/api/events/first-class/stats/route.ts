import { NextResponse } from "next/server";
import { FIRST_CLASS_CREATORS, isPlaceholderCreator } from "@/lib/first-class-tournament";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

const EVENT_FROM = "2026-07-24";
const EVENT_TO = "2026-07-31";
const USERNAME_ALIASES: Record<string, string[]> = {
  // Lauren changed username during Crew Showdown. Keep every event-period
  // diamond under the current name while accepting both observed old spellings.
  xlaurenj11x: ["xlaurenj11x", "xlaurenjohnson_arr0nb3ll", "xlaurenjohnson_a0rrnb3ll"],
};
const MANUAL_SCORE_OVERRIDES: Record<string, number> = {
  xlaurenj11x: 35666,
};

type StatRow = {
  creator_username: string;
  creator_id?: string | number | null;
  diamonds: number | null;
  stat_date?: string | null;
};

export async function GET(req: Request) {
  const usernames = Array.from(
    new Set(
      FIRST_CLASS_CREATORS.flatMap((creator) =>
        USERNAME_ALIASES[creator.username.toLowerCase()] || [creator.username.toLowerCase()]
      )
    )
  );

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
      .select("creator_username, creator_id, diamonds, stat_date")
      .in("creator_username", usernames)
      .or("data_period.is.null,data_period.neq.mature_month_total");

    if (from) query = query.gte("stat_date", from);
    if (to) query = query.lte("stat_date", to);

    const matchedRows: StatRow[] = [];
    let fromRow = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await query.range(fromRow, fromRow + pageSize - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const rows = (data || []) as StatRow[];
      matchedRows.push(...rows);

      if (rows.length < pageSize) break;
      fromRow += pageSize;
    }

    const canonicalForUsername = (username: string) =>
      Object.entries(USERNAME_ALIASES).find(([, aliases]) => aliases.includes(username))?.[0] || username;
    const creatorIds = new Map<string, string>();
    for (const row of matchedRows) {
      const username = String(row.creator_username || "").toLowerCase();
      const canonicalUsername = canonicalForUsername(username);
      const creatorId = String(row.creator_id || "").trim();
      if (creatorId) creatorIds.set(creatorId, canonicalUsername);
    }

    const scores: Record<string, number> = {};
    const displayNames: Record<string, { username: string; statDate: string }> = {};
    const creatorIdList = [...creatorIds.keys()];
    if (creatorIdList.length) {
      let idFromRow = 0;
      while (true) {
        let idQuery = submissionsSupabase
          .from("creator_daily_stats")
          .select("creator_username, creator_id, diamonds, stat_date")
          .in("creator_id", creatorIdList)
          .or("data_period.is.null,data_period.neq.mature_month_total");
        if (from) idQuery = idQuery.gte("stat_date", from);
        if (to) idQuery = idQuery.lte("stat_date", to);
        const { data, error } = await idQuery.range(idFromRow, idFromRow + pageSize - 1);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        const rows = (data || []) as StatRow[];
        rows.forEach((row) => {
          const canonicalUsername = creatorIds.get(String(row.creator_id || "").trim());
          if (!canonicalUsername) return;
          scores[canonicalUsername] = (scores[canonicalUsername] || 0) + Number(row.diamonds || 0);
          const username = String(row.creator_username || "").toLowerCase();
          const statDate = String(row.stat_date || "");
          if (username && (!displayNames[canonicalUsername] || statDate >= displayNames[canonicalUsername].statDate)) {
            displayNames[canonicalUsername] = { username, statDate };
          }
        });
        if (rows.length < pageSize) break;
        idFromRow += pageSize;
      }
    }

    // Older uploads without creator IDs still receive the best available
    // fallback: aggregate by username and preserve the known alias mapping.
    for (const row of matchedRows) {
      const username = String(row.creator_username || "").toLowerCase();
      const canonicalUsername = canonicalForUsername(username);
      const creatorId = String(row.creator_id || "").trim();
      if (!creatorId) {
        scores[canonicalUsername] = (scores[canonicalUsername] || 0) + Number(row.diamonds || 0);
      }
    }

    Object.assign(scores, MANUAL_SCORE_OVERRIDES);

    return NextResponse.json({
      scores,
      displayNames: Object.fromEntries(Object.entries(displayNames).map(([canonical, value]) => [canonical, value.username])),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load leaderboard scores." },
      { status: 500 }
    );
  }
}
