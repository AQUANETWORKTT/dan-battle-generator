import fs from "node:fs/promises";

const source = await fs.readFile("lib/submissions-supabase.ts", "utf8");
const key = source.match(/eyJ[a-zA-Z0-9_.-]+/)?.[0];
if (!key) throw new Error("Could not read the data connection.");

const base = "https://dxupgmsscysvztxdtaku.supabase.co/rest/v1/creator_daily_stats";
const fields = ["stat_date", "creator_id", "creator_username", "email", "manager_email", "group_name", "agency", "team", "diamonds", "live_hours", "live_streams", "followers", "valid_live_days", "data_period"].join(",");

async function getMonth(month, endDay) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const query = new URLSearchParams({
      select: fields,
      stat_date: `gte.${month}-01`,
      order: "stat_date.asc",
      limit: "1000",
      offset: String(offset),
      or: "(data_period.is.null,data_period.neq.mature_month_total)",
    });
    query.append("stat_date", `lte.${month}-${String(endDay).padStart(2, "0")}`);
    const response = await fetch(`${base}?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!response.ok) throw new Error(`Data request failed: ${response.status} ${await response.text()}`);
    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
}

const [september, october] = await Promise.all([getMonth("2026-09", 30), getMonth("2026-10", 6)]);
await fs.writeFile("outputs/creator-monthly-analysis/creator-data.json", JSON.stringify({ september, october }, null, 2));
console.log(JSON.stringify({ septemberRows: september.length, octoberRows: october.length }));
