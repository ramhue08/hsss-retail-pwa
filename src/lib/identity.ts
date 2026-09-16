import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import { makeReentryToken } from "@/lib/session";
import {
  mergeTracking,
  normalizeTracking,
  trackingFromIdentity,
} from "@/lib/tracking";
import type { RetailIdentity, TrackingParams } from "@/types/database";

export type CaptureInput = {
  first_name: string;
  email: string;
  phone: string;
  postcode: string;
  marketing_consent: boolean;
  tracking: TrackingParams;
};

function mapIdentity(row: RetailIdentity): RetailIdentity {
  return {
    ...row,
    phone: row.phone || "",
    path: "diy",
    utm_source: row.utm_source || "",
    utm_campaign: row.utm_campaign || "",
    utm_content: row.utm_content || "",
    fbclid: row.fbclid || "",
  };
}

export async function findIdentityByToken(token: string) {
  if (!token) return null;
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("retail_identities")
    .select("*")
    .eq("reentry_token", token)
    .maybeSingle();
  if (error) throw error;
  return data ? mapIdentity(data as RetailIdentity) : null;
}

export async function findIdentityByEmail(email: string) {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("retail_identities")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw error;
  return data ? mapIdentity(data as RetailIdentity) : null;
}

export async function upsertIdentity(input: CaptureInput): Promise<RetailIdentity> {
  const email = input.email.trim().toLowerCase();
  const existing = await findIdentityByEmail(email);
  const admin = createServiceClient();
  const now = new Date().toISOString();

  if (existing) {
    const tracking = mergeTracking(
      trackingFromIdentity(existing),
      normalizeTracking(input.tracking)
    );
    const { data, error } = await admin
      .from("retail_identities")
      .update({
        first_name: input.first_name.trim(),
        phone: input.phone.trim(),
        postcode: input.postcode.trim(),
        marketing_consent: input.marketing_consent,
        path: "diy",
        utm_source: tracking.utm_source,
        utm_campaign: tracking.utm_campaign,
        utm_content: tracking.utm_content,
        fbclid: tracking.fbclid,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapIdentity(data as RetailIdentity);
  }

  const tracking = normalizeTracking(input.tracking);
  const { data, error } = await admin
    .from("retail_identities")
    .insert({
      email,
      first_name: input.first_name.trim(),
      phone: input.phone.trim(),
      postcode: input.postcode.trim(),
      marketing_consent: input.marketing_consent,
      reentry_token: makeReentryToken(),
      path: "diy",
      utm_source: tracking.utm_source,
      utm_campaign: tracking.utm_campaign,
      utm_content: tracking.utm_content,
      fbclid: tracking.fbclid,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapIdentity(data as RetailIdentity);
}

export function isValidPostcode(value: string) {
  return /^\d{4}$/.test(value.trim());
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("61") && digits.length === 11) return true;
  return digits.startsWith("0") && digits.length === 10;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
