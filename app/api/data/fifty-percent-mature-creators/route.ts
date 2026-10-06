import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const TIERS = [100_000, 200_000, 300_000, 500_000, 700_000, 1_000_000, 1_600_000, 2_500_000];
const clean = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => Number(clean(value).replace(/[^\d.-]/g, "")) || 0;
const identity = (row: Row) => clean(row.creator_id || row["Creator ID"]) || clean(row.creator_username || row["Creator's username"]).toLowerCase();
const username = (row: Row) => clean(row.creator_username || row["Creator's username"]).replace(/^@/, "");
const tierFor = (diamonds: number) => [...TIERS].reverse().find((tier) => diamonds >= tier) || 100_000;
const monthDays = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
const periodBounds = (row: Row) => {
  const period = clean(row.data_period);
  const range = period.match(/^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/);
  const fallback = clean(row.stat_date);
  return { start: range?.[1] || fallback, end: range?.[2] || fallback };
};

// An import can cover one date or a small range (for example 1–2 October).
// Work backwards from the latest day and select non-overlapping source periods,
// so a 1–2 range replaces its individual 1st/2nd rows instead of truncating
// the full month or counting either day twice.
function totalForPeriods(rows: Row[], month: string, lastDay: number) {
  const candidates = rows.map((row) => ({ row, ...periodBounds(row) })).filter(({ start, end }) => start.startsWith(month) && end.startsWith(month));
  let cursor = lastDay;
  let total = 0;
  while (cursor > 0) {
    const day = `${month}-${String(cursor).padStart(2, "0")}`;
    const match = candidates.filter(({ end, start }) => end === day && start <= day).sort((a, b) => a.start.localeCompare(b.start))[0];
    if (!match) { cursor -= 1; continue; }
    total += number(match.row.diamonds || match.row.Diamonds);
    cursor = Math.max(0, Number(match.start.slice(-2)) - 1);
  }
  return total;
}

async function allDailyRows(month: string) {
  const rows: Row[] = [];
  const end = `${month}-${String(monthDays(month)).padStart(2, "0")}`;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await submissionsSupabase.from("creator_daily_stats").select("*").gte("stat_date", `${month}-01`).lte("stat_date", end).or("data_period.is.null,data_period.neq.mature_month_total").order("stat_date", { ascending: true }).range(from, from + 999);
    if (error) throw Error(error.message);
    rows.push(...((data || []) as Row[]));
    if (!data || data.length < 1000) return rows;
  }
}

export async function GET() {
  try {
    const { data: latest, error: latestError } = await submissionsSupabase.from("creator_daily_stats").select("stat_date").or("data_period.is.null,data_period.neq.mature_month_total").order("stat_date", { ascending: false }).limit(1).maybeSingle();
    if (latestError) throw Error(latestError.message);
    const latestDate = clean(latest?.stat_date);
    if (!latestDate) return NextResponse.json({ latestDate: "", rows: [], qualifyingCount: 0, predictedCount: 0, predictedPercent: 0 });
    const currentMonth = latestDate.slice(0, 7);
    const [year, month] = currentMonth.split("-").map(Number);
    const previousMonthDate = new Date(year, month - 2, 1);
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;
    const [previousRows, currentRows] = await Promise.all([allDailyRows(previousMonth), allDailyRows(currentMonth)]);
    const asOfDay = Number(latestDate.slice(-2));
    const daysInMonth = monthDays(currentMonth);
    const currentByCreator = new Map<string, { diamonds: number; username: string }>();
    const grouped = new Map<string, Row[]>();
    for (const row of currentRows) { const id = identity(row); if (id) grouped.set(id, [...(grouped.get(id) || []), row]); }
    for (const [id, rows] of grouped) {
      const latestRow = [...rows].sort((a, b) => clean(b.stat_date).localeCompare(clean(a.stat_date)))[0] || {};
      const summary = {
        diamonds: totalForPeriods(rows, currentMonth, asOfDay),
        username: username(latestRow),
      };
      currentByCreator.set(id, summary);
    }
    // September's daily uploads are the source of truth. Aggregate the full
    // prior month directly instead of relying on a separate monthly import.
    const priorByCreator = new Map<string, Row[]>();
    for (const row of previousRows) { const id = identity(row); if (id) priorByCreator.set(id, [...(priorByCreator.get(id) || []), row]); }
    const priorTotals = [...priorByCreator.values()].map((rows) => {
      const latestRow = [...rows].sort((a, b) => clean(b.stat_date).localeCompare(clean(a.stat_date)))[0] || {};
      return { ...latestRow, diamonds: totalForPeriods(rows, previousMonth, monthDays(previousMonth)) };
    }).filter((row) => number(row.diamonds) >= 200_000);
    const rows = priorTotals.map((row) => {
      const id = identity(row);
      const previousDiamonds = number(row.diamonds);
      const current = currentByCreator.get(id);
      const currentDiamonds = current?.diamonds || 0;
      const target = tierFor(previousDiamonds);
      const projectedDiamonds = asOfDay ? Math.round(currentDiamonds / asOfDay * daysInMonth) : 0;
      const predictedPercent = target ? projectedDiamonds / target * 100 : 0;
      const status = predictedPercent >= 100 ? "green" : predictedPercent >= 75 ? "orange" : "red";
      return { creatorId: id, username: current?.username || username(row), previousDiamonds, target, currentDiamonds, projectedDiamonds, currentPercent: Math.min(100, currentDiamonds / target * 100), predictedPercent, status, remaining: Math.max(target - currentDiamonds, 0) };
    }).sort((a, b) => b.predictedPercent - a.predictedPercent || b.currentDiamonds - a.currentDiamonds);
    const predictedCount = rows.filter((row) => row.status === "green").length;
    return NextResponse.json({ previousMonth, currentMonth, latestDate, asOfDay, daysInMonth, qualifyingCount: rows.length, predictedCount, predictedPercent: rows.length ? predictedCount / rows.length * 100 : 0, rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load the mature creator tracker." }, { status: 500 }); }
}
