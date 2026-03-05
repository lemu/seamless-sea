import { useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Tabs, TabsList, TabsTrigger, Button, Skeleton,
  Card, CardHeader, CardTitle, CardContent,
} from "@rafal.lemieszewski/tide-ui";
import { Chart } from "@rafal.lemieszewski/tide-ui/chart";
import { DataTable } from "@rafal.lemieszewski/tide-ui/data-table";
import { useHeaderTabs, useHeaderActions } from "../hooks";
import { Upload } from "lucide-react";

type PortRow = {
  _id: string;
  name: string;
  country: string;
  unlocode?: string;
  zone?: string;
  berths?: number;
  operationalStatus?: string;
};

const portColumns: ColumnDef<PortRow>[] = [
  {
    accessorKey: "name",
    header: "Port name",
    cell: ({ row }) => (
      <Link
        to={`/assets/ports/${row.original._id}`}
        className="text-[var(--color-text-brand-bold)] hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "country", header: "Country" },
  {
    accessorKey: "unlocode",
    header: "UN/LOCODE",
    cell: ({ row }) => row.original.unlocode ?? "—",
  },
  {
    accessorKey: "zone",
    header: "Zone",
    cell: ({ row }) => row.original.zone ?? "—",
  },
  {
    accessorKey: "berths",
    header: "Berths",
    cell: ({ row }) => row.original.berths ?? "—",
  },
  {
    accessorKey: "operationalStatus",
    header: "Status",
    cell: ({ row }) => row.original.operationalStatus ?? "—",
  },
];

// --- Helpers ---

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

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Callings
const callsByCountryConfig = {
  calls: { label: "Port calls", type: "bar" as const, yAxisId: "left" as const },
};
const callsByCountryData = [
  { name: "China", calls: 3240 },
  { name: "Japan", calls: 1820 },
  { name: "Australia", calls: 1480 },
  { name: "S. Korea", calls: 1210 },
  { name: "Brazil", calls: 980 },
  { name: "Singapore", calls: 870 },
  { name: "India", calls: 740 },
  { name: "Indonesia", calls: 680 },
];

const dailyCallsTrendConfig = {
  calls: { label: "Port calls", type: "bar" as const, yAxisId: "left" as const },
};
const dailyCallsTrendData = months.map((m, i) => ({ name: m, calls: 980 + i * 20 }));

const callsByCargoConfig = {
  calls: { label: "Port calls", type: "bar" as const, yAxisId: "left" as const },
};
const callsByCargoData = [
  { name: "Iron Ore", calls: 3840 },
  { name: "Coal", calls: 2960 },
  { name: "Grain", calls: 1840 },
  { name: "Fert.", calls: 980 },
  { name: "Other", calls: 1420 },
];

const callsByVesselSizeConfig = {
  calls: { label: "Port calls", type: "bar" as const, yAxisId: "left" as const },
};
const callsByVesselSizeData = [
  { name: "VLOC", calls: 420 },
  { name: "Cape", calls: 1840 },
  { name: "Pana", calls: 2960 },
  { name: "Supra", calls: 3120 },
  { name: "Handy", calls: 2480 },
];

// Waiting Times
const waitByPortConfig = {
  hours: { label: "Avg wait (h)", type: "bar" as const, yAxisId: "left" as const },
};
const waitByPortData = [
  { name: "Qingdao", hours: 42.1 },
  { name: "Santos", hours: 38.4 },
  { name: "Caofeidian", hours: 36.8 },
  { name: "Paradip", hours: 32.2 },
  { name: "Richards Bay", hours: 28.7 },
  { name: "Jing Tang", hours: 24.1 },
  { name: "Newcastle", hours: 21.4 },
  { name: "Hay Point", hours: 18.9 },
];

const waitTrendConfig = {
  hours: { label: "Avg wait (h)", type: "line" as const, yAxisId: "left" as const },
};
const waitTrendData = months.map((m, i) => ({ name: m, hours: 22 + Math.sin(i * 0.6) * 4 }));

// Congestion
const congestionTrendConfig = {
  index: { label: "Congestion Index", type: "line" as const, yAxisId: "left" as const },
  vessels: { label: "Vessels waiting", type: "line" as const, yAxisId: "left" as const },
};
const congestionTrendData = months.map((m, i) => ({
  name: m,
  index: 3.2 + Math.sin(i * 0.5) * 0.8,
  vessels: 280 + i * 5,
}));

const congestionByRegionConfig = {
  eAsia: { label: "E Asia", type: "bar" as const, yAxisId: "left" as const },
  seAsia: { label: "SE Asia", type: "bar" as const, yAxisId: "left" as const },
  sAsia: { label: "S Asia", type: "bar" as const, yAxisId: "left" as const },
  eSam: { label: "E Coast S Am", type: "bar" as const, yAxisId: "left" as const },
  wAfrica: { label: "W Africa", type: "bar" as const, yAxisId: "left" as const },
  nEurope: { label: "N Europe", type: "bar" as const, yAxisId: "left" as const },
};
const congestionByRegionData = months.map((m, i) => ({
  name: m,
  eAsia: 120 + i * 2,
  seAsia: 48 + i,
  sAsia: 62 + i,
  eSam: 38 + i,
  wAfrica: 22 + i,
  nEurope: 18 + i,
}));

type WeeklySnapshotRow = { port: string; waiting: number; avgWait: string; trend: string };
const weeklySnapshotColumns: ColumnDef<WeeklySnapshotRow>[] = [
  { accessorKey: "port", header: "Port" },
  { accessorKey: "waiting", header: "Vessels waiting" },
  { accessorKey: "avgWait", header: "Avg wait" },
  { accessorKey: "trend", header: "Trend" },
];
const weeklySnapshotData: WeeklySnapshotRow[] = [
  { port: "Qingdao", waiting: 53, avgWait: "42.1h", trend: "↑" },
  { port: "Santos", waiting: 38, avgWait: "31.4h", trend: "→" },
  { port: "Caofeidian", waiting: 31, avgWait: "36.8h", trend: "↑" },
  { port: "Paradip", waiting: 28, avgWait: "32.2h", trend: "↓" },
];

// --- Ports Overview ---
function PortsOverview() {
  return (
    <div className="flex flex-col">
      <SectionLabel>Callings</SectionLabel>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard value="12,847" label="Port calls MTD" />
        <KpiCard value="2,341" label="Vessels calling" />
        <KpiCard value="428M" label="Total DWT" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Port calls by country (top 8)</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={callsByCountryData} config={callsByCountryConfig} height={280} showLegend={false} />
          </CardContent>
        </Card>
        <MapPlaceholder title="World map — port callings" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Daily calls trend</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={dailyCallsTrendData} config={dailyCallsTrendConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">By cargo type</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={callsByCargoData} config={callsByCargoConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Calls by vessel size</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={callsByVesselSizeData} config={callsByVesselSizeConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Waiting Times</SectionLabel>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <KpiCard value="18.4h" label="Avg waiting time" />
        <KpiCard value="23%" label="Ports with delays" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Avg waiting time by port (top 8)</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={waitByPortData} config={waitByPortConfig} height={280} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Waiting time trend — 12 months</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={waitTrendData} config={waitTrendConfig} height={280} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Congestion</SectionLabel>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard value="47" label="Congested ports" />
        <KpiCard value="312" label="Vessels waiting" />
        <KpiCard value="47.2M" label="Total wait DWT" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Congestion index + vessel count</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={congestionTrendData} config={congestionTrendConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Congestion by region — 12 months</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={congestionByRegionData} config={congestionByRegionConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-heading-sm">Weekly snapshot</CardTitle></CardHeader>
        <CardContent>
          <DataTable data={weeklySnapshotData} columns={weeklySnapshotColumns} borderStyle="horizontal" />
        </CardContent>
      </Card>

      <Card className="mt-2">
        <CardContent className="p-4">
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            Click any port name in tables above to open port profile — or use the search bar (⌘K)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AssetsPorts() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.endsWith("/list") ? "list" : "overview";
  const setTab = useCallback((value: string) => navigate(`/assets/ports/${value}`), [navigate]);

  const ports = useQuery(api.ports.list);

  const headerTabs = useMemo(
    () => (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList size="s">
          <TabsTrigger size="s" value="overview">Overview</TabsTrigger>
          <TabsTrigger size="s" value="list">Ports list</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
    [tab, setTab]
  );

  useHeaderTabs(headerTabs);

  const headerActions = useMemo(() => <Button variant="default" icon={Upload} iconPosition="left">Export</Button>, []);
  useHeaderActions(headerActions);

  const tableData: PortRow[] = useMemo(
    () => (ports ?? []).map((p) => ({
      _id: p._id,
      name: p.name,
      country: p.country,
      unlocode: p.unlocode,
      zone: p.zone,
      berths: p.berths,
      operationalStatus: p.operationalStatus,
    })),
    [ports]
  );

  if (tab === "overview") {
    return (
      <div className="m-6 flex flex-col gap-[var(--space-l)]">
        <PortsOverview />
      </div>
    );
  }

  if (ports === undefined) {
    return (
      <div className="m-6 flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="m-6 flex flex-col gap-[var(--space-l)]">
      <DataTable
        data={tableData}
        columns={portColumns}
        borderStyle="horizontal"
      />
    </div>
  );
}

export default AssetsPorts;
