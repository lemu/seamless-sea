/**
 * Type definitions for fixtures and related entities
 * Used across the Fixtures page and related components
 */
import type { Id } from "../../convex/_generated/dataModel";

// ============================================================================
// Core Entity Types (from Convex schema)
// ============================================================================

/**
 * Vessel information
 */
export interface VesselData {
  _id: Id<"vessels">;
  name: string;
  imoNumber?: string;
  callsign?: string;
  mmsi?: string;
  dwt?: number;
  grt?: number;
  draft?: number;
  loa?: number;
  beam?: number;
  maxHeight?: number;
  flag?: string;
  vesselClass?: string;
  speedKnots?: number;
  consumptionPerDay?: number;
  builtDate?: string;
  currentOwnerId?: Id<"companies">;
  avatarUrl?: string | null;
}

/**
 * Port information
 */
export interface PortData {
  _id: Id<"ports">;
  name: string;
  unlocode?: string;
  country: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

/**
 * Cargo type information
 */
export interface CargoTypeData {
  _id: Id<"cargo_types">;
  name: string;
  category:
    | "crude-oil"
    | "dry-bulk"
    | "container"
    | "lng"
    | "grain"
    | "iron-ore"
    | "coal"
    | "other";
  unitType: "mt" | "cbm" | "teu";
}

/**
 * Company information (owner, charterer, broker)
 */
export interface CompanyData {
  _id: Id<"companies">;
  name: string;
  displayName?: string;
  companyType: "shipping-company" | "broker" | "operator";
  roles: Array<"owner" | "charterer" | "broker">;
  avatar?: Id<"_storage">;
  avatarUrl?: string | null;
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
  isVerified: boolean;
  isActive: boolean;
}

/**
 * User information for tracking
 */
export interface UserData {
  _id: Id<"users">;
  name: string;
  email: string;
  avatar?: Id<"_storage">;
  avatarUrl?: string | null;
}

/**
 * Field change user data (can be null from API)
 */
export interface FieldChangeUserData {
  _id: Id<"users">;
  name: string;
  email: string;
  avatar?: Id<"_storage">;
  avatarUrl?: string | null;
}

// ============================================================================
// Negotiation Types
// ============================================================================

export type NegotiationStatus =
  | "indicative-offer"
  | "indicative-bid"
  | "firm-offer"
  | "firm-bid"
  | "firm"
  | "on-subs"
  | "fixed"
  | "firm-offer-expired"
  | "withdrawn"
  | "firm-amendment"
  | "subs-expired"
  | "subs-failed"
  | "on-subs-amendment";

/**
 * Negotiation details (from negotiations table)
 */
export interface NegotiationData {
  _id: Id<"negotiations">;
  negotiationNumber?: string;
  orderId: Id<"orders">;
  counterpartyId: Id<"companies">;
  brokerId?: Id<"companies">;
  vesselId?: Id<"vessels">;
  status: NegotiationStatus;
  bidPrice?: string;
  offerPrice?: string;
  freightRate?: string;
  demurrageRate?: string;
  tce?: string;
  validity?: string;
  loadDeliveryType?: string;
  dischargeRedeliveryType?: string;
  laycanStart?: number;
  laycanEnd?: number;
  quantity?: number;

  // Analytics fields
  highestFreightRateIndication?: number;
  lowestFreightRateIndication?: number;
  firstFreightRateIndication?: number;
  highestFreightRateLastDay?: number;
  lowestFreightRateLastDay?: number;
  firstFreightRateLastDay?: number;
  highestDemurrageIndication?: number;
  lowestDemurrageIndication?: number;
  firstDemurrageIndication?: number;
  highestDemurrageLastDay?: number;
  lowestDemurrageLastDay?: number;
  firstDemurrageLastDay?: number;
  marketIndex?: number;
  marketIndexName?: string;
  addressCommissionPercent?: number;
  addressCommissionTotal?: number;
  brokerCommissionPercent?: number;
  brokerCommissionTotal?: number;
  grossFreight?: number;

  // Enriched relations (populated by queries)
  counterparty?: CompanyData;
  broker?: CompanyData;
  vessel?: VesselData;
  personInCharge?: UserData;
  dealCaptureUser?: UserData;
  createdBy?: UserData;

