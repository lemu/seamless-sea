import { useMemo, useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import {
  Tabs, TabsList, TabsTrigger, Button,
  Card, CardHeader, CardTitle, CardContent,
} from "@rafal.lemieszewski/tide-ui";
import { Chart } from "@rafal.lemieszewski/tide-ui/chart";
import { DataTable } from "@rafal.lemieszewski/tide-ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { useHeaderTabs, useHeaderActions, useDesk } from "../hooks";
import { Upload } from "lucide-react";
import { DESK_KPI } from "../types/desk";
import { DeskContextStrip } from "../components/DeskContextStrip";

// --- Shared helpers ---

function KpiCard({ value, label }: { value: string; label: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-heading-lg">{value}</p>
        <p className="text-body-sm text-[var(--color-text-secondary)]">{label}</p>
      </CardContent>
    </Card>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-body-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mt-6 mb-3">
      {children}
    </p>
  );
}

function MapPlaceholder({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-heading-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="min-h-[220px] flex items-center justify-center rounded-md bg-[var(--color-bg-secondary)]">
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            Map will be available when AIS integration is live.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Fleet tab data ---

type PositionRow = { vessel: string; type: string; dwt: number; status: string; speed: string; position: string; eta: string };
const positionColumns: ColumnDef<PositionRow>[] = [
  { accessorKey: "vessel", header: "Vessel Name" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "dwt", header: "DWT", cell: ({ row }) => row.original.dwt.toLocaleString() },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "speed", header: "Speed" },
  { accessorKey: "position", header: "Position" },
  { accessorKey: "eta", header: "ETA" },
];
const positionData: PositionRow[] = [
  { vessel: "Hebei King", type: "Capesize", dwt: 180000, status: "Laden", speed: "11.2 kn", position: "16°N 112°E", eta: "15/05" },
  { vessel: "Maran Glory", type: "Capesize", dwt: 177866, status: "Anchorage", speed: "0.0 kn", position: "22°S 43°W", eta: "—" },
  { vessel: "Ocean World", type: "VLOC", dwt: 225368, status: "Laden", speed: "13.1 kn", position: "30°N 128°E", eta: "14/05" },
  { vessel: "Cape Horn", type: "Capesize", dwt: 178999, status: "Laden", speed: "11.5 kn", position: "8°S 18°W", eta: "20/05" },
  { vessel: "Crystal Tiger", type: "Capesize", dwt: 169115, status: "Laden", speed: "12.0 kn", position: "24°N 135°E", eta: "16/05" },
];

type ListRow = { vessel: string; route: string; status: string; eta: string };
const listColumns: ColumnDef<ListRow>[] = [
  { accessorKey: "vessel", header: "Vessel Name" },
  { accessorKey: "route", header: "Route (From → To)" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "eta", header: "ETA" },
];
const listData: ListRow[] = [
  { vessel: "Hebei King", route: "Port Hedland → Qingdao", status: "Laden", eta: "15/05" },
  { vessel: "Maran Glory", route: "Tubarao → Caofeidian", status: "Laden", eta: "22/05" },
  { vessel: "Ocean World", route: "Dampier → Jingtang", status: "Laden", eta: "14/05" },
  { vessel: "Cape Horn", route: "Saldanha Bay → Rotterdam", status: "Laden", eta: "18/05" },
  { vessel: "Crystal Tiger", route: "Port Kembla → Kashima", status: "Laden", eta: "16/05" },
];

const subRegionConfig = { count: { label: "Vessels", yAxisId: "left" as const } };
const subRegionData = [
  { name: "SE Asia", count: 2410 },
  { name: "N Australia", count: 1985 },
  { name: "Indian Ocean", count: 1740 },
  { name: "W Africa", count: 1520 },
  { name: "E Med", count: 1380 },
  { name: "AG/India", count: 1265 },
];

const subtypeConfig = { count: { label: "Vessels", type: "bar" as const, yAxisId: "left" as const } };
const subtypeData = [
  { name: "Capesize", count: 4120 },
  { name: "Panamax", count: 2890 },
  { name: "Supramax", count: 2310 },
  { name: "Handysize", count: 1780 },
  { name: "VLOC", count: 890 },
  { name: "Other", count: 450 },
];

const etaConfig = { count: { label: "Vessels", type: "bar" as const, yAxisId: "left" as const } };
const etaData = [
  { name: "Jan", count: 2200 }, { name: "Feb", count: 2450 }, { name: "Mar", count: 2650 },
  { name: "Apr", count: 2800 }, { name: "May", count: 2600 }, { name: "Jun", count: 2300 },
  { name: "Jul", count: 2500 }, { name: "Aug", count: 2750 },
];

const fleetSupplyConfig = { count: { label: "Vessels", type: "bar" as const, yAxisId: "left" as const } };
const fleetSupplyData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, count: 18000 + Math.round(Math.sin(i * 0.5) * 1500 + i * 100),
}));

