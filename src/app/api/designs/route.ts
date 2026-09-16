import { type NextRequest, NextResponse } from "next/server";
import { findIdentityByToken } from "@/lib/identity";
import { sessionTokenFromRequest } from "@/lib/session";
import { draftFromPayload, getDraftDesign, saveDraft } from "@/lib/designs";
import type { ScreenDraft } from "@/lib/orders";

async function optionalIdentity(request: NextRequest) {
  const token = sessionTokenFromRequest(request);
  if (!token) return null;
  return findIdentityByToken(token);
}

export async function GET(request: NextRequest) {
  const identity = await optionalIdentity(request);
  if (!identity) {
    return NextResponse.json({ draft: null });
  }
  const design = await getDraftDesign(identity.id);
  return NextResponse.json({
    draft: draftFromPayload(design?.payload),
  });
}

export async function PUT(request: NextRequest) {
  const identity = await optionalIdentity(request);
  if (!identity) {
    return NextResponse.json({ ok: true });
  }
  const body = (await request.json().catch(() => ({}))) as { draft?: ScreenDraft };
  if (!body.draft || typeof body.draft !== "object") {
    return NextResponse.json({ error: "Missing design." }, { status: 400 });
  }
  await saveDraft(identity.id, body.draft);
  return NextResponse.json({ ok: true });
}
