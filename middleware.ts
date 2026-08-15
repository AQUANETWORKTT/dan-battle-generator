import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const host = req.headers.get("host")?.split(":")[0].toLowerCase();

  // First Class Owners is deliberately a small, separate experience that is
  // hosted from this codebase. The domain is the boundary: it exposes only
  // the owners landing page and its clean poster generator, never the wider
  // Management site.
  const isOwnersSpace = host === "firstclassowners.space" || host === "www.firstclassowners.space";
  if (isOwnersSpace) {
    if (path === "/") {
      return NextResponse.rewrite(new URL("/owners", req.url));
    }

    if (path === "/owners" || path.startsWith("/api/")) {
      return NextResponse.next();
    }

    if (path === "/generator") {
      if (req.nextUrl.searchParams.get("owner") === "1") return NextResponse.next();
      return NextResponse.redirect(new URL("/generator?owner=1", req.url));
    }

    return NextResponse.redirect(new URL("/", req.url));
  }

  // Sub-Agencies has its own password screen. Do not let First Class's
  // site-wide login middleware send successful agency entries back to /login.
  if (host === "subagencies.space" || host === "www.subagencies.space") {
    return NextResponse.next();
  }

  const isSubspaceBattleEntry = path === "/battle-network" && req.nextUrl.searchParams.get("source") === "subspace-manager" && req.nextUrl.searchParams.get("agency") === "respawn";
  const isSubspaceBattleSession = req.cookies.get("subspace-battle-entry")?.value === "respawn";

  // Subspace managers use the real First Class Battle Network, but cannot
  // navigate into the rest of First Class Space.
  if (isSubspaceBattleEntry) {
    const response = NextResponse.next();
    response.cookies.set("subspace-battle-entry", "respawn", { httpOnly: true, maxAge: 60 * 60 * 12, path: "/", sameSite: "lax" });
    return response;
  }

  if (isSubspaceBattleSession) {
    const isBattleNetwork = path === "/battle-network" || path.startsWith("/api/battle-network");
    const isRestrictedLogin = path === "/login" && req.nextUrl.searchParams.get("from") === "subspace-battle";
    if (!isBattleNetwork && !isRestrictedLogin) return NextResponse.redirect(new URL("/login?from=subspace-battle", req.url));
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
  const publicRoutes = ["/login", "/battle-network", "/api/login", "/api/battle-network", "/api/data-analysis/manager-assignments", "/api/management-onboarding", "/api/management-onboarding-upload", "/api/battle-calendar/reminders"];

  if (path.startsWith("/management") && req.cookies.get("first-class-management-auth")?.value !== "true") {
    return NextResponse.redirect(new URL("/login/management", req.url));
  }

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
