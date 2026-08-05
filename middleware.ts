import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const host = req.headers.get("host")?.split(":")[0].toLowerCase();

  // Sub-Agencies has its own password screen. Do not let First Class's
  // site-wide login middleware send successful agency entries back to /login.
  if (host === "subagencies.space" || host === "www.subagencies.space") {
    return NextResponse.next();
  }

  const isEventsSpace = process.env.SITE_MODE === "events";

  if (isEventsSpace) {
    const isCreatorRoute =
      path === "/" ||
      path.startsWith("/events") ||
      path.startsWith("/live/") ||
      path.startsWith("/api/events/") ||
      path.startsWith("/api/race-to-the-top") ||
      path.startsWith("/api/tiktok-avatar");

    if (!isCreatorRoute) {
      return NextResponse.redirect(new URL("/events", req.url));
    }

    return NextResponse.next();
  }

  // The reminder route is still protected by CRON_SECRET inside the route
  // handler, but must be reachable by the external scheduler without a web
  // login cookie.
  const publicRoutes = ["/login", "/management", "/api/login", "/api/data-analysis/manager-assignments", "/api/management-onboarding", "/api/management-onboarding-upload", "/api/battle-calendar/reminders"];

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
