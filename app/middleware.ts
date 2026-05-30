import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;

  if (url.startsWith("/events/sunset-showdown/admin")) {
    const password = req.cookies.get("admin-auth");

    if (password?.value !== process.env.ADMIN_PASSWORD) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/events/sunset-showdown/admin/:path*"],
};