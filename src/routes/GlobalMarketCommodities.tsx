import { useMemo, useState, useEffect } from "react";
import { useQueryState, parseAsString } from "nuqs";
import {
  Tabs, TabsList, TabsTrigger, Button,
  Card, CardHeader, CardTitle, CardContent,
} from "@rafal.lemieszewski/tide-ui";
import { Chart } from "@rafal.lemieszewski/tide-ui/chart";
import { DataTable } from "@rafal.lemieszewski/tide-ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { useHeaderTabs, useHeaderActions, useDesk } from "../hooks";
import { Upload, X } from "lucide-react";
import { DESKS, DESK_KPI } from "../types/desk";
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

// --- Volumes tab data ---

const exportVolConfig = { volume: { label: "Volume (M mt)", type: "bar" as const, yAxisId: "left" as const } };
const exportVolData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, volume: 80 + Math.round(Math.sin(i * 0.5) * 17 + 17),
}));

const exportCountryConfig = { volume: { label: "Volume (M mt)", yAxisId: "left" as const } };
const exportCountryData = [
  { name: "Brazil", volume: 1253 }, { name: "Australia", volume: 1157 }, { name: "S. Africa", volume: 249 },
  { name: "Canada", volume: 202 }, { name: "India", volume: 101 }, { name: "China", volume: 96 }, { name: "Peru", volume: 71 },
];

const seasonalConfig = {
  y2023: { label: "2023", type: "line" as const, yAxisId: "left" as const },
  y2024: { label: "2024", type: "line" as const, yAxisId: "left" as const },
  y2025: { label: "2025", type: "line" as const, yAxisId: "left" as const },
};
const seasonalData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m,
  y2023: 82 + Math.round(Math.sin(i * 0.4) * 15),
  y2024: 88 + Math.round(Math.sin(i * 0.4 + 0.5) * 16),
  y2025: 92 + Math.round(Math.sin(i * 0.4 + 1) * 14),
}));

const exportPortConfig = { volume: { label: "Volume (M mt)", yAxisId: "left" as const } };
const exportPortData = [
  { name: "Pt Hedland", volume: 1896 }, { name: "Pt Walcott", volume: 596 },
  { name: "Ponta Madeira", volume: 550 }, { name: "Dampier", volume: 473 }, { name: "Tubarao", volume: 222 },
];

const regionConfig = { volume: { label: "Volume (M mt)", yAxisId: "left" as const } };
const regionData = [
  { name: "Oceania", volume: 2195 }, { name: "Americas", volume: 1071 },
  { name: "Africa", volume: 158 }, { name: "Asia", volume: 52 }, { name: "Europe", volume: 2 },
];

const producerConfig = { volume: { label: "Volume (M mt)", yAxisId: "left" as const } };
const producerData = [
  { name: "RTIO", volume: 746 }, { name: "BHP", volume: 689 }, { name: "VALE", volume: 658 },
  { name: "FMG", volume: 442 }, { name: "Anglo", volume: 176 },
];

const ytdConfig = {
  current: { label: "Current YTD", type: "line" as const, yAxisId: "left" as const },
  prior: { label: "Prior Year", type: "line" as const, yAxisId: "left" as const },
};
const ytdData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m,
  current: Math.round(90 * (i + 1) + Math.sin(i * 0.3) * 30),
  prior: Math.round(86 * (i + 1) + Math.sin(i * 0.3 + 0.2) * 28),
}));

const yoyVarConfig = { change: { label: "YoY Change %", type: "bar" as const, yAxisId: "left" as const } };
const yoyVarData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, change: +(Math.sin(i * 0.6) * 8).toFixed(1),
}));

// --- Trade flows tab data ---

const originConfig = { volume: { label: "Volume (M mt)", yAxisId: "left" as const } };
const originData = [
  { name: "Australia", volume: 256 }, { name: "Brazil", volume: 104 }, { name: "S. Africa", volume: 23 },
  { name: "Canada", volume: 16 }, { name: "India", volume: 10 }, { name: "Malaysia", volume: 7 },
];

