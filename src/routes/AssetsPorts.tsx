import { useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type ColumnDef } from "@tanstack/react-table";
import { Tabs, TabsList, TabsTrigger, Button, Skeleton } from "@rafal.lemieszewski/tide-ui";
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
        <div className="rounded-l border border-[var(--color-border-primary-subtle)] p-6">
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Ports overview will be displayed here.
          </p>
        </div>
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