  createdAt: number;
  updatedAt: number;
  _creationTime: number;
}

// ============================================================================
// Contract Types
// ============================================================================

export type ContractType = "voyage-charter" | "time-charter" | "bareboat" | "coa";
export type ContractStatus = "draft" | "working-copy" | "final" | "rejected";

/**
 * Contract details (from contracts table)
 */
export interface ContractData {
  _id: Id<"contracts">;
  contractNumber: string;
  fixtureId?: Id<"fixtures">;
  negotiationId?: Id<"negotiations">;
  orderId?: Id<"orders">;
  parentContractId?: Id<"contracts">;
  contractType: ContractType;
  ownerId: Id<"companies">;
  chartererId: Id<"companies">;
  brokerId?: Id<"companies">;
  vesselId?: Id<"vessels">;
  loadPortId?: Id<"ports">;
  dischargePortId?: Id<"ports">;
  loadDeliveryType?: string;
  dischargeRedeliveryType?: string;
  laycanStart?: number;
  laycanEnd?: number;
  freightRate?: string;
  freightRateType?: "worldscale" | "lumpsum" | "per-tonne";
  demurrageRate?: string;
  despatchRate?: string;
  addressCommission?: string;
  brokerCommission?: string;
  cargoTypeId?: Id<"cargo_types">;
  quantity?: number;
  quantityUnit?: string;
  fullCpChainStorageId?: Id<"_storage">;
  itineraryStorageId?: Id<"_storage">;
  status: ContractStatus;
  approvalStatus?: string;
  signedAt?: number;
  workingCopyDate?: number;
  finalDate?: number;
  fullySignedDate?: number;
  cpUrl?: string;

  // Enriched relations (populated by queries)
  owner?: CompanyData;
  charterer?: CompanyData;
  broker?: CompanyData;
  vessel?: VesselData;
  loadPort?: PortData;
  dischargePort?: PortData;
  cargoType?: CargoTypeData;
  negotiation?: NegotiationData;
  order?: OrderData;
  parentContract?: ContractData;
  personInCharge?: UserData;

  createdAt: number;
  updatedAt: number;
  _creationTime: number;
}

// ============================================================================
// Recap Manager Types
// ============================================================================

export type RecapStatus = "draft" | "on-subs" | "fully-fixed" | "canceled" | "failed";

/**
 * Recap manager details (from recap_managers table)
 */
export interface RecapManagerData {
  _id: Id<"recap_managers">;
  recapNumber: string;
  fixtureId?: Id<"fixtures">;
  negotiationId?: Id<"negotiations">;
  orderId?: Id<"orders">;
  parentRecapId?: Id<"recap_managers">;
  contractType: ContractType;
  ownerId: Id<"companies">;
  chartererId: Id<"companies">;
  brokerId?: Id<"companies">;
  vesselId?: Id<"vessels">;
  loadPortId?: Id<"ports">;
  dischargePortId?: Id<"ports">;
  laycanStart?: number;
  laycanEnd?: number;
  freightRate?: string;
  freightRateType?: "worldscale" | "lumpsum" | "per-tonne";
  demurrageRate?: string;
  despatchRate?: string;
  quantity?: number;
  quantityUnit?: string;
  status: RecapStatus;
  approvalStatus?: string;
  fixedAt?: number;

  // Enriched relations (populated by queries)
  owner?: CompanyData;
  charterer?: CompanyData;
  broker?: CompanyData;
  vessel?: VesselData;
  loadPort?: PortData;
  dischargePort?: PortData;
  cargoType?: CargoTypeData;
  negotiation?: NegotiationData;
  order?: OrderData;
  personInCharge?: UserData;

  createdAt: number;
  updatedAt: number;
  _creationTime: number;
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderType = "buy" | "sell" | "charter";
export type OrderStage = "offer" | "active" | "negotiating" | "pending";
export type OrderStatus = "draft" | "distributed" | "withdrawn";

/**
 * Order details (from orders table)
 */
export interface OrderData {
  _id: Id<"orders">;
  orderNumber: string;
  title?: string;
  description?: string;
  type: OrderType;
  stage: OrderStage;
  status: OrderStatus;
  cargoTypeId?: Id<"cargo_types">;
  quantity?: number;
  quantityUnit?: string;
  laycanStart?: number;
  laycanEnd?: number;
  loadPortId?: Id<"ports">;
  dischargePortId?: Id<"ports">;
  freightRate?: string;
  freightRateType?: "worldscale" | "lumpsum" | "per-tonne";
  demurrageRate?: string;
  despatchRate?: string;
  tce?: string;
  validityHours?: number;
  organizationId: Id<"organizations">;
  chartererId?: Id<"companies">;
  ownerId?: Id<"companies">;
  brokerId?: Id<"companies">;
  approvalStatus?: string;

