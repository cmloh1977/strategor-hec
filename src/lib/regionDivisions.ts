// ── Region & Division Constants ──
// Source: Toyota Tsusho Integrated Report 2025

export const REGIONS = [
  "Japan",
  "North America",
  "South America",
  "Europe",
  "Africa",
  "East Asia",
  "Asia Pacific",
  "Middle East & Central Asia",
] as const;

export type Region = (typeof REGIONS)[number];

// TTC Divisions (non-Africa regions)
export const TTC_DIVISIONS = [
  "Metal+ (Plus) Division",
  "Circular Economy Division",
  "Supply Chain Division",
  "Mobility Division",
  "Green Infrastructure Division",
  "Digital Solutions Division",
  "Lifestyle Division",
  "Africa Division",
  "Corporate",
] as const;

// CFAO Business Lines (Africa region)
// Source: CFAO Group structure
export const CFAO_DIVISIONS = [
  "CFAO Mobility",
  "CFAO Healthcare",
  "CFAO Green Infrastructure",
  "CFAO Consumer",
  "CFAO Corporate",
] as const;

export type Division = (typeof TTC_DIVISIONS)[number] | (typeof CFAO_DIVISIONS)[number];

export function getDivisionsForRegion(region: Region | string): readonly string[] {
  if (region === "Africa") return CFAO_DIVISIONS;
  return TTC_DIVISIONS;
}
