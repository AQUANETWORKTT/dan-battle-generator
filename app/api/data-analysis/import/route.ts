import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type ParsedRow = {
  stat_date: string;
  data_period: string | null;
  creator_id: string | null;
  creator_username: string;
  email: string | null;
  group_name: string | null;
  agency: string;
  team: string;
  manager_email: string | null;
  join_time: string | null;
  diamonds: number;
  live_duration: string | null;
  live_hours: number;
  valid_live_days: number;
  new_followers: number;
  matches: number;
  live_streams: number;
  followers: number;
  days_since_joining: number;
  diamonds_last_month: number;
  live_hours_last_month: number;
  valid_days_last_month: number;
  followers_last_month: number;
  live_streams_last_month: number;
  diamonds_percentage_achieved: number;
  live_hours_percentage_achieved: number;
  valid_days_percentage_achieved: number;
  followers_percentage_achieved: number;
  live_streams_percentage_achieved: number;
  diamonds_vs_last_month: number;
  live_hours_vs_last_month: number;
  valid_days_vs_last_month: number;
  followers_vs_last_month: number;
  live_streams_vs_last_month: number;
  diamonds_from_matches: number;
  new_live_creators: string | null;
  diamonds_from_multiguest: number;
  diamonds_from_multiguest_host: number;
  diamonds_from_multiguest_guest: number;
  graduation_status: string | null;
  tier_status: string | null;
  new_fans: number;
  fan_club_diamonds: number;
  fan_contribution_percentage: number;
  total_fans: number;
  active_fans: number;
  status: string | null;
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown) {
  const cleaned = String(value || "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function durationToHours(value: unknown) {
  const text = cleanText(value).toLowerCase();
  if (!text) return 0;

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*m/);
  const secMatch = text.match(/(\d+(?:\.\d+)?)\s*s/);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minMatch ? Number(minMatch[1]) : 0;
  const seconds = secMatch ? Number(secMatch[1]) : 0;

  if (hours || minutes || seconds) {
    return Number((hours + minutes / 60 + seconds / 3600).toFixed(2));
  }

  const colonParts = text.split(":").map(Number);

  if (colonParts.length === 3 && colonParts.every(Number.isFinite)) {
    return Number(
      (colonParts[0] + colonParts[1] / 60 + colonParts[2] / 3600).toFixed(2)
    );
  }

  if (colonParts.length === 2 && colonParts.every(Number.isFinite)) {
    return Number((colonParts[0] + colonParts[1] / 60).toFixed(2));
  }

  return toNumber(text);
}

function getAgency(group: string) {
  const clean = group.trim().toLowerCase();

  if (clean.includes("aqua sub agency")) return "Aqua";
  if (clean.includes("respawn sub agency")) return "Respawn";
  if (clean.includes("paradise sub agency")) return "Paradise";
  if (clean.includes("strive sub agency")) return "Strive";

  return "First Class";
}

function getTeam(group: string) {
  const clean = group.trim().toLowerCase();

  if (clean.includes("dan first class")) return "Team Dan";
  if (clean.includes("rach first class")) return "Team Rach";
  if (clean.includes("indi first class")) return "Team Indi";
  if (clean.includes("first class liam")) return "Team Liam";
  if (clean.includes("first class dave")) return "Team Dave";
  if (clean.includes("first class lauren")) return "Team Lauren";
  if (clean.includes("abbi first class")) return "Team Abbi";
  if (clean.includes("zail first class")) return "Team Zail";
  if (clean.includes("first class ire")) return "Team IRE";

  if (clean.includes("df - team ash")) return "Team Ash";
  if (clean.includes("df - team cameron")) return "Team Cameron";
  if (clean.includes("df - team connor")) return "Team Connor";
  if (clean.includes("df - team kyran")) return "Team Kyran";

  if (clean.includes("kayden unknown")) return "Team Kayden";
  if (clean.includes("kash rapper")) return "Team Kash";
  if (clean.includes("kyle tpa")) return "Team Kyle";

  if (clean.includes("not in a group")) return "Unassigned First Class";

  const agency = getAgency(group);
  return agency === "First Class" ? "Unassigned First Class" : agency;
}

