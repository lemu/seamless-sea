/**
 * Status type definitions for all entities in the system
 * Used by FixtureStatus component and related functionality
 */

// ============================================================================
// Entity Status Types
// ============================================================================

/**
 * Contract status values (dry market)
 */
export type ContractStatusValue =
  | "draft"
  | "working-copy"
  | "final"
  | "rejected";

/**
 * Recap Manager status values (wet market)
 */
export type RecapStatusValue =
  | "draft"
  | "on-subs"
  | "fully-fixed"
  | "canceled"
  | "failed";

/**
 * Negotiation status values
 */
export type NegotiationStatusValue =
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
 * Order status values
 */
export type OrderStatusValue = "draft" | "distributed" | "withdrawn";

/**
 * Fixture status values
 */
export type FixtureStatusValue =
  | "draft"
  | "working-copy"
  | "final"
  | "on-subs"
  | "fully-fixed"
  | "canceled";

/**
 * Approval status values
 */
export type ApprovalStatusValue = "pending" | "approved" | "rejected";

/**
 * Signature status values
 */
export type SignatureStatusValue = "pending" | "signed" | "rejected";

// ============================================================================
// Composite Status (with entity prefix)
// ============================================================================

/**
 * Contract status with prefix (e.g., "contract-working-copy")
 */
export type PrefixedContractStatus =
  | "contract-draft"
  | "contract-working-copy"
  | "contract-final"
  | "contract-rejected";

/**
 * Recap Manager status with prefix (e.g., "recap-manager-on-subs")
 */
export type PrefixedRecapStatus =
  | "recap-manager-draft"
  | "recap-manager-on-subs"
  | "recap-manager-fully-fixed"
  | "recap-manager-canceled"
  | "recap-manager-failed";

/**
 * Negotiation status with prefix (e.g., "negotiation-firm-offer")
 */
export type PrefixedNegotiationStatus =
  | "negotiation-indicative-offer"
  | "negotiation-indicative-bid"
  | "negotiation-firm-offer"
  | "negotiation-firm-bid"
  | "negotiation-firm"
  | "negotiation-on-subs"
  | "negotiation-fixed"
  | "negotiation-firm-offer-expired"
  | "negotiation-withdrawn"
  | "negotiation-firm-amendment"
  | "negotiation-subs-expired"
  | "negotiation-subs-failed"
  | "negotiation-on-subs-amendment";

/**
 * Order status with prefix (e.g., "order-draft")
 */
export type PrefixedOrderStatus =
  | "order-draft"
  | "order-distributed"
  | "order-withdrawn";

// ============================================================================
// Union Types for FixtureStatus Component
// ============================================================================

/**
 * All possible status values (without prefix) - for base status components
 */
export type BaseStatusValue =
  | ContractStatusValue
  | RecapStatusValue
  | NegotiationStatusValue
  | OrderStatusValue
  | FixtureStatusValue
  | ApprovalStatusValue
  | SignatureStatusValue;

/**
 * All possible prefixed status values - for FixtureStatus component
 */
export type PrefixedStatusValue =
  | PrefixedContractStatus
  | PrefixedRecapStatus
  | PrefixedNegotiationStatus
  | PrefixedOrderStatus;

/**
 * Any status value that can be passed to FixtureStatus component
 * This is the type to use when casting status values
 */
export type FixtureStatusComponentValue = BaseStatusValue | PrefixedStatusValue;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a status is a contract status
 */
export function isContractStatus(status: string): status is ContractStatusValue {
  return ["draft", "working-copy", "final", "rejected"].includes(status);
}

/**
 * Check if a status is a recap status
 */
export function isRecapStatus(status: string): status is RecapStatusValue {
  return ["draft", "on-subs", "fully-fixed", "canceled", "failed"].includes(status);
}

/**
 * Check if a status is a negotiation status
 */
export function isNegotiationStatus(status: string): status is NegotiationStatusValue {
  return [
    "indicative-offer",
    "indicative-bid",
    "firm-offer",
    "firm-bid",
    "firm",
    "on-subs",
    "fixed",
    "firm-offer-expired",
    "withdrawn",
    "firm-amendment",
    "subs-expired",
    "subs-failed",
    "on-subs-amendment",
  ].includes(status);
}

/**
 * Check if a status is an approval status
 */
export function isApprovalStatus(status: string): status is ApprovalStatusValue {
  return ["pending", "approved", "rejected"].includes(status);
}

/**
 * Check if a status is a signature status
 */
export function isSignatureStatus(status: string): status is SignatureStatusValue {
  return ["pending", "signed", "rejected"].includes(status);
}

/**
 * Check if a status is prefixed with an entity type
 */
export function isPrefixedStatus(status: string): status is PrefixedStatusValue {
  return (
    status.startsWith("contract-") ||
    status.startsWith("recap-manager-") ||
    status.startsWith("negotiation-") ||
    status.startsWith("order-")
  );
}
