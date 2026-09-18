import type { HingeSide } from "@/lib/constants";
import type { FrontOnlyStyle, ScreenDraft, ScreenType } from "@/lib/orders";
import {
  frontOnlyMinOpening,
  frontReturnMinFront,
  returnPanelFromHob,
  SMALLEST_STOCK_PANEL_MM,
} from "@/lib/stock-panels";

export { returnPanelFromHob } from "@/lib/stock-panels";

export const STOCK_STEP_MM = 50;
export const CUSTOM_STEP_MM = 1;

/** @deprecated Prefer frontOnlyMinOpening(layout, doorMM) — 662 door default. */
export const FRONT_ONLY_MIN_PANEL_DOOR = 785;
/** @deprecated Prefer frontOnlyMinOpening(layout, doorMM) — 662 door default. */
export const FRONT_ONLY_MIN_PANEL_DOOR_PANEL = 865;
export const WALKTHROUGH_WARNING_MM = 600;

/** Front & Return — max stock leg length (front or return). Over = office quote. */
export const FRONT_RETURN_STOCK_MAX_MM = 1500;

/** Fixed panel stock sheet sizes (Pricing Guide §4). Outside = custom quote. */
export const FIXED_PANEL_SMALL_MAX = 985;
export const FIXED_PANEL_LARGE_MIN = 1035;
export const FIXED_PANEL_LARGE_MAX = 1485;

/** 200mm radius-corner fixed panels — stock widths only. */
export const RADIUS_CORNER_STOCK_SIZES = [885, 985, 1185] as const;
export type RadiusCornerStockSize = (typeof RADIUS_CORNER_STOCK_SIZES)[number];
export const RADIUS_CORNER_EXTRA = 150;

export const DOOR_PANEL_DEDUCTION = {
  "662": 697,
  "762": 797,
} as const;

export type FrontOnlySizeMode = "exact" | "oversize";
export type FixedPanelReturnStyle = "inlineWalkthrough" | "singleInReturn";

export function doorPanelDeduction(doorMM: "662" | "762") {
  return DOOR_PANEL_DEDUCTION[doorMM];
}

export function panelTotalForFrontOnly(
  w2wMM: number,
  doorMM: "662" | "762"
) {
  return w2wMM - doorPanelDeduction(doorMM);
}

export function linkedRightPanelMM(
  w2wMM: number,
  leftPanelMM: number,
  doorMM: "662" | "762"
) {
  return panelTotalForFrontOnly(w2wMM, doorMM) - leftPanelMM;
}

/**
 * Clamp left panel so both left and right stay at least `minPanel` wide.
 * Used by Panel + Door + Panel size toggles when the opening is tight
 * (e.g. ~900mm sheet-to-sheet) or left was left oversized from a wider opening.
 */
export function clampLinkedLeftPanelMM(
  w2wMM: number,
  leftPanelMM: number,
  doorMM: "662" | "762",
  minPanel = SMALLEST_STOCK_PANEL_MM
) {
  const panelTotal = panelTotalForFrontOnly(w2wMM, doorMM);
  if (panelTotal < minPanel * 2) {
    return Math.max(minPanel, Math.floor(panelTotal / 2));
  }
  const maxLeft = panelTotal - minPanel;
  const snapped = snapToStock(leftPanelMM, STOCK_STEP_MM);
  return Math.min(maxLeft, Math.max(minPanel, snapped));
}

export function resolveLinkedRightPanelMM(draft: ScreenDraft) {
  const w2w = frontOnlyEffectiveW2w(draft);
  const left = Number(draft.leftPanelMM) || 0;
  if (!w2w || !left) return 0;
  const doorMM = draft.isSliding ? "662" : draft.doorMM;
  return linkedRightPanelMM(w2w, left, doorMM);
}

/** Sheet-to-sheet used for layout: rough when oversize, otherwise exact. */
export function frontOnlyEffectiveW2w(draft: ScreenDraft): number {
  if (draft.type === "Front Only" && draft.frontOnlySizeMode === "oversize") {
    return Number(draft.roughW2wMM) || 0;
  }
  return Number(draft.w2wMM) || 0;
}

/** Keep auto-linked right panel in sync when w2w, left, or door width changes. */
export function syncFrontOnlyRightPanel(
  draft: ScreenDraft,
  patch: Partial<ScreenDraft> = {}
): Partial<ScreenDraft> {
  const next = { ...draft, ...patch };
  if (
    next.type !== "Front Only" ||
    next.frontOnlyStyle !== "panelDoorPanel"
  ) {
    return patch;
  }
  const w2w = frontOnlyEffectiveW2w(next);
  const left = Number(next.leftPanelMM) || 0;
  if (!w2w) return patch;
  const doorMM = next.isSliding ? "662" : next.doorMM;
  const clampedLeft = clampLinkedLeftPanelMM(
    w2w,
    left || SMALLEST_STOCK_PANEL_MM,
    doorMM
  );
  return {
    ...patch,
    leftPanelMM: String(clampedLeft),
    rightPanelMM: String(linkedRightPanelMM(w2w, clampedLeft, doorMM)),
  };
}

