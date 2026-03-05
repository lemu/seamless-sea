import { useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Tabs, TabsList, TabsTrigger, Button,
  Card, CardHeader, CardTitle, CardContent,
} from "@rafal.lemieszewski/tide-ui";
import { Chart } from "@rafal.lemieszewski/tide-ui/chart";
import { DataTable } from "@rafal.lemieszewski/tide-ui/data-table";
import { useHeaderTabs, useHeaderActions } from "../hooks";
import { Upload } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

type VesselRow = {
  _id: string;
  name: string;
  imoNumber?: string;
  dwt?: number;
  vesselClass?: string;
  flag?: string;
  speedKnots?: number;
  ownerName?: string | null;
};

const CONTAINER_CLASSES = ["ulcv", "megamax", "oscar class", "24k class", "golden class", "evergreen", "one megamax"];
const TANKER_CLASSES = ["vlcc", "ulcc", "aframax", "suezmax", "ti class"];

function deriveVesselType(vesselClass?: string): string {
  if (!vesselClass) return "—";
  const vc = vesselClass.toLowerCase();
  if (CONTAINER_CLASSES.some((c) => vc.includes(c))) return "Container";
  if (TANKER_CLASSES.some((c) => vc.includes(c))) return "Tanker";
  return "Bulk";
}

const vesselColumns: ColumnDef<VesselRow>[] = [
  {
    accessorKey: "name",
    header: "Vessel Name",
    cell: ({ row }) => (
      <Link to={`/assets/vessels/${row.original._id}`} className="font-medium hover:underline" style={{ color: "var(--color-text-brand-bold)" }}>
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "imoNumber",
    header: "IMO",
    cell: ({ row }) => (
      <span className="font-mono text-body-sm">{row.original.imoNumber ?? "—"}</span>
    ),
  },
  {
    accessorKey: "dwt",
    header: () => <span className="block text-right">DWT</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {row.original.dwt != null ? row.original.dwt.toLocaleString() : "—"}
      </span>
    ),
  },
  {
    id: "type",
    header: "Type",
    cell: ({ row }) => deriveVesselType(row.original.vesselClass),
  },
  {
    accessorKey: "vesselClass",
    header: "Sub-type",
    cell: ({ row }) => row.original.vesselClass ?? "—",
  },
  {
    accessorKey: "flag",
    header: "Flag",
    cell: ({ row }) => row.original.flag ?? "—",
  },
  {
    id: "status",
    header: "Status",
    cell: () => "—",
  },
  {
    accessorKey: "speedKnots",
    header: "Speed",
    cell: ({ row }) =>
      row.original.speedKnots != null ? `${row.original.speedKnots} kn` : "—",
  },
  {
    id: "owner",
    header: "Owner",
    cell: ({ row }) => row.original.ownerName ?? "—",
  },
  {
    id: "operator",
    header: "Operator",
    cell: () => "—",
  },
];

// --- Overview static data ---

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

// Positions
type PositionRow = {
  vessel: string; type: string; dwt: number; status: string;
  speed: string; position: string; eta: string;
};
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

const vesselsBySectorConfig = {
  count: { label: "Vessels", type: "bar" as const, yAxisId: "left" as const },
};
const vesselsBySectorData = [
  { name: "Iron Ore", count: 1200 },
  { name: "Coal", count: 840 },
  { name: "Grain", count: 420 },
  { name: "Fert.", count: 210 },
  { name: "Bauxite", count: 180 },
];
const vesselsBySubtypeConfig = {
  count: { label: "Vessels", type: "bar" as const, yAxisId: "left" as const },
};
const vesselsBySubtypeData = [
  { name: "Cape", count: 820 },
  { name: "Pana", count: 640 },
  { name: "Supra", count: 480 },
  { name: "Handy", count: 320 },
  { name: "Hndy-S", count: 210 },
];

// Speed & Bunker
const speedTrendConfig = {
  speed: { label: "Avg Speed (kn)", type: "line" as const, yAxisId: "left" as const },
};
const speedTrendData = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
].map((m, i) => ({ name: m, speed: 11.0 + Math.sin(i * 0.5) * 0.4 }));

const speedBunkerConfig = {
  speed: { label: "Avg Speed", type: "bar" as const, yAxisId: "left" as const },
  bunker: { label: "Bunker Cons.", type: "line" as const, yAxisId: "left" as const },
};
const speedBunkerData = speedTrendData.map((d) => ({ ...d, bunker: 28 + (d.speed - 11) * 3 }));

const speedBySectorConfig = {
  speed: { label: "Avg Speed (kn)", type: "bar" as const, yAxisId: "left" as const },
};
const speedBySectorData = [
  { name: "Iron Ore", speed: 11.8 },
  { name: "Coal", speed: 11.2 },
  { name: "Grain", speed: 11.5 },
  { name: "Fertilizer", speed: 10.9 },
  { name: "Bauxite", speed: 10.6 },
];
const speedBySubtypeConfig = {
  speed: { label: "Avg Speed (kn)", type: "bar" as const, yAxisId: "left" as const },
};
const speedBySubtypeData = [
  { name: "Capesize", speed: 11.8 },
  { name: "Panamax", speed: 11.3 },
  { name: "Supramax", speed: 11.0 },
  { name: "Handymax", speed: 10.7 },
  { name: "Handysize", speed: 10.4 },
];

