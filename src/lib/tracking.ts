import type { TrackingParams } from "@/types/database";

export const TRACKING_COOKIE = "hsss_retail_tracking";
export const SESSION_COOKIE = "hsss_retail_token";

export const COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export function emptyTracking(): TrackingParams {
  return {
    path: "diy",
    utm_source: "",
    utm_campaign: "",
    utm_content: "",
    fbclid: "",
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeTracking(
  input?: Partial<Record<string, unknown>> | null
): TrackingParams {
  const src = input ?? {};
  return {
    path: "diy",
    utm_source: asString(src.utm_source),
    utm_campaign: asString(src.utm_campaign),
    utm_content: asString(src.utm_content),
    fbclid: asString(src.fbclid),
  };
}

export function mergeTracking(
  base: TrackingParams,
  incoming: TrackingParams
): TrackingParams {
  return {
    path: "diy",
    utm_source: incoming.utm_source || base.utm_source,
    utm_campaign: incoming.utm_campaign || base.utm_campaign,
    utm_content: incoming.utm_content || base.utm_content,
    fbclid: incoming.fbclid || base.fbclid,
  };
}

export function parseTrackingCookie(value: string | undefined | null): TrackingParams {
  if (!value) return emptyTracking();
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return normalizeTracking(parsed);
  } catch {
    return emptyTracking();
  }
}

export function trackingFromSearchParams(
  params: URLSearchParams
): TrackingParams {
  return normalizeTracking({
    utm_source: params.get("utm_source") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
    utm_content: params.get("utm_content") ?? "",
    fbclid: params.get("fbclid") ?? "",
  });
}

export function trackingFromIdentity(identity: {
  path?: string;
  utm_source: string;
  utm_campaign: string;
  utm_content: string;
  fbclid: string;
}): TrackingParams {
  return {
    path: "diy",
    utm_source: identity.utm_source || "",
    utm_campaign: identity.utm_campaign || "",
    utm_content: identity.utm_content || "",
    fbclid: identity.fbclid || "",
  };
}
