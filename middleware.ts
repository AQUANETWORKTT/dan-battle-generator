import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isEventsSpace = process.env.SITE_MODE === "events";

  if (isEventsSpace) {
    const isCreatorRoute =
      path === "/" ||
      path.startsWith("/events") ||
      path.startsWith("/live/") ||
      path.startsWith("/api/events/") ||
      path.startsWith("/api/tiktok-avatar");

    if (!isCreatorRoute) {
      return NextResponse.redirect(new URL("/events", req.url));
    }

    return NextResponse.next();
  }

  const publicRoutes = ["/login", "/api/login"];

  const isPublic = publicRoutes.some((route) => path.startsWith(route));

  if (isPublic) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get("first-class-space-auth")?.value;

  if (authCookie !== "true") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|otf)$).*)",
  ],
};
