import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    const cleanUsername = String(username || "")
      .replace("@", "")
      .trim()
      .toLowerCase();

    if (!cleanUsername) {
      return NextResponse.json(
        { error: "Username missing" },
        { status: 400 }
      );
    }

    const response = await fetch(`https://www.tiktok.com/@${cleanUsername}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      cache: "no-store",
    });

    const html = await response.text();

    const match =
      html.match(/"avatarLarger":"(.*?)"/) ||
      html.match(/"avatarMedium":"(.*?)"/) ||
      html.match(/"avatarThumb":"(.*?)"/);

    if (!match) {
      console.log("Profile picture not found:", cleanUsername);

      return NextResponse.json(
        { error: "Profile picture not found" },
        { status: 404 }
      );
    }

    const avatar = match[1]
      .replace(/\\u002F/g, "/")
      .replace(/\\u0026/g, "&");

    console.log("Profile picture found:", cleanUsername, avatar);

    return NextResponse.json({ avatar });
  } catch (err) {
    console.log("TikTok avatar error:", err);

    return NextResponse.json(
      { error: "Failed to fetch TikTok profile" },
      { status: 500 }
    );
  }
}