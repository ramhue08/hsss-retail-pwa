import { type NextRequest, NextResponse } from "next/server";
import {
  COOKIE_MAX_AGE,
  TRACKING_COOKIE,
  mergeTracking,
  parseTrackingCookie,
  trackingFromSearchParams,
} from "@/lib/tracking";

function trackingCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

function applyTracking(request: NextRequest, response: NextResponse) {
  const incoming = trackingFromSearchParams(request.nextUrl.searchParams);
  const existing = parseTrackingCookie(
    request.cookies.get(TRACKING_COOKIE)?.value
  );
  const merged = mergeTracking(existing, incoming);
  const hasIncoming = Boolean(
    incoming.utm_source ||
      incoming.utm_campaign ||
      incoming.utm_content ||
      incoming.fbclid
  );
  if (hasIncoming || !request.cookies.get(TRACKING_COOKIE)) {
    response.cookies.set(
      TRACKING_COOKIE,
      JSON.stringify(merged),
      trackingCookieOptions()
    );
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/design";
    return applyTracking(request, NextResponse.redirect(url));
  }

  return applyTracking(request, NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|sw\\.js|icon-.*|manifest.json|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
