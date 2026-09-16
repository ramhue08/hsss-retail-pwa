import type { TrackingParams } from "@/types/database";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function pixelParams(tracking: TrackingParams, extra?: Record<string, string>) {
  return {
    path: tracking.path || "diy",
    utm_source: tracking.utm_source || "",
    utm_campaign: tracking.utm_campaign || "",
    utm_content: tracking.utm_content || "",
    fbclid: tracking.fbclid || "",
    ...extra,
  };
}

export function trackDiyAppAccess(tracking: TrackingParams) {
  window.fbq?.("trackCustom", "diy_app_access", pixelParams(tracking));
}

export function trackDiyQuoteRequest(
  tracking: TrackingParams,
  postcode: string
) {
  window.fbq?.("trackCustom", "diy_quote_request", pixelParams(tracking, { postcode }));
}
