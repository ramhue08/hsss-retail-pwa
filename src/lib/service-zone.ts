/**
 * Delivery service zone from postcode — NORTH / SOUTH truck routing label.
 * Pure function; ranges are static (see spec 31 July 2026).
 */

export type ServiceZone = "NORTH" | "SOUTH" | "REVIEW";

const HARD_OVERRIDES: Record<number, ServiceZone> = {
  4025: "REVIEW", // Moreton Island
  4183: "REVIEW", // Southern Moreton Bay Islands — barge access
  4068: "NORTH", // Chelmer — south bank but stays on north truck
};

const NORTH_RANGES: [number, number][] = [
  [4000, 4037],
  [4051, 4072],
  [4500, 4521],
  [4550, 4575],
];

const SOUTH_RANGES: [number, number][] = [
  [4073, 4078],
  [4101, 4133],
  [4151, 4179],
  [4205, 4230],
  [4270, 4285],
  [4300, 4306],
  [4340, 4362],
];

function inAnyRange(n: number, ranges: [number, number][]): boolean {
  return ranges.some(([lo, hi]) => n >= lo && n <= hi);
}

/** Resolve truck zone from a 4-digit delivery postcode. */
export function resolveZone(postcode: string | number): ServiceZone {
  const raw = String(postcode).trim();
  if (!/^\d{4}$/.test(raw)) return "REVIEW";
  const n = Number(raw);

  const override = HARD_OVERRIDES[n];
  if (override) return override;

  if (inAnyRange(n, NORTH_RANGES)) return "NORTH";
  if (inAnyRange(n, SOUTH_RANGES)) return "SOUTH";

  return "REVIEW";
}

export function isValidDeliveryPostcode(postcode: string): boolean {
  return /^\d{4}$/.test(postcode.trim());
}

/** Label for order emails — REVIEW is flagged for office. */
export function formatServiceZoneForEmail(zone: ServiceZone): string {
  if (zone === "REVIEW") return "REVIEW — ZONE UNKNOWN";
  return zone;
}

export function serviceZoneSubjectPrefix(zone: ServiceZone): string {
  return `[${zone}]`;
}
