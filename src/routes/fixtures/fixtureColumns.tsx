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
  Flag,
  type StatusValue,
} from "@rafal.lemieszewski/tide-ui";
import type { FixtureData } from "../../types/fixture";
import type { CellContext, Row } from "@tanstack/react-table";
import {
  formatLaycanRange,
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatTimestamp,
  getStatusLabel as getStatusLabelBase,
  getCompanyInitials,
  pluralize,
} from "../../utils/dataUtils";

// Type aliases for TanStack Table
type FixtureCellContext<TValue = unknown> = CellContext<FixtureData, TValue>;
type FixtureRow = Row<FixtureData>;

// Wrap getStatusLabel to bind statusConfig from tide-ui
const getStatusLabel = (status: string): string =>
  getStatusLabelBase(status, statusConfig);

const HIGHLIGHT_STYLE = {
  backgroundColor: 'var(--yellow-200, #fef08a)',
  color: 'var(--color-text-primary, inherit)',
  borderRadius: '2px',
  padding: '0 2px',
} as const;

// Pure function to highlight search terms in text — no closure deps
function highlightSearchTerms(text: string, terms: string[]) {
  if (!terms.length || !text) return text;

  const pattern = terms
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const testRegex = new RegExp(`^(${pattern})$`, 'i');
    if (testRegex.test(part)) {
      return (
        <mark key={i} style={HIGHLIGHT_STYLE}>
          {part}
        </mark>
      );
    }
    return part;
  });
}

// Type guard for filtering out null/undefined values
const isDefined = <T,>(value: T | null | undefined): value is T => value != null;

