import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const publicRoutes = ["/login", "/live/8f3k2j9m-sunset"];

  const isPublic = publicRoutes.some((route) => path.startsWith(route));

  if (isPublic) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get("dan-space-auth")?.value;

  if (authCookie !== "true") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/generator/:path*", "/events/:path*"],
};