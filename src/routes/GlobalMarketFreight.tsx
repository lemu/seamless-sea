import { useMemo, useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import {
  Tabs, TabsList, TabsTrigger, Button,
  Card, CardHeader, CardTitle, CardContent,
} from "@rafal.lemieszewski/tide-ui";
import { Chart, type ChartDataPoint } from "@rafal.lemieszewski/tide-ui/chart";
import { DataTable } from "@rafal.lemieszewski/tide-ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { useHeaderTabs, useHeaderActions, useDesk } from "../hooks";
import { Upload } from "lucide-react";
import { DESK_KPI } from "../types/desk";
import { DeskContextStrip } from "../components/DeskContextStrip";

// --- Shared helpers ---

function KpiCardDelta({ value, label, delta, up, valueColor }: { value: string; label: string; delta: string; up: boolean; valueColor?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-heading-lg" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
        <p className="text-body-sm text-[var(--color-text-secondary)]">{label}</p>
        <p className="text-body-sm" style={{ color: up ? "green" : "red" }}>
          {up ? "↑" : "↓"} {delta}
        </p>
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

// --- Overview tab data ---

const balticIndexConfig = {
  historical: { label: "Historical", type: "line" as const, yAxisId: "left" as const },
  forward: { label: "Forward", type: "line" as const, yAxisId: "left" as const },
};
const balticIndexDataMonthly = [
  { name: "Sep", historical: 32, forward: undefined },
  { name: "Oct", historical: 28, forward: undefined },
  { name: "Nov", historical: 24, forward: undefined },
  { name: "Dec", historical: 20, forward: undefined },
  { name: "Jan", historical: 17, forward: undefined },
  { name: "Feb", historical: 19, forward: undefined },
  { name: "Mar", historical: 21, forward: undefined },
  { name: "Apr", historical: undefined, forward: 22 },
  { name: "May", historical: undefined, forward: 24 },
  { name: "Jun", historical: undefined, forward: 26 },
];
const balticIndexDataQuarterly = [
  { name: "Q1 2024", historical: 28, forward: undefined },
  { name: "Q2 2024", historical: 22, forward: undefined },
  { name: "Q3 2024", historical: 19, forward: undefined },
  { name: "Q4 2024", historical: 17, forward: undefined },
  { name: "Q1 2025", historical: 20, forward: undefined },
  { name: "Q2 2025", historical: undefined, forward: 23 },
  { name: "Q3 2025", historical: undefined, forward: 25 },
];
const balticIndexDataAnnual = [
  { name: "2022", historical: 26, forward: undefined },
  { name: "2023", historical: 22, forward: undefined },
  { name: "2024", historical: 19, forward: undefined },
  { name: "2025", historical: undefined, forward: 21 },
  { name: "2026", historical: undefined, forward: 24 },
];

type LaycanRow = { laycan: string; count: string; cargo: string; avgRate: string; avgDem: string };
const laycanColumns: ColumnDef<LaycanRow>[] = [
  { accessorKey: "laycan", header: "Laycan" },
  { accessorKey: "count", header: "Fix. Count" },
  { accessorKey: "cargo", header: "Cargo (mt)" },
  { accessorKey: "avgRate", header: "Avg Rate" },
  { accessorKey: "avgDem", header: "Avg Dem." },
];
const laycanData: LaycanRow[] = [
  { laycan: "Jan 2024", count: "45", cargo: "7.78M", avgRate: "$16.96", avgDem: "$23,970" },
  { laycan: "Feb 2024", count: "52", cargo: "8.12M", avgRate: "$18.40", avgDem: "$24,100" },
  { laycan: "Mar 2024", count: "48", cargo: "7.95M", avgRate: "$19.20", avgDem: "$22,800" },
  { laycan: "Apr 2024", count: "61", cargo: "9.80M", avgRate: "$21.40", avgDem: "$25,200" },
  { laycan: "May 2024", count: "44", cargo: "7.40M", avgRate: "$17.80", avgDem: "$23,500" },
];

type RouteRow = { route: string; count: string; cargo: string; gross: string };
const routeSummaryColumns: ColumnDef<RouteRow>[] = [
  { accessorKey: "route", header: "Route" },
  { accessorKey: "count", header: "Fix. Count" },
  { accessorKey: "cargo", header: "Cargo (mt)" },
  { accessorKey: "gross", header: "Gross Freight" },
];
const routeSummaryData: RouteRow[] = [
  { route: "AUS→CHN", count: "791", cargo: "136.3M", gross: "$1.82bn" },
  { route: "BRA→CHN", count: "482", cargo: "84.2M", gross: "$2.09bn" },
  { route: "MYS→CHN", count: "124", cargo: "21.8M", gross: "$0.40bn" },
  { route: "CHN→CHN", count: "98", cargo: "17.2M", gross: "$0.31bn" },
];

const bunkerSpotConfig = {
  vlsfo: { label: "VLSFO", type: "bar" as const, yAxisId: "left" as const },
  mgo: { label: "MGO", type: "bar" as const, yAxisId: "left" as const },
};
const bunkerSpotData = [
  { name: "Singapore", vlsfo: 612, mgo: 724 },
  { name: "Rotterdam", vlsfo: 594, mgo: 712 },
  { name: "Fujairah", vlsfo: 608, mgo: 718 },
  { name: "Houston", vlsfo: 598, mgo: 708 },
];

const vesselSupplyConfig = {
  laden: { label: "Laden", type: "bar" as const, yAxisId: "left" as const },
  ballast: { label: "Ballast", type: "bar" as const, yAxisId: "left" as const },
};
const vesselSupplyData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, laden: 600 + Math.round(Math.sin(i * 0.5) * 80 + 80), ballast: 280 + Math.round(Math.sin(i * 0.6 + 1) * 40 + 40),
}));

