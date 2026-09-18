/**
 * Stock glass panel resolver — standalone, no UI deps.
 * Resolves calculated panel sizes to stock widths for AroFlo picking.
 * Spec: HSSS Builder App — Stock Panel Resolver (Rev 3).
 */

import { SPLAY_GLASS, SPLAY_HOB } from "@/lib/constants";
import type { OrderScreenPayload, ScreenDraft } from "@/lib/orders";

/** Standard fixed / front / return stock panel widths (mm). */
export const STOCK_GLASS_PANELS = [
  85, 105, 135, 153, 169, 185, 203, 219, 235, 253, 269, 285, 303, 335, 353,
  385, 403, 435, 453, 485, 503, 535, 553, 585, 603, 635, 653, 685, 703, 735,
  753, 785, 803, 835, 885, 935, 985, 1035, 1085, 1135, 1185, 1235, 1285, 1335,
  1385, 1435, 1485,
] as const;

export const SMALLEST_STOCK_PANEL_MM = STOCK_GLASS_PANELS[0];

export { SPLAY_GLASS, SPLAY_HOB } from "@/lib/constants";

/** Hob length minus this offset is the return glass panel (same as Front & Return). */
export const HOB_TO_PANEL_OFFSET_MM = 15;

export function returnPanelFromHob(hobMM: number) {
  const hob = Number(hobMM);
  if (!Number.isFinite(hob) || hob <= 0) return 0;
  return hob - HOB_TO_PANEL_OFFSET_MM;
}

export const DOOR_DEDUCT = { 662: 697, 762: 797 } as const;

export const MIN_OPENING = {
  frontReturn: { 662: 800, 762: 900 },
  panelDoor: { 662: 785, 762: 885 },
  panelDoorPanel: { 662: 865, 762: 965 },
} as const;

export type DoorWidthMM = 662 | 762;

export type ResolvedPanel = {
  label: string;
  colour: string;
  size?: number;
  calc?: number;
  delta?: number;
  isStock?: boolean;
  note?: string;
  flag?: boolean;
  block?: boolean;
  reason?: string;
  hob?: number;
};

export type PanelFlagLog = {
  screenIndex?: number;
  label?: string;
  calc?: number;
  nearest?: number;
  delta?: number;
  reason: string;
};

export type PanelsToPick = {
  panels: ResolvedPanel[];
  hobCuts?: { A: number; B: number };
  flags: PanelFlagLog[];
  blocked?: { reason: string; calc?: number };
};

export function nearestStock(mm: number): number {
  return STOCK_GLASS_PANELS.reduce((a, b) =>
    Math.abs(b - mm) < Math.abs(a - mm) ? b : a
  );
}

export function isStockGlassPanel(mm: number): boolean {
  return (STOCK_GLASS_PANELS as readonly number[]).includes(mm);
}

export function doorDeduction(doorMM: DoorWidthMM | "662" | "762"): number {
  return String(doorMM) === "762" ? DOOR_DEDUCT[762] : DOOR_DEDUCT[662];
}

export function frontOnlyMinOpening(
  layout: "panelDoor" | "panelDoorPanel",
  doorMM: DoorWidthMM | "662" | "762"
): number {
  const key = String(doorMM) === "762" ? 762 : 662;
  return MIN_OPENING[layout][key];
}

export function frontReturnMinFront(
  doorMM: DoorWidthMM | "662" | "762"
): number {
  const key = String(doorMM) === "762" ? 762 : 662;
  return MIN_OPENING.frontReturn[key];
}

function resolve(
  calc: number,
  tol: number,
  label: string,
  colour: string,
  options?: { custom?: boolean; noSnap?: boolean }
): ResolvedPanel {
  if (calc < SMALLEST_STOCK_PANEL_MM) {
    return {
      label,
      colour,
      block: true,
      calc,
      reason: "below smallest stock panel",
    };
  }

  if (options?.custom || options?.noSnap) {
    return {
      label,
      colour,
      size: calc,
      calc,
      isStock: false,
      flag: true,
      reason: options?.custom
        ? "custom size — exact cut"
        : `outside ±${tol} tolerance`,
    };
  }

  const stock = nearestStock(calc);
  const delta = stock - calc;
  if (Math.abs(delta) <= tol) {
    return {
      label,
      colour,
      size: stock,
      calc,
      delta,
      isStock: true,
    };
  }

  return {
    label,
    colour,
    size: calc,
    calc,
    isStock: false,
    flag: true,
    reason: `outside ±${tol} tolerance`,
  };
}

function sliderPending(colour: string): PanelsToPick {
  return {
    panels: [
      {
        label: "slider",
        colour,
        flag: true,
        reason: "slider — office to calculate panels",
      },
    ],
    flags: [{ reason: "slider — office to calculate panels" }],
  };
}

