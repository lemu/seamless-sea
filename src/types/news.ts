export type ImpactLevel = "high" | "medium" | "low";

export const NEWS_CATEGORIES = [
  "Geopolitics & Security",
  "Trade Flows & Commodity Markets",
  "Freight Market Movements",
  "Port & Canal Disruptions",
  "Regulation & Compliance",
  "Weather & Natural Events",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const VESSEL_TYPES = [
  "Tankers",
  "Dry Bulk",
  "Containers",
  "LNG",
  "Gas Carriers",
  "MPP",
] as const;

export type VesselType = (typeof VESSEL_TYPES)[number];

export const NEWS_REGIONS = [
  "Middle East",
  "Asia Pacific",
  "Europe",
  "Americas",
  "Africa",
  "Arctic",
  "Global",
] as const;

export type NewsRegion = (typeof NEWS_REGIONS)[number];

export interface NewsFilters {
  impactLevel: ImpactLevel | "";
  category: string;
  vesselType: string;
  region: string;
}
