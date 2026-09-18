import type { OrderScreenPayload } from "@/lib/orders";
import { applyRetailMarkup, formatMoney } from "@/lib/pricing";

/** Config keys that are billable / special upgrades staff must not miss. */
const UPGRADE_KEYS = new Set([
  "isRadiusCorner",
  "customSize",
  "customLeg",
  "customPanel",
  "isSliding",
]);

const CONFIG_LABELS: Record<string, string> = {
  frontMM: "Front",
  returnMM: "Return",
  doorMM: "Door",
  w2wMM: "Wall to wall",
  panelMM: "Panel",
  leftPanelMM: "Left panel",
  rightPanelMM: "Right panel",
  leftFixedPanelMM: "Left fixed",
  rightFixedPanelMM: "Right fixed",
  wallA: "Wall A",
  wallB: "Wall B",
  roughW2wMM: "Rough sheet-to-sheet",
  angleHeight: "Angle",
  hingeSide: "Hinge",
  returnSide: "Return side",
  panelSide: "Panel side",
  isSliding: "Sliding upgrade",
  customSize: "Custom size",
  customLeg: "Custom leg",
  customPanel: "Custom panel",
  isRadiusCorner: "Radius upgrade",
  fixedStyle: "Fixed style",
  fixedPanelReturnStyle: "Return style",
  style: "Style",
  sizeMode: "Size mode",
  frontOnlySizeMode: "Size mode",
  oversizeMeasurementDate: "Measure date",
  returnHobMM: "Return hob",
  returnPanelMM: "Return panel",
  frontHobMM: "Front hob",
  frontPanelMM: "Front panel",
  openingMM: "Walkthrough opening",
};

const PANEL_RETURN_HOB_SKIP = new Set(["returnMM", "frontMM", "panelMM"]);

function isBigDoor(value: unknown) {
  return Number(value) === 762 || String(value).trim() === "762";
}

function isOversizeMode(key: string, value: unknown) {
  return (
    (key === "sizeMode" || key === "frontOnlySizeMode") &&
    String(value) === "oversize"
  );
}

function humanizeKey(key: string) {
  const withoutUnit = key.replace(/MM$/i, "");
  const spaced = withoutUnit.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatConfigValue(key: string, value: unknown): string | null {
  if (value == null || value === "") return null;

  if (typeof value === "boolean") {
    if (!value) return null;
    if (key === "isRadiusCorner") return "200mm";
    return "Yes";
  }

  let text = String(value).trim();
  if (!text) return null;

  // Drop unit suffixes from values (e.g. "662mm" → "662")
  text = text.replace(/(\d)\s*mm\b/gi, "$1");

  if (key === "doorMM" && isBigDoor(text)) {
    return `762 (+${formatMoney(applyRetailMarkup(100))})`;
  }

  if (key === "hingeSide" || key === "returnSide" || key === "panelSide") {
    if (text === "left") return "Left";
    if (text === "right") return "Right";
  }

  if (key === "style") {
    if (text === "panelDoor") return "Panel + door";
    if (text === "panelDoorPanel") return "Panel + door + panel";
  }

  if (key === "fixedStyle") {
    if (text === "single") return "Single panel";
    if (text === "double") return "Two panels";
    if (text === "panelReturn") return "Panel + return";
  }

  if (key === "fixedPanelReturnStyle") {
    if (text === "inlineWalkthrough") return "Inline walkthrough";
    if (text === "singleInReturn") return "Single in return";
  }

  if (key === "sizeMode" || key === "frontOnlySizeMode") {
    if (text === "oversize") return "Pending measure";
    // Exact is the normal path — no need to list it
    if (text === "exact") return null;
  }

  if (key === "openingMM") {
    const opening = Number(text);
    if (!Number.isFinite(opening)) return null;
    if (opening < 600) return `${opening} (under 600)`;
  }

  if (key === "frontPanelMM" && text.toLowerCase() === "none") {
    return "None";
  }

  return text;
}

function isUpgradeKey(key: string, value: unknown): boolean {
  if (UPGRADE_KEYS.has(key)) return true;
  // 762mm hinged door is a billable big-door upgrade (+$100)
  if (key === "doorMM" && isBigDoor(value)) return true;
  // Front Only oversize angle — measurement still to come
  if (isOversizeMode(key, value)) return true;
  return false;
}

function configLabel(key: string, value: unknown) {
  if (key === "doorMM" && isBigDoor(value)) return "Big door upgrade";
  if (isOversizeMode(key, value)) return "Oversize angle";
  return CONFIG_LABELS[key] ?? humanizeKey(key);
}

/** Summary with mm unit suffixes removed for cleaner email/card display. */
export function neatScreenSummary(summary: string) {
  return summary
    .replace(/(\d)\s*mm\b/gi, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type ScreenDetailRow = {
  label: string;
  value: string;
  upgrade?: boolean;
};

export function screenDetailRows(
  screen: OrderScreenPayload
): ScreenDetailRow[] {
  const rows: ScreenDetailRow[] = [];
  const config = screen.config;

  if (screen.colour) {
    rows.push({ label: "Colour", value: screen.colour });
  }

  for (const [key, raw] of Object.entries(config)) {
    // Fold measure date into the oversize upgrade line instead of a plain row
    if (key === "oversizeMeasurementDate" && config.sizeMode === "oversize") {
      continue;
    }
    // Oversize stores the rough value in w2wMM for the diagram — show rough only
    if (key === "w2wMM" && config.sizeMode === "oversize") {
      continue;
    }
    if (config.returnHobMM != null && PANEL_RETURN_HOB_SKIP.has(key)) {
      continue;
    }

    const value = formatConfigValue(key, raw);
    if (!value) continue;

    let displayValue = value;
    if (isOversizeMode(key, raw)) {
      const measureDate = String(config.oversizeMeasurementDate ?? "").trim();
      displayValue = measureDate
        ? `Pending measure (${measureDate})`
        : "Pending measure";
    }

    rows.push({
      label: configLabel(key, raw),
      value: displayValue,
      upgrade: isUpgradeKey(key, raw),
    });
  }

  // Upgrades first so they catch the eye
  return rows.sort((a, b) => Number(Boolean(b.upgrade)) - Number(Boolean(a.upgrade)));
}

export function screenUpgradeRows(screen: OrderScreenPayload): ScreenDetailRow[] {
  return screenDetailRows(screen).filter((row) => row.upgrade);
}

export function formatScreenDetailsText(screen: OrderScreenPayload) {
  return screenDetailRows(screen)
    .map((row) => `${row.label}: ${row.value}`)
    .join(" · ");
}
