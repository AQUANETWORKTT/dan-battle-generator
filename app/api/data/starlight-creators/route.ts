import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";
const PREFIX = "starlight-creator-upload-";
type Row = Record<string, unknown>;
type StarlightCreator = { creatorId: string; username: string; achieved: boolean; currentlyAchieved?: boolean; contribution: number; firstTimePoints: number; totalPoints: number; starCreatorDays: number; steadyPresence: string; activeInteraction: string; validLiveRate: string; interactions: string; refinedVisuals: string; compliantContent: string };

const clean = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const key = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const managerRaw = (row: Row) => clean(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email);
const managerKey = (row: Row) => key(managerRaw(row));
const creatorId = (row: Row) => clean(row.creator_id || row["Creator ID"] || row["Creator ID:"]);
const username = (row: Row) => clean(row.creator_username || row["Creator's username"] || row.username).replace(/^@/, "");
const defaultFirstClass = (manager: string) => /(cjtokens1237|teamalf|firstclassagencyalf|firstclassagencyabbie|firstclassagencyolivia|sjm20101|firstclassagencypaige|jasminabidzane|connorfirstclass|brandyfalconer35|fearnegurry1|demileawebster7|louisesquelch|ashwalbridge|candiceaquaagency|firstclassagencykyran|kbon03|kaybon03|mikehalesjb|zaliheyoncu|firstclassagencykayden|xaramills17|rachellouise18|firstclassagencylauren|liamproctor04|abbidl|kishaunnolan1|calliecrawford14|megan25121990)/.test(manager);
const managerName = (raw: string, configured: string | undefined) => configured || `Team ${raw.split("@")[0].replace(/^firstclassagency[_.-]?/i, "").replace(/[_.-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}`.trim();
const milestoneBonus = (days: number) => (days >= 5 ? 10 : 0) + (days >= 10 ? 15 : 0) + (days >= 15 ? 20 : 0) + (days >= 20 ? 25 : 0);

