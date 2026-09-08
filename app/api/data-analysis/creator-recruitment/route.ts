import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const text = (value: unknown) => String(value || "").trim();
const username = (row: Row) => text(row.creator_username || row["Creator's username"] || row.username).replace(/^@/, "");
const key = (value: unknown) => text(value).replace(/^@/, "").toLowerCase();
const manager = (row: Row) => text(row.creator_network_manager || row["Creator Network manager"] || row.manager_email || row.email);
const agency = (row: Row) => text(row.agency || row.group_name || row.team);

function quittingRecords(value: unknown) {
  const records = (value && typeof value === "object" ? value as { records?: unknown[] } : {}).records;
  return new Map((Array.isArray(records) ? records : []).flatMap((record) => {
    const item = record && typeof record === "object" ? record as Row : {};
    const name = key(item.username);
    return name ? [[name, text(item.reason)]] : [];
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const usernames = [...new Set((Array.isArray(body.usernames) ? body.usernames : []).map(key).filter(Boolean))].slice(0, 100);
    if (!usernames.length) return NextResponse.json({ creators: {} });

    const [{ data: latest, error: latestError }, { data: quitting, error: quittingError }] = await Promise.all([
      submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1).maybeSingle(),
      submissionsSupabase.from("poster_templates").select("template_json").eq("name", "quitting-records").maybeSingle(),
    ]);
    if (latestError) throw new Error(latestError.message);
    if (quittingError) throw new Error(quittingError.message);
    const latestDate = text(latest?.stat_date);
    if (!latestDate) return NextResponse.json({ creators: {} });

    const { data, error } = await submissionsSupabase
      .from("creator_daily_stats")
      .select("*")
      .eq("stat_date", latestDate)
      .in("creator_username", usernames)
      .or("data_period.is.null,data_period.neq.mature_month_total");
    if (error) throw new Error(error.message);

    const quittingByUsername = quittingRecords(quitting?.template_json);
    const creators = Object.fromEntries(((data || []) as Row[]).flatMap((row) => {
      const name = key(username(row));
      if (!name) return [];
      const quitReason = quittingByUsername.get(name) || "";
      return [[name, {
        creatorId: text(row.creator_id || row["Creator ID"]),
        manager: manager(row),
        agency: agency(row),
        alreadyManaged: Boolean(manager(row) || agency(row)),
        quittingRecord: Boolean(quitReason),
        quittingReason: quitReason,
        lastInternalUpdate: latestDate,
      }]];
    }));
    return NextResponse.json({ creators });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load internal recruitment context." }, { status: 500 });
  }
}
