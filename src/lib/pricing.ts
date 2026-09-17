import type { FixedStyle } from "@/lib/constants";
import type { FixedPanelReturnStyle } from "@/lib/screen-rules";
import {
  FIXED_PANEL_LARGE_MAX,
  FIXED_PANEL_LARGE_MIN,
  FIXED_PANEL_SMALL_MAX,
  RADIUS_CORNER_EXTRA,
  isFixedPanelStockWidth,
} from "@/lib/screen-rules";
import type { ServiceType } from "@/types/database";

const PRICING = {
  supplyInstall: {
    frontReturn: { rate: 310, min: 1123.0 },
    splay: { rate: 310, min: 1123.0 },
    panelDoor: {
      table: {
        900: 850.82,
        1000: 881.1,
        1100: 915.44,
        1200: 949.78,
        1300: 984.13,
        1400: 1018.47,
        1500: 1052.81,
      },
      min: 850.82,
      minWidth: 900,
      incrementAbove: 1500,
      increment: 34.34,
    },
    panelDoorPanel: {
      table: {
        1000: 973.91,
        1100: 995.89,
        1200: 1022.75,
        1300: 1077.49,
        1400: 1124.94,
        1500: 1153.68,
        1600: 1161.39,
        1700: 1209.66,
        1800: 1217.71,
      },
      min: 973.91,
      minWidth: 1000,
      incrementAbove: 1800,
      increment: 48.0,
    },
    fixedPanel: {
      small: 704.58,
      large: 930.33,
      smallMax: FIXED_PANEL_SMALL_MAX,
      largeMin: FIXED_PANEL_LARGE_MIN,
      largeMax: FIXED_PANEL_LARGE_MAX,
      hobAllowanceSmallM: 2.0,
      hobAllowanceLargeM: 3.0,
      extraHobPerMetre: 75,
      bentHob: 75,
      extraPanelInstall: 150,
      extraPanelWaterstop: 50,
      extraPanelGlassPerM2: 75,
    },
    colourSurcharge: {
      Chrome: { multi: 0, fixed: 0 },
      Black: { multi: 115, fixed: 65 },
      "Brushed Nickel": { multi: 115, fixed: 65 },
      "Brushed Brass": { multi: 220, fixed: 120 },
    },
  },
  supplyOnly: {
    frontReturn: { rate: 215, min: 750.0 },
    splay: { rate: 215, min: 750.0 },
    panelDoor: {
      table: {
        900: 557.13,
        1000: 587.82,
        1100: 622.15,
        1200: 656.5,
        1300: 690.83,
        1400: 725.17,
        1500: 759.51,
      },
      min: 557.13,
      minWidth: 900,
      incrementAbove: 1500,
      increment: 34.34,
    },
    panelDoorPanel: {
      table: {
        1000: 680.63,
        1100: 702.19,
        1200: 776.96,
        1300: 783.79,
        1400: 836.04,
        1500: 854.86,
        1600: 868.11,
        1700: 897.11,
        1800: 924.42,
      },
      min: 680.63,
      minWidth: 1000,
      incrementAbove: 1800,
      increment: 48.0,
    },
    fixedPanel: {
      small: 504.21,
      large: 649.86,
      smallMax: FIXED_PANEL_SMALL_MAX,
      largeMin: FIXED_PANEL_LARGE_MIN,
      largeMax: FIXED_PANEL_LARGE_MAX,
      hobAllowanceSmallM: 2.0,
      hobAllowanceLargeM: 3.0,
      extraHobPerMetre: 75,
      bentHob: 75,
      extraPanelInstall: 0,
      extraPanelWaterstop: 50,
      extraPanelGlassPerM2: 120,
    },
    colourSurcharge: {
      Chrome: { multi: 0, fixed: 0 },
      Black: { multi: 110, fixed: 85 },
      "Brushed Nickel": { multi: 110, fixed: 85 },
      "Brushed Brass": { multi: 215, fixed: 170 },
    },
  },
} as const;

type PricingTier = (typeof PRICING)["supplyInstall"];
type FixedPanelPricing = PricingTier["fixedPanel"] | (typeof PRICING)["supplyOnly"]["fixedPanel"];

export type PriceBreakdown = {
  base: number;
  colourAdd: number;
  doorAdd: number;
  exGst: number;
  incGst: number;
};

type CalcConfig = {
  frontMM?: number;
  returnMM?: number;
  wallA?: number;
  wallB?: number;
  w2wMM?: number;
  panelMM?: number;
  leftFixedPanelMM?: number;
  rightFixedPanelMM?: number;
  fixedStyle?: FixedStyle;
  fixedPanelReturnStyle?: FixedPanelReturnStyle;
  colour: string;
  isSliding?: boolean;
  doorMM?: number;
  isRadiusCorner?: boolean;
};

