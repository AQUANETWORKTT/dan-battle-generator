import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password !== "Dan44") {
    return NextResponse.json(
      { success: false },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set("dan-space-auth", "true", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}