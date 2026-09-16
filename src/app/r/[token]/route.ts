import { type NextRequest, NextResponse } from "next/server";
import { findIdentityByToken } from "@/lib/identity";
import { setSessionCookie } from "@/lib/session";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const identity = token ? await findIdentityByToken(token) : null;
  const url = request.nextUrl.clone();
  url.search = "";

  if (!identity) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  url.pathname = "/design";
  const response = NextResponse.redirect(url);
  setSessionCookie(response, identity.reentry_token);
  return response;
}