const cargoFreightConfig = {
  cargo: { label: "Cargo qty (M mt)", type: "bar" as const, yAxisId: "left" as const },
  rate: { label: "Avg Rate ($/mt)", type: "line" as const, yAxisId: "left" as const },
};
const cargoFreightData = [
  { name: "W1", cargo: 7.2, rate: 16.4 }, { name: "W2", cargo: 8.4, rate: 18.2 },
  { name: "W3", cargo: 9.1, rate: 20.8 }, { name: "W4", cargo: 7.8, rate: 19.4 },
  { name: "W5", cargo: 8.6, rate: 21.2 }, { name: "W6", cargo: 9.8, rate: 23.6 },
  { name: "W7", cargo: 8.2, rate: 22.4 }, { name: "W8", cargo: 7.5, rate: 20.1 },
  { name: "W9", cargo: 9.4, rate: 22.8 }, { name: "W10", cargo: 10.1, rate: 24.2 },
];

const fixtureStatusConfig = { count: { label: "Count", yAxisId: "left" as const } };
const fixtureStatusData = [
  { name: "Fully Fixed", count: 1142 }, { name: "On Subs", count: 98 },
  { name: "Subs Lifted", count: 64 }, { name: "Subs Failed", count: 42 }, { name: "Firm", count: 27 },
];

const avgRateByRouteConfig = { rate: { label: "Rate ($/mt)", yAxisId: "left" as const } };
const avgRateByRouteData = [
  { name: "C5 W.Aus→Qingdao", rate: 11.20 },
  { name: "C3 Tubarao→Qingdao", rate: 24.80 },
  { name: "C7 Bolivar→Rot", rate: 18.50 },
  { name: "P1A Transatlantic", rate: 14.20 },
];

const ownerFixConfig = { count: { label: "Fixtures", yAxisId: "left" as const } };
const ownerFixData = [
  { name: "Solebay", count: 14 }, { name: "Pan Ocean", count: 8 },
  { name: "Pantheon", count: 7 }, { name: "Heidmar", count: 5 }, { name: "Kolossi", count: 4 },
];

const congestionAConfig = { index: { label: "Index Score", type: "line" as const, yAxisId: "left" as const } };
const congestionAData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, index: 20 + Math.round(Math.sin(i * 0.7) * 26 + 26),
}));