const ballastStatusConfig = {
  laden: { label: "Laden", type: "bar" as const, yAxisId: "left" as const },
  ballast: { label: "Ballast", type: "bar" as const, yAxisId: "left" as const },
};
const ballastStatusData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct"].map((m, i) => ({
  name: m, laden: 11800 + i * 100, ballast: 6000 + i * 50,
}));

const utilizationConfig = { util: { label: "Utilization %", type: "bar" as const, yAxisId: "left" as const } };
const utilizationData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, util: 68 + Math.round(Math.sin(i * 0.6) * 7),
}));

// §1.2 Breakdown by Class
const ballastRateConfig = { rate: { label: "Ballasting %", yAxisId: "left" as const } };
const ballastRateData = [
  { name: "VLOC", rate: 22 },
  { name: "Capesize", rate: 31 },
  { name: "Panamax", rate: 28 },
  { name: "Supramax", rate: 33 },
  { name: "Handysize", rate: 29 },
];
const subtypeHBarConfig = { count: { label: "Vessels", yAxisId: "left" as const } };
const subtypeHBarData = [
  { name: "Capesize", count: 4120 },
  { name: "Panamax", count: 2890 },
  { name: "Supramax", count: 2310 },
  { name: "Handysize", count: 1780 },
  { name: "VLOC", count: 890 },
  { name: "Other", count: 450 },
];

// §1.7 Fleet Outlook
const orderbookConfig = {
  bulker: { label: "Bulker", type: "bar" as const, yAxisId: "left" as const },
  tanker: { label: "Tanker", type: "bar" as const, yAxisId: "left" as const },
  container: { label: "Container", type: "bar" as const, yAxisId: "left" as const },
};
const orderbookData = [
  { name: "2025", bulker: 42, tanker: 28, container: 18 },
  { name: "2026", bulker: 58, tanker: 34, container: 24 },
  { name: "2027", bulker: 63, tanker: 29, container: 31 },
  { name: "2028", bulker: 47, tanker: 22, container: 19 },
  { name: "2029", bulker: 32, tanker: 18, container: 14 },
  { name: "2030", bulker: 21, tanker: 12, container: 9 },
];

const netGrowthConfig = { growth: { label: "Net Growth %", type: "line" as const, yAxisId: "left" as const } };
const netGrowthData = [
  { name: "2020", growth: 3.2 }, { name: "2021", growth: 4.1 }, { name: "2022", growth: 3.8 },
  { name: "2023", growth: 2.9 }, { name: "2024", growth: 3.4 }, { name: "2025", growth: 2.8 },
  { name: "2026", growth: 3.1 }, { name: "2027", growth: 3.6 }, { name: "2028", growth: 2.4 },
  { name: "2029", growth: 1.9 }, { name: "2030", growth: 1.5 },
];

const scrappingConfig = { dwt: { label: "DWT (M)", type: "bar" as const, yAxisId: "left" as const } };
const scrappingData = [
  { name: "2022", dwt: 8.4 }, { name: "2023", dwt: 11.2 }, { name: "2024", dwt: 9.8 },
  { name: "2025", dwt: 13.1 }, { name: "2026", dwt: 10.5 },
];

const ageDistConfig = { vessels: { label: "Vessels", type: "bar" as const, yAxisId: "left" as const } };
const ageDistData = [
  { name: "0–5", vessels: 2840 }, { name: "5–10", vessels: 3210 }, { name: "10–15", vessels: 4120 },
  { name: "15–20", vessels: 3680 }, { name: "20–25", vessels: 2940 }, { name: "25–30", vessels: 1820 },
  { name: "30–35", vessels: 980 }, { name: "35+", vessels: 410 },
];

type DeliveryRow = { vessel: string; type: string; dwt: string; yard: string; delivery: string };
const deliveryColumns: ColumnDef<DeliveryRow>[] = [
  { accessorKey: "vessel", header: "Vessel Name" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "dwt", header: "DWT" },
  { accessorKey: "yard", header: "Yard" },
  { accessorKey: "delivery", header: "Expected Delivery" },
];
const deliveryData: DeliveryRow[] = [
  { vessel: "Hull S-2847", type: "Capesize", dwt: "180,000", yard: "Hyundai Samho", delivery: "Q3 2026" },
  { vessel: "Hull JMU-318", type: "VLOC", dwt: "325,000", yard: "JMU", delivery: "Q4 2026" },
  { vessel: "Hull DSME-421", type: "LNG", dwt: "174,000", yard: "DSME", delivery: "Q1 2027" },
  { vessel: "TBN", type: "Kamsarmax", dwt: "82,000", yard: "Oshima", delivery: "Q2 2027" },
  { vessel: "TBN", type: "Ultramax", dwt: "64,000", yard: "Tsuneishi", delivery: "Q3 2027" },
];