function getColumnByHeader(
  row: unknown[],
  headerMap: Map<string, number>,
  possibleHeaders: string[],
  fallbackIndex: number
) {
  for (const header of possibleHeaders) {
    const index = headerMap.get(header.toLowerCase());
    if (typeof index === "number") return row[index];
  }

  if (headerMap.size > 0) return "";

  return row[fallbackIndex];
}

function getTextColumn(
  row: unknown[],
  headerMap: Map<string, number>,
  possibleHeaders: string[],
  fallbackIndex: number
) {
  const value = cleanText(
    getColumnByHeader(row, headerMap, possibleHeaders, fallbackIndex)
  );

  return value || null;
}

function getNumberColumn(
  row: unknown[],
  headerMap: Map<string, number>,
  possibleHeaders: string[],
  fallbackIndex: number
) {
  return toNumber(getColumnByHeader(row, headerMap, possibleHeaders, fallbackIndex));
}

function getDurationHoursColumn(
  row: unknown[],
  headerMap: Map<string, number>,
  possibleHeaders: string[],
  fallbackIndex: number
) {
  return durationToHours(
    getColumnByHeader(row, headerMap, possibleHeaders, fallbackIndex)
  );
}

function parseWorkbook(
  buffer: ArrayBuffer,
  statDate: string,
  dataPeriodOverride?: string
): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    blankrows: false,
    defval: "",
  });

  const headerRow = rows.find((row) =>
    Array.isArray(row) &&
    row.some(
      (cell) => cleanText(cell).toLowerCase() === "creator's username"
    )
  );

  const headerMap = new Map<string, number>();

  if (headerRow) {
    headerRow.forEach((cell, index) => {
      const cleanHeader = cleanText(cell).toLowerCase();
      if (cleanHeader) headerMap.set(cleanHeader, index);
    });
  }

  const dataRows = rows.filter(
    (row) =>
      Array.isArray(row) &&
      row.length > 2 &&
      cleanText(row[2]) !== "" &&
      cleanText(row[2]).toLowerCase() !== "creator's username"
  );

  console.log("TOTAL EXCEL ROWS:", rows.length);
  console.log("TOTAL DATA ROWS:", dataRows.length);

  return dataRows
    .map((row) => {
      const dataPeriod = getTextColumn(row, headerMap, ["data period"], 0);
      const creatorId = getTextColumn(row, headerMap, ["creator id", "creator_id"], 1);
      const username = cleanText(
        getColumnByHeader(
          row,
          headerMap,
          ["creator's username", "creator_username", "creator username"],
          2
        )
      ).replace("@", "");
      const groupName = cleanText(
        getColumnByHeader(row, headerMap, ["group", "group_name"], 3)
      );
      const managerEmail = getTextColumn(
        row,
        headerMap,
        ["creator network manager", "manager_email", "manager email"],
        4
      );
      const joinTime = getTextColumn(row, headerMap, ["join time", "join_time"], 5);
      const daysSinceJoining = getNumberColumn(
        row,
        headerMap,
        ["days since joining", "days_since_joining"],
        6
      );
      const diamonds = getNumberColumn(row, headerMap, ["diamonds"], 7);
      const liveDuration = cleanText(
        getColumnByHeader(row, headerMap, ["live duration", "live_duration"], 8)
      );
      const validLiveDays = getNumberColumn(
        row,
        headerMap,
        ["valid go live days", "valid_live_days", "valid days"],
        9
      );
      const newFollowers = getNumberColumn(
        row,
        headerMap,
        ["new followers", "new_followers"],
        10
      );
      const liveStreams = getNumberColumn(
        row,
        headerMap,
        ["live streams", "live_streams"],
        11
      );
      const matches = getNumberColumn(row, headerMap, ["matches"], 27);
      const followers = newFollowers;
      const graduationStatus = getTextColumn(
        row,
        headerMap,
        ["graduation status", "graduation_status", "graduation", "graduation eligibility"],
        33
      );

      return {
        stat_date: statDate,
        data_period: dataPeriodOverride || dataPeriod,
        creator_id: creatorId,
        creator_username: username.toLowerCase(),
        email: managerEmail,
        group_name: groupName || null,
        agency: getAgency(groupName),
        team: getTeam(groupName),
        manager_email: managerEmail,
        join_time: joinTime,
        diamonds,
        live_duration: liveDuration || null,
        live_hours: durationToHours(liveDuration),
        valid_live_days: validLiveDays,
        new_followers: newFollowers,
        matches,
        live_streams: liveStreams,
        followers,
        days_since_joining: daysSinceJoining,
        diamonds_last_month: getNumberColumn(row, headerMap, ["diamonds last month", "diamonds_last_month"], 12),
        live_hours_last_month: getDurationHoursColumn(
          row,
          headerMap,
          [
            "live duration (hours) last month",
            "live duration last month",
            "live_hours_last_month",
          ],
          13
        ),
        valid_days_last_month: getNumberColumn(
          row,
          headerMap,
          ["valid go live days last month", "valid_days_last_month"],
          14
        ),
        followers_last_month: getNumberColumn(
          row,
          headerMap,
          ["new followers last month", "followers_last_month"],
          15
        ),
        live_streams_last_month: getNumberColumn(
          row,
          headerMap,
          ["live streams last month", "live_streams_last_month"],
          16
        ),
        diamonds_percentage_achieved: getNumberColumn(
          row,
          headerMap,
          ["diamonds - percentage achieved", "diamonds percentage achieved"],
          17
        ),
        live_hours_percentage_achieved: getNumberColumn(
          row,
          headerMap,
          ["live duration - percentage achieved", "live duration percentage achieved"],
          18
        ),
        valid_days_percentage_achieved: getNumberColumn(
          row,
          headerMap,
          ["valid go live days - percentage achieved", "valid days percentage achieved"],
          19
        ),
        followers_percentage_achieved: getNumberColumn(
          row,
          headerMap,
          ["new followers - percentage achieved", "new followers percentage achieved"],
          20
        ),
        live_streams_percentage_achieved: getNumberColumn(
          row,
          headerMap,
          ["live streams - percentage achieved", "live streams percentage achieved"],
          21
        ),
        diamonds_vs_last_month: getNumberColumn(
          row,
          headerMap,
          ["diamonds - vs. last month", "diamonds vs last month"],
          22
        ),
        live_hours_vs_last_month: getNumberColumn(
          row,
          headerMap,
          ["live duration - vs. last month", "live duration vs last month"],
          23
        ),
        valid_days_vs_last_month: getNumberColumn(
          row,
          headerMap,
          ["valid go live days - vs. last month", "valid days vs last month"],
          24
        ),
        followers_vs_last_month: getNumberColumn(
          row,
          headerMap,
          ["new followers - vs. last month", "new followers vs last month"],
          25
        ),
        live_streams_vs_last_month: getNumberColumn(
          row,
          headerMap,
          ["live streams - vs. last month", "live streams vs last month"],
          26
        ),
        diamonds_from_matches: getNumberColumn(
          row,
          headerMap,
          ["diamonds from matches", "diamonds_from_matches"],
          28
        ),
        new_live_creators: getTextColumn(
          row,
          headerMap,
          ["new live creators", "new_live_creators"],
          29
        ),
        diamonds_from_multiguest: getNumberColumn(
          row,
          headerMap,
          ["diamonds from multi-guest", "diamonds_from_multiguest"],
          30
        ),
        diamonds_from_multiguest_host: getNumberColumn(
          row,
          headerMap,
          ["diamonds from multi-guest (as host)", "diamonds_from_multiguest_host"],
          31
        ),
        diamonds_from_multiguest_guest: getNumberColumn(
          row,
          headerMap,
          ["diamonds from multi-guest (as guest)", "diamonds_from_multiguest_guest"],
          32
        ),
        graduation_status: graduationStatus,
        tier_status: getTextColumn(row, headerMap, ["tier status", "tier_status"], 34),
        new_fans: getNumberColumn(row, headerMap, ["new fans", "new_fans"], 35),
        fan_club_diamonds: getNumberColumn(
          row,
          headerMap,
          ["fan club total diamonds", "fan_club_diamonds"],
          36
        ),
        fan_contribution_percentage: getNumberColumn(
          row,
          headerMap,
          ["fan contribution %", "fan_contribution_percentage"],
          37
        ),
        total_fans: getNumberColumn(row, headerMap, ["total fans", "total_fans"], 38),
        active_fans: getNumberColumn(
          row,
          headerMap,
          ["active fans from fan club", "active_fans"],
          39
        ),
        status: getTextColumn(row, headerMap, ["status"], 40),
      };
    })
    .filter((row) => row.creator_username);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const month = String(formData.get("month") || "2026-05");
    const importMode = String(formData.get("mode") || "");

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month. Please select a month in YYYY-MM format." },
        { status: 400 }
      );
    }

    const monthNumber = Number(month.split("-")[1]);

    if (monthNumber < 1 || monthNumber > 12) {
      return NextResponse.json(
        { error: "Invalid month number. Please reselect the upload month." },
        { status: 400 }
      );
    }

    const allRows: ParsedRow[] = [];
    const fileSummaries: { day: number; statDate: string; rows: number; filename: string }[] = [];

    const lastDay = new Date(Number(month.split("-")[0]), monthNumber, 0).getDate();

    if (importMode === "mature_month_total") {
      const file = formData.get("mature_month_file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Please upload the full previous month Excel file." },
          { status: 400 }
        );
      }

      const statDate = `${month}-${String(lastDay).padStart(2, "0")}`;
      const buffer = await file.arrayBuffer();
      const rows = parseWorkbook(buffer, statDate, "mature_month_total");

      if (!rows.length) {
        return NextResponse.json(
          { error: "No valid creator rows found in uploaded file." },
          { status: 400 }
        );
      }

      const { error: deleteError } = await submissionsSupabase
        .from("creator_daily_stats")
        .delete()
        .eq("stat_date", statDate)
        .eq("data_period", "mature_month_total");

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }

      const chunkSize = 250;

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        const { error } = await submissionsSupabase
          .from("creator_daily_stats")
          .insert(chunk);

        if (error) {
          return NextResponse.json(
            {
              error: `Insert failed on rows ${i + 1}-${i + chunk.length}: ${
                error.message
              }`,
            },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        mode: importMode,
        filesImported: 1,
        totalRows: rows.length,
        parsedRows: rows.length,
        month,
        files: [
          {
            day: lastDay,
            statDate,
            rows: rows.length,
            filename: file.name,
          },
        ],
      });
    }

    for (let day = 1; day <= lastDay; day++) {
      const file = formData.get(`day_${day}`);

      if (!(file instanceof File)) continue;

      const buffer = await file.arrayBuffer();
      const statDate = `${month}-${String(day).padStart(2, "0")}`;

      const rows = parseWorkbook(buffer, statDate);

      allRows.push(...rows);

      fileSummaries.push({
        day,
        statDate,
        rows: rows.length,
        filename: file.name,
      });
    }

    if (!allRows.length) {
      return NextResponse.json(
        { error: "No valid creator rows found in uploaded files." },
        { status: 400 }
      );
    }

    for (const summary of fileSummaries) {
      const statDate = `${month}-${String(summary.day).padStart(2, "0")}`;

      const { error: deleteError } = await submissionsSupabase
        .from("creator_daily_stats")
        .delete()
        .eq("stat_date", statDate);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }
    }

    const chunkSize = 250;

    for (let i = 0; i < allRows.length; i += chunkSize) {
      const chunk = allRows.slice(i, i + chunkSize);

      const { error } = await submissionsSupabase
        .from("creator_daily_stats")
        .insert(chunk);

      if (error) {
        return NextResponse.json(
          {
            error: `Insert failed on rows ${i + 1}-${i + chunk.length}: ${
              error.message
            }`,
          },
          { status: 500 }
        );
      }
    }

    const graduationStatusCount = allRows.filter(
      (row) => row.graduation_status
    ).length;

    return NextResponse.json({
      success: true,
      filesImported: fileSummaries.length,
      totalRows: allRows.length,
      parsedRows: allRows.length,
      graduationStatusRows: graduationStatusCount,
      month,
      files: fileSummaries,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
