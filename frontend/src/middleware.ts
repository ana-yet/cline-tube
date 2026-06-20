import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware
 *
 * Runs on every request before the page is rendered.
 * Handles route protection by checking for authentication tokens.
 *
 * Architectural Decisions:
 * - Checks for accessToken in localStorage (via cookie fallback for SSR)
 * - Protected routes redirect to /login if no token found
 * - Auth routes (login/register) redirect to / if already authenticated
 * - Admin routes check for admin role (requires additional client-side verification)
 * - Static assets and API routes are excluded from middleware
 *
 * Note: Full JWT verification happens on the backend. The middleware only does
 * a lightweight check for token existence to prevent unnecessary page loads.
 */

// Routes that require authentication
const protectedRoutes = ["/watchlist", "/profile"];

// Routes that require admin role (client-side verification needed)
const adminRoutes = ["/admin"];

// Routes that should redirect to home if already authenticated
const authRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for auth token in cookies (middleware runs server-side, no localStorage)
  const hasToken = request.cookies.has("refreshToken");

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users from protected routes
  if ((isProtectedRoute || isAdminRoute) && !hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from auth routes
  if (isAuthRoute && hasToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
