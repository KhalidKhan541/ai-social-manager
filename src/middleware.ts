import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/pricing",
  "/features",
  "/about",
  "/terms",
  "/privacy",
];

const API_AUTH_PREFIX = "/api/auth";
const API_PUBLIC_ROUTES = [
  "/api/auth/register",
  "/api/billing/webhook",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API auth routes (next-auth)
  if (pathname.startsWith(API_AUTH_PREFIX)) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (API_PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  // Allow public pages
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Protect API routes — require authentication
  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Add user info to headers for downstream API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", token.id as string);
    requestHeaders.set("x-user-role", token.role as string);
    requestHeaders.set("x-user-email", (token.email as string) ?? "");

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Protect app pages — redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Add user info to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", token.id as string);
  requestHeaders.set("x-user-role", token.role as string);
  requestHeaders.set("x-user-email", (token.email as string) ?? "");

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
