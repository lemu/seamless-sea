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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Bookmarks,
  Filters,
  DataTableSettingsMenu,
  Separator,
  Icon,
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  FixtureStatus,
  statusConfig,
  Card,
  AttributesList,
  AttributesGroup,
  AttributesItem,
  AttributesRow,
  AttributesLabel,
  AttributesValue,
  AttributesSeparator,
  AttributesContent,
  AttributesChevron,
  ActivityLog,
  ActivityLogItem,
  ActivityLogTime,
  ActivityLogHeader,
  ActivityLogDescription,
  ActivityLogValue,
  ActivityLogContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Flag,
  type FilterDefinition,
  type FilterValue,
  type Bookmark,
  type StatusValue,
} from "@rafal.lemieszewski/tide-ui";
import { useHeaderActions, useUser } from "../hooks";
import { ExportDialog } from "../components/ExportDialog";
import { FormattedActivityLogDescription, ActivityLogExpandableContent } from "../components/ActivityLogDescription";
import type { ActivityLogEntry } from "../types/activity";
import { ApprovalSignatureRow } from "../components/ApprovalSignatureRow";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  formatLaycanRange,
  formatCargo,
  formatCurrency,
  formatRate,
  formatPercent,
  formatQuantity,
  formatEnumLabel,
  reformatCurrencyString,
  pluralize,
} from "../utils/dataUtils";
import {
  calculateFreightSavings,
  calculateDemurrageSavings,
  calculateDaysBetween,
  calculateFreightVsMarket,
} from "../utils/fixtureCalculations";

// Helper function to get human-readable status labels
const getStatusLabel = (status: string): string => {
  const config = statusConfig[status as keyof typeof statusConfig];
  if (config) {
    return `${config.objectLabel} • ${config.statusLabel}`;
  }
  // Fallback for unknown statuses - use centralized enum formatter
  return formatEnumLabel(status);
};

// Import types for fixture structure
import type {
  ContractData,
  OrderData,
  NegotiationData,
  VesselData,
  PortData,
  CargoTypeData,
  ApprovalData,
  SignatureData,
  ApprovalSummary,
  SignatureSummary,
  FixtureWithRelations,
  EnrichedContractItem,
  FieldChangeData,
} from "../types/fixture";
import type { CellContext, Row } from "@tanstack/react-table";

// Type aliases for TanStack Table
type FixtureCellContext<TValue = unknown> = CellContext<FixtureData, TValue>;
type FixtureRow = Row<FixtureData>;

// Define types for fixture structure
interface FixtureData {
  id: string;
  fixtureId: string;
  orderId?: string;
  cpId?: string;
  stage: string;
  typeOfContract: string;
  negotiationId: string;
  vessels: string;
  personInCharge: string;
  status: string;
  approvalStatus: string;
  owner: string;
  ownerAvatarUrl?: string | null;
  broker: string;
  brokerAvatarUrl?: string | null;
  charterer: string;
  chartererAvatarUrl?: string | null;
  lastUpdated: number;
  // Full objects for sidebar display
  contract?: ContractData | null;
  order?: OrderData | null;
  negotiation?: NegotiationData | null;
  vessel?: VesselData | null;
  loadPort?: PortData | null;
  dischargePort?: PortData | null;
  cargoType?: CargoTypeData | null;
  // Approval and signature data
  approvals?: ApprovalData[];
  approvalSummary?: ApprovalSummary;
  signatures?: SignatureData[];
  signatureSummary?: SignatureSummary;

  // Priority 1: Core Commercial Fields
  laycanStart?: number;
  laycanEnd?: number;
  loadPortName?: string;
  loadPortCountry?: string;
  loadDeliveryType?: string;
  dischargePortName?: string;
  dischargePortCountry?: string;
  dischargeRedeliveryType?: string;
  vesselImo?: string;
  cargoTypeName?: string;
  cargoQuantity?: number;
  finalFreightRate?: string | number;
  finalDemurrageRate?: string | number;

  // Priority 2: Freight & Demurrage Analytics
  highestFreightRateIndication?: number;
  lowestFreightRateIndication?: number;
  firstFreightRateIndication?: number;
  highestFreightRateLastDay?: number;
  lowestFreightRateLastDay?: number;
  firstFreightRateLastDay?: number;
  freightSavingsPercent?: number; // calculated
  marketIndex?: number;
  marketIndexName?: string;
  freightVsMarketPercent?: number; // calculated
  grossFreight?: number;
  highestDemurrageIndication?: number;
  lowestDemurrageIndication?: number;
  demurrageSavingsPercent?: number; // calculated

  // Priority 3: Commissions
  addressCommissionPercent?: number;
  addressCommissionTotal?: number;
  brokerCommissionPercent?: number;
  brokerCommissionTotal?: number;

  // Priority 4: CP Workflow Dates
  cpDate?: number;
  workingCopyDate?: number;
  finalDate?: number;
  fullySignedDate?: number;
  daysToWorkingCopy?: number; // calculated
  daysToFinal?: number; // calculated
  daysToSigned?: number; // calculated

  // Priority 5: Approval Status Details
  ownerApprovalStatus?: string;
  ownerApprovedBy?: string;
  ownerApprovalDate?: number;
  chartererApprovalStatus?: string;
  chartererApprovedBy?: string;
  chartererApprovalDate?: number;

  // Priority 6: Signature Status Details
  ownerSignatureStatus?: string;
  ownerSignedBy?: string;
  ownerSignatureDate?: number;
  chartererSignatureStatus?: string;
  chartererSignedBy?: string;
  chartererSignatureDate?: number;

  // Priority 7: User Tracking
  dealCaptureUser?: string;
  orderCreatedBy?: string;
  negotiationCreatedBy?: string;

  // Priority 8: Parent/Child Relationships
  parentCpId?: string;
  contractType?: string;
}

// Define types for change history
interface ChangeHistoryEntry {
  timestamp: string;  // e.g., "Jul 27, 2025 at 15:01"
  user: {
    name: string;
    avatar?: string;
  };
  action: 'created' | 'updated';
  status: {
    value: string;  // e.g., "order-draft", "contract-working-copy"
    label: string;  // e.g., "order draft", "contract working copy"
  };
  value: string;  // The new value
  oldValue?: string;  // The previous value (for 'updated' action)
}

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
        laycanStart: item.negotiation?.laycanStart || item.laycanStart,
        laycanEnd: item.negotiation?.laycanEnd || item.laycanEnd,
        loadPortName: item.loadPort?.name,
        loadPortCountry: item.loadPort?.country,
        loadDeliveryType: item.negotiation?.loadDeliveryType,
        dischargePortName: item.dischargePort?.name,
        dischargePortCountry: item.dischargePort?.country,
        dischargeRedeliveryType: item.negotiation?.dischargeRedeliveryType,
        vesselImo: item.vessel?.imoNumber,
        cargoTypeName: item.cargoType?.name,
        cargoQuantity: item.negotiation?.quantity || item.quantity,
        finalFreightRate: item.negotiation?.freightRate || item.freightRate,
        finalDemurrageRate: item.negotiation?.demurrageRate || item.demurrageRate,

        // Freight Analytics
        highestFreightRateIndication: item.negotiation?.highestFreightRateIndication,
        lowestFreightRateIndication: item.negotiation?.lowestFreightRateIndication,
        firstFreightRateIndication: item.negotiation?.firstFreightRateIndication,
        highestFreightRateLastDay: item.negotiation?.highestFreightRateLastDay,
        lowestFreightRateLastDay: item.negotiation?.lowestFreightRateLastDay,
        firstFreightRateLastDay: item.negotiation?.firstFreightRateLastDay,
        freightSavingsPercent: calculateFreightSavings(
          item.negotiation?.highestFreightRateIndication,
          item.negotiation?.freightRate || item.freightRate
        ) ?? undefined,
        marketIndex: item.negotiation?.marketIndex,
        marketIndexName: item.negotiation?.marketIndexName,
        freightVsMarketPercent: calculateFreightVsMarket(
          item.negotiation?.freightRate || item.freightRate,
          item.negotiation?.marketIndex
        ) ?? undefined,
        grossFreight: item.negotiation?.grossFreight,
        highestDemurrageIndication: item.negotiation?.highestDemurrageIndication,
        lowestDemurrageIndication: item.negotiation?.lowestDemurrageIndication,
        demurrageSavingsPercent: calculateDemurrageSavings(
          item.negotiation?.highestDemurrageIndication,
          item.negotiation?.demurrageRate || item.demurrageRate
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

        // Approvals
        ownerApprovalStatus: item.approvals?.find((a) => a.partyRole === 'owner')?.status,
        ownerApprovedBy: item.approvals?.find((a) => a.partyRole === 'owner')?.approvedBy?.name,
        ownerApprovalDate: item.approvals?.find((a) => a.partyRole === 'owner')?.approvedAt,
        chartererApprovalStatus: item.approvals?.find((a) => a.partyRole === 'charterer')?.status,
        chartererApprovedBy: item.approvals?.find((a) => a.partyRole === 'charterer')?.approvedBy?.name,
        chartererApprovalDate: item.approvals?.find((a) => a.partyRole === 'charterer')?.approvedAt,

        // Signatures
        ownerSignatureStatus: item.signatures?.find((s) => s.partyRole === 'owner')?.status,
        ownerSignedBy: item.signatures?.find((s) => s.partyRole === 'owner')?.signedBy?.name,
        ownerSignatureDate: item.signatures?.find((s) => s.partyRole === 'owner')?.signedAt,
        chartererSignatureStatus: item.signatures?.find((s) => s.partyRole === 'charterer')?.status,
        chartererSignedBy: item.signatures?.find((s) => s.partyRole === 'charterer')?.signedBy?.name,
        chartererSignatureDate: item.signatures?.find((s) => s.partyRole === 'charterer')?.signedAt,

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

  return tableData.sort((a, b) => b.lastUpdated - a.lastUpdated);
};