// --- Speed-Bunker tab data ---

const steamingSpeedConfig = { speed: { label: "Avg Speed (kn)", type: "line" as const, yAxisId: "left" as const } };
const steamingSpeedData = [
  { name: "2019", speed: 11.2 }, { name: "2020", speed: 11.4 }, { name: "2021", speed: 11.7 },
  { name: "2022", speed: 11.9 }, { name: "2023", speed: 11.8 }, { name: "2024", speed: 12.0 },
];

const bunkerPriceConfig = {
  price: { label: "Price ($/mt)", type: "bar" as const, yAxisId: "left" as const },
  avg7d: { label: "7d Avg", type: "line" as const, yAxisId: "left" as const },
};
const bunkerPriceData = [
  { name: "W1", price: 580, avg7d: 585 }, { name: "W2", price: 592, avg7d: 588 },
  { name: "W3", price: 605, avg7d: 597 }, { name: "W4", price: 598, avg7d: 601 },
  { name: "W5", price: 612, avg7d: 605 }, { name: "W6", price: 620, avg7d: 614 },
  { name: "W7", price: 608, avg7d: 613 }, { name: "W8", price: 615, avg7d: 611 },
  { name: "W9", price: 602, avg7d: 608 }, { name: "W10", price: 618, avg7d: 610 },
];

const speedBySectorConfig = { speed: { label: "Avg Speed (kn)", yAxisId: "left" as const } };
const speedBySectorData = [
  { name: "LNG", speed: 18.2 }, { name: "Container", speed: 15.4 }, { name: "LPG", speed: 13.1 },
  { name: "Bulker", speed: 11.2 }, { name: "Tanker", speed: 10.8 },
];

const speedBySubtypeConfig = { speed: { label: "Avg Speed (kn)", yAxisId: "left" as const } };
const speedBySubtypeData = [
  { name: "Feeder", speed: 16.1 }, { name: "Panamax", speed: 12.3 }, { name: "Capesize", speed: 11.5 },
  { name: "Supramax", speed: 11.2 }, { name: "Handysize", speed: 10.8 }, { name: "VLCC", speed: 10.2 },
];

// --- Utilization tab data ---

const fleetUtilConfig = {
  laden: { label: "Laden", type: "bar" as const, yAxisId: "left" as const },
  ballast: { label: "Ballast", type: "bar" as const, yAxisId: "left" as const },
};
const fleetUtilData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, laden: 11500 + i * 120, ballast: 5800 + i * 60,
}));

const waitingPortAConfig = { vessels: { label: "Vessels", type: "line" as const, yAxisId: "left" as const } };
const waitingPortAData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, vessels: 20 + Math.round(Math.sin(i * 0.7 + 1) * 22 + 22),
}));
const waitingPortBConfig = { vessels: { label: "Vessels", type: "line" as const, yAxisId: "left" as const } };
const waitingPortBData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, vessels: 8 + Math.round(Math.sin(i * 0.6) * 13 + 13),
}));

const waitTimeConfig = { days: { label: "Avg Wait (days)", yAxisId: "left" as const } };
const waitTimeData = [
  { name: "Qingdao", days: 4.2 }, { name: "Dampier", days: 1.8 }, { name: "Pt Hedland", days: 2.1 },
  { name: "Ponta Madeira", days: 3.5 }, { name: "Tubarao", days: 2.9 },
];

const anchorageTrendConfig = { days: { label: "Anchorage Days", type: "line" as const, yAxisId: "left" as const } };
const anchorageTrendData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, days: +(2.1 + Math.sin(i * 0.8) * 2.3 + 2.3).toFixed(1),
}));

// --- Emissions tab data ---

const ciiDistConfig = {
  a: { label: "A", type: "bar" as const, yAxisId: "left" as const },
  b: { label: "B", type: "bar" as const, yAxisId: "left" as const },
  c: { label: "C", type: "bar" as const, yAxisId: "left" as const },
  d: { label: "D", type: "bar" as const, yAxisId: "left" as const },
  e: { label: "E", type: "bar" as const, yAxisId: "left" as const },
};
const ciiDistData = [
  { name: "Capesize", a: 820, b: 1240, c: 1560, d: 380, e: 120 },
  { name: "Panamax", a: 620, b: 980, c: 820, d: 280, e: 90 },
  { name: "Supramax", a: 480, b: 740, c: 620, d: 220, e: 70 },
  { name: "Handysize", a: 360, b: 580, c: 480, d: 180, e: 60 },
  { name: "VLOC", a: 120, b: 240, c: 320, d: 140, e: 70 },
];

