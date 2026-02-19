import { useState, useMemo, useEffect, useRef, useCallback, useTransition } from "react";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type GroupingState,
  type ColumnOrderState,
  type ExpandedState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  DataTable,
  Button,
  Bookmarks,
  Filters,
  DataTableSettingsMenu,
  Separator,
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
  type FilterDefinition,
  type FilterValue,
  type Bookmark,
  type StatusValue,
  toast,
} from "@rafal.lemieszewski/tide-ui";
import { useHeaderActions, useUser } from "../hooks";
import { ExportDialog } from "../components/ExportDialog";
import { FixtureSidebar } from "../components/FixtureSidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  formatLaycanRange,
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatTimestamp,
  getStatusLabel as getStatusLabelBase,
  getCompanyInitials,
  pluralize,
} from "../utils/dataUtils";
import {
  calculateFreightSavings,
  calculateDemurrageSavings,
  calculateDaysBetween,
  calculateFreightVsMarket,
} from "../utils/fixtureCalculations";

// Re-export for backward compatibility (FixtureSidebar imports from here)
export { getCompanyInitials };

// Wrap getStatusLabel to bind statusConfig from tide-ui
export const getStatusLabel = (status: string): string =>
  getStatusLabelBase(status, statusConfig);

// Import types for fixture structure
import type {
  ContractData,
  FixtureWithRelations,
  EnrichedContractItem,
} from "../types/fixture";
// Re-export FixtureData for backward compat (FixtureSidebar imports from here)
export type { FixtureData } from "../types/fixture";
import type { FixtureData } from "../types/fixture";
import type { CellContext, Row } from "@tanstack/react-table";

// Type aliases for TanStack Table
type FixtureCellContext<TValue = unknown> = CellContext<FixtureData, TValue>;
type FixtureRow = Row<FixtureData>;

// Extended column metadata to support auto-generation of filter definitions
// Note: Many properties (label, align, filterVariant, filterOptions, icon) are already
// defined by @rafal.lemieszewski/tide-ui. We only augment with additional custom properties.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    // Custom extensions (not in tide-ui)
    filterable?: boolean;
    filterGroup?: string;
    dateGranularity?: "day" | "month";
  }
}

// Type helper for accessing column meta with proper typing
interface ColumnMetaWithLabel {
  label?: string;
  align?: "left" | "center" | "right";
  filterable?: boolean;
  filterGroup?: string;
  dateGranularity?: "day" | "month";
  filterVariant?: string;
}

function getColumnDataType(
  meta?: ColumnMetaWithLabel,
): "text" | "number" | "date" | "boolean" | undefined {
  switch (meta?.filterVariant) {
    case "multiselect":
    case "text":
      return "text";
    case "number":
      return "number";
    case "date":
      return "date";
    default:
      return undefined;
  }
}

