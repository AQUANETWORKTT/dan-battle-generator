import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password, area } = await req.json();

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

  return response;
}
