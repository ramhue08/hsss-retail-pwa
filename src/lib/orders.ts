import type {
  AngleHeight,
  FixedStyle,
  HingeSide,
  Side,
} from "@/lib/constants";
import { splayedCutForInternal } from "@/lib/constants";
import {
  doorSummaryPart,
  fixedPanelRequiresCustomQuote,
  FRONT_RETURN_STOCK_MAX_MM,
  frontOnlyEffectiveW2w,
  hidePricing,
  resolveLinkedRightPanelMM,
  validateScreenDraft,
} from "@/lib/screen-rules";
import type { FixedPanelReturnStyle, FrontOnlySizeMode } from "@/lib/screen-rules";
import { calcPrice, type PricingOptions, type PriceBreakdown } from "@/lib/pricing";
import {
  resolvePanelsForDraft,
  type PanelsToPick,
} from "@/lib/stock-panels";
import type { ServiceType } from "@/types/database";
import {
  isValidDeliveryPostcode,
  resolveZone,
  type ServiceZone,
} from "@/lib/service-zone";
import type { OrderAttachmentMeta } from "@/lib/order-attachments";

export const SCREEN_TYPES = [
  "Front & Return",
  "Front Only",
  "Splayed",
  "Fixed Panel",
] as const;

export type ScreenType = (typeof SCREEN_TYPES)[number];

export type FrontOnlyStyle = "panelDoor" | "panelDoorPanel";

export type OrderScreenPayload = {
  type: ScreenType;
  colour: string;
  locationLabel: string;
  summary: string;
  priceExGst?: number;
  priceIncGst: number;
  config: Record<string, unknown>;
  /** Resolved stock panels — stored at submit, not recalculated on display. */
  panelsToPick?: PanelsToPick;
};

export type OrderPayload = {
  serviceType: ServiceType;
  delivery: {
    address: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  /** Set server-side from postcode at submit — rough truck routing label. */
  serviceZone?: ServiceZone;
  siteContact: {
    name: string;
    phone: string;
  } | null;
  notes: string | null;
  deliveryDates: {
    hobDate?: string;
    glassDate?: string;
    deliveryDate?: string;
  };
  screens: OrderScreenPayload[];
  /** Builder-uploaded PDFs/images — set server-side after storage upload. */
  attachments?: OrderAttachmentMeta[];
};

/** Validate delivery postcode and stamp truck zone on the payload. */
export function prepareOrderPayload(payload: OrderPayload): {
  payload: OrderPayload;
  serviceZone: ServiceZone;
} | { error: string } {
  const postcode = payload.delivery?.postcode?.trim() ?? "";
  if (!isValidDeliveryPostcode(postcode)) {
    return { error: "Enter a valid 4-digit delivery postcode." };
  }
  const serviceZone = resolveZone(postcode);
  const { attachments: _clientAttachments, ...rest } = payload;
  return {
    serviceZone,
    payload: {
      ...rest,
      delivery: { ...payload.delivery, postcode },
      serviceZone,
    },
  };
}

export type CreateOrderBody = {
  sample?: boolean;
  jobRef?: string;
  payload?: OrderPayload;
};

export function makeReference() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `HSSS-${n}`;
}

export function makeJobRef() {
  return `JOB-${Date.now().toString().slice(-6)}`;
}

export type ScreenDraft = {
  id: string;
  type: ScreenType;
  colour: string;
  locationLabel: string;
  frontMM: string;
  returnMM: string;
  returnSide: Side;
  w2wMM: string;
  wallA: string;
  wallB: string;
  panelMM: string;
  leftFixedPanelMM: string;
  rightFixedPanelMM: string;
  frontOnlyStyle: FrontOnlyStyle | "";
  frontOnlySizeMode: FrontOnlySizeMode | "";
  oversizeMeasurementDate: string;
  roughW2wMM: string;
  panelSide: Side;
  leftPanelMM: string;
  rightPanelMM: string;
  fixedStyle: FixedStyle;
  fixedPanelReturnStyle: FixedPanelReturnStyle;
  customSize: boolean;
  isSliding: boolean;
  isRadiusCorner: boolean;
  doorMM: "662" | "762";
  angleHeight: AngleHeight | "";
  hingeSide: HingeSide | "";
};