const congestionBConfig = { index: { label: "Index Score", type: "line" as const, yAxisId: "left" as const } };
const congestionBData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, index: 4 + Math.round(Math.sin(i * 0.8 + 1) * 4 + 4),
}));

// --- Rate history tab data ---

const rateByRouteConfig = {
  ausChn: { label: "AUS→CHN", type: "line" as const, yAxisId: "left" as const },
  braChn: { label: "BRA→CHN", type: "line" as const, yAxisId: "left" as const },
  safChn: { label: "S.AFR→CHN", type: "line" as const, yAxisId: "left" as const },
};
const rateByRouteData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m,
  ausChn: +(9 + Math.sin(i * 0.5) * 3 + 3).toFixed(2),
  braChn: +(20 + Math.sin(i * 0.5 + 0.8) * 6 + 6).toFixed(2),
  safChn: +(14 + Math.sin(i * 0.5 + 1.6) * 4 + 4).toFixed(2),
}));

const indexBenchmarkConfig = {
  bci: { label: "BCI", type: "line" as const, yAxisId: "left" as const },
  bpi: { label: "BPI", type: "line" as const, yAxisId: "left" as const },
};
const indexBenchmarkData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m,
  bci: 1600 + Math.round(Math.sin(i * 0.5) * 400 + 400),
  bpi: 900 + Math.round(Math.sin(i * 0.5 + 1) * 250 + 250),
}));

const seasonalRateConfig = {
  y2023: { label: "2023", type: "line" as const, yAxisId: "left" as const },
  y2024: { label: "2024", type: "line" as const, yAxisId: "left" as const },
  y2025: { label: "2025", type: "line" as const, yAxisId: "left" as const },
};
const seasonalRateData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m,
  y2023: +(14 + Math.sin(i * 0.6) * 5).toFixed(2),
  y2024: +(16 + Math.sin(i * 0.6 + 0.5) * 6).toFixed(2),
  y2025: +(18 + Math.sin(i * 0.6 + 1) * 7).toFixed(2),
}));

const volatilityConfig = {
  high: { label: "Range High", type: "bar" as const, yAxisId: "left" as const },
  low: { label: "Range Low", type: "bar" as const, yAxisId: "left" as const },
  avg: { label: "Avg", type: "line" as const, yAxisId: "left" as const },
};
const volatilityData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => {
  const avg = 18 + Math.round(Math.sin(i * 0.5) * 6);
  return { name: m, high: avg + 4, low: avg - 4, avg };
});

// --- Tab content components ---

