import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function londonDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (name: string) => parts.find((part) => part.type === name)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL;
  const key = process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Backstage connection is not configured." }, { status: 500 });

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("creator_daily_stats")
    .select("stat_date")
    .or("data_period.is.null,data_period.neq.mature_month_total")
    .order("stat_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const latestDate = String(data?.stat_date || "");
  const expectedDate = londonDate(-1);
  return NextResponse.json({ latestDate, expectedDate, updatedToday: latestDate === expectedDate });
}