export function usesStockIncrements(type: ScreenType, draft: ScreenDraft) {
  if (draft.customSize) return false;
  return (
    type === "Front & Return" ||
    type === "Fixed Panel" ||
    (type === "Splayed" && !draft.customSize)
  );
}

export function sizeStep(type: ScreenType, draft: ScreenDraft) {
  if (draft.customSize) return CUSTOM_STEP_MM;
  if (type === "Front & Return" || type === "Fixed Panel") return STOCK_STEP_MM;
  return CUSTOM_STEP_MM;
}

export function snapToStock(value: number, step = STOCK_STEP_MM) {
  return Math.max(step, Math.round(value / step) * step);
}

export function hasHingedDoor(draft: ScreenDraft) {
  if (draft.type === "Splayed") return true;
  return (
    (draft.type === "Front & Return" || draft.type === "Front Only") &&
    !draft.isSliding
  );
}

export function hingeSideRequired(draft: ScreenDraft) {
  return hasHingedDoor(draft) && !draft.hingeSide;
}

export function isRadiusCornerStockWidth(panelWidthMM: number) {
  return (RADIUS_CORNER_STOCK_SIZES as readonly number[]).includes(
    panelWidthMM
  );
}

export function nearestRadiusCornerStockSize(panelWidthMM: number): RadiusCornerStockSize {
  let best: RadiusCornerStockSize = RADIUS_CORNER_STOCK_SIZES[0];
  let bestDist = Math.abs(panelWidthMM - best);
  for (const size of RADIUS_CORNER_STOCK_SIZES) {
    const dist = Math.abs(panelWidthMM - size);
    if (dist < bestDist) {
      best = size;
      bestDist = dist;
    }
  }
  return best;
}

/** Snap draft panel widths onto radius-corner stock sizes. */
export function snapDraftToRadiusCornerStock(
  draft: ScreenDraft
): Partial<ScreenDraft> {
  const patch: Partial<ScreenDraft> = {
    isRadiusCorner: true,
    customSize: false,
  };
  if (draft.fixedStyle === "double") {
    patch.leftFixedPanelMM = String(
      nearestRadiusCornerStockSize(Number(draft.leftFixedPanelMM) || 885)
    );
    patch.rightFixedPanelMM = String(
      nearestRadiusCornerStockSize(Number(draft.rightFixedPanelMM) || 885)
    );
  } else {
    patch.panelMM = String(
      nearestRadiusCornerStockSize(Number(draft.panelMM) || 885)
    );
    if (draft.fixedStyle === "panelReturn") {
      const hob = Number(draft.returnMM) || 900;
      patch.returnMM = String(
        nearestRadiusCornerStockSize(hob - 15) + 15
      );
      if (!(Number(draft.panelMM) > 0)) {
        delete patch.panelMM;
      }
    }
  }
  return patch;
}

export function isFixedPanelStockWidth(
  panelWidthMM: number,
  isRadiusCorner = false
) {
  if (panelWidthMM <= 0) return false;
  if (isRadiusCorner) return isRadiusCornerStockWidth(panelWidthMM);
  if (panelWidthMM <= FIXED_PANEL_SMALL_MAX) return true;
  return (
    panelWidthMM >= FIXED_PANEL_LARGE_MIN &&
    panelWidthMM <= FIXED_PANEL_LARGE_MAX
  );
}

/** Base panel width used for stock tier (mirrors pricing resolveFixedPanelPricing). */
export function fixedPanelBaseWidthMM(draft: ScreenDraft) {
  if (draft.type !== "Fixed Panel") return 0;
  if (draft.fixedStyle === "double") {
    return Math.max(
      Number(draft.leftFixedPanelMM) || 0,
      Number(draft.rightFixedPanelMM) || 0
    );
  }
  if (draft.fixedStyle === "panelReturn") {
    const returnPanel = returnPanelFromHob(Number(draft.returnMM) || 0);
    if (draft.fixedPanelReturnStyle === "inlineWalkthrough") {
      return Math.max(Number(draft.panelMM) || 0, returnPanel);
    }
    return returnPanel;
  }
  return Number(draft.panelMM) || 0;
}

/** True when the priced base panel is outside stock sheet sizes (e.g. 1500mm+). */
export function fixedPanelRequiresCustomQuote(draft: ScreenDraft) {
  if (draft.type !== "Fixed Panel") return false;
  const base = fixedPanelBaseWidthMM(draft);
  if (base <= 0) return false;
  return !isFixedPanelStockWidth(base, draft.isRadiusCorner);
}

