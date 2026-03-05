import { useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Tabs, TabsList, TabsTrigger, Button,
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

type FleetRow = {
  fleet: string; vessels: number; dwt: string; avgSpeed: string;
  pctLaden: string; utilization: string; ciiMix: string; lastUpdated: string;
};
const fleetColumns: ColumnDef<FleetRow>[] = [
  { accessorKey: "fleet", header: "Fleet" },
  { accessorKey: "vessels", header: "Vessels" },
  { accessorKey: "dwt", header: "DWT" },
  { accessorKey: "avgSpeed", header: "Avg Speed" },
  { accessorKey: "pctLaden", header: "% Laden" },
  { accessorKey: "utilization", header: "Utilization" },
  { accessorKey: "ciiMix", header: "CII mix" },
  { accessorKey: "lastUpdated", header: "Last updated" },
];
const fleetData: FleetRow[] = [
  { fleet: "Brazil Iron Ore Fleet", vessels: 12, dwt: "2.16M", avgSpeed: "12.1 kts", pctLaden: "75%", utilization: "72%", ciiMix: "B/C", lastUpdated: "Feb 10" },
  { fleet: "Competitor Watch", vessels: 8, dwt: "1.44M", avgSpeed: "11.8 kts", pctLaden: "62%", utilization: "65%", ciiMix: "C/D", lastUpdated: "Feb 08" },
  { fleet: "Australia Coal Carriers", vessels: 6, dwt: "0.98M", avgSpeed: "11.5 kts", pctLaden: "83%", utilization: "78%", ciiMix: "B", lastUpdated: "Feb 12" },
];

const vesselsByFleetConfig = {
  count: { label: "Vessels", type: "bar" as const, yAxisId: "left" as const },
};
const vesselsByFleetData = [
  { name: "Brazil Iron Ore", count: 12 },
  { name: "Competitor Watch", count: 8 },
  { name: "Australia Coal", count: 6 },
];

// Performance
const speedByFleetConfig = {
  speed: { label: "Avg Speed (kts)", type: "bar" as const, yAxisId: "left" as const },
};
const speedByFleetData = [
  { name: "Brazil IO", speed: 12.1 },
  { name: "Comp. Watch", speed: 11.8 },
  { name: "Aus. Coal", speed: 11.5 },
];

const ladenBallastConfig = {
  laden: { label: "Laden", type: "bar" as const, yAxisId: "left" as const },
  ballast: { label: "Ballast", type: "bar" as const, yAxisId: "left" as const },
};
const ladenBallastData = [
  { name: "Brazil IO", laden: 75, ballast: 25 },
  { name: "Comp. Watch", laden: 62, ballast: 38 },
  { name: "Aus. Coal", laden: 83, ballast: 17 },
];

const utilizationByFleetConfig = {
  utilization: { label: "Utilization %", type: "bar" as const, yAxisId: "left" as const },
};
const utilizationByFleetData = [
  { name: "Australia Coal", utilization: 78 },
  { name: "Brazil Iron Ore", utilization: 72 },
  { name: "Competitor Watch", utilization: 65 },
];

const ciiDistConfig = {
  count: { label: "Vessels", type: "bar" as const, yAxisId: "left" as const },
};
const ciiDistData = [
  { name: "A", count: 2 },
  { name: "B", count: 8 },
  { name: "C", count: 12 },
  { name: "D", count: 3 },
  { name: "E", count: 1 },
];

// Activity
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const voyagesPerMonthConfig = {
  voyages: { label: "Voyages", type: "bar" as const, yAxisId: "left" as const },
};
const voyagesPerMonthData = months.map((m, i) => ({ name: m, voyages: 80 + i * 3 }));

const tonneMilesTrendConfig = {
  tm: { label: "Tonne-miles (B)", type: "line" as const, yAxisId: "left" as const },
};
const tonneMilesTrendData = months.map((m, i) => ({ name: m, tm: 1.2 + i * 0.05 }));

// --- Overview ---
function FleetsOverview() {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard value="24" label="Total fleets" />
        <KpiCard value="312" label="Vessels tracked" />
        <KpiCard value="13" label="Avg fleet size" />
        <KpiCard value="67%" label="Avg utilization" />
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-heading-sm">Fleet comparison</CardTitle></CardHeader>
        <CardContent>
          <DataTable data={fleetData} columns={fleetColumns} borderStyle="horizontal" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <MapPlaceholder title="Vessel positions — all fleets" />
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Vessels by fleet</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={vesselsByFleetData} config={vesselsByFleetConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Performance</SectionLabel>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Avg speed by fleet</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={speedByFleetData} config={speedByFleetConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Laden vs ballast by fleet</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={ladenBallastData} config={ladenBallastConfig} height={220} showLegend={true} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Utilization by fleet</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={utilizationByFleetData} config={utilizationByFleetConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">CII rating distribution</CardTitle></CardHeader>
          <CardContent>
            <Chart type="horizontal-bar" data={ciiDistData} config={ciiDistConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Activity</SectionLabel>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Voyages per month — all fleets</CardTitle></CardHeader>
          <CardContent>
            <Chart type="bar" data={voyagesPerMonthData} config={voyagesPerMonthConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-heading-sm">Combined tonne-miles trend</CardTitle></CardHeader>
          <CardContent>
            <Chart type="line" data={tonneMilesTrendData} config={tonneMilesTrendConfig} height={220} showLegend={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AssetsFleets() {
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("overview"));

  const headerTabs = useMemo(
    () => (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList size="s">
          <TabsTrigger size="s" value="overview">Overview</TabsTrigger>
          <TabsTrigger size="s" value="list">Fleets list</TabsTrigger>
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
        <FleetsOverview />
      </div>
    );
  }

  return (
    <div className="m-6 flex flex-col gap-[var(--space-l)]">
      <div className="rounded-l border border-[var(--color-border-primary-subtle)] p-6">
        <p className="text-body-md text-[var(--color-text-secondary)]">
          Fleets list will be displayed here.
        </p>
      </div>
    </div>
  );
}

export default AssetsFleets;
