import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";
const SETTINGS = "quitting-records";
type Row = Record<string, unknown>;
const text = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => Number(text(value).replace(/[^\d.-]/g, "")) || 0;
const username = (row: Row) => text(row.creator_username || row["Creator's username"]).replace(/^@/, "");
const creatorId = (row: Row) => /^\d{8,}$/.test(text(row.creator_id || row["Creator ID"])) ? text(row.creator_id || row["Creator ID"]) : "";
const manager = (row: Row) => text(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email);
const hasQuitNetwork = (row: Row) => /creator\s+has\s+quit\s+(the\s+)?network|quit\s+(the\s+)?creator\s+network/i.test(JSON.stringify(row));

function clean(value: unknown) { const row = value && typeof value === "object" ? value as Row : {}; return { username: username(row) || text(row.username), creatorId: text(row.creatorId), managers: Array.isArray(row.managers) ? row.managers.map(text).filter(Boolean) : [], groups: Array.isArray(row.groups) ? row.groups.map(text).filter(Boolean) : [], diamonds: number(row.diamonds), daysSinceJoining: number(row.daysSinceJoining), quitAt: text(row.quitAt), reason: text(row.reason), createdAt: text(row.createdAt) || new Date().toISOString() }; }
async function saved() { const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS).maybeSingle(); if (error) throw new Error(error.message); return (Array.isArray((data?.template_json as { records?: unknown[] } | null)?.records) ? (data?.template_json as { records: unknown[] }).records : []).map(clean).filter((row) => row.creatorId || row.username); }
async function save(records: ReturnType<typeof clean>[]) { const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS, template_json: { records }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" }); if (error) throw new Error(error.message); return records; }
async function rowsSince(start: string) { const all: Row[] = []; for (let from = 0; ; from += 1000) { const { data, error } = await submissionsSupabase.from("creator_daily_stats").select("*").gte("stat_date", start).or("data_period.is.null,data_period.neq.mature_month_total").order("stat_date", { ascending: true }).range(from, from + 999); if (error) throw new Error(error.message); all.push(...((data || []) as Row[])); if (!data || data.length < 1000) return all; } }

export async function GET() { try { return NextResponse.json({ records: await saved() }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load quitting records." }, { status: 500 }); } }
export async function POST(request: Request) { try {
  const input = await request.json();
  if (input.action === "delete-record") { const records = (await saved()).filter((record) => record.username.toLowerCase() !== text(input.username).replace(/^@/, "").toLowerCase()); return NextResponse.json({ records: await save(records) }); }
  if (input.action === "update-reason") { const name = text(input.username).replace(/^@/, "").toLowerCase(); const records = (await saved()).map((record) => record.username.toLowerCase() === name ? { ...record, reason: text(input.reason) } : record); return NextResponse.json({ records: await save(records) }); }
  if (input.action !== "detect-and-save") return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  const { data: latest, error } = await submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1).maybeSingle(); if (error) throw new Error(error.message);
  const latestDate = text(latest?.stat_date); if (!latestDate) return NextResponse.json({ records: [], detected: 0 });
  const start = new Date(`${latestDate}T12:00:00`); start.setDate(start.getDate() - 62);
  const rows = await rowsSince(start.toISOString().slice(0, 10));
  const counts = new Map<string, number>(); for (const row of rows) if (creatorId(row)) counts.set(text(row.stat_date), (counts.get(text(row.stat_date)) || 0) + 1);
  const largest = Math.max(...counts.values(), 0); const fullDates = new Set([...counts].filter(([, count]) => count >= largest * .75).map(([date]) => date)); const newestFullDate = [...fullDates].sort().at(-1) || latestDate;
  const active = new Set(rows.filter((row) => text(row.stat_date) === newestFullDate).map(creatorId).filter(Boolean)); const byId = new Map<string, Row[]>();
  for (const row of rows) { const id = creatorId(row); if (id && fullDates.has(text(row.stat_date))) byId.set(id, [...(byId.get(id) || []), row]); }
  const prior = new Map((await saved()).map((record) => [record.creatorId || record.username.toLowerCase(), record])); const detected: ReturnType<typeof clean>[] = [];
  for (const [id, history] of byId) { history.sort((a, b) => text(a.stat_date).localeCompare(text(b.stat_date))); const last = history.at(-1)!; const days = number(last.days_since_joining || last["Days since joining"]); if (days >= 15 || (active.has(id) && !hasQuitNetwork(last))) continue; const record = clean({ username: username(last), creatorId: id, managers: [...new Set(history.map(manager).filter(Boolean))], groups: [...new Set(history.map((row) => text(row.group_name || row.team)).filter(Boolean))], diamonds: history.reduce((sum, row) => sum + number(row.diamonds || row.Diamonds), 0), daysSinceJoining: days, quitAt: text(last.stat_date), createdAt: `${text(last.stat_date)}T12:00:00.000Z` }); detected.push({ ...prior.get(id), ...record, reason: prior.get(id)?.reason || "" }); }
  const records = [...prior.values()].filter((record) => record.daysSinceJoining < 15 && !detected.some((item) => item.creatorId === record.creatorId)).concat(detected).sort((a, b) => b.quitAt.localeCompare(a.quitAt)); return NextResponse.json({ records: await save(records), detected: detected.length, latestDate: newestFullDate });
} catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not find early quits." }, { status: 500 }); } }