function collectFlags(
  panels: ResolvedPanel[],
  extra: PanelFlagLog[] = []
): PanelFlagLog[] {
  const fromPanels: PanelFlagLog[] = panels
    .filter((p) => p.flag || p.block)
    .map((p) => ({
      label: p.label,
      calc: p.calc,
      nearest:
        p.calc != null && !p.block ? nearestStock(p.calc) : undefined,
      delta:
        p.calc != null && !p.block
          ? nearestStock(p.calc) - p.calc
          : undefined,
      reason: p.reason ?? "flagged",
    }));
  return [...fromPanels, ...extra];
}

function firstBlock(panels: ResolvedPanel[]): PanelsToPick["blocked"] {
  const blocked = panels.find((p) => p.block);
  if (!blocked) return undefined;
  return {
    reason: blocked.reason ?? "below smallest stock panel",
    calc: blocked.calc,
  };
}

export function frontReturnPanels(input: {
  frontMM: number;
  returnMM: number;
  doorMM: DoorWidthMM | "662" | "762";
  isSliding?: boolean;
  colour: string;
  customSize?: boolean;
}): PanelsToPick {
  const { frontMM, returnMM, doorMM, colour, customSize } = input;
  if (input.isSliding) return sliderPending(colour);

  const door = Number(doorMM) === 762 ? 762 : 662;
  const panels: ResolvedPanel[] = [
    resolve(returnMM - 15, 15, "return panel", colour, { custom: customSize }),
    resolve(frontMM - doorDeduction(door), 15, "front panel", colour, {
      custom: customSize,
    }),
    { label: "door", colour, size: door, isStock: true },
  ];
  return {
    panels,
    flags: collectFlags(panels),
    blocked: firstBlock(panels),
  };
}

export function frontOnlyPanels(input: {
  layout: "panelDoor" | "panelDoorPanel";
  s2sMM: number;
  doorMM: DoorWidthMM | "662" | "762";
  chosenPanel?: number;
  isSliding?: boolean;
  colour: string;
  customSize?: boolean;
}): PanelsToPick {
  const { layout, s2sMM, colour, customSize } = input;
  if (input.isSliding) return sliderPending(colour);

  const door = Number(input.doorMM) === 762 ? 762 : 662;
  const total = s2sMM - doorDeduction(door);
  const doorLine: ResolvedPanel = {
    label: "door",
    colour,
    size: door,
    isStock: true,
  };

  if (layout === "panelDoor") {
    const panels = [
      resolve(total, 5, "panel", colour, { custom: customSize }),
      doorLine,
    ];
    return {
      panels,
      flags: collectFlags(panels),
      blocked: firstBlock(panels),
    };
  }

  const chosen = input.chosenPanel ?? nearestStock(total / 2);
  const balance = total - chosen;
  const panels: ResolvedPanel[] = [
    {
      label: "panel",
      colour,
      size: chosen,
      isStock: isStockGlassPanel(chosen) || !customSize,
      ...(customSize && !isStockGlassPanel(chosen)
        ? { flag: true, reason: "custom size — exact cut", calc: chosen }
        : {}),
    },
    doorLine,
    resolve(balance, 15, "panel", colour, { custom: customSize }),
  ];
  return {
    panels,
    flags: collectFlags(panels),
    blocked: firstBlock(panels),
  };
}

export function splayedPanels(input: {
  wallA: number;
  wallB: number;
  colour: string;
  customSize?: boolean;
}): PanelsToPick {
  const { wallA, wallB, colour, customSize } = input;

  function glassFor(wall: number): ResolvedPanel {
    const stock = SPLAY_GLASS[wall];
    if (stock != null && !customSize) {
      return {
        label: "splay panel",
        colour,
        size: stock,
        note: "long point",
        isStock: true,
      };
    }
    const calc = wall - 490;
    return {
      label: "splay panel",
      colour,
      size: calc,
      calc,
      note: "long point",
      isStock: false,
      flag: true,
      reason: customSize
        ? "custom size — exact cut"
        : "non-stock splay wall",
    };
  }

  const hobA = SPLAY_HOB[wallA] ?? wallA - 475;
  const hobB = SPLAY_HOB[wallB] ?? wallB - 475;
  const panels = [
    glassFor(wallA),
    glassFor(wallB),
    { label: "door", colour, size: 662, isStock: true },
  ];
  return {
    panels,
    hobCuts: { A: hobA, B: hobB },
    flags: collectFlags(panels),
    blocked: firstBlock(panels),
  };
}