export function emptyScreenDraft(): ScreenDraft {
  return {
    id: crypto.randomUUID(),
    type: "Front & Return",
    colour: "Chrome",
    locationLabel: "",
    frontMM: "900",
    returnMM: "900",
    returnSide: "left",
    w2wMM: "1200",
    wallA: "900",
    wallB: "900",
    panelMM: "885",
    leftFixedPanelMM: "335",
    rightFixedPanelMM: "335",
    frontOnlyStyle: "",
    frontOnlySizeMode: "",
    oversizeMeasurementDate: "",
    roughW2wMM: "",
    panelSide: "left",
    leftPanelMM: "350",
    rightPanelMM: "153",
    fixedStyle: "single",
    fixedPanelReturnStyle: "inlineWalkthrough",
    customSize: false,
    isSliding: false,
    isRadiusCorner: false,
    doorMM: "662",
    angleHeight: "",
    hingeSide: "",
  };
}

/**
 * Reset layout/pricing fields when the builder switches screen type so the
 * preview total re-initialises from that type's defaults (keeps id/colour/location).
 */
export function screenDraftForType(
  current: ScreenDraft,
  type: ScreenType
): ScreenDraft {
  const fresh = emptyScreenDraft();
  return {
    ...fresh,
    id: current.id,
    colour: current.colour,
    locationLabel: current.locationLabel,
    type,
    // Front Only needs mode+style before preview can price — start ready-to-price.
    ...(type === "Front Only"
      ? {
          frontOnlySizeMode: "exact" as const,
          frontOnlyStyle: "panelDoor" as const,
        }
      : {}),
  };
}

function hasHingedDoor(draft: ScreenDraft) {
  if (draft.type === "Splayed") return true;
  return (
    (draft.type === "Front & Return" || draft.type === "Front Only") &&
    !draft.isSliding
  );
}

function angleLabel(height: AngleHeight | "") {
  if (!height) return "";
  return `${height}mm angle`;
}

function swingLabel(draft: ScreenDraft) {
  return doorSummaryPart(draft);
}

export function frontOnlyW2w(draft: ScreenDraft): number {
  const effective = frontOnlyEffectiveW2w(draft);
  if (effective) return effective;
  if (draft.frontOnlyStyle === "panelDoorPanel") {
    const left = Number(draft.leftPanelMM) || 0;
    const right = Number(draft.rightPanelMM) || 0;
    const door = draft.isSliding ? 662 : Number(draft.doorMM) || 662;
    return left + door + right;
  }
  return 0;
}

function attachPrices(
  price: PriceBreakdown | null
): Pick<OrderScreenPayload, "priceExGst" | "priceIncGst"> {
  if (!price) return { priceExGst: undefined, priceIncGst: 0 };
  return { priceExGst: price.exGst, priceIncGst: price.incGst };
}

function attachPanelsToPick(
  draft: ScreenDraft,
  payload: OrderScreenPayload
): OrderScreenPayload {
  return {
    ...payload,
    panelsToPick: resolvePanelsForDraft(draft),
  };
}

