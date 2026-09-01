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
  const statDate = String(latestRow?.stat_date || "");
  const daysSinceJoining = Number(latestRow?.days_since_joining || latestRow?.["Days since joining"] || 0);
  let joinedDate = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(statDate) && daysSinceJoining >= 1) { const joined = new Date(`${statDate}T12:00:00`); joined.setDate(joined.getDate() - (daysSinceJoining - 1)); joinedDate = joined.toISOString().slice(0, 10); }
  return NextResponse.json({
    creatorId: creatorId || rows.find((row) => row.creator_id)?.creator_id || "",
    username: rows.find((row) => row.creator_username)?.creator_username || username,
    manager: String(latestRow?.manager_email || latestRow?.creator_network_manager || latestRow?.["Creator Network manager"] || latestRow?.email || ""),
    joinedDate,
    count: rows.length,
    rows,
  });
}
