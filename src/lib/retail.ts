import type { ScreenDraft, OrderScreenPayload } from "@/lib/orders";
import { formatScreenDetailsText, neatScreenSummary } from "@/lib/email/screen-details";
import { hidePricing } from "@/lib/screen-rules";
import { COLOURS } from "@/lib/constants";

export const RETAIL_SERVICE_TYPE = "Supply Only" as const;

export const SLIDER_COLOURS = COLOURS.filter(
  (colour) => colour !== "Brushed Brass"
);

export function coloursForDraft(isSliding: boolean) {
  return isSliding ? SLIDER_COLOURS : COLOURS;
}

export function retailSystemName(draft: ScreenDraft) {
  if (draft.isSliding) return "Slider";
  return draft.type;
}

export function retailFinish(colour: string) {
  return colour.trim().toLowerCase();
}

export function retailBuildSummary(screen: OrderScreenPayload) {
  return neatScreenSummary(screen.summary);
}

export function retailMeasurements(screen: OrderScreenPayload) {
  return formatScreenDetailsText(screen);
}

export function retailSupplyPrice(draft: ScreenDraft, screen: OrderScreenPayload | null) {
  if (!screen || hidePricing(draft)) return 0;
  if (typeof screen.priceExGst === "number") return screen.priceExGst;
  return Math.round((screen.priceIncGst / 1.1) * 100) / 100;
}

export function snapshotFromScreen(
  draft: ScreenDraft,
  screen: OrderScreenPayload | null
) {
  return {
    summary: screen ? retailBuildSummary(screen) : "",
    system: retailSystemName(draft),
    finish: retailFinish(draft.colour),
    measurements: screen ? retailMeasurements(screen) : "",
    supply_price_ex_freight: retailSupplyPrice(draft, screen),
  };
}