// Helper function to format timestamp
const formatTimestamp = (timestamp: number | string | undefined | null): string => {
  // Handle null/undefined
  if (timestamp === null || timestamp === undefined) return '–';

  // Convert to number if string
  const ts = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;

  // Validate it's a number
  if (typeof ts !== 'number' || isNaN(ts)) {
    console.warn('Invalid timestamp:', timestamp);
    return '–';
  }

  // Create date and validate
  const date = new Date(ts);
  if (isNaN(date.getTime())) {
    console.warn('Invalid date from timestamp:', ts);
    return '–';
  }

  // Format the date
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

// Type guard to filter out null/undefined from arrays
const isDefined = <T,>(value: T | null | undefined): value is T => value != null;

// Helper function to get company initials for avatar fallback
const getCompanyInitials = (companyName: string): string => {
  const words = companyName.split(' ').filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

// Helper function to transform field changes for display
const transformFieldChanges = (
  fieldChanges: FieldChangeData[] | undefined,
  fieldName: string
): ChangeHistoryEntry[] => {
  if (!fieldChanges) return [];

  return fieldChanges
    .filter((change) => change.fieldName === fieldName)
    .map((change) => {
      const date = new Date(change.timestamp);
      const formattedDate = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
      }).replace(',', ' at');

      return {
        timestamp: formattedDate,
        user: {
          name: change.user?.name || 'Unknown',
          avatar: change.user?.avatarUrl || undefined,
        },
        action: change.oldValue ? 'updated' : 'created',
        status: {
          value: 'contract-working-copy',
          label: getStatusLabel('contract-working-copy'),
        },
        value: change.newValue || '',
        oldValue: change.oldValue || '',
      };
    });
};

