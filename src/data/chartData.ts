// Mock data for Trade Desk insights charts

export interface FreightRateData {
  date: string;
  rate: number;
  previousRate?: number;
}

export interface CargoDemandData {
  month: string;
  demand: number;
  category: string;
}

export interface VesselSupplyData {
  month: string;
  available: number;
  utilized: number;
  utilization: number;
}

// Freight Rate data - Line chart showing rate trends over last 8 months
export const freightRateData: FreightRateData[] = [
  { date: "Oct 1", rate: 42, previousRate: 38 },
  { date: "Oct 15", rate: 45, previousRate: 42 },
  { date: "Nov 1", rate: 48, previousRate: 45 },
  { date: "Nov 15", rate: 44, previousRate: 48 },
  { date: "Dec 1", rate: 47, previousRate: 44 },
  { date: "Dec 15", rate: 52, previousRate: 47 },
  { date: "Jan 1", rate: 49, previousRate: 52 },
  { date: "Jan 15", rate: 46, previousRate: 49 },
  { date: "Feb 1", rate: 43, previousRate: 46 },
];

// Cargo Demand data - Bar chart showing monthly cargo volume
export const cargoDemandData: CargoDemandData[] = [
  { month: "Jul", demand: 280, category: "Crude Oil" },
  { month: "Aug", demand: 320, category: "Crude Oil" },
  { month: "Sep", demand: 295, category: "Crude Oil" },
  { month: "Oct", demand: 340, category: "Crude Oil" },
  { month: "Nov", demand: 310, category: "Crude Oil" },
  { month: "Dec", demand: 360, category: "Crude Oil" },
  { month: "Jan", demand: 330, category: "Crude Oil" },
  { month: "Feb", demand: 315, category: "Crude Oil" },
];

// Vessel Supply data - Combo chart with available vessels (bars) and utilization (line)
export const vesselSupplyData: VesselSupplyData[] = [
  { month: "Jul", available: 45, utilized: 38, utilization: 84 },
  { month: "Aug", available: 48, utilized: 42, utilization: 88 },
  { month: "Sep", available: 46, utilized: 39, utilization: 85 },
  { month: "Oct", available: 50, utilized: 45, utilization: 90 },
  { month: "Nov", available: 52, utilized: 44, utilization: 85 },
  { month: "Dec", available: 55, utilized: 48, utilization: 87 },
  { month: "Jan", available: 53, utilized: 46, utilization: 87 },
  { month: "Feb", available: 51, utilized: 43, utilization: 84 },
];

// Helper function to get chart colors that match the Figma design
export const chartColors = {
  primary: "#0078F0", // Blue from Figma design
  secondary: "#87CEEB", // Light blue
  success: "#00B04F", // Green
  warning: "#FF9500", // Orange
  danger: "#FF3B30", // Red
  neutral: "#8E8E93", // Gray
  background: "#F8F9FA", // Light background
};