/** Builder picks the panel — output the hob to build for it. */
export function fixedPanels(input: {
  chosenPanels: number[];
  colour: string;
  isRadiusCorner?: boolean;
  customSize?: boolean;
}): PanelsToPick {
  const { colour, isRadiusCorner, customSize } = input;
  const panels: ResolvedPanel[] = input.chosenPanels.map((p) => {
    const radiusStock = [885, 985, 1185].includes(p);
    if (customSize) {
      return {
        label: "fixed panel",
        colour,
        size: p,
        calc: p,
        hob: p + 15,
        isStock: false,
        flag: true,
        reason: "custom size — exact cut",
      };
    }
    if (isRadiusCorner && !radiusStock) {
      return {
        label: "fixed panel",
        colour,
        size: p,
        calc: p,
        hob: p + 15,
        isStock: false,
        flag: true,
        reason: "non-stock radius — additional lead time",
      };
    }
    return {
      label: "fixed panel",
      colour,
      size: p,
      hob: p + 15,
      isStock: true,
    };
  });
  return {
    panels,
    flags: collectFlags(panels),
    blocked: firstBlock(panels),
  };
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Resolve panels for a ScreenDraft (pre-submit). */
export function resolvePanelsForDraft(draft: ScreenDraft): PanelsToPick {
  const colour = draft.colour || "Chrome";
  const customSize = draft.customSize;

  if (draft.type === "Front & Return") {
    return frontReturnPanels({
      frontMM: num(draft.frontMM),
      returnMM: num(draft.returnMM),
      doorMM: draft.doorMM,
      isSliding: draft.isSliding,
      colour,
      customSize,
    });
  }

  if (draft.type === "Front Only") {
    const s2s =
      draft.frontOnlySizeMode === "oversize"
        ? num(draft.roughW2wMM)
        : num(draft.w2wMM);
    const layout =
      draft.frontOnlyStyle === "panelDoorPanel" ? "panelDoorPanel" : "panelDoor";
    return frontOnlyPanels({
      layout,
      s2sMM: s2s,
      doorMM: draft.doorMM,
      chosenPanel: num(draft.leftPanelMM) || undefined,
      isSliding: draft.isSliding,
      colour,
      customSize,
    });
  }

  if (draft.type === "Splayed") {
    return splayedPanels({
      wallA: num(draft.wallA),
      wallB: num(draft.wallB),
      colour,
      customSize,
    });
  }

  // Fixed Panel
  const chosen: number[] = [];
  if (draft.fixedStyle === "double") {
    chosen.push(num(draft.leftFixedPanelMM), num(draft.rightFixedPanelMM));
  } else if (draft.fixedStyle === "panelReturn") {
    chosen.push(returnPanelFromHob(num(draft.returnMM)));
    if (draft.fixedPanelReturnStyle === "inlineWalkthrough") {
      chosen.push(num(draft.panelMM));
    }
  } else {
    chosen.push(num(draft.panelMM));
  }

  return fixedPanels({
    chosenPanels: chosen.filter((n) => n > 0),
    colour,
    isRadiusCorner: draft.isRadiusCorner,
    customSize,
  });
}

/** Resolve from a stored order screen payload (config + colour). */
export function resolvePanelsForPayload(
  screen: OrderScreenPayload
): PanelsToPick {
  // Prefer stored result so historical orders don't rewrite
  const stored = screen.panelsToPick as PanelsToPick | undefined;
  if (stored && Array.isArray(stored.panels)) return stored;

  const config = screen.config ?? {};
  const colour = screen.colour || "Chrome";
  const customSize = Boolean(config.customSize);

  if (screen.type === "Front & Return") {
    return frontReturnPanels({
      frontMM: num(config.frontMM),
      returnMM: num(config.returnMM),
      doorMM: (num(config.doorMM) === 762 ? 762 : 662) as DoorWidthMM,
      isSliding: Boolean(config.isSliding),
      colour,
      customSize,
    });
  }

  if (screen.type === "Front Only") {
    const layout =
      config.style === "panelDoorPanel" ? "panelDoorPanel" : "panelDoor";
    return frontOnlyPanels({
      layout,
      s2sMM: num(config.w2wMM),
      doorMM: (num(config.doorMM) === 762 ? 762 : 662) as DoorWidthMM,
      chosenPanel: num(config.leftPanelMM) || undefined,
      isSliding: Boolean(config.isSliding),
      colour,
      customSize,
    });
  }

  if (screen.type === "Splayed") {
    return splayedPanels({
      wallA: num(config.wallA),
      wallB: num(config.wallB),
      colour,
      customSize,
    });
  }

  const chosen: number[] = [];
  if (config.fixedStyle === "double") {
    chosen.push(num(config.leftFixedPanelMM), num(config.rightFixedPanelMM));
  } else if (config.fixedStyle === "panelReturn") {
    const returnHob = num(config.returnHobMM) || num(config.returnMM);
    chosen.push(
      num(config.returnPanelMM) || returnPanelFromHob(returnHob)
    );
    if (config.fixedPanelReturnStyle === "inlineWalkthrough") {
      chosen.push(num(config.frontPanelMM) || num(config.panelMM));
    }
  } else {
    chosen.push(num(config.panelMM));
  }

  return fixedPanels({
    chosenPanels: chosen.filter((n) => n > 0),
    colour,
    isRadiusCorner: Boolean(config.isRadiusCorner),
    customSize,
  });
}

type ConsolidatedLine = {
  qty: number;
  panel: ResolvedPanel;
};

function consolidatePanels(panels: ResolvedPanel[]): ConsolidatedLine[] {
  const map = new Map<string, ConsolidatedLine>();
  for (const panel of panels) {
    const key = [
      panel.label,
      panel.size ?? "",
      panel.colour,
      panel.note ?? "",
      panel.flag ? "1" : "0",
      panel.block ? "1" : "0",
      panel.reason ?? "",
      panel.calc ?? "",
      panel.delta ?? "",
      panel.hob ?? "",
    ].join("|");
    const existing = map.get(key);
    if (existing) existing.qty += 1;
    else map.set(key, { qty: 1, panel });
  }
  return [...map.values()];
}

function formatDelta(delta: number | undefined, calc: number | undefined) {
  if (delta == null || calc == null || delta === 0) return "";
  const signed = delta > 0 ? `+${delta}` : `${delta}`;
  return `  (calc ${calc}, ${signed})`;
}

function formatPanelLine(qty: number, panel: ResolvedPanel): string {
  if (panel.flag && panel.reason?.startsWith("slider")) {
    return `⚠ HSSS to confirm — slider · office to calculate panels`;
  }
  if (panel.block) {
    return `⚠ ${panel.label}  blocked  ${panel.calc ?? ""}  · ${panel.reason}`;
  }
  if (panel.flag && !panel.isStock) {
    return `⚠ ${panel.label}  exact cut ${panel.calc ?? panel.size ?? ""}  · ${panel.reason} · office to confirm`;
  }
  const size = panel.size ?? panel.calc ?? "";
  const note = panel.note ? ` · ${panel.note}` : "";
  const delta = formatDelta(panel.delta, panel.calc);
  return `${qty} ×  ${size}  ${panel.label} · ${panel.colour}${note}${delta}`;
}

/** Human-readable lines for email / admin (includes header). */
export function formatPanelsToPickBlock(
  result: PanelsToPick,
  options?: { includeHeader?: boolean }
): string[] {
  const lines: string[] = [];
  if (options?.includeHeader !== false) lines.push("Panels to pick");

  for (const { qty, panel } of consolidatePanels(result.panels)) {
    lines.push(formatPanelLine(qty, panel));
  }

  if (result.hobCuts) {
    lines.push(
      `Hob cuts: A ${result.hobCuts.A} · B ${result.hobCuts.B}`
    );
  } else {
    const hobs = result.panels
      .filter((p) => p.hob != null && p.isStock !== false)
      .map((p) => p.hob);
    // Fixed: one hob line per panel, or consolidated when identical
    const fixedHobs = result.panels.filter((p) => p.hob != null);
    if (fixedHobs.length === 1 && fixedHobs[0].hob != null) {
      lines.push(`Hob: ${fixedHobs[0].hob}`);
    } else if (fixedHobs.length > 1) {
      fixedHobs.forEach((p, i) => {
        if (p.hob != null) lines.push(`Hob ${i + 1}: ${p.hob}`);
      });
    } else if (hobs.length === 1) {
      lines.push(`Hob: ${hobs[0]}`);
    }
  }

  return lines;
}

export function formatPanelsToPickText(result: PanelsToPick): string {
  return formatPanelsToPickBlock(result).join("\n");
}

export function formatPanelsToPickHtml(
  result: PanelsToPick,
  escapeHtml: (s: string) => string
): string {
  const lines = formatPanelsToPickBlock(result);
  if (lines.length <= 1) return "";
  const [header, ...body] = lines;
  const bodyHtml = body
    .map((line) => {
      const isFlag = line.startsWith("⚠");
      const style = isFlag
        ? "margin:2px 0;padding:4px 8px;background:#FFEDD5;border-radius:4px;color:#C2410C;font-size:13px;font-weight:600;"
        : "margin:2px 0;font-size:13px;color:#0f172a;font-family:ui-monospace,Menlo,Consolas,monospace;";
      return `<div style="${style}">${escapeHtml(line)}</div>`;
    })
    .join("");
  return `<div style="margin-top:12px;padding:10px 12px;background:#F8FAFC;border:1px solid #e2e8f0;border-radius:6px;">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#003A70;margin-bottom:6px;">${escapeHtml(header)}</div>
    ${bodyHtml}
  </div>`;
}