const yoyFlowConfig = {
  current: { label: "Current Year", type: "line" as const, yAxisId: "left" as const },
  prior: { label: "Prior Year", type: "line" as const, yAxisId: "left" as const },
};
const yoyFlowData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m,
  current: Math.round(38 * (i + 1) + Math.sin(i * 0.4) * 12),
  prior: Math.round(36 * (i + 1) + Math.sin(i * 0.4 + 0.3) * 10),
}));

const destConfig = { volume: { label: "Volume (M mt)", yAxisId: "left" as const } };
const destData = [
  { name: "China", volume: 310 }, { name: "Japan", volume: 24 }, { name: "S. Korea", volume: 21 },
  { name: "Netherlands", volume: 10 }, { name: "Malaysia", volume: 7 },
];

const tonneMilesConfig = { tonne_miles: { label: "Tonne-miles (bn)", type: "line" as const, yAxisId: "left" as const } };
const tonneMilesData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, tonne_miles: 380 + Math.round(Math.sin(i * 0.5) * 70 + 70),
}));

const routeTMConfig = { tonne_miles: { label: "Tonne-miles (bn)", type: "bar" as const, yAxisId: "left" as const } };
const routeTMData = [
  { name: "AUS→CHN", tonne_miles: 1840 }, { name: "BRA→CHN", tonne_miles: 1420 },
  { name: "SAF→CHN", tonne_miles: 680 }, { name: "AUS→JPN", tonne_miles: 520 },
  { name: "BRA→EUR", tonne_miles: 490 }, { name: "AUS→KOR", tonne_miles: 380 },
];

const haulConfig = { nm: { label: "Distance (NM)", type: "line" as const, yAxisId: "left" as const } };
const haulData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, nm: 5400 + Math.round(Math.sin(i * 0.4 + 0.5) * 400 + 400),
}));

const yoyTMConfig = {
  y2023: { label: "2023", type: "line" as const, yAxisId: "left" as const },
  y2024: { label: "2024", type: "line" as const, yAxisId: "left" as const },
  y2025: { label: "2025", type: "line" as const, yAxisId: "left" as const },
};
const yoyTMData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m,
  y2023: 370 + Math.round(Math.sin(i * 0.5) * 60),
  y2024: 400 + Math.round(Math.sin(i * 0.5 + 0.4) * 65),
  y2025: 420 + Math.round(Math.sin(i * 0.5 + 0.8) * 70),
}));

// --- Pipeline tab data ---

const pipelineVolConfig = {
  australia: { label: "Australia", type: "bar" as const, yAxisId: "left" as const },
  brazil: { label: "Brazil", type: "bar" as const, yAxisId: "left" as const },
  other: { label: "Other", type: "bar" as const, yAxisId: "left" as const },
};
const pipelineVolData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct"].map((m, i) => ({
  name: m,
  australia: 18 + Math.round(Math.sin(i * 0.4) * 4),
  brazil: 9 + Math.round(Math.sin(i * 0.5 + 1) * 2),
  other: 4 + Math.round(Math.sin(i * 0.6) * 1),
}));

const destBreakdownConfig = { vessels: { label: "Vessels", yAxisId: "left" as const } };
const destBreakdownData = [
  { name: "China", vessels: 255 }, { name: "Unknown", vessels: 239 },
  { name: "S. Korea", vessels: 21 }, { name: "Japan", vessels: 20 }, { name: "Netherlands", vessels: 8 },
];

const transitDestConfig = { vessels: { label: "Vessels", yAxisId: "left" as const } };
const transitDestData = [
  { name: "China", vessels: 255 }, { name: "Unknown", vessels: 239 },
  { name: "S. Korea", vessels: 21 }, { name: "Japan", vessels: 20 }, { name: "Netherlands", vessels: 8 },
];

