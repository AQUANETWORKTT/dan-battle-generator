import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const creatorId = url.searchParams.get("creatorId")?.trim() || "";
  const username = url.searchParams.get("username")?.trim().replace(/^@/, "") || "";

  if (!creatorId && !username) {
    return NextResponse.json({ error: "Enter a Creator ID or username." }, { status: 400 });
  }
  if (creatorId && !/^\d{10,}$/.test(creatorId)) {
    return NextResponse.json({ error: "Creator ID must be numeric." }, { status: 400 });
  }
  if (username && !/^[a-z0-9._-]+$/i.test(username)) {
    return NextResponse.json({ error: "Enter a valid username." }, { status: 400 });
  }

  let query = submissionsSupabase
    .from("creator_daily_stats")
    .select("*")
    .or("data_period.is.null,data_period.neq.mature_month_total")
    .order("stat_date", { ascending: false })
    .limit(30);
  query = creatorId ? query.eq("creator_id", creatorId) : query.ilike("creator_username", username);
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const latestRow = rows[0] as Record<string, unknown> | undefined;
  const lastManagedRow = rows.find((row) => String(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email || "").trim()) as Record<string, unknown> | undefined;
  const attributionRow = lastManagedRow || latestRow;
  const statDate = String(attributionRow?.stat_date || "");
  const daysSinceJoining = Number(attributionRow?.days_since_joining || attributionRow?.["Days since joining"] || 0);
  let joinedDate = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(statDate) && daysSinceJoining >= 0) { const joined = new Date(`${statDate}T12:00:00`); joined.setDate(joined.getDate() - Math.max(0, daysSinceJoining - 1)); joinedDate = joined.toISOString().slice(0, 10); }
  const team = String(attributionRow?.team || "");
  const rawManager = String(attributionRow?.manager_email || attributionRow?.creator_network_manager || attributionRow?.["Creator Network manager"] || attributionRow?.email || "");
  const unassignedFirstClass = /unassigned first class/i.test(team);
  const savedCreatorId = rows.map((row) => String(row.creator_id || "").trim()).find((id) => /^\d{10,}$/.test(id)) || "";
  return NextResponse.json({
    creatorId: creatorId || savedCreatorId,
    username: rows.find((row) => row.creator_username)?.creator_username || username,
    manager: rawManager || (unassignedFirstClass ? "Unassigned First Class" : ""),
    group: unassignedFirstClass ? "First Class" : String(attributionRow?.group_name || team || ""),
    joinedDate,
    count: rows.length,
    rows,
  });
}