// Transform database contracts and recap managers to FixtureData format
const transformFixturesToTableData = (
  fixtures: FixtureWithRelations[]
): FixtureData[] => {
  const tableData: FixtureData[] = [];

  fixtures.forEach((fixture) => {
    // Combine contracts and recap managers
    const allContracts: EnrichedContractItem[] = [
      ...fixture.contracts.map((c) => ({ ...c, source: "contract" as const })),
      ...fixture.recapManagers.map((r) => ({ ...r, source: "recap" as const })),
    ];

    // Track which negotiations already have contracts/recaps
    const negotiationsWithContracts = new Set<string>();
    allContracts.forEach((item) => {
      const negId = item.negotiationId || item.negotiation?._id;
      if (negId) negotiationsWithContracts.add(negId as string);
    });

    // Deduplicate - prefer contracts over recap_managers for same negotiation
    // This prevents showing duplicate rows when both exist for the same negotiation
    const seenNegotiations = new Set<string>();
    const dedupedContracts = allContracts.filter((item) => {
      const negId = item.negotiationId || item.negotiation?._id;
      if (!negId) return true; // Keep items without negotiation
      if (seenNegotiations.has(negId as string)) return false;
      seenNegotiations.add(negId as string);
      return true;
    });

    // Handle negotiation-only fixtures (fixtures with negotiations but no contracts yet)
    // This covers early stages: indicative-offer, indicative-bid, firm-offer, firm-bid
    if (dedupedContracts.length === 0 && fixture.negotiations?.length > 0) {
      fixture.negotiations.forEach((neg) => {
        tableData.push({
          id: neg._id,
          fixtureId: fixture.fixtureNumber,
          orderId: fixture.order?.orderNumber || "-",
          cpId: "-", // No contract yet
          stage: "Negotiation",
          typeOfContract: "-",
          negotiationId: neg.negotiationNumber || "-",
          vessels: neg.vessel?.name || "TBN",
          personInCharge: neg.personInCharge?.name || "User",
          status: `negotiation-${neg.status}`,
          approvalStatus: "Not started",
          owner: "-", // Not determined yet
          ownerAvatarUrl: undefined,
          broker: neg.broker?.name || "Unknown",
          brokerAvatarUrl: neg.broker?.avatarUrl,
          charterer: neg.counterparty?.name || "Unknown",
          chartererAvatarUrl: neg.counterparty?.avatarUrl,
          lastUpdated: neg.updatedAt || neg._creationTime,
          // Include full objects for sidebar
          contract: null,
          order: fixture.order,
          negotiation: neg,
          vessel: neg.vessel,
          loadPort: null,
          dischargePort: null,
          cargoType: null,
          // Include approval and signature data
          approvals: [],
          approvalSummary: { total: 0, approved: 0, pending: 0, rejected: 0 },
          signatures: [],
          signatureSummary: { total: 0, signed: 0, pending: 0, rejected: 0 },

          // Commercial Fields from negotiation
          laycanStart: neg.laycanStart,
          laycanEnd: neg.laycanEnd,
          loadPortName: undefined,
          loadPortCountry: undefined,
          loadDeliveryType: neg.loadDeliveryType,
          dischargePortName: undefined,
          dischargePortCountry: undefined,
          dischargeRedeliveryType: neg.dischargeRedeliveryType,
          vesselImo: neg.vessel?.imoNumber,
          cargoTypeName: undefined,
          cargoQuantity: neg.quantity,
          finalFreightRate: neg.freightRate,
          finalDemurrageRate: neg.demurrageRate,

          // Analytics fields
          highestFreightRateIndication: neg.highestFreightRateIndication,
          lowestFreightRateIndication: neg.lowestFreightRateIndication,
          firstFreightRateIndication: neg.firstFreightRateIndication,
          highestFreightRateLastDay: neg.highestFreightRateLastDay,
          lowestFreightRateLastDay: neg.lowestFreightRateLastDay,
          firstFreightRateLastDay: neg.firstFreightRateLastDay,
          freightSavingsPercent: undefined,
          marketIndex: neg.marketIndex,
          marketIndexName: neg.marketIndexName,
          freightVsMarketPercent: undefined,
          grossFreight: neg.grossFreight,
          highestDemurrageIndication: neg.highestDemurrageIndication,
          lowestDemurrageIndication: neg.lowestDemurrageIndication,
          demurrageSavingsPercent: undefined,

          // Commissions
          addressCommissionPercent: neg.addressCommissionPercent,
          addressCommissionTotal: neg.addressCommissionTotal,
          brokerCommissionPercent: neg.brokerCommissionPercent,
          brokerCommissionTotal: neg.brokerCommissionTotal,

          // Workflow dates (not applicable for negotiations)
          cpDate: undefined,
          workingCopyDate: undefined,
          finalDate: undefined,
          fullySignedDate: undefined,
          daysToWorkingCopy: undefined,
          daysToFinal: undefined,
          daysToSigned: undefined,

          // Approvals (not applicable for negotiations)
          ownerApprovalStatus: undefined,
          ownerApprovedBy: undefined,
          ownerApprovalDate: undefined,
          chartererApprovalStatus: undefined,
          chartererApprovedBy: undefined,
          chartererApprovalDate: undefined,

          // Signatures (not applicable for negotiations)
          ownerSignatureStatus: undefined,
          ownerSignedBy: undefined,
          ownerSignatureDate: undefined,
          chartererSignatureStatus: undefined,
          chartererSignedBy: undefined,
          chartererSignatureDate: undefined,

          // User tracking
          dealCaptureUser: undefined,
          orderCreatedBy: fixture.order?.createdBy?.name,
          negotiationCreatedBy: neg.createdBy?.name,

          // Relationships
          parentCpId: undefined,
          contractType: undefined,
        });
      });
      return; // Skip to next fixture
    }

    // Also add any negotiations that don't have contracts yet (even if fixture has some contracts)
    if (fixture.negotiations?.length > 0) {
      fixture.negotiations.forEach((neg) => {
        // Skip if this negotiation already has a contract/recap
        if (negotiationsWithContracts.has(neg._id)) return;

        tableData.push({
          id: neg._id,
          fixtureId: fixture.fixtureNumber,
          orderId: fixture.order?.orderNumber || "-",
          cpId: "-", // No contract yet
          stage: "Negotiation",
          typeOfContract: "-",
          negotiationId: neg.negotiationNumber || "-",
          vessels: neg.vessel?.name || "TBN",
          personInCharge: neg.personInCharge?.name || "User",
          status: `negotiation-${neg.status}`,
          approvalStatus: "Not started",
          owner: "-",
          ownerAvatarUrl: undefined,
          broker: neg.broker?.name || "Unknown",
          brokerAvatarUrl: neg.broker?.avatarUrl,
          charterer: neg.counterparty?.name || "Unknown",
          chartererAvatarUrl: neg.counterparty?.avatarUrl,
          lastUpdated: neg.updatedAt || neg._creationTime,
          contract: null,
          order: fixture.order,
          negotiation: neg,
          vessel: neg.vessel,
          loadPort: null,
          dischargePort: null,
          cargoType: null,
          approvals: [],
          approvalSummary: { total: 0, approved: 0, pending: 0, rejected: 0 },
          signatures: [],
          signatureSummary: { total: 0, signed: 0, pending: 0, rejected: 0 },
          laycanStart: neg.laycanStart,
          laycanEnd: neg.laycanEnd,
          loadPortName: undefined,
          loadPortCountry: undefined,
          loadDeliveryType: neg.loadDeliveryType,
          dischargePortName: undefined,
          dischargePortCountry: undefined,
          dischargeRedeliveryType: neg.dischargeRedeliveryType,
          vesselImo: neg.vessel?.imoNumber,
          cargoTypeName: undefined,
          cargoQuantity: neg.quantity,
          finalFreightRate: neg.freightRate,
          finalDemurrageRate: neg.demurrageRate,
          highestFreightRateIndication: neg.highestFreightRateIndication,
          lowestFreightRateIndication: neg.lowestFreightRateIndication,
          firstFreightRateIndication: neg.firstFreightRateIndication,
          highestFreightRateLastDay: neg.highestFreightRateLastDay,
          lowestFreightRateLastDay: neg.lowestFreightRateLastDay,
          firstFreightRateLastDay: neg.firstFreightRateLastDay,
          freightSavingsPercent: undefined,
          marketIndex: neg.marketIndex,
          marketIndexName: neg.marketIndexName,
          freightVsMarketPercent: undefined,
          grossFreight: neg.grossFreight,
          highestDemurrageIndication: neg.highestDemurrageIndication,
          lowestDemurrageIndication: neg.lowestDemurrageIndication,
          demurrageSavingsPercent: undefined,
          addressCommissionPercent: neg.addressCommissionPercent,
          addressCommissionTotal: neg.addressCommissionTotal,
          brokerCommissionPercent: neg.brokerCommissionPercent,
          brokerCommissionTotal: neg.brokerCommissionTotal,
          cpDate: undefined,
          workingCopyDate: undefined,
          finalDate: undefined,
          fullySignedDate: undefined,
          daysToWorkingCopy: undefined,
          daysToFinal: undefined,
          daysToSigned: undefined,
          ownerApprovalStatus: undefined,
          ownerApprovedBy: undefined,
          ownerApprovalDate: undefined,
          chartererApprovalStatus: undefined,
          chartererApprovedBy: undefined,
          chartererApprovalDate: undefined,
          ownerSignatureStatus: undefined,
          ownerSignedBy: undefined,
          ownerSignatureDate: undefined,
          chartererSignatureStatus: undefined,
          chartererSignedBy: undefined,
          chartererSignatureDate: undefined,
          dealCaptureUser: undefined,
          orderCreatedBy: fixture.order?.createdBy?.name,
          negotiationCreatedBy: neg.createdBy?.name,
          parentCpId: undefined,
          contractType: undefined,
        });
      });
    }

    if (dedupedContracts.length === 0) return; // Skip if no contracts

    // Create a row for each contract/recap manager
    // TanStack Table will handle grouping by fixtureId automatically
    dedupedContracts.forEach((item) => {
      const isContract = item.source === "contract";
      const contractNumber = isContract ? item.contractNumber : item.recapNumber;

      tableData.push({
        id: item._id as string,
        fixtureId: fixture.fixtureNumber,
        orderId: item.order?.orderNumber || fixture.order?.orderNumber || "-",
        cpId: contractNumber ?? "-",
        stage: item.contractType === "coa" ? "COA" : "Charter Party",
        typeOfContract:
          item.contractType === "voyage-charter"
            ? "Voyage charter"
            : item.contractType === "time-charter"
            ? "TC"
            : "COA",
        negotiationId: item.negotiation?.negotiationNumber || "-",
        vessels: item.vessel?.name || "TBN",
        personInCharge: item.personInCharge?.name || item.negotiation?.personInCharge?.name || "User",
        status: isContract ? `contract-${item.status}` : `recap-manager-${item.status}`,
        approvalStatus: item.approvalStatus || "Not started",
        owner: item.owner?.name || "Unknown",
        ownerAvatarUrl: item.owner?.avatarUrl,
        broker: item.broker?.name || "Unknown",
        brokerAvatarUrl: item.broker?.avatarUrl,
        charterer: item.charterer?.name || "Unknown",
        chartererAvatarUrl: item.charterer?.avatarUrl,
        lastUpdated: item.updatedAt ?? item._creationTime ?? Date.now(),
        // Include full objects for sidebar
        contract: item as unknown as ContractData | null,
        order: item.order || fixture.order,
        negotiation: item.negotiation,
        vessel: item.vessel,
        loadPort: item.loadPort,
        dischargePort: item.dischargePort,
        cargoType: item.cargoType,
        // Include approval and signature data
        approvals: item.approvals,
        approvalSummary: item.approvalSummary,
        signatures: item.signatures,
        signatureSummary: item.signatureSummary,

        // Priority 1: Core Commercial Fields
        laycanStart: item.negotiation?.laycanStart ?? item.laycanStart,
        laycanEnd: item.negotiation?.laycanEnd ?? item.laycanEnd,
        loadPortName: item.loadPort?.name,
        loadPortCountry: item.loadPort?.country,
        loadDeliveryType: item.negotiation?.loadDeliveryType,
        dischargePortName: item.dischargePort?.name,
        dischargePortCountry: item.dischargePort?.country,
        dischargeRedeliveryType: item.negotiation?.dischargeRedeliveryType,
        vesselImo: item.vessel?.imoNumber,
        cargoTypeName: item.cargoType?.name,
        cargoQuantity: item.negotiation?.quantity ?? item.quantity,
        finalFreightRate: item.negotiation?.freightRate ?? item.freightRate,
        finalDemurrageRate: item.negotiation?.demurrageRate ?? item.demurrageRate,

        // Freight Analytics
        highestFreightRateIndication: item.negotiation?.highestFreightRateIndication,
        lowestFreightRateIndication: item.negotiation?.lowestFreightRateIndication,
        firstFreightRateIndication: item.negotiation?.firstFreightRateIndication,
        highestFreightRateLastDay: item.negotiation?.highestFreightRateLastDay,
        lowestFreightRateLastDay: item.negotiation?.lowestFreightRateLastDay,
        firstFreightRateLastDay: item.negotiation?.firstFreightRateLastDay,
        freightSavingsPercent: calculateFreightSavings(
          item.negotiation?.highestFreightRateIndication,
          item.negotiation?.freightRate ?? item.freightRate
        ) ?? undefined,
        marketIndex: item.negotiation?.marketIndex,
        marketIndexName: item.negotiation?.marketIndexName,
        freightVsMarketPercent: calculateFreightVsMarket(
          item.negotiation?.freightRate ?? item.freightRate,
          item.negotiation?.marketIndex
        ) ?? undefined,
        grossFreight: item.negotiation?.grossFreight,
        highestDemurrageIndication: item.negotiation?.highestDemurrageIndication,
        lowestDemurrageIndication: item.negotiation?.lowestDemurrageIndication,
        demurrageSavingsPercent: calculateDemurrageSavings(
          item.negotiation?.highestDemurrageIndication,
          item.negotiation?.demurrageRate ?? item.demurrageRate
        ) ?? undefined,

        // Commissions
        addressCommissionPercent: item.negotiation?.addressCommissionPercent,
        addressCommissionTotal: item.negotiation?.addressCommissionTotal,
        brokerCommissionPercent: item.negotiation?.brokerCommissionPercent,
        brokerCommissionTotal: item.negotiation?.brokerCommissionTotal,

        // CP Workflow Dates
        cpDate: item._creationTime,
        workingCopyDate: item.workingCopyDate,
        finalDate: item.finalDate,
        fullySignedDate: item.fullySignedDate,
        daysToWorkingCopy: calculateDaysBetween(item._creationTime, item.workingCopyDate) ?? undefined,
        daysToFinal: calculateDaysBetween(item.workingCopyDate, item.finalDate) ?? undefined,
        daysToSigned: calculateDaysBetween(item.finalDate, item.fullySignedDate) ?? undefined,

        // Approvals (cache lookups to avoid redundant .find() calls)
        ...(() => {
          const ownerApproval = item.approvals?.find((a) => a.partyRole === 'owner');
          const chartererApproval = item.approvals?.find((a) => a.partyRole === 'charterer');
          const ownerSignature = item.signatures?.find((s) => s.partyRole === 'owner');
          const chartererSignature = item.signatures?.find((s) => s.partyRole === 'charterer');
          return {
            ownerApprovalStatus: ownerApproval?.status,
            ownerApprovedBy: ownerApproval?.approvedBy?.name,
            ownerApprovalDate: ownerApproval?.approvedAt,
            chartererApprovalStatus: chartererApproval?.status,
            chartererApprovedBy: chartererApproval?.approvedBy?.name,
            chartererApprovalDate: chartererApproval?.approvedAt,
            ownerSignatureStatus: ownerSignature?.status,
            ownerSignedBy: ownerSignature?.signedBy?.name,
            ownerSignatureDate: ownerSignature?.signedAt,
            chartererSignatureStatus: chartererSignature?.status,
            chartererSignedBy: chartererSignature?.signedBy?.name,
            chartererSignatureDate: chartererSignature?.signedAt,
          };
        })(),

        // User Tracking
        dealCaptureUser: item.negotiation?.dealCaptureUser?.name,
        orderCreatedBy: item.order?.createdBy?.name,
        negotiationCreatedBy: item.negotiation?.createdBy?.name,

        // Meta & Relationships
        parentCpId: item.parentContract?.contractNumber,
        contractType: item.contractType,
      });
    });
  });

  // Don't sort here - let TanStack Table handle sorting with grouping awareness
  // Server already returns fixtures in _creationTime desc order
  // Sorting here would break grouping because rows from the same fixture
  // need to stay consecutive for TanStack Table's grouping to work correctly
  return tableData;
};


