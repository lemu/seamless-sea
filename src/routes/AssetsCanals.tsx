import { useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Tabs, TabsList, TabsTrigger, Button, Badge,
  Card, CardHeader, CardTitle, CardContent,
} from "@rafal.lemieszewski/tide-ui";
import { Chart } from "@rafal.lemieszewski/tide-ui/chart";
import { DataTable } from "@rafal.lemieszewski/tide-ui/data-table";
import { useHeaderTabs, useHeaderActions } from "../hooks";
import { Upload } from "lucide-react";

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

// --- Static data ---

type ChokepointRow = {
  name: string; type: string; region: string; status: string;
  queued: number; avgWait: string; dailyTransits: number; ytdTransits: string;
};

const chokepointColumns: ColumnDef<ChokepointRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "region", header: "Region" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.original.status;
      const intent = s === "Open" ? "success" : s === "Seasonal" ? "warning" : "neutral";
      return <Badge intent={intent}>{s}</Badge>;
    },
  },
  { accessorKey: "queued", header: "Queued" },
  { accessorKey: "avgWait", header: "Avg Wait" },
  { accessorKey: "dailyTransits", header: "Daily Transits" },
  { accessorKey: "ytdTransits", header: "YTD Transits" },
];

const chokepointData: ChokepointRow[] = [
  { name: "Suez Canal", type: "Canal", region: "Middle East", status: "Open", queued: 161, avgWait: "3.8d", dailyTransits: 48, ytdTransits: "18.4K" },
  { name: "Panama Canal", type: "Canal", region: "Central America", status: "Open", queued: 87, avgWait: "2.1d", dailyTransits: 36, ytdTransits: "13.2K" },
  { name: "Bosphorus", type: "Strait", region: "Europe/Asia", status: "Open", queued: 42, avgWait: "1.4d", dailyTransits: 124, ytdTransits: "45.2K" },
  { name: "Kiel Canal", type: "Canal", region: "N Europe", status: "Open", queued: 12, avgWait: "0.3d", dailyTransits: 96, ytdTransits: "35.0K" },
  { name: "St. Lawrence Seaway", type: "Seaway", region: "N America", status: "Seasonal", queued: 8, avgWait: "0.8d", dailyTransits: 18, ytdTransits: "6.5K" },
  { name: "Strait of Malacca", type: "Strait", region: "SE Asia", status: "Flow", queued: 0, avgWait: "0d", dailyTransits: 248, ytdTransits: "90.5K" },
  { name: "Strait of Hormuz", type: "Strait", region: "Middle East", status: "Flow", queued: 0, avgWait: "0d", dailyTransits: 84, ytdTransits: "30.7K" },
];

// Queue Monitoring
const queuedByChokepointConfig = {
  queued: { label: "Vessels queued", type: "bar" as const, yAxisId: "left" as const },
};
const queuedByChokepointData = [
  { name: "Suez", queued: 161 },
  { name: "Panama", queued: 87 },
  { name: "Bosphorus", queued: 42 },
  { name: "Kiel", queued: 12 },
  { name: "St. Lawrence", queued: 8 },
];

const queueTrendConfig = {
  suez: { label: "Suez", type: "bar" as const, yAxisId: "left" as const },
  panama: { label: "Panama", type: "bar" as const, yAxisId: "left" as const },
  bosphorus: { label: "Bosphorus", type: "bar" as const, yAxisId: "left" as const },
};
const queueTrendData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct"].map((m, i) => ({
  name: m,
  suez: 140 + i * 3,
  panama: 72 + i * 2,
  bosphorus: 35 + i,
}));

const avgWaitConfig = {
  days: { label: "Avg wait (days)", type: "bar" as const, yAxisId: "left" as const },
};
const avgWaitData = [
  { name: "Suez", days: 3.8 },
  { name: "Panama", days: 2.1 },
  { name: "Bosphorus", days: 1.4 },
  { name: "St. Lawrence", days: 0.8 },
  { name: "Kiel", days: 0.3 },
];

// Transit Monitoring
const dailyTransitsByChokepointConfig = {
  transits: { label: "Daily transits", type: "bar" as const, yAxisId: "left" as const },
};
const dailyTransitsByChokepointData = [
  { name: "Malacca", transits: 248 },
  { name: "Bosphorus", transits: 124 },
  { name: "Hormuz", transits: 84 },
  { name: "Kiel", transits: 96 },
  { name: "Suez", transits: 48 },
  { name: "Panama", transits: 36 },
  { name: "St. Lawrence", transits: 18 },
];

const dailyTransitsTrendConfig = {
  kiel: { label: "Kiel", type: "line" as const, yAxisId: "left" as const },
  suez: { label: "Suez", type: "line" as const, yAxisId: "left" as const },
  panama: { label: "Panama", type: "line" as const, yAxisId: "left" as const },
  bosphorus: { label: "Bosphorus", type: "line" as const, yAxisId: "left" as const },
};
const dailyTransitsTrendData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m,
  kiel: 90 + i * 0.5,
  suez: 44 + i * 0.3,
  panama: 34 + i * 0.2,
  bosphorus: 120 + i * 0.4,
}));

const ytdByVesselTypeConfig = {
  transits: { label: "YTD transits", type: "bar" as const, yAxisId: "left" as const },
};
const ytdByVesselTypeData = [
  { name: "Bulk", transits: 3840 },
  { name: "Container", transits: 3021 },
  { name: "Tanker", transits: 2652 },
  { name: "LNG", transits: 1298 },
  { name: "Vehicle", transits: 865 },
];

