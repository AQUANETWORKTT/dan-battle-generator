import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type CreatorStat = Record<string, unknown>;

type TrackId = "blue" | "bronze" | "silver" | "gold" | "platinum";
const RACE_MONTH_START = "2026-08-01";
const RACE_ROSTER_SETTINGS_NAME = "race-to-the-top-2026-08-roster";
const EXCLUDED_CREATORS_SETTINGS_NAME = "excluded-creators-settings";
const CREATOR_OVERRIDES: Record<string, Partial<Pick<SavedRosterCreator, "track" | "target">>> = {
  lucylou449: { target: 700_000 },
  dylanjinks: { target: 700_000 },
  arabellama_y: { track: "gold", target: 300_000 },
};
type SavedRosterCreator = { creatorId: string; username: string; lastMonthDiamonds: number; track: TrackId; target: number };

function text(value: unknown) {
  return String(value || "").trim();
}

function number(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function creatorIdentity(creatorId: unknown, username: unknown) {
  const id = text(creatorId);
  return /^\d+$/.test(id) ? id : text(username).replace(/^@/, "").toLowerCase();
}

function creatorOverride(username: string) {
  return CREATOR_OVERRIDES[username.replace(/^@/, "").toLowerCase()] || {};
}

function excludedUsernames(value: unknown) {
  const creators = (value as { creators?: unknown[] } | null)?.creators;
  if (!Array.isArray(creators)) return new Set<string>();
  return new Set(creators.flatMap((creator) => {
    const item = creator as { username?: unknown; excludeFromLeaderboards?: unknown; hiddenFromDownloads?: unknown };
    if (!item || (!item.excludeFromLeaderboards && !item.hiddenFromDownloads)) return [];
    const username = text(item.username).replace(/^@/, "").toLowerCase();
    return username ? [username] : [];
  }));
}

function tierFor(lastMonthDiamonds: number): { track: TrackId; target: number } {
  if (lastMonthDiamonds < 100_000) return { track: "blue", target: 100_000 };
  if (lastMonthDiamonds < 200_000) return { track: "bronze", target: 100_000 };
  if (lastMonthDiamonds < 300_000) return { track: "silver", target: 200_000 };
  if (lastMonthDiamonds < 500_000) return { track: "gold", target: 300_000 };
  if (lastMonthDiamonds < 700_000) return { track: "platinum", target: 500_000 };
  if (lastMonthDiamonds < 1_000_000) return { track: "platinum", target: 700_000 };
  if (lastMonthDiamonds < 1_600_000) return { track: "platinum", target: 1_000_000 };
  if (lastMonthDiamonds < 2_500_000) return { track: "platinum", target: 1_600_000 };
  if (lastMonthDiamonds < 5_000_000) return { track: "platinum", target: 2_500_000 };
  return { track: "platinum", target: 5_000_000 };
}

export async function GET() {
  const { data: savedRosterRow } = await submissionsSupabase
    .from("poster_templates")
    .select("template_json")
    .eq("name", RACE_ROSTER_SETTINGS_NAME)
    .maybeSingle();
  const savedRoster = ((savedRosterRow?.template_json as { creators?: SavedRosterCreator[] } | null)?.creators || [])
    .filter((creator) => creator && creator.username && creator.track && Number.isFinite(Number(creator.lastMonthDiamonds)));
  const { data: excludedCreatorsRow } = await submissionsSupabase
    .from("poster_templates")
    .select("template_json")
    .eq("name", EXCLUDED_CREATORS_SETTINGS_NAME)
    .maybeSingle();
  const excluded = excludedUsernames(excludedCreatorsRow?.template_json);
  const visibleSavedRoster = savedRoster.filter((creator) => !excluded.has(creator.username.replace(/^@/, "").toLowerCase()));

  const { data: latestRows, error: latestError } = await submissionsSupabase
    .from("creator_daily_stats")
    .select("stat_date")
    .order("stat_date", { ascending: false })
    .limit(1);

  const statDate = text(latestRows?.[0]?.stat_date);
  if (latestError || !statDate) {
    if (visibleSavedRoster.length) return NextResponse.json({ statDate: "", hasRaceProgress: false, creators: visibleSavedRoster.map((creator) => ({ ...creator, ...creatorOverride(creator.username), diamonds: 0, validLiveDays: 0, liveHours: 0, followers: 0 })) });
    return NextResponse.json({ error: latestError?.message || "No Creator Intelligence data has been uploaded yet." }, { status: 500 });
  }

  const hasRaceProgress = statDate >= RACE_MONTH_START;

  if (visibleSavedRoster.length) {
    const progressRows: CreatorStat[] = [];
    if (hasRaceProgress) {
      for (let from = 0, hasMore = true; hasMore; from += 1000) {
        const { data, error } = await submissionsSupabase
          .from("creator_daily_stats")
          .select("creator_id, creator_username, diamonds, valid_live_days, live_hours, new_followers")
          .eq("stat_date", statDate)
          .range(from, from + 999);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        const page = (data || []) as CreatorStat[];
        progressRows.push(...page);
        hasMore = page.length === 1000;
      }
    }
    const progressByCreator = new Map(progressRows.map((row) => [creatorIdentity(row.creator_id, row.creator_username), row]));
    const progressByUsername = new Map(progressRows.map((row) => [text(row.creator_username).replace(/^@/, "").toLowerCase(), row]));
    const rosterCreatorKeys = new Set(visibleSavedRoster.map((creator) => creatorIdentity(creator.creatorId, creator.username)));
    const newBlueCreators = hasRaceProgress
      ? progressRows.flatMap((row) => {
          const username = text(row.creator_username).replace(/^@/, "");
          const creatorId = text(row.creator_id);
          const identity = creatorIdentity(creatorId, username);
          if (!username || rosterCreatorKeys.has(identity) || excluded.has(username.toLowerCase())) return [];
          return [{
            creatorId,
            username,
            lastMonthDiamonds: 0,
            track: "blue" as const,
            target: 100_000,
            diamonds: number(row.diamonds),
            validLiveDays: number(row.valid_live_days),
            liveHours: number(row.live_hours),
            followers: number(row.new_followers),
          }];
        })
      : [];
    return NextResponse.json({
      statDate,
      hasRaceProgress,
      creators: [
        ...visibleSavedRoster.map((creator) => {
          // A roster can retain an older TikTok ID after a migration, so fall
          // back to the stable username from the same daily upload.
          const progress = progressByCreator.get(creatorIdentity(creator.creatorId, creator.username))
            || progressByUsername.get(creator.username.replace(/^@/, "").toLowerCase());
          const override = creatorOverride(creator.username);
          const track = override.track || creator.track;
          const target = override.target ?? (track === "blue" ? 100_000 : creator.target);
          return { ...creator, ...override, track, target, diamonds: number(progress?.diamonds), validLiveDays: number(progress?.valid_live_days), liveHours: number(progress?.live_hours), followers: number(progress?.new_followers) };
        }),
        ...newBlueCreators,
      ],
    });
  }

  const { data: startingRows, error: startingError } = hasRaceProgress
    ? await submissionsSupabase.from("creator_daily_stats").select("stat_date").lt("stat_date", RACE_MONTH_START).order("stat_date", { ascending: false }).limit(1)
    : { data: [{ stat_date: statDate }], error: null };
  const startingDate = text(startingRows?.[0]?.stat_date) || statDate;
  if (startingError) return NextResponse.json({ error: startingError.message }, { status: 500 });

  async function loadRows(forDate: string) {
    const result: CreatorStat[] = [];
    for (let from = 0, hasMore = true; hasMore; from += 1000) {
      const { data, error } = await submissionsSupabase
        .from("creator_daily_stats")
        .select("creator_id, creator_username, diamonds, valid_live_days, live_hours, new_followers, stat_date")
        .eq("stat_date", forDate)
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      const page = (data || []) as CreatorStat[];
      result.push(...page);
      hasMore = page.length === 1000;
    }
    return result;
  }

  let progressRows: CreatorStat[];
  let tierRows: CreatorStat[];
  try {
    progressRows = await loadRows(statDate);
    tierRows = startingDate === statDate ? progressRows : await loadRows(startingDate);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load creator data." }, { status: 500 });
  }

  type SourceCreator = { creatorId: string; username: string; diamonds: number; validLiveDays: number; liveHours: number; followers: number };
  function toCreator(row: CreatorStat): SourceCreator | null {
    const username = text(row.creator_username).replace(/^@/, "");
    const creatorId = text(row.creator_id);
    if (!username) return null;
    return {
      creatorId,
      username,
      diamonds: number(row.diamonds),
      validLiveDays: number(row.valid_live_days),
      liveHours: number(row.live_hours),
      followers: number(row.new_followers),
    };
  }

  const progressByCreator = new Map<string, SourceCreator>();
  for (const row of progressRows) {
    const creator = toCreator(row);
    if (creator) progressByCreator.set(creator.creatorId || creator.username.toLowerCase(), creator);
  }
  const roster = tierRows.flatMap((row) => {
    const startingCreator = toCreator(row);
    if (!startingCreator) return [];
    const identity = startingCreator.creatorId || startingCreator.username.toLowerCase();
    const progressCreator = progressByCreator.get(identity);
    return [{
      ...startingCreator,
      lastMonthDiamonds: startingCreator.diamonds,
      diamonds: hasRaceProgress ? progressCreator?.diamonds || 0 : 0,
      validLiveDays: hasRaceProgress ? progressCreator?.validLiveDays || 0 : 0,
      liveHours: hasRaceProgress ? progressCreator?.liveHours || 0 : 0,
      followers: hasRaceProgress ? progressCreator?.followers || 0 : 0,
      ...tierFor(startingCreator.diamonds),
    }];
  });
  const rosterCreatorKeys = new Set(roster.map((creator) => creatorIdentity(creator.creatorId, creator.username)));
  const newBlueCreators = hasRaceProgress
    ? progressRows.flatMap((row) => {
        const creator = toCreator(row);
        if (!creator || rosterCreatorKeys.has(creatorIdentity(creator.creatorId, creator.username)) || excluded.has(creator.username.toLowerCase())) return [];
        return [{ ...creator, lastMonthDiamonds: 0, track: "blue" as const, target: 100_000 }];
      })
    : [];
  return NextResponse.json({
    statDate,
    startingDate,
    hasRaceProgress,
    creators: [...roster, ...newBlueCreators].filter((creator) => !excluded.has(creator.username.replace(/^@/, "").toLowerCase())),
  });
}