  // Enriched relations (populated by queries)
  createdBy?: UserData;

  createdAt: number;
  updatedAt: number;
  distributedAt?: number;
  withdrawnAt?: number;
  _creationTime: number;
}

// ============================================================================
// Approval and Signature Types
// ============================================================================

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type SignatureStatus = "pending" | "signed" | "rejected";
export type PartyRole = "owner" | "charterer" | "broker";

/**
 * Contract approval record
 */
export interface ApprovalData {
  _id: Id<"contract_approvals">;
  contractId: Id<"contracts">;
  partyRole: string;
  companyId: Id<"companies">;
  status: ApprovalStatus;
  approvedBy?: UserData;
  approvedAt?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Contract signature record
 */
export interface SignatureData {
  _id: Id<"contract_signatures">;
  contractId: Id<"contracts">;
  partyRole: string;
  companyId: Id<"companies">;
  status: SignatureStatus;
  signedBy?: UserData;
  signedAt?: number;
  signingMethod?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Summary of approvals for a contract
 */
export interface ApprovalSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

/**
 * Summary of signatures for a contract
 */
export interface SignatureSummary {
  total: number;
  signed: number;
  pending: number;
  rejected: number;
}

// ============================================================================
// Enriched Fixture Item (used by transformFixturesToTableData)
// ============================================================================

/**
 * Contract or Recap Manager with enriched relations
 * Used in the transformation function
 * Note: source is optional because raw API data doesn't include it
 */
export interface EnrichedContractItem {
  _id?: string;
  _creationTime?: number;
  source?: "contract" | "recap";
  contractNumber?: string;
  recapNumber?: string;
  contractType?: ContractType;
  status?: string;
  approvalStatus?: string;
  negotiationId?: string;
  orderId?: string;
  parentContractId?: string;
  laycanStart?: number;
  laycanEnd?: number;
  freightRate?: string;
  demurrageRate?: string;
  quantity?: number;
  quantityUnit?: string;
  workingCopyDate?: number;
  finalDate?: number;
  fullySignedDate?: number;
  updatedAt?: number;
  // Enriched relations
  owner?: CompanyData;
  charterer?: CompanyData;
  broker?: CompanyData;
  vessel?: VesselData;
  loadPort?: PortData;
  dischargePort?: PortData;
  cargoType?: CargoTypeData;
  negotiation?: NegotiationData;
  order?: OrderData;
  parentContract?: ContractData;
  personInCharge?: UserData;
  approvals?: ApprovalData[];
  approvalSummary?: ApprovalSummary;
  signatures?: SignatureData[];
  signatureSummary?: SignatureSummary;
}

/**
 * Fixture with all nested relations (from API response)
 * Using looser types to accommodate API return values
 */
export interface FixtureWithRelations {
  _id: Id<"fixtures">;
  fixtureNumber: string;
  orderId?: Id<"orders">;
  title?: string;
  organizationId: Id<"organizations">;
  status: string;
  createdAt: number;
  updatedAt: number;
  _creationTime: number;

  // Nested relations (can be null from API)
  order?: OrderData | null;
  contracts: EnrichedContractItem[];
  recapManagers: EnrichedContractItem[];
  negotiations: NegotiationData[];
}

// ============================================================================
// Field Changes (Audit Trail)
// ============================================================================

export type FieldChangeEntityType =
  | "order"
  | "negotiation"
  | "contract"
  | "recap_manager"
  | "contract_addenda"
  | "recap_addenda";

/**
 * Field change record for audit trail
 * Note: user can be null from the API
 */
export interface FieldChangeData {
  _id: Id<"field_changes">;
  _creationTime: number;
  entityType: FieldChangeEntityType;
  entityId: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changeReason?: string;
  user?: FieldChangeUserData | null;
  userId: Id<"users">;
  timestamp: number;
}

// ============================================================================
// Fixture Table Data (used by DataTable in Fixtures page)
// ============================================================================

/**
 * Flattened fixture data structure for the DataTable.
 * Each row represents a single contract/recap within a fixture.
 */
export interface FixtureData {
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
