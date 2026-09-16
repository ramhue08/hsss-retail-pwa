import { type NextRequest, NextResponse } from "next/server";
import { findSentDesign, getOrCreateDesignPdf } from "@/lib/designs";
import { createServiceClient } from "@/lib/supabase/admin";
import type { RetailIdentity } from "@/types/database";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ ref: string }> }
) {
  const { ref } = await context.params;
  const designRef = decodeURIComponent(ref).replace(/\.pdf$/i, "");
  const design = await findSentDesign(designRef);
  if (!design) {
    return new NextResponse("Design not found", { status: 404 });
  }

  const admin = createServiceClient();
  const { data: identity } = await admin
    .from("retail_identities")
    .select("*")
    .eq("id", design.identity_id)
    .maybeSingle();
  if (!identity) {
    return new NextResponse("Design not found", { status: 404 });
  }

  try {
    const pdf = await getOrCreateDesignPdf(identity as RetailIdentity, design);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${designRef}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[pdf] render failed", err);
    return new NextResponse("Could not build PDF", { status: 500 });
  }
}
