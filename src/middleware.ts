/**
 * @file src/middleware.ts
 *
 * Edge & Server-level Route Guard.
 * Enforces authoritative HMAC-verified session validation before protected pages or mutations are executed.
 * Redirects unauthenticated users to /auth/sign-in with safe redirect return targets.
 * Prevents authenticated users from entering stale sign-in / sign-up loops.
 * Emits strict no-store Cache-Control headers on protected pages to eliminate back-forward cache leakage.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/trips/new",
  "/trips/saved",
  "/trips/completed",
  "/wishlist",
];

const AUTH_PAGES = [
  ROUTES.signIn,
  ROUTES.signUp,
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionToken);
  const isAuthenticated = Boolean(session && session.userId);

  // 1. Auth Pages: Prevent logged-in users from seeing sign-in / sign-up or getting stuck in loops
  const isAuthPage = AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
  if (isAuthPage) {
    const hasExplicitRedirect = request.nextUrl.searchParams.has("redirect");
    if (isAuthenticated && !hasExplicitRedirect) {
      const dashboardUrl = new URL(ROUTES.dashboard, request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  // 2. Protected Routes: Check prefixes and dynamic /trips/:tripId paths
  const isProtectedPrefix = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  // /trips/:tripId (excluding /trips/new, /trips/saved, /trips/completed which are already in PROTECTED_PREFIXES)
  const isTripDetail = pathname.startsWith("/trips/") && !pathname.startsWith("/trips/new");

  const isProtected = isProtectedPrefix || isTripDetail;

  if (isProtected) {
    if (!isAuthenticated) {
      // Unauthenticated: Redirect to sign-in with return target
      const signInUrl = new URL(ROUTES.signIn, request.url);
      signInUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(signInUrl);
      response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
      response.headers.set("Pragma", "no-cache");
      return response;
    }

    // Authenticated: Apply private no-cache headers to protect against browser history data leakage
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/profile",
    "/profile/:path*",
    "/trips/new",
    "/trips/saved",
    "/trips/completed",
    "/trips/:tripId",
    "/trips/:tripId/:path*",
    "/wishlist",
    "/wishlist/:path*",
    "/auth/sign-in",
    "/auth/sign-up",
  ],
};
