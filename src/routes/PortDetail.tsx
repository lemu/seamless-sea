import { useParams } from "react-router";
import { Link } from "react-router";
import { useQueryState, parseAsString } from "nuqs";
import { type ColumnDef } from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Anchor } from "lucide-react";
import {
  AttributesList,
  AttributesItem,
  AttributesLabel,
  AttributesValue,
  Badge,
  Separator,
  Skeleton,
  Empty,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@rafal.lemieszewski/tide-ui";
import { Chart } from "@rafal.lemieszewski/tide-ui/chart";
import { DataTable } from "@rafal.lemieszewski/tide-ui/data-table";
import { AddToBoardButton } from "../components/AddToBoardButton";

// --- Column definitions ---

type VesselInPortRow = {
  vessel: string;
  imo: string;
  type: string;
  dwt: number;
  status: "Berth" | "Anchorage" | "Waiting";
  arrived: string;
  etaDeparture: string;
  cargo: string;
};

const vesselInPortColumns: ColumnDef<VesselInPortRow>[] = [
  {
    accessorKey: "vessel",
    header: "Vessel",
    cell: ({ row }) => (
      <Link to="/assets/vessels" className="text-[var(--color-text-brand-bold)] hover:underline">
        {row.original.vessel}
      </Link>
    ),
  },
  { accessorKey: "imo", header: "IMO" },
  { accessorKey: "type", header: "Type" },
  {
    accessorKey: "dwt",
    header: "DWT",
    cell: ({ row }) => row.original.dwt.toLocaleString(),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.original.status;
      const intent = s === "Berth" ? "success" : s === "Waiting" ? "warning" : "neutral";
      return <Badge intent={intent}>{s}</Badge>;
    },
  },
  { accessorKey: "arrived", header: "Arrived" },
  { accessorKey: "etaDeparture", header: "ETA Departure" },
  { accessorKey: "cargo", header: "Cargo" },
];

type PortCallHistoryRow = {
  vessel: string;
  type: string;
  arrived: string;
  departed: string;
  cargo: string;
  volume: number;
  stay: number;
};

const portCallHistoryColumns: ColumnDef<PortCallHistoryRow>[] = [
  {
    accessorKey: "vessel",
    header: "Vessel",
    cell: ({ row }) => (
      <Link to="/assets/vessels" className="text-[var(--color-text-brand-bold)] hover:underline">
        {row.original.vessel}
      </Link>
    ),
  },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "arrived", header: "Arrived" },
  { accessorKey: "departed", header: "Departed" },
  { accessorKey: "cargo", header: "Cargo" },
  {
    accessorKey: "volume",
    header: "Volume (mt m)",
    cell: ({ row }) => row.original.volume.toLocaleString(),
  },
  { accessorKey: "stay", header: "Stay (days)" },
];

type CongestionRow = {
  vessel: string;
  type: string;
  dwt: number;
  arrivedAnchorage: string;
  waitSoFar: string;
  expectedBerth: string;
  cargo: string;
};

const congestionColumns: ColumnDef<CongestionRow>[] = [
  {
    accessorKey: "vessel",
    header: "Vessel",
    cell: ({ row }) => (
      <Link to="/assets/vessels" className="text-[var(--color-text-brand-bold)] hover:underline">
        {row.original.vessel}
      </Link>
    ),
  },
  { accessorKey: "type", header: "Type" },
  {
    accessorKey: "dwt",
    header: "DWT",
    cell: ({ row }) => row.original.dwt.toLocaleString(),
  },
  { accessorKey: "arrivedAnchorage", header: "Arrived at anchorage" },
  { accessorKey: "waitSoFar", header: "Wait so far" },
  { accessorKey: "expectedBerth", header: "Expected berth" },
  { accessorKey: "cargo", header: "Cargo" },
];

// --- Chart configs ---

