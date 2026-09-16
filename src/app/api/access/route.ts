import { after } from "next/server";
import { type NextRequest, NextResponse } from "next/server";
import { appLink } from "@/lib/site";
import { isValidEmail, isValidPostcode, upsertIdentity } from "@/lib/identity";
import { setSessionCookie } from "@/lib/session";
import {
  TRACKING_COOKIE,
  mergeTracking,
  normalizeTracking,
  parseTrackingCookie,
  trackingFromIdentity,
} from "@/lib/tracking";
import { enqueueWebhook, processDueWebhooks } from "@/lib/webhook";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const first_name = String(body.first_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const postcode = String(body.postcode ?? "").trim();
  const marketing_consent = Boolean(body.marketing_consent);

  if (!first_name) {
    return NextResponse.json({ error: "Enter your first name." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!isValidPostcode(postcode)) {
    return NextResponse.json(
      { error: "Enter a four-digit Australian postcode." },
      { status: 400 }
    );
  }

  const cookieTracking = parseTrackingCookie(
    request.cookies.get(TRACKING_COOKIE)?.value
  );
  const bodyTracking = normalizeTracking(body);
  const tracking = mergeTracking(cookieTracking, bodyTracking);

  let identity;
  try {
    identity = await upsertIdentity({
      first_name,
      email,
      phone: String(body.phone ?? "").trim(),
      postcode,
      marketing_consent,
      tracking,
    });
  } catch (err) {
    console.error("[api/access]", err);
    return NextResponse.json(
      { error: "Could not open the app. Please try again." },
      { status: 500 }
    );
  }

  const link = appLink(identity.reentry_token);
  const response = NextResponse.json({ ok: true, app_link: link });
  setSessionCookie(response, identity.reentry_token);

  after(async () => {
    try {
      const t = mergeTracking(tracking, trackingFromIdentity(identity));
      await enqueueWebhook("app_access", {
        email: identity.email,
        first_name: identity.first_name,
        phone: identity.phone,
        postcode: identity.postcode,
        marketing_consent: identity.marketing_consent,
        app_link: link,
        path: "diy",
        lead_source: "diy-app",
        utm_source: t.utm_source,
        utm_campaign: t.utm_campaign,
        utm_content: t.utm_content,
        fbclid: t.fbclid,
      });
      await processDueWebhooks();
    } catch (err) {
      console.error("[app_access] background failed", err);
    }
  });

  return response;
}
