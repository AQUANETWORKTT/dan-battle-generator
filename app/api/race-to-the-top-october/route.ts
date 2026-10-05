import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { submissionsSupabase } from "@/lib/submissions-supabase";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const RACE_START = "2026-10-01";
const TIER_PERIOD_START = "2026-09-01";
const EXCLUDED_USERNAMES = new Set(["kayjb_3"]);
const TARGET_OVERRIDES: Record<string, number> = {
  tkzx: 1_600_000, tkaysx: 1_600_000, lucylou449: 1_000_000, xomarky: 1_000_000,
  sambaileysingerofficial: 700_000, arch: 700_000,
};
const SILVER_OVERRIDES = new Set(["kaizer9025", "davegasparmusic", "goldengun62"]);

type CreatorStat = Record<string, unknown>;
type SnapshotRow = { "Creator's username"?: unknown; Diamonds?: unknown };
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
  if (SILVER_OVERRIDES.has(username.toLowerCase())) return { track: "silver", target: 200_000 };
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

async function eventRoster() {
  const workbook = XLSX.read(await readFile(join(process.cwd(), "public", "race-to-the-top-october-roster.xlsx")), { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json<SnapshotRow>(workbook.Sheets[workbook.SheetNames[0]]);
  const roster = new Map<string, { username: string; diamonds: number }>();
  for (const row of rows) {
    const username = text(row["Creator's username"]).replace(/^@/, "").toLowerCase();
    if (!username || EXCLUDED_USERNAMES.has(username)) continue;
    const existing = roster.get(username);
    if (!existing || number(row.Diamonds) > existing.diamonds) roster.set(username, { username, diamonds: number(row.Diamonds) });
  }
  return roster;
}

async function excludedUsernames() {
  const { data, error } = await submissionsSupabase
    .from("poster_templates")
    .select("template_json")
    .eq("name", "excluded-creators-settings")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const creators = (data?.template_json as { creators?: unknown[] } | null)?.creators;
  return new Set((Array.isArray(creators) ? creators : []).flatMap((creator) => {
    const item = creator as { username?: unknown; excludeFromLeaderboards?: unknown; hiddenFromDownloads?: unknown; excludeFromEvents?: unknown };
    const legacyEventExclusion = item?.excludeFromEvents === undefined && Boolean(item?.excludeFromLeaderboards || item?.hiddenFromDownloads);
    if (!item?.excludeFromEvents && !legacyEventExclusion) return [];
    const username = text(item.username).replace(/^@/, "").toLowerCase();
    return username ? [username] : [];
  }));
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

    const [sourceRoster, excluded] = await Promise.all([eventRoster(), excludedUsernames()]);

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

    const startingRoster = new Map<string, { username: string; diamonds: number }>();
    for (const [username, creator] of sourceRoster) if (!excluded.has(username)) startingRoster.set(username, creator);
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

    return NextResponse.json({ creators, statDate: latestDate, hasRaceProgress }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "October leaderboard data is unavailable." }, { status: 500 });
  }
}
