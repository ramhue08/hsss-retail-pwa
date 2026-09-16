import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import type { ScreenDraft } from "@/lib/orders";
import type { RetailDesign, RetailIdentity } from "@/types/database";
import { emptyScreenDraft } from "@/lib/orders";
import { buildDesignPdf } from "@/lib/pdf/design-pdf";
import type { OrderScreenPayload } from "@/lib/orders";

const PDF_BUCKET = "retail-designs";

export async function getDraftDesign(identityId: string) {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("retail_designs")
    .select("*")
    .eq("identity_id", identityId)
    .eq("status", "draft")
    .maybeSingle();
  if (error) throw error;
  return (data as RetailDesign | null) ?? null;
}

export function draftFromPayload(payload: Record<string, unknown> | null | undefined): ScreenDraft {
  const draft = payload?.draft;
  if (draft && typeof draft === "object") {
    return { ...emptyScreenDraft(), ...(draft as ScreenDraft) };
  }
  return emptyScreenDraft();
}

export async function saveDraft(identityId: string, draft: ScreenDraft) {
  const admin = createServiceClient();
  const existing = await getDraftDesign(identityId);
  const payload = { draft };
  const now = new Date().toISOString();
  if (existing) {
    const { error } = await admin
      .from("retail_designs")
      .update({ payload, updated_at: now })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await admin.from("retail_designs").insert({
    identity_id: identityId,
    status: "draft",
    payload,
  });
  if (error) throw error;
}

export async function nextDesignRef() {
  const admin = createServiceClient();
  const { data, error } = await admin.rpc("next_retail_design_ref");
  if (error) throw error;
  return String(data);
}

export async function insertSentDesign(input: {
  identityId: string;
  designRef: string;
  draft: ScreenDraft;
  preview: OrderScreenPayload;
  summary: string;
  system: string;
  finish: string;
  measurements: string;
  supplyPrice: number;
}) {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("retail_designs")
    .insert({
      identity_id: input.identityId,
      design_ref: input.designRef,
      status: "sent",
      payload: { draft: input.draft, preview: input.preview },
      summary: input.summary,
      system: input.system,
      finish: input.finish,
      measurements: input.measurements,
      supply_price_ex_freight: input.supplyPrice,
      sent_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as RetailDesign;
}

export async function findSentDesign(designRef: string) {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("retail_designs")
    .select("*")
    .eq("design_ref", designRef)
    .eq("status", "sent")
    .maybeSingle();
  if (error) throw error;
  return (data as RetailDesign | null) ?? null;
}

export async function getOrCreateDesignPdf(
  identity: RetailIdentity,
  design: RetailDesign
) {
  if (!design.design_ref) throw new Error("Design has no reference");
  const admin = createServiceClient();
  const path = `${design.design_ref}.pdf`;
  const existing = await admin.storage.from(PDF_BUCKET).download(path);
  if (existing.data) {
    return Buffer.from(await existing.data.arrayBuffer());
  }

  const preview = design.payload?.preview as OrderScreenPayload | undefined;
  if (!preview) throw new Error("Design is missing preview payload");

  const pdf = await buildDesignPdf({
    designRef: design.design_ref,
    firstName: identity.first_name,
    phone: identity.phone || "",
    postcode: identity.postcode,
    email: identity.email,
    screen: preview,
    buildSummary: design.summary ?? preview.summary,
    system: design.system ?? preview.type,
    finish: design.finish ?? String(preview.colour ?? ""),
    measurements: design.measurements ?? "",
    supplyPrice: Number(design.supply_price_ex_freight ?? 0),
  });

  const { error: uploadError } = await admin.storage
    .from(PDF_BUCKET)
    .upload(path, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) {
    console.error("[retail pdf] storage upload failed", uploadError.message);
  }

  return pdf;
}
