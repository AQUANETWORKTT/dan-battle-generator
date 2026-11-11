import { NextResponse } from "next/server";
import { SEARCH_COOKIE, searchSessionToken } from "@/lib/creator-api-search/auth";
import {STAR_COOKIE,starSessionToken} from '@/lib/star-tracker-auth';

export async function POST(req: Request) {
  const { password, area } = await req.json();

  if(area==='streamer'){
    if(password!=='STREAMER2')return NextResponse.json({success:false},{status:401});
    const token=starSessionToken();if(!token)return NextResponse.json({error:'Login is not configured.'},{status:503});
    const response=NextResponse.json({success:true});response.cookies.set(STAR_COOKIE,token,{path:'/',maxAge:30*86400,httpOnly:true,sameSite:'lax',secure:new URL(req.url).protocol==='https:'});return response;
  }
  if (area === "onboarding") {
    if (String(password || "").trim().toLowerCase() !== "ash1") return NextResponse.json({ success: false }, { status: 401 });

    const response = NextResponse.json({ success: true });
    response.cookies.set("first-class-onboarding-auth", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
    });
    return response;
  }

  if (area === "management") {
    if (password !== "CM123") return NextResponse.json({ success: false }, { status: 401 });

    const response = NextResponse.json({ success: true });
    response.cookies.set("first-class-management-auth", "true", {
      path: "/management",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
    });
    return response;
  }

  if (area === "recruitment-leaderboard") {
    const recruitmentPassword = String(password || "").trim().toLowerCase().replace(/\s+/g, "");
    if (recruitmentPassword !== "fc26!") return NextResponse.json({ success: false }, { status: 401 });

    const response = NextResponse.json({ success: true });
    response.cookies.set("first-class-recruitment-leaderboard-auth", "true", {
      // The leaderboard fetches its own protected data from /api, so this
      // cookie must reach that route too. It is only accepted by the
      // recruitment leaderboard proxy checks, not the wider management site.
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    return response;
  }

  if (password !== "Dan44") {
    return NextResponse.json(
      { success: false },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set("first-class-space-auth", "true", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const searchSession = searchSessionToken();
  if (searchSession) response.cookies.set(SEARCH_COOKIE, searchSession, {
    path: "/", maxAge: 60 * 60 * 24 * 30, httpOnly: true,
    secure: new URL(req.url).protocol === "https:", sameSite: "lax",
  });

  return response;
}