type VesselDetailRow = { vessel: string; from: string; to: string; departure: string; arrival: string; volume: string };
const vesselDetailColumns: ColumnDef<VesselDetailRow>[] = [
  { accessorKey: "vessel", header: "Vessel Name" },
  { accessorKey: "from", header: "From" },
  { accessorKey: "to", header: "To" },
  { accessorKey: "departure", header: "Departure" },
  { accessorKey: "arrival", header: "Arrival" },
  { accessorKey: "volume", header: "Volume (mt)" },
];
const vesselDetailData: VesselDetailRow[] = [
  { vessel: "Hebei King", from: "Port Hedland", to: "Qingdao", departure: "01/03", arrival: "14/03", volume: "182,000" },
  { vessel: "Maran Glory", from: "Tubarao", to: "Caofeidian", departure: "28/02", arrival: "22/03", volume: "165,000" },
  { vessel: "Ocean World", from: "Dampier", to: "Jingtang", departure: "02/03", arrival: "15/03", volume: "225,368" },
  { vessel: "Cape Horn", from: "Saldanha Bay", to: "Rotterdam", departure: "25/02", arrival: "18/03", volume: "178,999" },
  { vessel: "Crystal Tiger", from: "Port Kembla", to: "Kashima", departure: "03/03", arrival: "16/03", volume: "169,115" },
];

// --- Commodity list tab data ---

type CommodityRow = { commodity: string; volume: string; voyages: string; inTransit: string; topCountry: string; yoy: string; yoyUp: boolean };
const commodityColumns: ColumnDef<CommodityRow>[] = [
  { accessorKey: "commodity", header: "Commodity" },
  { accessorKey: "volume", header: "Volume (YTD)" },
  { accessorKey: "voyages", header: "Voyages" },
  { accessorKey: "inTransit", header: "In Transit" },
  { accessorKey: "topCountry", header: "Top Export Country" },
  {
    accessorKey: "yoy",
    header: "YoY Change",
    cell: ({ row }) => (
      <span style={{ color: row.original.yoyUp ? "green" : "red" }}>
        {row.original.yoy}
      </span>
    ),
  },
];
const commodityData: CommodityRow[] = [
  { commodity: "Iron Ore", volume: "1,842M mt", voyages: "42,100", inTransit: "55.4M mt", topCountry: "Australia", yoy: "+4.2%", yoyUp: true },
  { commodity: "Grains", volume: "892M mt", voyages: "18,400", inTransit: "22.1M mt", topCountry: "Brazil", yoy: "+6.1%", yoyUp: true },
  { commodity: "Coal", volume: "1,156M mt", voyages: "28,900", inTransit: "18.8M mt", topCountry: "Australia", yoy: "−2.3%", yoyUp: false },
  { commodity: "Bauxite", volume: "245M mt", voyages: "5,200", inTransit: "8.4M mt", topCountry: "Guinea", yoy: "+12.8%", yoyUp: true },
  { commodity: "Nickel Ore", volume: "78M mt", voyages: "2,100", inTransit: "3.2M mt", topCountry: "Philippines", yoy: "−5.4%", yoyUp: false },
  { commodity: "Copper Ore", volume: "42M mt", voyages: "1,400", inTransit: "1.8M mt", topCountry: "Chile", yoy: "+3.7%", yoyUp: true },
];

// --- Tab content components ---