/** Stock panels: ≤985 small sheet, 1035–1485 large sheet. Outside = custom quote. */
export function fixedPanelTier(panelWidthMM: number, fp: FixedPanelPricing) {
  if (!isFixedPanelStockWidth(panelWidthMM)) return null;
  if (panelWidthMM <= fp.smallMax) return "small" as const;
  return "large" as const;
}

export function fixedPanelTierPrice(
  panelWidthMM: number,
  fp: FixedPanelPricing
) {
  const tier = fixedPanelTier(panelWidthMM, fp);
  if (tier === "large") return fp.large;
  if (tier === "small") return fp.small;
  return null;
}

export function hobAllowanceMetres(
  panelWidthMM: number,
  fp: FixedPanelPricing
) {
  return fixedPanelTier(panelWidthMM, fp) === "large"
    ? fp.hobAllowanceLargeM
    : fp.hobAllowanceSmallM;
}

/** Extra hob beyond included allowance — rounded up to whole metres. */
export function extraHobCharge(
  hobLengthM: number,
  includedAllowanceM: number,
  perMetre = 75
) {
  if (hobLengthM <= includedAllowanceM) return 0;
  const metresOver = hobLengthM - includedAllowanceM;
  return Math.ceil(metresOver) * perMetre;
}

export function extraPanelCharge(
  extraPanelWidthMM: number,
  fp: FixedPanelPricing
) {
  if (extraPanelWidthMM <= 0) return 0;
  const glassM2 = (extraPanelWidthMM / 1000) * 2.0;
  return (
    fp.extraPanelInstall +
    fp.extraPanelWaterstop +
    glassM2 * fp.extraPanelGlassPerM2
  );
}

export type FixedPanelPricingInput = {
  fixedStyle: FixedStyle;
  fixedPanelReturnStyle?: FixedPanelReturnStyle;
  panelMM?: number;
  leftFixedPanelMM?: number;
  rightFixedPanelMM?: number;
  w2wMM?: number;
  frontMM?: number;
  returnMM?: number;
};

export function resolveFixedPanelPricing(input: FixedPanelPricingInput) {
  const {
    fixedStyle,
    fixedPanelReturnStyle = "inlineWalkthrough",
    panelMM = 0,
    leftFixedPanelMM = 0,
    rightFixedPanelMM = 0,
    w2wMM = 0,
    frontMM = 0,
    returnMM = 0,
  } = input;

  if (fixedStyle === "double") {
    const basePanelMM = Math.max(leftFixedPanelMM, rightFixedPanelMM);
    return {
      basePanelMM,
      extraPanelMM: Math.min(leftFixedPanelMM, rightFixedPanelMM),
      hobLengthMM: w2wMM,
      bentHob: false,
    };
  }

  if (fixedStyle === "panelReturn") {
    if (fixedPanelReturnStyle === "inlineWalkthrough") {
      // Same as two panels: larger glass = base, smaller = extra panel (5C).
      // Return glass + front inline glass; walkthrough opening is not glass.
      const a = panelMM;
      const b = returnMM;
      return {
        basePanelMM: Math.max(a, b),
        extraPanelMM: Math.min(a, b),
        hobLengthMM: frontMM + returnMM,
        bentHob: true,
      };
    }
    return {
      basePanelMM: panelMM,
      extraPanelMM: 0,
      hobLengthMM: returnMM,
      bentHob: true,
    };
  }

  return {
    basePanelMM: panelMM,
    extraPanelMM: 0,
    hobLengthMM: w2wMM,
    bentHob: false,
  };
}

/** Baked-in fixed panel price (base tier + hob + bent hob + extra panel). */
export function calcFixedPanelBase(
  input: FixedPanelPricingInput,
  customerType: ServiceType
): number | null {
  const p =
    customerType === "Supply & Install"
      ? PRICING.supplyInstall
      : PRICING.supplyOnly;
  const fp = p.fixedPanel;
  const { basePanelMM, extraPanelMM, hobLengthMM, bentHob } =
    resolveFixedPanelPricing(input);

  const tierPrice = fixedPanelTierPrice(basePanelMM, fp);
  if (tierPrice == null) return null;

  let total = tierPrice;

  const hobLengthM = hobLengthMM / 1000;
  const allowanceM = hobAllowanceMetres(basePanelMM, fp);
  total += extraHobCharge(hobLengthM, allowanceM, fp.extraHobPerMetre);

  if (bentHob) {
    total += fp.bentHob;
  }

  total += extraPanelCharge(extraPanelMM, fp);

  return total;
}

export type PricingOptions = {
  /**
   * Custom $/m² vs catalogue (S&I 310 / Supply Only 215).
   * F&R + Splayed: replaces the rate directly.
   * Front Only + Fixed: scales catalogue price by custom/catalogue.
   * 0/null = catalogue.
   */
  pricingRateM2?: number | null;
  /** Flat fee (AUD ex GST) added to every priced screen. */
  perScreenFee?: number | null;
};

