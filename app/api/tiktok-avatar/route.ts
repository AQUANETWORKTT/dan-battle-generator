import { NextResponse } from "next/server";
import {scrapeTikTokAvatar} from "@/lib/tiktok-profile-avatar";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").replace("@", "").trim().toLowerCase();

    if (!username) return NextResponse.json({ error: "Username missing" }, { status: 400 });

    const avatar=await scrapeTikTokAvatar(username);
    if(!avatar)return NextResponse.json({error:'Profile picture not found',username},{status:404});

    return NextResponse.json(
      {
        avatar,
      }
    );
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch TikTok profile" }, { status: 500 });
  }
}
