import { NextResponse } from "next/server";

const TIKLEAP_BASE_URL = "https://www.tikleap.com";
const MAX_PAGES = 12;
const MAX_ROWS = 100;

const COUNTRIES = [
  { code: "gb", label: "UK" },
  { code: "au", label: "Australia" },
  { code: "ae", label: "United Arab Emirates" },
];

type TikleapRow = {
  rank: number;
  username: string;
};

type CountryConfig = (typeof COUNTRIES)[number];

function getTikleapCookie() {
  return process.env.TIKLEAP_COOKIE || process.env.TIKLEAP_SESSION_COOKIE || "";
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function resolveTikleapUrl(url: string) {
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${TIKLEAP_BASE_URL}${url}`;
  return `${TIKLEAP_BASE_URL}/${url}`;
}

function getUsernameFromProfileUrl(url: string) {
  const marker = "/profile/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return "";
  return url.slice(markerIndex + marker.length).split(/[?#]/)[0].trim();
}

async function fetchTikleapHtml(url: string, cookie: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      Cookie: cookie,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    },
  });

  const html = await res.text();
  if (!res.ok) {
    throw new Error(`Tikleap returned ${res.status} while loading ${url}.`);
  }

  return html;
}

function findArchiveUrl(html: string, countryCode: string) {
  const archiveMatch = html.match(new RegExp(`href=["']([^"']*/archive/${countryCode}/[^"']+)["']`, "i"));
  return archiveMatch ? resolveTikleapUrl(decodeHtml(archiveMatch[1])) : "";
}

function findPeriod(html: string) {
  return stripTags(html.match(/Period:\s*([^<]+)/i)?.[1] || "");
}

function findNextUrl(html: string) {
  const nextMatch = html.match(/class=["'][^"']*ranklist-table-more[^"']*["'][^>]*data-url=["']([^"']+)["']/i);
  return nextMatch ? resolveTikleapUrl(decodeHtml(nextMatch[1])) : "";
}

function parseRows(html: string) {
  const rows: TikleapRow[] = [];
  const rowRegex = /<a\b[^>]*class=["'][^"']*ranklist-table-row[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match = rowRegex.exec(html);
  while (match) {
    const profileUrl = resolveTikleapUrl(decodeHtml(match[1]));
    const text = stripTags(match[2]);
    const rank = Number(text.match(/^\d+/)?.[0] || 0);
    const username = getUsernameFromProfileUrl(profileUrl);

    if (rank && username) rows.push({ rank, username });
    match = rowRegex.exec(html);
  }

  return rows;
}

async function pullCountry(config: CountryConfig, cookie: string) {
  const countryHtml = await fetchTikleapHtml(`${TIKLEAP_BASE_URL}/country/${config.code}`, cookie);
  const archiveUrl = findArchiveUrl(countryHtml, config.code);

  if (!archiveUrl) {
    throw new Error(`Could not find the ${config.label} Last Day archive link on Tikleap.`);
  }

  const rowsByUsername = new Map<string, TikleapRow>();
  let pageUrl = archiveUrl;
  let archiveHtml = "";
  let period = "";

  for (let page = 0; page < MAX_PAGES && pageUrl && rowsByUsername.size < MAX_ROWS; page += 1) {
    archiveHtml = await fetchTikleapHtml(pageUrl, cookie);
    if (!period) period = findPeriod(archiveHtml);

    for (const row of parseRows(archiveHtml)) {
      if (!rowsByUsername.has(row.username)) rowsByUsername.set(row.username, row);
    }

    pageUrl = findNextUrl(archiveHtml);
  }

  const rows = Array.from(rowsByUsername.values())
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_ROWS);

  if (rows.length <= 5) {
    throw new Error(
      `Tikleap only returned the preview list for ${config.label}. Check that TIKLEAP_COOKIE belongs to a premium Tikleap session.`
    );
  }

  return {
    code: config.code,
    label: config.label,
    period,
    sourceUrl: archiveUrl,
    count: rows.length,
    usernames: rows.map((row) => row.username),
  };
}

export async function GET() {
  try {
    const cookie = getTikleapCookie();

    if (!cookie) {
      return NextResponse.json(
        {
          error:
            "Tikleap premium access is not configured. Add the premium browser cookie to TIKLEAP_COOKIE on the app server.",
        },
        { status: 500 }
      );
    }

    const countries = await Promise.all(COUNTRIES.map((country) => pullCountry(country, cookie)));

    return NextResponse.json({
      countries,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not pull Tikleap usernames." },
      { status: 500 }
    );
  }
}
