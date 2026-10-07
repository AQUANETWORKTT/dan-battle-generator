import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type StatRow = {
  stat_date?: string | null;
  creator_id?: string | null;
  creator_username?: string | null;
  manager_email?: string | null;
  email?: string | null;
  group_name?: string | null;
  agency?: string | null;
  team?: string | null;
  diamonds?: number | null;
  live_hours?: number | null;
  live_streams?: number | null;
};

const fields = "stat_date,creator_id,creator_username,manager_email,email,group_name,agency,team,diamonds,live_hours,live_streams";
const clean = (value: unknown) => String(value || "").trim();
const value = (input: unknown) => Number(input) || 0;
const idFor = (row: StatRow) => clean(row.creator_id) || clean(row.creator_username).toLowerCase();
const daysInMonth = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
const addMonths = (month: string, amount: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

async function getRows(start: string, end: string) {
  const base = submissionsSupabase.from("creator_daily_stats").select(fields, { count: "exact", head: true }).gte("stat_date", start).lte("stat_date", end).or("data_period.is.null,data_period.neq.mature_month_total");
  const { count, error } = await base;
  if (error) throw Error(error.message);
  const pages = Math.ceil((count || 0) / 1000);
  const results: StatRow[] = [];
  for (let from = 0; from < pages * 1000; from += 6000) {
    const offsets = Array.from({ length: Math.min(6, Math.ceil((pages * 1000 - from) / 1000)) }, (_, index) => from + index * 1000);
    const batches = await Promise.all(offsets.map(async (offset) => {
      const { data, error: pageError } = await submissionsSupabase.from("creator_daily_stats").select(fields).gte("stat_date", start).lte("stat_date", end).or("data_period.is.null,data_period.neq.mature_month_total").order("stat_date", { ascending: true }).range(offset, offset + 999);
      if (pageError) throw Error(pageError.message);
      return (data || []) as StatRow[];
    }));
    batches.forEach((batch) => results.push(...batch));
  }
  return results;
}

export async function GET() {
  try {
    const { data: latest, error: latestError } = await submissionsSupabase.from("creator_daily_stats").select("stat_date").or("data_period.is.null,data_period.neq.mature_month_total").order("stat_date", { ascending: false }).limit(1).maybeSingle();
    if (latestError) throw Error(latestError.message);
    const latestDate = clean(latest?.stat_date);
    if (!latestDate) return NextResponse.json({ latestDate: "", months: [], agency: [], focus: [], creators: [] });
    const currentMonth = latestDate.slice(0, 7);
    const months = [addMonths(currentMonth, -2), addMonths(currentMonth, -1), currentMonth];
    const rows = await getRows(`${months[0]}-01`, latestDate);
    const creators = new Map<string, { id: string; username: string; manager: string; group: string; agency: string; team: string; profileDate: string; days: Record<string, { diamonds: number; hours: number; streams: number }> }>();
    for (const row of rows) {
      const id = idFor(row);
      const date = clean(row.stat_date);
      if (!id || !date) continue;
      const creator = creators.get(id) || { id, username: clean(row.creator_username).replace(/^@/, "") || "Unknown", manager: clean(row.manager_email || row.email) || "Unassigned", group: clean(row.group_name) || "Not in a group", agency: clean(row.agency), team: clean(row.team), profileDate: date, days: {} };
      // Group/manager assignments can change. Always show the most recent
      // assignment rather than the one from an older August or September row.
      if (date >= creator.profileDate) {
        creator.username = clean(row.creator_username).replace(/^@/, "") || creator.username;
        creator.manager = clean(row.manager_email || row.email) || creator.manager;
        creator.group = clean(row.group_name) || creator.group;
        creator.agency = clean(row.agency) || creator.agency;
        creator.team = clean(row.team) || creator.team;
        creator.profileDate = date;
      }
      const daily = creator.days[date] || { diamonds: 0, hours: 0, streams: 0 };
      daily.diamonds += value(row.diamonds);
      daily.hours += value(row.live_hours);
      daily.streams += value(row.live_streams);
      creator.days[date] = daily;
      creators.set(id, creator);
    }
    const currentDays = Number(latestDate.slice(-2));
    const monthTotals = (creator: { days: Record<string, { diamonds: number; hours: number; streams: number }> }, month: string, end = daysInMonth(month)) => Array.from({ length: end }, (_, index) => creator.days[`${month}-${String(index + 1).padStart(2, "0")}`] || { diamonds: 0, hours: 0, streams: 0 });
    const agency = months.map((month) => ({ month, diamonds: Array.from({ length: daysInMonth(month) }, (_, index) => [...creators.values()].reduce((total, creator) => total + (creator.days[`${month}-${String(index + 1).padStart(2, "0")}`]?.diamonds || 0), 0)) }));
    const prepared = [...creators.values()].map((creator) => {
      const monthly = Object.fromEntries(months.map((month) => [month, monthTotals(creator, month, month === currentMonth ? currentDays : daysInMonth(month))]));
      const totals = Object.fromEntries(months.map((month) => [month, monthly[month].reduce((total, day) => total + day.diamonds, 0)]));
      const hours = Object.fromEntries(months.map((month) => [month, monthly[month].reduce((total, day) => total + day.hours, 0)]));
      // The chase-up benchmark is the creator's own September monthly pace:
      // September total ÷ 30 days × the number of October days uploaded.
      const priorPace = totals[months[1]] / daysInMonth(months[1]) * currentDays;
      const current = totals[currentMonth];
      const drop = current - priorPace;
      const mature = months.some((month) => totals[month] >= 200_000);
      return { ...creator, monthly, totals, hours, priorPace, current, drop, dropPercent: priorPace ? drop / priorPace : 0, mature };
    });
    const focus = prepared.filter((creator) => creator.priorPace > 0 && creator.drop < -10_000).sort((a, b) => a.drop - b.drop).map((creator) => ({ id: creator.id, username: creator.username, manager: creator.manager, group: creator.group, august: creator.totals[months[0]], september: creator.totals[months[1]], october: creator.current, priorPace: creator.priorPace, drop: creator.drop, dropPercent: creator.dropPercent, octoberHours: creator.hours[currentMonth] }));
    const matureCreators = prepared.filter((creator) => creator.mature).sort((a, b) => Math.max(...months.map((month) => b.totals[month])) - Math.max(...months.map((month) => a.totals[month]))).map((creator) => ({ id: creator.id, username: creator.username, manager: creator.manager, group: creator.group, totals: creator.totals, hours: creator.hours, monthly: creator.monthly }));
    return NextResponse.json({ latestDate, months, currentDays, agency, focus, creators: matureCreators, totalCreators: creators.size }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load mature creator growth data." }, { status: 500 });
  }
}