export function screenDraftToPayload(
  draft: ScreenDraft,
  serviceType: ServiceType,
  options?: { forPreview?: boolean } & PricingOptions
): OrderScreenPayload | { error: string } {
  const validationError = validateScreenDraft(draft, options);
  if (validationError) return { error: validationError };

  const pricing: PricingOptions = {
    pricingRateM2: options?.pricingRateM2,
    perScreenFee: options?.perScreenFee,
  };

  const colour = draft.colour;
  const angleHeight = draft.angleHeight;
  const hingeSide = draft.hingeSide || null;
  const customSize = draft.customSize;
  const customPanel = fixedPanelRequiresCustomQuote(draft);
  const skipPricing = hidePricing(draft);

  if (draft.type === "Front & Return") {
    const frontMM = Number(draft.frontMM);
    const returnMM = Number(draft.returnMM);
    if (!frontMM || !returnMM) return { error: "Enter front and return sizes." };
    const doorMM = draft.isSliding ? undefined : Number(draft.doorMM);
    const price = skipPricing
      ? null
      : calcPrice(
          "frontReturn",
          { frontMM, returnMM, colour, isSliding: draft.isSliding, doorMM },
          serviceType,
          pricing
        );
    const doorPart = draft.isSliding ? "Slide" : swingLabel(draft);
    const ret = draft.returnSide === "left" ? "LH ret" : "RH ret";
    const oversizeLeg =
      frontMM > FRONT_RETURN_STOCK_MAX_MM ||
      returnMM > FRONT_RETURN_STOCK_MAX_MM;
    const customTag = customSize || oversizeLeg ? " custom" : "";
    return attachPanelsToPick(draft, {
      type: draft.type,
      colour,
      locationLabel: draft.locationLabel,
      summary: `F&R ${ret} ${frontMM}×${returnMM} ${doorPart}${customTag} ${angleLabel(angleHeight)} ${colour}`,
      ...attachPrices(price),
      config: {
        frontMM,
        returnMM,
        returnSide: draft.returnSide,
        isSliding: draft.isSliding,
        doorMM: doorMM ?? null,
        angleHeight,
        hingeSide: draft.isSliding ? null : hingeSide,
        customSize,
        customLeg: oversizeLeg,
      },
    });
  }

  if (draft.type === "Front Only") {
    const doorMM = draft.isSliding ? undefined : Number(draft.doorMM);
    const sizeMode = draft.frontOnlySizeMode;
    const oversize = sizeMode === "oversize";
    const oversizeTag = oversize ? " oversize" : "";
    const roughW2wMM = draft.roughW2wMM ? Number(draft.roughW2wMM) : undefined;
    // Oversize follows the same layout workflow as exact, but pricing is held
    // until the exact sheet-to-sheet measurement arrives.
    const skipFoPricing = skipPricing || oversize;

    if (draft.frontOnlyStyle === "panelDoorPanel") {
      const w2wMM = frontOnlyEffectiveW2w(draft);
      if (!w2wMM) {
        return {
          error: oversize
            ? "Enter rough sheet-to-sheet width."
            : "Enter sheet-to-sheet measurement.",
        };
      }
      const leftPanelMM = Number(draft.leftPanelMM);
      const rightPanelMM = resolveLinkedRightPanelMM(draft);
      const price = skipFoPricing
        ? null
        : calcPrice(
            "panelDoorPanel",
            { w2wMM, colour, isSliding: draft.isSliding, doorMM },
            serviceType,
            pricing
          );
      const doorPart = draft.isSliding ? "Slide" : swingLabel(draft);
      return attachPanelsToPick(draft, {
        type: draft.type,
        colour,
        locationLabel: draft.locationLabel,
        summary: `FO L${leftPanelMM}+R${rightPanelMM} ${doorPart}${oversizeTag} ${angleLabel(angleHeight)} ${colour}`,
        ...attachPrices(price),
        config: {
          style: "panelDoorPanel",
          sizeMode,
          leftPanelMM,
          rightPanelMM,
          w2wMM,
          isSliding: draft.isSliding,
          doorMM: doorMM ?? null,
          angleHeight,
          hingeSide: draft.isSliding ? null : hingeSide,
          customSize,
          ...(oversize
            ? {
                oversizeMeasurementDate: draft.oversizeMeasurementDate,
                roughW2wMM: roughW2wMM ?? w2wMM,
              }
            : {}),
        },
      });
    }

    const w2wMM = frontOnlyEffectiveW2w(draft);
    if (!w2wMM) {
      return {
        error: oversize
          ? "Enter rough sheet-to-sheet width."
          : "Enter wall-to-wall size.",
      };
    }
    const price = skipFoPricing
      ? null
      : calcPrice(
          "panelDoor",
          { w2wMM, colour, isSliding: draft.isSliding, doorMM },
          serviceType,
          pricing
        );
    const doorPart = draft.isSliding ? "Slide" : swingLabel(draft);
    const panel = draft.panelSide === "left" ? "panel LHS" : "panel RHS";
    return attachPanelsToPick(draft, {
      type: draft.type,
      colour,
      locationLabel: draft.locationLabel,
      summary: `FO ${panel} ${w2wMM}mm ${doorPart}${oversizeTag} ${angleLabel(angleHeight)} ${colour}`,
      ...attachPrices(price),
      config: {
        style: "panelDoor",
        sizeMode,
        w2wMM,
        panelSide: draft.panelSide,
        isSliding: draft.isSliding,
        doorMM: doorMM ?? null,
        angleHeight,
        hingeSide: draft.isSliding ? null : hingeSide,
        customSize,
        ...(oversize
          ? {
              oversizeMeasurementDate: draft.oversizeMeasurementDate,
              roughW2wMM: roughW2wMM ?? w2wMM,
            }
          : {}),
      },
    });
  }

  if (draft.type === "Splayed") {
    const wallA = Number(draft.wallA);
    const wallB = Number(draft.wallB);
    if (!wallA || !wallB) return { error: "Enter both wall sizes." };
    const cutA = customSize ? null : splayedCutForInternal(wallA);
    const cutB = customSize ? null : splayedCutForInternal(wallB);
    const price = skipPricing
      ? null
      : calcPrice(
          "splay",
          { wallA, wallB, colour, isSliding: false, doorMM: 662 },
          serviceType,
          pricing
        );
    return attachPanelsToPick(draft, {
      type: draft.type,
      colour,
      locationLabel: draft.locationLabel,
      summary: `Splayed ${wallA}×${wallB} door 662 ${swingLabel(draft)}${customSize ? " custom" : ""} ${angleLabel(angleHeight)} ${colour}`,
      ...attachPrices(price),
      config: {
        wallA,
        wallB,
        cutA,
        cutB,
        doorMM: 662,
        angleHeight,
        hingeSide,
        customSize,
      },
    });
  }

  const isDouble = draft.fixedStyle === "double";
  const panelMM = isDouble ? undefined : Number(draft.panelMM);
  const leftFixedPanelMM = isDouble ? Number(draft.leftFixedPanelMM) : undefined;
  const rightFixedPanelMM = isDouble ? Number(draft.rightFixedPanelMM) : undefined;

  if (isDouble) {
    if (!leftFixedPanelMM || !rightFixedPanelMM) {
      return { error: "Enter left and right panel sizes." };
    }
  } else if (!panelMM) {
    return { error: "Enter panel width." };
  }

  const isPanelReturn = draft.fixedStyle === "panelReturn";
  const returnMM = isPanelReturn ? Number(draft.returnMM) : undefined;
  if (isPanelReturn && !returnMM) return { error: "Enter return size." };

  const frontMM = isPanelReturn ? Number(draft.frontMM) : undefined;
  if (isPanelReturn && draft.fixedPanelReturnStyle === "inlineWalkthrough") {
    if (!frontMM) return { error: "Enter front total size." };
    if (frontMM <= (panelMM ?? 0))
      return { error: "Front total must be larger than the fixed panel." };
  }

  const w2wMM = !isPanelReturn ? Number(draft.w2wMM) : undefined;
  if (!isPanelReturn && !w2wMM) return { error: "Enter wall-to-wall size." };

  const pricingPanelMM = isDouble
    ? Math.max(leftFixedPanelMM!, rightFixedPanelMM!)
    : panelMM!;
  const price = skipPricing
    ? null
    : calcPrice(
        "fixedPanel",
        {
          panelMM: pricingPanelMM,
          leftFixedPanelMM,
          rightFixedPanelMM,
          w2wMM,
          frontMM,
          returnMM,
          fixedStyle: draft.fixedStyle,
          fixedPanelReturnStyle: isPanelReturn
            ? draft.fixedPanelReturnStyle
            : undefined,
          colour,
          isSliding: false,
          isRadiusCorner: draft.isRadiusCorner,
          doorMM: 662,
        },
        serviceType,
        pricing
      );

  let summary = "";
  if (draft.fixedStyle === "single") {
    summary = `Fixed ${draft.panelSide === "left" ? "LHS" : "RHS"} ${panelMM}mm ${w2wMM}mm w2w ${angleLabel(angleHeight)} ${colour}`;
  } else if (draft.fixedStyle === "double") {
    summary = `Fixed L${leftFixedPanelMM}+R${rightFixedPanelMM} ${w2wMM}mm w2w ${angleLabel(angleHeight)} ${colour}`;
  } else if (draft.fixedPanelReturnStyle === "singleInReturn") {
    summary = `Fixed return only ${panelMM}mm ${returnMM}mm return ${angleLabel(angleHeight)} ${colour}`;
  } else {
    const walk = frontMM! - (panelMM ?? 0);
    summary = `Fixed + return ${panelMM}×${returnMM} front ${frontMM} walk ${walk} ${angleLabel(angleHeight)} ${colour}`;
  }
  if (draft.isRadiusCorner) summary += " 200mm radius";
  if (customPanel) summary += " custom panel";

  return attachPanelsToPick(draft, {
    type: draft.type,
    colour,
    locationLabel: draft.locationLabel,
    summary,
    ...attachPrices(price),
    config: {
      fixedStyle: draft.fixedStyle,
      fixedPanelReturnStyle: isPanelReturn ? draft.fixedPanelReturnStyle : null,
      panelMM: panelMM ?? null,
      leftFixedPanelMM: leftFixedPanelMM ?? null,
      rightFixedPanelMM: rightFixedPanelMM ?? null,
      panelSide: draft.fixedStyle === "single" ? draft.panelSide : null,
      returnMM: returnMM ?? null,
      returnSide: isPanelReturn ? draft.returnSide : null,
      frontMM: frontMM ?? null,
      w2wMM: w2wMM ?? null,
      angleHeight,
      customSize,
      customPanel,
      isRadiusCorner: draft.isRadiusCorner,
    },
  });
}

