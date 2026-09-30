import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

const RACE_START = "2026-10-01";
const TIER_PERIOD_START = "2026-09-01";
const EXCLUDED_USERNAMES = new Set(["kayjb_3"]);
const TARGET_OVERRIDES: Record<string, number> = {
  tkzx: 1_600_000, tkaysx: 1_600_000, lucylou449: 1_000_000, xomarky: 1_000_000,
  sambaileysingerofficial: 700_000, arch: 700_000, harryjonesey: 1_000_000,
};

type CreatorStat = Record<string, unknown>;
type Track = "bronze" | "silver" | "gold" | "platinum";
type Progress = { creatorId: string; username: string; diamonds: number; liveDays: number; liveHours: number; followers: number };

const text = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const usernameFor = (row: CreatorStat) => text(row.creator_username).replace(/^@/, "");
const creatorIdFor = (row: CreatorStat) => {
  const creatorId = text(row.creator_id);
  return /^\d+$/.test(creatorId) ? creatorId : "";
};
const identityFor = (row: CreatorStat) => usernameFor(row).toLowerCase();

function platinumTarget(diamonds: number) {
  if (diamonds >= 1_600_000) return 1_600_000;
  if (diamonds >= 1_000_000) return 1_000_000;
  if (diamonds >= 700_000) return 700_000;
  return 500_000;
}

function tierFor(lastMonthDiamonds: number, username: string): { track: Track; target: number } {
  const override = TARGET_OVERRIDES[username.toLowerCase()];
  if (override) return { track: "platinum", target: override };
  if (lastMonthDiamonds < 200_000) return { track: "bronze", target: 100_000 };
  if (lastMonthDiamonds < 300_000) return { track: "silver", target: 200_000 };
  if (lastMonthDiamonds < 500_000) return { track: "gold", target: 300_000 };
  return { track: "platinum", target: platinumTarget(lastMonthDiamonds) };
}

function requirements(track: Track) {
  return track === "bronze" ? { days: 15, hours: 40, followers: 100 }
    : track === "silver" ? { days: 15, hours: 40, followers: 150 }
      : track === "gold" ? { days: 18, hours: 60, followers: 200 }
        : { days: 22, hours: 80, followers: 250 };
}

