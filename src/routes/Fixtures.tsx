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
  statusConfig,
  type FilterDefinition,
  type FilterValue,
  type Bookmark,
  toast,
} from "@rafal.lemieszewski/tide-ui";
import { useHeaderActions, useUser, useFixtureUrlState } from "../hooks";
import { serializeFiltersToUrl, deserializeFiltersFromUrl } from "../hooks/useFixtureUrlState";
import { createFixtureColumns } from "./fixtures/fixtureColumns";
import { ExportDialog } from "../components/ExportDialog";
import { FixtureSidebar } from "../components/FixtureSidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  getStatusLabel as getStatusLabelBase,
  getCompanyInitials,
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
import type { Row } from "@tanstack/react-table";

// Type alias for TanStack Table
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
        if (import.meta.env.DEV) console.warn("Column without valid id/accessorKey found:", col);
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
  const sidebarTriggerRef = useRef<HTMLElement | null>(null);

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

  // ── URL state (source of truth for filters, search, sort, grouping, pagination, bookmark) ──
  const [urlState, urlActions] = useFixtureUrlState();

  // Derive component-level state from URL
  const activeFilters = useMemo(() => deserializeFiltersFromUrl(urlState), [urlState]);
  const globalSearchTerms = useMemo(() => urlState.search?.split(/\s+/).filter(Boolean) ?? [], [urlState.search]);
  const sorting: SortingState = useMemo(() => urlState.sortBy ? [{ id: urlState.sortBy, desc: urlState.sortDesc }] : [], [urlState.sortBy, urlState.sortDesc]);
  const grouping: GroupingState = useMemo(() => urlState.groupBy ? [urlState.groupBy] : [], [urlState.groupBy]);
  const pagination: PaginationState = useMemo(() => ({ pageIndex: urlState.page, pageSize: urlState.pageSize }), [urlState.page, urlState.pageSize]);
  const activeBookmarkId = urlState.bk;

  // Cursor-based pagination state (bridges TanStack offset pagination to Convex cursor pagination)
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const cursorHistoryRef = useRef<(string | undefined)[]>([undefined]);
  const serverNextCursorRef = useRef<string | null>(null);

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

  // Reset cursor when any server filter, search, pagination unit, or sorting changes
  // (Page reset is handled by URL actions — each setter includes page: 0)
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
      // Reset cursor when filters/search/paginationUnit/sorting change (but not on initial mount)
      setCurrentCursor(undefined);
      cursorHistoryRef.current = [undefined];
    }

    prevFiltersRef.current = currentState;
  }, [serverFilters, globalSearchTerms, paginationUnit, sorting]);

  // Memoize query args so Convex sees stable references when values haven't changed
  // When grouping by a custom field (not a standard pagination unit), tell the server
  // so it can count unique group values for accurate bookmark tab counts.
  const groupByField = useMemo(() => {
    const col = grouping[0];
    if (!col || col === "fixtureId" || col === "negotiationId" || col === "cpId") return undefined;
    return col;
  }, [grouping]);

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
    // Custom grouping (for group count)
    groupByField,
  } as const : "skip" as const, [
    organizationId, paginationUnit, currentCursor, pagination.pageSize,
    serverFilters, globalSearchTerms, sorting, groupByField,
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
  const serverGroupCount = paginatedFixtures?.totalGroupCount;
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
  // Sync from database when loaded
  useEffect(() => {
    if (userBookmarksFromDb) {
      setBookmarks(userBookmarksFromDb.map(convertDbBookmark));
    }
  }, [userBookmarksFromDb, userId]);

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
  // Use transition for non-urgent search updates (improves INP)
  const [isSearchPending, startSearchTransition] = useTransition();
  // Use transition for non-urgent table layout updates (column visibility, grouping)
  const [, startLayoutTransition] = useTransition();

  // Search handler — updates URL, wrapped in transition for INP
  const handleGlobalSearchChange = useCallback((terms: string[]) => {
    startSearchTransition(() => {
      urlActions.setSearch(terms.join(' ') || null);
    });
  }, [urlActions]);

  // Table state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_HIDDEN_COLUMNS);
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
        urlActions.setPageSize(newPagination.pageSize);
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
      urlActions.setPage(newPagination.pageIndex);
    }
  }, [urlActions]);

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

  // Create column handler callback
  const handleFixtureSelect = useCallback((fixture: FixtureData, rowId: string) => {
    setSelectedFixture(fixture);
    setActiveRowId(rowId);
  }, []);

  // Column definitions (extracted to fixtures/fixtureColumns.tsx)
  const fixtureColumns: ColumnDef<FixtureData>[] = useMemo(
    () => createFixtureColumns({
      globalSearchTerms,
      onFixtureSelect: handleFixtureSelect,
    }),
    [globalSearchTerms, handleFixtureSelect],
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
          icon: ({ className }) => <Icon name="layers" className={className} aria-hidden="true" />,
          type: "multiselect",
          options: uniqueStages,
          group: "Status",
        },
        {
          id: "approvalStatus",
          label: "Approval Status",
          icon: ({ className }) => <Icon name="check-circle" className={className} aria-hidden="true" />,
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

  // User bookmarks: active bookmark uses live server count (group count when grouped),
  // non-active bookmarks keep their stored DB count (updated when viewed).
  // While query is loading (paginatedFixtures === undefined), keep stored count and show loading.
  const serverDisplayCount = serverGroupCount ?? serverTotalCount;
  const isQueryLoading = paginatedFixtures === undefined;
  const bookmarksWithCounts = useMemo(() => {
    return bookmarks.map((bookmark) => {
      const isActive = bookmark.id === activeBookmarkId;
      return {
        ...bookmark,
        count: isActive && !isQueryLoading ? serverDisplayCount : bookmark.count,
        isLoadingCount: isActive && isQueryLoading,
      };
    });
  }, [bookmarks, activeBookmarkId, serverDisplayCount, isQueryLoading]);

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

  // Load bookmark state — atomically sets URL params + non-URL state
  const loadBookmark = (bookmark: Bookmark, showLoading = true) => {
    // Show loading skeleton during bookmark transition (skip on initial mount)
    if (showLoading) {
      clearTimeout(bookmarkLoadingTimerRef.current);
      setIsBookmarkLoading(true);
      bookmarkLoadingTimerRef.current = setTimeout(() => {
        setIsBookmarkLoading(false);
      }, 300);
    }

    // Reset cursor state
    setCurrentCursor(undefined);
    cursorHistoryRef.current = [undefined];

    // Atomically set all URL state from bookmark
    const bookmarkFilters = bookmark.filtersState?.activeFilters ?? {};
    const bookmarkSearch = bookmark.filtersState?.globalSearchTerms ?? [];
    const bookmarkSorting = bookmark.tableState?.sorting ?? [];
    const bookmarkGrouping = bookmark.tableState?.grouping ?? [];
    const filterParams = serializeFiltersToUrl(bookmarkFilters);

    urlActions.setAllUrlState({
      ...filterParams,
      search: bookmarkSearch.join(' ') || null,
      sortBy: bookmarkSorting[0]?.id ?? null,
      sortDesc: bookmarkSorting[0]?.desc ?? true,
      groupBy: bookmarkGrouping[0] ?? 'fixtureId',
      bk: bookmark.id,
      page: 0,
    });

    // Non-URL state: pinned filters
    if (bookmark.filtersState) {
      if (bookmark.type === "user") {
        setPinnedFilters(bookmark.filtersState.pinnedFilters);
      } else {
        setPinnedFilters(globalPinnedFilters);
      }
    } else {
      if (bookmark.type === "system") {
        setPinnedFilters(globalPinnedFilters);
      }
    }

    // Non-URL state: column layout
    if (bookmark.tableState) {
      setColumnVisibility(bookmark.tableState.columnVisibility);
      setColumnOrder(bookmark.tableState.columnOrder || []);
      setColumnSizing(enforceMinColumnSizing(bookmark.tableState.columnSizing));
    } else {
      setColumnVisibility({});
      setColumnOrder([]);
      setColumnSizing({});
    }
  };

  // On mount: restore non-URL state (column layout, pinned filters) from active bookmark.
  // URL defaults already match system-all, so filter/sort/group state is restored from URL.
  useEffect(() => {
    const initialBookmark = [...systemBookmarks, ...bookmarks].find(
      (b) => b.id === activeBookmarkId
    );
    if (initialBookmark) {
      // Restore non-URL state only (column layout, pinned filters)
      if (initialBookmark.filtersState) {
        if (initialBookmark.type === "user") {
          setPinnedFilters(initialBookmark.filtersState.pinnedFilters);
        }
      }
      if (initialBookmark.tableState) {
        setColumnVisibility(initialBookmark.tableState.columnVisibility);
        setColumnOrder(initialBookmark.tableState.columnOrder || []);
        setColumnSizing(enforceMinColumnSizing(initialBookmark.tableState.columnSizing));
      }
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
      // Revert URL state (filters, sort, group, search) atomically
      const bookmarkFilters = activeBookmark.filtersState?.activeFilters ?? {};
      const bookmarkSearch = activeBookmark.filtersState?.globalSearchTerms ?? [];
      const bookmarkSorting = activeBookmark.tableState?.sorting ?? [];
      const bookmarkGrouping = activeBookmark.tableState?.grouping ?? [];
      const filterParams = serializeFiltersToUrl(bookmarkFilters);

      urlActions.setAllUrlState({
        ...filterParams,
        search: bookmarkSearch.join(' ') || null,
        sortBy: bookmarkSorting[0]?.id ?? null,
        sortDesc: bookmarkSorting[0]?.desc ?? true,
        groupBy: bookmarkGrouping[0] ?? 'fixtureId',
        page: 0,
      });

      // Revert non-URL state (pinned filters, column layout)
      if (activeBookmark.filtersState) {
        if (activeBookmark.type === "user") {
          setPinnedFilters(activeBookmark.filtersState.pinnedFilters);
        }
      }

      if (activeBookmark.tableState) {
        setColumnVisibility(activeBookmark.tableState.columnVisibility);
        setColumnOrder(activeBookmark.tableState.columnOrder || []);
        setColumnSizing(activeBookmark.tableState.columnSizing);
      } else {
        setColumnVisibility({});
        setColumnOrder([]);
        setColumnSizing({});
      }
    }
  };

  const handleSave = async (action: "update" | "create", name?: string) => {
    if (!userId) {
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
      count: serverGroupCount ?? serverTotalCount,
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
          count: serverGroupCount ?? serverTotalCount,
          filtersState: bookmarkData.filtersState,
          tableState: bookmarkData.tableState,
        };

        setBookmarks([...bookmarks, optimisticBookmark]);
        urlActions.setBookmark(tempId);

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
        urlActions.setBookmark(newBookmark.id);
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
      if (import.meta.env.DEV) console.error("Failed to save bookmark:", error);
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
      if (import.meta.env.DEV) console.error("Failed to rename bookmark:", error);
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
      if (import.meta.env.DEV) console.error("Failed to delete bookmark:", error);
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
      if (import.meta.env.DEV) console.error("Failed to set default bookmark:", error);
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

  // Filter handlers — serialize to URL
  const handleFilterChange = (filterId: string, value: FilterValue) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    urlActions.setFilters(serializeFiltersToUrl(newFilters));
  };

  const handleFilterClear = (filterId: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterId];
    urlActions.setFilters(serializeFiltersToUrl(newFilters));
  };

  const handleFilterReset = () => {
    urlActions.resetFilters();
  };

  // Handle row clicks to open sidebar
  const handleRowClick = (row: FixtureRow) => {
    // For single-item groups, get the data from the first (and only) subrow
    const fixtureData = row.getIsGrouped() && row.subRows?.length === 1
      ? row.subRows[0].original
      : row.original;

    sidebarTriggerRef.current = document.activeElement as HTMLElement;
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
                urlActions.setSort(columnId, sorting[0]?.desc || false)
              }
              onSortDirectionChange={(direction) => {
                if (sorting[0]) {
                  urlActions.setSort(sorting[0].id, direction === "desc");
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
                startLayoutTransition(() => {
                  if (!columnId || columnId === "none") {
                    urlActions.setGroupBy("");
                  } else {
                    urlActions.setGroupBy(columnId);
                  }
                });
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
                startLayoutTransition(() => {
                  setColumnVisibility((prev) => {
                    const newVisibility = { ...prev };
                    if (visible) {
                      delete newVisibility[columnId];
                    } else {
                      newVisibility[columnId] = false;
                    }
                    return newVisibility;
                  });
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
            onSortingChange={(updater) => {
              const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
              if (newSorting.length > 0) {
                urlActions.setSort(newSorting[0].id, newSorting[0].desc);
              } else {
                urlActions.setSort(null, true);
              }
            }}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            grouping={grouping}
            onGroupingChange={(updater) => {
              const newGrouping = typeof updater === 'function' ? updater(grouping) : updater;
              urlActions.setGroupBy(newGrouping[0] ?? "");
            }}
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
              requestAnimationFrame(() => sidebarTriggerRef.current?.focus());
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
