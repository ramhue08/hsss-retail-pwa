import type { ServiceType } from "@/types/database";

export const REGIONS = [
  "Gold Coast",
  "Brisbane",
  "Ipswich",
  "Toowoomba",
  "Sunshine Coast",
] as const;

export const SERVICE_TYPES: ServiceType[] = [
  "Supply & Install",
  "Supply Only",
];

export const COLOURS = [
  "Chrome",
  "Black",
  "Brushed Nickel",
  "Brushed Brass",
] as const;

export const ANGLE_HEIGHTS = ["21", "42", "60"] as const;
export type AngleHeight = (typeof ANGLE_HEIGHTS)[number];

export const HINGE_SIDES = [
  { value: "left", label: "Hinge off LHS" },
  { value: "right", label: "Hinge off RHS" },
] as const;
export type HingeSide = (typeof HINGE_SIDES)[number]["value"];

export const SWING_DIRECTIONS = [
  { value: "out", label: "Swing out" },
  { value: "in", label: "Swing in" },
] as const;
export type SwingDirection = (typeof SWING_DIRECTIONS)[number]["value"];

export const SIDES = [
  { value: "left", label: "Panel LHS" },
  { value: "right", label: "Panel RHS" },
] as const;
export type Side = (typeof SIDES)[number]["value"];

export const RETURN_SIDES = [
  { value: "left", label: "LH return" },
  { value: "right", label: "RH return" },
] as const;

export const FIXED_STYLES = [
  { value: "single", label: "Single panel" },
  { value: "double", label: "Two panels" },
  { value: "panelReturn", label: "Panel + return" },
] as const;
export type FixedStyle = (typeof FIXED_STYLES)[number]["value"];

export const SIDE_PANEL_PRESETS = [250, 350, 450, 550, 700] as const;

export const AU_STATES = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"] as const;

/** Splay glass panel (long point mm) by wall internal — wall − 490. */
export const SPLAY_GLASS: Record<number, number> = {
  900: 410,
  1000: 510,
  1100: 610,
  1200: 710,
};

/** Cut length (mm) for the panel along this wall — wall − 475. */
export const SPLAY_HOB: Record<number, number> = {
  900: 425,
  1000: 525,
  1100: 625,
  1200: 725,
};

export const SPLAYED_SIZES = [
  { label: "9", internal: 900, cut: SPLAY_HOB[900] },
  { label: "10", internal: 1000, cut: SPLAY_HOB[1000] },
  { label: "11", internal: 1100, cut: SPLAY_HOB[1100] },
  { label: "12", internal: 1200, cut: SPLAY_HOB[1200] },
] as const;

export function splayedGlassForInternal(internal: number): number | null {
  return SPLAY_GLASS[internal] ?? null;
}

export function splayedHobForInternal(internal: number): number | null {
  return SPLAY_HOB[internal] ?? null;
}

/** Panel cut for a stock wall size (shown in builder UI and diagram). */
export function splayedCutForInternal(internal: number): number | null {
  return SPLAY_HOB[internal] ?? null;
}

export type QuickScreenKey =
  | "frontReturn"
  | "frontOnly"
  | "splayed"
  | "fixedPanel";

export const LOCATION_OPTIONS = [
  "Bathroom",
  "Ensuite",
  "Main Bathroom",
  "Guest Bathroom",
  "Powder Room",
  "Other",
] as const;

export const BRAND = {
  navy: "#003A70",
  navyDeep: "#001B3D",
  cyan: "#00AEEF",
  muted: "#5A7D9E",
} as const;

export const HSSS_CONTACTS = [
  {
    name: "Bradley",
    email: "bradley@hsss.net.au",
    phone: "0481 145 924",
    role: "Sales",
  },
  {
    name: "Bruce",
    email: "bruce@hsss.net.au",
    phone: "0404 126 775",
    role: "Sales",
  },
  {
    name: "Sam",
    email: "info@hsss.net.au",
    phone: "0457 296 652",
    role: "Scheduling",
  },
] as const;

export const HSSS_ORDER_EMAIL = "bradley@hsss.net.au";