export async function GET() {
  try {
    const baseQuery = (columns: string) => submissionsSupabase.from("creator_daily_stats")
      .select(columns)
      .eq("agency", "First Class")
      .or("data_period.is.null,data_period.neq.mature_month_total");
    const { data: latestDates, error: latestError } = await baseQuery("stat_date").order("stat_date", { ascending: false }).limit(1);
    const latestDate = text((latestDates as { stat_date?: unknown }[] | null)?.[0]?.stat_date);
    if (latestError || !latestDate) return NextResponse.json({ error: latestError?.message || "No First Class daily data is available yet." }, { status: 500 });

    // The final September daily upload locks every creator's tier. Before the
    // 30th is imported, use the latest available September upload as a preview.
    const { data: startingDates, error: startingError } = await baseQuery("stat_date")
      .lt("stat_date", RACE_START)
      .order("stat_date", { ascending: false })
      .limit(1);
    const startingDate = text((startingDates as { stat_date?: unknown }[] | null)?.[0]?.stat_date);
    if (startingError || !startingDate) return NextResponse.json({ error: startingError?.message || "A September tier snapshot is not available yet." }, { status: 500 });

    async function loadRows(query: any) {
      const rows: CreatorStat[] = [];
      for (let from = 0, hasMore = true; hasMore; from += 1000) {
        const { data, error } = await query.range(from, from + 999);
        if (error) throw new Error(error.message);
        const page = (data || []) as CreatorStat[];
        rows.push(...page);
        hasMore = page.length === 1000;
      }
      return rows;
    }

    const statColumns = "creator_id, creator_username, diamonds, valid_live_days, live_hours, new_followers, stat_date";
    const startingRows = await loadRows(baseQuery(statColumns).gte("stat_date", TIER_PERIOD_START).lte("stat_date", startingDate));
    const latestSeptemberRows = await loadRows(baseQuery(statColumns).eq("stat_date", startingDate));
    const hasRaceProgress = latestDate >= RACE_START;
    const progressRows = hasRaceProgress ? await loadRows(baseQuery(statColumns).gte("stat_date", RACE_START).lte("stat_date", latestDate)) : [];

    // Imports replace a source day. Retaining one row per creator/day means a
    // corrected re-upload cannot double-count before totals are accumulated.
    const dailyRows = new Map<string, CreatorStat>();
    for (const row of progressRows) {
      const username = usernameFor(row), identity = identityFor(row);
      if (!username || !identity) continue;
      const key = `${text(row.stat_date)}:${identity}`;
      const existing = dailyRows.get(key);
      if (!existing || number(row.diamonds) > number(existing.diamonds)) dailyRows.set(key, row);
    }

    const progressByIdentity = new Map<string, Progress>();
    for (const row of dailyRows.values()) {
      const identity = identityFor(row), username = usernameFor(row), previous = progressByIdentity.get(identity);
      progressByIdentity.set(identity, {
        creatorId: creatorIdFor(row), username,
        diamonds: number(previous?.diamonds) + number(row.diamonds),
        liveDays: number(previous?.liveDays) + number(row.valid_live_days),
        liveHours: number(previous?.liveHours) + number(row.live_hours),
        followers: number(previous?.followers) + number(row.new_followers),
      });
    }

    const startingDailyRows = new Map<string, CreatorStat>();
    const activeSeptemberCreators = new Set(latestSeptemberRows.flatMap((row) => {
      const username = usernameFor(row).toLowerCase();
      return username && !EXCLUDED_USERNAMES.has(username) ? [username] : [];
    }));
    for (const row of startingRows) {
      const username = usernameFor(row), identity = identityFor(row);
      if (!username || !identity || !activeSeptemberCreators.has(identity) || EXCLUDED_USERNAMES.has(username.toLowerCase())) continue;
      const key = `${text(row.stat_date)}:${identity}`;
      const existing = startingDailyRows.get(key);
      if (!existing || number(row.diamonds) > number(existing.diamonds)) startingDailyRows.set(key, row);
    }
    const startingRoster = new Map<string, { username: string; diamonds: number }>();
    for (const row of startingDailyRows.values()) {
      const identity = identityFor(row), username = usernameFor(row), previous = startingRoster.get(identity);
      startingRoster.set(identity, { username, diamonds: number(previous?.diamonds) + number(row.diamonds) });
    }
    if (!startingRoster.size) return NextResponse.json({ error: "September First Class daily data is not available yet." }, { status: 500 });

    function completionDateFor(identity: string, track: Track, target: number) {
      const required = requirements(track);
      const timeline = Array.from(dailyRows.values()).filter((row) => identityFor(row) === identity).sort((a, b) => text(a.stat_date).localeCompare(text(b.stat_date)));
      let diamonds = 0; let liveDays = 0; let liveHours = 0; let followers = 0;
      for (const row of timeline) {
        diamonds += number(row.diamonds); liveDays += number(row.valid_live_days); liveHours += number(row.live_hours); followers += number(row.new_followers);
        if (diamonds >= target && liveDays >= required.days && liveHours >= required.hours && followers >= required.followers) return text(row.stat_date);
      }
      return null;
    }

    const creators = Array.from(startingRoster.entries()).map(([identity, baseline]) => {
      const username = baseline.username, progress = progressByIdentity.get(identity), tier = tierFor(baseline.diamonds, username);
      return { id: identity, username: progress?.username || username, diamonds: number(progress?.diamonds), liveDays: number(progress?.liveDays), liveHours: number(progress?.liveHours), followers: number(progress?.followers), track: tier.track, target: tier.target, completedAt: completionDateFor(identity, tier.track, tier.target) };
    });

    // Someone joining during October starts at zero in Bronze on their first
    // daily upload, matching the original event's new-creator behaviour.
    for (const [identity, progress] of progressByIdentity) {
      if (startingRoster.has(identity) || EXCLUDED_USERNAMES.has(progress.username.toLowerCase())) continue;
      const tier = tierFor(0, progress.username);
      creators.push({ id: identity, username: progress.username, diamonds: progress.diamonds, liveDays: progress.liveDays, liveHours: progress.liveHours, followers: progress.followers, track: tier.track, target: tier.target, completedAt: completionDateFor(identity, tier.track, tier.target) });
    }

    return NextResponse.json({ creators, startingDate, statDate: latestDate, hasRaceProgress }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "October leaderboard data is unavailable." }, { status: 500 });
  }
}