const arrivalsByDayConfig = {
  value: { label: "Arrivals", type: "bar" as const, yAxisId: "left" as const },
};
const portCallsConfig = {
  calls: { label: "Port calls", type: "bar" as const, yAxisId: "left" as const },
};
const cargoVolumeConfig = {
  volume: { label: "Volume (mt m)", type: "line" as const, yAxisId: "left" as const },
};
const waitTrendConfig = {
  days: { label: "Avg wait (days)", type: "line" as const, yAxisId: "left" as const },
};
const anchorageByDayConfig = {
  value: { label: "Vessels at anchor", type: "bar" as const, yAxisId: "left" as const },
};
const waitDistConfig = {
  lt1:   { label: "<1 day",   type: "bar" as const, yAxisId: "left" as const },
  d1to3: { label: "1–3 days", type: "bar" as const, yAxisId: "left" as const },
  d3to7: { label: "3–7 days", type: "bar" as const, yAxisId: "left" as const },
  gt7:   { label: ">7 days",  type: "bar" as const, yAxisId: "left" as const },
};
const vesselsByTypeConfig = {
  count: { label: "Vessels", type: "bar" as const, yAxisId: "left" as const },
};
const topOriginConfig = {
  count: { label: "Calls", type: "bar" as const, yAxisId: "left" as const },
};
const callsByTypeConfig = {
  count: { label: "Calls", type: "bar" as const, yAxisId: "left" as const },
};
const topCommoditiesConfig = {
  volume: { label: "Volume (mt m)", type: "bar" as const, yAxisId: "left" as const },
};
const avgWaitByTypeConfig = {
  days: { label: "Avg wait (days)", type: "bar" as const, yAxisId: "left" as const },
};

// --- KPI card ---

function KpiCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-4">
      <p className="text-heading-lg">{value}</p>
      <p className="text-body-sm text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}

// --- Skeleton ---

