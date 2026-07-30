import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").replace("@", "").trim().toLowerCase();

    if (!username) return NextResponse.json({ error: "Username missing" }, { status: 400 });

    const response = await fetch(
      `https://www.tiktok.com/@${username}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        },
        cache: "no-store",
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
          username,
        },
        { status: 404 }
      );
    }

    const avatar = match[1]
      .replace(/\\u002F/g, "/")
      .replace(/\\u0026/g, "&");

    return NextResponse.json(
      {
        avatar,
      }
    );
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch TikTok profile" }, { status: 500 });
  }
}
