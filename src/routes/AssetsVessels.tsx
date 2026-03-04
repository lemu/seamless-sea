import { useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { Tabs, TabsList, TabsTrigger, Button } from "@rafal.lemieszewski/tide-ui";
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
        <div className="rounded-l border border-[var(--color-border-primary-subtle)] p-6">
          <p className="text-body-md text-text-secondary">
            Vessels overview will be displayed here.
          </p>
        </div>
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
