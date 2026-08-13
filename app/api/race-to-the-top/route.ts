import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type CreatorStat = Record<string, unknown>;

type TrackId = "blue" | "bronze" | "silver" | "gold" | "platinum";
const RACE_MONTH_START = "2026-08-01";
const RACE_ROSTER_SETTINGS_NAME = "race-to-the-top-2026-08-roster";
const EXCLUDED_CREATORS_SETTINGS_NAME = "excluded-creators-settings";
type CreatorOverride = Partial<Pick<SavedRosterCreator, "track" | "target">> & { validLiveDaysBonus?: number; liveHoursBonus?: number };
const CREATOR_OVERRIDES: Record<string, CreatorOverride> = {
  lucylou449: { target: 700_000 },
  dylanjinks: { target: 700_000 },
  arabellama_y: { track: "gold", target: 300_000 },
  doryelizabeth09: { track: "gold", target: 300_000, validLiveDaysBonus: 2, liveHoursBonus: 5 },
  jacobr015: { validLiveDaysBonus: 1 },
  leanneonlife: { validLiveDaysBonus: 2 },
  poppy_cooper06: { validLiveDaysBonus: 2 },
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

function stableCreatorId(value: unknown) {
  const id = text(value);
  return /^\d+$/.test(id) ? id : "";
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
          .select("creator_id, creator_username, diamonds, valid_live_days, live_hours, new_followers, stat_date")
          .gte("stat_date", RACE_MONTH_START)
          .lte("stat_date", statDate)
          .range(from, from + 999);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        const page = (data || []) as CreatorStat[];
        progressRows.push(...page);
        hasMore = page.length === 1000;
      }
    }
    type Progress = { creatorId: string; username: string; diamonds: number; validLiveDays: number; liveHours: number; followers: number };
    const creatorIdByUsername = new Map<string, string>();
    for (const row of progressRows) {
      const username = text(row.creator_username).replace(/^@/, "").toLowerCase();
      const creatorId = stableCreatorId(row.creator_id);
      if (username && creatorId) creatorIdByUsername.set(username, creatorId);
    }
    // A daily import replaces a whole source-day. Recalculate from those daily
    // snapshots, making reruns safe and avoiding mutation-based double counts.
    const dailyProgress = new Map<string, CreatorStat>();
    for (const row of progressRows) {
      const username = text(row.creator_username).replace(/^@/, "").toLowerCase();
      if (!username) continue;
      const identity = stableCreatorId(row.creator_id) || creatorIdByUsername.get(username) || username;
      const key = `${text(row.stat_date)}:${identity}`;
      const existing = dailyProgress.get(key);
      const isBetterRow = !existing
        || (Boolean(stableCreatorId(row.creator_id)) && !stableCreatorId(existing.creator_id))
        || number(row.diamonds) > number(existing.diamonds);
      if (isBetterRow) dailyProgress.set(key, row);
    }
    const progressByCreator = new Map<string, Progress>();
    const progressByUsername = new Map<string, Progress>();
    const latestUsernameByCreator = new Map<string, string>();
    for (const row of dailyProgress.values()) {
      const username = text(row.creator_username).replace(/^@/, "");
      const normalizedUsername = username.toLowerCase();
      const creatorId = stableCreatorId(row.creator_id) || creatorIdByUsername.get(normalizedUsername) || "";
      const identity = creatorId || normalizedUsername;
      const previous = progressByCreator.get(identity);
      const progress: Progress = { creatorId, username, diamonds: (previous?.diamonds || 0) + number(row.diamonds), validLiveDays: (previous?.validLiveDays || 0) + number(row.valid_live_days), liveHours: (previous?.liveHours || 0) + number(row.live_hours), followers: (previous?.followers || 0) + number(row.new_followers) };
      progressByCreator.set(identity, progress);
      progressByUsername.set(normalizedUsername, progress);
      if (creatorId) latestUsernameByCreator.set(creatorId, username);
    }

    function completionDateFor(creator: { creatorId: string; username: string; track: TrackId; target: number }, override: CreatorOverride = {}) {
      const requirements: Record<TrackId, { days: number; hours: number; followers: number }> = {
        blue: { days: 8, hours: 20, followers: 75 }, bronze: { days: 11, hours: 30, followers: 100 }, silver: { days: 15, hours: 40, followers: 150 }, gold: { days: 18, hours: 60, followers: 200 }, platinum: { days: 22, hours: 80, followers: 250 },
      };
      const creatorId = stableCreatorId(creator.creatorId);
      const username = creator.username.replace(/^@/, "").toLowerCase();
      const timeline = Array.from(dailyProgress.values()).filter((row) => {
        const rowUsername = text(row.creator_username).replace(/^@/, "").toLowerCase();
        return (creatorId && stableCreatorId(row.creator_id) === creatorId) || rowUsername === username;
      }).sort((a, b) => text(a.stat_date).localeCompare(text(b.stat_date)));
      const required = requirements[creator.track];
      let diamonds = 0; let validLiveDays = number(override.validLiveDaysBonus); let liveHours = number(override.liveHoursBonus); let followers = 0;
      for (const row of timeline) {
        diamonds += number(row.diamonds); validLiveDays += number(row.valid_live_days); liveHours += number(row.live_hours); followers += number(row.new_followers);
        if (diamonds >= creator.target && validLiveDays >= required.days && liveHours >= required.hours && followers >= required.followers) return text(row.stat_date);
      }
      return "";
    }

    // Daily exports are full snapshots. Anyone who appears in today's export
    // but not the immediately preceding export is a new creator and begins
    // in the Blue track automatically.
    const { data: previousExportRows } = await submissionsSupabase
      .from("creator_daily_stats")
      .select("stat_date")
      .lt("stat_date", statDate)
      .order("stat_date", { ascending: false })
      .limit(1);
    const previousExportDate = text(previousExportRows?.[0]?.stat_date);
    const previousCreatorKeys = new Set<string>();
    if (previousExportDate) {
      for (let from = 0, hasMore = true; hasMore; from += 1000) {
        const { data, error } = await submissionsSupabase
          .from("creator_daily_stats")
          .select("creator_id, creator_username")
          .eq("stat_date", previousExportDate)
          .range(from, from + 999);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        const page = (data || []) as CreatorStat[];
        for (const row of page) {
          const username = text(row.creator_username).replace(/^@/, "");
          if (username) previousCreatorKeys.add(creatorIdentity(row.creator_id, username));
        }
        hasMore = page.length === 1000;
      }
    }
    const savedRosterKeys = new Set(visibleSavedRoster.map((creator) => creatorIdentity(creator.creatorId, creator.username)));
    const newCreatorKeys = new Set<string>();
    const newBlueCreators = previousExportDate
      ? progressRows.flatMap((row) => {
          if (text(row.stat_date) !== statDate) return [];
          const username = text(row.creator_username).replace(/^@/, "");
          if (!username) return [];
          const identity = creatorIdentity(row.creator_id, username);
          if (previousCreatorKeys.has(identity) || savedRosterKeys.has(identity) || excluded.has(username.toLowerCase()) || newCreatorKeys.has(identity)) return [];
          newCreatorKeys.add(identity);
          const progress = progressByCreator.get(stableCreatorId(row.creator_id) || username.toLowerCase()) || progressByUsername.get(username.toLowerCase());
          const override = creatorOverride(username);
          const track = override.track || "blue";
          return [{ creatorId: stableCreatorId(row.creator_id), username, lastMonthDiamonds: 0, track, target: override.target ?? 100_000, diamonds: number(progress?.diamonds), validLiveDays: number(progress?.validLiveDays) + number(override.validLiveDaysBonus), liveHours: number(progress?.liveHours) + number(override.liveHoursBonus), followers: number(progress?.followers) }];
        })
      : [];
    const forcedDoryRow = !savedRosterKeys.has("doryelizabeth09") && !newCreatorKeys.has("doryelizabeth09")
      ? progressRows.find((row) => text(row.stat_date) === statDate && text(row.creator_username).replace(/^@/, "").toLowerCase() === "doryelizabeth09")
      : undefined;
    const forcedDory = forcedDoryRow ? (() => {
      const username = text(forcedDoryRow.creator_username).replace(/^@/, "");
      const progress = progressByCreator.get(stableCreatorId(forcedDoryRow.creator_id) || username.toLowerCase()) || progressByUsername.get(username.toLowerCase());
      return { creatorId: stableCreatorId(forcedDoryRow.creator_id), username, lastMonthDiamonds: 0, track: "gold" as TrackId, target: 300_000, diamonds: number(progress?.diamonds), validLiveDays: number(progress?.validLiveDays) + 2, liveHours: number(progress?.liveHours) + 5, followers: number(progress?.followers) };
    })() : null;
    return NextResponse.json({
      statDate,
      hasRaceProgress,
      creators: [
        ...visibleSavedRoster.map((creator) => {
          // A roster can retain an older TikTok ID after a migration, so fall
          // back to the stable username from the same daily upload.
          const progress = progressByCreator.get(stableCreatorId(creator.creatorId))
            || progressByUsername.get(creator.username.replace(/^@/, "").toLowerCase());
          const username = latestUsernameByCreator.get(stableCreatorId(creator.creatorId)) || progress?.username || creator.username;
          const override = creatorOverride(username);
          const track = override.track || creator.track;
          const target = override.target ?? (track === "blue" ? 100_000 : creator.target);
          return { ...creator, ...override, username, track, target, diamonds: number(progress?.diamonds), validLiveDays: number(progress?.validLiveDays) + number(override.validLiveDaysBonus), liveHours: number(progress?.liveHours) + number(override.liveHoursBonus), followers: number(progress?.followers), completedAt: completionDateFor({ creatorId: creator.creatorId, username, track, target }, override) };
        }),
        ...newBlueCreators,
        ...(forcedDory ? [forcedDory] : []),
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