export function orderTotal(screens: OrderScreenPayload[]) {
  return screens.reduce((sum, s) => sum + screenPriceExGst(s), 0);
}

function orderScreenSkipsPricing(screen: OrderScreenPayload): boolean {
  if (screen.priceExGst == null) return true;
  const cfg = screen.config;
  if (cfg.customSize === true) return true;
  if (cfg.customLeg === true) return true;
  if (cfg.customPanel === true) return true;
  if (cfg.sizeMode === "oversize") return true;
  return false;
}

/** Recalculate screen prices from stored config (idempotent; applies rate + fee). */
export function repriceOrderScreen(
  screen: OrderScreenPayload,
  serviceType: ServiceType,
  pricing?: PricingOptions
): OrderScreenPayload {
  if (orderScreenSkipsPricing(screen)) return screen;

  const cfg = screen.config;
  const colour = screen.colour;

  if (screen.type === "Front & Return") {
    const price = calcPrice(
      "frontReturn",
      {
        frontMM: Number(cfg.frontMM),
        returnMM: Number(cfg.returnMM),
        colour,
        isSliding: Boolean(cfg.isSliding),
        doorMM: cfg.doorMM != null ? Number(cfg.doorMM) : undefined,
      },
      serviceType,
      pricing
    );
    return { ...screen, priceExGst: price.exGst, priceIncGst: price.incGst };
  }

  if (screen.type === "Front Only") {
    const w2wMM = Number(cfg.w2wMM);
    const doorMM = cfg.doorMM != null ? Number(cfg.doorMM) : undefined;
    const isSliding = Boolean(cfg.isSliding);
    const screenType =
      cfg.style === "panelDoorPanel" ? "panelDoorPanel" : "panelDoor";
    const price = calcPrice(
      screenType,
      { w2wMM, colour, isSliding, doorMM },
      serviceType,
      pricing
    );
    return { ...screen, priceExGst: price.exGst, priceIncGst: price.incGst };
  }

  if (screen.type === "Splayed") {
    const price = calcPrice(
      "splay",
      {
        wallA: Number(cfg.wallA),
        wallB: Number(cfg.wallB),
        colour,
        isSliding: false,
        doorMM: 662,
      },
      serviceType,
      pricing
    );
    return { ...screen, priceExGst: price.exGst, priceIncGst: price.incGst };
  }

  if (screen.type === "Fixed Panel") {
    const fixedStyle = (cfg.fixedStyle ?? "single") as FixedStyle;
    const isPanelReturn = fixedStyle === "panelReturn";
    const isDouble = fixedStyle === "double";
    const panelMM = cfg.panelMM != null ? Number(cfg.panelMM) : undefined;
    const leftFixedPanelMM =
      cfg.leftFixedPanelMM != null ? Number(cfg.leftFixedPanelMM) : undefined;
    const rightFixedPanelMM =
      cfg.rightFixedPanelMM != null ? Number(cfg.rightFixedPanelMM) : undefined;
    const returnMM = cfg.returnMM != null ? Number(cfg.returnMM) : undefined;
    const frontMM = cfg.frontMM != null ? Number(cfg.frontMM) : undefined;
    const w2wMM = cfg.w2wMM != null ? Number(cfg.w2wMM) : undefined;
    const pricingPanelMM = isDouble
      ? Math.max(leftFixedPanelMM!, rightFixedPanelMM!)
      : panelMM!;

    const price = calcPrice(
      "fixedPanel",
      {
        panelMM: pricingPanelMM,
        leftFixedPanelMM,
        rightFixedPanelMM,
        w2wMM,
        frontMM,
        returnMM,
        fixedStyle,
        fixedPanelReturnStyle: isPanelReturn
          ? (cfg.fixedPanelReturnStyle as FixedPanelReturnStyle)
          : undefined,
        colour,
        isSliding: false,
        isRadiusCorner: Boolean(cfg.isRadiusCorner),
        doorMM: 662,
      },
      serviceType,
      pricing
    );
    return { ...screen, priceExGst: price.exGst, priceIncGst: price.incGst };
  }

  return screen;
}