function OverviewTab() {
  const [period, setPeriod] = useState("monthly");
  const [portSelect, setPortSelect] = useState("singapore");
  const [congPortA, setCongPortA] = useState("qingdao");
  const [congPortB, setCongPortB] = useState("ponta-madeira");
  const { deskIdx } = useDesk();
  const kpi = DESK_KPI[deskIdx as 0 | 1 | 2].freight;

  const fmt = (v: number | null) => v != null ? String(v) : "—";
  const fmtDollar = (v: number | null) => v != null ? `$${v}` : "—";
  const nullColor = (v: number | null) => v != null ? undefined : "#8b949e";

  const indexData = period === "monthly"
    ? balticIndexDataMonthly
    : period === "quarterly"
    ? balticIndexDataQuarterly
    : balticIndexDataAnnual;

  return (
    <div className="flex flex-col">
      <DeskContextStrip section="freight" />
      <div className="grid grid-cols-5 gap-3 mb-4">
        <KpiCardDelta value={fmtDollar(kpi.c5)} label="C5 Index" delta="4.2%" up={true} valueColor={nullColor(kpi.c5)} />
        <KpiCardDelta value={fmtDollar(kpi.c3)} label="C3 Index" delta="1.1%" up={false} valueColor={nullColor(kpi.c3)} />
        <KpiCardDelta value={fmt(kpi.bci)} label="BCI" delta="2.8%" up={true} valueColor={nullColor(kpi.bci)} />
        <KpiCardDelta value={fmt(kpi.bpi)} label="BPI" delta="0.5%" up={false} valueColor={nullColor(kpi.bpi)} />
        <KpiCardDelta value={`$${kpi.tc.toLocaleString()}`} label="TC Basket" delta="1.9%" up={true} />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-heading-sm">Freight rate — Baltic Index</CardTitle>
            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList size="s">
                <TabsTrigger size="s" value="monthly">Monthly</TabsTrigger>
                <TabsTrigger size="s" value="quarterly">Quarterly</TabsTrigger>
                <TabsTrigger size="s" value="annual">Annual</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Chart type="line" data={indexData as unknown as ChartDataPoint[]} config={balticIndexConfig} height={240} showLegend={true} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Summary by laycan</CardTitle></CardHeader>
          <CardContent>
            <DataTable data={laycanData} columns={laycanColumns} borderStyle="horizontal" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Route summary</CardTitle></CardHeader>
          <CardContent>
            <DataTable data={routeSummaryData} columns={routeSummaryColumns} borderStyle="horizontal" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-heading-sm">Bunker pricing — spot</CardTitle>
              <select value={portSelect} onChange={e => setPortSelect(e.target.value)}
                className="text-body-sm border border-[var(--color-border-primary-subtle)] rounded px-2 py-1">
                <option value="singapore">Singapore</option>
                <option value="rotterdam">Rotterdam</option>
                <option value="fujairah">Fujairah</option>
                <option value="houston">Houston</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <Chart type="bar" data={bunkerSpotData} config={bunkerSpotConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Vessel supply — Capesize fleet</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={vesselSupplyData} config={vesselSupplyConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Cargo qty &amp; freight rate per week</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={cargoFreightData} config={cargoFreightConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Fixture count by status</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={fixtureStatusData} config={fixtureStatusConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Route Detail</SectionLabel>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Avg freight rate by route</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={avgRateByRouteData} config={avgRateByRouteConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Fixture count by owner</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={ownerFixData} config={ownerFixConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Congestion Context</SectionLabel>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-heading-sm">Port congestion index — port A</CardTitle>
              <select value={congPortA} onChange={e => setCongPortA(e.target.value)}
                className="text-body-sm border border-[var(--color-border-primary-subtle)] rounded px-2 py-1">
                <option value="qingdao">Qingdao</option>
                <option value="dampier">Dampier</option>
                <option value="pt-hedland">Pt Hedland</option>
                <option value="ponta-madeira">Ponta Madeira</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <Chart type="line" data={congestionAData} config={congestionAConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-heading-sm">Port congestion — port B</CardTitle>
              <select value={congPortB} onChange={e => setCongPortB(e.target.value)}
                className="text-body-sm border border-[var(--color-border-primary-subtle)] rounded px-2 py-1">
                <option value="ponta-madeira">Ponta Madeira</option>
                <option value="tubarao">Tubarao</option>
                <option value="guaiba">Guaiba</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <Chart type="line" data={congestionBData} config={congestionBConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RateHistoryTab() {
  return (
    <div className="flex flex-col">
      <DeskContextStrip section="freight" />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Freight rate by route</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={rateByRouteData} config={rateByRouteConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Index rate benchmarks — BCI / BPI</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={indexBenchmarkData} config={indexBenchmarkConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Seasonal comparison</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={seasonalRateData} config={seasonalRateConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Rate volatility — monthly range</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={volatilityData} config={volatilityConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RouteListTab() {
  return (
    <div className="flex flex-col">
      <DeskContextStrip section="freight" />
      <Card>
        <CardContent className="p-6">
          <p className="text-body-md text-[var(--color-text-secondary)]">Route list will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main component ---

function GlobalMarketFreight() {
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("overview"));

  const headerTabs = useMemo(
    () => (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList size="s">
          <TabsTrigger size="s" value="overview">Overview</TabsTrigger>
          <TabsTrigger size="s" value="rate-history">Rate history</TabsTrigger>
          <TabsTrigger size="s" value="route-list">Route list</TabsTrigger>
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
      {tab === "overview" && <OverviewTab />}
      {tab === "rate-history" && <RateHistoryTab />}
      {tab === "route-list" && <RouteListTab />}
    </div>
  );
}

export default GlobalMarketFreight;
