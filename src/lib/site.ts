export const APP_NAME = "HSSS Retail";
export const APP_SHORT_NAME = "HSSS DIY";
export const APP_DESCRIPTION =
  "Design a shower screen, see the supply-only price, and send it to Hydro Seal Shower Systems.";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3002";

export const BRAND = {
  navy: "#003A70",
  navyDeep: "#001B3D",
  cyan: "#00AEEF",
} as const;

export const RETAIL_PHONE_DISPLAY = "1300 879 091";
export const RETAIL_PHONE_TEL = "1300879091";

export const SEND_DESIGN_LABEL = "Send my design to Hydro Seal Shower Systems";

export const FREIGHT_DISCLAIMER =
  "Supply only, freight quoted to your postcode";

export const CONSENT_COPY =
  "By submitting, you agree we may contact you about your enquiry by phone, SMS and email. You can opt out at any time.";

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1114385010542158";

export function appLink(token: string) {
  return `${APP_URL}/r/${token}`;
}

export function designPdfUrl(designRef: string) {
  return `${APP_URL}/designs/${designRef}.pdf`;
}
