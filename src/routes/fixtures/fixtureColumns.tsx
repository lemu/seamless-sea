import {
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Icon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  FixtureStatus,
  statusConfig,
  Avatar,
  AvatarImage,
  AvatarFallback,
  type StatusValue,
} from "@rafal.lemieszewski/tide-ui";
import type { FixtureData } from "../../types/fixture";
import type { CellContext, Row } from "@tanstack/react-table";
import {
  formatLaycanRange,
  formatTimestamp,
  getStatusLabel as getStatusLabelBase,
  getCompanyInitials,
} from "../../utils/dataUtils";
import {
  createHighlighter,
  createTextColumn,
  createNumericColumn,
  createDateColumn,
  createCountryColumn,
  type Highlighter,
} from "./columnFactories";

// Type aliases for TanStack Table
type FixtureCellContext<TValue = unknown> = CellContext<FixtureData, TValue>;
type FixtureRow = Row<FixtureData>;

// Wrap getStatusLabel to bind statusConfig from tide-ui
const getStatusLabel = (status: string): string =>
  getStatusLabelBase(status, statusConfig);

// Type guard for filtering out null/undefined values
const isDefined = <T,>(value: T | null | undefined): value is T => value != null;

// ── Icon helpers (hoisted to module scope) ───────────────────────────────────
const iconShip = ({ className }: { className?: string }) => <Icon name="ship" className={className} aria-hidden="true" />;
const iconShipLoad = ({ className }: { className?: string }) => <Icon name="ship-load" className={className} aria-hidden="true" />;
const iconShipUnload = ({ className }: { className?: string }) => <Icon name="ship-unload" className={className} aria-hidden="true" />;
const iconMapPin = ({ className }: { className?: string }) => <Icon name="map-pin" className={className} aria-hidden="true" />;
const iconTruck = ({ className }: { className?: string }) => <Icon name="truck" className={className} aria-hidden="true" />;
const iconPackage = ({ className }: { className?: string }) => <Icon name="package" className={className} aria-hidden="true" />;
const iconWeight = ({ className }: { className?: string }) => <Icon name="weight" className={className} aria-hidden="true" />;
const iconDollar = ({ className }: { className?: string }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />;
const iconTrendingDown = ({ className }: { className?: string }) => <Icon name="trending-down" className={className} aria-hidden="true" />;
const iconActivity = ({ className }: { className?: string }) => <Icon name="activity" className={className} aria-hidden="true" />;
const iconClock = ({ className }: { className?: string }) => <Icon name="clock" className={className} aria-hidden="true" />;
const iconPercent = ({ className }: { className?: string }) => <Icon name="percent" className={className} aria-hidden="true" />;
const iconCalendar = ({ className }: { className?: string }) => <Icon name="calendar" className={className} aria-hidden="true" />;
const iconCheckCircle = ({ className }: { className?: string }) => <Icon name="check-circle" className={className} aria-hidden="true" />;
const iconPenTool = ({ className }: { className?: string }) => <Icon name="pen-tool" className={className} aria-hidden="true" />;
const iconUserOwner = ({ className }: { className?: string }) => <Icon name="user-owner" className={className} aria-hidden="true" />;
const iconUserBroker = ({ className }: { className?: string }) => <Icon name="user-broker" className={className} aria-hidden="true" />;
const iconUserCharterer = ({ className }: { className?: string }) => <Icon name="user-charterer" className={className} aria-hidden="true" />;
const iconUserCreatedBy = ({ className }: { className?: string }) => <Icon name="user-created-by" className={className} aria-hidden="true" />;
const iconGitBranch = ({ className }: { className?: string }) => <Icon name="git-branch" className={className} aria-hidden="true" />;
const iconFileCheck = ({ className }: { className?: string }) => <Icon name="file-check" className={className} aria-hidden="true" />;
const iconCircleCheckBig = ({ className }: { className?: string }) => <Icon name="circle-check-big" className={className} aria-hidden="true" />;

// ── Avatar party column helper ───────────────────────────────────────────────
function createPartyColumn(
  key: "owner" | "broker" | "charterer",
  label: string,
  icon: ({ className }: { className?: string }) => React.ReactNode,
  avatarField: "ownerAvatarUrl" | "brokerAvatarUrl" | "chartererAvatarUrl",
  highlight: Highlighter | null,
): ColumnDef<FixtureData> {
  const noun = label.toLowerCase() + "s";
  return {
    accessorKey: key,
    header: label,
    meta: {
      label,
      align: "left" as const,
      filterable: true,
      filterVariant: "multiselect" as const,
      filterGroup: "Parties",
      icon,
    },
    enableGrouping: true,
    enableGlobalFilter: true,
    cell: ({ row }: FixtureCellContext) => {
      const name = row.getValue(key) as string;
      const avatarUrl = row.original[avatarField];
      const isPlaceholder = name === "-" || name === "Unknown";
      return (
        <div className="flex items-center gap-2">
          {!isPlaceholder && (
            <Avatar type="organization" size="xxs">
              <AvatarImage src={avatarUrl || undefined} alt={name} />
              <AvatarFallback>{getCompanyInitials(name)}</AvatarFallback>
            </Avatar>
          )}
          <div className="text-body-sm text-[var(--color-text-primary)]">
            {highlight ? highlight(name) : name}
          </div>
        </div>
      );
    },
    aggregatedCell: ({ row }: FixtureCellContext) => {
      const uniqueParties = Array.from(
        new Map(
          row.subRows
            ?.filter((r) => r.original[key] !== "-" && r.original[key] !== "Unknown")
            .map((r) => [
              r.original[key],
              { name: r.original[key] as string, avatarUrl: r.original[avatarField] as string | undefined },
            ]),
        ).values(),
      ) as Array<{ name: string; avatarUrl?: string }>;

      if (uniqueParties.length === 1) {
        const party = uniqueParties[0];
        return (
          <div className="flex items-center gap-2">
            <Avatar type="organization" size="xxs">
              <AvatarImage src={party.avatarUrl || undefined} alt={party.name} />
              <AvatarFallback>{getCompanyInitials(party.name)}</AvatarFallback>
            </Avatar>
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {highlight ? highlight(party.name) : party.name}
            </div>
          </div>
        );
      }

      if (row.subRows?.length > 8) {
        return (
          <div className="text-body-sm text-[var(--color-text-secondary)]">
            {uniqueParties.length} {noun}
          </div>
        );
      }

      const displayParties = uniqueParties.slice(0, 5);
      return (
        <div className="flex items-center gap-1">
          {displayParties.map((party, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div>
                  <Avatar type="organization" size="xxs">
                    <AvatarImage src={party.avatarUrl || undefined} alt={party.name} />
                    <AvatarFallback>{getCompanyInitials(party.name)}</AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>{party.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      );
    },
  };
}

export function createFixtureColumns(opts: {
  globalSearchTerms: string[];
  onFixtureSelect: (fixture: FixtureData, rowId: string) => void;
}): ColumnDef<FixtureData>[] {
  const { globalSearchTerms, onFixtureSelect } = opts;
  const highlight = createHighlighter(globalSearchTerms);

  return [
    // ── Fixture ID (custom — clickable link + aggregated order display) ─────
    {
      accessorKey: "fixtureId",
      header: "Fixture ID",
      meta: { label: "Fixture ID", align: "left" },
      enableGrouping: true,
      enableGlobalFilter: true,
      cell: ({ row }: FixtureCellContext<string>) => {
        const value = row.getValue("fixtureId") as string;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="text-body-sm font-mono text-[var(--blue-600)] hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  onFixtureSelect(row.original, row.id);
                }}
              >
                {highlight ? highlight(value) : value}
              </button>
            </TooltipTrigger>
            <TooltipContent>View fixture details</TooltipContent>
          </Tooltip>
        );
      },
      aggregatedCell: ({ row, table }: FixtureCellContext<string>) => {
        const count = row.subRows?.length || 0;
        const isGroupedByFixtureId = row.groupingColumnId === "fixtureId";
        const isFixtureIdHidden = table.getState().columnVisibility.fixtureId === false;
        if (isGroupedByFixtureId && isFixtureIdHidden) {
          const orderIds = row.subRows?.map((r) => r.original?.orderId).filter(Boolean) || [];
          const uniqueOrderIds = new Set(orderIds);
          if (uniqueOrderIds.size === 1 && orderIds.length > 0) {
            const commonOrderId = Array.from(uniqueOrderIds)[0];
            return (
              <div className="text-body-sm font-mono font-semibold text-[var(--color-text-primary)]">
                {commonOrderId} ({count} {count === 1 ? "contract" : "contracts"})
              </div>
            );
          }
        }
        return (
          <div className="text-body-sm font-medium text-[var(--color-text-primary)]">
            {row.getValue("fixtureId")} ({count} {count === 1 ? "contract" : "contracts"})
          </div>
        );
      },
    },

    // ── Order ID (custom — grouped display logic) ──────────────────────────
    {
      accessorKey: "orderId",
      header: "Order ID",
      meta: { label: "Order ID", align: "left" },
      enableGrouping: true,
      enableGlobalFilter: true,
      cell: ({ row, table }: FixtureCellContext) => {
        if (row.subRows?.length > 0) {
          const isGroupedByFixtureId = row.groupingColumnId === "fixtureId";
          const isFixtureIdHidden = table.getState().columnVisibility.fixtureId === false;
          if (isGroupedByFixtureId && isFixtureIdHidden) {
            const orderId = row.subRows[0]?.original?.orderId;
            const count = row.subRows?.length || 0;
            if (!orderId) {
              return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
            }
            return (
              <div className="flex items-center gap-1.5">
                <span className="text-body-sm font-mono font-semibold text-[var(--color-text-primary)]">{orderId}</span>
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-bg-secondary)] text-caption-sm font-medium text-[var(--color-text-secondary)]">{count}</span>
              </div>
            );
          }
          return null;
        }
        const value = row.original?.orderId || "";
        if (!value) return <div className="text-body-sm text-[var(--color-text-secondary)]">-</div>;
        return (
          <button
            className="text-body-sm font-mono text-[var(--blue-600)] hover:underline"
            onClick={(e) => { e.stopPropagation(); }}
          >
            {highlight ? highlight(value) : value}
          </button>
        );
      },
      aggregatedCell: ({ row }: FixtureCellContext) => {
        const orderId = row.subRows[0]?.original?.orderId;
        const isGroupedByOrderId = row.groupingColumnId === "orderId" || row.groupingColumnId === "fixtureId";
        if (!orderId) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
        return (
          <div className={`text-body-sm font-mono ${isGroupedByOrderId ? "font-semibold" : ""} text-[var(--color-text-primary)]`}>
            {orderId}
          </div>
        );
      },
    },

    // ── Negotiation ID (custom — count display) ────────────────────────────
    {
      accessorKey: "negotiationId",
      header: "Negotiation ID",
      meta: { label: "Negotiation ID", align: "left" },
      enableGrouping: true,
      enableGlobalFilter: true,
      cell: ({ row }: FixtureCellContext) => {
        const negotiationId = row.getValue("negotiationId") as string;
        if (negotiationId === "-") return <div className="text-body-sm text-[var(--color-text-secondary)]">-</div>;
        return <div className="text-body-sm font-mono text-[var(--color-text-primary)]">{negotiationId}</div>;
      },
      aggregatedCell: ({ row }: FixtureCellContext) => {
        const uniqueIds = Array.from(
          new Set(row.subRows.map((r) => r.original?.negotiationId).filter((id: string) => id && id !== "-")),
        ) as string[];
        if (uniqueIds.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
        if (uniqueIds.length === 1) return <div className="text-body-sm font-mono text-[var(--color-text-primary)]">{String(uniqueIds[0])}</div>;
        return <div className="text-body-sm text-[var(--color-text-secondary)]">{uniqueIds.length} negotiations</div>;
      },
    },

    // ── CP ID (custom — clickable + count) ─────────────────────────────────
    {
      accessorKey: "cpId",
      header: "CP ID",
      meta: { label: "CP ID", align: "left" },
      enableGrouping: true,
      enableGlobalFilter: true,
      cell: ({ row }: FixtureCellContext) => {
        const cpId = row.getValue("cpId") as string | undefined;
        if (!cpId) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
        return (
          <button
            className="text-body-sm font-mono text-[var(--blue-600)] hover:underline"
            onClick={(e) => { e.stopPropagation(); }}
          >
            {highlight ? highlight(cpId) : cpId}
          </button>
        );
      },
      aggregatedCell: ({ row }: FixtureCellContext) => {
        const uniqueIds = Array.from(new Set(row.subRows.map((r) => r.original?.cpId).filter(Boolean))) as string[];
        if (uniqueIds.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
        if (uniqueIds.length === 1) return <div className="text-body-sm font-mono text-[var(--color-text-primary)]">{String(uniqueIds[0])}</div>;
        return <div className="text-body-sm text-[var(--color-text-secondary)]">{uniqueIds.length} contracts</div>;
      },
    },

    // ── Status (custom — FixtureStatus component) ──────────────────────────
    {
      accessorKey: "status",
      header: "Status",
      minSize: 200,
      meta: {
        label: "Status",
        align: "left",
        filterable: true,
        filterVariant: "multiselect",
        filterGroup: "Status",
        icon: iconCircleCheckBig,
      },
      enableGrouping: true,
      cell: ({ row }: FixtureCellContext) => {
        const status = row.getValue("status") as string;
        return (
          <div className="flex items-center overflow-visible">
            <FixtureStatus value={status as StatusValue} className="overflow-visible" asBadge showObject />
          </div>
        );
      },
      aggregatedCell: ({ row }: FixtureCellContext) => {
        const allStatuses = (row.subRows?.map((r) => r.original.status) || []) as string[];
        if (row.subRows?.length === 1) {
          return (
            <div className="flex items-center justify-start overflow-visible">
              <FixtureStatus value={allStatuses[0] as StatusValue} className="overflow-visible" asBadge showObject />
            </div>
          );
        }
        if (allStatuses.length > 8) {
          const statusCounts = allStatuses.reduce((acc, status) => { acc[status] = (acc[status] || 0) + 1; return acc; }, {} as Record<string, number>);
          const summary = Object.entries(statusCounts).map(([status, count]) => `${count} ${getStatusLabel(status)}`).join(", ");
          return <div className="text-body-sm text-[var(--color-text-secondary)]">{summary}</div>;
        }
        return (
          <div className="flex items-center justify-start gap-1 overflow-visible">
            {allStatuses.map((status, index) => (
              <FixtureStatus key={index} value={status as StatusValue} iconOnly showObject className="overflow-visible" />
            ))}
          </div>
        );
      },
    },

    // ── Vessel IMO (simple text, no aggregation) ───────────────────────────
    createTextColumn({
      accessorKey: "vesselImo",
      header: "Vessel IMO",
      label: "Vessel IMO",
      size: 120,
      filterGroup: "Vessel",
      filterVariant: "text",
      icon: iconShip,
      enableGrouping: false,
      mono: true,
    }, highlight),

    // ── Vessel Name (custom — highlighting + aggregated) ───────────────────
    {
      accessorKey: "vessels",
      header: "Vessel Name",
      meta: {
        label: "Vessel Name",
        align: "left",
        filterable: true,
        filterVariant: "multiselect",
        filterGroup: "Vessel",
        icon: iconShip,
      },
      enableGrouping: true,
      enableGlobalFilter: true,
      cell: ({ row }: FixtureCellContext) => {
        const vessels = row.getValue("vessels") as string;
        return (
          <div className="text-body-sm text-[var(--color-text-primary)]">
            {highlight ? highlight(vessels) : vessels}
          </div>
        );
      },
      aggregatedCell: ({ row }: FixtureCellContext) => {
        const uniqueVessels = new Set(row.subRows?.map((r) => r.original.vessels) || []);
        if (uniqueVessels.size === 1) {
          const vessel = Array.from(uniqueVessels)[0] as string;
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {highlight ? highlight(vessel) : vessel}
            </div>
          );
        }
        return <div className="text-body-sm text-[var(--color-text-secondary)]">{uniqueVessels.size} vessels</div>;
      },
    },

    // ── Location: Load ─────────────────────────────────────────────────────
    createTextColumn({
      accessorKey: "loadPortName",
      header: "Load Port",
      label: "Load Port",
      size: 150,
      filterGroup: "Location",
      icon: iconShipLoad,
      enableGrouping: true,
      aggregatedNoun: "ports",
    }, highlight),

    createCountryColumn({
      accessorKey: "loadPortCountry",
      header: "Load Country",
      label: "Load Country",
      size: 130,
      filterGroup: "Location",
      icon: iconMapPin,
      countryCodePath: "loadPort",
    }),

    createTextColumn({
      accessorKey: "loadDeliveryType",
      header: "Load Delivery Type",
      label: "Load Delivery Type",
      size: 150,
      filterGroup: "Location",
      icon: iconTruck,
      enableGrouping: true,
      aggregatedNoun: "types",
    }, highlight),

    // ── Location: Discharge ────────────────────────────────────────────────
    createTextColumn({
      accessorKey: "dischargePortName",
      header: "Discharge Port",
      label: "Discharge Port",
      size: 150,
      filterGroup: "Location",
      icon: iconShipUnload,
      enableGrouping: true,
      aggregatedNoun: "ports",
    }, highlight),

    createCountryColumn({
      accessorKey: "dischargePortCountry",
      header: "Discharge Country",
      label: "Discharge Country",
      size: 150,
      filterGroup: "Location",
      icon: iconMapPin,
      countryCodePath: "dischargePort",
    }),

    createTextColumn({
      accessorKey: "dischargeRedeliveryType",
      header: "Discharge Redelivery Type",
      label: "Discharge Redelivery Type",
      size: 180,
      filterGroup: "Location",
      icon: iconTruck,
      enableGrouping: true,
      aggregatedNoun: "types",
    }, highlight),

    // ── Cargo ──────────────────────────────────────────────────────────────
    createTextColumn({
      accessorKey: "cargoTypeName",
      header: "Cargo Type",
      label: "Cargo Type",
      size: 140,
      filterGroup: "Cargo",
      icon: iconPackage,
      enableGrouping: true,
      aggregatedNoun: "types",
    }, highlight),

    createNumericColumn({
      accessorKey: "cargoQuantity",
      header: "Cargo Quantity (mt)",
      label: "Cargo Quantity (mt)",
      size: 150,
      filterGroup: "Cargo",
      icon: iconWeight,
      format: "quantity",
    }),

    // ── Parties (custom — avatar rendering) ────────────────────────────────
    createPartyColumn("owner", "Owner", iconUserOwner, "ownerAvatarUrl", highlight),
    createPartyColumn("broker", "Broker", iconUserBroker, "brokerAvatarUrl", highlight),
    createPartyColumn("charterer", "Charterer", iconUserCharterer, "chartererAvatarUrl", highlight),

    // ── Laycan (custom — composite date range) ─────────────────────────────
    {
      id: "laycan",
      header: "Laycan",
      size: 150,
      meta: { label: "Laycan", align: "left" },
      enableGrouping: false,
      cell: ({ row }: FixtureCellContext) => {
        const start = row.original.laycanStart;
        const end = row.original.laycanEnd;
        if (!start || !end) return <div className="text-body-sm text-[var(--color-text-primary)]">–</div>;
        return <div className="text-body-sm text-[var(--color-text-primary)]">{formatLaycanRange(start, end)}</div>;
      },
      aggregatedCell: ({ row }: FixtureCellContext) => {
        const laycans = row.subRows?.map((r) => ({ start: r.original.laycanStart, end: r.original.laycanEnd }))
          .filter((l): l is { start: number; end: number } => l.start != null && l.end != null) || [];
        if (laycans.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
        const firstLaycan = formatLaycanRange(laycans[0].start, laycans[0].end);
        const allSame = laycans.every((l) => formatLaycanRange(l.start, l.end) === firstLaycan);
        if (allSame) return <div className="text-body-sm text-[var(--color-text-primary)]">{firstLaycan}</div>;
        return <div className="text-body-sm text-[var(--color-text-secondary)]">{laycans.length} laycans</div>;
      },
    },

    // ── Laycan Start/End (filter-only date columns) ────────────────────────
    createDateColumn({ accessorKey: "laycanStart", header: "Laycan Start", label: "Laycan Start", size: 130, filterGroup: "Date & Time", icon: iconCalendar }),
    createDateColumn({ accessorKey: "laycanEnd", header: "Laycan End", label: "Laycan End", size: 130, filterGroup: "Date & Time", icon: iconCalendar }),

    // ── Commercial: Freight ────────────────────────────────────────────────
    createNumericColumn({ accessorKey: "finalFreightRate", header: "Final Freight Rate", label: "Final Freight Rate", size: 150, filterGroup: "Freight & Demurrage", icon: iconDollar, format: "currencyInline" }),

    // ── Freight Analytics ──────────────────────────────────────────────────
    createNumericColumn({ accessorKey: "highestFreightRateIndication", header: "Highest Freight ($/mt)", label: "Highest Freight ($/mt)", size: 170, filterGroup: "Freight & Demurrage", icon: iconDollar }),
    createNumericColumn({ accessorKey: "lowestFreightRateIndication", header: "Lowest Freight ($/mt)", label: "Lowest Freight ($/mt)", size: 170, filterGroup: "Freight & Demurrage", icon: iconDollar }),
    createNumericColumn({ accessorKey: "firstFreightRateIndication", header: "First Freight ($/mt)", label: "First Freight ($/mt)", size: 160, filterGroup: "Freight & Demurrage", icon: iconDollar }),
    createNumericColumn({ accessorKey: "highestFreightRateLastDay", header: "Highest Freight (Last Day)", label: "Highest Freight (Last Day)", size: 190, filterGroup: "Freight & Demurrage", icon: iconDollar }),
    createNumericColumn({ accessorKey: "lowestFreightRateLastDay", header: "Lowest Freight (Last Day)", label: "Lowest Freight (Last Day)", size: 190, filterGroup: "Freight & Demurrage", icon: iconDollar }),
    createNumericColumn({ accessorKey: "firstFreightRateLastDay", header: "First Freight (Last Day)", label: "First Freight (Last Day)", size: 180, filterGroup: "Freight & Demurrage", icon: iconDollar }),
    createNumericColumn({ accessorKey: "freightSavingsPercent", header: "Freight Savings %", label: "Freight Savings %", size: 150, filterGroup: "Freight & Demurrage", icon: iconTrendingDown, format: "percentSigned" }),
    createNumericColumn({ accessorKey: "marketIndex", header: "Market Index ($/mt)", label: "Market Index ($/mt)", size: 160, filterGroup: "Freight & Demurrage", icon: iconActivity }),

    createTextColumn({
      accessorKey: "marketIndexName",
      header: "Index Name",
      label: "Index Name",
      size: 140,
      filterGroup: "Freight & Demurrage",
      icon: iconActivity,
      enableGrouping: true,
      aggregatedNoun: "indices",
    }, highlight),

    createNumericColumn({ accessorKey: "freightVsMarketPercent", header: "Freight vs Market %", label: "Freight vs Market %", size: 160, filterGroup: "Freight & Demurrage", icon: iconActivity, format: "percentSigned" }),
    createNumericColumn({ accessorKey: "grossFreight", header: "Gross Freight", label: "Gross Freight", size: 140, filterGroup: "Freight & Demurrage", icon: iconDollar, format: "currency" }),

    // ── Commercial: Demurrage ──────────────────────────────────────────────
    createNumericColumn({ accessorKey: "finalDemurrageRate", header: "Final Demurrage Rate", label: "Final Demurrage Rate", size: 170, filterGroup: "Freight & Demurrage", icon: iconDollar, format: "currencyInline" }),
    createNumericColumn({ accessorKey: "highestDemurrageIndication", header: "Highest Demurrage ($/pd)", label: "Highest Demurrage ($/pd)", size: 190, filterGroup: "Freight & Demurrage", icon: iconClock }),
    createNumericColumn({ accessorKey: "lowestDemurrageIndication", header: "Lowest Demurrage ($/pd)", label: "Lowest Demurrage ($/pd)", size: 190, filterGroup: "Freight & Demurrage", icon: iconClock }),
    createNumericColumn({ accessorKey: "demurrageSavingsPercent", header: "Demurrage Savings %", label: "Demurrage Savings %", size: 170, filterGroup: "Freight & Demurrage", icon: iconTrendingDown, format: "percentSigned" }),

    // ── Commissions ────────────────────────────────────────────────────────
    createNumericColumn({ accessorKey: "addressCommissionPercent", header: "Address Commission %", label: "Address Commission %", size: 170, filterGroup: "Commissions", icon: iconPercent, format: "percent" }),
    createNumericColumn({ accessorKey: "addressCommissionTotal", header: "Address Commission ($)", label: "Address Commission ($)", size: 170, filterGroup: "Commissions", icon: iconDollar, format: "currency" }),
    createNumericColumn({ accessorKey: "brokerCommissionPercent", header: "Broker Commission %", label: "Broker Commission %", size: 170, filterGroup: "Commissions", icon: iconPercent, format: "percent" }),
    createNumericColumn({ accessorKey: "brokerCommissionTotal", header: "Broker Commission ($)", label: "Broker Commission ($)", size: 170, filterGroup: "Commissions", icon: iconDollar, format: "currency" }),

    // ── CP Workflow Dates ──────────────────────────────────────────────────
    createDateColumn({ accessorKey: "cpDate", header: "CP Date", label: "CP Date", size: 140, filterGroup: "Date & Time", icon: iconCalendar, dateGranularity: "day" }),
    createDateColumn({ accessorKey: "workingCopyDate", header: "Working Copy Date", label: "Working Copy Date", size: 160, filterGroup: "Date & Time", icon: iconCalendar, dateGranularity: "day" }),
    createDateColumn({ accessorKey: "finalDate", header: "Final Date", label: "Final Date", size: 150, filterGroup: "Date & Time", icon: iconCalendar, dateGranularity: "day" }),
    createDateColumn({ accessorKey: "fullySignedDate", header: "Fully Signed Date", label: "Fully Signed Date", size: 160, filterGroup: "Date & Time", icon: iconCalendar, dateGranularity: "day" }),

    // ── Duration metrics ───────────────────────────────────────────────────
    createNumericColumn({ accessorKey: "daysToWorkingCopy", header: "Days: CP → Working Copy", label: "Days: CP → Working Copy", size: 180, filterGroup: "Date & Time", icon: iconClock, format: "days" }),
    createNumericColumn({ accessorKey: "daysToFinal", header: "Days: Working Copy → Final", label: "Days: Working Copy → Final", size: 200, filterGroup: "Date & Time", icon: iconClock, format: "days" }),
    createNumericColumn({ accessorKey: "daysToSigned", header: "Days: Final → Signed", label: "Days: Final → Signed", size: 170, filterGroup: "Date & Time", icon: iconClock, format: "days" }),

    // ── Approvals ──────────────────────────────────────────────────────────
    createTextColumn({ accessorKey: "ownerApprovalStatus", header: "Owner Approval", label: "Owner Approval", size: 140, filterGroup: "Status", icon: iconCheckCircle, enableGrouping: true, enableSorting: false, aggregatedNoun: "statuses" }, highlight),
    createTextColumn({ accessorKey: "ownerApprovedBy", header: "Owner Approved By", label: "Owner Approved By", size: 160, filterGroup: "Parties", icon: iconUserOwner, enableSorting: false }, highlight),
    createDateColumn({ accessorKey: "ownerApprovalDate", header: "Owner Approval Date", label: "Owner Approval Date", size: 170, filterGroup: "Date & Time", icon: iconCalendar, dateGranularity: "day", enableSorting: false }),
    createTextColumn({ accessorKey: "chartererApprovalStatus", header: "Charterer Approval", label: "Charterer Approval", size: 160, filterGroup: "Status", icon: iconCheckCircle, enableGrouping: true, enableSorting: false, aggregatedNoun: "statuses" }, highlight),
    createTextColumn({ accessorKey: "chartererApprovedBy", header: "Charterer Approved By", label: "Charterer Approved By", size: 180, filterGroup: "Parties", icon: iconUserCharterer, enableSorting: false }, highlight),
    createDateColumn({ accessorKey: "chartererApprovalDate", header: "Charterer Approval Date", label: "Charterer Approval Date", size: 190, filterGroup: "Date & Time", icon: iconCalendar, dateGranularity: "day", enableSorting: false }),

    // ── Signatures ─────────────────────────────────────────────────────────
    createTextColumn({ accessorKey: "ownerSignatureStatus", header: "Owner Signature", label: "Owner Signature", size: 150, filterGroup: "Status", icon: iconPenTool, enableGrouping: true, enableSorting: false, aggregatedNoun: "statuses" }, highlight),
    createTextColumn({ accessorKey: "ownerSignedBy", header: "Owner Signed By", label: "Owner Signed By", size: 150, filterGroup: "Parties", icon: iconUserOwner, enableSorting: false }, highlight),
    createDateColumn({ accessorKey: "ownerSignatureDate", header: "Owner Signature Date", label: "Owner Signature Date", size: 170, filterGroup: "Date & Time", icon: iconCalendar, dateGranularity: "day", enableSorting: false }),
    createTextColumn({ accessorKey: "chartererSignatureStatus", header: "Charterer Signature", label: "Charterer Signature", size: 170, filterGroup: "Status", icon: iconPenTool, enableGrouping: true, enableSorting: false, aggregatedNoun: "statuses" }, highlight),
    createTextColumn({ accessorKey: "chartererSignedBy", header: "Charterer Signed By", label: "Charterer Signed By", size: 170, filterGroup: "Parties", icon: iconUserCharterer, enableSorting: false }, highlight),
    createDateColumn({ accessorKey: "chartererSignatureDate", header: "Charterer Signature Date", label: "Charterer Signature Date", size: 190, filterGroup: "Date & Time", icon: iconCalendar, dateGranularity: "day", enableSorting: false }),

    // ── User Tracking ──────────────────────────────────────────────────────
    createTextColumn({ accessorKey: "dealCaptureUser", header: "Deal Capture", label: "Deal Capture", size: 140, filterGroup: "Parties", icon: iconUserCreatedBy, enableGrouping: true, enableSorting: false, aggregatedNoun: "users" }, highlight),
    createTextColumn({ accessorKey: "orderCreatedBy", header: "Order Created By", label: "Order Created By", size: 160, filterGroup: "Parties", icon: iconUserCreatedBy, enableGrouping: true, enableSorting: false, aggregatedNoun: "users" }, highlight),
    createTextColumn({ accessorKey: "negotiationCreatedBy", header: "Neg. Created By", label: "Neg. Created By", size: 160, filterGroup: "Parties", icon: iconUserCreatedBy, enableGrouping: true, enableSorting: false, aggregatedNoun: "users" }, highlight),

    // ── Meta & Relationships ───────────────────────────────────────────────
    createTextColumn({ accessorKey: "parentCpId", header: "Parent CP", label: "Parent CP", size: 130, filterGroup: "Contract", filterVariant: "text", icon: iconGitBranch, enableGrouping: true, mono: true, aggregatedNoun: "parents" }, highlight),

    // ── Contract Type (custom — display mapping) ───────────────────────────
    {
      accessorKey: "contractType",
      header: "Contract Type",
      size: 140,
      meta: {
        label: "Contract Type",
        align: "left",
        filterable: true,
        filterVariant: "multiselect",
        filterGroup: "Contract",
        icon: iconFileCheck,
      },
      enableGrouping: true,
      enableGlobalFilter: true,
      cell: ({ getValue }: FixtureCellContext) => {
        const value = getValue<string>();
        const displayValue = value === "voyage-charter" ? "Voyage charter"
          : value === "time-charter" ? "TC"
          : value === "coa" ? "COA"
          : value || "–";
        return <div className="text-body-sm text-[var(--color-text-primary)]">{displayValue}</div>;
      },
      aggregatedCell: ({ row }: FixtureCellContext) => {
        const values = new Set(row.subRows?.map((r) => r.original.contractType) || []);
        if (values.size === 1) {
          const value = Array.from(values)[0] as string;
          const displayValue = value === "voyage-charter" ? "Voyage charter" : value === "time-charter" ? "TC" : value === "coa" ? "COA" : value || "–";
          return <div className="text-body-sm text-[var(--color-text-primary)]">{displayValue}</div>;
        }
        return <div className="text-body-sm text-[var(--color-text-secondary)]">{values.size} types</div>;
      },
    },

    // ── Last Updated (custom — always last, with custom aggregation fn) ────
    {
      accessorKey: "lastUpdated",
      header: "Last Updated",
      size: 150,
      meta: {
        label: "Last Updated",
        align: "left",
        filterable: true,
        filterVariant: "date",
        filterGroup: "Date & Time",
        icon: iconCalendar,
      },
      enableGrouping: false,
      aggregationFn: (columnId: string, leafRows: FixtureRow[]) => {
        const timestamps = leafRows.map((row) => row.getValue(columnId) as number | undefined).filter(isDefined);
        return timestamps.length > 0 ? Math.max(...timestamps) : 0;
      },
      cell: ({ row }: FixtureCellContext) => {
        const timestamp = row.getValue("lastUpdated") as number;
        return <div className="text-body-sm text-[var(--color-text-primary)]">{formatTimestamp(timestamp)}</div>;
      },
      aggregatedCell: ({ row }: FixtureCellContext) => {
        const timestamps = row.subRows?.map((r) => r.original?.lastUpdated).filter(isDefined) || [];
        if (timestamps.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
        const earliest = Math.min(...timestamps);
        const latest = Math.max(...timestamps);
        if (earliest === latest) return <div className="text-body-sm text-[var(--color-text-primary)]">{formatTimestamp(latest)}</div>;
        return <div className="text-body-sm text-[var(--color-text-primary)]">{formatTimestamp(earliest)} – {formatTimestamp(latest)}</div>;
      },
    },
  ];
}
