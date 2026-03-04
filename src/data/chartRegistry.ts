/**
 * Chart Registry — static map of all "add-to-boardable" charts across the app.
 * Each entry describes a chart that can be added as a board widget.
 */

export type ChartSection =
  | "vessel_report"
  | "global_market_supply"
  | "global_market_freight"
  | "global_market_commodities"
  | "newsroom";

export interface FilterField {
  key: string;
  label: string;
  type: "dateRange" | "select" | "multiSelect" | "text";
  options?: Array<{ value: string; label: string }>;
}

export interface ChartRegistryEntry {
  id: string;
  label: string;
  section: ChartSection;
  tab?: string;
  entityType?: "vessel" | "route" | "commodity";
  defaultChartType: "bar" | "line" | "composed" | "timeseries";
  defaultSize: { w: number; h: number };
  filterSchema: FilterField[];
}

export const chartRegistry: ChartRegistryEntry[] = [
  {
    id: "vessel_report.utilization.laden_ballast_monthly",
    label: "Laden vs Ballast Days & Cargo — Monthly",
    section: "vessel_report",
    tab: "utilization",
    entityType: "vessel",
    defaultChartType: "timeseries",
    defaultSize: { w: 6, h: 2 },
    filterSchema: [
      {
        key: "dateRange",
        label: "Date range",
        type: "dateRange",
      },
    ],
  },
  {
    id: "vessel_report.utilization.voyage_summary",
    label: "Voyage Summary",
    section: "vessel_report",
    tab: "utilization",
    entityType: "vessel",
    defaultChartType: "bar",
    defaultSize: { w: 6, h: 2 },
    filterSchema: [
      {
        key: "dateRange",
        label: "Date range",
        type: "dateRange",
      },
    ],
  },
  {
    id: "vessel_report.speed.draft_over_time",
    label: "Speed & Draft Over Time — 12 Weeks",
    section: "vessel_report",
    tab: "speed-performance",
    entityType: "vessel",
    defaultChartType: "timeseries",
    defaultSize: { w: 3, h: 2 },
    filterSchema: [
      {
        key: "dateRange",
        label: "Date range",
        type: "dateRange",
      },
    ],
  },
  {
    id: "vessel_report.speed.distribution",
    label: "Speed Distribution & Bunker Consumption",
    section: "vessel_report",
    tab: "speed-performance",
    entityType: "vessel",
    defaultChartType: "composed",
    defaultSize: { w: 3, h: 2 },
    filterSchema: [],
  },
  {
    id: "global_market.freight.rate_history",
    label: "Freight Rate History",
    section: "global_market_freight",
    defaultChartType: "timeseries",
    defaultSize: { w: 6, h: 2 },
    filterSchema: [
      {
        key: "dateRange",
        label: "Date range",
        type: "dateRange",
      },
      {
        key: "route",
        label: "Route",
        type: "select",
      },
    ],
  },
  {
    id: "global_market.supply.fleet_size",
    label: "Fleet Size Over Time",
    section: "global_market_supply",
    defaultChartType: "timeseries",
    defaultSize: { w: 6, h: 2 },
    filterSchema: [
      {
        key: "dateRange",
        label: "Date range",
        type: "dateRange",
      },
    ],
  },
  {
    id: "global_market.commodities.volumes",
    label: "Commodity Volumes",
    section: "global_market_commodities",
    defaultChartType: "bar",
    defaultSize: { w: 6, h: 2 },
    filterSchema: [
      {
        key: "commodity",
        label: "Commodity",
        type: "multiSelect",
      },
    ],
  },
];

export function getChartById(id: string): ChartRegistryEntry | undefined {
  return chartRegistry.find((entry) => entry.id === id);
}
