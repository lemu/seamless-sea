export interface Desk {
  name: string;
  sigil: string;
  color: string;
  filters: {
    route?: string;
    class?: string;
    sector?: string;
    commodity?: string;
  };
  lockedKeys: {
    supply: string[];
    commodities: string[];
    freight: string[];
  };
}

export const DESKS: Desk[] = [
  {
    name: "C5 · Panamax",
    sigil: "C5",
    color: "#0969da",
    filters: { route: "C5", class: "Panamax", sector: "Dry Bulk" },
    lockedKeys: { supply: ["class"], commodities: [], freight: ["route", "class", "sector"] },
  },
  {
    name: "C3 · Capesize",
    sigil: "C3",
    color: "#6e40c9",
    filters: { route: "C3", class: "Capesize", sector: "Dry Bulk" },
    lockedKeys: { supply: ["class"], commodities: [], freight: ["route", "class", "sector"] },
  },
  {
    name: "Iron Ore Pacific",
    sigil: "IO",
    color: "#b08800",
    filters: { route: "C5", class: "VLOC", sector: "Dry Bulk", commodity: "Iron Ore" },
    lockedKeys: { supply: ["class"], commodities: [], freight: ["route", "class", "sector"] },
  },
];

export const DESK_KPI = {
  0: {
    supply:      { vessels: 312, tonnage: "24.1M", ballasting: 88, laden: 224 },
    commodities: { exportVol: "143Mt", voyages: 1840, inTransit: 312, tonneMiles: "1.2Tt" },
    freight:     { c5: 8.45, c3: null as number | null, bci: 2140, bpi: 1620, tc: 14200 },
  },
  1: {
    supply:      { vessels: 198, tonnage: "35.6M", ballasting: 54, laden: 144 },
    commodities: { exportVol: "98Mt",  voyages: 1120, inTransit: 201, tonneMiles: "2.1Tt" },
    freight:     { c5: null as number | null, c3: 11.20, bci: 2310, bpi: null as number | null, tc: 18500 },
  },
  2: {
    supply:      { vessels: 141, tonnage: "26.4M", ballasting: 41, laden: 100 },
    commodities: { exportVol: "212Mt", voyages: 2310, inTransit: 445, tonneMiles: "3.4Tt" },
    freight:     { c5: 8.45, c3: 11.20, bci: 2140, bpi: null as number | null, tc: 16800 },
  },
} as const;