function VolumesTab({ commodity, setCommodity }: { commodity: string; setCommodity: (v: string) => void }) {
  const { deskIdx } = useDesk();
  const kpi = DESK_KPI[deskIdx as 0 | 1 | 2].commodities;

  return (
    <div className="flex flex-col">
      <DeskContextStrip section="commodities" />
      {commodity && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 10px",
            marginBottom: 12,
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-primary-subtle)",
            borderRadius: 14,
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            alignSelf: "flex-start",
          }}
        >
          Commodity: {commodity}
          <button
            onClick={() => setCommodity("")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
            aria-label="Clear commodity filter"
          >
            <X size={12} style={{ color: "var(--color-text-secondary)" }} />
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard value={kpi.exportVol} label="Export Volume (mt)" />
        <KpiCard value={String(kpi.voyages)} label="Voyages" />
        <KpiCard value={String(kpi.inTransit)} label="In Transit (mt)" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Export volumes by date</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={exportVolData} config={exportVolConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Volume by export country</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={exportCountryData} config={exportCountryConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Seasonal overlay — YoY</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={seasonalData} config={seasonalConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Volume by export port</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={exportPortData} config={exportPortConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Volume by region</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={regionData} config={regionConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Volume by producer</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={producerData} config={producerConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">YTD vs prior year</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={ytdData} config={ytdConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">YoY variation</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={yoyVarData} config={yoyVarConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TradeFlowsTab() {
  const { deskIdx } = useDesk();
  const kpi = DESK_KPI[deskIdx as 0 | 1 | 2].commodities;

  return (
    <div className="flex flex-col">
      <DeskContextStrip section="commodities" />
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard value={kpi.exportVol} label="Total Volume (mt)" />
        <KpiCard value={String(kpi.voyages)} label="Voyages" />
        <KpiCard value={String(kpi.inTransit)} label="In Transit (mt)" />
        <KpiCard value={kpi.tonneMiles} label="Tonne-miles" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Volume by origin country</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={originData} config={originConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <MapPlaceholder title="Trade flow map — origin → destination" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">YoY cumulative comparison</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={yoyFlowData} config={yoyFlowConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Volume by destination country</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={destData} config={destConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Tonne-miles — time series</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={tonneMilesData} config={tonneMilesConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Tonne-miles by route</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={routeTMData} config={routeTMConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Avg haul distance trend</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={haulData} config={haulConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Tonne-miles YoY comparison</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={yoyTMData} config={yoyTMConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PipelineTab() {
  return (
    <div className="flex flex-col">
      <DeskContextStrip section="commodities" />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard value="9,612" label="Vessel Count" />
        <KpiCard value="148K" label="Voyage Count" />
        <KpiCard value="5.2M" label="In Transit (mt)" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Week-over-week</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-body-sm">Imports</span>
              <span className="text-body-sm font-semibold">
                38.78M <span style={{ color: "red" }}>−2.42%</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-sm">Exports</span>
              <span className="text-body-sm font-semibold">
                32.67M <span style={{ color: "red" }}>−8.27%</span>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Volume by country</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={pipelineVolData} config={pipelineVolConfig} height={180} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Destination breakdown</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={destBreakdownData} config={destBreakdownConfig} height={180} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Vessels in transit by destination</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={transitDestData} config={transitDestConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <MapPlaceholder title="Vessel positions by producer" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-heading-sm">Vessel detail</CardTitle></CardHeader>
        <CardContent>
          <DataTable data={vesselDetailData} columns={vesselDetailColumns} borderStyle="horizontal" />
        </CardContent>
      </Card>
    </div>
  );
}

function CommodityListTab() {
  return (
    <div className="flex flex-col">
      <DeskContextStrip section="commodities" />
      <SectionLabel>Commodity List</SectionLabel>
      <Card>
        <CardContent className="p-0">
          <DataTable data={commodityData} columns={commodityColumns} borderStyle="horizontal" />
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main component ---

function GlobalMarketCommodities() {
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("volumes"));
  const { deskIdx } = useDesk();
  const [commodity, setCommodity] = useState("");

  useEffect(() => {
    const desk = DESKS[deskIdx];
    if (desk.filters.commodity && commodity === "") {
      setCommodity(desk.filters.commodity);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deskIdx]);

  const headerTabs = useMemo(
    () => (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList size="s">
          <TabsTrigger size="s" value="volumes">Volumes</TabsTrigger>
          <TabsTrigger size="s" value="trade-flows">Trade flows</TabsTrigger>
          <TabsTrigger size="s" value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger size="s" value="commodity-list">Commodity list</TabsTrigger>
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
      {tab === "volumes" && <VolumesTab commodity={commodity} setCommodity={setCommodity} />}
      {tab === "trade-flows" && <TradeFlowsTab />}
      {tab === "pipeline" && <PipelineTab />}
      {tab === "commodity-list" && <CommodityListTab />}
    </div>
  );
}

export default GlobalMarketCommodities;
