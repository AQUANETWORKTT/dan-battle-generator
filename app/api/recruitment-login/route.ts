import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();
  const normalizedPassword = String(password || "").trim().toLowerCase().replace(/\s+/g, "");

  if (normalizedPassword !== "fc26!") {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("first-class-recruitment-leaderboard-auth", "true", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}