// Fixture Sidebar Component
function FixtureSidebar({
  fixture,
  onClose,
}: {
  fixture: FixtureData;
  onClose: () => void;
}) {
  // Fetch field changes for this contract
  const fieldChanges = useQuery(
    api.audit.getFieldChanges,
    fixture.contract?._id
      ? { entityType: "contract", entityId: fixture.contract._id }
      : "skip"
  );

  // Fetch activity logs for contract and negotiation
  const contractActivityLog = useQuery(
    api.audit.getActivityLog,
    fixture.contract?._id
      ? { entityType: "contract", entityId: fixture.contract._id }
      : "skip"
  );

  const negotiationActivityLog = useQuery(
    api.audit.getActivityLog,
    fixture.negotiation?._id
      ? { entityType: "negotiation", entityId: fixture.negotiation._id }
      : "skip"
  );

  // Combine and sort activity logs (oldest first)
  const allActivityLogs = useMemo((): ActivityLogEntry[] => {
    const logs = [
      ...(contractActivityLog || []),
      ...(negotiationActivityLog || []),
    ] as ActivityLogEntry[];
    return logs.sort((a, b) => a.timestamp - b.timestamp); // Oldest first
  }, [contractActivityLog, negotiationActivityLog]);

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex flex-col gap-0 bg-[var(--color-surface-base)] p-0" style={{ width: '640px', maxWidth: '640px' }}>
        <SheetTitle className="sr-only">Fixture {fixture.id}</SheetTitle>

        <Tabs defaultValue="overview" className="flex flex-1 flex-col overflow-hidden gap-0">
          {/* Header */}
          <div className="flex-shrink-0 bg-[var(--color-surface-primary)]">
            <div className="flex items-start justify-between px-6 pb-6 pt-6">
              <div className="flex flex-col gap-1">
                {/* Main title line with fixture ID */}
                <div className="flex items-center gap-2 text-[20px] font-semibold leading-6 tracking-[-0.2px] text-[var(--color-text-primary)]">
                  <span>
                    {fixture.orderId && fixture.negotiationId && fixture.orderId !== "-" && fixture.negotiationId !== "-"
                      ? `${fixture.orderId} • ${fixture.negotiationId}`
                      : fixture.cpId || fixture.fixtureId}
                  </span>
                </div>

                {/* Metadata line with companies, route, and cargo */}
                <div className="flex flex-wrap items-center gap-1.5 text-body-xsm text-[var(--color-text-secondary)]">
                  <span>{fixture.charterer}</span>
                  <span>×</span>
                  <span>{fixture.owner}</span>
                  {fixture.loadPort && fixture.dischargePort && (
                    <>
                      <span>•</span>
                      <span>
                        {fixture.loadPort.name}
                        {fixture.loadPort.countryCode && `, ${fixture.loadPort.countryCode}`}
                      </span>
                      <Icon name="arrow-right" size="sm" />
                      <span>
                        {fixture.dischargePort.name}
                        {fixture.dischargePort.countryCode && `, ${fixture.dischargePort.countryCode}`}
                      </span>
                    </>
                  )}
                  {fixture.cargoType && fixture.contract?.quantity && (
                    <>
                      <span>•</span>
                      <span>
                        {formatCargo(
                          fixture.contract.quantity,
                          fixture.contract.quantityUnit || "MT",
                          fixture.cargoType.name
                        )}
                      </span>
                    </>
                  )}
                  {fixture.contract?.laycanStart && fixture.contract?.laycanEnd && (
                    <>
                      <span>•</span>
                      <span>{formatLaycanRange(fixture.contract.laycanStart, fixture.contract.laycanEnd)}</span>
                    </>
                  )}
                </div>
              </div>
              <SheetClose />
            </div>

            {/* Tab Navigation */}
            <TabsList variant="line" fullWidth>
              <TabsTrigger variant="line" fullWidth value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger variant="line" fullWidth value="activity">
                Activity Log
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          {/* Overview Tab */}
          <TabsContent
            value="overview"
            className="mt-0 flex-1 overflow-y-auto bg-[var(--color-surface-base)]"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {/* Status Card */}
              <Card className="p-6">
                <h3 className="mb-4 text-body-lg font-semibold text-[var(--color-text-primary)]">Status</h3>
                <AttributesList style={{ gridTemplateColumns: 'minmax(140px, auto) 1fr auto' }}>
                  <AttributesGroup label="Deal with Acme">
                      <AttributesItem>
                        <AttributesRow externalLink={{
                          href: "/negotiation",
                          label: "Go to negotiation"
                        }}>
                          <AttributesLabel>Negotiation</AttributesLabel>
                          <AttributesValue>
                            <FixtureStatus value="negotiation-fixed" size="sm" lowercase={false} asBadge />
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>

                      <AttributesItem>
                        <AttributesRow externalLink={{
                          href: "/contract",
                          label: "Go to contract"
                        }}>
                          <AttributesLabel>Contract</AttributesLabel>
                          <AttributesValue>
                            <FixtureStatus value="contract-working-copy" size="sm" lowercase={false} asBadge />
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>

                      {/* Contract Approval */}
                      {fixture.approvalSummary && fixture.approvals && fixture.approvalSummary.total > 0 && (
                        <ApprovalSignatureRow
                          label="Contract Approval"
                          type="approval"
                          records={fixture.approvals}
                          summary={fixture.approvalSummary}
                        />
                      )}

                      {/* Contract Signature */}
                      {fixture.signatureSummary && fixture.signatures && fixture.signatureSummary.total > 0 && (
                        <ApprovalSignatureRow
                          label="Contract Signature"
                          type="signature"
                          records={fixture.signatures}
                          summary={fixture.signatureSummary}
                        />
                      )}
                    </AttributesGroup>
                </AttributesList>
              </Card>

              {/* Fixture Specification Card */}
              <Card className="p-6">
                <h3 className="mb-4 text-body-lg font-semibold text-[var(--color-text-primary)]">Fixture specification</h3>

                {/* Pre-compute field changes for conditional rendering */}
                {(() => {
                  const chartererChanges = transformFieldChanges(fieldChanges, "chartererId");
                  const brokerChanges = transformFieldChanges(fieldChanges, "brokerId");
                  const ownerChanges = transformFieldChanges(fieldChanges, "ownerId");
                  const loadPortChanges = transformFieldChanges(fieldChanges, "loadPortId");
                  const dischargePortChanges = transformFieldChanges(fieldChanges, "dischargePortId");
                  const cargoChanges = transformFieldChanges(fieldChanges, "quantity");
                  const laycanChanges = transformFieldChanges(fieldChanges, "laycanStart");
                  const freightRateChanges = transformFieldChanges(fieldChanges, "freightRate");
                  const demurrageChanges = transformFieldChanges(fieldChanges, "demurrageRate");

                  const hasChartererChanges = chartererChanges.length > 0;
                  const hasBrokerChanges = brokerChanges.length > 0;
                  const hasOwnerChanges = ownerChanges.length > 0;
                  const hasLoadPortChanges = loadPortChanges.length > 0;
                  const hasDischargePortChanges = dischargePortChanges.length > 0;
                  const hasCargoChanges = cargoChanges.length > 0;
                  const hasLaycanChanges = laycanChanges.length > 0;
                  const hasFreightRateChanges = freightRateChanges.length > 0;
                  const hasDemurrageChanges = demurrageChanges.length > 0;

                  return (
                <AttributesList style={{ gridTemplateColumns: 'minmax(140px, auto) 1fr' }}>
                  <AttributesGroup label="Involved Parties">
                    <AttributesItem collapsible={hasChartererChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasChartererChanges}>
                        <AttributesLabel>Charterer</AttributesLabel>
                        <AttributesValue>
                          <Avatar type="organization" size="xs">
                            <AvatarImage src={fixture.chartererAvatarUrl || undefined} alt={fixture.charterer} />
                            <AvatarFallback>{getCompanyInitials(fixture.charterer)}</AvatarFallback>
                          </Avatar>
                          {fixture.charterer}
                          {hasChartererChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasChartererChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {chartererChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
                                      <span>{entry.action === 'created' ? 'set Charterer to' : 'changed Charterer from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasBrokerChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasBrokerChanges}>
                        <AttributesLabel>Broker</AttributesLabel>
                        <AttributesValue>
                          <Avatar type="organization" size="xs">
                            <AvatarImage src={fixture.brokerAvatarUrl || undefined} alt={fixture.broker} />
                            <AvatarFallback>{getCompanyInitials(fixture.broker)}</AvatarFallback>
                          </Avatar>
                          {fixture.broker}
                          {hasBrokerChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasBrokerChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {brokerChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
                                      <span>{entry.action === 'created' ? 'set Broker to' : 'changed Broker from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasOwnerChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasOwnerChanges}>
                        <AttributesLabel>Owner</AttributesLabel>
                        <AttributesValue>
                          <Avatar type="organization" size="xs">
                            <AvatarImage src={fixture.ownerAvatarUrl || undefined} alt={fixture.owner} />
                            <AvatarFallback>{getCompanyInitials(fixture.owner)}</AvatarFallback>
                          </Avatar>
                          {fixture.owner}
                          {hasOwnerChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasOwnerChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {ownerChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
                                      <span>{entry.action === 'created' ? 'set Owner to' : 'changed Owner from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>
                  </AttributesGroup>

                  <AttributesSeparator />

                  <AttributesGroup label="Vessel" showHiddenLabel="More details" hideLabel="Less details">
                    <AttributesItem>
                      <AttributesRow>
                        <AttributesLabel>Vessel name</AttributesLabel>
                        <AttributesValue>{fixture.vessel?.name || "TBN"}</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    {fixture.vessel?.imoNumber && (
                      <AttributesItem>
                        <AttributesRow>
                          <AttributesLabel>IMO Number</AttributesLabel>
                          <AttributesValue>{fixture.vessel.imoNumber}</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.callsign && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Callsign</AttributesLabel>
                          <AttributesValue>{fixture.vessel.callsign}</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.builtDate && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Built date</AttributesLabel>
                          <AttributesValue>
                            {new Date(fixture.vessel.builtDate).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.grt && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>GRT</AttributesLabel>
                          <AttributesValue>{formatQuantity(fixture.vessel.grt, "mt")}</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.flag && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Flag</AttributesLabel>
                          <AttributesValue>{fixture.vessel.flag}</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.vesselClass && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Class</AttributesLabel>
                          <AttributesValue>{fixture.vessel.vesselClass}</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.dwt && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>DWT</AttributesLabel>
                          <AttributesValue>{formatQuantity(fixture.vessel.dwt, "mt")}</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.draft && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Draft</AttributesLabel>
                          <AttributesValue>{fixture.vessel.draft} m</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {(fixture.vessel?.loa || fixture.vessel?.beam) && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>LOA/Beam</AttributesLabel>
                          <AttributesValue>
                            {fixture.vessel.loa ? `${fixture.vessel.loa} m` : '—'} • {fixture.vessel.beam ? `${fixture.vessel.beam} m` : '—'}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.maxHeight && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Max height</AttributesLabel>
                          <AttributesValue>{fixture.vessel.maxHeight} m</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {(fixture.vessel?.speedKnots || fixture.vessel?.consumptionPerDay) && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Speed & Consumption</AttributesLabel>
                          <AttributesValue>
                            {fixture.vessel.speedKnots ? `${fixture.vessel.speedKnots} knots` : '—'} • {fixture.vessel.consumptionPerDay ? `${formatQuantity(fixture.vessel.consumptionPerDay)} l/day` : '—'}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.contract?.fullCpChainStorageId && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Full CP chain</AttributesLabel>
                          <AttributesValue>Available</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.contract?.itineraryStorageId && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Full itinerary</AttributesLabel>
                          <AttributesValue>Available</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}
                  </AttributesGroup>

                  <AttributesSeparator />

                  <AttributesGroup label="Voyage">
                    <AttributesItem collapsible={hasLoadPortChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasLoadPortChanges}>
                        <AttributesLabel>Load Port</AttributesLabel>
                        <AttributesValue>
                          {fixture.loadPort?.countryCode && (
                            <Flag country={fixture.loadPort.countryCode.toLowerCase()} />
                          )}
                          {fixture.loadPort?.name}, {fixture.loadPort?.countryCode}
                          {hasLoadPortChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasLoadPortChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {loadPortChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
                                      <span>{entry.action === 'created' ? 'set Load Port to' : 'changed Load Port from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasDischargePortChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasDischargePortChanges}>
                        <AttributesLabel>Discharge Port</AttributesLabel>
                        <AttributesValue>
                          {fixture.dischargePort?.countryCode && (
                            <Flag country={fixture.dischargePort.countryCode.toLowerCase()} />
                          )}
                          {fixture.dischargePort?.name}, {fixture.dischargePort?.countryCode}
                          {hasDischargePortChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasDischargePortChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {dischargePortChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
                                      <span>{entry.action === 'created' ? 'set Discharge Port to' : 'changed Discharge Port from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasCargoChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasCargoChanges}>
                        <AttributesLabel>Cargo</AttributesLabel>
                        <AttributesValue>
                          {fixture.cargoType?.name && fixture.contract?.quantity
                            ? formatCargo(
                                fixture.contract.quantity,
                                fixture.contract.quantityUnit || "MT",
                                fixture.cargoType.name
                              )
                            : "Not specified"}
                          {hasCargoChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasCargoChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {cargoChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
                                      <span>{entry.action === 'created' ? 'set Cargo to' : 'changed Cargo from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasLaycanChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasLaycanChanges}>
                        <AttributesLabel>Laycan</AttributesLabel>
                        <AttributesValue>
                          {fixture.contract?.laycanStart && fixture.contract?.laycanEnd
                            ? formatLaycanRange(fixture.contract.laycanStart, fixture.contract.laycanEnd)
                            : "Not specified"}
                          {hasLaycanChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasLaycanChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {laycanChanges.map((entry, index) => (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Laycan to' : 'changed Laycan from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              ))}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>
                  </AttributesGroup>

                  <AttributesSeparator />

                  <AttributesGroup label="Financials" showHiddenLabel="More details" hideLabel="Less details">
                    <AttributesItem>
                      <AttributesRow>
                        <AttributesLabel>Fixture type</AttributesLabel>
                        <AttributesValue>
                          {fixture.typeOfContract || "Not specified"}
                        </AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem collapsible={hasFreightRateChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasFreightRateChanges}>
                        <AttributesLabel>Freight Rate</AttributesLabel>
                        <AttributesValue>
                          {fixture.contract?.freightRate
                            ? formatRate(parseFloat(fixture.contract.freightRate.replace(/[^0-9.]/g, '')), "/mt")
                            : "Not specified"}
                          {hasFreightRateChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasFreightRateChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {freightRateChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
                                      <span>{entry.action === 'created' ? 'set Freight Rate to' : 'changed Freight Rate from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasDemurrageChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasDemurrageChanges}>
                        <AttributesLabel>Demurrage / Despatch</AttributesLabel>
                        <AttributesValue>
                          {fixture.contract?.demurrageRate
                            ? reformatCurrencyString(fixture.contract.demurrageRate)
                            : "Not specified"}
                          {hasDemurrageChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasDemurrageChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {demurrageChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
                                      <span>{entry.action === 'created' ? 'set Demurrage Rate to' : 'changed Demurrage Rate from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    {/* Gross Freight */}
                    {fixture.negotiation?.grossFreight && (
                      <AttributesItem>
                        <AttributesRow>
                          <AttributesLabel>Gross Freight</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.grossFreight)}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {/* Analytics - Hidden in "More details" */}
                    {fixture.negotiation?.highestFreightRateIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Highest freight indication</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.highestFreightRateIndication, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.lowestFreightRateIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Lowest freight indication</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.lowestFreightRateIndication, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.firstFreightRateIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>First freight indication</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.firstFreightRateIndication, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.highestFreightRateLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Highest freight (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.highestFreightRateLastDay, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.lowestFreightRateLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Lowest freight (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.lowestFreightRateLastDay, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.firstFreightRateLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>First freight (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.firstFreightRateLastDay, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {(() => {
                      const savings = calculateFreightSavings(
                        fixture.negotiation?.highestFreightRateIndication,
                        fixture.negotiation?.freightRate
                      );
                      if (!savings) return null;
                      const finalRate = fixture.negotiation?.freightRate ? parseFloat(fixture.negotiation.freightRate.replace(/[^0-9.]/g, '')) : 0;
                      const savingsAmount = (fixture.negotiation?.highestFreightRateIndication || 0) - finalRate;
                      return (
                        <AttributesItem hidden>
                          <AttributesRow>
                            <AttributesLabel>Freight savings from highest</AttributesLabel>
                            <AttributesValue className="text-[var(--color-text-success)] flex items-center gap-1">
                              {formatRate(savingsAmount)} ({formatPercent(savings)})
                              <Icon name="CheckCircle" size="sm" />
                            </AttributesValue>
                          </AttributesRow>
                        </AttributesItem>
                      );
                    })()}

                    {(() => {
                      if (!fixture.negotiation?.firstFreightRateLastDay || !fixture.negotiation?.freightRate) return null;
                      const finalRate = parseFloat(fixture.negotiation.freightRate.replace(/[^0-9.]/g, ''));
                      const improvement = fixture.negotiation.firstFreightRateLastDay - finalRate;
                      const improvementPercent = (improvement / fixture.negotiation.firstFreightRateLastDay) * 100;
                      if (improvement <= 0) return null;
                      return (
                        <AttributesItem hidden>
                          <AttributesRow>
                            <AttributesLabel>Freight last day improvement</AttributesLabel>
                            <AttributesValue className="text-[var(--color-text-success)]">
                              {formatRate(improvement)} ({formatPercent(improvementPercent)})
                            </AttributesValue>
                          </AttributesRow>
                        </AttributesItem>
                      );
                    })()}

                    {fixture.negotiation?.marketIndex && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>
                            {fixture.negotiation.marketIndexName || "Market index"}
                          </AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.marketIndex, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {(() => {
                      const vsMarket = calculateFreightVsMarket(
                        fixture.negotiation?.freightRate,
                        fixture.negotiation?.marketIndex
                      );
                      if (vsMarket === null) return null;
                      return (
                        <AttributesItem hidden>
                          <AttributesRow>
                            <AttributesLabel>vs Market</AttributesLabel>
                            <AttributesValue
                              className={
                                vsMarket < 0
                                  ? "text-[var(--color-text-success)]"
                                  : "text-[var(--color-text-danger)]"
                              }
                            >
                              {formatPercent(vsMarket, 1, true)}
                              {vsMarket < 0 && (
                                <Icon
                                  name="CheckCircle"
                                  size="sm"
                                  className="inline ml-1"
                                />
                              )}
                            </AttributesValue>
                          </AttributesRow>
                        </AttributesItem>
                      );
                    })()}

                    {fixture.negotiation?.highestDemurrageIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Highest demurrage indication</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.highestDemurrageIndication, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.lowestDemurrageIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Lowest demurrage indication</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.lowestDemurrageIndication, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.firstDemurrageIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>First demurrage indication</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.firstDemurrageIndication, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.highestDemurrageLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Highest demurrage (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.highestDemurrageLastDay, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.lowestDemurrageLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Lowest demurrage (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.lowestDemurrageLastDay, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.firstDemurrageLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>First demurrage (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.firstDemurrageLastDay, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {(() => {
                      const savings = calculateDemurrageSavings(
                        fixture.negotiation?.highestDemurrageIndication,
                        fixture.negotiation?.demurrageRate
                      );
                      if (!savings) return null;
                      const finalRate = fixture.negotiation?.demurrageRate ? parseFloat(fixture.negotiation.demurrageRate.replace(/[^0-9]/g, '')) : 0;
                      const savingsAmount = (fixture.negotiation?.highestDemurrageIndication || 0) - finalRate;
                      return (
                        <AttributesItem hidden>
                          <AttributesRow>
                            <AttributesLabel>Demurrage savings from highest</AttributesLabel>
                            <AttributesValue className="text-[var(--color-text-success)] flex items-center gap-1">
                              {formatCurrency(savingsAmount)} ({formatPercent(savings)})
                              <Icon name="CheckCircle" size="sm" />
                            </AttributesValue>
                          </AttributesRow>
                        </AttributesItem>
                      );
                    })()}

                    {(() => {
                      if (!fixture.negotiation?.firstDemurrageLastDay || !fixture.negotiation?.demurrageRate) return null;
                      const finalRate = parseFloat(fixture.negotiation.demurrageRate.replace(/[^0-9]/g, ''));
                      const improvement = fixture.negotiation.firstDemurrageLastDay - finalRate;
                      const improvementPercent = (improvement / fixture.negotiation.firstDemurrageLastDay) * 100;
                      if (improvement <= 0) return null;
                      return (
                        <AttributesItem hidden>
                          <AttributesRow>
                            <AttributesLabel>Demurrage last day improvement</AttributesLabel>
                            <AttributesValue className="text-[var(--color-text-success)]">
                              {formatCurrency(improvement)} ({formatPercent(improvementPercent)})
                            </AttributesValue>
                          </AttributesRow>
                        </AttributesItem>
                      );
                    })()}

                    {/* Commissions - always visible */}
                    {fixture.negotiation?.addressCommissionPercent && (
                      <AttributesItem>
                        <AttributesRow>
                          <AttributesLabel>Address commission</AttributesLabel>
                          <AttributesValue>
                            {formatPercent(fixture.negotiation.addressCommissionPercent, 2)}
                            {fixture.negotiation.addressCommissionTotal && ` (${formatCurrency(fixture.negotiation.addressCommissionTotal)})`}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.brokerCommissionPercent && (
                      <AttributesItem>
                        <AttributesRow>
                          <AttributesLabel>Broker commission</AttributesLabel>
                          <AttributesValue>
                            {formatPercent(fixture.negotiation.brokerCommissionPercent, 2)}
                            {fixture.negotiation.brokerCommissionTotal && ` (${formatCurrency(fixture.negotiation.brokerCommissionTotal)})`}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}
                  </AttributesGroup>

                  <AttributesSeparator />

                  <AttributesGroup label="Order notes">
                    <p className="text-body-sm text-[var(--color-text-secondary)]">
                      {fixture.order?.description || "No notes"}
                    </p>
                  </AttributesGroup>
                </AttributesList>
                  );
                })()}
              </Card>
            </div>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent
            value="activity"
            className="mt-0 flex-1 overflow-y-auto bg-[var(--color-surface-base)]"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {(() => {
              return (
                <>
                  {/* Negotiation Card - Only show if fixture has negotiation */}
                  {fixture.negotiation && (() => {
                    const negotiationLogs = allActivityLogs.filter((log) => log.entityType === 'negotiation');

                    if (negotiationLogs.length === 0) {
                      return (
                        <div className="flex items-center justify-center py-12">
                          <p className="text-body-md text-[var(--color-text-tertiary)]">
                            No history of activity yet
                          </p>
                        </div>
                      );
                    }

                    return (
                      <Card className="p-6">
                        <h3 className="mb-6 text-body-lg font-semibold text-[var(--color-text-primary)]">
                          Negotiation
                        </h3>
                        <ActivityLog separatorThreshold={86400000}>
                          {negotiationLogs.map((entry, index) => {
                            const userName = entry.user?.name || 'System';
                            const userInitials = userName === "System"
                              ? "S"
                              : userName.split(' ').map((n: string) => n[0]).join('');

                            const date = new Date(entry.timestamp);
                            const formattedTimestamp = date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) + ' at ' + date.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: false
                            });

                            const hasExpandable = entry.expandable?.data && entry.expandable.data.length > 0;

                            return (
                              <ActivityLogItem
                                key={index}
                                timestamp={entry.timestamp}
                                collapsible={hasExpandable}
                                defaultOpen={false}
                              >
                                <ActivityLogHeader asCollapsibleTrigger={hasExpandable}>
                                  <Avatar size="xxs">
                                    {entry.user?.avatarUrl ? (
                                      <AvatarImage src={entry.user.avatarUrl} alt={userName} />
                                    ) : null}
                                    <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                  </Avatar>
                                  <FormattedActivityLogDescription
                                    entry={entry}
                                    userName={userName}
                                    formattedTimestamp={formattedTimestamp}
                                  />
                                </ActivityLogHeader>
                                {hasExpandable && (
                                  <ActivityLogContent>
                                    <ActivityLogExpandableContent entry={entry} />
                                  </ActivityLogContent>
                                )}
                              </ActivityLogItem>
                            );
                          })}
                        </ActivityLog>
                      </Card>
                    );
                  })()}

                  {/* Contract Card */}
                  {(() => {
                    const contractLogs = allActivityLogs.filter((log) => log.entityType === 'contract');

                    if (contractLogs.length === 0) {
                      return (
                        <div className="flex items-center justify-center py-12">
                          <p className="text-body-md text-[var(--color-text-tertiary)]">
                            No history of activity yet
                          </p>
                        </div>
                      );
                    }

                    return (
                      <Card className="p-6">
                        <h3 className="mb-6 text-body-lg font-semibold text-[var(--color-text-primary)]">
                          Contract
                        </h3>
                        <ActivityLog separatorThreshold={86400000}>
                          {contractLogs.map((entry, index) => {
                            const userName = entry.user?.name || 'System';
                            const userInitials = userName === "System"
                              ? "S"
                              : userName.split(' ').map((n: string) => n[0]).join('');

                            const date = new Date(entry.timestamp);
                            const formattedTimestamp = date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) + ' at ' + date.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: false
                            });

                            const hasExpandable = entry.expandable?.data && entry.expandable.data.length > 0;

                            return (
                              <ActivityLogItem
                                key={index}
                                timestamp={entry.timestamp}
                                collapsible={hasExpandable}
                                defaultOpen={false}
                              >
                                <ActivityLogHeader asCollapsibleTrigger={hasExpandable}>
                                  <Avatar size="xxs">
                                    {entry.user?.avatarUrl ? (
                                      <AvatarImage src={entry.user.avatarUrl} alt={userName} />
                                    ) : null}
                                    <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                  </Avatar>
                                  <FormattedActivityLogDescription
                                    entry={entry}
                                    userName={userName}
                                    formattedTimestamp={formattedTimestamp}
                                  />
                                </ActivityLogHeader>
                                {hasExpandable && (
                                  <ActivityLogContent>
                                    <ActivityLogExpandableContent entry={entry} />
                                  </ActivityLogContent>
                                )}
                              </ActivityLogItem>
                            );
                          })}
                        </ActivityLog>
                      </Card>
                    );
                  })()}
                </>
              );
              })()}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

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

function Fixtures() {
  const [selectedFixture, setSelectedFixture] = useState<FixtureData | null>(
    null,
  );
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

  // Track initial loading state to ensure skeleton shows on first load
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Query fixtures with enriched data (includes contracts, recaps, and company avatars)
  const fixtures = useQuery(
    api.fixtures.listEnriched,
    organizationId ? { organizationId } : "skip"
  );

  // Clear initial loading once fixtures data is available
  useEffect(() => {
    if (fixtures !== undefined) {
      setIsInitialLoading(false);
    }
  }, [fixtures]);

  // Detect loading state
  const isLoadingFixtures = fixtures === undefined;

  // Transform database data to fixture format
  const fixtureData = useMemo(() => {
    if (!fixtures) return [];
    return transformFixturesToTableData(fixtures as unknown as FixtureWithRelations[]);
  }, [fixtures]);

  // Helper function to highlight search terms in text
  const highlightSearchTerms = (text: string, terms: string[]) => {
    if (!terms.length || !text) return text;

    // Create regex pattern for all terms (escape special regex characters)
    const pattern = terms
      .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const testRegex = new RegExp(`^(${pattern})$`, 'i');
      if (testRegex.test(part)) {
        return (
          <mark
            key={i}
            style={{
              backgroundColor: 'var(--yellow-200, #fef08a)',
              color: 'var(--color-text-primary, inherit)',
              borderRadius: '2px',
              padding: '0 2px'
            }}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  // Default column visibility - hide all new columns
  const defaultHiddenColumns = {
    fixtureId: false,
    // Priority 1: Core Commercial Fields
    laycan: false,
    laycanStart: false,
    laycanEnd: false,
    loadPortName: false,
    loadPortCountry: false,
    loadDeliveryType: false,
    dischargePortName: false,
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

  // System bookmarks (read-only, configured via props)
  const systemBookmarks: Bookmark[] = [
    {
      id: "system-all",
      name: "All Fixtures",
      type: "system",
      isDefault: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      count: fixtureData.length,
      filtersState: {
        activeFilters: {},
        pinnedFilters: [],
        globalSearchTerms: [],
      },
      tableState: {
        sorting: [{ id: "lastUpdated", desc: true }],
        columnVisibility: defaultHiddenColumns,
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
      count: fixtureData.length,
      filtersState: {
        activeFilters: {},
        pinnedFilters: [],
        globalSearchTerms: [],
      },
      tableState: {
        sorting: [{ id: "lastUpdated", desc: true }],
        columnVisibility: defaultHiddenColumns,
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
      count: fixtureData.length,
      filtersState: {
        activeFilters: {},
        pinnedFilters: [],
        globalSearchTerms: [],
      },
      tableState: {
        sorting: [{ id: "lastUpdated", desc: true }],
        columnVisibility: defaultHiddenColumns,
        grouping: ["cpId"],
        columnOrder: [],
        columnSizing: {},
      },
    },
  ];

  // Initial user bookmarks
  const initialUserBookmarks: Bookmark[] = [];

  // Helper to convert DB bookmark (with number timestamps) to Bookmark type (with Date timestamps)
  const convertDbBookmark = (dbBookmark: typeof userBookmarksFromDb extends (infer T)[] | undefined ? T : never): Bookmark => ({
    ...dbBookmark,
    id: dbBookmark.id as string,
    createdAt: new Date(dbBookmark.createdAt),
    updatedAt: new Date(dbBookmark.updatedAt),
  });

  // Get current user
  const { user } = useUser();
  const userId = user?.appUserId;

  // Debug: Log user state on mount and when it changes
  useEffect(() => {
    console.log("👤 User state:", {
      hasUser: !!user,
      email: user?.email,
      appUserId: userId,
      userObject: user
    });
  }, [user, userId]);

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
  const syncUserMutation = useMutation(api.users.autoFixCurrentUser);

  // Local state for optimistic updates
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialUserBookmarks);
  const [activeBookmarkId, setActiveBookmarkId] =
    useState<string>("system-all");

  // Sync from database when loaded
  useEffect(() => {
    console.log("📚 Bookmarks sync effect:", {
      userId,
      userBookmarksFromDb,
      count: userBookmarksFromDb?.length
    });
    if (userBookmarksFromDb) {
      setBookmarks(userBookmarksFromDb.map(convertDbBookmark));
    }
  }, [userBookmarksFromDb, userId]);

  // Filters state
  const [activeFilters, setActiveFilters] = useState<
    Record<string, FilterValue>
  >({});
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
  const [globalSearchTerms, setGlobalSearchTerms] = useState<string[]>([]);

  // Use transition for non-urgent search updates (improves INP)
  const [isSearchPending, startSearchTransition] = useTransition();

  // Debounced search handler for better INP
  const handleGlobalSearchChange = useCallback((terms: string[]) => {
    startSearchTransition(() => {
      setGlobalSearchTerms(terms);
    });
  }, []);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    // Hide all new columns by default
    // Priority 1: Core Commercial Fields
    laycan: false,
    laycanStart: false,
    laycanEnd: false,
    loadPortName: false,
    loadPortCountry: false,
    loadDeliveryType: false,
    dischargePortName: false,
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
  });
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25, // Default page size
  });
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

  // Use transition for non-urgent pagination updates (improves INP)
  const [isPaginationPending, startPaginationTransition] = useTransition();

  // Handle pagination changes with transition for page size changes
  const handlePaginationChange = useCallback((updaterOrValue: PaginationState | ((old: PaginationState) => PaginationState)) => {
    setPagination((oldPagination) => {
      const newPagination = typeof updaterOrValue === 'function'
        ? updaterOrValue(oldPagination)
        : updaterOrValue;

      // Only use transition for page size changes (more expensive)
      const pageSizeChanged = oldPagination.pageSize !== newPagination.pageSize;

      if (pageSizeChanged) {
        // Use transition to allow React to keep UI responsive
        startPaginationTransition(() => {
          setPagination(newPagination);
        });
        return oldPagination; // Return old for now, transition will update
      }

      return newPagination;
    });
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
              {value ? formatQuantity(value) : "–"}
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
          return (
            <div className="flex items-center gap-2">
              <Avatar type="organization" size="xxs">
                <AvatarImage src={ownerAvatarUrl || undefined} alt={owner} />
                <AvatarFallback>{getCompanyInitials(owner)}</AvatarFallback>
              </Avatar>
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
              row.subRows?.map((r) => [
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
          return (
            <div className="flex items-center gap-2">
              <Avatar type="organization" size="xxs">
                <AvatarImage src={brokerAvatarUrl || undefined} alt={broker} />
                <AvatarFallback>{getCompanyInitials(broker)}</AvatarFallback>
              </Avatar>
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
              row.subRows?.map((r) => [
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
          return (
            <div className="flex items-center gap-2">
              <Avatar type="organization" size="xxs">
                <AvatarImage src={chartererAvatarUrl || undefined} alt={charterer} />
                <AvatarFallback>{getCompanyInitials(charterer)}</AvatarFallback>
              </Avatar>
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
              row.subRows?.map((r) => [
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
              {numValue ? `$${numValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
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
              {value ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
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
              {value ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
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
              {value ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
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
              {value ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
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
              {value ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
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
              {value ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
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
              {value ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
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
              {value ? formatCurrency(value) : "–"}
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
              {numValue ? `$${numValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
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
              {value ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
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
              {value ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
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
              {value ? formatPercent(value, 2) : "–"}
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
              {value ? formatCurrency(value) : "–"}
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
              {value ? formatPercent(value, 2) : "–"}
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
              {value ? formatCurrency(value) : "–"}
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


  // Extract unique values for filters
  const uniqueVessels = useMemo(() => {
    const vessels = new Set<string>();
    fixtureData.forEach((fixture) => {
      vessels.add(fixture.vessels);
    });
    return Array.from(vessels)
      .sort()
      .map((v) => ({ value: v, label: v }));
  }, [fixtureData]);

  const uniqueStatuses = useMemo(() => {
    // Show all fixture-relevant statuses from statusConfig
    // This allows filtering even when certain statuses aren't in the current data
    const fixtureRelevantStatuses = (Object.keys(statusConfig) as Array<keyof typeof statusConfig>)
      .filter((s) =>
        s.startsWith("contract-") ||
        s.startsWith("recap-manager-") ||
        s.startsWith("negotiation-") ||
        s.startsWith("order-")
      );

    // Custom sort order: Order, Negotiation, Contract, Recap Manager
    const prefixOrder = ["order-", "negotiation-", "contract-", "recap-manager-"];
    fixtureRelevantStatuses.sort((a, b) => {
      const aPrefix = prefixOrder.findIndex((p) => a.startsWith(p));
      const bPrefix = prefixOrder.findIndex((p) => b.startsWith(p));
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      // Within same prefix, sort alphabetically
      return a.localeCompare(b);
    });

    return fixtureRelevantStatuses.map((s) => ({
      value: s,
      label: getStatusLabel(s),
    }));
  }, []);

  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    fixtureData.forEach((fixture) => {
      owners.add(fixture.owner);
    });
    return Array.from(owners)
      .sort()
      .map((o) => ({ value: o, label: o }));
  }, [fixtureData]);

  const uniqueBrokers = useMemo(() => {
    const brokers = new Set<string>();
    fixtureData.forEach((fixture) => {
      brokers.add(fixture.broker);
    });
    return Array.from(brokers)
      .sort()
      .map((b) => ({ value: b, label: b }));
  }, [fixtureData]);

  const uniqueCharterers = useMemo(() => {
    const charterers = new Set<string>();
    fixtureData.forEach((fixture) => {
      charterers.add(fixture.charterer);
    });
    return Array.from(charterers)
      .sort()
      .map((c) => ({ value: c, label: c }));
  }, [fixtureData]);

  const uniqueStages = useMemo(() => {
    const stages = new Set<string>();
    fixtureData.forEach((fixture) => {
      stages.add(fixture.stage);
    });
    return Array.from(stages)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [fixtureData]);

  const uniqueContractTypes = useMemo(() => {
    const types = new Set<string>();
    fixtureData.forEach((fixture) => {
      types.add(fixture.typeOfContract);
    });
    return Array.from(types)
      .sort()
      .map((t) => ({ value: t, label: t }));
  }, [fixtureData]);

  const uniqueApprovalStatuses = useMemo(() => {
    const statuses = new Set<string>();
    fixtureData.forEach((fixture) => {
      statuses.add(fixture.approvalStatus);
    });
    return Array.from(statuses)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [fixtureData]);

  // Priority 1: Core Commercial unique values
  const uniqueLoadPorts = useMemo(() => {
    const ports = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.loadPortName) ports.add(fixture.loadPortName);
    });
    return Array.from(ports)
      .sort()
      .map((p) => ({ value: p, label: p }));
  }, [fixtureData]);

  const uniqueLoadCountries = useMemo(() => {
    const countries = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.loadPortCountry) countries.add(fixture.loadPortCountry);
    });
    return Array.from(countries)
      .sort()
      .map((c) => ({ value: c, label: c }));
  }, [fixtureData]);

  const uniqueLoadDeliveryTypes = useMemo(() => {
    const types = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.loadDeliveryType) types.add(fixture.loadDeliveryType);
    });
    return Array.from(types)
      .sort()
      .map((t) => ({ value: t, label: t }));
  }, [fixtureData]);

  const uniqueDischargePorts = useMemo(() => {
    const ports = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.dischargePortName) ports.add(fixture.dischargePortName);
    });
    return Array.from(ports)
      .sort()
      .map((p) => ({ value: p, label: p }));
  }, [fixtureData]);

  const uniqueDischargeCountries = useMemo(() => {
    const countries = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.dischargePortCountry) countries.add(fixture.dischargePortCountry);
    });
    return Array.from(countries)
      .sort()
      .map((c) => ({ value: c, label: c }));
  }, [fixtureData]);

  const uniqueDischargeRedeliveryTypes = useMemo(() => {
    const types = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.dischargeRedeliveryType) types.add(fixture.dischargeRedeliveryType);
    });
    return Array.from(types)
      .sort()
      .map((t) => ({ value: t, label: t }));
  }, [fixtureData]);

  const uniqueCargoTypes = useMemo(() => {
    const types = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.cargoTypeName) types.add(fixture.cargoTypeName);
    });
    return Array.from(types)
      .sort()
      .map((t) => ({ value: t, label: t }));
  }, [fixtureData]);

  // Keep marketIndexName (string filter)
  const uniqueMarketIndexNames = useMemo(() => {
    const names = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.marketIndexName) names.add(fixture.marketIndexName);
    });
    return Array.from(names)
      .sort()
      .map((n) => ({ value: n, label: n }));
  }, [fixtureData]);

  // Priority 5 & 6: Approval and Signature statuses
  const uniqueOwnerApprovalStatuses = useMemo(() => {
    const statuses = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.ownerApprovalStatus) statuses.add(fixture.ownerApprovalStatus);
    });
    return Array.from(statuses)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [fixtureData]);

  const uniqueChartererApprovalStatuses = useMemo(() => {
    const statuses = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.chartererApprovalStatus) statuses.add(fixture.chartererApprovalStatus);
    });
    return Array.from(statuses)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [fixtureData]);

  const uniqueOwnerSignatureStatuses = useMemo(() => {
    const statuses = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.ownerSignatureStatus) statuses.add(fixture.ownerSignatureStatus);
    });
    return Array.from(statuses)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [fixtureData]);

  const uniqueChartererSignatureStatuses = useMemo(() => {
    const statuses = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.chartererSignatureStatus) statuses.add(fixture.chartererSignatureStatus);
    });
    return Array.from(statuses)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [fixtureData]);

  // Priority 7: User Tracking
  const uniqueDealCaptureUsers = useMemo(() => {
    const users = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.dealCaptureUser) users.add(fixture.dealCaptureUser);
    });
    return Array.from(users)
      .sort()
      .map((u) => ({ value: u, label: u }));
  }, [fixtureData]);

  const uniqueOrderCreatedBy = useMemo(() => {
    const users = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.orderCreatedBy) users.add(fixture.orderCreatedBy);
    });
    return Array.from(users)
      .sort()
      .map((u) => ({ value: u, label: u }));
  }, [fixtureData]);

  const uniqueNegotiationCreatedBy = useMemo(() => {
    const users = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.negotiationCreatedBy) users.add(fixture.negotiationCreatedBy);
    });
    return Array.from(users)
      .sort()
      .map((u) => ({ value: u, label: u }));
  }, [fixtureData]);

  const uniqueOwnerApprovedBy = useMemo(() => {
    const users = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.ownerApprovedBy) users.add(fixture.ownerApprovedBy);
    });
    return Array.from(users)
      .sort()
      .map((u) => ({ value: u, label: u }));
  }, [fixtureData]);

  const uniqueChartererApprovedBy = useMemo(() => {
    const users = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.chartererApprovedBy) users.add(fixture.chartererApprovedBy);
    });
    return Array.from(users)
      .sort()
      .map((u) => ({ value: u, label: u }));
  }, [fixtureData]);

  const uniqueOwnerSignedBy = useMemo(() => {
    const users = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.ownerSignedBy) users.add(fixture.ownerSignedBy);
    });
    return Array.from(users)
      .sort()
      .map((u) => ({ value: u, label: u }));
  }, [fixtureData]);

  const uniqueChartererSignedBy = useMemo(() => {
    const users = new Set<string>();
    fixtureData.forEach((fixture) => {
      if (fixture.chartererSignedBy) users.add(fixture.chartererSignedBy);
    });
    return Array.from(users)
      .sort()
      .map((u) => ({ value: u, label: u }));
  }, [fixtureData]);

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
    [
      fixtureColumns,
      uniqueVessels,
      uniqueStatuses,
      uniqueStages,
      uniqueContractTypes,
      uniqueApprovalStatuses,
      uniqueOwners,
      uniqueBrokers,
      uniqueCharterers,
      uniqueLoadPorts,
      uniqueLoadCountries,
      uniqueLoadDeliveryTypes,
      uniqueDischargePorts,
      uniqueDischargeCountries,
      uniqueDischargeRedeliveryTypes,
      uniqueCargoTypes,
      uniqueMarketIndexNames,
      uniqueOwnerApprovalStatuses,
      uniqueChartererApprovalStatuses,
      uniqueOwnerSignatureStatuses,
      uniqueChartererSignatureStatuses,
      uniqueDealCaptureUsers,
      uniqueOrderCreatedBy,
      uniqueNegotiationCreatedBy,
      uniqueOwnerApprovedBy,
      uniqueChartererApprovedBy,
      uniqueOwnerSignedBy,
      uniqueChartererSignedBy,
    ],
  );

  // Helper function to calculate count for a bookmark
  const calculateBookmarkCount = useCallback((bookmark: Bookmark): number => {
    if (!bookmark.filtersState) return fixtureData.length;

    // Step 1: Apply bookmark and field filters (non-search filters)
    let data = fixtureData.filter((fixture) => {
      // Special filter for Negotiations bookmark: exclude fixtures without negotiation IDs
      if (bookmark.id === "system-negotiations") {
        if (!fixture.negotiationId || fixture.negotiationId === "-") {
          return false;
        }
      }

      // Apply active filters from bookmark
      if (bookmark.filtersState) {
        for (const [filterId, filterValue] of Object.entries(
          bookmark.filtersState.activeFilters,
        )) {
          // Handle multiselect filters (arrays of strings)
          if (Array.isArray(filterValue) && filterValue.length > 0 && typeof filterValue[0] === 'string') {
            const fixtureValue = String(
              fixture[filterId as keyof typeof fixture] || "",
            );
            const match = filterValue.some((val) =>
              fixtureValue.toLowerCase().includes(String(val).toLowerCase()),
            );
            if (!match) return false;
          }

          // Handle number filters (single number or range)
          if (typeof filterValue === 'number') {
            const fixtureValue = fixture[filterId as keyof typeof fixture];
            if (typeof fixtureValue === 'number' && fixtureValue !== filterValue) {
              return false;
            }
          }

          if (Array.isArray(filterValue) && filterValue.length === 2 && typeof filterValue[0] === 'number') {
            const [min, max] = filterValue as [number, number];
            const fixtureValue = fixture[filterId as keyof typeof fixture];
            if (typeof fixtureValue === 'number') {
              if (fixtureValue < min || fixtureValue > max) {
                return false;
              }
            } else {
              return false;
            }
          }

          // Handle date filters (single date or range)
          if (filterValue instanceof Date) {
            const fixtureValue = fixture[filterId as keyof typeof fixture];
            if (typeof fixtureValue === 'number') {
              const fixtureDate = new Date(fixtureValue);
              if (fixtureDate.toDateString() !== filterValue.toDateString()) {
                return false;
              }
            }
          }

          if (Array.isArray(filterValue) && filterValue.length === 2 && filterValue[0] instanceof Date) {
            const [startDate, endDate] = filterValue as [Date, Date];
            const fixtureValue = fixture[filterId as keyof typeof fixture];
            if (typeof fixtureValue === 'number') {
              const fixtureDate = new Date(fixtureValue);
              if (fixtureDate < startDate || fixtureDate > endDate) {
                return false;
              }
            } else {
              return false;
            }
          }
        }
      }

      return true;
    });

    // Step 2: Apply group-preserving global search (if grouping is enabled)
    const searchTerms = bookmark.filtersState.globalSearchTerms || [];
    const groupingColumn = bookmark.tableState?.grouping?.[0] as keyof FixtureData | undefined;

    if (searchTerms.length > 0 && groupingColumn) {
      // Group fixtures by their grouping column
      const fixturesByGroup = new Map<string, FixtureData[]>();
      data.forEach(fixture => {
        const groupKey = String(fixture[groupingColumn]);
        if (!fixturesByGroup.has(groupKey)) {
          fixturesByGroup.set(groupKey, []);
        }
        fixturesByGroup.get(groupKey)!.push(fixture);
      });

      // Find groups where ALL search terms exist somewhere in the group
      const matchingGroupKeys = new Set<string>();
      fixturesByGroup.forEach((fixtures, groupKey) => {
        // Combine searchable text from ALL fixtures in this group
        const groupSearchableText = fixtures
          .map(fixture => [
            fixture.fixtureId,
            fixture.orderId,
            fixture.cpId,
            fixture.vessels,
            fixture.owner,
            fixture.broker,
            fixture.charterer,
            fixture.loadPortName,
            fixture.dischargePortName,
            fixture.vesselImo,
            fixture.cargoTypeName,
            fixture.dealCaptureUser,
          ].filter(Boolean).join(' '))
          .join(' ')
          .toLowerCase();

        // Check if ALL search terms exist in the group's combined text (AND logic)
        const groupMatches = searchTerms.every(term =>
          groupSearchableText.includes(term.toLowerCase())
        );

        if (groupMatches) {
          matchingGroupKeys.add(groupKey);
        }
      });

      // Return count of matching groups
      return matchingGroupKeys.size;
    }

    // Step 3: Apply fixture-level search (if no grouping but search terms exist)
    if (searchTerms.length > 0) {
      data = data.filter((fixture) => {
        const searchableText = [
          fixture.fixtureId,
          fixture.orderId,
          fixture.cpId,
          fixture.vessels,
          fixture.personInCharge,
          fixture.owner,
          fixture.broker,
          fixture.charterer,
          fixture.loadPortName,
          fixture.dischargePortName,
          fixture.vesselImo,
          fixture.cargoTypeName,
          fixture.dealCaptureUser,
        ]
          .join(" ")
          .toLowerCase();
        return searchTerms.every((term) =>
          searchableText.includes(term.toLowerCase())
        );
      });
    }

    // Step 4: Return count (groups if grouping enabled, fixtures otherwise)
    if (groupingColumn) {
      const uniqueGroups = new Set(
        data.map(fixture => fixture[groupingColumn])
      );
      return uniqueGroups.size;
    }

    return data.length;
  }, [fixtureData]);

  // Dynamically calculate counts for all bookmarks
  const systemBookmarksWithCounts = useMemo(() => {
    return systemBookmarks.map((bookmark) => ({
      ...bookmark,
      count: calculateBookmarkCount(bookmark),
      isLoadingCount: isLoadingFixtures,
    }));
  }, [calculateBookmarkCount, systemBookmarks, isLoadingFixtures]);

  const bookmarksWithCounts = useMemo(() => {
    return bookmarks.map((bookmark) => ({
      ...bookmark,
      count: calculateBookmarkCount(bookmark),
      isLoadingCount: isLoadingFixtures,
    }));
  }, [bookmarks, calculateBookmarkCount, isLoadingFixtures]);

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

  // Calculate bookmark data (data filtered by bookmark's saved filters only)
  const bookmarkData = useMemo(() => {
    if (!activeBookmark?.filtersState) {
      // If no saved filters, return data filtered by bookmark type only
      const data = fixtureData.filter((fixture) => {
        // Special filter for Negotiations bookmark
        if (activeBookmarkId === "system-negotiations") {
          if (!fixture.negotiationId || fixture.negotiationId === "-") {
            return false;
          }
        }
        // Special filter for Contracts bookmark
        if (activeBookmarkId === "system-contracts") {
          if (!fixture.cpId) {
            return false;
          }
        }
        return true;
      });
      return data;
    }

    // Apply bookmark's saved filters
    const savedFilters = activeBookmark.filtersState.activeFilters;
    const data = fixtureData.filter((fixture) => {
      // Special filter for Negotiations bookmark
      if (activeBookmarkId === "system-negotiations") {
        if (!fixture.negotiationId || fixture.negotiationId === "-") {
          return false;
        }
      }
      // Special filter for Contracts bookmark
      if (activeBookmarkId === "system-contracts") {
        if (!fixture.cpId) {
          return false;
        }
      }

      // Apply saved filters from bookmark
      for (const [filterId, filterValue] of Object.entries(savedFilters)) {
        // Handle multiselect filters (arrays of strings)
        if (Array.isArray(filterValue) && filterValue.length > 0 && typeof filterValue[0] === 'string') {
          const fixtureValue = String(
            fixture[filterId as keyof typeof fixture] || "",
          );
          const match = filterValue.some((val) =>
            fixtureValue.toLowerCase().includes(String(val).toLowerCase()),
          );
          if (!match) return false;
        }

        // Handle number filters (single number or range)
        if (typeof filterValue === 'number') {
          const fixtureValue = fixture[filterId as keyof typeof fixture];
          if (typeof fixtureValue === 'number' && fixtureValue !== filterValue) {
            return false;
          }
        }

        if (Array.isArray(filterValue) && filterValue.length === 2 && typeof filterValue[0] === 'number') {
          const [min, max] = filterValue as [number, number];
          const fixtureValue = fixture[filterId as keyof typeof fixture];
          if (typeof fixtureValue === 'number') {
            if (fixtureValue < min || fixtureValue > max) {
              return false;
            }
          } else {
            return false;
          }
        }

        // Handle date filters (single date or range)
        if (filterValue instanceof Date) {
          const fixtureValue = fixture[filterId as keyof typeof fixture];
          if (typeof fixtureValue === 'number') {
            const fixtureDate = new Date(fixtureValue);
            if (fixtureDate.toDateString() !== filterValue.toDateString()) {
              return false;
            }
          }
        }

        if (Array.isArray(filterValue) && filterValue.length === 2 && filterValue[0] instanceof Date) {
          const [startDate, endDate] = filterValue as [Date, Date];
          const fixtureValue = fixture[filterId as keyof typeof fixture];
          if (typeof fixtureValue === 'number') {
            const fixtureDate = new Date(fixtureValue);
            if (fixtureDate < startDate || fixtureDate > endDate) {
              return false;
            }
          } else {
            return false;
          }
        }
      }

      return true;
    });

    return data;
  }, [fixtureData, activeBookmark, activeBookmarkId]);

  // Load bookmark state
  const loadBookmark = (bookmark: Bookmark, showLoading = true) => {
    // Show loading skeleton during bookmark transition (skip on initial mount)
    if (showLoading) {
      setIsBookmarkLoading(true);
      setTimeout(() => {
        setIsBookmarkLoading(false);
      }, 300);
    }

    setActiveBookmarkId(bookmark.id);

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
    }
  }, [globalSearchTerms]);

  // Helper function to check if a fixture matches global search terms
  const matchesGlobalSearch = useCallback((fixture: FixtureData): boolean => {
    if (globalSearchTerms.length === 0) return true;

    // Searchable fields - includes IDs, names, ports, cargo, and user tracking
    const searchableText = [
      // Core identifiers
      fixture.fixtureId,
      fixture.orderId,
      fixture.cpId,
      fixture.negotiationId,
      // Party names
      fixture.vessels,
      fixture.owner,
      fixture.broker,
      fixture.charterer,
      // Ports and locations
      fixture.loadPortName,
      fixture.dischargePortName,
      fixture.loadPortCountry,
      fixture.dischargePortCountry,
      // Cargo and vessel details
      fixture.cargoTypeName,
      fixture.vesselImo,
      // User tracking
      fixture.dealCaptureUser,
      fixture.orderCreatedBy,
      // Market and contract info
      fixture.marketIndexName,
      fixture.parentCpId,
      fixture.contractType,
      // Delivery types
      fixture.loadDeliveryType,
      fixture.dischargeRedeliveryType,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Check if ALL search terms are present (AND logic)
    return globalSearchTerms.every(term =>
      searchableText.includes(term.toLowerCase())
    );
  }, [globalSearchTerms]);

  // Data filtering with group-preserving search logic
  const filteredData = useMemo(() => {
    // Step 1: Apply bookmark and field filters (non-search filters)
    let data = fixtureData.filter((fixture) => {
      // Special filter for Negotiations bookmark
      if (activeBookmarkId === "system-negotiations") {
        if (!fixture.negotiationId || fixture.negotiationId === "-") {
          return false;
        }
      }

      // Special filter for Contracts bookmark
      if (activeBookmarkId === "system-contracts") {
        if (!fixture.cpId) {
          return false;
        }
      }

      // Apply active filters (from Filters sidebar)
      for (const [filterId, filterValue] of Object.entries(activeFilters)) {
        // Handle multiselect filters (arrays of strings)
        if (Array.isArray(filterValue) && filterValue.length > 0 && typeof filterValue[0] === 'string') {
          const fixtureValue = String(
            fixture[filterId as keyof typeof fixture] || "",
          );
          const match = filterValue.some((val) =>
            fixtureValue.toLowerCase().includes(String(val).toLowerCase()),
          );
          if (!match) return false;
        }

        // Handle number filters (single number or range)
        if (typeof filterValue === 'number') {
          const fixtureValue = fixture[filterId as keyof typeof fixture];
          if (typeof fixtureValue === 'number' && fixtureValue !== filterValue) {
            return false;
          }
        }

        if (Array.isArray(filterValue) && filterValue.length === 2 && typeof filterValue[0] === 'number') {
          const [min, max] = filterValue as [number, number];
          const fixtureValue = fixture[filterId as keyof typeof fixture];
          if (typeof fixtureValue === 'number') {
            if (fixtureValue < min || fixtureValue > max) {
              return false;
            }
          } else {
            return false;
          }
        }

        // Handle date filters (single date or range)
        if (filterValue instanceof Date) {
          const fixtureValue = fixture[filterId as keyof typeof fixture];
          if (typeof fixtureValue === 'number') {
            const fixtureDate = new Date(fixtureValue);
            if (fixtureDate.toDateString() !== filterValue.toDateString()) {
              return false;
            }
          }
        }

        if (Array.isArray(filterValue) && filterValue.length === 2 && filterValue[0] instanceof Date) {
          const [startDate, endDate] = filterValue as [Date, Date];
          const fixtureValue = fixture[filterId as keyof typeof fixture];
          if (typeof fixtureValue === 'number') {
            const fixtureDate = new Date(fixtureValue);
            if (fixtureDate < startDate || fixtureDate > endDate) {
              return false;
            }
          } else {
            return false;
          }
        }
      }

      return true;
    });

    // Step 2: Apply group-preserving global search
    if (globalSearchTerms.length > 0) {
      // Get the active grouping column (fixtureId, negotiationId, or cpId)
      const groupingColumn = grouping[0] as keyof FixtureData | undefined;

      if (groupingColumn) {
        // Group fixtures by their grouping column
        const fixturesByGroup = new Map<string, FixtureData[]>();
        data.forEach(fixture => {
          const groupKey = String(fixture[groupingColumn]);
          if (!fixturesByGroup.has(groupKey)) {
            fixturesByGroup.set(groupKey, []);
          }
          fixturesByGroup.get(groupKey)!.push(fixture);
        });

        // Find groups where ALL search terms exist somewhere in the group
        const matchingGroupKeys = new Set<string>();
        fixturesByGroup.forEach((fixtures, groupKey) => {
          // Combine searchable text from ALL fixtures in this group
          const groupSearchableText = fixtures
            .map(fixture => [
              fixture.fixtureId,
              fixture.orderId,
              fixture.cpId,
              fixture.vessels,
              fixture.owner,
              fixture.broker,
              fixture.charterer,
            ].filter(Boolean).join(' '))
            .join(' ')
            .toLowerCase();

          // Check if ALL search terms exist in the group's combined text (AND logic)
          const groupMatches = globalSearchTerms.every(term =>
            groupSearchableText.includes(term.toLowerCase())
          );

          if (groupMatches) {
            matchingGroupKeys.add(groupKey);
          }
        });

        // Include ALL fixtures that belong to matching groups
        data = data.filter(fixture =>
          matchingGroupKeys.has(String(fixture[groupingColumn]))
        );
      } else {
        // No grouping active, filter normally
        data = data.filter(matchesGlobalSearch);
      }
    }

    return data;
  }, [fixtureData, activeFilters, activeBookmarkId, globalSearchTerms, grouping, matchesGlobalSearch]);

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
    console.log("💾 handleSave called:", { action, name, userId, hasUser: !!user });

    if (!userId) {
      console.error("❌ User not authenticated - userId:", userId);
      alert("Cannot save bookmark: Your account needs to be synced. Please click the 'Sync Account' button at the top of the page.");
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
      count: filteredData.length,
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
          count: filteredData.length,
          filtersState: bookmarkData.filtersState,
          tableState: bookmarkData.tableState,
        };

        setBookmarks([...bookmarks, optimisticBookmark]);
        setActiveBookmarkId(tempId);

        // Create in database
        console.log("🔄 Creating bookmark in database...", bookmarkData);
        const newBookmark = await createBookmarkMutation({
          userId,
          name: name || "New Bookmark",
          ...bookmarkData,
        });
        console.log("✅ Bookmark created successfully:", newBookmark);

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
      console.error("❌ Failed to save bookmark:", error);
      console.error("Error details:", error instanceof Error ? error.message : error);
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
  };

  return (
    <>
      <div className="p-6 flex flex-col gap-[var(--space-lg)] max-w-full min-w-0">
        {/* Sync Account Banner (only show if user is authenticated but no userId) */}
        {user && !userId && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Account Sync Required</p>
              <p className="text-sm text-yellow-700 mt-1">
                Your account needs to be synced to save bookmarks. Click the button to sync now.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                try {
                  const result = await syncUserMutation({});
                  console.log("✅ Sync result:", result);
                  if (result.success) {
                    alert(`Account synced successfully! ${result.message}\n\nThe page will reload in 2 seconds...`);
                    // Use a hard reload with cache clearing
                    setTimeout(() => {
                      window.location.reload();
                    }, 2000);
                  } else {
                    alert(`Sync failed: ${result.message}`);
                  }
                } catch (error) {
                  console.error("❌ Sync error:", error);
                  alert("Failed to sync account. Please try again or contact support.");
                }
              }}
            >
              Sync Account
            </Button>
          </div>
        )}

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
                    "accessorKey" in col && typeof col.accessorKey === "string",
                )
                .map((col) => ({
                  id: col.accessorKey,
                  label: ((col.meta as ColumnMetaWithLabel | undefined)?.label || col.header) as string,
                }))}
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
            // Controlled state
            sorting={sorting}
            onSortingChange={setSorting}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            grouping={grouping}
            onGroupingChange={setGrouping}
            initialState={{
              expanded,
            }}
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
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            onRowClick={handleRowClick}
            isRowClickable={(row) => !row.getIsGrouped() || row.subRows?.length === 1}
            footerLabel={
              (() => {
                // When grouping is active, count groups; otherwise count fixtures
                const displayCount = grouping.length > 0
                  ? new Set(filteredData.map(fixture => fixture[grouping[0] as keyof FixtureData])).size
                  : filteredData.length;

                return (
                  <span className="text-body-sm text-[var(--color-text-secondary)]">
                    Showing <strong className="text-[var(--color-text-primary)]">{displayCount}</strong> of{" "}
                    <strong className="text-[var(--color-text-primary)]">{fixtureData.length}</strong> items
                  </span>
                );
              })()
            }
          />
        </div>

        {/* Sidebar */}
        {selectedFixture && (
          <FixtureSidebar
            fixture={selectedFixture}
            onClose={() => setSelectedFixture(null)}
          />
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        data={fixtureData}
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