// Type guard to filter out null/undefined from arrays
const isDefined = <T,>(value: T | null | undefined): value is T => value != null;



// Custom hook to enforce minimum skeleton display time
function useMinimumLoadingTime(isLoading: boolean, minimumMs: number = 500) {
  const [showLoading, setShowLoading] = useState(false);
  const loadingStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Started loading
      loadingStartTimeRef.current = Date.now();
      setShowLoading(true);
    } else if (loadingStartTimeRef.current !== null) {
      // Finished loading - check if minimum time has elapsed
      const elapsed = Date.now() - loadingStartTimeRef.current;
      const remaining = minimumMs - elapsed;

      if (remaining > 0) {
        // Wait for remaining time before hiding skeleton
        const timer = setTimeout(() => {
          setShowLoading(false);
          loadingStartTimeRef.current = null;
        }, remaining);
        return () => clearTimeout(timer);
      } else {
        // Minimum time already elapsed
        setShowLoading(false);
        loadingStartTimeRef.current = null;
      }
    }
  }, [isLoading, minimumMs]);

  return showLoading;
}

/**
 * Derives filter definitions from column definitions
 * This creates a single source of truth for both display and filtering
 *
 * @param columns - Column definitions with filter metadata
 * @param optionsMap - Map of column IDs to their dynamic filter options
 */
function deriveFilterDefinitions<TData>(
  columns: ColumnDef<TData>[],
  optionsMap?: Record<string, Array<{ value: string; label: string }>>,
): FilterDefinition[] {
  return columns
    .filter((col) => {
      // Only include columns with filter metadata
      return col.meta?.filterable === true;
    })
    .map((col) => {
      const meta = col.meta!;
      const id = ("accessorKey" in col && typeof col.accessorKey === "string")
        ? col.accessorKey
        : ("id" in col && typeof col.id === "string")
        ? col.id
        : "";

      if (!id) {
        console.warn("Column without valid id/accessorKey found:", col);
        return null;
      }

      // Map filterVariant to FilterDefinition type
      // FilterVariant: "text" | "select" | "multiselect" | "number" | "date" | "boolean"
      // FilterDefinition.type: "multiselect" | "select" | "combobox" | "number" | "date"
      const mapFilterType = (variant?: string): FilterDefinition["type"] => {
        if (variant === "text") return "select"; // text maps to select
        if (variant === "boolean") return "select"; // boolean maps to select
        if (variant === "multiselect" || variant === "select" || variant === "combobox" || variant === "number" || variant === "date") {
          return variant;
        }
        return "select"; // default
      };

      // Default icon if none provided
      const defaultIcon = ({ className }: { className?: string }) => <Icon name="filter" className={className} />;

      const filterDef: FilterDefinition = {
        id,
        label: meta.label || id,
        type: mapFilterType(meta.filterVariant),
        icon: meta.icon || defaultIcon,
        group: meta.filterGroup,
      };

      // Add rangeMode for date and number filters
      if (meta.filterVariant === "date" || meta.filterVariant === "number") {
        filterDef.rangeMode = true;
      }

      // Add dateConfig for date filters with custom granularity
      if (meta.filterVariant === "date" && meta.dateGranularity) {
        filterDef.dateConfig = { granularity: meta.dateGranularity };
      }

      // Add options from metadata or options map
      if (meta.filterVariant === "multiselect" || meta.filterVariant === "select") {
        // Priority: 1) metadata options, 2) optionsMap, 3) undefined
        const options = meta.filterOptions || (optionsMap && optionsMap[id]);
        if (options) {
          filterDef.options = options;
        }
      }

      return filterDef;
    })
    .filter((def): def is FilterDefinition => def !== null);
}

/**
 * Deep equality comparison for bookmark state
 * Handles objects, arrays, and primitives with proper order-insensitive object comparison
 */
function deepEqual(a: unknown, b: unknown): boolean {
  // Same reference or both primitive and equal
  if (a === b) return true;

  // Null/undefined checks
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  // Array comparison (order matters for arrays)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  // Object comparison (order-insensitive)
  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA).sort();
    const keysB = Object.keys(objB).sort();

    // Different number of keys
    if (keysA.length !== keysB.length) return false;

    // Different key names
    if (!keysA.every((key, idx) => key === keysB[idx])) return false;

    // Recursively compare values
    return keysA.every(key => deepEqual(objA[key], objB[key]));
  }

  // Primitive types that aren't equal
  return false;
}

// Minimum column width in pixels
const MIN_COLUMN_WIDTH = 120;

/**
 * Enforce minimum column widths on sizing state
 */
function enforceMinColumnSizing(
  sizing: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [columnId, width] of Object.entries(sizing)) {
    result[columnId] = Math.max(width, MIN_COLUMN_WIDTH);
  }
  return result;
}

// Static highlight style for search term highlighting
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

// Default column visibility — static, extracted to avoid re-creation per render
const DEFAULT_HIDDEN_COLUMNS: VisibilityState = {
  fixtureId: false,
  // Priority 1: Core Commercial Fields
  laycan: false,
  laycanStart: false,
  laycanEnd: false,
  loadPortCountry: false,
  loadDeliveryType: false,
  dischargePortCountry: false,
  dischargeRedeliveryType: false,
  vesselImo: false,
  cargoTypeName: false,
  cargoQuantity: false,
  finalFreightRate: false,
  finalDemurrageRate: false,
  // Priority 2: Freight & Demurrage Analytics
  highestFreightRateIndication: false,
  lowestFreightRateIndication: false,
  firstFreightRateIndication: false,
  highestFreightRateLastDay: false,
  lowestFreightRateLastDay: false,
  firstFreightRateLastDay: false,
  freightSavingsPercent: false,
  marketIndex: false,
  marketIndexName: false,
  freightVsMarketPercent: false,
  grossFreight: false,
  highestDemurrageIndication: false,
  lowestDemurrageIndication: false,
  demurrageSavingsPercent: false,
  // Priority 3: Commissions
  addressCommissionPercent: false,
  addressCommissionTotal: false,
  brokerCommissionPercent: false,
  brokerCommissionTotal: false,
  // Priority 4: CP Workflow Dates
  cpDate: false,
  workingCopyDate: false,
  finalDate: false,
  fullySignedDate: false,
  daysToWorkingCopy: false,
  daysToFinal: false,
  daysToSigned: false,
  // Priority 5: Approval Status Details
  ownerApprovalStatus: false,
  ownerApprovedBy: false,
  ownerApprovalDate: false,
  chartererApprovalStatus: false,
  chartererApprovedBy: false,
  chartererApprovalDate: false,
  // Priority 6: Signature Status Details
  ownerSignatureStatus: false,
  ownerSignedBy: false,
  ownerSignatureDate: false,
  chartererSignatureStatus: false,
  chartererSignedBy: false,
  chartererSignatureDate: false,
  // Priority 7: User Tracking
  dealCaptureUser: false,
  orderCreatedBy: false,
  negotiationCreatedBy: false,
  // Priority 8: Parent/Child Relationships
  parentCpId: false,
  contractType: false,
};

// Helper to convert DB bookmark (with number timestamps) to Bookmark type (with Date timestamps)
// Pure function — no component dependencies
const convertDbBookmark = (dbBookmark: Omit<Bookmark, 'createdAt' | 'updatedAt'> & { createdAt: number; updatedAt: number; id: string }): Bookmark => ({
  ...dbBookmark,
  id: dbBookmark.id as string,
  createdAt: new Date(dbBookmark.createdAt),
  updatedAt: new Date(dbBookmark.updatedAt),
});