function resolveRateM2(
  catalogueRate: number,
  pricingRateM2?: number | null
): number {
  const custom = Number(pricingRateM2);
  if (Number.isFinite(custom) && custom > 0) return custom;
  return catalogueRate;
}

/** Scale factor for table/tier prices when a custom $/m² is set. */
function rateScaleFactor(
  catalogueRate: number,
  pricingRateM2?: number | null
): number {
  const custom = Number(pricingRateM2);
  if (Number.isFinite(custom) && custom > 0) return custom / catalogueRate;
  return 1;
}

export function calcPrice(
  screenType:
    | "frontReturn"
    | "splay"
    | "panelDoor"
    | "panelDoorPanel"
    | "fixedPanel",
  config: CalcConfig,
  customerType: ServiceType,
  options?: PricingOptions
): PriceBreakdown {
  const p =
    customerType === "Supply & Install"
      ? PRICING.supplyInstall
      : PRICING.supplyOnly;
  const catalogueRate = p.frontReturn.rate;
  let base = 0;
  let isFixed = false;

  if (screenType === "frontReturn") {
    const m2 = (((config.frontMM ?? 0) + (config.returnMM ?? 0)) / 1000) * 2.0;
    const rate = resolveRateM2(catalogueRate, options?.pricingRateM2);
    const scale = rateScaleFactor(catalogueRate, options?.pricingRateM2);
    // Scale the catalogue minimum with the custom rate so a lower $/m²
    // actually reduces the floor (otherwise Math.max keeps the old min).
    base = Math.max(p.frontReturn.min * scale, m2 * rate);
  } else if (screenType === "splay") {
    const m2 = (((config.wallA ?? 0) + (config.wallB ?? 0)) / 1000) * 2.0;
    const rate = resolveRateM2(p.splay.rate, options?.pricingRateM2);
    const scale = rateScaleFactor(p.splay.rate, options?.pricingRateM2);
    base = Math.max(p.splay.min * scale, m2 * rate);
  } else if (screenType === "panelDoor" || screenType === "panelDoorPanel") {
    const tbl = p[screenType];
    const w = config.w2wMM ?? 0;
    if (w <= tbl.minWidth) base = tbl.min;
    else if (w <= tbl.incrementAbove) {
      const r = Math.ceil(w / 100) * 100;
      base = tbl.table[r as keyof typeof tbl.table] ?? tbl.min;
    } else {
      const extra = Math.ceil((w - tbl.incrementAbove) / 100);
      base =
        tbl.table[tbl.incrementAbove as keyof typeof tbl.table] +
        extra * tbl.increment;
    }
    base *= rateScaleFactor(catalogueRate, options?.pricingRateM2);
  } else if (screenType === "fixedPanel") {
    isFixed = true;
    const fixedBase = calcFixedPanelBase(
      {
        fixedStyle: config.fixedStyle ?? "single",
        fixedPanelReturnStyle: config.fixedPanelReturnStyle,
        panelMM: config.panelMM,
        leftFixedPanelMM: config.leftFixedPanelMM,
        rightFixedPanelMM: config.rightFixedPanelMM,
        w2wMM: config.w2wMM,
        frontMM: config.frontMM,
        returnMM: config.returnMM,
      },
      customerType
    );
    if (fixedBase == null) {
      return { base: 0, colourAdd: 0, doorAdd: 0, exGst: 0, incGst: 0 };
    }
    base =
      fixedBase * rateScaleFactor(catalogueRate, options?.pricingRateM2);
  }

  const cs =
    p.colourSurcharge[config.colour as keyof typeof p.colourSurcharge] ??
    ({ multi: 0, fixed: 0 } as const);
  const colourAdd = isFixed ? cs.fixed : cs.multi;
  let doorAdd = 0;
  if (screenType !== "fixedPanel" && screenType !== "splay") {
    if (config.isSliding) doorAdd = 150;
    else if (config.doorMM === 762) doorAdd = 100;
  } else if (screenType === "fixedPanel" && config.isRadiusCorner) {
    doorAdd = RADIUS_CORNER_EXTRA;
  }
  const fee = Number(options?.perScreenFee);
  const screenFee = Number.isFinite(fee) && fee > 0 ? fee : 0;
  const exGst = applyRetailMarkup(base + colourAdd + doorAdd + screenFee);
  const incGst = Math.round(exGst * 1.1 * 100) / 100;
  return { base, colourAdd, doorAdd, exGst, incGst };
}

/** Retail DIY is supply-only catalogue plus 35%. */
export const RETAIL_PRICE_MARKUP = 1.35;

export function applyRetailMarkup(amount: number) {
  return Math.round(amount * RETAIL_PRICE_MARKUP * 100) / 100;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}
