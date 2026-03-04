import { useParams } from "react-router";
import { Link } from "react-router";
import { useQueryState, parseAsString } from "nuqs";
import { type ColumnDef } from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Ship } from "lucide-react";
import { AddToBoardButton } from "../components/AddToBoardButton";
import {
  AttributesList,
  AttributesItem,
  AttributesLabel,
  AttributesValue,
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

// Container classes: ULCV and known container vessel naming patterns
const CONTAINER_CLASSES = ["ulcv", "megamax", "oscar class", "24k class", "golden class", "evergreen", "one megamax"];
// Tanker classes: VLCC, ULCC, Aframax, Suezmax, etc.
const TANKER_CLASSES = ["vlcc", "ulcc", "aframax", "suezmax", "ti class"];

function deriveVesselType(vesselClass?: string): string {
  if (!vesselClass) return "—";
  const vc = vesselClass.toLowerCase();
  if (CONTAINER_CLASSES.some((c) => vc.includes(c))) return "Container";
  if (TANKER_CLASSES.some((c) => vc.includes(c))) return "Tanker";
  return "Bulk";
}

// --- Column definitions ---

type PortCallRow = {
  country: string;
  port: string;
  activity: string;
  arrived: string;
  departed: string;
  berth: string;
  cargo: string;
};

const portCallColumns: ColumnDef<PortCallRow>[] = [
  { accessorKey: "country", header: "Country" },
  {
    accessorKey: "port",
    header: "Port",
    cell: ({ row }) => (
      <Link to="/assets/ports" className="text-[var(--color-text-brand-bold)] hover:underline">
        {row.original.port}
      </Link>
    ),
  },
  { accessorKey: "activity", header: "Activity" },
  { accessorKey: "arrived", header: "Arrived" },
  { accessorKey: "departed", header: "Departed" },
  { accessorKey: "berth", header: "Berth" },
  { accessorKey: "cargo", header: "Cargo" },
];

type VoyageSummaryRow = {
  voyage: string;
  loadPort: string;
  dischPort: string;
  ladenDays: number;
  ballastDays: number;
  cargo: string;
};

const voyageSummaryColumns: ColumnDef<VoyageSummaryRow>[] = [
  { accessorKey: "voyage", header: "Voyage" },
  { accessorKey: "loadPort", header: "Load port" },
  { accessorKey: "dischPort", header: "Disch. port" },
  { accessorKey: "ladenDays", header: "Laden days" },
  { accessorKey: "ballastDays", header: "Ballast days" },
  { accessorKey: "cargo", header: "Cargo (mt)" },
];

type VoyagePerformanceRow = {
  voyage: string;
  loadPort: string;
  dischPort: string;
  avgLadenSpd: string;
  avgBallastSpd: string;
  avgDraft: string;
  bunker: string;
};

const voyagePerformanceColumns: ColumnDef<VoyagePerformanceRow>[] = [
  { accessorKey: "voyage", header: "Voyage" },
  { accessorKey: "loadPort", header: "Load port" },
  { accessorKey: "dischPort", header: "Disch. port" },
  { accessorKey: "avgLadenSpd", header: "Avg laden spd" },
  { accessorKey: "avgBallastSpd", header: "Avg ballast spd" },
  { accessorKey: "avgDraft", header: "Avg draft" },
  { accessorKey: "bunker", header: "Bunker (mt)" },
];

// --- Static chart configs ---

const utilizationConfig = {
  laden:   { label: "Laden days",   type: "bar"  as const, yAxisId: "left"  as const },
  ballast: { label: "Ballast days", type: "bar"  as const, yAxisId: "left"  as const },
  cargo:   { label: "Cargo (mt)",   type: "line" as const, yAxisId: "right" as const },
};

const speedDraftConfig = {
  laden:   { label: "Laden speed (kts)",   type: "line" as const, yAxisId: "left"  as const },
  ballast: { label: "Ballast speed (kts)", type: "line" as const, yAxisId: "left"  as const },
  draft:   { label: "Draft (m)",           type: "line" as const, yAxisId: "right" as const },
};

const speedBunkerConfig = {
  count:  { label: "Days",                type: "bar"  as const, yAxisId: "left"  as const },
  bunker: { label: "Consumption (mt/day)", type: "line" as const, yAxisId: "right" as const },
};

// --- Skeleton ---

function VesselDetailSkeleton() {
  return (
    <div className="flex gap-6 m-6">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="w-80 shrink-0 flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

function VesselDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("voyage-history"));

  const vessel = useQuery(
    api.vessels.getWithOwner,
    id ? { id: id as Id<"vessels"> } : "skip"
  );

  const sampleData = useQuery(
    api.vesselSampleData.getByVessel,
    vessel ? { vesselId: vessel._id } : "skip"
  );

  if (vessel === undefined) {
    return <VesselDetailSkeleton />;
  }

  if (vessel === null) {
    return (
      <div className="m-6">
        <Empty>
          <EmptyContent>
            <EmptyTitle>Vessel not found</EmptyTitle>
            <EmptyDescription>The vessel you are looking for does not exist or has been removed.</EmptyDescription>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const yearBuilt = vessel.builtDate ? vessel.builtDate.slice(0, 4) : null;

  // Derived chart/table data from Convex — fall back to empty arrays while loading
  const portCallData: PortCallRow[] = sampleData?.portCalls ?? [];
  const utilizationData = sampleData?.monthlyStats.map((m) => ({
    name:    m.month,
    laden:   m.ladenDays,
    ballast: m.ballastDays,
    cargo:   m.cargoMt ?? 0,
  })) ?? [];
  const voyageSummaryData: VoyageSummaryRow[] = sampleData?.voyages.map((v) => ({
    voyage: v.voyage,
    loadPort: v.loadPort,
    dischPort: v.dischPort,
    ladenDays: v.ladenDays,
    ballastDays: v.ballastDays,
    cargo: v.cargoMt.toLocaleString(),
  })) ?? [];
  const speedDraftData = sampleData?.weeklyPerformance.map((w) => ({
    name:    w.label,
    laden:   w.ladenSpeed,
    ballast: w.ballastSpeed,
    draft:   w.draft,
  })) ?? [];
  const speedBunkerData = sampleData?.speedDistribution.map((b) => ({
    name:   b.bucket,
    count:  b.count,
    bunker: b.bunkerPerDay,
  })) ?? [];
  const voyagePerformanceData: VoyagePerformanceRow[] = sampleData?.voyages.map((v) => ({
    voyage: v.voyage,
    loadPort: v.loadPort,
    dischPort: v.dischPort,
    avgLadenSpd: `${v.avgLadenSpeed} kts`,
    avgBallastSpd: `${v.avgBallastSpeed} kts`,
    avgDraft: `${v.avgDraft}m`,
    bunker: v.bunkerMt.toLocaleString(),
  })) ?? [];

  return (
    <div className="flex flex-col gap-4 m-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-fit">
          <TabsTrigger value="voyage-history">Voyage history</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="speed-performance">Speed &amp; performance</TabsTrigger>
        </TabsList>

        <div className="flex gap-12 mt-4">
          {/* Main content */}
          <div className="flex-1 min-w-0">

          {/* ── Tab 1: Voyage history ── */}
          <TabsContent value="voyage-history">
            <div className="flex flex-col gap-6">
              {/* Map card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-heading-sm">Port calls map</CardTitle>
                    <span className="w-[3px] h-[3px] rounded-full bg-[var(--color-text-tertiary)]" />
                    <p className="text-body-sm text-[var(--color-text-secondary)]">7 port calls this year</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[220px] flex items-center justify-center rounded-md bg-[var(--color-bg-secondary)]">
                    <p className="text-body-sm text-[var(--color-text-secondary)]">
                      Map will be available when AIS integration is live.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Current voyage */}
              <div className="flex flex-col gap-3">
                <h3 className="text-heading-sm text-[var(--color-text-primary)]">Current voyage</h3>
                <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-4">
                  <div className="grid grid-cols-3 gap-4 items-start">
                    {/* Load port */}
                    <div className="flex flex-col gap-1">
                      <p className="text-body-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Load port</p>
                      <p className="text-heading-sm text-[var(--color-text-primary)]">Tubarao, Brasil</p>
                      <p className="text-body-sm text-[var(--color-text-secondary)]">Departure • 26 May 2025</p>
                      <p className="text-body-sm text-[var(--color-text-secondary)]">Load • 170,000&nbsp;mt of Iron Ore</p>
                    </div>

                    {/* Current status */}
                    <div className="flex flex-col gap-3">
                      <div className="relative h-2 rounded-full bg-[var(--color-bg-secondary)]">
                        <div
                          className="absolute top-0 left-0 h-full rounded-full bg-[var(--color-text-brand-bold)]"
                          style={{ width: "68%" }}
                        />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-text-brand-bold)] text-white"
                          style={{ left: "68%" }}
                        >
                          <Ship size={12} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-center">
                        <p className="text-body-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Current status</p>
                        <p className="text-body-sm text-[var(--color-text-primary)]">Underway using engine • 8&nbsp;kn • 83°</p>
                      </div>
                    </div>

                    {/* Discharge port */}
                    <div className="flex flex-col gap-1 text-right">
                      <p className="text-body-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Discharge port</p>
                      <p className="text-heading-sm text-[var(--color-text-primary)]">Qingdao, China</p>
                      <p className="text-body-sm text-[var(--color-text-secondary)]">Arrival • ETA 15 Jun 2026</p>
                      <p className="text-body-sm text-[var(--color-text-secondary)]">Discharge • 172,000&nbsp;mt of Iron Ore</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Port calls table */}
              <div className="flex flex-col gap-3">
                <h3 className="text-heading-sm text-[var(--color-text-primary)]">Port calls</h3>
                <DataTable
                  data={portCallData}
                  columns={portCallColumns}
                  borderStyle="horizontal"
                />
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 2: Utilization ── */}
          <TabsContent value="utilization">
            <div className="flex flex-col gap-6">
              {/* KPI row */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-4">
                  <p className="text-heading-lg">68%</p>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Days laden</p>
                </div>
                <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-4">
                  <p className="text-heading-lg">32%</p>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Days ballast</p>
                </div>
                <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-4">
                  <p className="text-heading-lg">46.8</p>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Avg voyage days</p>
                </div>
                <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-4">
                  <p className="text-heading-lg">72%</p>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Utilization</p>
                </div>
              </div>

              {/* Charts */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-heading-sm">Laden vs ballast days &amp; cargo — monthly</CardTitle>
                    <AddToBoardButton
                      chartTitle="Laden vs Ballast Days & Cargo — Monthly"
                      source={{
                        section: "vessel_report",
                        chartId: "vessel_report.utilization.laden_ballast_monthly",
                        entityId: vessel._id,
                        tab: "utilization",
                        filters: {},
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Chart
                    type="composed"
                    data={utilizationData}
                    config={utilizationConfig}
                    height={260}
                    showLegend
                    showRightYAxis
                    yAxisDomain={[0, "auto"]}
                    rightYAxisDomain={[0, "auto"]}
                  />
                </CardContent>
              </Card>

              {/* Voyage summary table */}
              <div className="flex flex-col gap-3">
                <h3 className="text-heading-sm text-[var(--color-text-primary)]">Voyage summary</h3>
                <DataTable
                  data={voyageSummaryData}
                  columns={voyageSummaryColumns}
                  borderStyle="horizontal"
                />
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 3: Speed & performance ── */}
          <TabsContent value="speed-performance">
            <div className="flex flex-col gap-6">
              {/* KPI row */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-4">
                  <p className="text-heading-lg">12.4&nbsp;kts</p>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Current speed</p>
                </div>
                <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-4">
                  <p className="text-heading-lg">12.1&nbsp;kts</p>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Avg laden</p>
                </div>
                <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-4">
                  <p className="text-heading-lg">10.8&nbsp;kts</p>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Avg ballast</p>
                </div>
                <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-4">
                  <p className="text-heading-lg">14.2&nbsp;m</p>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Current draft</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-heading-sm">Speed &amp; draft over time — 12 weeks</CardTitle>
                      <AddToBoardButton
                        chartTitle="Speed & Draft Over Time — 12 Weeks"
                        source={{
                          section: "vessel_report",
                          chartId: "vessel_report.speed.draft_over_time",
                          entityId: vessel._id,
                          tab: "speed-performance",
                          filters: {},
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Chart
                      type="composed"
                      data={speedDraftData}
                      config={speedDraftConfig}
                      height={240}
                      showLegend
                      showRightYAxis
                      yAxisDomain={[0, "auto"]}
                      rightYAxisDomain={[0, "auto"]}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-heading-sm">Speed distribution &amp; bunker consumption</CardTitle>
                      <AddToBoardButton
                        chartTitle="Speed Distribution & Bunker Consumption"
                        source={{
                          section: "vessel_report",
                          chartId: "vessel_report.speed.distribution",
                          entityId: vessel._id,
                          tab: "speed-performance",
                          filters: {},
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Chart
                      type="composed"
                      data={speedBunkerData}
                      config={speedBunkerConfig}
                      height={240}
                      showLegend
                      showRightYAxis
                      yAxisDomain={[0, "auto"]}
                      rightYAxisDomain={[0, "auto"]}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Voyage performance table */}
              <div className="flex flex-col gap-3">
                <h3 className="text-heading-sm text-[var(--color-text-primary)]">Voyage performance</h3>
                <DataTable
                  data={voyagePerformanceData}
                  columns={voyagePerformanceColumns}
                  borderStyle="horizontal"
                />
              </div>
            </div>
          </TabsContent>
          </div>

          {/* Sidebar */}
          <div className="w-80 shrink-0 flex flex-col gap-4">
        <h2 className="text-heading-sm text-text-primary">Vessel information</h2>
        <AttributesList>
          <AttributesItem>
            <AttributesLabel>IMO number</AttributesLabel>
            <AttributesValue>{vessel.imoNumber ?? "—"}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Vessel name</AttributesLabel>
            <AttributesValue>{vessel.name}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Ship type</AttributesLabel>
            <AttributesValue>{deriveVesselType(vessel.vesselClass)}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Year built</AttributesLabel>
            <AttributesValue>{yearBuilt ?? "—"}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Flag</AttributesLabel>
            <AttributesValue>{vessel.flag ?? "—"}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Gross tonnage (GT)</AttributesLabel>
            <AttributesValue>{vessel.grt != null ? `${vessel.grt.toLocaleString()} mt` : "—"}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Deadweight tonnage (DWT)</AttributesLabel>
            <AttributesValue>{vessel.dwt != null ? `${vessel.dwt.toLocaleString()} mt` : "—"}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Length</AttributesLabel>
            <AttributesValue>{vessel.loa != null ? `${vessel.loa} m` : "—"}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Width</AttributesLabel>
            <AttributesValue>{vessel.beam != null ? `${vessel.beam} m` : "—"}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Draught</AttributesLabel>
            <AttributesValue>{vessel.draft != null ? `${vessel.draft} m` : "—"}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Class</AttributesLabel>
            <AttributesValue>{vessel.vesselClass ?? "—"}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Callsign</AttributesLabel>
            <AttributesValue>{vessel.callsign ?? "—"}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>MMSI</AttributesLabel>
            <AttributesValue>{vessel.mmsi ?? "—"}</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Owner</AttributesLabel>
            <AttributesValue>{vessel.ownerName ?? "—"}</AttributesValue>
          </AttributesItem>
        </AttributesList>

        <Separator />

        <h2 className="text-heading-sm text-text-primary">Safety &amp; emissions</h2>
        <AttributesList>
          <AttributesItem>
            <AttributesLabel>Safety score</AttributesLabel>
            <AttributesValue>—</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Inspection required</AttributesLabel>
            <AttributesValue>—</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Last inspection outcome</AttributesLabel>
            <AttributesValue>—</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Last inspection valid until</AttributesLabel>
            <AttributesValue>—</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>EEOI/EVDI</AttributesLabel>
            <AttributesValue>—</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Energy saving equip.</AttributesLabel>
            <AttributesValue>—</AttributesValue>
          </AttributesItem>
        </AttributesList>

        <Separator />

        <h2 className="text-heading-sm text-text-primary">Sanctions</h2>
        <AttributesList>
          <AttributesItem>
            <AttributesLabel>Sanctioned flag</AttributesLabel>
            <AttributesValue>—</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Sanctioned company</AttributesLabel>
            <AttributesValue>—</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Sanctioned vessel</AttributesLabel>
            <AttributesValue>—</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Risk level</AttributesLabel>
            <AttributesValue>—</AttributesValue>
          </AttributesItem>
          <AttributesItem>
            <AttributesLabel>Risk score</AttributesLabel>
            <AttributesValue>—</AttributesValue>
          </AttributesItem>
        </AttributesList>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

export default VesselDetail;