export function repriceOrderScreens(
  screens: OrderScreenPayload[],
  serviceType: ServiceType,
  pricing?: PricingOptions
): OrderScreenPayload[] {
  return screens.map((s) => repriceOrderScreen(s, serviceType, pricing));
}

export function applyBuilderPricingToOrderPayload(
  payload: OrderPayload,
  pricing?: PricingOptions
): OrderPayload {
  return {
    ...payload,
    screens: repriceOrderScreens(
      payload.screens,
      payload.serviceType,
      pricing
    ),
  };
}

export function screenPriceExGst(screen: {
  priceExGst?: number;
  priceIncGst?: number;
}) {
  if (typeof screen.priceExGst === "number") return screen.priceExGst;
  if (typeof screen.priceIncGst === "number")
    return Math.round((screen.priceIncGst / 1.1) * 100) / 100;
  return 0;
}

export type InitialOrderData = {
  jobRef?: string;
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  notes?: string;
  siteContactName?: string;
  siteContactPhone?: string;
  hobDate?: string;
  glassDate?: string;
  deliveryDate?: string;
  screens?: ScreenDraft[];
};

function parseAngleHeight(value: unknown): AngleHeight | "" {
  if (value === "21" || value === "42" || value === "60") return value;
  return "";
}

function parseSide(value: unknown): Side {
  return value === "right" ? "right" : "left";
}

