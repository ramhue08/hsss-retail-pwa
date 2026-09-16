import { after } from "next/server";
import { type NextRequest, NextResponse } from "next/server";
import { isValidEmail, isValidPhone, isValidPostcode, upsertIdentity } from "@/lib/identity";
import { setSessionCookie } from "@/lib/session";
import {
  getOrCreateDesignPdf,
  insertSentDesign,
  nextDesignRef,
  saveDraft,
} from "@/lib/designs";
import { screenDraftToPayload, type ScreenDraft } from "@/lib/orders";
import { RETAIL_SERVICE_TYPE, snapshotFromScreen } from "@/lib/retail";
import { designPdfUrl } from "@/lib/site";
import {
  TRACKING_COOKIE,
  mergeTracking,
  normalizeTracking,
  parseTrackingCookie,
} from "@/lib/tracking";
import { emailDesignPdf } from "@/lib/email/send-design";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const draft = body.draft as ScreenDraft | undefined;
  const first_name = String(body.first_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const postcode = String(body.postcode ?? "").trim();
  const marketing_consent = Boolean(body.marketing_consent);

  if (!draft || typeof draft !== "object") {
    return NextResponse.json({ error: "Missing design." }, { status: 400 });
  }
  if (!first_name) {
    return NextResponse.json({ error: "Enter your first name." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json(
      { error: "Enter a valid Australian phone number." },
      { status: 400 }
    );
  }
  if (!isValidPostcode(postcode)) {
    return NextResponse.json(
      { error: "Enter a four-digit Australian postcode." },
      { status: 400 }
    );
  }

  const result = screenDraftToPayload(draft, RETAIL_SERVICE_TYPE);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const cookieTracking = parseTrackingCookie(
    request.cookies.get(TRACKING_COOKIE)?.value
  );
  const tracking = mergeTracking(cookieTracking, normalizeTracking(body));

  let identity;
  try {
    identity = await upsertIdentity({
      first_name,
      email,
      phone,
      postcode,
      marketing_consent,
      tracking,
    });
  } catch (err) {
    console.error("[design_sent] identity", err);
    return NextResponse.json(
      { error: "Could not send the design. Please try again." },
      { status: 500 }
    );
  }

  await saveDraft(identity.id, draft);

  const snapshot = snapshotFromScreen(draft, result);
  const designRef = await nextDesignRef();
  const design = await insertSentDesign({
    identityId: identity.id,
    designRef,
    draft,
    preview: result,
    summary: snapshot.summary,
    system: snapshot.system,
    finish: snapshot.finish,
    measurements: snapshot.measurements,
    supplyPrice: snapshot.supply_price_ex_freight,
  });

  const response = NextResponse.json({
    ok: true,
    design_ref: designRef,
    design_pdf_url: designPdfUrl(designRef),
  });
  setSessionCookie(response, identity.reentry_token);

  after(async () => {
    try {
      const pdf = await getOrCreateDesignPdf(identity, design);
      await emailDesignPdf({
        identity,
        designRef,
        pdf,
        buildSummary: snapshot.summary,
        system: snapshot.system,
        finish: snapshot.finish,
        measurements: snapshot.measurements,
        supplyPrice: snapshot.supply_price_ex_freight,
      });
    } catch (err) {
      console.error("[design_sent] email failed", err);
    }
  });

  return response;
}
