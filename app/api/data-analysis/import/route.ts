import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type ParsedRow = {
  stat_date: string;
  creator_username: string;
  email: string | null;
  group_name: string | null;
  agency: string;
  team: string;
  diamonds: number;
  live_duration: string | null;
  live_hours: number;
  matches: number;
  live_streams: number;
  followers: number;
  days_since_joining: number;
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

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findColumn(headers: string[], names: string[]) {
  const cleanNames = names.map(normalise);
  const cleanHeaders = headers.map(normalise);

  const exactIndex = cleanHeaders.findIndex((header) =>
    cleanNames.includes(header)
  );

  if (exactIndex !== -1) return exactIndex;

  return cleanHeaders.findIndex((header) =>
    cleanNames.some((name) => header.includes(name))
  );
}

function getValue(
  row: Record<string, unknown>,
  headers: string[],
  names: string[]
) {
  const index = findColumn(headers, names);
  if (index === -1) return "";
  return row[headers[index]];
}

function parseWorkbook(buffer: ArrayBuffer, statDate: string): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (!rows.length) return [];

  const headers = Object.keys(rows[0] || {});

  return rows
    .map((row) => {
      const username = cleanText(
        getValue(row, headers, [
          "creators username",
          "creator username",
          "username",
        ])
      ).replace("@", "");

      const email = cleanText(
        getValue(row, headers, [
          "creator network manager",
          "manager email",
          "email",
          "manager",
        ])
      );

      const groupName = cleanText(
        getValue(row, headers, ["group", "agency", "sub agency"])
      );

      const liveDuration = cleanText(
        getValue(row, headers, [
          "live duration",
          "duration",
          "live time",
          "hours",
        ])
      );

      return {
        stat_date: statDate,
        creator_username: username.toLowerCase(),
        email: email || null,
        group_name: groupName || null,
        agency: getAgency(groupName),
        team: getTeam(groupName),
        diamonds: toNumber(getValue(row, headers, ["diamonds", "diamond"])),
        live_duration: liveDuration || null,
        live_hours: durationToHours(liveDuration),
        matches: toNumber(getValue(row, headers, ["matches", "match"])),
        live_streams: toNumber(
          getValue(row, headers, ["live streams", "live stream", "streams"])
        ),
        followers: toNumber(
          getValue(row, headers, ["new followers", "followers", "follower"])
        ),
        days_since_joining: toNumber(
          getValue(row, headers, [
            "days since joining",
            "days joined",
            "joining",
          ])
        ),
      };
    })
    .filter((row) => row.creator_username);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const month = String(formData.get("month") || "2026-05");

    const allRows: ParsedRow[] = [];
    const fileSummaries: { day: number; rows: number; filename: string }[] = [];

    for (let day = 1; day <= 31; day++) {
      const file = formData.get(`day_${day}`);

      if (!(file instanceof File)) continue;

      const buffer = await file.arrayBuffer();
      const statDate = `${month}-${String(day).padStart(2, "0")}`;

      const rows = parseWorkbook(buffer, statDate);

      allRows.push(...rows);

      fileSummaries.push({
        day,
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

    const { error } = await submissionsSupabase
      .from("creator_daily_stats")
      .insert(allRows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      filesImported: fileSummaries.length,
      totalRows: allRows.length,
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
