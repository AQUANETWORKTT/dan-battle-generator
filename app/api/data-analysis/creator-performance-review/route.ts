import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type Decision = "KEEP" | "REVIEW" | "GO TO A MANAGER" | "AGE BAND" | "REMOVE" | "HIGH QUALITY BUT INACTIVE";
const SETTINGS_NAME = "creator-performance-review-decisions";
const decisions: Decision[] = ["KEEP", "REVIEW", "GO TO A MANAGER", "AGE BAND", "REMOVE", "HIGH QUALITY BUT INACTIVE"];

const clean = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const managerKey = (row: Row) => clean(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email).toLowerCase().replace(/[^a-z0-9]/g, "");
const username = (row: Row) => clean(row.creator_username || row["Creator's username"] || row.username).replace(/^@/, "").toLowerCase();
const creatorKey = (row: Row) => clean(row.creator_id || username(row)).toLowerCase();
const hours = (row: Row) => row.live_hours != null ? number(row.live_hours) : number(clean(row.live_duration).match(/(\d+(?:\.\d+)?)\s*h/i)?.[1]) + number(clean(row.live_duration).match(/(\d+(?:\.\d+)?)\s*m/i)?.[1]) / 60;
const dayValue = (row: Row) => number(row.valid_days ?? row.valid_live_days) || (hours(row) >= 1 ? 1 : 0);
const monthTotal = (row: Row) => {
  const period = clean(row.data_period);
  const match = period.match(/^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/);
  return Boolean(match && match[1] !== match[2]);
};
const defaultTeamDan = (manager: string) => /(cjtokens1237|teamalf|firstclassagencyalf|firstclassagencyabbie|firstclassagencyolivia|sjm20101|firstclassagencypaige|jasminabidzane|connorfirstclass|brandyfalconer35|fearnegurry1|demileawebster7|louisesquelch|ashwalbridge|candiceaquaagency|firstclassagencykyran|kbon03|kaybon03)/.test(manager);

function settings(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const saved = record.decisions && typeof record.decisions === "object" ? record.decisions as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(saved).filter(([, decision]) => decisions.includes(decision as Decision)).map(([creator, decision]) => [creator.toLowerCase(), decision as Decision])) as Record<string, Decision>;
}

export async function GET() {
  try {
    const { data: newest, error: newestError } = await submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1).maybeSingle();
    const latestDate = clean(newest?.stat_date);
    if (newestError || !latestDate) throw Error(newestError?.message || "No creator data has been uploaded yet.");

    const latest = new Date(`${latestDate}T12:00:00Z`);
    const start = new Date(latest);
    // Include the latest uploaded date and the 29 dates immediately before it:
    // a continually updating, rolling 30-day window.
    start.setUTCDate(start.getUTCDate() - 29);
    const startDate = start.toISOString().slice(0, 10);
    const rows: Row[] = [];
    for (let from = 0, more = true; more; from += 1000) {
      const { data, error } = await submissionsSupabase.from("creator_daily_stats").select("*").gte("stat_date", startDate).lte("stat_date", latestDate).order("stat_date", { ascending: true }).range(from, from + 999);
      if (error) throw Error(error.message);
      const page = (data || []) as Row[];
      rows.push(...page);
      more = page.length === 1000;
    }
    const { data: assignmentSetting, error: assignmentError } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", "manager-assignment-settings").maybeSingle();
    if (assignmentError) throw Error(assignmentError.message);
    const assignments = ((assignmentSetting?.template_json as Record<string, unknown> | null)?.assignments as Record<string, unknown> | undefined)?.managerGroups as Record<string, unknown> || {};
    const { data: reviewSetting, error: reviewError } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
    if (reviewError) throw Error(reviewError.message);

    const current = new Map<string, Row>();
    rows.filter((row) => clean(row.stat_date) === latestDate && !monthTotal(row)).forEach((row) => { const id = creatorKey(row); if (id && username(row)) current.set(id, row); });
    const output = [...current.entries()].flatMap(([id, latestRow]) => {
      const manager = managerKey(latestRow);
      const directDan = manager.startsWith("firstclassagencydan");
      const teamDan = assignments[manager] === "Team Dan / James" || defaultTeamDan(manager);
      if (!directDan && !teamDan) return [];
      const history = rows.filter((row) => creatorKey(row) === id && !monthTotal(row));
      const hoursTotal = history.reduce((sum, row) => sum + hours(row), 0);
      const diamonds = history.reduce((sum, row) => sum + number(row.diamonds), 0);
      const liveDates = [...new Set(history.filter((row) => dayValue(row) > 0).map((row) => clean(row.stat_date)))].sort();
      const lastLive = liveDates.at(-1) || "";
      const daysSinceLive = lastLive ? Math.max(0, Math.round((Date.parse(`${latestDate}T12:00:00Z`) - Date.parse(`${lastLive}T12:00:00Z`)) / 86400000)) : null;
      const diamondsPerHour = hoursTotal ? diamonds / hoursTotal : 0;
      return [{ id, username: username(latestRow), manager: clean(latestRow.manager_email || latestRow.creator_network_manager || latestRow["Creator Network manager"]), scope: directDan ? "direct" : "team", hours: hoursTotal, days: liveDates.length, diamonds, diamondsPerHour, lastLive, daysSinceLive }];
    });
    // Quality is deliberately a rounded creator-health judgement, rather than
    // a diamonds-per-hour calculation. It rewards output, time spent live,
    // regular valid live days, and being recently active.
    const creators = output.flatMap((creator) => {
      const cohort = output.filter((candidate) => candidate.scope === creator.scope);
      const percentile = (value: number, values: number[]) => values.length <= 1 ? 100 : Math.round(values.filter((item) => item <= value).length / values.length * 100);
      const diamonds = percentile(creator.diamonds, cohort.map((item) => item.diamonds));
      const hours = percentile(creator.hours, cohort.map((item) => item.hours));
      const days = percentile(creator.days, cohort.map((item) => item.days));
      const recent = creator.daysSinceLive === 0 ? 100 : creator.daysSinceLive !== null ? Math.max(0, Math.round(100 - creator.daysSinceLive / 60 * 100)) : 0;
      const quality = Math.round(diamonds * 0.4 + hours * 0.25 + days * 0.2 + recent * 0.15);
      return [{ ...creator, quality }];
    });
    return NextResponse.json({ latestDate, startDate, decisions: settings(reviewSetting?.template_json), creators }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not build creator review." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const creator = clean(body.creator).toLowerCase();
    const decision = clean(body.decision) as Decision;
    if (!creator || !decisions.includes(decision)) return NextResponse.json({ error: "Invalid review decision." }, { status: 400 });
    const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
    if (error) throw Error(error.message);
    const next = { decisions: { ...settings(data?.template_json), [creator]: decision } };
    const { error: saveError } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: next, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (saveError) throw Error(saveError.message);
    return NextResponse.json(next);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save review decision." }, { status: 500 });
  }
}