function extract(file: ArrayBuffer) {
  const workbook = XLSX.read(file, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  // TikTok's export begins with a campaign-period title row, followed by the
  // real field-name row. Locate the latter instead of relying on a fixed row.
  const headerIndex = grid.findIndex((cells) => cells.some((cell) => clean(cell).toLowerCase() === "creator id:"));
  if (headerIndex < 0) throw Error("This is not a recognised Starlight Creator export.");
  const headers = (grid[headerIndex] || []).map(clean);
  const column = (name: string) => headers.findIndex((header) => header.toLowerCase() === name.toLowerCase());
  const columns = { id: column("Creator ID:"), username: column("Creator username"), achieved: column("Achieved Star Creator"), firstTime: column("First-time Star Creator"), contribution: column("Contribution value"), firstTimePoints: column("First-time Star Creator points"), totalPoints: column("Total Star Creator points"), days: column("Star Creator days"), steadyPresence: column("Steady presence"), activeInteraction: column("Active interaction"), validLiveRate: column("Valid go LIVE rate in last 30d"), interactions: column("Interactions"), refinedVisuals: column("Refined visuals"), compliantContent: column("Compliant content") };
  if (columns.id < 0 || columns.username < 0 || columns.achieved < 0) throw Error("This is not a recognised Starlight Creator export.");
  return grid.slice(headerIndex + 1).flatMap((cells) => {
    const id = clean(cells[columns.id]);
    if (!id) return [];
    // The campaign's "Achieved Star Creator" field is a month-to-date status.
    // For the daily achievement count and manager follow-up, use the export's
    // dedicated first-time field so creators are counted once when they qualify.
    return [{ creatorId: id, username: clean(cells[columns.username]).replace(/^@/, ""), achieved: clean(cells[columns.firstTime]).toLowerCase() === "yes", currentlyAchieved: clean(cells[columns.achieved]).toLowerCase() === "yes", contribution: number(cells[columns.contribution]), firstTimePoints: number(cells[columns.firstTimePoints]), totalPoints: number(cells[columns.totalPoints]), starCreatorDays: number(cells[columns.days]), steadyPresence: clean(cells[columns.steadyPresence]), activeInteraction: clean(cells[columns.activeInteraction]), validLiveRate: clean(cells[columns.validLiveRate]), interactions: clean(cells[columns.interactions]), refinedVisuals: clean(cells[columns.refinedVisuals]), compliantContent: clean(cells[columns.compliantContent]) } satisfies StarlightCreator];
  });
}

async function currentProfiles() {
  const { data: latestData, error: latestError } = await submissionsSupabase.from("creator_daily_stats").select("stat_date").order("stat_date", { ascending: false }).limit(1).maybeSingle();
  const statDate = clean(latestData?.stat_date);
  if (latestError || !statDate) throw Error(latestError?.message || "Upload the normal daily Creator data before opening Starlight.");
  const [{ data: rows, error: rowsError }, { data: setting, error: settingError }] = await Promise.all([
    submissionsSupabase.from("creator_daily_stats").select("*").eq("stat_date", statDate),
    submissionsSupabase.from("poster_templates").select("template_json").eq("name", "manager-assignment-settings").maybeSingle(),
  ]);
  if (rowsError || settingError) throw Error(rowsError?.message || settingError?.message || "Could not load creator manager data.");
  const assignments = ((setting?.template_json as Record<string, unknown> | null)?.assignments as Record<string, unknown> | undefined) || {};
  const groups = assignments.managerGroups as Record<string, string> || {};
  const names = assignments.managerNames as Record<string, string> || {};
  return new Map((rows || []).flatMap((row) => {
    const typed = row as Row;
    const id = creatorId(typed);
    const manager = managerKey(typed);
    const group = groups[manager] || (defaultFirstClass(manager) ? "Team Dan / James" : "Unassigned");
    if (!id || !manager) return [];
    const raw = managerRaw(typed);
    return [[id, { manager: managerName(raw, names[manager]), managerKey: manager, group, username: username(typed) }]] as const;
  }));
}

export async function GET() {
  try {
    const [{ data: saved, error }, profiles] = await Promise.all([
      submissionsSupabase.from("poster_templates").select("name,template_json,updated_at").like("name", `${PREFIX}%`).order("name", { ascending: false }),
      currentProfiles(),
    ]);
    if (error) throw Error(error.message);
    const snapshots = (saved || []).flatMap((item) => {
      const value = item.template_json as { date?: unknown; creators?: unknown } | null;
      const creators = Array.isArray(value?.creators)
        ? (value.creators as StarlightCreator[]).map((creator) => ({ ...creator, currentlyAchieved: creator.currentlyAchieved ?? creator.achieved, achieved: number(creator.firstTimePoints) > 0 }))
        : [];
      return creators.length ? [{ date: clean(value?.date) || item.name.slice(PREFIX.length), creators }] : [];
    }).sort((a, b) => b.date.localeCompare(a.date));
    const latest = snapshots[0];
    const managerMap = new Map<string, { manager: string; group: string; creators: Array<StarlightCreator & { username: string }> }>();
    for (const creator of latest?.creators || []) {
      const profile = profiles.get(creator.creatorId);
      if (!profile) continue;
      const group = managerMap.get(profile.managerKey) || { manager: profile.manager, group: profile.group, creators: [] };
      group.creators.push({ ...creator, username: profile.username || creator.username });
      managerMap.set(profile.managerKey, group);
    }
    const managers = [...managerMap.values()].map((entry) => {
      const firstTime = entry.creators.filter((creator) => creator.achieved);
      // Keep the three operational groups mutually exclusive. Someone who
      // qualifies for the first time today belongs in First-time, rather than
      // also appearing in Current; Current is for established Star Creators
      // who can now progress through the 5/10/15/20-day bonuses.
      const current = entry.creators.filter((creator) => creator.currentlyAchieved && !creator.achieved);
      const notCurrent = entry.creators.filter((creator) => !creator.currentlyAchieved);
      const contribution = entry.creators.reduce((total, creator) => total + creator.contribution, 0);
      const bonusPoints = entry.creators.reduce((total, creator) => total + milestoneBonus(creator.starCreatorDays), 0);
      return { manager: entry.manager, group: entry.group, totalCreators: entry.creators.length, achieved: firstTime.length, current: current.length, notCurrent: notCurrent.length, achievementRate: entry.creators.length ? Math.round(firstTime.length / entry.creators.length * 100) : 0, contribution, bonusPoints, campaignPoints: contribution + bonusPoints, starCreatorDays: entry.creators.reduce((total, creator) => total + creator.starCreatorDays, 0), creators: [...entry.creators].sort((a, b) => Number(b.achieved) - Number(a.achieved) || Number(b.currentlyAchieved) - Number(a.currentlyAchieved) || b.contribution - a.contribution || a.username.localeCompare(b.username)) };
    }).sort((a, b) => b.achievementRate - a.achievementRate || b.contribution - a.contribution);
    const history = snapshots.map((snapshot) => {
      const grouped = new Map<string, { manager: string; group: string; population: number }>();
      for (const creator of snapshot.creators) {
        const profile = profiles.get(creator.creatorId);
        if (!profile || !creator.currentlyAchieved) continue;
        const item = grouped.get(profile.managerKey) || { manager: profile.manager, group: profile.group, population: 0 };
        item.population += 1;
        grouped.set(profile.managerKey, item);
      }
      return { date: snapshot.date, managers: [...grouped.values()] };
    }).sort((a, b) => a.date.localeCompare(b.date));
    return NextResponse.json({ latestDate: latest?.date || "", uploads: snapshots.map((snapshot) => ({ date: snapshot.date, creators: snapshot.creators.length })), managers, history }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load Starlight Creators." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const date = clean(form.get("date"));
    const file = form.get("file");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(file instanceof File)) return NextResponse.json({ error: "Choose a date and an Excel file." }, { status: 400 });
    const creators = extract(await file.arrayBuffer());
    if (!creators.length) return NextResponse.json({ error: "No creator rows were found in this Starlight file." }, { status: 400 });
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: `${PREFIX}${date}`, template_json: { date, creators }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) throw Error(error.message);
    return NextResponse.json({ date, creators: creators.length });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not import Starlight data." }, { status: 500 }); }
}