const emissionsIntensityConfig = { intensity: { label: "gCO₂/t·nm", yAxisId: "left" as const } };
const emissionsIntensityData = [
  { name: "Tanker", intensity: 12.4 }, { name: "Bulker", intensity: 10.8 },
  { name: "Container", intensity: 9.2 }, { name: "LNG", intensity: 7.1 }, { name: "LPG", intensity: 6.5 },
];

const euEtsConfig = { eur: { label: "EUR M", type: "bar" as const, yAxisId: "left" as const } };
const euEtsData = [
  { name: "2024", eur: 42 }, { name: "2025", eur: 68 }, { name: "2026", eur: 95 }, { name: "2027", eur: 128 },
];

const ciiTrajectoryConfig = {
  fleet: { label: "Fleet Avg CII", type: "line" as const, yAxisId: "left" as const },
  target: { label: "IMO Target", type: "line" as const, yAxisId: "left" as const },
};
const ciiTrajectoryData = [
  { name: "2023", fleet: 14.2, target: 13.8 }, { name: "2024", fleet: 13.8, target: 13.2 },
  { name: "2025", fleet: 13.3, target: 12.6 }, { name: "2026", fleet: 12.9, target: 12.0 },
  { name: "2027", fleet: 12.4, target: 11.4 }, { name: "2028", fleet: 11.8, target: 10.8 },
  { name: "2029", fleet: 11.2, target: 10.2 }, { name: "2030", fleet: 10.6, target: 9.6 },
];

// --- Tab content components ---