const dailyTransit30DaysConfig = {
  malacca: { label: "Malacca", type: "line" as const, yAxisId: "left" as const },
  suez: { label: "Suez", type: "line" as const, yAxisId: "left" as const },
  panama: { label: "Panama", type: "line" as const, yAxisId: "left" as const },
  bosphorus: { label: "Bosphorus", type: "line" as const, yAxisId: "left" as const },
};
const dailyTransit30DaysData = Array.from({ length: 30 }, (_, i) => ({
  name: `D${i + 1}`,
  malacca: 240 + Math.round(Math.sin(i * 0.4) * 15),
  suez: 46 + Math.round(Math.sin(i * 0.3) * 5),
  panama: 34 + Math.round(Math.sin(i * 0.5) * 4),
  bosphorus: 122 + Math.round(Math.sin(i * 0.35) * 10),
}));

const vesselsByDwtConfig = {
  count: { label: "Vessels", type: "bar" as const, yAxisId: "left" as const },
};
const vesselsByDwtData = [
  { name: "VLCC/VLOC", count: 428 },
  { name: "Capesize", count: 612 },
  { name: "Panamax", count: 984 },
  { name: "Supramax", count: 1248 },
  { name: "Handymax", count: 876 },
  { name: "Handysize", count: 692 },
];

const avgDraftConfig = {
  pct: { label: "Draft utilization %", type: "bar" as const, yAxisId: "left" as const },
};
const avgDraftData = [
  { name: "Malacca", pct: 82 },
  { name: "Hormuz", pct: 74 },
  { name: "Suez", pct: 68 },
  { name: "Bosphorus", pct: 61 },
  { name: "Panama", pct: 58 },
  { name: "Kiel", pct: 44 },
];

// Malacca Detail
const malaccaFlowConfig = {
  vessels: { label: "Vessels/day", type: "line" as const, yAxisId: "left" as const },
};
const malaccaFlowData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({
  name: m, vessels: 238 + i * 1.5,
}));

const malaccaTypeConfig = {
  tanker: { label: "Tanker", type: "line" as const, yAxisId: "left" as const },
  bulk: { label: "Bulk", type: "line" as const, yAxisId: "left" as const },
  container: { label: "Container", type: "line" as const, yAxisId: "left" as const },
  other: { label: "Other", type: "line" as const, yAxisId: "left" as const },
};
const malaccaTypeData = Array.from({ length: 30 }, (_, i) => ({
  name: `D${i + 1}`,
  tanker: 82 + Math.round(Math.sin(i * 0.4) * 6),
  bulk: 64 + Math.round(Math.sin(i * 0.5) * 5),
  container: 72 + Math.round(Math.sin(i * 0.3) * 7),
  other: 28 + Math.round(Math.sin(i * 0.6) * 3),
}));

// --- Canals Overview ---
function CanalsOverview() {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard value="7" label="Chokepoints monitored" />
        <KpiCard value="310" label="Vessels queued" />
        <KpiCard value="193K" label="Transits YTD" />
        <KpiCard value="1.8 days" label="Avg wait" />
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-heading-sm">All chokepoints</CardTitle></CardHeader>
        <CardContent>
          <DataTable data={chokepointData} columns={chokepointColumns} borderStyle="horizontal" />
        </CardContent>
      </Card>

      <SectionLabel>Queue Monitoring</SectionLabel>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <MapPlaceholder title="Global chokepoints" />
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Vessels queued</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={queuedByChokepointData} config={queuedByChokepointConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Queue size trend</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={queueTrendData} config={queueTrendConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Avg wait time</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={avgWaitData} config={avgWaitConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Transit Monitoring</SectionLabel>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Daily transits by chokepoint</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={dailyTransitsByChokepointData} config={dailyTransitsByChokepointConfig} height={260} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Daily transits — canals &amp; Bosphorus</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={dailyTransitsTrendData} config={dailyTransitsTrendConfig} height={260} showLegend={true} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">YTD transits by vessel type</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={ytdByVesselTypeData} config={ytdByVesselTypeConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Daily transit trend — 30 days</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={dailyTransit30DaysData} config={dailyTransit30DaysConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Vessels by DWT class</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={vesselsByDwtData} config={vesselsByDwtConfig} height={260} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Avg draft utilization</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={avgDraftData} config={avgDraftConfig} height={260} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Strait of Malacca Detail</SectionLabel>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Daily vessel flow — Malacca Strait</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={malaccaFlowData} config={malaccaFlowConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Traffic by vessel type — 30 days</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={malaccaTypeData} config={malaccaTypeConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AssetsCanals() {
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("overview"));

  const headerTabs = useMemo(
    () => (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList size="s">
          <TabsTrigger size="s" value="overview">Overview</TabsTrigger>
          <TabsTrigger size="s" value="list">Chokepoints list</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
    [tab, setTab]
  );

  useHeaderTabs(headerTabs);

  const headerActions = useMemo(() => <Button variant="default" icon={Upload} iconPosition="left">Export</Button>, []);
  useHeaderActions(headerActions);

  if (tab === "overview") {
    return (
      <div className="m-6 flex flex-col gap-[var(--space-l)]">
        <CanalsOverview />
      </div>
    );
  }

  return (
    <div className="m-6 flex flex-col gap-[var(--space-l)]">
      <div className="rounded-l border border-[var(--color-border-primary-subtle)] p-6">
        <p className="text-body-md text-[var(--color-text-secondary)]">
          Chokepoints list will be displayed here.
        </p>
      </div>
    </div>
  );
}

export default AssetsCanals;