export function createFixtureColumns(opts: {
  globalSearchTerms: string[];
  onFixtureSelect: (fixture: FixtureData, rowId: string) => void;
}): ColumnDef<FixtureData>[] {
  const { globalSearchTerms, onFixtureSelect } = opts;

  return [
      {
        accessorKey: "fixtureId",
        header: "Fixture ID",
        meta: {
          label: "Fixture ID",
          align: "left",
        },
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
                  {highlightSearchTerms(value, globalSearchTerms)}
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

          // Only display Order ID when grouped by fixtureId AND fixtureId column is hidden
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

          // Default: Show fixture ID
          return (
            <div className="text-body-sm font-medium text-[var(--color-text-primary)]">
              {row.getValue("fixtureId")} ({count} {count === 1 ? "contract" : "contracts"})
            </div>
          );
        },
      },
      {
        accessorKey: "orderId",
        header: "Order ID",
        meta: {
          label: "Order ID",
          align: "left",
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row, table }: FixtureCellContext) => {
          // Grouped row (has subRows): Only show special display when grouped by fixtureId with it hidden
          if (row.subRows?.length > 0) {
            const isGroupedByFixtureId = row.groupingColumnId === "fixtureId";
            const isFixtureIdHidden = table.getState().columnVisibility.fixtureId === false;

            // Special case: Show order ID when grouped by fixtureId with fixtureId hidden
            if (isGroupedByFixtureId && isFixtureIdHidden) {
              const orderId = row.subRows[0]?.original?.orderId;
              const count = row.subRows?.length || 0;

              if (!orderId) {
                return (
                  <div className="text-body-sm text-[var(--color-text-secondary)]">
                    –
                  </div>
                );
              }

              return (
                <div className="flex items-center gap-1.5">
                  <span className="text-body-sm font-mono font-semibold text-[var(--color-text-primary)]">
                    {orderId}
                  </span>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-bg-secondary)] text-caption-sm font-medium text-[var(--color-text-secondary)]">
                    {count}
                  </span>
                </div>
              );
            }

            // For other groupings, don't render anything (let the grouped column show)
            return null;
          }

          // Leaf row: Use row.original to get actual order ID
          const value = row.original?.orderId || "";
          if (!value) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                -
              </div>
            );
          }
          return (
            <button
              className="text-body-sm font-mono text-[var(--blue-600)] hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                // Handle Order ID click if needed
              }}
            >
              {highlightSearchTerms(value, globalSearchTerms)}
            </button>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const orderId = row.subRows[0]?.original?.orderId;
          // Show bold when: (1) grouped by orderId OR (2) grouped by fixtureId (All Fixtures with orderId as display column)
          const isGroupedByOrderId = row.groupingColumnId === "orderId" || row.groupingColumnId === "fixtureId";

          if (!orderId) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                –
              </div>
            );
          }

          return (
            <div className={`text-body-sm font-mono ${isGroupedByOrderId ? 'font-semibold' : ''} text-[var(--color-text-primary)]`}>
              {orderId}
            </div>
          );
        },
      },
      {
        accessorKey: "negotiationId",
        header: "Negotiation ID",
        meta: {
          label: "Negotiation ID",
          align: "left",
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: FixtureCellContext) => {
          const negotiationId = row.getValue("negotiationId") as string;
          if (negotiationId === "-") {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                -
              </div>
            );
          }
          return (
            <div className="text-body-sm font-mono text-[var(--color-text-primary)]">
              {negotiationId}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const negotiationIds = row.subRows.map((r) => r.original?.negotiationId).filter((id: string) => id && id !== "-");
          const uniqueNegotiationIds = Array.from(new Set(negotiationIds)) as string[];

          // No negotiation IDs - show em dash
          if (uniqueNegotiationIds.length === 0) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                –
              </div>
            );
          }

          // Single Negotiation ID - show the actual value
          if (uniqueNegotiationIds.length === 1) {
            return (
              <div className="text-body-sm font-mono text-[var(--color-text-primary)]">
                {String(uniqueNegotiationIds[0])}
              </div>
            );
          }

          // Multiple Negotiation IDs - show count
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {uniqueNegotiationIds.length} {uniqueNegotiationIds.length === 1 ? "negotiation" : "negotiations"}
            </div>
          );
        },
      },
      {
        accessorKey: "cpId",
        header: "CP ID",
        meta: {
          label: "CP ID",
          align: "left",
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: FixtureCellContext) => {
          const cpId = row.getValue("cpId") as string | undefined;

          // Parent rows without cpId show em dash
          if (!cpId) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                –
              </div>
            );
          }

          return (
            <button
              className="text-body-sm font-mono text-[var(--blue-600)] hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                // Handle CP ID click if needed
              }}
            >
              {highlightSearchTerms(cpId, globalSearchTerms)}
            </button>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const cpIds = row.subRows.map((r) => r.original?.cpId).filter(Boolean);
          const uniqueCpIds = Array.from(new Set(cpIds)) as string[];

          // No CP IDs - show em dash
          if (uniqueCpIds.length === 0) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                –
              </div>
            );
          }

          // Single CP ID - show the actual value
          if (uniqueCpIds.length === 1) {
            return (
              <div className="text-body-sm font-mono text-[var(--color-text-primary)]">
                {String(uniqueCpIds[0])}
              </div>
            );
          }

          // Multiple CP IDs - show count
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {uniqueCpIds.length} {uniqueCpIds.length === 1 ? "contract" : "contracts"}
            </div>
          );
        },
      },
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
          icon: ({ className }) => <Icon name="circle-check-big" className={className} aria-hidden="true" />,
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

          // Single item group - show full status label with object prefix
          if (row.subRows?.length === 1) {
            return (
              <div className="flex items-center justify-start overflow-visible">
                <FixtureStatus value={allStatuses[0] as StatusValue} className="overflow-visible" asBadge showObject />
              </div>
            );
          }

          // More than 8 items - show text summary
          if (allStatuses.length > 8) {
            const statusCounts = allStatuses.reduce((acc, status) => {
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            const summary = Object.entries(statusCounts)
              .map(([status, count]) => {
                const label = getStatusLabel(status);
                return `${count} ${label}`;
              })
              .join(', ');

            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                {summary}
              </div>
            );
          }

          // 8 or fewer - show icons with tooltips
          return (
            <div className="flex items-center justify-start gap-1 overflow-visible">
              {allStatuses.map((status, index) => (
                <FixtureStatus key={index} value={status as StatusValue} iconOnly showObject className="overflow-visible" />
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "vesselImo",
        header: "Vessel IMO",
        size: 120,
        meta: {
          label: "Vessel IMO",
          align: "left",
          filterable: true,
          filterVariant: "text",
          filterGroup: "Vessel",
          icon: ({ className }) => <Icon name="ship" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        enableGlobalFilter: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm font-mono text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
      },
      {
        accessorKey: "vessels",
        header: "Vessel Name",
        meta: {
          label: "Vessel Name",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Vessel",
          icon: ({ className }) => <Icon name="ship" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: FixtureCellContext) => {
          const vessels = row.getValue("vessels") as string;
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {highlightSearchTerms(vessels, globalSearchTerms)}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const uniqueVessels = new Set(row.subRows?.map((r) => r.original.vessels) || []);

          // If only one unique vessel, show the name with highlighting
          if (uniqueVessels.size === 1) {
            const vessel = Array.from(uniqueVessels)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {highlightSearchTerms(vessel, globalSearchTerms)}
              </div>
            );
          }

          // Multiple vessels - show count
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {uniqueVessels.size} vessels
            </div>
          );
        },
      },

      // Location - Load
      {
        accessorKey: "loadPortName",
        header: "Load Port",
        size: 150,
        meta: {
          label: "Load Port",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Location",
          icon: ({ className }) => <Icon name="ship-load" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.loadPortName) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} ports
            </div>
          );
        },
      },
      {
        accessorKey: "loadPortCountry",
        header: "Load Country",
        size: 130,
        meta: {
          label: "Load Country",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Location",
          icon: ({ className }) => <Icon name="map-pin" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue, row }) => {
          const value = getValue<string>();
          const countryCode = row.original.loadPort?.countryCode;
          return (
            <div className="flex items-center gap-2">
              {countryCode && <Flag country={countryCode} />}
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.loadPortCountry) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            const countryCode = row.subRows?.[0]?.original.loadPort?.countryCode;
            return (
              <div className="flex items-center gap-2">
                {countryCode && <Flag country={countryCode} />}
                <div className="text-body-sm text-[var(--color-text-primary)]">
                  {value || "–"}
                </div>
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} countries
            </div>
          );
        },
      },
      {
        accessorKey: "loadDeliveryType",
        header: "Load Delivery Type",
        size: 150,
        meta: {
          label: "Load Delivery Type",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Location",
          icon: ({ className }) => <Icon name="truck" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.loadDeliveryType) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} types
            </div>
          );
        },
      },

      // Location - Discharge
      {
        accessorKey: "dischargePortName",
        header: "Discharge Port",
        size: 150,
        meta: {
          label: "Discharge Port",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Location",
          icon: ({ className }) => <Icon name="ship-unload" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.dischargePortName) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} ports
            </div>
          );
        },
      },
      {
        accessorKey: "dischargePortCountry",
        header: "Discharge Country",
        size: 150,
        meta: {
          label: "Discharge Country",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Location",
          icon: ({ className }) => <Icon name="map-pin" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue, row }) => {
          const value = getValue<string>();
          const countryCode = row.original.dischargePort?.countryCode;
          return (
            <div className="flex items-center gap-2">
              {countryCode && <Flag country={countryCode} />}
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.dischargePortCountry) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            const countryCode = row.subRows?.[0]?.original.dischargePort?.countryCode;
            return (
              <div className="flex items-center gap-2">
                {countryCode && <Flag country={countryCode} />}
                <div className="text-body-sm text-[var(--color-text-primary)]">
                  {value || "–"}
                </div>
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} countries
            </div>
          );
        },
      },
      {
        accessorKey: "dischargeRedeliveryType",
        header: "Discharge Redelivery Type",
        size: 180,
        meta: {
          label: "Discharge Redelivery Type",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Location",
          icon: ({ className }) => <Icon name="truck" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.dischargeRedeliveryType) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} types
            </div>
          );
        },
      },

      // Cargo
      {
        accessorKey: "cargoTypeName",
        header: "Cargo Type",
        size: 140,
        meta: {
          label: "Cargo Type",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Cargo",
          icon: ({ className }) => <Icon name="package" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.cargoTypeName) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} types
            </div>
          );
        },
      },
      {
        accessorKey: "cargoQuantity",
        header: "Cargo Quantity (mt)",
        size: 150,
        meta: {
          label: "Cargo Quantity (mt)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Cargo",
          icon: ({ className }) => <Icon name="weight" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? formatQuantity(value) : "–"}
            </div>
          );
        },
      },

      // Parties
      {
        accessorKey: "owner",
        header: "Owner",
        meta: {
          label: "Owner",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Parties",
          icon: ({ className }) => <Icon name="user-owner" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: FixtureCellContext) => {
          const owner = row.getValue("owner") as string;
          const ownerAvatarUrl = row.original.ownerAvatarUrl;
          const isPlaceholder = owner === "-" || owner === "Unknown";
          return (
            <div className="flex items-center gap-2">
              {!isPlaceholder && (
                <Avatar type="organization" size="xxs">
                  <AvatarImage src={ownerAvatarUrl || undefined} alt={owner} />
                  <AvatarFallback>{getCompanyInitials(owner)}</AvatarFallback>
                </Avatar>
              )}
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {highlightSearchTerms(owner, globalSearchTerms)}
              </div>
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          // Collect unique owners with avatar data
          const uniqueOwners = Array.from(
            new Map(
              row.subRows
                ?.filter((r) => r.original.owner !== "-" && r.original.owner !== "Unknown")
                .map((r) => [
                  r.original.owner,
                  { name: r.original.owner as string, avatarUrl: r.original.ownerAvatarUrl as string | undefined }
                ])
            ).values()
          ) as Array<{ name: string; avatarUrl?: string }>;

          // Single owner: avatar + name
          if (uniqueOwners.length === 1) {
            const owner = uniqueOwners[0];
            return (
              <div className="flex items-center gap-2">
                <Avatar type="organization" size="xxs">
                  <AvatarImage src={owner.avatarUrl || undefined} alt={owner.name} />
                  <AvatarFallback>{getCompanyInitials(owner.name)}</AvatarFallback>
                </Avatar>
                <div className="text-body-sm text-[var(--color-text-primary)]">
                  {highlightSearchTerms(owner.name, globalSearchTerms)}
                </div>
              </div>
            );
          }

          // More than 8 total items - show count
          if (row.subRows?.length > 8) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                {uniqueOwners.length} owners
              </div>
            );
          }

          // Multiple owners: list avatars in a row
          const displayOwners = uniqueOwners.slice(0, 5);
          return (
            <div className="flex items-center gap-1">
              {displayOwners.map((owner, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div>
                      <Avatar type="organization" size="xxs">
                        <AvatarImage src={owner.avatarUrl || undefined} alt={owner.name} />
                        <AvatarFallback>{getCompanyInitials(owner.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{owner.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "broker",
        header: "Broker",
        meta: {
          label: "Broker",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Parties",
          icon: ({ className }) => <Icon name="user-broker" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: FixtureCellContext) => {
          const broker = row.getValue("broker") as string;
          const brokerAvatarUrl = row.original.brokerAvatarUrl;
          const isPlaceholder = broker === "-" || broker === "Unknown";
          return (
            <div className="flex items-center gap-2">
              {!isPlaceholder && (
                <Avatar type="organization" size="xxs">
                  <AvatarImage src={brokerAvatarUrl || undefined} alt={broker} />
                  <AvatarFallback>{getCompanyInitials(broker)}</AvatarFallback>
                </Avatar>
              )}
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {highlightSearchTerms(broker, globalSearchTerms)}
              </div>
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          // Collect unique brokers with avatar data
          const uniqueBrokers = Array.from(
            new Map(
              row.subRows
                ?.filter((r) => r.original.broker !== "-" && r.original.broker !== "Unknown")
                .map((r) => [
                  r.original.broker,
                  { name: r.original.broker as string, avatarUrl: r.original.brokerAvatarUrl as string | undefined }
                ])
            ).values()
          ) as Array<{ name: string; avatarUrl?: string }>;

          // Single broker: avatar + name
          if (uniqueBrokers.length === 1) {
            const broker = uniqueBrokers[0];
            return (
              <div className="flex items-center gap-2">
                <Avatar type="organization" size="xxs">
                  <AvatarImage src={broker.avatarUrl || undefined} alt={broker.name} />
                  <AvatarFallback>{getCompanyInitials(broker.name)}</AvatarFallback>
                </Avatar>
                <div className="text-body-sm text-[var(--color-text-primary)]">
                  {highlightSearchTerms(broker.name, globalSearchTerms)}
                </div>
              </div>
            );
          }

          // More than 8 total items - show count
          if (row.subRows?.length > 8) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                {uniqueBrokers.length} brokers
              </div>
            );
          }

          // Multiple brokers: list avatars in a row
          const displayBrokers = uniqueBrokers.slice(0, 5);
          return (
            <div className="flex items-center gap-1">
              {displayBrokers.map((broker, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div>
                      <Avatar type="organization" size="xxs">
                        <AvatarImage src={broker.avatarUrl || undefined} alt={broker.name} />
                        <AvatarFallback>{getCompanyInitials(broker.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{broker.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "charterer",
        header: "Charterer",
        meta: {
          label: "Charterer",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Parties",
          icon: ({ className }) => <Icon name="user-charterer" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: FixtureCellContext) => {
          const charterer = row.getValue("charterer") as string;
          const chartererAvatarUrl = row.original.chartererAvatarUrl;
          const isPlaceholder = charterer === "-" || charterer === "Unknown";
          return (
            <div className="flex items-center gap-2">
              {!isPlaceholder && (
                <Avatar type="organization" size="xxs">
                  <AvatarImage src={chartererAvatarUrl || undefined} alt={charterer} />
                  <AvatarFallback>{getCompanyInitials(charterer)}</AvatarFallback>
                </Avatar>
              )}
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {highlightSearchTerms(charterer, globalSearchTerms)}
              </div>
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          // Collect unique charterers with avatar data
          const uniqueCharterers = Array.from(
            new Map(
              row.subRows
                ?.filter((r) => r.original.charterer !== "-" && r.original.charterer !== "Unknown")
                .map((r) => [
                  r.original.charterer,
                  { name: r.original.charterer as string, avatarUrl: r.original.chartererAvatarUrl as string | undefined }
                ])
            ).values()
          ) as Array<{ name: string; avatarUrl?: string }>;

          // Single charterer: avatar + name
          if (uniqueCharterers.length === 1) {
            const charterer = uniqueCharterers[0];
            return (
              <div className="flex items-center gap-2">
                <Avatar type="organization" size="xxs">
                  <AvatarImage src={charterer.avatarUrl || undefined} alt={charterer.name} />
                  <AvatarFallback>{getCompanyInitials(charterer.name)}</AvatarFallback>
                </Avatar>
                <div className="text-body-sm text-[var(--color-text-primary)]">
                  {highlightSearchTerms(charterer.name, globalSearchTerms)}
                </div>
              </div>
            );
          }

          // More than 8 total items - show count
          if (row.subRows?.length > 8) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                {uniqueCharterers.length} charterers
              </div>
            );
          }

          // Multiple charterers: list avatars in a row
          const displayCharterers = uniqueCharterers.slice(0, 5);
          return (
            <div className="flex items-center gap-1">
              {displayCharterers.map((charterer, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div>
                      <Avatar type="organization" size="xxs">
                        <AvatarImage src={charterer.avatarUrl || undefined} alt={charterer.name} />
                        <AvatarFallback>{getCompanyInitials(charterer.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{charterer.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          );
        },
      },

      // Commercial - Laycan
      {
        id: "laycan",
        header: "Laycan",
        size: 150,
        meta: { label: "Laycan", align: "left" },
        enableGrouping: false,
        cell: ({ row }) => {
          const start = row.original.laycanStart;
          const end = row.original.laycanEnd;
          if (!start || !end) {
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">–</div>
            );
          }

          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {formatLaycanRange(start, end)}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const laycans = row.subRows?.map((r) => ({
            start: r.original.laycanStart,
            end: r.original.laycanEnd
          })).filter((l): l is { start: number; end: number } => l.start != null && l.end != null) || [];

          if (laycans.length === 0) {
            return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
          }

          // Check if all laycans are the same
          const firstLaycan = formatLaycanRange(laycans[0].start, laycans[0].end);
          const allSame = laycans.every((l) =>
            formatLaycanRange(l.start, l.end) === firstLaycan
          );

          if (allSame) {
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {firstLaycan}
              </div>
            );
          }

          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {laycans.length} laycans
            </div>
          );
        },
      },

      // Filter-only columns for laycan date filtering (hidden, filterable)
      {
        accessorKey: "laycanStart",
        header: "Laycan Start",
        size: 130,
        meta: {
          label: "Laycan Start",
          align: "left",
          filterable: true,
          filterVariant: "date",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value ? formatTimestamp(value) : "-"}
            </div>
          );
        },
      },
      {
        accessorKey: "laycanEnd",
        header: "Laycan End",
        size: 130,
        meta: {
          label: "Laycan End",
          align: "left",
          filterable: true,
          filterVariant: "date",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value ? formatTimestamp(value) : "-"}
            </div>
          );
        },
      },

      // Commercial - Freight
      {
        accessorKey: "finalFreightRate",
        header: "Final Freight Rate",
        size: 150,
        meta: {
          label: "Final Freight Rate",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<string | number>();
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {numValue != null && !isNaN(numValue) ? `$${numValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => {
            const v = r.original.finalFreightRate;
            return typeof v === 'string' ? parseFloat(v) : v;
          }).filter((v): v is number => v != null && !isNaN(v)) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
        },
      },

      // Freight Analytics
      {
        accessorKey: "highestFreightRateIndication",
        header: "Highest Freight ($/mt)",
        size: 170,
        meta: {
          label: "Highest Freight ($/mt)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => r.original.highestFreightRateIndication).filter((v): v is number => v != null) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
        },
      },
      {
        accessorKey: "lowestFreightRateIndication",
        header: "Lowest Freight ($/mt)",
        size: 170,
        meta: {
          label: "Lowest Freight ($/mt)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => r.original.lowestFreightRateIndication).filter((v): v is number => v != null) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
        },
      },
      {
        accessorKey: "firstFreightRateIndication",
        header: "First Freight ($/mt)",
        size: 160,
        meta: {
          label: "First Freight ($/mt)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => r.original.firstFreightRateIndication).filter((v): v is number => v != null) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
        },
      },
      {
        accessorKey: "highestFreightRateLastDay",
        header: "Highest Freight (Last Day)",
        size: 190,
        meta: {
          label: "Highest Freight (Last Day)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => r.original.highestFreightRateLastDay).filter((v): v is number => v != null) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
        },
      },
      {
        accessorKey: "lowestFreightRateLastDay",
        header: "Lowest Freight (Last Day)",
        size: 190,
        meta: {
          label: "Lowest Freight (Last Day)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => r.original.lowestFreightRateLastDay).filter((v): v is number => v != null) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
        },
      },
      {
        accessorKey: "firstFreightRateLastDay",
        header: "First Freight (Last Day)",
        size: 180,
        meta: {
          label: "First Freight (Last Day)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => r.original.firstFreightRateLastDay).filter((v): v is number => v != null) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
        },
      },
      {
        accessorKey: "freightSavingsPercent",
        header: "Freight Savings %",
        size: 150,
        meta: {
          label: "Freight Savings %",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="trending-down" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          if (value === undefined) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;

          const color = value > 0 ? "text-[var(--green-600)]" : value < 0 ? "text-[var(--red-600)]" : "text-[var(--color-text-primary)]";
          return (
            <div className={`text-body-sm ${color} text-right font-variant-numeric-tabular`}>
              {formatPercent(value, 2, true)}
            </div>
          );
        },
      },
      {
        accessorKey: "marketIndex",
        header: "Market Index ($/mt)",
        size: 160,
        meta: {
          label: "Market Index ($/mt)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="activity" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => r.original.marketIndex).filter((v): v is number => v != null) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
        },
      },
      {
        accessorKey: "marketIndexName",
        header: "Index Name",
        size: 140,
        meta: {
          label: "Index Name",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="activity" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.marketIndexName) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} indices
            </div>
          );
        },
      },
      {
        accessorKey: "freightVsMarketPercent",
        header: "Freight vs Market %",
        size: 160,
        meta: {
          label: "Freight vs Market %",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="activity" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          if (value === undefined) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;

          const color = value < 0 ? "text-[var(--green-600)]" : value > 0 ? "text-[var(--red-600)]" : "text-[var(--color-text-primary)]";
          return (
            <div className={`text-body-sm ${color} text-right font-variant-numeric-tabular`}>
              {formatPercent(value, 2, true)}
            </div>
          );
        },
      },
      {
        accessorKey: "grossFreight",
        header: "Gross Freight",
        size: 140,
        meta: {
          label: "Gross Freight",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? formatCurrency(value) : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => r.original.grossFreight).filter((v): v is number => v != null) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">{formatCurrency(min)}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">{formatCurrency(min)} – {formatCurrency(max)}</div>;
        },
      },

      // Commercial - Demurrage
      {
        accessorKey: "finalDemurrageRate",
        header: "Final Demurrage Rate",
        size: 170,
        meta: {
          label: "Final Demurrage Rate",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<string | number>();
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {numValue != null && !isNaN(numValue) ? `$${numValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => {
            const v = r.original.finalDemurrageRate;
            return typeof v === 'string' ? parseFloat(v) : v;
          }).filter((v): v is number => v != null && !isNaN(v)) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
        },
      },
      {
        accessorKey: "highestDemurrageIndication",
        header: "Highest Demurrage ($/pd)",
        size: 190,
        meta: {
          label: "Highest Demurrage ($/pd)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="clock" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => r.original.highestDemurrageIndication).filter((v): v is number => v != null) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
        },
      },
      {
        accessorKey: "lowestDemurrageIndication",
        header: "Lowest Demurrage ($/pd)",
        size: 190,
        meta: {
          label: "Lowest Demurrage ($/pd)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="clock" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = row.subRows?.map((r) => r.original.lowestDemurrageIndication).filter((v): v is number => v != null) || [];
          if (values.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            return <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">${min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
        },
      },
      {
        accessorKey: "demurrageSavingsPercent",
        header: "Demurrage Savings %",
        size: 170,
        meta: {
          label: "Demurrage Savings %",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Freight & Demurrage",
          icon: ({ className }) => <Icon name="trending-down" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          if (value === undefined) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;

          const color = value > 0 ? "text-[var(--green-600)]" : value < 0 ? "text-[var(--red-600)]" : "text-[var(--color-text-primary)]";
          return (
            <div className={`text-body-sm ${color} text-right font-variant-numeric-tabular`}>
              {formatPercent(value, 2, true)}
            </div>
          );
        },
      },

      // Commissions
      {
        accessorKey: "addressCommissionPercent",
        header: "Address Commission %",
        size: 170,
        meta: {
          label: "Address Commission %",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Commissions",
          icon: ({ className }) => <Icon name="percent" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? formatPercent(value, 2) : "–"}
            </div>
          );
        },
      },
      {
        accessorKey: "addressCommissionTotal",
        header: "Address Commission ($)",
        size: 170,
        meta: {
          label: "Address Commission ($)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Commissions",
          icon: ({ className }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? formatCurrency(value) : "–"}
            </div>
          );
        },
      },
      {
        accessorKey: "brokerCommissionPercent",
        header: "Broker Commission %",
        size: 170,
        meta: {
          label: "Broker Commission %",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Commissions",
          icon: ({ className }) => <Icon name="percent" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? formatPercent(value, 2) : "–"}
            </div>
          );
        },
      },
      {
        accessorKey: "brokerCommissionTotal",
        header: "Broker Commission ($)",
        size: 170,
        meta: {
          label: "Broker Commission ($)",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Commissions",
          icon: ({ className }) => <Icon name="dollar-sign" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value != null ? formatCurrency(value) : "–"}
            </div>
          );
        },
      },

      // CP Workflow Dates
      {
        accessorKey: "cpDate",
        header: "CP Date",
        size: 140,
        meta: {
          label: "CP Date",
          align: "left",
          filterable: true,
          filterVariant: "date",
          dateGranularity: "day",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value ? formatTimestamp(value) : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const timestamps = row.subRows?.map((r) => r.original.cpDate).filter(isDefined) || [];
          if (timestamps.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
          const earliest = Math.min(...timestamps);
          const latest = Math.max(...timestamps);
          if (earliest === latest) {
            return <div className="text-body-sm text-[var(--color-text-primary)]">{formatTimestamp(latest)}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)]">{formatTimestamp(earliest)} – {formatTimestamp(latest)}</div>;
        },
      },
      {
        accessorKey: "workingCopyDate",
        header: "Working Copy Date",
        size: 160,
        meta: {
          label: "Working Copy Date",
          align: "left",
          filterable: true,
          filterVariant: "date",
          dateGranularity: "day",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value ? formatTimestamp(value) : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const timestamps = row.subRows?.map((r) => r.original.workingCopyDate).filter(isDefined) || [];
          if (timestamps.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
          const earliest = Math.min(...timestamps);
          const latest = Math.max(...timestamps);
          if (earliest === latest) {
            return <div className="text-body-sm text-[var(--color-text-primary)]">{formatTimestamp(latest)}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)]">{formatTimestamp(earliest)} – {formatTimestamp(latest)}</div>;
        },
      },
      {
        accessorKey: "finalDate",
        header: "Final Date",
        size: 150,
        meta: {
          label: "Final Date",
          align: "left",
          filterable: true,
          filterVariant: "date",
          dateGranularity: "day",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value ? formatTimestamp(value) : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const timestamps = row.subRows?.map((r) => r.original.finalDate).filter(isDefined) || [];
          if (timestamps.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
          const earliest = Math.min(...timestamps);
          const latest = Math.max(...timestamps);
          if (earliest === latest) {
            return <div className="text-body-sm text-[var(--color-text-primary)]">{formatTimestamp(latest)}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)]">{formatTimestamp(earliest)} – {formatTimestamp(latest)}</div>;
        },
      },
      {
        accessorKey: "fullySignedDate",
        header: "Fully Signed Date",
        size: 160,
        meta: {
          label: "Fully Signed Date",
          align: "left",
          filterable: true,
          filterVariant: "date",
          dateGranularity: "day",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value ? formatTimestamp(value) : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const timestamps = row.subRows?.map((r) => r.original.fullySignedDate).filter(isDefined) || [];
          if (timestamps.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
          const earliest = Math.min(...timestamps);
          const latest = Math.max(...timestamps);
          if (earliest === latest) {
            return <div className="text-body-sm text-[var(--color-text-primary)]">{formatTimestamp(latest)}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)]">{formatTimestamp(earliest)} – {formatTimestamp(latest)}</div>;
        },
      },
      {
        accessorKey: "daysToWorkingCopy",
        header: "Days: CP → Working Copy",
        size: 180,
        meta: {
          label: "Days: CP → Working Copy",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="clock" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          if (value === undefined) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;

          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value === 0 ? "Same day" : pluralize(value, "day")}
            </div>
          );
        },
      },
      {
        accessorKey: "daysToFinal",
        header: "Days: Working Copy → Final",
        size: 200,
        meta: {
          label: "Days: Working Copy → Final",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="clock" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          if (value === undefined) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;

          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value === 0 ? "Same day" : pluralize(value, "day")}
            </div>
          );
        },
      },
      {
        accessorKey: "daysToSigned",
        header: "Days: Final → Signed",
        size: 170,
        meta: {
          label: "Days: Final → Signed",
          align: "right",
          filterable: true,
          filterVariant: "number",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="clock" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          if (value === undefined) return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;

          return (
            <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
              {value === 0 ? "Same day" : pluralize(value, "day")}
            </div>
          );
        },
      },

      // Approvals
      {
        accessorKey: "ownerApprovalStatus",
        header: "Owner Approval",
        size: 140,
        enableSorting: false,
        meta: {
          label: "Owner Approval",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Status",
          icon: ({ className }) => <Icon name="check-circle" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.ownerApprovalStatus) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} statuses
            </div>
          );
        },
      },
      {
        accessorKey: "ownerApprovedBy",
        header: "Owner Approved By",
        size: 160,
        enableSorting: false,
        meta: {
          label: "Owner Approved By",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Parties",
          icon: ({ className }) => <Icon name="user-owner" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
      },
      {
        accessorKey: "ownerApprovalDate",
        header: "Owner Approval Date",
        size: 170,
        enableSorting: false,
        meta: {
          label: "Owner Approval Date",
          align: "left",
          filterable: true,
          filterVariant: "date",
          dateGranularity: "day",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value ? formatTimestamp(value) : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const timestamps = row.subRows?.map((r) => r.original.ownerApprovalDate).filter(isDefined) || [];
          if (timestamps.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
          const earliest = Math.min(...timestamps);
          const latest = Math.max(...timestamps);
          if (earliest === latest) {
            return <div className="text-body-sm text-[var(--color-text-primary)]">{formatTimestamp(latest)}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)]">{formatTimestamp(earliest)} – {formatTimestamp(latest)}</div>;
        },
      },
      {
        accessorKey: "chartererApprovalStatus",
        header: "Charterer Approval",
        size: 160,
        enableSorting: false,
        meta: {
          label: "Charterer Approval",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Status",
          icon: ({ className }) => <Icon name="check-circle" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.chartererApprovalStatus) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} statuses
            </div>
          );
        },
      },
      {
        accessorKey: "chartererApprovedBy",
        header: "Charterer Approved By",
        size: 180,
        enableSorting: false,
        meta: {
          label: "Charterer Approved By",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Parties",
          icon: ({ className }) => <Icon name="user-charterer" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
      },
      {
        accessorKey: "chartererApprovalDate",
        header: "Charterer Approval Date",
        size: 190,
        enableSorting: false,
        meta: {
          label: "Charterer Approval Date",
          align: "left",
          filterable: true,
          filterVariant: "date",
          dateGranularity: "day",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value ? formatTimestamp(value) : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const timestamps = row.subRows?.map((r) => r.original.chartererApprovalDate).filter(isDefined) || [];
          if (timestamps.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
          const earliest = Math.min(...timestamps);
          const latest = Math.max(...timestamps);
          if (earliest === latest) {
            return <div className="text-body-sm text-[var(--color-text-primary)]">{formatTimestamp(latest)}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)]">{formatTimestamp(earliest)} – {formatTimestamp(latest)}</div>;
        },
      },

      // Signatures
      {
        accessorKey: "ownerSignatureStatus",
        header: "Owner Signature",
        size: 150,
        enableSorting: false,
        meta: {
          label: "Owner Signature",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Status",
          icon: ({ className }) => <Icon name="pen-tool" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.ownerSignatureStatus) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} statuses
            </div>
          );
        },
      },
      {
        accessorKey: "ownerSignedBy",
        header: "Owner Signed By",
        size: 150,
        enableSorting: false,
        meta: {
          label: "Owner Signed By",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Parties",
          icon: ({ className }) => <Icon name="user-owner" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
      },
      {
        accessorKey: "ownerSignatureDate",
        header: "Owner Signature Date",
        size: 170,
        enableSorting: false,
        meta: {
          label: "Owner Signature Date",
          align: "left",
          filterable: true,
          filterVariant: "date",
          dateGranularity: "day",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value ? formatTimestamp(value) : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const timestamps = row.subRows?.map((r) => r.original.ownerSignatureDate).filter(isDefined) || [];
          if (timestamps.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
          const earliest = Math.min(...timestamps);
          const latest = Math.max(...timestamps);
          if (earliest === latest) {
            return <div className="text-body-sm text-[var(--color-text-primary)]">{formatTimestamp(latest)}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)]">{formatTimestamp(earliest)} – {formatTimestamp(latest)}</div>;
        },
      },
      {
        accessorKey: "chartererSignatureStatus",
        header: "Charterer Signature",
        size: 170,
        enableSorting: false,
        meta: {
          label: "Charterer Signature",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Status",
          icon: ({ className }) => <Icon name="pen-tool" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.chartererSignatureStatus) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} statuses
            </div>
          );
        },
      },
      {
        accessorKey: "chartererSignedBy",
        header: "Charterer Signed By",
        size: 170,
        enableSorting: false,
        meta: {
          label: "Charterer Signed By",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Parties",
          icon: ({ className }) => <Icon name="user-charterer" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
      },
      {
        accessorKey: "chartererSignatureDate",
        header: "Charterer Signature Date",
        size: 190,
        enableSorting: false,
        meta: {
          label: "Charterer Signature Date",
          align: "left",
          filterable: true,
          filterVariant: "date",
          dateGranularity: "day",
          filterGroup: "Date & Time",
          icon: ({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value ? formatTimestamp(value) : "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const timestamps = row.subRows?.map((r) => r.original.chartererSignatureDate).filter(isDefined) || [];
          if (timestamps.length === 0) return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
          const earliest = Math.min(...timestamps);
          const latest = Math.max(...timestamps);
          if (earliest === latest) {
            return <div className="text-body-sm text-[var(--color-text-primary)]">{formatTimestamp(latest)}</div>;
          }
          return <div className="text-body-sm text-[var(--color-text-secondary)]">{formatTimestamp(earliest)} – {formatTimestamp(latest)}</div>;
        },
      },

      // User Tracking
      {
        accessorKey: "dealCaptureUser",
        header: "Deal Capture",
        size: 140,
        enableSorting: false,
        meta: {
          label: "Deal Capture",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Parties",
          icon: ({ className }) => <Icon name="user-created-by" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.dealCaptureUser) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} users
            </div>
          );
        },
      },
      {
        accessorKey: "orderCreatedBy",
        header: "Order Created By",
        size: 160,
        enableSorting: false,
        meta: {
          label: "Order Created By",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Parties",
          icon: ({ className }) => <Icon name="user-created-by" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.orderCreatedBy) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} users
            </div>
          );
        },
      },
      {
        accessorKey: "negotiationCreatedBy",
        header: "Neg. Created By",
        size: 160,
        enableSorting: false,
        meta: {
          label: "Neg. Created By",
          align: "left",
          filterable: true,
          filterVariant: "multiselect",
          filterGroup: "Parties",
          icon: ({ className }) => <Icon name="user-created-by" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.negotiationCreatedBy) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} users
            </div>
          );
        },
      },

      // Meta & Relationships
      {
        accessorKey: "parentCpId",
        header: "Parent CP",
        size: 130,
        enableSorting: false,
        meta: {
          label: "Parent CP",
          align: "left",
          filterable: true,
          filterVariant: "text",
          filterGroup: "Contract",
          icon: ({ className }) => <Icon name="git-branch" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <div className="text-body-sm font-mono text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.parentCpId) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            return (
              <div className="text-body-sm font-mono text-[var(--color-text-primary)]">
                {value || "–"}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} parents
            </div>
          );
        },
      },
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
          icon: ({ className }) => <Icon name="file-check" className={className} aria-hidden="true" />,
        },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ getValue }) => {
          const value = getValue<string>();
          const displayValue = value === "voyage-charter" ? "Voyage charter"
            : value === "time-charter" ? "TC"
            : value === "coa" ? "COA"
            : value || "–";

          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {displayValue}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          const values = new Set(row.subRows?.map((r) => r.original.contractType) || []);
          if (values.size === 1) {
            const value = Array.from(values)[0] as string;
            const displayValue = value === "voyage-charter" ? "Voyage charter"
              : value === "time-charter" ? "TC"
              : value === "coa" ? "COA"
              : value || "–";
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {displayValue}
              </div>
            );
          }
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {values.size} types
            </div>
          );
        },
      },

      // Timestamp (always last)
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
          icon: ({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />,
        },
        enableGrouping: false,
        aggregationFn: (columnId: string, leafRows: FixtureRow[]) => {
          // For sorting: return the most recent (maximum) timestamp
          const timestamps = leafRows
            .map((row) => row.getValue(columnId) as number | undefined)
            .filter(isDefined);
          return timestamps.length > 0 ? Math.max(...timestamps) : 0;
        },
        cell: ({ row }: FixtureCellContext) => {
          const timestamp = row.getValue("lastUpdated") as number;
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {formatTimestamp(timestamp)}
            </div>
          );
        },
        aggregatedCell: ({ row }: FixtureCellContext) => {
          // For grouped rows, show date range
          const timestamps = row.subRows?.map((r) => r.original?.lastUpdated).filter(isDefined) || [];
          if (timestamps.length === 0) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                –
              </div>
            );
          }

          const earliest = Math.min(...timestamps);
          const latest = Math.max(...timestamps);

          // If all timestamps are the same, show single date
          if (earliest === latest) {
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {formatTimestamp(latest)}
              </div>
            );
          }

          // Show date range
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {formatTimestamp(earliest)} – {formatTimestamp(latest)}
            </div>
          );
        },
      },
    ];
}