function FleetTab() {
  const [vesselView, setVesselView] = useState<"map" | "table" | "list">("map");
  const { deskIdx } = useDesk();
  const kpi = DESK_KPI[deskIdx as 0 | 1 | 2].supply;

  return (
    <div className="flex flex-col">
      <DeskContextStrip section="supply" />
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard value={String(kpi.vessels)} label="Vessel Count" />
        <KpiCard value={kpi.tonnage} label="Total Tonnage (DWT)" />
        <KpiCard value={String(kpi.ballasting)} label="Ballasting" />
        <KpiCard value={String(kpi.laden)} label="Laden" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-body-sm text-[var(--color-text-secondary)]">Vessel positions view</p>
        <Tabs value={vesselView} onValueChange={v => setVesselView(v as "map" | "table" | "list")}>
          <TabsList size="s">
            <TabsTrigger size="s" value="map">Map</TabsTrigger>
            <TabsTrigger size="s" value="table">Table</TabsTrigger>
            <TabsTrigger size="s" value="list">List</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {vesselView === "map" && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2">
            <MapPlaceholder title="Vessel positions — world map" />
          </div>
          <div>
            <Card>
              <CardHeader><CardTitle className="text-heading-sm">Vessels by sub-region</CardTitle></CardHeader>
              <CardContent>
                <Chart type="horizontal-bar" data={subRegionData} config={subRegionConfig} height={220} showLegend={false} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {vesselView === "table" && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-heading-sm">Vessel positions</CardTitle></CardHeader>
          <CardContent>
            <DataTable data={positionData} columns={positionColumns} borderStyle="horizontal" />
          </CardContent>
        </Card>
      )}

      {vesselView === "list" && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-heading-sm">Vessel list</CardTitle></CardHeader>
          <CardContent>
            <DataTable data={listData} columns={listColumns} borderStyle="horizontal" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Vessels by sub-type</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={subtypeData} config={subtypeConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Vessels by stated ETA</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={etaData} config={etaConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Fleet supply — time series</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={fleetSupplyData} config={fleetSupplyConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Supply by ballast status</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={ballastStatusData} config={ballastStatusConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Utilization index</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={utilizationData} config={utilizationConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Breakdown by Class</SectionLabel>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Vessels by sub-type</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={subtypeHBarData} config={subtypeHBarConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Ballasting rate by class</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={ballastRateData} config={ballastRateConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Fleet Outlook</SectionLabel>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Orderbook — newbuilding deliveries by year</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={orderbookData} config={orderbookConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Net fleet growth — time series</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={netGrowthData} config={netGrowthConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Scrapping / demolition trends</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={scrappingData} config={scrappingConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Fleet age distribution</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={ageDistData} config={ageDistConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-heading-sm">Delivery schedule</CardTitle></CardHeader>
        <CardContent>
          <DataTable data={deliveryData} columns={deliveryColumns} borderStyle="horizontal" />
        </CardContent>
      </Card>
    </div>
  );
}

function SpeedBunkerTab() {
  const [headingA, setHeadingA] = useState("all");
  const [headingB, setHeadingB] = useState("all");

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <KpiCard value="6.00 kts" label="Avg Speed" />
        <KpiCard value="11.70 kts" label="Avg Steaming Speed" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Rolling avg steaming speed — 6yr trend</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={steamingSpeedData} config={steamingSpeedConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Bunker price — 7 day rolling avg</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={bunkerPriceData} config={bunkerPriceConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-heading-sm">Speed by vessel sector</CardTitle>
              <select value={headingA} onChange={e => setHeadingA(e.target.value)}
                className="text-body-sm border border-[var(--color-border-primary-subtle)] rounded px-2 py-1">
                <option value="all">All</option>
                <option value="laden">Laden</option>
                <option value="ballast">Ballast</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={speedBySectorData} config={speedBySectorConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-heading-sm">Avg speed by sub-type</CardTitle>
              <select value={headingB} onChange={e => setHeadingB(e.target.value)}
                className="text-body-sm border border-[var(--color-border-primary-subtle)] rounded px-2 py-1">
                <option value="all">All</option>
                <option value="laden">Laden</option>
                <option value="ballast">Ballast</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={speedBySubtypeData} config={speedBySubtypeConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UtilizationTab() {
  const [portA, setPortA] = useState("qingdao");
  const [portB, setPortB] = useState("ponta-madeira");

  return (
    <div className="flex flex-col">
      <SectionLabel>Utilization</SectionLabel>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Fleet utilization by vessel type</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={fleetUtilData} config={fleetUtilConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <MapPlaceholder title="Vessel density heatmap" />
      </div>

      <SectionLabel>Port Congestion</SectionLabel>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-heading-sm">Vessels waiting — port A</CardTitle>
              <select value={portA} onChange={e => setPortA(e.target.value)}
                className="text-body-sm border border-[var(--color-border-primary-subtle)] rounded px-2 py-1">
                <option value="qingdao">Qingdao</option>
                <option value="dampier">Dampier</option>
                <option value="pt-hedland">Pt Hedland</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <Chart type="line" data={waitingPortAData} config={waitingPortAConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-heading-sm">Vessels waiting — port B</CardTitle>
              <select value={portB} onChange={e => setPortB(e.target.value)}
                className="text-body-sm border border-[var(--color-border-primary-subtle)] rounded px-2 py-1">
                <option value="ponta-madeira">Ponta Madeira</option>
                <option value="tubarao">Tubarao</option>
                <option value="guaiba">Guaiba</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <Chart type="line" data={waitingPortBData} config={waitingPortBConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Avg waiting time by loading port</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={waitTimeData} config={waitTimeConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Anchorage time trend — 12 months</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={anchorageTrendData} config={anchorageTrendConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmissionsTab() {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">CII rating distribution by vessel type</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={ciiDistData} config={ciiDistConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Emissions intensity by sector</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={emissionsIntensityData} config={emissionsIntensityConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">EU ETS exposure — estimated allowances</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={euEtsData} config={euEtsConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Fleet avg CII trajectory vs IMO targets</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={ciiTrajectoryData} config={ciiTrajectoryConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Main component ---

function GlobalMarketSupply() {
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("fleet"));

  const headerTabs = useMemo(
    () => (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList size="s">
          <TabsTrigger size="s" value="fleet">Fleet</TabsTrigger>
          <TabsTrigger size="s" value="speed-bunker">Speed &amp; bunker</TabsTrigger>
          <TabsTrigger size="s" value="utilization">Utilization</TabsTrigger>
          <TabsTrigger size="s" value="emissions">Emissions</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
    [tab, setTab]
  );

  useHeaderTabs(headerTabs);

  const headerActions = useMemo(
    () => (
      <Button variant="default" icon={Upload} iconPosition="left">
        Export
      </Button>
    ),
    []
  );

  useHeaderActions(headerActions);

  return (
    <div className="m-6 flex flex-col gap-[var(--space-l)]">
      {tab === "fleet" && <FleetTab />}
      {tab === "speed-bunker" && <SpeedBunkerTab />}
      {tab === "utilization" && <UtilizationTab />}
      {tab === "emissions" && <EmissionsTab />}
    </div>
  );
}

export default GlobalMarketSupply;