/** Front & Return: either leg over 1500mm needs an office/custom quote. */
export function frontReturnRequiresCustomQuote(draft: ScreenDraft) {
  if (draft.type !== "Front & Return") return false;
  const frontMM = Number(draft.frontMM) || 0;
  const returnMM = Number(draft.returnMM) || 0;
  return (
    frontMM > FRONT_RETURN_STOCK_MAX_MM || returnMM > FRONT_RETURN_STOCK_MAX_MM
  );
}

export function requiresCustomQuote(draft: ScreenDraft) {
  return (
    fixedPanelRequiresCustomQuote(draft) ||
    frontReturnRequiresCustomQuote(draft)
  );
}

export function hidePricing(draft: ScreenDraft) {
  return (
    draft.customSize ||
    requiresCustomQuote(draft) ||
    (draft.type === "Front Only" && draft.frontOnlySizeMode === "oversize")
  );
}

export function walkthroughOpeningMM(
  w2wMM: number,
  panelSizes: number[]
) {
  return w2wMM - panelSizes.reduce((sum, n) => sum + n, 0);
}

export function panelReturnOpeningMM(frontHobMM: number, frontPanelMM: number) {
  if (!(frontHobMM > 0) || !(frontPanelMM > 0)) return 0;
  return frontHobMM - frontPanelMM;
}

export function walkthroughUnderLimit(
  w2wMM: number,
  panelSizes: number[]
) {
  const panels = panelSizes.filter((n) => n > 0);
  if (!w2wMM || panels.length === 0) return false;
  const opening = walkthroughOpeningMM(w2wMM, panels);
  return opening < WALKTHROUGH_WARNING_MM;
}

export function validateFrontOnlySizeMode(draft: ScreenDraft) {
  if (draft.type !== "Front Only") return null;
  if (!draft.frontOnlySizeMode) {
    return "Choose Exact Size or Oversize Angle before continuing.";
  }
  if (draft.frontOnlySizeMode === "oversize") {
    if (!draft.oversizeMeasurementDate.trim()) {
      return "Enter the date you will supply the exact sheet-to-sheet measurement.";
    }
    if (!Number(draft.roughW2wMM)) {
      return "Enter rough sheet-to-sheet width.";
    }
  }
  return null;
}

/** Slider guardrails — hard blocks, even with Custom Size on. Office still sizes every slider. */
export const SLIDER = {
  frontReturn: { min: 1200, max: 1500 },
  panelDoor: { min: 1200, max: 3000 },
  panelDoorPanel: { min: 1300, max: 3000 },
} as const;

export type SliderLayout = keyof typeof SLIDER;

const SLIDER_LABEL: Record<SliderLayout, string> = {
  frontReturn: "front width",
  panelDoor: "sheet-to-sheet",
  panelDoorPanel: "sheet-to-sheet",
};

export function sliderLayoutForDraft(draft: ScreenDraft): SliderLayout | null {
  if (draft.type === "Front & Return") return "frontReturn";
  if (draft.type === "Front Only") {
    if (draft.frontOnlyStyle === "panelDoor") return "panelDoor";
    if (draft.frontOnlyStyle === "panelDoorPanel") return "panelDoorPanel";
  }
  return null;
}

export function sliderWidthMM(draft: ScreenDraft): number {
  if (draft.type === "Front & Return") return Number(draft.frontMM) || 0;
  if (draft.type === "Front Only") return frontOnlyEffectiveW2w(draft);
  return 0;
}

/**
 * Returns null when valid, or a block object with a message.
 * Does not auto-switch layout — builder must change style or width themselves.
 */
export function validateSliderWidth({
  layout,
  widthMM,
  isSlider,
}: {
  layout: SliderLayout | string;
  widthMM: number;
  isSlider: boolean;
}): { block: true; message: string } | null {
  if (!isSlider) return null;

  const rule = SLIDER[layout as SliderLayout];
  if (!rule) {
    return { block: true, message: "Sliders aren't available on this screen type." };
  }

  const what = SLIDER_LABEL[layout as SliderLayout];

  if (widthMM < rule.min) {
    return {
      block: true,
      message:
        layout === "panelDoorPanel"
          ? `Panel + door + panel needs a minimum of ${rule.min}mm for a slider. Switch to panel + door, or widen the opening.`
          : `A slider needs a minimum ${what} of ${rule.min}mm.`,
    };
  }

  if (widthMM > rule.max) {
    return {
      block: true,
      message:
        layout === "frontReturn"
          ? `${rule.max}mm is the maximum front width for a slider on a front & return.`
          : `${rule.max}mm is the maximum ${what} for a slider on this layout.`,
    };
  }

  return null;
}

