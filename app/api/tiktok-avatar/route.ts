import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = body.username;

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
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    const refreshKey = Date.now();
    const randomKey = Math.random();

    const response = await fetch(
      `https://www.tiktok.com/@${cleanUsername}?_t=${refreshKey}&_r=${randomKey}`,
      {
        method: "GET",
        cache: "no-store",
        next: { revalidate: 0 },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
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
        {
          error: "Profile picture not found",
          username: cleanUsername,
          sourceStatus: response.status,
          sourceUrl: response.url,
          htmlLength: html.length,
        },
        {
          status: 404,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
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
        refreshed: true,
        timestamp: refreshKey,
        randomKey,
        sourceStatus: response.status,
        sourceUrl: response.url,
        htmlLength: html.length,
        avatarId: avatar.split("/").pop()?.split("?")[0],
        scrapeMode: "mobile-iphone",
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
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}