function Fixtures() {
  const [selectedFixture, setSelectedFixture] = useState<FixtureData | null>(
    null,
  );
  const [activeRowId, setActiveRowId] = useState<string | undefined>(undefined);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Memoize header actions
  const headerActions = useMemo(
    () => (
      <Button
        variant="secondary"
        icon="share"
        iconPosition="left"
        onClick={() => setShowExportDialog(true)}
      >
        Export
      </Button>
    ),
    []
  );

  // Set header actions
  useHeaderActions(headerActions);

  // Get user's organization
  const organization = useQuery(api.organizations.getFirstOrganization);
  const organizationId = organization?._id;

  // Derive initial loading state — true until data arrives at least once
  const hasEverLoadedRef = useRef(false);

  // Cursor-based pagination state (bridges TanStack offset pagination to Convex cursor pagination)
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const cursorHistoryRef = useRef<(string | undefined)[]>([undefined]);
  const serverNextCursorRef = useRef<string | null>(null);

  // Pagination state (declared early so pageSize is available for the server query)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25, // Default page size
  });

  // Filters state (declared early so it's available for query params)
  const [activeFilters, setActiveFilters] = useState<
    Record<string, FilterValue>
  >({});

  // Global search terms (declared early so it's available for server query)
  const [globalSearchTerms, setGlobalSearchTerms] = useState<string[]>([]);

  // Grouping state (declared early so paginationUnit is available for server query)
  const [grouping, setGrouping] = useState<GroupingState>([]);

  // Derive pagination unit from grouping column
  const paginationUnit = useMemo(() => {
    const col = grouping[0];
    if (col === "negotiationId") return "negotiation" as const;
    if (col === "cpId") return "contract" as const;
    return "fixture" as const;
  }, [grouping]);

  // Extract server-side filter values from activeFilters
  const serverFilters = useMemo(() => {
    // Status filter: Extract entity-specific status from combined format (e.g., "contract-final" → "final")
    // For fixture pagination, map to fixture-level statuses
    // For negotiation/contract pagination, map to entity-level statuses
    let statusFilter: string[] | undefined = undefined;
    if (activeFilters.status && Array.isArray(activeFilters.status) && activeFilters.status.length > 0) {
      const statuses = new Set<string>();
      activeFilters.status.forEach(status => {
        const statusStr = String(status);
        // Status format: "prefix-actual-status" (e.g., "contract-working-copy", "negotiation-on-subs")
        // Extract the part after the first dash group that's the entity prefix
        const firstDash = statusStr.indexOf('-');
        if (firstDash !== -1) {
          const entityStatus = statusStr.substring(firstDash + 1);
          statuses.add(entityStatus);
        }
      });
      statusFilter = statuses.size > 0 ? Array.from(statuses) : undefined;
    }

    // Vessel filter: Extract vessel names
    let vesselNames: string[] | undefined = undefined;
    if (activeFilters.vessels && Array.isArray(activeFilters.vessels) && activeFilters.vessels.length > 0) {
      vesselNames = activeFilters.vessels.map(v => String(v));
    }

    // Owner filter: Extract owner company names
    let ownerNames: string[] | undefined = undefined;
    if (activeFilters.owner && Array.isArray(activeFilters.owner) && activeFilters.owner.length > 0) {
      ownerNames = activeFilters.owner.map(o => String(o));
    }

    // Charterer filter: Extract charterer company names
    let chartererNames: string[] | undefined = undefined;
    if (activeFilters.charterer && Array.isArray(activeFilters.charterer) && activeFilters.charterer.length > 0) {
      chartererNames = activeFilters.charterer.map(c => String(c));
    }

    // Date range filter: Extract from cpDate filter (creation date)
    let dateRangeStart: number | undefined = undefined;
    let dateRangeEnd: number | undefined = undefined;
    if (activeFilters.cpDate) {
      const cpDateFilter = activeFilters.cpDate;
      if (Array.isArray(cpDateFilter) && cpDateFilter.length === 2) {
        if (cpDateFilter[0] instanceof Date) {
          dateRangeStart = cpDateFilter[0].getTime();
        }
        if (cpDateFilter[1] instanceof Date) {
          dateRangeEnd = cpDateFilter[1].getTime();
        }
      } else if (cpDateFilter instanceof Date) {
        // Single date - use start and end of that day
        const date = cpDateFilter;
        dateRangeStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        dateRangeEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
      }
    }

    // Build grouped filter arrays from all remaining activeFilters
    const multiselectFilters: { field: string; values: string[] }[] = [];
    const dateRangeFilters: { field: string; from?: number; to?: number }[] = [];
    const numberRangeFilters: { field: string; min?: number; max?: number }[] = [];

    for (const [key, value] of Object.entries(activeFilters)) {
      // Skip the 5 filters already handled individually above
      if (key === "status" || key === "vessels" || key === "owner" || key === "charterer" || key === "cpDate") continue;
      if (value == null) continue;

      // Multiselect (string array)
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
        multiselectFilters.push({ field: key, values: value as string[] });
        continue;
      }

      // Date range ([Date, Date])
      if (Array.isArray(value) && value.length === 2 && value[0] instanceof Date) {
        const [startDate, endDate] = value as [Date, Date];
        dateRangeFilters.push({ field: key, from: startDate.getTime(), to: endDate.getTime() });
        continue;
      }

      // Single date
      if (value instanceof Date) {
        const start = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
        const end = new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999).getTime();
        dateRangeFilters.push({ field: key, from: start, to: end });
        continue;
      }

      // Number range ([number, number])
      if (Array.isArray(value) && value.length === 2 && typeof value[0] === "number") {
        const [min, max] = value as [number, number];
        numberRangeFilters.push({ field: key, min, max });
        continue;
      }

      // Single number (exact match → min === max)
      if (typeof value === "number") {
        numberRangeFilters.push({ field: key, min: value, max: value });
        continue;
      }
    }

    return {
      status: statusFilter,
      vesselNames,
      ownerNames,
      chartererNames,
      dateRangeStart,
      dateRangeEnd,
      multiselectFilters: multiselectFilters.length > 0 ? multiselectFilters : undefined,
      dateRangeFilters: dateRangeFilters.length > 0 ? dateRangeFilters : undefined,
      numberRangeFilters: numberRangeFilters.length > 0 ? numberRangeFilters : undefined,
    };
  }, [activeFilters]);

  // Sorting state (declared early so it can be used in the query and cursor-reset effect below)
  const [sorting, setSorting] = useState<SortingState>([]);

  // Reset pagination when any server filter, search, pagination unit, or sorting changes
  const prevFiltersRef = useRef<{ filters: typeof serverFilters; search: string[]; unit: string; sort: string; sortDir: string } | null>(null);
  useEffect(() => {
    const currentState = {
      filters: serverFilters,
      search: globalSearchTerms,
      unit: paginationUnit,
      sort: sorting[0]?.id ?? "",
      sortDir: sorting[0]?.desc ? "desc" : "asc",
    };
    const prevState = prevFiltersRef.current;

    // Check if filters, search, pagination unit, or sorting changed
    const stateChanged = !deepEqual(currentState, prevState);
    if (stateChanged && prevState !== null) {
      // Reset pagination when filters/search/paginationUnit/sorting change (but not on initial mount)
      setCurrentCursor(undefined);
      cursorHistoryRef.current = [undefined];
      setPagination(prev => prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 });
    }

    prevFiltersRef.current = currentState;
  }, [serverFilters, globalSearchTerms, paginationUnit, sorting]);

  // Memoize query args so Convex sees stable references when values haven't changed
  const queryArgs = useMemo(() => organizationId ? {
    organizationId,
    paginationUnit,
    cursor: currentCursor,
    limit: pagination.pageSize,
    // Server-side filters
    status: serverFilters.status,
    vesselNames: serverFilters.vesselNames,
    ownerNames: serverFilters.ownerNames,
    chartererNames: serverFilters.chartererNames,
    dateRangeStart: serverFilters.dateRangeStart,
    dateRangeEnd: serverFilters.dateRangeEnd,
    // Grouped filters (all remaining field filters)
    multiselectFilters: serverFilters.multiselectFilters,
    dateRangeFilters: serverFilters.dateRangeFilters,
    numberRangeFilters: serverFilters.numberRangeFilters,
    // Global search
    searchTerms: globalSearchTerms.length > 0 ? globalSearchTerms : undefined,
    // Sorting
    sortField: sorting[0]?.id,
    sortDirection: sorting[0]?.desc ? "desc" : "asc",
  } as const : "skip" as const, [
    organizationId, paginationUnit, currentCursor, pagination.pageSize,
    serverFilters, globalSearchTerms, sorting,
  ]);

  // Query fixtures with enriched data using paginated query
  const paginatedFixtures = useQuery(api.fixtures.listEnrichedPaginated, queryArgs);

  // Query bookmark counts (unfiltered totals for system bookmarks)
  const bookmarkCounts = useQuery(
    api.fixtures.getBookmarkCounts,
    organizationId ? { organizationId } : "skip"
  );

  // Query all unique filter options from the full unfiltered dataset
  // so dropdown options don't shrink when a filter is applied
  const filterOptions = useQuery(
    api.fixtures.getFilterOptions,
    organizationId ? { organizationId } : "skip"
  );

  // Derive initial loading — once data arrives at least once, never show initial skeleton again
  if (paginatedFixtures !== undefined) hasEverLoadedRef.current = true;
  const isInitialLoading = !hasEverLoadedRef.current;

  // Detect loading state
  const isLoadingFixtures = paginatedFixtures === undefined;

  // Transform database data to fixture format
  // Returns null while loading (paginatedFixtures === undefined), [] for genuinely empty results
  const fixtureData = useMemo(() => {
    if (paginatedFixtures === undefined) return null;
    if (!paginatedFixtures?.items) return [];
    return transformFixturesToTableData(paginatedFixtures.items as unknown as FixtureWithRelations[]);
  }, [paginatedFixtures]);

  // Server pagination info
  const serverTotalCount = paginatedFixtures?.totalCount ?? 0;
  const serverUnfilteredTotalCount = paginatedFixtures?.unfilteredTotalCount ?? 0;
  const isFiltered = serverTotalCount !== serverUnfilteredTotalCount;

  // Keep ref in sync so handlePaginationChange always sees latest cursor
  serverNextCursorRef.current = paginatedFixtures?.nextCursor ?? null;

  // System bookmarks (read-only, configured via props)
  // Note: count shows serverTotalCount for accurate representation of total fixtures
  const systemBookmarks: Bookmark[] = useMemo(() => [
    {
      id: "system-all",
      name: "All Fixtures",
      type: "system",
      isDefault: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      count: bookmarkCounts?.totalFixtures ?? 0,
      filtersState: {
        activeFilters: {},
        pinnedFilters: [],
        globalSearchTerms: [],
      },
      tableState: {
        sorting: [{ id: "lastUpdated", desc: true }],
        columnVisibility: DEFAULT_HIDDEN_COLUMNS,
        grouping: ["fixtureId"],
        columnOrder: [],
        columnSizing: {},
      },
    },
    {
      id: "system-negotiations",
      name: "Negotiations",
      type: "system",
      isDefault: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      count: bookmarkCounts?.totalNegotiations ?? 0,
      filtersState: {
        activeFilters: {},
        pinnedFilters: [],
        globalSearchTerms: [],
      },
      tableState: {
        sorting: [{ id: "lastUpdated", desc: true }],
        columnVisibility: DEFAULT_HIDDEN_COLUMNS,
        grouping: ["negotiationId"],
        columnOrder: [],
        columnSizing: {},
      },
    },
    {
      id: "system-contracts",
      name: "Contracts",
      type: "system",
      isDefault: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      count: bookmarkCounts?.totalContracts ?? 0,
      filtersState: {
        activeFilters: {},
        pinnedFilters: [],
        globalSearchTerms: [],
      },
      tableState: {
        sorting: [{ id: "lastUpdated", desc: true }],
        columnVisibility: DEFAULT_HIDDEN_COLUMNS,
        grouping: ["cpId"],
        columnOrder: [],
        columnSizing: {},
      },
    },
  ], [bookmarkCounts]);

  // Initial user bookmarks
  const initialUserBookmarks: Bookmark[] = [];

  // Get current user
  const { user } = useUser();
  const userId = user?.appUserId;

  // Query bookmarks from Convex
  const userBookmarksFromDb = useQuery(
    api.user_bookmarks.getUserBookmarks,
    userId ? { userId } : "skip"
  );

  // Mutation hooks
  const createBookmarkMutation = useMutation(api.user_bookmarks.createBookmark);
  const updateBookmarkMutation = useMutation(api.user_bookmarks.updateBookmark);
  const renameBookmarkMutation = useMutation(api.user_bookmarks.renameBookmark);
  const deleteBookmarkMutation = useMutation(api.user_bookmarks.deleteBookmark);
  const setDefaultBookmarkMutation = useMutation(api.user_bookmarks.setDefaultBookmark);

  // Local state for optimistic updates
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialUserBookmarks);
  const [activeBookmarkId, setActiveBookmarkId] =
    useState<string>("system-all");

  // Sync from database when loaded
  useEffect(() => {
    if (userBookmarksFromDb) {
      setBookmarks(userBookmarksFromDb.map(convertDbBookmark));
    }
  }, [userBookmarksFromDb, userId]);

  // Note: activeFilters state is declared earlier (near query params) for server-side filtering
  const [pinnedFilters, setPinnedFilters] = useState<string[]>([
    "status",
    "vessels",
    "loadPortName",
    "dischargePortName",
    "cpDate",
  ]);
  const [globalPinnedFilters, setGlobalPinnedFilters] = useState<string[]>([
    "status",
    "vessels",
    "loadPortName",
    "dischargePortName",
    "cpDate",
  ]);
  // Note: globalSearchTerms state is declared earlier (near query params) for server-side filtering

  // Use transition for non-urgent search updates (improves INP)
  const [isSearchPending, startSearchTransition] = useTransition();

  // Debounced search handler for better INP
  const handleGlobalSearchChange = useCallback((terms: string[]) => {
    startSearchTransition(() => {
      setGlobalSearchTerms(terms);
    });
  }, []);

  // Table state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_HIDDEN_COLUMNS);
  // Note: grouping state is declared earlier (near query params) so paginationUnit is available for server query
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const bookmarkLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clean up bookmark loading timer on unmount
  useEffect(() => () => clearTimeout(bookmarkLoadingTimerRef.current), []);

  // Use transition for non-urgent pagination updates (improves INP)
  const [isPaginationPending, startPaginationTransition] = useTransition();

  // Bridge TanStack offset pagination to Convex cursor pagination
  // Uses a ref to read current pagination without triggering re-renders
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;

  const handlePaginationChange = useCallback((updaterOrValue: PaginationState | ((old: PaginationState) => PaginationState)) => {
    const oldPagination = paginationRef.current;
    const newPagination = typeof updaterOrValue === 'function'
      ? updaterOrValue(oldPagination)
      : updaterOrValue;

    // No change — bail out
    if (oldPagination.pageSize === newPagination.pageSize && oldPagination.pageIndex === newPagination.pageIndex) {
      return;
    }

    const pageSizeChanged = oldPagination.pageSize !== newPagination.pageSize;
    const pageIndexChanged = oldPagination.pageIndex !== newPagination.pageIndex;

    if (pageSizeChanged) {
      // Page size change: reset cursor navigation and go to page 0
      setCurrentCursor(undefined);
      cursorHistoryRef.current = [undefined];
      startPaginationTransition(() => {
        setPagination({ pageIndex: 0, pageSize: newPagination.pageSize });
      });
      return;
    }

    if (pageIndexChanged) {
      const direction = newPagination.pageIndex - oldPagination.pageIndex;
      if (direction > 0) {
        // Next page
        const nextCursor = serverNextCursorRef.current;
        if (nextCursor) {
          cursorHistoryRef.current = [...cursorHistoryRef.current, nextCursor];
          setCurrentCursor(nextCursor);
        }
      } else if (direction < 0) {
        // Previous page
        cursorHistoryRef.current = cursorHistoryRef.current.slice(0, -1);
        setCurrentCursor(cursorHistoryRef.current[cursorHistoryRef.current.length - 1]);
      }
      setPagination(newPagination);
    }
  }, []);

  // Derive loading state from transition pending state
  const isPaginationLoading = isPaginationPending;

  // Handle column sizing changes with minimum width enforcement
  const handleColumnSizingChange = useCallback(
    (updaterOrValue: Record<string, number> | ((old: Record<string, number>) => Record<string, number>)) => {
      if (typeof updaterOrValue === "function") {
        setColumnSizing((prev) => enforceMinColumnSizing(updaterOrValue(prev)));
      } else {
        setColumnSizing(enforceMinColumnSizing(updaterOrValue));
      }
    },
    []
  );

  // Combined loading state: show skeleton when loading data, changing page size, or switching bookmarks
  const isTableLoading = isLoadingFixtures || isPaginationLoading || isBookmarkLoading || isInitialLoading;

  // Enforce minimum skeleton display time (500ms) for better UX
  const showTableSkeleton = useMinimumLoadingTime(isTableLoading, 500);

  // Memoize columns
  const fixtureColumns: ColumnDef<FixtureData>[] = useMemo(
    () => [
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
                    setSelectedFixture(row.original);
                    setActiveRowId(row.id);
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
          icon: ({ className }) => <Icon name="circle-check-big" className={className} />,
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
          icon: ({ className }) => <Icon name="ship" className={className} />,
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
          icon: ({ className }) => <Icon name="ship" className={className} />,
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
          icon: ({ className }) => <Icon name="ship-load" className={className} />,
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
          icon: ({ className }) => <Icon name="map-pin" className={className} />,
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
          icon: ({ className }) => <Icon name="truck" className={className} />,
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
          icon: ({ className }) => <Icon name="ship-unload" className={className} />,
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
          icon: ({ className }) => <Icon name="map-pin" className={className} />,
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
          icon: ({ className }) => <Icon name="truck" className={className} />,
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
          icon: ({ className }) => <Icon name="package" className={className} />,
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
          icon: ({ className }) => <Icon name="weight" className={className} />,
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
          icon: ({ className }) => <Icon name="user-owner" className={className} />,
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
          icon: ({ className }) => <Icon name="user-broker" className={className} />,
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
          icon: ({ className }) => <Icon name="user-charterer" className={className} />,
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
          icon: ({ className }) => <Icon name="calendar" className={className} />,
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
          icon: ({ className }) => <Icon name="calendar" className={className} />,
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
          icon: ({ className }) => <Icon name="dollar-sign" className={className} />,
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
          icon: ({ className }) => <Icon name="dollar-sign" className={className} />,
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
          icon: ({ className }) => <Icon name="dollar-sign" className={className} />,
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
          icon: ({ className }) => <Icon name="dollar-sign" className={className} />,
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
          icon: ({ className }) => <Icon name="dollar-sign" className={className} />,
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
          icon: ({ className }) => <Icon name="dollar-sign" className={className} />,
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
          icon: ({ className }) => <Icon name="dollar-sign" className={className} />,
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
          icon: ({ className }) => <Icon name="trending-down" className={className} />,
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
          icon: ({ className }) => <Icon name="activity" className={className} />,
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
          icon: ({ className }) => <Icon name="activity" className={className} />,
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
          icon: ({ className }) => <Icon name="activity" className={className} />,
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
          icon: ({ className }) => <Icon name="dollar-sign" className={className} />,
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
          icon: ({ className }) => <Icon name="dollar-sign" className={className} />,
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
          icon: ({ className }) => <Icon name="clock" className={className} />,
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
          icon: ({ className }) => <Icon name="clock" className={className} />,
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
          icon: ({ className }) => <Icon name="trending-down" className={className} />,
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
          icon: ({ className }) => <Icon name="percent" className={className} />,
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
          icon: ({ className }) => <Icon name="dollar-sign" className={className} />,
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
          icon: ({ className }) => <Icon name="percent" className={className} />,
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
          icon: ({ className }) => <Icon name="dollar-sign" className={className} />,
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
          icon: ({ className }) => <Icon name="calendar" className={className} />,
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
          icon: ({ className }) => <Icon name="calendar" className={className} />,
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
          icon: ({ className }) => <Icon name="calendar" className={className} />,
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
          icon: ({ className }) => <Icon name="calendar" className={className} />,
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
          icon: ({ className }) => <Icon name="clock" className={className} />,
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
          icon: ({ className }) => <Icon name="clock" className={className} />,
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
          icon: ({ className }) => <Icon name="clock" className={className} />,
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
          icon: ({ className }) => <Icon name="check-circle" className={className} />,
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
          icon: ({ className }) => <Icon name="user-owner" className={className} />,
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
          icon: ({ className }) => <Icon name="calendar" className={className} />,
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
          icon: ({ className }) => <Icon name="check-circle" className={className} />,
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
          icon: ({ className }) => <Icon name="user-charterer" className={className} />,
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
          icon: ({ className }) => <Icon name="calendar" className={className} />,
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
          icon: ({ className }) => <Icon name="pen-tool" className={className} />,
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
          icon: ({ className }) => <Icon name="user-owner" className={className} />,
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
          icon: ({ className }) => <Icon name="calendar" className={className} />,
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
          icon: ({ className }) => <Icon name="pen-tool" className={className} />,
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
          icon: ({ className }) => <Icon name="user-charterer" className={className} />,
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
          icon: ({ className }) => <Icon name="calendar" className={className} />,
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
          icon: ({ className }) => <Icon name="user-created-by" className={className} />,
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
          icon: ({ className }) => <Icon name="user-created-by" className={className} />,
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
          icon: ({ className }) => <Icon name="user-created-by" className={className} />,
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
          icon: ({ className }) => <Icon name="git-branch" className={className} />,
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
          icon: ({ className }) => <Icon name="file-check" className={className} />,
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
          icon: ({ className }) => <Icon name="calendar" className={className} />,
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
    ],
    [setSelectedFixture, globalSearchTerms],
  );

  // Prepare available columns for export
  const availableColumnsForExport = useMemo(() => {
    return fixtureColumns
      .filter((col): col is typeof col & { accessorKey: string } =>
        "accessorKey" in col && typeof col.accessorKey === "string"
      )
      .map((col) => ({
        id: col.accessorKey,
        label: ((col.meta as ColumnMetaWithLabel | undefined)?.label || col.header) as string,
      }));
  }, [fixtureColumns]);

  // Get visible columns for export
  const visibleColumnsForExport = useMemo(() => {
    return fixtureColumns
      .filter((col): col is typeof col & { accessorKey: string } => {
        if (!("accessorKey" in col) || typeof col.accessorKey !== "string") return false;
        const key = col.accessorKey;
        return columnVisibility[key] !== false;
      })
      .map((col) => col.accessorKey);
  }, [fixtureColumns, columnVisibility]);


  // Filter options from full unfiltered dataset (server-provided)
  // These don't shrink when filters are applied, unlike the old fixtureData-derived useMemos
  const emptyOptions: Array<{ value: string; label: string }> = [];
  const uniqueVessels = filterOptions?.vessels ?? emptyOptions;
  const uniqueOwners = filterOptions?.owner ?? emptyOptions;
  const uniqueBrokers = filterOptions?.broker ?? emptyOptions;
  const uniqueCharterers = filterOptions?.charterer ?? emptyOptions;
  const uniqueStages = filterOptions?.stage ?? emptyOptions;
  const uniqueContractTypes = filterOptions?.contractType ?? emptyOptions;
  const uniqueApprovalStatuses = filterOptions?.approvalStatus ?? emptyOptions;
  const uniqueLoadPorts = filterOptions?.loadPortName ?? emptyOptions;
  const uniqueLoadCountries = filterOptions?.loadPortCountry ?? emptyOptions;
  const uniqueLoadDeliveryTypes = filterOptions?.loadDeliveryType ?? emptyOptions;
  const uniqueDischargePorts = filterOptions?.dischargePortName ?? emptyOptions;
  const uniqueDischargeCountries = filterOptions?.dischargePortCountry ?? emptyOptions;
  const uniqueDischargeRedeliveryTypes = filterOptions?.dischargeRedeliveryType ?? emptyOptions;
  const uniqueCargoTypes = filterOptions?.cargoTypeName ?? emptyOptions;
  const uniqueMarketIndexNames = filterOptions?.marketIndexName ?? emptyOptions;
  const uniqueOwnerApprovalStatuses = filterOptions?.ownerApprovalStatus ?? emptyOptions;
  const uniqueChartererApprovalStatuses = filterOptions?.chartererApprovalStatus ?? emptyOptions;
  const uniqueOwnerSignatureStatuses = filterOptions?.ownerSignatureStatus ?? emptyOptions;
  const uniqueChartererSignatureStatuses = filterOptions?.chartererSignatureStatus ?? emptyOptions;
  const uniqueDealCaptureUsers = filterOptions?.dealCaptureUser ?? emptyOptions;
  const uniqueOrderCreatedBy = filterOptions?.orderCreatedBy ?? emptyOptions;
  const uniqueNegotiationCreatedBy = filterOptions?.negotiationCreatedBy ?? emptyOptions;
  const uniqueOwnerApprovedBy = filterOptions?.ownerApprovedBy ?? emptyOptions;
  const uniqueChartererApprovedBy = filterOptions?.chartererApprovedBy ?? emptyOptions;
  const uniqueOwnerSignedBy = filterOptions?.ownerSignedBy ?? emptyOptions;
  const uniqueChartererSignedBy = filterOptions?.chartererSignedBy ?? emptyOptions;

  // Statuses are static (derived from statusConfig, not data) — keep as-is
  const uniqueStatuses = useMemo(() => {
    const fixtureRelevantStatuses = (Object.keys(statusConfig) as Array<keyof typeof statusConfig>)
      .filter((s) =>
        s.startsWith("contract-") ||
        s.startsWith("recap-manager-") ||
        s.startsWith("negotiation-") ||
        s.startsWith("order-")
      );

    const prefixOrder = ["order-", "negotiation-", "contract-", "recap-manager-"];
    fixtureRelevantStatuses.sort((a, b) => {
      const aPrefix = prefixOrder.findIndex((p) => a.startsWith(p));
      const bPrefix = prefixOrder.findIndex((p) => b.startsWith(p));
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return a.localeCompare(b);
    });

    return fixtureRelevantStatuses.map((s) => ({
      value: s,
      label: getStatusLabel(s),
    }));
  }, []);

  // Define filter definitions
  const filterDefinitions: FilterDefinition[] = useMemo(
    () => {
      // Create options map for dynamic filter values
      const optionsMap: Record<string, Array<{ value: string; label: string }>> = {
        vessels: uniqueVessels,
        status: uniqueStatuses,
        owner: uniqueOwners,
        broker: uniqueBrokers,
        charterer: uniqueCharterers,
        loadPortName: uniqueLoadPorts,
        loadPortCountry: uniqueLoadCountries,
        loadDeliveryType: uniqueLoadDeliveryTypes,
        dischargePortName: uniqueDischargePorts,
        dischargePortCountry: uniqueDischargeCountries,
        dischargeRedeliveryType: uniqueDischargeRedeliveryTypes,
        cargoTypeName: uniqueCargoTypes,
        marketIndexName: uniqueMarketIndexNames,
        ownerApprovalStatus: uniqueOwnerApprovalStatuses,
        chartererApprovalStatus: uniqueChartererApprovalStatuses,
        ownerSignatureStatus: uniqueOwnerSignatureStatuses,
        chartererSignatureStatus: uniqueChartererSignatureStatuses,
        dealCaptureUser: uniqueDealCaptureUsers,
        orderCreatedBy: uniqueOrderCreatedBy,
        negotiationCreatedBy: uniqueNegotiationCreatedBy,
        contractType: uniqueContractTypes,
        ownerApprovedBy: uniqueOwnerApprovedBy,
        chartererApprovedBy: uniqueChartererApprovedBy,
        ownerSignedBy: uniqueOwnerSignedBy,
        chartererSignedBy: uniqueChartererSignedBy,
      };

      // Derive filters from column definitions
      const derivedFilters = deriveFilterDefinitions(fixtureColumns, optionsMap);

      // Add special filters that don't have corresponding visible columns
      const specialFilters: FilterDefinition[] = [
        {
          id: "stage",
          label: "Stage",
          icon: ({ className }) => <Icon name="layers" className={className} />,
          type: "multiselect",
          options: uniqueStages,
          group: "Status",
        },
        {
          id: "approvalStatus",
          label: "Approval Status",
          icon: ({ className }) => <Icon name="check-circle" className={className} />,
          type: "multiselect",
          options: uniqueApprovalStatuses,
          group: "Status",
        },
      ];

      return [...derivedFilters, ...specialFilters];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- all unique* vars derive from filterOptions
    [fixtureColumns, filterOptions],
  );

  // System bookmarks already have correct server-provided counts
  const systemBookmarksWithCounts = useMemo(() => {
    return systemBookmarks.map((bookmark) => ({
      ...bookmark,
      isLoadingCount: bookmarkCounts === undefined,
    }));
  }, [systemBookmarks, bookmarkCounts]);

  // User bookmarks: always use stored DB count so counts don't jump on click
  const bookmarksWithCounts = useMemo(() => {
    return bookmarks.map((bookmark) => ({
      ...bookmark,
      isLoadingCount: false,
    }));
  }, [bookmarks]);

  // Get active bookmark
  const activeBookmark = useMemo(() => {
    return [...systemBookmarksWithCounts, ...bookmarksWithCounts].find(
      (b) => b.id === activeBookmarkId,
    );
  }, [systemBookmarksWithCounts, bookmarksWithCounts, activeBookmarkId]);

  // Check if current state is dirty (differs from saved bookmark)
  const isDirty = useMemo(() => {
    if (!activeBookmark) return false;

    const savedFiltersState = activeBookmark.filtersState || {
      activeFilters: {},
      globalSearchTerms: [],
      pinnedFilters: [],
    };

    const savedTableState = activeBookmark.tableState || {
      sorting: [],
      columnVisibility: {},
      grouping: [],
      columnOrder: [],
      columnSizing: {},
    };

    // Build current filters state for comparison
    const currentFiltersState = {
      activeFilters,
      globalSearchTerms,
      ...(activeBookmark.type === "user" && { pinnedFilters }),
    };

    const savedFiltersToCompare = {
      activeFilters: savedFiltersState.activeFilters,
      globalSearchTerms: savedFiltersState.globalSearchTerms,
      ...(activeBookmark.type === "user" && { pinnedFilters: savedFiltersState.pinnedFilters }),
    };

    // Compare filters using deep equality
    const filtersMatch = deepEqual(currentFiltersState, savedFiltersToCompare);

    // Build current table state for comparison (include ALL properties)
    const currentTableState = {
      sorting,
      columnVisibility,
      grouping,
      columnOrder,
      columnSizing,
    };

    // Compare table state using deep equality
    const tableMatch = deepEqual(currentTableState, savedTableState);

    return !filtersMatch || !tableMatch;
  }, [
    activeBookmark,
    activeFilters,
    globalSearchTerms,
    pinnedFilters,
    sorting,
    columnVisibility,
    grouping,
    columnOrder,
    columnSizing,
  ]);

  // Calculate bookmark data — all filters are now server-side,
  // so bookmark data is simply the server-returned data
  const bookmarkData = useMemo(() => {
    return fixtureData ?? [];
  }, [fixtureData]);

  // Load bookmark state
  const loadBookmark = (bookmark: Bookmark, showLoading = true) => {
    // Show loading skeleton during bookmark transition (skip on initial mount)
    if (showLoading) {
      clearTimeout(bookmarkLoadingTimerRef.current);
      setIsBookmarkLoading(true);
      bookmarkLoadingTimerRef.current = setTimeout(() => {
        setIsBookmarkLoading(false);
      }, 300);
    }

    setActiveBookmarkId(bookmark.id);

    // Reset server pagination when switching bookmarks
    // (filters will change which affects server-side data)
    setCurrentCursor(undefined);
    cursorHistoryRef.current = [undefined];
    setPagination(prev => prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 });

    if (bookmark.filtersState) {
      setActiveFilters(bookmark.filtersState.activeFilters);
      setGlobalSearchTerms(bookmark.filtersState.globalSearchTerms);

      // Handle pinned filters based on bookmark type
      if (bookmark.type === "user") {
        // User bookmarks: restore saved pinned filters
        setPinnedFilters(bookmark.filtersState.pinnedFilters);
      } else {
        // System bookmarks: restore global pinned filters
        setPinnedFilters(globalPinnedFilters);
      }
    } else {
      setActiveFilters({});
      setGlobalSearchTerms([]);

      // If no filtersState, use global pinned filters (for system bookmarks)
      if (bookmark.type === "system") {
        setPinnedFilters(globalPinnedFilters);
      }
    }

    if (bookmark.tableState) {
      setSorting(bookmark.tableState.sorting);
      setColumnVisibility(bookmark.tableState.columnVisibility);
      setGrouping(bookmark.tableState.grouping);
      setColumnOrder(bookmark.tableState.columnOrder || []);
      setColumnSizing(enforceMinColumnSizing(bookmark.tableState.columnSizing));
    } else {
      setSorting([]);
      setColumnVisibility({});
      setGrouping([]);
      setColumnOrder([]);
      setColumnSizing({});
    }
  };

  // Load initial bookmark state on mount
  useEffect(() => {
    const initialBookmark = [...systemBookmarks, ...bookmarks].find(
      (b) => b.id === activeBookmarkId
    );
    if (initialBookmark) {
      loadBookmark(initialBookmark, false); // Don't show loading on initial mount
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Sync global search terms to expand groups when searching
  useEffect(() => {
    if (globalSearchTerms.length > 0) {
      setExpanded(true); // Auto-expand all groups when searching
    } else {
      setExpanded({}); // Collapse all groups when search is cleared
    }
  }, [globalSearchTerms]);

  // All filters are now server-side — no client-side filtering needed.
  // Server handles: status, vessels, owner, charterer, cpDate, and all grouped filters.
  const filteredData = useMemo(() => {
    return fixtureData ?? [];
  }, [fixtureData]);

  // Bookmark handlers
  const handleBookmarkSelect = (bookmark: Bookmark) => {
    // Don't reload if clicking the same bookmark
    if (bookmark.id === activeBookmarkId) {
      return;
    }
    loadBookmark(bookmark);
  };

  const handleRevert = () => {
    if (activeBookmark) {
      // Revert filters, table state, and pinnedFilters (for user bookmarks)
      if (activeBookmark.filtersState) {
        setActiveFilters(activeBookmark.filtersState.activeFilters);
        setGlobalSearchTerms(activeBookmark.filtersState.globalSearchTerms);

        // Restore pinned filters for user bookmarks
        if (activeBookmark.type === "user") {
          setPinnedFilters(activeBookmark.filtersState.pinnedFilters);
        }
      } else {
        setActiveFilters({});
        setGlobalSearchTerms([]);
      }

      if (activeBookmark.tableState) {
        setSorting(activeBookmark.tableState.sorting);
        setColumnVisibility(activeBookmark.tableState.columnVisibility);
        setGrouping(activeBookmark.tableState.grouping);
        setColumnOrder(activeBookmark.tableState.columnOrder || []);
        setColumnSizing(activeBookmark.tableState.columnSizing);
      } else {
        setSorting([]);
        setColumnVisibility({});
        setGrouping([]);
        setColumnOrder([]);
        setColumnSizing({});
        }
    }
  };

  const handleSave = async (action: "update" | "create", name?: string) => {
    if (!userId) {
      console.warn("Cannot save bookmark: user not yet loaded");
      return;
    }

    const bookmarkData = {
      filtersState: {
        activeFilters,
        pinnedFilters,
        globalSearchTerms,
      },
      tableState: {
        sorting,
        columnVisibility,
        grouping,
        columnOrder,
        columnSizing,
      },
      count: serverTotalCount,
    };

    try {
      if (action === "create") {
        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const now = new Date();
        const optimisticBookmark: Bookmark = {
          id: tempId,
          name: name || "New Bookmark",
          type: "user",
          createdAt: now,
          updatedAt: now,
          count: serverTotalCount,
          filtersState: bookmarkData.filtersState,
          tableState: bookmarkData.tableState,
        };

        setBookmarks([...bookmarks, optimisticBookmark]);
        setActiveBookmarkId(tempId);

        // Create in database
        const newBookmark = await createBookmarkMutation({
          userId,
          name: name || "New Bookmark",
          ...bookmarkData,
        });
        // Replace temp with real bookmark (convert from DB format)
        setBookmarks((prev) =>
          prev.map((b) => (b.id === tempId ? convertDbBookmark(newBookmark) : b))
        );
        setActiveBookmarkId(newBookmark.id);
      } else {
        // Update existing
        const bookmarkId = activeBookmarkId as Id<"user_bookmarks">;

        // Optimistic update
        setBookmarks((prev) =>
          prev.map((b) =>
            b.id === bookmarkId
              ? { ...b, ...bookmarkData, updatedAt: new Date() }
              : b
          )
        );

        // Update in database
        await updateBookmarkMutation({
          bookmarkId,
          ...bookmarkData,
        });
      }
    } catch (error) {
      console.error("Failed to save bookmark:", error);
      toast.error("Failed to save bookmark");
      // Revert optimistic update
      if (userBookmarksFromDb) {
        setBookmarks(userBookmarksFromDb.map(convertDbBookmark));
      }
    }
  };

  const handleRename = async (id: string, newName: string) => {
    // Optimistic update
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name: newName } : b))
    );

    try {
      await renameBookmarkMutation({
        bookmarkId: id as Id<"user_bookmarks">,
        newName,
      });
    } catch (error) {
      console.error("Failed to rename bookmark:", error);
      toast.error("Failed to rename bookmark");
      // Revert optimistic update
      if (userBookmarksFromDb) {
        setBookmarks(userBookmarksFromDb.map(convertDbBookmark));
      }
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    const previousBookmarks = bookmarks;
    setBookmarks((prev) => prev.filter((b) => b.id !== id));

    // Handle active bookmark change
    if (activeBookmarkId === id) {
      const firstAvailable =
        systemBookmarksWithCounts[0] ||
        bookmarksWithCounts.find((b) => b.id !== id);
      if (firstAvailable) {
        loadBookmark(firstAvailable);
      }
    }

    try {
      await deleteBookmarkMutation({
        bookmarkId: id as Id<"user_bookmarks">,
      });
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
      toast.error("Failed to delete bookmark");
      // Revert optimistic update
      setBookmarks(previousBookmarks);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!userId) return;

    // Optimistic update
    setBookmarks((prev) =>
      prev.map((b) => ({
        ...b,
        isDefault: b.id === id,
      }))
    );

    try {
      await setDefaultBookmarkMutation({
        userId,
        bookmarkId: id as Id<"user_bookmarks">,
      });
    } catch (error) {
      console.error("Failed to set default bookmark:", error);
      toast.error("Failed to set default bookmark");
      // Revert optimistic update
      if (userBookmarksFromDb) {
        setBookmarks(userBookmarksFromDb.map(convertDbBookmark));
      }
    }
  };

  // Handle pinned filters change
  const handlePinnedFiltersChange = (newPinnedFilters: string[]) => {
    setPinnedFilters(newPinnedFilters);

    // If on a system bookmark, update the global pinned filters
    if (activeBookmark?.type === "system") {
      setGlobalPinnedFilters(newPinnedFilters);
    }
  };

  // Filter handlers
  const handleFilterChange = (filterId: string, value: FilterValue) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterId]: value,
    }));
  };

  const handleFilterClear = (filterId: string) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[filterId];
      return newFilters;
    });
  };

  const handleFilterReset = () => {
    setActiveFilters({});
    setGlobalSearchTerms([]);
  };

  // Handle row clicks to open sidebar
  const handleRowClick = (row: FixtureRow) => {
    // For single-item groups, get the data from the first (and only) subrow
    const fixtureData = row.getIsGrouped() && row.subRows?.length === 1
      ? row.subRows[0].original
      : row.original;

    setSelectedFixture(fixtureData);
    setActiveRowId(row.id);
  };

  return (
    <>
      <div className="p-6 flex flex-col gap-[var(--space-lg)] max-w-full min-w-0">
        {/* Bookmarks Tabs Row + Filters Row */}
        <Bookmarks
          variant="tabs"
          bookmarks={bookmarksWithCounts}
          systemBookmarks={systemBookmarksWithCounts}
          activeBookmarkId={activeBookmarkId}
          isDirty={isDirty}
          onSelect={handleBookmarkSelect}
          onRevert={handleRevert}
          onSave={handleSave}
          onRename={handleRename}
          onDelete={handleDelete}
          onSetDefault={handleSetDefault}
        >
          <Bookmarks.Content>
            <Filters
              filters={filterDefinitions}
              activeFilters={activeFilters}
              pinnedFilters={pinnedFilters}
              onPinnedFiltersChange={handlePinnedFiltersChange}
              onFilterChange={handleFilterChange}
              onFilterClear={handleFilterClear}
              onFilterReset={handleFilterReset}
              enableGlobalSearch={true}
              globalSearchTerms={globalSearchTerms}
              onGlobalSearchChange={handleGlobalSearchChange}
              globalSearchPlaceholder={isSearchPending ? "Searching…" : "Search fixtures…"}
              hideReset={true}
            />
          </Bookmarks.Content>

          <Bookmarks.Actions>
            {isDirty && (
              <>
                <Separator type="dot" layout="horizontal" />

                {activeBookmark?.type === "system" ? (
                  // System bookmark actions
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleRevert}
                      className="h-[var(--size-md)] flex-shrink-0"
                    >
                      Reset
                    </Button>
                    <Bookmarks.CreateButton />
                  </>
                ) : (
                  // User bookmark actions
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleRevert}
                      className="h-[var(--size-md)] flex-shrink-0"
                    >
                      Revert Changes
                    </Button>
                    <Bookmarks.SaveDropdown />
                  </>
                )}
              </>
            )}
          </Bookmarks.Actions>

          <Bookmarks.Settings>
            <DataTableSettingsMenu
              sortableColumns={fixtureColumns
                .filter(
                  (col): col is typeof col & { accessorKey: string } =>
                    "accessorKey" in col &&
                    typeof col.accessorKey === "string" &&
                    col.enableSorting !== false,
                )
                .map((col) => {
                  const meta = col.meta as ColumnMetaWithLabel | undefined;
                  return {
                    id: col.accessorKey,
                    label: (meta?.label || col.header) as string,
                    dataType: getColumnDataType(meta),
                  };
                })}
              selectedSortColumn={sorting[0]?.id}
              sortDirection={sorting[0]?.desc ? "desc" : "asc"}
              onSortChange={(columnId) =>
                setSorting([{ id: columnId, desc: sorting[0]?.desc || false }])
              }
              onSortDirectionChange={(direction) => {
                if (sorting[0]) {
                  setSorting([
                    { id: sorting[0].id, desc: direction === "desc" },
                  ]);
                }
              }}
              groupableColumns={fixtureColumns
                .filter(
                  (
                    col,
                  ): col is typeof col & {
                    accessorKey: string;
                    enableGrouping: boolean;
                  } =>
                    "accessorKey" in col &&
                    typeof col.accessorKey === "string" &&
                    "enableGrouping" in col &&
                    col.enableGrouping === true,
                )
                .map((col) => ({
                  id: col.accessorKey,
                  label: ((col.meta as ColumnMetaWithLabel | undefined)?.label || col.header) as string,
                }))}
              selectedGroupColumn={grouping[0] || ""}
              onGroupChange={(columnId) => {
                if (!columnId || columnId === "none") {
                  setGrouping([]);
                } else {
                  setGrouping([columnId]);
                }
              }}
              columns={fixtureColumns
                .filter(
                  (col): col is typeof col & ({ accessorKey: string } | { id: string }) =>
                    ("accessorKey" in col && typeof col.accessorKey === "string") ||
                    ("id" in col && typeof col.id === "string" && !col.id.startsWith("select") && !col.id.startsWith("expand")),
                )
                .map((col) => ({
                  id: ("accessorKey" in col ? col.accessorKey : col.id) as string,
                  label: ((col.meta as ColumnMetaWithLabel | undefined)?.label || col.header) as string,
                }))}
              visibleColumns={Object.entries(columnVisibility)
                .filter(([_, visible]) => visible !== false)
                .map(([id]) => id)
                .concat(
                  fixtureColumns
                    .filter(
                      (col): col is typeof col & ({ accessorKey: string } | { id: string }) => {
                        const colId = ("accessorKey" in col ? col.accessorKey : "id" in col ? col.id : null) as string | null;
                        return (
                          colId !== null &&
                          typeof colId === "string" &&
                          !colId.startsWith("select") &&
                          !colId.startsWith("expand") &&
                          columnVisibility[colId] === undefined
                        );
                      },
                    )
                    .map((col) => ("accessorKey" in col ? col.accessorKey : col.id) as string),
                )}
              onColumnVisibilityChange={(columnId, visible) => {
                setColumnVisibility((prev) => {
                  const newVisibility = { ...prev };
                  if (visible) {
                    delete newVisibility[columnId];
                  } else {
                    newVisibility[columnId] = false;
                  }
                  return newVisibility;
                });
              }}
              align="end"
              triggerClassName="h-[var(--size-md)]"
            />
          </Bookmarks.Settings>
        </Bookmarks>

        {/* Data Table */}
        <div className="fixtures-table w-full max-w-full min-w-0">
          <DataTable
            data={filteredData}
            columns={fixtureColumns}
            isLoading={showTableSkeleton}
            enableGrouping={true}
            enableExpanding={true}
            enableResponsiveWrapper={true}
            borderStyle="horizontal"
            showHeader={false}
            groupedColumnMode="reorder"
            stickyHeader
            enablePaginationPersistence={true}
            storageKey="fixtures-table"
            // Group-preserving search handled via manual filtering and auto-expansion
            enableGlobalSearch={false}
            // Controlled state for sorting
            sorting={sorting}
            onSortingChange={setSorting}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            grouping={grouping}
            onGroupingChange={setGrouping}
            expanded={expanded}
            onExpandedChange={setExpanded}
            autoExpandChildren={globalSearchTerms.length > 0}
            groupDisplayColumn={
              grouping[0] === "fixtureId" && columnVisibility.fixtureId === false
                ? "orderId"
                : undefined
            }
            hideChildrenForSingleItemGroups={{ fixtureId: true, negotiationId: true, cpId: true }}
            hideExpanderForSingleItemGroups={{ negotiationId: true, cpId: true }}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            columnSizing={columnSizing}
            onColumnSizingChange={handleColumnSizingChange}
            enableColumnResizing={true}
            manualPagination={true}
            rowCount={serverTotalCount}
            paginationVariant="default"
            pageSizeOptions={[10, 25, 50, 100]}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            onRowClick={handleRowClick}
            isRowClickable={(row) => !row.getIsGrouped() || row.subRows?.length === 1}
            activeRowId={activeRowId}
            getRowId={(row) => row.id}
            footerLabel={
              <span className="text-body-sm text-text-secondary">
                {(() => {
                  const entityName =
                    paginationUnit === "negotiation" ? "negotiations"
                    : paginationUnit === "contract" ? "contracts"
                    : "fixtures";

                  return isFiltered ? (
                    <>Showing <strong className="text-text-primary">{serverTotalCount}</strong> from <strong className="text-text-primary">{serverUnfilteredTotalCount}</strong> {entityName} in total.</>
                  ) : (
                    <>Showing all <strong className="text-text-primary">{serverUnfilteredTotalCount}</strong> {entityName}</>
                  );
                })()}
              </span>
            }
          />
        </div>

        {/* Sidebar */}
        {selectedFixture && (
          <FixtureSidebar
            fixture={selectedFixture}
            onClose={() => {
              setSelectedFixture(null);
              setActiveRowId(undefined);
            }}
          />
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        data={fixtureData ?? []}
        filteredData={filteredData}
        bookmarkData={bookmarkData}
        availableColumns={availableColumnsForExport}
        visibleColumns={visibleColumnsForExport}
        isDirty={isDirty}
        bookmarkName={activeBookmark?.name}
      />
    </>
  );
}

export default Fixtures;