function PortDetailSkeleton() {
  return (
    <div className="flex gap-6 m-6">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="w-56 shrink-0 flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

// --- Main component ---

function PortDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("port-activity"));

  const port = useQuery(
    api.ports.getById,
    id ? { id: id as Id<"ports"> } : "skip"
  );

  const sampleData = useQuery(
    api.portSampleData.getByPort,
    port ? { portId: port._id } : "skip"
  );

  if (port === undefined) {
    return <PortDetailSkeleton />;
  }

  if (port === null) {
    return (
      <div className="m-6">
        <Empty>
          <EmptyContent>
            <EmptyTitle>Port not found</EmptyTitle>
            <EmptyDescription>The port you are looking for does not exist or has been removed.</EmptyDescription>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  // Derived chart/table data — fall back while loading
  const vesselsByTypeData = (sampleData?.vesselsByType ?? []).map((v) => ({ name: v.name, count: v.count }));
  const topOriginData = (sampleData?.topOriginPorts ?? []).map((v) => ({ name: v.name, count: v.count }));
  const arrivalsByDayData = (sampleData?.arrivalsByDay ?? []).map((v, i) => ({ name: `D${i + 1}`, value: v }));
  const portCallsData = (sampleData?.portCallsByMonth ?? []).map((m) => ({ name: m.month, calls: m.calls }));
  const cargoVolumeData = (sampleData?.cargoVolumeByMonth ?? []).map((m) => ({ name: m.month, volume: m.volume }));
  const callsByTypeData = (sampleData?.callsByVesselType ?? []).map((v) => ({ name: v.name, count: v.count }));
  const topCommoditiesData = (sampleData?.topCommodities ?? []).map((v) => ({ name: v.name, volume: v.volume }));
  const anchorageByDayData = (sampleData?.anchorageByDay ?? []).map((v, i) => ({ name: `D${i + 1}`, value: v }));
  const waitTrendData = (sampleData?.waitingTimeTrend ?? []).map((m) => ({ name: m.month, days: m.days }));
  const waitDistData = (sampleData?.waitDistribution ?? []).map((m) => ({
    name: m.month, lt1: m.lt1, d1to3: m.d1to3, d3to7: m.d3to7, gt7: m.gt7,
  }));
  const avgWaitByTypeData = (sampleData?.avgWaitByType ?? []).map((v) => ({ name: v.name, days: v.days }));

  const vesselsInPortData: VesselInPortRow[] = sampleData?.vesselsInPort ?? [];
  const portCallHistoryData: PortCallHistoryRow[] = sampleData?.portCallsHistory ?? [];
  const vesselsCongestionData: CongestionRow[] = sampleData?.vesselsCongestion ?? [];

  const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-4 m-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center shrink-0">
          <Anchor size={20} />
        </div>
        <div>
          <h1 className="text-heading-xl">{port.name}</h1>
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            {port.unlocode ?? "—"}&nbsp;·&nbsp;{port.country}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-fit">
          <TabsTrigger value="port-activity">Port activity</TabsTrigger>
          <TabsTrigger value="port-calls">Port calls</TabsTrigger>
          <TabsTrigger value="congestion">Congestion</TabsTrigger>
        </TabsList>

        <div className="flex gap-12 mt-4">
          {/* Main content */}
          <div className="flex-1 min-w-0">

            {/* ── Tab 1: Port Activity ── */}
            <TabsContent value="port-activity">
              <div className="flex flex-col gap-6">
                {/* KPI row */}
                <div className="grid grid-cols-5 gap-3">
                  <KpiCard value={sampleData?.inPort ?? "—"} label="In port" />
                  <KpiCard value={sampleData?.inAnchorage ?? "—"} label="In anchorage" />
                  <KpiCard value={sampleData != null ? `${sampleData.totalDWT}M` : "—"} label="Total DWT (mt)" />
                  <KpiCard value={sampleData != null ? `${sampleData.avgTurnaround}d` : "—"} label="Avg turnaround" />
                  <KpiCard value={sampleData?.destined ?? "—"} label="Destined" />
                </div>

                {/* Row 1: map + vessels by type */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-heading-sm">Port map</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="min-h-[220px] flex items-center justify-center rounded-md bg-[var(--color-bg-secondary)]">
                        <p className="text-body-sm text-[var(--color-text-secondary)]">
                          Map will be available when AIS integration is live.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-heading-sm">Vessels by type</CardTitle>
                        <AddToBoardButton
                          chartTitle="Vessels by Type"
                          source={{ section: "port_report", chartId: "port_report.activity.vessels_by_type", entityId: port._id, tab: "port-activity", filters: {} }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Chart
                        type="horizontal-bar"
                        data={vesselsByTypeData}
                        config={vesselsByTypeConfig}
                        height={220}
                        showLegend={false}
                        margin={{ left: 16, right: 16, top: 4, bottom: 4 }}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: arrivals by day + top origin ports */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-heading-sm">Arrivals by day — last 30 days</CardTitle>
                        <AddToBoardButton
                          chartTitle="Arrivals by Day — Last 30 Days"
                          source={{ section: "port_report", chartId: "port_report.activity.arrivals_by_day", entityId: port._id, tab: "port-activity", filters: {} }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Chart
                        type="bar"
                        data={arrivalsByDayData}
                        config={arrivalsByDayConfig}
                        height={180}
                        showLegend={false}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-heading-sm">Top origin ports</CardTitle>
                        <AddToBoardButton
                          chartTitle="Top Origin Ports"
                          source={{ section: "port_report", chartId: "port_report.activity.top_origin_ports", entityId: port._id, tab: "port-activity", filters: {} }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Chart
                        type="horizontal-bar"
                        data={topOriginData}
                        config={topOriginConfig}
                        height={220}
                        showLegend={false}
                        margin={{ left: 16, right: 16, top: 4, bottom: 4 }}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Vessels in port table */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-heading-sm text-[var(--color-text-primary)]">Vessels in port</h3>
                  <DataTable
                    data={vesselsInPortData}
                    columns={vesselInPortColumns}
                    borderStyle="horizontal"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── Tab 2: Port Calls ── */}
            <TabsContent value="port-calls">
              <div className="flex flex-col gap-6">
                {/* KPI row */}
                <div className="grid grid-cols-4 gap-3">
                  <KpiCard value={sampleData?.portCallsYTD ?? "—"} label="Port calls YTD" />
                  <KpiCard value={sampleData?.avgCallsPerMonth ?? "—"} label="Avg calls / month" />
                  <KpiCard value={sampleData != null ? `${sampleData.avgPortStay}d` : "—"} label="Avg port stay" />
                  <KpiCard value={sampleData != null ? `${sampleData.volumeYTD}M` : "—"} label="Volume YTD (mt)" />
                </div>

                {/* Row 1: port calls by month + cargo volume */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-heading-sm">Port calls — monthly</CardTitle>
                        <AddToBoardButton
                          chartTitle="Port Calls — Monthly"
                          source={{ section: "port_report", chartId: "port_report.calls.monthly", entityId: port._id, tab: "port-calls", filters: {} }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Chart
                        type="bar"
                        data={portCallsData}
                        config={portCallsConfig}
                        height={220}
                        showLegend={false}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-heading-sm">Cargo volume — monthly (mt m)</CardTitle>
                        <AddToBoardButton
                          chartTitle="Cargo Volume — Monthly"
                          source={{ section: "port_report", chartId: "port_report.calls.cargo_volume", entityId: port._id, tab: "port-calls", filters: {} }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Chart
                        type="line"
                        data={cargoVolumeData}
                        config={cargoVolumeConfig}
                        height={220}
                        showLegend={false}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: calls by vessel type + top commodities */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-heading-sm">Calls by vessel type</CardTitle>
                        <AddToBoardButton
                          chartTitle="Calls by Vessel Type"
                          source={{ section: "port_report", chartId: "port_report.calls.by_vessel_type", entityId: port._id, tab: "port-calls", filters: {} }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Chart
                        type="horizontal-bar"
                        data={callsByTypeData}
                        config={callsByTypeConfig}
                        height={220}
                        showLegend={false}
                        margin={{ left: 16, right: 16, top: 4, bottom: 4 }}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-heading-sm">Top commodities (mt m)</CardTitle>
                        <AddToBoardButton
                          chartTitle="Top Commodities"
                          source={{ section: "port_report", chartId: "port_report.calls.top_commodities", entityId: port._id, tab: "port-calls", filters: {} }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Chart
                        type="horizontal-bar"
                        data={topCommoditiesData}
                        config={topCommoditiesConfig}
                        height={220}
                        showLegend={false}
                        margin={{ left: 16, right: 16, top: 4, bottom: 4 }}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Port calls history table */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-heading-sm text-[var(--color-text-primary)]">Port calls history</h3>
                  <DataTable
                    data={portCallHistoryData}
                    columns={portCallHistoryColumns}
                    borderStyle="horizontal"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── Tab 3: Congestion ── */}
            <TabsContent value="congestion">
              <div className="flex flex-col gap-6">
                {/* KPI row */}
                <div className="grid grid-cols-4 gap-3">
                  <KpiCard value={sampleData != null ? `${sampleData.avgWait}d` : "—"} label="Avg wait" />
                  <KpiCard value={sampleData != null ? `${sampleData.maxWait}d` : "—"} label="Max wait (30d)" />
                  <KpiCard value={sampleData?.inAnchorage ?? "—"} label="Currently at anchor" />
                  <KpiCard value={sampleData?.expectedThisWeek ?? "—"} label="Expected this week" />
                </div>

                {/* Row 1: waiting time trend + anchorage by day */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-heading-sm">Avg waiting time — monthly</CardTitle>
                        <AddToBoardButton
                          chartTitle="Avg Waiting Time — Monthly"
                          source={{ section: "port_report", chartId: "port_report.congestion.wait_trend", entityId: port._id, tab: "congestion", filters: {} }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Chart
                        type="line"
                        data={waitTrendData}
                        config={waitTrendConfig}
                        height={220}
                        showLegend={false}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-heading-sm">Vessels at anchorage — last 30 days</CardTitle>
                        <AddToBoardButton
                          chartTitle="Vessels at Anchorage — Last 30 Days"
                          source={{ section: "port_report", chartId: "port_report.congestion.anchorage_by_day", entityId: port._id, tab: "congestion", filters: {} }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Chart
                        type="bar"
                        data={anchorageByDayData}
                        config={anchorageByDayConfig}
                        height={220}
                        showLegend={false}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: wait distribution + avg wait by type */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-heading-sm">Wait time distribution — monthly</CardTitle>
                        <AddToBoardButton
                          chartTitle="Wait Time Distribution — Monthly"
                          source={{ section: "port_report", chartId: "port_report.congestion.wait_distribution", entityId: port._id, tab: "congestion", filters: {} }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Chart
                        type="composed"
                        data={waitDistData}
                        config={waitDistConfig}
                        height={220}
                        showLegend
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-heading-sm">Avg wait by vessel type (days)</CardTitle>
                        <AddToBoardButton
                          chartTitle="Avg Wait by Vessel Type"
                          source={{ section: "port_report", chartId: "port_report.congestion.avg_wait_by_type", entityId: port._id, tab: "congestion", filters: {} }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Chart
                        type="horizontal-bar"
                        data={avgWaitByTypeData}
                        config={avgWaitByTypeConfig}
                        height={220}
                        showLegend={false}
                        margin={{ left: 16, right: 16, top: 4, bottom: 4 }}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Vessels at anchorage table */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-heading-sm text-[var(--color-text-primary)]">Vessels at anchorage</h3>
                  <DataTable
                    data={vesselsCongestionData}
                    columns={congestionColumns}
                    borderStyle="horizontal"
                  />
                </div>
              </div>
            </TabsContent>
          </div>

          {/* Sidebar */}
          <div className="w-56 shrink-0 flex flex-col gap-4">
            <h2 className="text-heading-sm text-[var(--color-text-primary)]">Port information</h2>
            <AttributesList>
              <AttributesItem>
                <AttributesLabel>Country</AttributesLabel>
                <AttributesValue>{port.country}</AttributesValue>
              </AttributesItem>
              <AttributesItem>
                <AttributesLabel>UN/LOCODE</AttributesLabel>
                <AttributesValue>{port.unlocode ?? "—"}</AttributesValue>
              </AttributesItem>
              <AttributesItem>
                <AttributesLabel>Zone</AttributesLabel>
                <AttributesValue>{port.zone ?? "—"}</AttributesValue>
              </AttributesItem>
              <AttributesItem>
                <AttributesLabel>Max draft</AttributesLabel>
                <AttributesValue>{port.maxDraft != null ? `${port.maxDraft} m` : "—"}</AttributesValue>
              </AttributesItem>
              <AttributesItem>
                <AttributesLabel>Max DWT</AttributesLabel>
                <AttributesValue>{port.maxDWT != null ? `${port.maxDWT.toLocaleString()} mt` : "—"}</AttributesValue>
              </AttributesItem>
              <AttributesItem>
                <AttributesLabel>Berths</AttributesLabel>
                <AttributesValue>{port.berths ?? "—"}</AttributesValue>
              </AttributesItem>
              <AttributesItem>
                <AttributesLabel>Terminal operator</AttributesLabel>
                <AttributesValue>{port.terminalOperator ?? "—"}</AttributesValue>
              </AttributesItem>
            </AttributesList>

            <Separator />

            <h2 className="text-heading-sm text-[var(--color-text-primary)]">Activity</h2>
            <AttributesList>
              <AttributesItem>
                <AttributesLabel>In port</AttributesLabel>
                <AttributesValue>{sampleData?.inPort ?? "—"}</AttributesValue>
              </AttributesItem>
              <AttributesItem>
                <AttributesLabel>In anchorage</AttributesLabel>
                <AttributesValue>{sampleData?.inAnchorage ?? "—"}</AttributesValue>
              </AttributesItem>
              <AttributesItem>
                <AttributesLabel>Destined</AttributesLabel>
                <AttributesValue>{sampleData?.destined ?? "—"}</AttributesValue>
              </AttributesItem>
              <AttributesItem>
                <AttributesLabel>Avg turnaround</AttributesLabel>
                <AttributesValue>{sampleData != null ? `${sampleData.avgTurnaround} days` : "—"}</AttributesValue>
              </AttributesItem>
            </AttributesList>

            <Separator />

            <h2 className="text-heading-sm text-[var(--color-text-primary)]">Port status</h2>
            <AttributesList>
              <AttributesItem>
                <AttributesLabel>Operational status</AttributesLabel>
                <AttributesValue>{port.operationalStatus ?? "—"}</AttributesValue>
              </AttributesItem>
              <AttributesItem>
                <AttributesLabel>Restrictions</AttributesLabel>
                <AttributesValue>{port.restrictions ?? "—"}</AttributesValue>
              </AttributesItem>
              <AttributesItem>
                <AttributesLabel>Last updated</AttributesLabel>
                <AttributesValue>{now}</AttributesValue>
              </AttributesItem>
            </AttributesList>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

export default PortDetail;