// Voyages
const voyageTrendConfig = {
  capesize: { label: "Capesize", type: "line" as const, yAxisId: "left" as const },
  panamax: { label: "Panamax", type: "line" as const, yAxisId: "left" as const },
  supramax: { label: "Supramax", type: "line" as const, yAxisId: "left" as const },
  handymax: { label: "Handymax", type: "line" as const, yAxisId: "left" as const },
};
const voyageTrendData = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
].map((m, i) => ({
  name: m,
  capesize: 320 + i * 5,
  panamax: 280 + i * 4,
  supramax: 210 + i * 3,
  handymax: 160 + i * 2,
}));

const tonneMilesTrendConfig = {
  capesize: { label: "Capesize", type: "line" as const, yAxisId: "left" as const },
  panamax: { label: "Panamax", type: "line" as const, yAxisId: "left" as const },
  supramax: { label: "Supramax", type: "line" as const, yAxisId: "left" as const },
  handymax: { label: "Handymax", type: "line" as const, yAxisId: "left" as const },
};
const tonneMilesTrendData = voyageTrendData.map((d) => ({
  name: d.name,
  capesize: d.capesize * 2.6,
  panamax: d.panamax * 1.8,
  supramax: d.supramax * 1.2,
  handymax: d.handymax * 0.9,
}));

type PortTableRow = { port: string; country: string; calls: number; dwt: string };
const portTableColumns: ColumnDef<PortTableRow>[] = [
  { accessorKey: "port", header: "Port" },
  { accessorKey: "country", header: "Country" },
  { accessorKey: "calls", header: "Calls", cell: ({ row }) => row.original.calls.toLocaleString() },
  { accessorKey: "dwt", header: "DWT (M)" },
];
const topLoadingData: PortTableRow[] = [
  { port: "Port Hedland", country: "Australia", calls: 1248, dwt: "182.4" },
  { port: "Tubarao", country: "Brazil", calls: 984, dwt: "142.1" },
  { port: "Qingdao", country: "China", calls: 872, dwt: "98.6" },
  { port: "Dampier", country: "Australia", calls: 741, dwt: "108.2" },
  { port: "Newcastle", country: "Australia", calls: 628, dwt: "76.4" },
];
const topDischargeData: PortTableRow[] = [
  { port: "Qingdao", country: "China", calls: 2184, dwt: "298.4" },
  { port: "Caofeidian", country: "China", calls: 1842, dwt: "264.1" },
  { port: "Jing Tang", country: "China", calls: 1248, dwt: "178.6" },
  { port: "Rotterdam", country: "Netherlands", calls: 641, dwt: "94.2" },
  { port: "Kashima", country: "Japan", calls: 528, dwt: "72.8" },
];

// --- Vessels Overview ---
function VesselsOverview() {
  return (
    <div className="flex flex-col">
      <SectionLabel>Positions</SectionLabel>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard value="2,847" label="Active vessels" />
        <KpiCard value="61%" label="Laden" />
        <KpiCard value="11.3 kn" label="Avg speed" />
        <KpiCard value="42.1 kg/t" label="CO₂ intensity" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-heading-sm">Active vessels — positions</CardTitle></CardHeader>
            <CardContent>
              <DataTable data={positionData} columns={positionColumns} borderStyle="horizontal" />
            </CardContent>
          </Card>
        </div>
        <div>
          <MapPlaceholder title="World map — vessel positions" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Vessels by sector</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={vesselsBySectorData} config={vesselsBySectorConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Vessels by sub-type</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={vesselsBySubtypeData} config={vesselsBySubtypeConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Speed &amp; Bunker</SectionLabel>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <KpiCard value="11.8 kn" label="Avg speed laden" />
        <KpiCard value="10.9 kn" label="Avg speed ballast" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Fleet avg speed trend — 12 months</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={speedTrendData} config={speedTrendConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Speed + bunker consumption</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={speedBunkerData} config={speedBunkerConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Avg speed by sector</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={speedBySectorData} config={speedBySectorConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Speed by sub-type</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={speedBySubtypeData} config={speedBySubtypeConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Voyages</SectionLabel>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard value="1,847" label="Active voyages" />
        <KpiCard value="28.4 days" label="Avg duration" />
        <KpiCard value="847K" label="Avg tonne-miles" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Voyage count trend — 12 months</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={voyageTrendData} config={voyageTrendConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Tonne-miles trend — 12 months</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={tonneMilesTrendData} config={tonneMilesTrendConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Top 5 loading ports</CardTitle></CardHeader>
          <CardContent>
            <DataTable data={topLoadingData} columns={portTableColumns} borderStyle="horizontal" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Top 5 discharge ports</CardTitle></CardHeader>
          <CardContent>
            <DataTable data={topDischargeData} columns={portTableColumns} borderStyle="horizontal" />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-2">
        <CardContent className="p-4">
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            Click any vessel name in tables above to open vessel profile — or use the search bar (⌘K)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AssetsVessels() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.endsWith("/list") ? "list" : "overview";
  const setTab = useCallback((value: string) => navigate(`/assets/vessels/${value}`), [navigate]);
  const vessels = useQuery(api.vessels.listWithDetails);

  const headerTabs = useMemo(
    () => (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList size="s">
          <TabsTrigger size="s" value="overview">Overview</TabsTrigger>
          <TabsTrigger size="s" value="list">Vessels list</TabsTrigger>
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
        <VesselsOverview />
      </div>
    );
  }

  return (
    <div className="m-6 flex flex-col gap-[var(--space-l)]">
      <div className="flex flex-col gap-4">
        <h2 className="text-heading-md text-text-primary">All Vessels</h2>
        <DataTable
          data={vessels ?? []}
          columns={vesselColumns}
          borderStyle="horizontal"
          isLoading={vessels === undefined}
        />
      </div>
    </div>
  );
}

export default AssetsVessels;
