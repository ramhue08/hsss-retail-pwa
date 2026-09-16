import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_MAX_AGE, SESSION_COOKIE } from "@/lib/tracking";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, cookieOptions());
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export function sessionTokenFromRequest(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE)?.value ?? "";
}

export async function sessionTokenFromCookies() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? "";
}

export function makeReentryToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