/** Hard-block message for an unbuildable slider, or null when valid / not a slider. */
export function validateSlider(draft: ScreenDraft): string | null {
  if (!draft.isSliding) return null;

  const layout = sliderLayoutForDraft(draft);
  if (!layout) {
    if (draft.type === "Front Only" && !draft.frontOnlyStyle) return null;
    return "Sliders aren't available on this screen type.";
  }

  const widthMM = sliderWidthMM(draft);
  if (!widthMM) return null;

  return validateSliderWidth({ layout, widthMM, isSlider: true })?.message ?? null;
}

export function validateFrontOnlyMinimums(draft: ScreenDraft) {
  if (draft.type !== "Front Only" || !draft.frontOnlySizeMode) {
    return null;
  }
  if (draft.isSliding) return null;

  const w2w = frontOnlyEffectiveW2w(draft);
  const doorMM = draft.doorMM;

  if (draft.frontOnlyStyle === "panelDoor") {
    const min = frontOnlyMinOpening("panelDoor", doorMM);
    if (w2w > 0 && w2w < min) {
      return doorMM === "762"
        ? `Wide door needs a wider opening — minimum sheet-to-sheet for Panel + Door with a 762mm door is ${min}mm.`
        : `Minimum sheet-to-sheet for Panel + Door is ${min}mm.`;
    }
  }

  if (draft.frontOnlyStyle === "panelDoorPanel") {
    const min = frontOnlyMinOpening("panelDoorPanel", doorMM);
    if (w2w > 0 && w2w < min) {
      return doorMM === "762"
        ? `Wide door needs a wider opening — minimum sheet-to-sheet for Panel + Door + Panel with a 762mm door is ${min}mm.`
        : `Minimum sheet-to-sheet for Panel + Door + Panel is ${min}mm. Switch to Panel + Door for smaller openings.`;
    }
  }

  return null;
}

export function validateFrontReturnMinimums(draft: ScreenDraft) {
  if (draft.type !== "Front & Return" || draft.isSliding) return null;
  const frontMM = Number(draft.frontMM) || 0;
  if (!frontMM) return null;
  const min = frontReturnMinFront(draft.doorMM);
  if (frontMM < min) {
    return draft.doorMM === "762"
      ? `Wide door needs a wider opening — minimum front width with a 762mm door is ${min}mm.`
      : `Minimum front width is ${min}mm.`;
  }
  return null;
}

export function validateHingeSide(draft: ScreenDraft) {
  if (hingeSideRequired(draft)) {
    return "Select hinge side (LHS or RHS) before continuing.";
  }
  return null;
}

export function validateScreenDraft(
  draft: ScreenDraft,
  options?: { forPreview?: boolean }
): string | null {
  if (!options?.forPreview) {
    const sliderError = validateSlider(draft);
    if (sliderError) return sliderError;

    const hingeError = validateHingeSide(draft);
    if (hingeError) return hingeError;

    if (!draft.angleHeight) {
      return "Select angle height.";
    }
  }

  if (draft.type === "Front & Return") {
    const frMinError = validateFrontReturnMinimums(draft);
    if (frMinError) return frMinError;
  }

  if (draft.type === "Front Only") {
    const modeError = validateFrontOnlySizeMode(draft);
    if (modeError) return modeError;

    if (draft.frontOnlySizeMode && !draft.frontOnlyStyle) {
      return "Choose Panel + Door or Panel + Door + Panel.";
    }

    const minError = validateFrontOnlyMinimums(draft);
    if (minError) return minError;

    if (
      draft.frontOnlyStyle === "panelDoorPanel" &&
      draft.frontOnlySizeMode &&
      !draft.isSliding
    ) {
      const w2w = frontOnlyEffectiveW2w(draft);
      if (!w2w) {
        return draft.frontOnlySizeMode === "oversize"
          ? "Enter rough sheet-to-sheet width."
          : "Enter sheet-to-sheet measurement.";
      }
      const left = Number(draft.leftPanelMM);
      if (!left) return "Choose panel sizes.";
      const right = resolveLinkedRightPanelMM(draft);
      if (right < SMALLEST_STOCK_PANEL_MM) {
        return "Opening too narrow for the smallest stock panel (85mm). Reduce the left panel or widen the opening.";
      }
    }
  }

  return null;
}

export function hingeLabel(hingeSide: HingeSide | "") {
  if (!hingeSide) return "";
  return hingeSide === "left" ? "HL" : "HR";
}

export function doorSummaryPart(draft: ScreenDraft) {
  if (draft.isSliding) return "Slide";
  if (!hasHingedDoor(draft)) return "";
  const hinge = hingeLabel(draft.hingeSide);
  if (!hinge) return `${draft.doorMM}mm door`;
  return `${draft.doorMM}mm ${hinge}`;
}

export function frontOnlyStyleLabel(style: FrontOnlyStyle) {
  return style === "panelDoorPanel" ? "panelDoorPanel" : "panelDoor";
}
