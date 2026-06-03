import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const { username, forceRefresh } = await req.json();

    const cleanUsername = String(username || "")
      .replace("@", "")
      .trim()
      .toLowerCase();

    if (!cleanUsername) {
      return NextResponse.json(
        { error: "Username missing" },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    const refreshKey = Date.now();

    const response = await fetch(
      `https://www.tiktok.com/@${cleanUsername}?refresh=${refreshKey}`,
      {
        method: "GET",
        cache: "no-store",
        next: { revalidate: 0 },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );

    const html = await response.text();

    const match =
      html.match(/"avatarLarger":"(.*?)"/) ||
      html.match(/"avatarMedium":"(.*?)"/) ||
      html.match(/"avatarThumb":"(.*?)"/);

    if (!match) {
      return NextResponse.json(
        { error: "Profile picture not found" },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    const avatar = match[1]
      .replace(/\\u002F/g, "/")
      .replace(/\\u0026/g, "&");

    return NextResponse.json(
      {
        avatar,
        username: cleanUsername,
        refreshed: Boolean(forceRefresh),
        timestamp: refreshKey,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.log("TikTok avatar error:", err);

    return NextResponse.json(
      { error: "Failed to fetch TikTok profile" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  }
}