function parseHingeSide(value: unknown): HingeSide | "" {
  if (value === "left" || value === "right") return value;
  return "";
}

function parseFixedStyle(value: unknown): FixedStyle {
  if (value === "double" || value === "panelReturn") return value;
  return "single";
}

function parseFrontOnlySizeMode(value: unknown): FrontOnlySizeMode | "" {
  if (value === "exact" || value === "oversize") return value;
  return "";
}

function parseFixedPanelReturnStyle(value: unknown): FixedPanelReturnStyle {
  return value === "singleInReturn" ? "singleInReturn" : "inlineWalkthrough";
}

export function screenPayloadToDraft(screen: OrderScreenPayload): ScreenDraft {
  const draft = emptyScreenDraft();
  draft.type = screen.type;
  draft.colour = screen.colour;
  draft.locationLabel = screen.locationLabel;
  const config = screen.config;

  draft.angleHeight = parseAngleHeight(config.angleHeight);
  draft.hingeSide = parseHingeSide(config.hingeSide);
  draft.returnSide = parseSide(config.returnSide);
  draft.panelSide = parseSide(config.panelSide);
  draft.customSize = Boolean(config.customSize);
  draft.frontOnlySizeMode = parseFrontOnlySizeMode(config.sizeMode);
  draft.oversizeMeasurementDate = String(config.oversizeMeasurementDate ?? "");
  draft.roughW2wMM = config.roughW2wMM != null ? String(config.roughW2wMM) : "";
  draft.fixedPanelReturnStyle = parseFixedPanelReturnStyle(
    config.fixedPanelReturnStyle
  );

  if (screen.type === "Front & Return") {
    draft.frontMM = String(config.frontMM ?? 900);
    draft.returnMM = String(config.returnMM ?? 900);
    draft.isSliding = Boolean(config.isSliding);
    if (config.doorMM === 762) draft.doorMM = "762";
  } else if (screen.type === "Front Only") {
    draft.frontOnlyStyle =
      config.style === "panelDoorPanel"
        ? "panelDoorPanel"
        : config.style === "panelDoor"
          ? "panelDoor"
          : "";
    draft.w2wMM = String(config.w2wMM ?? "");
    draft.leftPanelMM = String(config.leftPanelMM ?? 350);
    draft.rightPanelMM = String(config.rightPanelMM ?? 550);
    draft.isSliding = Boolean(config.isSliding);
    if (config.doorMM === 762) draft.doorMM = "762";
  } else if (screen.type === "Splayed") {
    draft.wallA = String(config.wallA ?? 900);
    draft.wallB = String(config.wallB ?? 900);
  } else {
    draft.fixedStyle = parseFixedStyle(config.fixedStyle);
    draft.panelMM = String(config.panelMM ?? 900);
    draft.leftFixedPanelMM = String(config.leftFixedPanelMM ?? 350);
    draft.rightFixedPanelMM = String(config.rightFixedPanelMM ?? 350);
    draft.w2wMM = String(config.w2wMM ?? 1200);
    draft.isRadiusCorner = Boolean(config.isRadiusCorner);
    if (config.frontMM != null) draft.frontMM = String(config.frontMM);
    if (config.returnMM != null) draft.returnMM = String(config.returnMM);
  }

  return draft;
}
