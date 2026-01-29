import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { logActivity, trackFieldChange } from "./audit";

// Helper to get random item from array
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper to generate laycan dates (start and end timestamps)
function generateLaycan(): { start: number; end: number } {
  const now = Date.now();
  const daysAhead = Math.floor(Math.random() * 90) + 30; // 30-120 days ahead
  const startDate = now + daysAhead * 24 * 60 * 60 * 1000;
  const duration = Math.floor(Math.random() * 5) + 3; // 3-7 days duration
  const endDate = startDate + duration * 24 * 60 * 60 * 1000;

  return { start: startDate, end: endDate };
}

// Helper to create approval/signature records for a contract
async function createContractApprovalsAndSignatures(
  ctx: MutationCtx,
  contractId: Id<"contracts">,
  ownerId: Id<"companies">,
  chartererId: Id<"companies">,
  brokerId: Id<"companies"> | undefined,
  contractStatus: string,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  baseTime: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  // Determine approval/signature status based on contract status
  let ownerApprovalStatus: "pending" | "approved" | "rejected" = "pending";
  let chartererApprovalStatus: "pending" | "approved" | "rejected" = "pending";
  let ownerSignatureStatus: "pending" | "signed" | "rejected" = "pending";
  let chartererSignatureStatus: "pending" | "signed" | "rejected" = "pending";

  if (contractStatus === "working-copy" || contractStatus === "final") {
    // Both parties approved
    ownerApprovalStatus = "approved";
    chartererApprovalStatus = "approved";
  }

  if (contractStatus === "final") {
    // Both parties signed
    ownerSignatureStatus = "signed";
    chartererSignatureStatus = "signed";
  } else if (contractStatus === "working-copy") {
    // Random: one party signed, other pending OR both pending
    if (Math.random() < 0.5) {
      ownerSignatureStatus = "signed";
    }
  }

  // Create owner approval
  await ctx.db.insert("contract_approvals", {
    contractId,
    partyRole: "owner",
    companyId: ownerId,
    status: ownerApprovalStatus,
    approvedBy: ownerApprovalStatus === "approved" ? counterpartyUserId : undefined,
    approvedAt: ownerApprovalStatus === "approved" ? baseTime - 2 * DAY : undefined,
    createdAt: baseTime - 3 * DAY,
    updatedAt: baseTime - (ownerApprovalStatus === "approved" ? 2 : 3) * DAY,
  });

  // Create charterer approval
  await ctx.db.insert("contract_approvals", {
    contractId,
    partyRole: "charterer",
    companyId: chartererId,
    status: chartererApprovalStatus,
    approvedBy: chartererApprovalStatus === "approved" ? userId : undefined,
    approvedAt: chartererApprovalStatus === "approved" ? baseTime - 2 * DAY + 4 * HOUR : undefined,
    createdAt: baseTime - 3 * DAY,
    updatedAt: baseTime - (chartererApprovalStatus === "approved" ? 2 : 3) * DAY,
  });

  // Create owner signature
  await ctx.db.insert("contract_signatures", {
    contractId,
    partyRole: "owner",
    companyId: ownerId,
    status: ownerSignatureStatus,
    signedBy: ownerSignatureStatus === "signed" ? counterpartyUserId : undefined,
    signedAt: ownerSignatureStatus === "signed" ? baseTime - 1 * DAY : undefined,
    signingMethod: ownerSignatureStatus === "signed" ? randomItem(["DocuSign", "Manual", "Wet Ink"]) : undefined,
    createdAt: baseTime - 2 * DAY,
    updatedAt: baseTime - (ownerSignatureStatus === "signed" ? 1 : 2) * DAY,
  });

  // Create charterer signature
  await ctx.db.insert("contract_signatures", {
    contractId,
    partyRole: "charterer",
    companyId: chartererId,
    status: chartererSignatureStatus,
    signedBy: chartererSignatureStatus === "signed" ? userId : undefined,
    signedAt: chartererSignatureStatus === "signed" ? baseTime - 1 * DAY + 3 * HOUR : undefined,
    signingMethod: chartererSignatureStatus === "signed" ? randomItem(["DocuSign", "Manual", "Wet Ink"]) : undefined,
    createdAt: baseTime - 2 * DAY,
    updatedAt: baseTime - (chartererSignatureStatus === "signed" ? 1 : 2) * DAY,
  });

  // Optionally create broker approval/signature (30% chance)
  if (brokerId && Math.random() < 0.3) {
    await ctx.db.insert("contract_approvals", {
      contractId,
      partyRole: "broker",
      companyId: brokerId,
      status: ownerApprovalStatus, // Same as owner
      approvedBy: ownerApprovalStatus === "approved" ? userId : undefined,
      approvedAt: ownerApprovalStatus === "approved" ? baseTime - 2 * DAY + 2 * HOUR : undefined,
      createdAt: baseTime - 3 * DAY,
      updatedAt: baseTime - (ownerApprovalStatus === "approved" ? 2 : 3) * DAY,
    });
  }

  // Add activity log entries for approvals/signatures
  if (ownerApprovalStatus === "approved") {
    await logActivity(
      ctx,
      "contract",
      contractId,
      "approved",
      "Owner approved the contract",
      { value: "contract-approved", label: "Contract approved" },
      undefined,
      counterpartyUserId,
      baseTime - 2 * DAY
    );
  }

  if (chartererApprovalStatus === "approved") {
    await logActivity(
      ctx,
      "contract",
      contractId,
      "approved",
      "Charterer approved the contract",
      { value: "contract-approved", label: "Contract approved" },
      undefined,
      userId,
      baseTime - 2 * DAY + 4 * HOUR
    );
  }

  if (ownerSignatureStatus === "signed") {
    await logActivity(
      ctx,
      "contract",
      contractId,
      "signed",
      "Owner signed the contract via " + (ownerSignatureStatus === "signed" ? randomItem(["DocuSign", "Manual", "Wet Ink"]) : ""),
      { value: "contract-signed", label: "Contract signed" },
      undefined,
      counterpartyUserId,
      baseTime - 1 * DAY
    );
  }

  if (chartererSignatureStatus === "signed") {
    await logActivity(
      ctx,
      "contract",
      contractId,
      "signed",
      "Charterer signed the contract via " + randomItem(["DocuSign", "Manual", "Wet Ink"]),
      { value: "contract-signed", label: "Contract signed" },
      undefined,
      userId,
      baseTime - 1 * DAY + 3 * HOUR
    );
  }
}

// Helper to add workflow dates to contract
async function addWorkflowDatesToContract(
  ctx: MutationCtx,
  contractId: Id<"contracts">,
  contractStatus: string,
  createdTime: number
) {
  const DAY = 24 * 60 * 60 * 1000;

  let workingCopyDate: number | undefined;
  let finalDate: number | undefined;
  let fullySignedDate: number | undefined;

  if (contractStatus === "working-copy" || contractStatus === "final") {
    workingCopyDate = createdTime + 1 * DAY;
  }

  if (contractStatus === "final") {
    finalDate = createdTime + 3 * DAY;
    fullySignedDate = createdTime + 4 * DAY;
  }

  await ctx.db.patch(contractId, {
    workingCopyDate,
    finalDate,
    fullySignedDate,
  });
}

// Helper to add analytics data to negotiation
async function addAnalyticsToNegotiation(
  ctx: MutationCtx,
  negotiationId: Id<"negotiations">,
  finalFreightRate: string,
  finalDemurrageRate: string,
  _baseFreightRate: number
) {
  // Generate realistic freight rate progression
  const finalRate = parseFloat(finalFreightRate.replace(/[^0-9.]/g, ""));

  // Negotiation started high and came down
  const highestRate = finalRate * (1 + Math.random() * 0.2); // 10-30% higher
  const lowestRate = finalRate * (1 - Math.random() * 0.05); // 0-5% lower
  const firstRate = finalRate * (1 + Math.random() * 0.15); // 10-25% higher

  // Last day rates
  const highestLastDay = finalRate * (1 + Math.random() * 0.1); // 5-15% higher
  const lowestLastDay = finalRate * (1 - Math.random() * 0.02); // 0-2% lower
  const firstLastDay = finalRate * (1 + Math.random() * 0.08); // 5-13% higher

  // Similar for demurrage
  const finalDemurrage = parseFloat(finalDemurrageRate.replace(/[^0-9.]/g, ""));
  const highestDemurrage = finalDemurrage * (1 + Math.random() * 0.25);
  const lowestDemurrage = finalDemurrage * (1 - Math.random() * 0.1);
  const firstDemurrage = finalDemurrage * (1 + Math.random() * 0.2);

  // Market index (slightly higher than final rate)
  const marketIndex = finalRate * (1 + Math.random() * 0.05); // 0-5% above final

  // Commissions
  const addressCommission = 3.75;
  const brokerCommission = 1.25;

  // Calculate gross freight
  const cargoQuantity = 150000; // Average cargo size
  const grossFreight = finalRate * cargoQuantity;
  const addressCommissionTotal = (grossFreight * addressCommission) / 100;
  const brokerCommissionTotal = (grossFreight * brokerCommission) / 100;

  await ctx.db.patch(negotiationId, {
    highestFreightRateIndication: highestRate,
    lowestFreightRateIndication: lowestRate,
    firstFreightRateIndication: firstRate,
    highestFreightRateLastDay: highestLastDay,
    lowestFreightRateLastDay: lowestLastDay,
    firstFreightRateLastDay: firstLastDay,
    highestDemurrageIndication: highestDemurrage,
    lowestDemurrageIndication: lowestDemurrage,
    firstDemurrageIndication: firstDemurrage,
    highestDemurrageLastDay: finalDemurrage * 1.1,
    lowestDemurrageLastDay: finalDemurrage * 0.95,
    firstDemurrageLastDay: finalDemurrage * 1.08,
    marketIndex,
    marketIndexName: "Baltic Dry Index",
    addressCommissionPercent: addressCommission,
    addressCommissionTotal: addressCommissionTotal,
    brokerCommissionPercent: brokerCommission,
    brokerCommissionTotal: brokerCommissionTotal,
    grossFreight,
    loadDeliveryType: randomItem(["Free In", "Free Out", "FIO", "FIOS", "Liner Terms"]),
    dischargeRedeliveryType: randomItem(["Free In", "Free Out", "FIO", "FIOS", "Liner Terms"]),
    dealCaptureUserId: undefined, // Will be set by user context
  });
}

// ========================================
// HELPER: CREATE DUMMY ORDER FOR OUT-OF-TRADE CONTRACT
// ========================================
async function createDummyOrderForContract(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  baseTime: number
): Promise<Id<"orders">> {
  const orderNumber = `ORD${Math.floor(10000 + Math.random() * 90000)}`;

  return await ctx.db.insert("orders", {
    orderNumber,
    organizationId,
    type: "charter" as const,
    stage: "negotiating" as const,
    status: "distributed" as const,
    createdByUserId: userId,
    createdAt: baseTime - (2 * 24 * 60 * 60 * 1000), // 2 days before contract
    updatedAt: baseTime - (1 * 24 * 60 * 60 * 1000),
  });
}

// ========================================
// HELPER: CREATE DUMMY NEGOTIATION WITH ANALYTICS
// ========================================
async function createDummyNegotiationForContract(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  userId: Id<"users">,
  counterpartyId: Id<"companies">,
  contract: {
    loadPortId: Id<"ports">;
    dischargePortId: Id<"ports">;
    cargoTypeId: Id<"cargo_types">;
    vesselId: Id<"vessels">;
    quantity: number;
    laycanStart: number;
    laycanEnd: number;
    freightRate: string;
    demurrageRate: string;
  },
  baseTime: number
): Promise<Id<"negotiations">> {
  const negotiationNumber = `NEG${Math.floor(10000 + Math.random() * 90000)}`;

  // Parse existing freight/demurrage rates
  const freightRateNum = parseFloat(contract.freightRate.replace(/[^0-9.]/g, ''));
  const demurrageRateNum = parseInt(contract.demurrageRate.replace(/[^0-9]/g, ''));

  // Generate realistic analytics (simulate negotiation history)
  const highestFreight = freightRateNum * 1.15; // 15% higher initially
  const lowestFreight = freightRateNum * 0.95;  // 5% lower at some point
  const firstFreight = freightRateNum * 1.08;   // Started 8% higher

  const highestDemurrage = demurrageRateNum * 1.20; // 20% higher initially
  const lowestDemurrage = demurrageRateNum * 0.90;  // 10% lower at some point

  // Market index (slightly above final rate)
  const marketIndex = freightRateNum * 1.03;

  // Calculate gross freight
  const grossFreight = freightRateNum * contract.quantity;

  // Calculate commission totals
  const addressCommTotal = grossFreight * 0.0375; // 3.75%
  const brokerCommTotal = grossFreight * 0.0125;  // 1.25%

  return await ctx.db.insert("negotiations", {
    negotiationNumber,
    orderId,
    counterpartyId,
    vesselId: contract.vesselId,

    // Delivery types
    loadDeliveryType: randomItem(["FIOS", "FIO", "Liner Terms", "Berth Terms"]),
    dischargeRedeliveryType: randomItem(["FIOS", "FIO", "Liner Terms", "Berth Terms"]),

    // Final rates
    freightRate: contract.freightRate,
    demurrageRate: contract.demurrageRate,

    // Analytics - Freight
    highestFreightRateIndication: highestFreight,
    lowestFreightRateIndication: lowestFreight,
    firstFreightRateIndication: firstFreight,
    highestFreightRateLastDay: freightRateNum * 1.05,
    lowestFreightRateLastDay: freightRateNum * 0.98,
    firstFreightRateLastDay: freightRateNum * 1.02,
    marketIndex: marketIndex,
    marketIndexName: randomItem(["Baltic Panamax Index", "Baltic Capesize Index", "Baltic Supramax Index"]),
    grossFreight: grossFreight,

    // Analytics - Demurrage
    highestDemurrageIndication: highestDemurrage,
    lowestDemurrageIndication: lowestDemurrage,
    firstDemurrageIndication: demurrageRateNum * 1.10,

    // Commissions
    addressCommissionPercent: 3.75,
    addressCommissionTotal: addressCommTotal,
    brokerCommissionPercent: 1.25,
    brokerCommissionTotal: brokerCommTotal,

    // User tracking
    dealCaptureUserId: userId,

    status: "fixed" as const,
    createdAt: baseTime - (1.5 * 24 * 60 * 60 * 1000), // 1.5 days before contract
    updatedAt: baseTime - (1 * 24 * 60 * 60 * 1000),
  });
}

// ========================================
// SCENARIO GENERATORS
// ========================================

// Scenario A: Successful Fixture (Standard Path) - 40%
// ========================================
// STATUS-AWARE TRADE DESK SCENARIOS
// Activity logs match actual current status
// ========================================

// Scenario: Negotiation Indicative (no contract)
// Current status: indicative-offer OR indicative-bid
async function createTradeDeskScenario_NegotiationIndicative(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order: always distributed (starting point)
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 5 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 5 * DAY + 4 * HOUR);

  // Negotiation: indicative exchanges only (STOP here)
  const variants = Math.random();
  if (variants < 0.5) {
    await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
      { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 4 * DAY);
  } else {
    await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
      { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 4 * DAY);
    await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative bid",
      { value: "negotiation-indicative-bid", label: "Negotiation indicative bid" }, undefined, counterpartyUserId, baseTime - 4 * DAY + 3 * HOUR);
  }
}

// Scenario: Negotiation Firm (no contract yet)
// Current status: firm-offer OR firm-bid
async function createTradeDeskScenario_NegotiationFirm(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 6 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 6 * DAY + 5 * HOUR);

  // Negotiation: indicative → firm (STOP here)
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
    { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 5 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative bid",
    { value: "negotiation-indicative-bid", label: "Negotiation indicative bid" }, undefined, counterpartyUserId, baseTime - 5 * DAY + 2 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm offer",
    { value: "negotiation-firm-offer", label: "Negotiation firm offer" }, undefined, userId, baseTime - 3 * DAY);
}

// Scenario: Firm with Draft Contract
// Current status: firm + contract.status = draft
async function createTradeDeskScenario_FirmWithDraftContract(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 7 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 7 * DAY + 4 * HOUR);

  // Negotiation: up to firm
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
    { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 6 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative bid",
    { value: "negotiation-indicative-bid", label: "Negotiation indicative bid" }, undefined, counterpartyUserId, baseTime - 6 * DAY + 3 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm offer",
    { value: "negotiation-firm-offer", label: "Negotiation firm offer" }, undefined, userId, baseTime - 4 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm bid",
    { value: "negotiation-firm-bid", label: "Negotiation firm bid" }, undefined, counterpartyUserId, baseTime - 4 * DAY + 2 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "accepted", "Accepted the terms. Negotiation is now firm",
    { value: "negotiation-firm", label: "Negotiation firm" }, undefined, userId, baseTime - 3 * DAY);

  // Contract: created (STOP at draft)
  await logActivity(ctx, "contract", contractId, "created", "Created draft contract",
    { value: "contract-draft", label: "Contract draft" }, undefined, userId, baseTime - 2 * DAY);
}

// Scenario: Firm with Working Contract
// Current status: firm + contract.status = working-copy
async function createTradeDeskScenario_FirmWithWorkingContract(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 8 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 8 * DAY + 5 * HOUR);

  // Negotiation: up to firm
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
    { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 7 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative bid",
    { value: "negotiation-indicative-bid", label: "Negotiation indicative bid" }, undefined, counterpartyUserId, baseTime - 7 * DAY + 2 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm offer",
    { value: "negotiation-firm-offer", label: "Negotiation firm offer" }, undefined, userId, baseTime - 5 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm bid",
    { value: "negotiation-firm-bid", label: "Negotiation firm bid" }, undefined, counterpartyUserId, baseTime - 5 * DAY + 3 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "accepted", "Accepted the terms. Negotiation is now firm",
    { value: "negotiation-firm", label: "Negotiation firm" }, undefined, userId, baseTime - 4 * DAY);

  // Contract: created → working-copy (STOP here)
  await logActivity(ctx, "contract", contractId, "created", "Created draft contract",
    { value: "contract-draft", label: "Contract draft" }, undefined, userId, baseTime - 3 * DAY);
  await logActivity(ctx, "contract", contractId, "status-changed", "Changed contract status to working copy",
    { value: "contract-working-copy", label: "Contract working copy" }, undefined, userId, baseTime - 2 * DAY);
}

// Scenario: Firm with Final Contract (COMPLETE)
// Current status: firm + contract.status = final
async function createTradeDeskScenario_FirmWithFinalContract(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 9 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 9 * DAY + 4 * HOUR);

  // Negotiation: full lifecycle to firm
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
    { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 8 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative bid",
    { value: "negotiation-indicative-bid", label: "Negotiation indicative bid" }, undefined, counterpartyUserId, baseTime - 8 * DAY + 3 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm offer",
    { value: "negotiation-firm-offer", label: "Negotiation firm offer" }, undefined, userId, baseTime - 6 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm bid",
    { value: "negotiation-firm-bid", label: "Negotiation firm bid" }, undefined, counterpartyUserId, baseTime - 6 * DAY + 2 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "accepted", "Accepted the terms. Negotiation is now firm",
    { value: "negotiation-firm", label: "Negotiation firm" }, undefined, userId, baseTime - 5 * DAY);

  // Contract: full lifecycle to signed (COMPLETE)
  await logActivity(ctx, "contract", contractId, "created", "Created draft contract",
    { value: "contract-draft", label: "Contract draft" }, undefined, userId, baseTime - 4 * DAY);
  await logActivity(ctx, "contract", contractId, "status-changed", "Changed contract status to working copy",
    { value: "contract-working-copy", label: "Contract working copy" }, undefined, userId, baseTime - 2 * DAY);
  await logActivity(ctx, "contract", contractId, "signed", "Signed the contract. Status is now final",
    { value: "contract-final", label: "Contract final" }, undefined, userId, baseTime - 1 * DAY);
}

// Scenario: On-Subs with Draft Contract
// Current status: on-subs + contract.status = draft
async function createTradeDeskScenario_OnSubsWithDraftContract(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 8 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 8 * DAY + 3 * HOUR);

  // Negotiation: up to on-subs
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
    { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 7 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative bid",
    { value: "negotiation-indicative-bid", label: "Negotiation indicative bid" }, undefined, counterpartyUserId, baseTime - 7 * DAY + 2 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm offer",
    { value: "negotiation-firm-offer", label: "Negotiation firm offer" }, undefined, userId, baseTime - 5 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm bid",
    { value: "negotiation-firm-bid", label: "Negotiation firm bid" }, undefined, counterpartyUserId, baseTime - 5 * DAY + 3 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "accepted", "Accepted the terms. Negotiation is now firm",
    { value: "negotiation-firm", label: "Negotiation firm" }, undefined, userId, baseTime - 4 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "on-subs", "Went on subs. Subject to final conditions",
    { value: "negotiation-on-subs", label: "Negotiation on subs" }, undefined, userId, baseTime - 3 * DAY);

  // Contract: created (STOP at draft)
  await logActivity(ctx, "contract", contractId, "created", "Created draft contract",
    { value: "contract-draft", label: "Contract draft" }, undefined, userId, baseTime - 2 * DAY);
}

// Scenario: On-Subs with Working Contract
// Current status: on-subs + contract.status = working-copy
async function createTradeDeskScenario_OnSubsWithWorkingContract(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 9 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 9 * DAY + 4 * HOUR);

  // Negotiation: up to on-subs
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
    { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 8 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative bid",
    { value: "negotiation-indicative-bid", label: "Negotiation indicative bid" }, undefined, counterpartyUserId, baseTime - 8 * DAY + 3 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm offer",
    { value: "negotiation-firm-offer", label: "Negotiation firm offer" }, undefined, userId, baseTime - 6 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm bid",
    { value: "negotiation-firm-bid", label: "Negotiation firm bid" }, undefined, counterpartyUserId, baseTime - 6 * DAY + 2 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "accepted", "Accepted the terms. Negotiation is now firm",
    { value: "negotiation-firm", label: "Negotiation firm" }, undefined, userId, baseTime - 5 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "on-subs", "Went on subs. Subject to final conditions",
    { value: "negotiation-on-subs", label: "Negotiation on subs" }, undefined, userId, baseTime - 4 * DAY);

  // Contract: created → working-copy (STOP here)
  await logActivity(ctx, "contract", contractId, "created", "Created draft contract",
    { value: "contract-draft", label: "Contract draft" }, undefined, userId, baseTime - 3 * DAY);
  await logActivity(ctx, "contract", contractId, "status-changed", "Changed contract status to working copy",
    { value: "contract-working-copy", label: "Contract working copy" }, undefined, userId, baseTime - 2 * DAY);
}

// Scenario: On-Subs with Final Contract (COMPLETE - subjects lifted)
// Current status: on-subs + contract.status = final (should be upgraded to fixed)
async function createTradeDeskScenario_OnSubsWithFinalContract(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 10 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 10 * DAY + 5 * HOUR);

  // Negotiation: full lifecycle to fixed (subjects lifted)
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
    { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 9 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative bid",
    { value: "negotiation-indicative-bid", label: "Negotiation indicative bid" }, undefined, counterpartyUserId, baseTime - 9 * DAY + 2 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm offer",
    { value: "negotiation-firm-offer", label: "Negotiation firm offer" }, undefined, userId, baseTime - 7 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm bid",
    { value: "negotiation-firm-bid", label: "Negotiation firm bid" }, undefined, counterpartyUserId, baseTime - 7 * DAY + 3 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "accepted", "Accepted the terms. Negotiation is now firm",
    { value: "negotiation-firm", label: "Negotiation firm" }, undefined, userId, baseTime - 6 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "on-subs", "Went on subs. Subject to final conditions",
    { value: "negotiation-on-subs", label: "Negotiation on subs" }, undefined, userId, baseTime - 5 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "fixed", "Set negotiation as fixed. All subjects lifted",
    { value: "negotiation-fixed", label: "Negotiation fixed" }, undefined, userId, baseTime - 3 * DAY);

  // Contract: full lifecycle (COMPLETE)
  await logActivity(ctx, "contract", contractId, "created", "Created draft contract",
    { value: "contract-draft", label: "Contract draft" }, undefined, userId, baseTime - 4 * DAY);
  await logActivity(ctx, "contract", contractId, "status-changed", "Changed contract status to working copy",
    { value: "contract-working-copy", label: "Contract working copy" }, undefined, userId, baseTime - 2 * DAY);
  await logActivity(ctx, "contract", contractId, "signed", "Signed the contract. Status is now final",
    { value: "contract-final", label: "Contract final" }, undefined, userId, baseTime - 1 * DAY);
}

// Scenario: Fixed with Final Contract (COMPLETE)
// Current status: fixed + contract.status = final
async function createTradeDeskScenario_FixedWithFinalContract(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 11 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 11 * DAY + 6 * HOUR);

  // Negotiation: full lifecycle to fixed
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
    { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 10 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative bid",
    { value: "negotiation-indicative-bid", label: "Negotiation indicative bid" }, undefined, counterpartyUserId, baseTime - 10 * DAY + 3 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm offer",
    { value: "negotiation-firm-offer", label: "Negotiation firm offer" }, undefined, userId, baseTime - 8 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm bid",
    { value: "negotiation-firm-bid", label: "Negotiation firm bid" }, undefined, counterpartyUserId, baseTime - 8 * DAY + 2 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "accepted", "Accepted the terms. Negotiation is now firm",
    { value: "negotiation-firm", label: "Negotiation firm" }, undefined, userId, baseTime - 7 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "on-subs", "Went on subs. Subject to final conditions",
    { value: "negotiation-on-subs", label: "Negotiation on subs" }, undefined, userId, baseTime - 6 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "fixed", "Set negotiation as fixed. All subjects lifted",
    { value: "negotiation-fixed", label: "Negotiation fixed" }, undefined, userId, baseTime - 4 * DAY);

  // Contract: full lifecycle (COMPLETE)
  await logActivity(ctx, "contract", contractId, "created", "Created draft contract",
    { value: "contract-draft", label: "Contract draft" }, undefined, userId, baseTime - 5 * DAY);
  await logActivity(ctx, "contract", contractId, "status-changed", "Changed contract status to working copy",
    { value: "contract-working-copy", label: "Contract working copy" }, undefined, userId, baseTime - 3 * DAY);
  await logActivity(ctx, "contract", contractId, "signed", "Signed the contract. Status is now final",
    { value: "contract-final", label: "Contract final" }, undefined, userId, baseTime - 1 * DAY);
}

// Scenario: Withdrawn Negotiation (no contract)
// Current status: withdrawn
async function createTradeDeskScenario_WithdrawnNegotiation(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 6 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 6 * DAY + 4 * HOUR);

  // Negotiation: exchanges → withdrawn (STOP here)
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
    { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 5 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative bid",
    { value: "negotiation-indicative-bid", label: "Negotiation indicative bid" }, undefined, counterpartyUserId, baseTime - 5 * DAY + 2 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "withdrawn", "Withdrew from negotiations",
    { value: "negotiation-withdrawn", label: "Negotiation withdrawn" }, undefined, userId, baseTime - 3 * DAY);
}

// Scenario: Expired Offer (no contract)
// Current status: firm-offer-expired
async function createTradeDeskScenario_ExpiredOffer(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  userId: Id<"users">,
  _counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 7 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 7 * DAY + 3 * HOUR);

  // Negotiation: firm offer → expired (STOP here)
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
    { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 6 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm offer",
    { value: "negotiation-firm-offer", label: "Negotiation firm offer" }, undefined, userId, baseTime - 4 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "expired", "Firm offer expired. Offer validity period ended",
    { value: "negotiation-firm-offer-expired", label: "Negotiation firm offer expired" }, undefined, undefined, baseTime - 2 * DAY);
}

// Scenario: Subs Failed (contract rejected or no contract)
// Current status: subs-failed
async function createTradeDeskScenario_SubsFailed(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  contractId: Id<"contracts"> | null,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Order
  await logActivity(ctx, "order", orderId, "created", "Created order draft",
    { value: "order-draft", label: "Order draft" }, undefined, userId, baseTime - 9 * DAY);
  await logActivity(ctx, "order", orderId, "distributed", "Distributed the order to the market",
    { value: "order-distributed", label: "Order distributed" }, undefined, userId, baseTime - 9 * DAY + 4 * HOUR);

  // Negotiation: firm → on-subs → subs failed
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative offer",
    { value: "negotiation-indicative-offer", label: "Negotiation indicative offer" }, undefined, userId, baseTime - 8 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent indicative bid",
    { value: "negotiation-indicative-bid", label: "Negotiation indicative bid" }, undefined, counterpartyUserId, baseTime - 8 * DAY + 3 * HOUR);
  await logActivity(ctx, "negotiation", negotiationId, "sent", "Sent firm offer",
    { value: "negotiation-firm-offer", label: "Negotiation firm offer" }, undefined, userId, baseTime - 6 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "accepted", "Accepted the terms. Negotiation is now firm",
    { value: "negotiation-firm", label: "Negotiation firm" }, undefined, userId, baseTime - 5 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "on-subs", "Went on subs. Subject to final conditions",
    { value: "negotiation-on-subs", label: "Negotiation on subs" }, undefined, userId, baseTime - 4 * DAY);
  await logActivity(ctx, "negotiation", negotiationId, "subs-failed", "Subs failed. Subject conditions could not be satisfied",
    { value: "negotiation-subs-failed", label: "Negotiation subs failed" }, undefined, undefined, baseTime - 2 * DAY);

  // Contract: if exists, show rejected
  if (contractId) {
    await logActivity(ctx, "contract", contractId, "created", "Created draft contract",
      { value: "contract-draft", label: "Contract draft" }, undefined, userId, baseTime - 4 * DAY + 2 * HOUR);
    await logActivity(ctx, "contract", contractId, "rejected", "Contract rejected due to failed subjects",
      { value: "contract-rejected", label: "Contract rejected" }, undefined, undefined, baseTime - 2 * DAY + 1 * HOUR);
  }
}

// ============================================
// OUT OF TRADE: STATUS-AWARE SCENARIOS
// For direct contracts without orders/negotiations
// ============================================

// Scenario: Draft Contract Only
// Current status: contract.status = "draft"
// Logs: created only (STOP at draft)
async function createOutOfTradeScenario_DraftContract(
  ctx: MutationCtx,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const DAY = 24 * 60 * 60 * 1000;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Contract: created only (STOP at draft)
  await logActivity(ctx, "contract", contractId, "created",
    "Contract draft was created",
    { value: "contract-draft", label: "Contract draft" },
    undefined, userId, baseTime - 2 * DAY);
}

// Scenario: Working Copy Contract
// Current status: contract.status = "working-copy"
// Logs: created → working-copy (STOP)
async function createOutOfTradeScenario_WorkingCopyContract(
  ctx: MutationCtx,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Contract: created → working-copy (STOP)
  const variants = Math.random();
  if (variants < 0.5) {
    // Quick progression
    await logActivity(ctx, "contract", contractId, "created",
      "Contract draft was created",
      { value: "contract-draft", label: "Contract draft" },
      undefined, userId, baseTime - 3 * DAY);
    await logActivity(ctx, "contract", contractId, "status-changed",
      "Changed contract status to working copy",
      { value: "contract-working-copy", label: "Contract working copy" },
      undefined, userId, baseTime - 2 * DAY);
  } else {
    // Slower progression
    await logActivity(ctx, "contract", contractId, "created",
      "Contract draft was created",
      { value: "contract-draft", label: "Contract draft" },
      undefined, userId, baseTime - 5 * DAY);
    await logActivity(ctx, "contract", contractId, "status-changed",
      "Changed contract status to working copy",
      { value: "contract-working-copy", label: "Contract working copy" },
      undefined, userId, baseTime - 3 * DAY);
  }
}

// Scenario: Under Review Contract
// Current status: contract.status = "working-copy" AND approvalStatus = "Pending approval"
// Logs: created → working-copy → pending approval (STOP)
async function createOutOfTradeScenario_UnderReview(
  ctx: MutationCtx,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Contract: created → working-copy → approver added (STOP at pending)
  await logActivity(ctx, "contract", contractId, "created",
    "Contract draft was created",
    { value: "contract-draft", label: "Contract draft" },
    undefined, userId, baseTime - 6 * DAY);

  await logActivity(ctx, "contract", contractId, "status-changed",
    "Changed contract status to working copy",
    { value: "contract-working-copy", label: "Contract working copy" },
    undefined, userId, baseTime - 4 * DAY);

  await logActivity(ctx, "contract", contractId, "approver-added",
    "Added approver",
    undefined,
    undefined, userId, baseTime - 3 * DAY);
}

// Scenario: Approved and Signed Contract
// Current status: contract.status = "final" AND approvalStatus = "Approved"
// Logs: created → working-copy → approved → signed (COMPLETE)
async function createOutOfTradeScenario_ApprovedAndSigned(
  ctx: MutationCtx,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Full lifecycle with approval
  const variants = Math.random();
  if (variants < 0.5) {
    // Quick approval path
    await logActivity(ctx, "contract", contractId, "created",
      "Contract draft was created",
      { value: "contract-draft", label: "Contract draft" },
      undefined, userId, baseTime - 5 * DAY);

    await logActivity(ctx, "contract", contractId, "status-changed",
      "Changed contract status to working copy",
      { value: "contract-working-copy", label: "Contract working copy" },
      undefined, userId, baseTime - 4 * DAY);

    await logActivity(ctx, "contract", contractId, "approver-added",
      "Added approver",
      undefined,
      undefined, userId, baseTime - 3 * DAY + 12 * HOUR);

    await logActivity(ctx, "contract", contractId, "approved",
      "Approved contract",
      undefined,
      undefined, userId, baseTime - 2 * DAY);

    await logActivity(ctx, "contract", contractId, "signed",
      "Signed the contract. Status is now final",
      { value: "contract-final", label: "Contract final" },
      undefined, userId, baseTime - 1 * DAY);
  } else {
    // Longer approval process
    await logActivity(ctx, "contract", contractId, "created",
      "Contract draft was created",
      { value: "contract-draft", label: "Contract draft" },
      undefined, userId, baseTime - 8 * DAY);

    await logActivity(ctx, "contract", contractId, "status-changed",
      "Changed contract status to working copy",
      { value: "contract-working-copy", label: "Contract working copy" },
      undefined, userId, baseTime - 6 * DAY);

    await logActivity(ctx, "contract", contractId, "approver-added",
      "Added approver",
      undefined,
      undefined, userId, baseTime - 5 * DAY);

    await logActivity(ctx, "contract", contractId, "approved",
      "Approved contract",
      undefined,
      undefined, userId, baseTime - 3 * DAY);

    await logActivity(ctx, "contract", contractId, "signed",
      "Signed the contract. Status is now final",
      { value: "contract-final", label: "Contract final" },
      undefined, userId, baseTime - 1 * DAY);
  }
}

// Scenario: Direct Sign Contract
// Current status: contract.status = "final" AND approvalStatus = "Signed"
// Logs: created → working-copy → signed (COMPLETE)
async function createOutOfTradeScenario_DirectSign(
  ctx: MutationCtx,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Quick path without approval
  const variants = Math.random();
  if (variants < 0.33) {
    // Very quick sign
    await logActivity(ctx, "contract", contractId, "created",
      "Contract draft was created",
      { value: "contract-draft", label: "Contract draft" },
      undefined, userId, baseTime - 2 * DAY);

    await logActivity(ctx, "contract", contractId, "signed",
      "Signed the contract. Status is now final",
      { value: "contract-final", label: "Contract final" },
      undefined, userId, baseTime - 1 * DAY);
  } else if (variants < 0.66) {
    // Medium pace
    await logActivity(ctx, "contract", contractId, "created",
      "Contract draft was created",
      { value: "contract-draft", label: "Contract draft" },
      undefined, userId, baseTime - 4 * DAY);

    await logActivity(ctx, "contract", contractId, "status-changed",
      "Changed contract status to working copy",
      { value: "contract-working-copy", label: "Contract working copy" },
      undefined, userId, baseTime - 2 * DAY + 12 * HOUR);

    await logActivity(ctx, "contract", contractId, "signed",
      "Signed the contract. Status is now final",
      { value: "contract-final", label: "Contract final" },
      undefined, userId, baseTime - 1 * DAY);
  } else {
    // Longer timeline
    await logActivity(ctx, "contract", contractId, "created",
      "Contract draft was created",
      { value: "contract-draft", label: "Contract draft" },
      undefined, userId, baseTime - 6 * DAY);

    await logActivity(ctx, "contract", contractId, "status-changed",
      "Changed contract status to working copy",
      { value: "contract-working-copy", label: "Contract working copy" },
      undefined, userId, baseTime - 4 * DAY);

    await logActivity(ctx, "contract", contractId, "signed",
      "Signed the contract. Status is now final",
      { value: "contract-final", label: "Contract final" },
      undefined, userId, baseTime - 1 * DAY + 12 * HOUR);
  }
}

// Scenario: Rejected Contract
// Current status: contract.status = "rejected"
// Logs: created → working-copy → rejected (STOP)
async function createOutOfTradeScenario_Rejected(
  ctx: MutationCtx,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseTime = baseNow - daysAgoOffset * DAY;

  // Contract rejected after working-copy
  const variants = Math.random();
  if (variants < 0.5) {
    // Rejected without approval workflow
    await logActivity(ctx, "contract", contractId, "created",
      "Contract draft was created",
      { value: "contract-draft", label: "Contract draft" },
      undefined, userId, baseTime - 4 * DAY);

    await logActivity(ctx, "contract", contractId, "status-changed",
      "Changed contract status to working copy",
      { value: "contract-working-copy", label: "Contract working copy" },
      undefined, userId, baseTime - 3 * DAY);

    await logActivity(ctx, "contract", contractId, "rejected",
      "Rejected during approval process",
      { value: "contract-rejected", label: "Contract rejected" },
      undefined, undefined, baseTime - 2 * DAY);
  } else {
    // Rejected after approver was added
    await logActivity(ctx, "contract", contractId, "created",
      "Contract draft was created",
      { value: "contract-draft", label: "Contract draft" },
      undefined, userId, baseTime - 5 * DAY);

    await logActivity(ctx, "contract", contractId, "status-changed",
      "Changed contract status to working copy",
      { value: "contract-working-copy", label: "Contract working copy" },
      undefined, userId, baseTime - 4 * DAY);

    await logActivity(ctx, "contract", contractId, "approver-added",
      "Added approver",
      undefined,
      undefined, userId, baseTime - 3 * DAY + 12 * HOUR);

    await logActivity(ctx, "contract", contractId, "rejected",
      "Rejected during approval process",
      { value: "contract-rejected", label: "Contract rejected" },
      undefined, undefined, baseTime - 2 * DAY);
  }
}

// Weighted status combination selector for realistic fixture distribution
function selectTradeDeskStatusCombination(): {
  negotiationStatus: "indicative-offer" | "indicative-bid" | "firm-offer" | "firm-bid" | "firm" | "on-subs" | "fixed";
  contractStatus: "draft" | "working-copy" | "final" | null;
  shouldCreateContract: boolean;
} {
  const rand = Math.random();

  // 70% - Complete fixtures (fixed negotiation + final contract)
  if (rand < 0.70) {
    return {
      negotiationStatus: "fixed",
      contractStatus: "final",
      shouldCreateContract: true,
    };
  }

  // 7% - On-subs with draft contract (waiting for conditions)
  if (rand < 0.77) {
    return {
      negotiationStatus: "on-subs",
      contractStatus: "draft",
      shouldCreateContract: true,
    };
  }

  // 8% - On-subs with working-copy contract (conditions being reviewed)
  if (rand < 0.85) {
    return {
      negotiationStatus: "on-subs",
      contractStatus: "working-copy",
      shouldCreateContract: true,
    };
  }

  // 5% - Firm with draft contract (agreement reached, drafting)
  if (rand < 0.90) {
    return {
      negotiationStatus: "firm",
      contractStatus: "draft",
      shouldCreateContract: true,
    };
  }

  // 5% - Firm bid (no contract yet, awaiting acceptance)
  if (rand < 0.95) {
    return {
      negotiationStatus: "firm-bid",
      contractStatus: null,
      shouldCreateContract: false,
    };
  }

  // 3% - Firm offer (no contract yet, offer pending)
  if (rand < 0.98) {
    return {
      negotiationStatus: "firm-offer",
      contractStatus: null,
      shouldCreateContract: false,
    };
  }

  // 2% - Indicative bid (early stage, no contract)
  return {
    negotiationStatus: "indicative-bid",
    contractStatus: null,
    shouldCreateContract: false,
  };
}

// Migrate sample Trade Desk data
export async function migrateTradeDeskDataInternal(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  // Calculate base timestamp once
  const baseNow = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  // Get reference data
  const companies = await ctx.db.query("companies").collect();
  const charterers = companies.filter((c) => c.roles.includes("charterer"));
  const owners = companies.filter((c) => c.roles.includes("owner"));
  const brokers = companies.filter((c) => c.roles.includes("broker"));
  const vessels = await ctx.db.query("vessels").collect();
  const ports = await ctx.db.query("ports").collect();
  const cargoTypes = await ctx.db.query("cargo_types").collect();

  if (charterers.length === 0 || vessels.length === 0 || ports.length === 0) {
    throw new Error("Reference data not seeded. Please run seed functions first.");
  }

  const orders = [];
  const negotiations = [];
  const contracts = [];
  const fixtures = [];

  // Create 100 sample orders spread across a year (now possible with indexed queries)
  for (let i = 0; i < 100; i++) {
    // Spread orders across 365 days (most recent = lower index)
    const daysAgoOffset = Math.floor((i / 99) * 364) + 1; // 1 to 365 days

    const laycan = generateLaycan();
    const loadPort = randomItem(ports);
    const dischargePort = randomItem(ports.filter((p) => p._id !== loadPort._id));
    const cargoType = randomItem(cargoTypes);
    const type = randomItem(["buy", "sell", "charter"] as const);
    const stage = randomItem(["offer", "active", "negotiating", "pending"] as const);
    const status = randomItem(["draft", "distributed"] as const);

    const orderNumber = `ORD${10000 + i}`;

    // Select ONE charterer for this order (will be used across all negotiations)
    const orderCharterer = randomItem(charterers);

    // Create order
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      title: `${cargoType.name} ${loadPort.name} to ${dischargePort.name}`,
      type,
      stage,
      cargoTypeId: cargoType._id,
      quantity: Math.floor(Math.random() * 100000) + 50000,
      quantityUnit: cargoType.unitType,
      laycanStart: laycan.start,
      laycanEnd: laycan.end,
      loadPortId: loadPort._id,
      dischargePortId: dischargePort._id,
      freightRate: `WS ${Math.floor(Math.random() * 50) + 70}-${Math.floor(Math.random() * 50) + 90}`,
      freightRateType: "worldscale",
      demurrageRate: `$${Math.floor(Math.random() * 50000) + 40000}/day`,
      tce: `$${Math.floor(Math.random() * 100000) + 100000}`,
      validityHours: randomItem([24, 48, 72]),
      organizationId,
      chartererId: orderCharterer._id,
      ownerId: randomItem(owners)._id,
      brokerId: randomItem(brokers)._id,
      status,
      createdAt: baseNow - daysAgoOffset * DAY - Math.floor(Math.random() * 12) * HOUR,
      updatedAt: baseNow - daysAgoOffset * DAY + Math.floor(Math.random() * (daysAgoOffset * DAY * 0.5)),
    });

    orders.push(orderId);

    // Create fixture for this order
    const fixtureNumber = `FIX${10000 + i}`;
    const fixtureStatuses: Array<"draft" | "working-copy" | "final"> = ["draft", "working-copy", "final"];
    const fixtureStatus = randomItem(fixtureStatuses);

    const fixtureCreatedTime = baseNow - daysAgoOffset * DAY + Math.floor(Math.random() * 2) * DAY;
    const fixtureUpdatedTime = fixtureCreatedTime + Math.floor(Math.random() * (daysAgoOffset * DAY * 0.3));

    const fixtureId = await ctx.db.insert("fixtures", {
      fixtureNumber,
      orderId,
      title: `${cargoType.name} ${loadPort.name} to ${dischargePort.name}`,
      organizationId,
      status: fixtureStatus,
      createdAt: fixtureCreatedTime,
      updatedAt: fixtureUpdatedTime,
    });

    fixtures.push(fixtureId);

    // Create 2-5 negotiations per order
    const numNegotiations = Math.floor(Math.random() * 4) + 2; // 2-5

    // Prepare pool of different owners for negotiations
    // Each negotiation should come from a different owner
    const shuffledOwners = [...owners].sort(() => Math.random() - 0.5);

    for (let j = 0; j < numNegotiations; j++) {
      // Use weighted status selection for realistic distribution
      const statusCombination = selectTradeDeskStatusCombination();
      const negStatus = statusCombination.negotiationStatus;

      // Pick different owner for each negotiation (charterer stays the same)
      const negotiationOwner = shuffledOwners[j % shuffledOwners.length];
      const broker = randomItem(brokers);

      const negCreatedTime = fixtureCreatedTime + j * Math.floor(Math.random() * 3) * DAY;
      const negUpdatedTime = negCreatedTime + Math.floor(Math.random() * 4) * DAY;

      const negNumber: number = negotiations.length;
      const negotiationId = await ctx.db.insert("negotiations", {
        negotiationNumber: `NEG${10000 + negNumber}`,
        orderId,
        counterpartyId: negotiationOwner._id,
        brokerId: broker._id,
        bidPrice: `WS ${Math.floor(Math.random() * 10) + 80}`,
        offerPrice: `WS ${Math.floor(Math.random() * 10) + 85}`,
        status: negStatus,
        personInChargeId: userId,
        createdAt: negCreatedTime,
        updatedAt: negUpdatedTime,
      });

      negotiations.push(negotiationId);

      // Create contract based on weighted status selection
      if (statusCombination.shouldCreateContract) {
        const vessel = randomItem(vessels);

        const contractCreatedTime = negUpdatedTime + Math.floor(Math.random() * 2) * DAY;
        const contractUpdatedTime = contractCreatedTime + Math.floor(Math.random() * 5) * DAY;

        const contractNumber: number = contracts.length;
        const contractId = await ctx.db.insert("contracts", {
          contractNumber: `CP${10000 + contractNumber}`,
          fixtureId,
          orderId,
          negotiationId,
          contractType: randomItem(["voyage-charter", "time-charter", "coa"] as const),
          ownerId: negotiationOwner._id,
          chartererId: orderCharterer._id,
          brokerId: broker._id,
          vesselId: vessel._id,
          loadPortId: loadPort._id,
          dischargePortId: dischargePort._id,
          laycanStart: laycan.start,
          laycanEnd: laycan.end,
          freightRate: `$${(Math.random() * 20 + 15).toFixed(2)}/mt`,
          freightRateType: "per-tonne",
          demurrageRate: `$${Math.floor(Math.random() * 30000) + 40000}/day`,
          despatchRate: `$${Math.floor(Math.random() * 15000) + 20000}/day`,
          addressCommission: "3.75%",
          brokerCommission: "1.25%",
          cargoTypeId: cargoType._id,
          quantity: Math.floor(Math.random() * 100000) + 100000,
          quantityUnit: cargoType.unitType,
          status: statusCombination.contractStatus!,
          approvalStatus: statusCombination.contractStatus === "final" ? "Signed" : "Pending approval",
          createdAt: contractCreatedTime,
          updatedAt: contractUpdatedTime,
        });

        contracts.push(contractId);

        // Add workflow dates to contract
        await addWorkflowDatesToContract(ctx, contractId, statusCombination.contractStatus!, contractCreatedTime);

        // Create approval/signature records for contract
        await createContractApprovalsAndSignatures(
          ctx,
          contractId,
          negotiationOwner._id,
          orderCharterer._id,
          broker._id,
          statusCombination.contractStatus!,
          userId,
          userId, // Using same user for both parties in sample data
          contractCreatedTime
        );

        // Add analytics data to negotiation
        await addAnalyticsToNegotiation(
          ctx,
          negotiationId,
          `$${(Math.random() * 20 + 15).toFixed(2)}/mt`,
          `$${Math.floor(Math.random() * 30000) + 40000}/day`,
          Math.random() * 20 + 15
        );

        // Generate field changes for this contract (85% chance of having 3-5 changes)
        const shouldCreateChanges = Math.random() < 0.85;
        console.log(`[Field Changes] Contract ${contracts.length}: shouldCreateChanges=${shouldCreateChanges}`);

        if (shouldCreateChanges) {
          // Get contract data for field changes
          const contract = await ctx.db.get(contractId);
          console.log(`[Field Changes] Contract retrieved: ${contract ? 'YES' : 'NO'}`);
          if (contract) {
            const quantity = contract.quantity!;
            const freightRate = contract.freightRate!;
            const demurrageRate = contract.demurrageRate!;

            // Generate initial values that differ from final values
            const initialOwner = randomItem(owners.filter(o => o._id !== negotiationOwner._id));
            const initialCharterer = randomItem(charterers.filter(c => c._id !== orderCharterer._id));
            const initialBroker = randomItem(brokers.filter(b => b._id !== broker._id));
            const initialLoadPort = randomItem(ports.filter(p => p._id !== loadPort._id));
            const initialQuantity = Math.floor(quantity * 0.9); // 90% of final
            const initialFreightRate = `$${(parseFloat(freightRate.replace(/[^0-9.]/g, '')) * 0.85).toFixed(2)}/mt`; // 85% of final
            const initialLaycanStart = laycan.start - (7 * DAY); // 7 days earlier
            const initialDemurrageRate = `$${Math.floor(parseInt(demurrageRate.replace(/[^0-9]/g, '')) * 0.85)}/day`; // 85% of final

            // Define possible fields to track
            const possibleFields = [
              { field: "ownerId", oldValue: initialOwner.name, newValue: negotiationOwner.name },
              { field: "chartererId", oldValue: initialCharterer.name, newValue: orderCharterer.name },
              { field: "brokerId", oldValue: initialBroker.name, newValue: broker.name },
              { field: "loadPortId", oldValue: initialLoadPort.name, newValue: loadPort.name },
              { field: "quantity", oldValue: initialQuantity.toString(), newValue: quantity.toString() },
              { field: "freightRate", oldValue: initialFreightRate, newValue: freightRate },
              { field: "laycanStart", oldValue: new Date(initialLaycanStart).toLocaleDateString(), newValue: new Date(laycan.start).toLocaleDateString() },
              { field: "demurrageRate", oldValue: initialDemurrageRate, newValue: demurrageRate },
            ];

            // Randomly select 3-5 fields
            const numChanges = Math.floor(Math.random() * 3) + 3; // 3-5 changes
            const shuffled = [...possibleFields].sort(() => Math.random() - 0.5);
            const selectedFields = shuffled.slice(0, numChanges);
            console.log(`[Field Changes] Creating ${numChanges} field changes for contract ${contractId}`);

            // Create field changes with timestamps spread over a few days after contract creation
            for (let j = 0; j < selectedFields.length; j++) {
              const field = selectedFields[j];
              // TODO: Use timestamp for field changes: contractCreatedTime + (j * 0.5 + 0.5) * DAY

              console.log(`[Field Changes] Calling trackFieldChange for ${field.field}: ${field.oldValue} -> ${field.newValue}`);
              await trackFieldChange(
                ctx,
                "contract",
                contractId,
                field.field,
                field.oldValue,
                field.newValue,
                userId,
                `${field.field} adjusted during negotiation`
              );
              console.log(`[Field Changes] Successfully tracked change for ${field.field}`);
            }
            console.log(`[Field Changes] Completed ${numChanges} field changes for contract ${contractId}`);
          }
        }
      }
    }
  }

  return {
    ordersCreated: orders.length,
    negotiationsCreated: negotiations.length,
    contractsCreated: contracts.length,
    fixturesCreated: fixtures.length,
  };
}

export async function migrateFixturesDataInternal(
  ctx: MutationCtx,
  _userId: Id<"users">,
  contractCounterOffset: number = 0
) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const baseNow = Date.now();

  // Get reference data
  const companies = await ctx.db.query("companies").collect();
  const charterers = companies.filter((c) => c.roles.includes("charterer"));
  const owners = companies.filter((c) => c.roles.includes("owner"));
  const brokers = companies.filter((c) => c.roles.includes("broker"));
  const vessels = await ctx.db.query("vessels").collect();
  const ports = await ctx.db.query("ports").collect();
  const cargoTypes = await ctx.db.query("cargo_types").collect();

  const contracts = [];
  const fixtures = [];
  const recapManagers = [];

  // Initialize contract counter with offset from Trade Desk
  let contractCounter = contractCounterOffset;

  // Get first organization for fixtures
  const organization = await ctx.db.query("organizations").first();
  if (!organization) {
    throw new Error("No organization found");
  }

  // Create 30 contracts (dry market) as direct contracts without orders/negotiations (now possible with indexed queries)
  for (let i = 0; i < 30; i++) {
    // Spread direct contracts across 180 days (6 months)
    const daysAgoOffset = Math.floor((i / 29) * 179) + 1; // 1-180 days

    const laycan = generateLaycan();
    const loadPort = randomItem(ports);
    const dischargePort = randomItem(ports.filter((p) => p._id !== loadPort._id));
    const cargoType = randomItem(cargoTypes);
    const owner = randomItem(owners);
    const charterer = randomItem(charterers);
    const broker = randomItem(brokers);
    const vessel = randomItem(vessels);

    // Use weighted status selection for Out of Trade fixtures too
    const rand = Math.random();
    let fixtureStatus: "draft" | "working-copy" | "final";
    let contractStatus: "draft" | "working-copy" | "final";
    let approvalStatus: "Signed" | "Pending approval" | "Approved";

    if (rand < 0.70) {
      // 70% complete (final)
      fixtureStatus = "final";
      contractStatus = "final";
      approvalStatus = "Signed";
    } else if (rand < 0.85) {
      // 15% working-copy (in-progress)
      fixtureStatus = "working-copy";
      contractStatus = "working-copy";
      approvalStatus = "Pending approval";
    } else {
      // 15% draft (early stage)
      fixtureStatus = "draft";
      contractStatus = "draft";
      approvalStatus = "Pending approval";
    }

    // Create fixture for this contract (Out of Trade fixtures start at FIX10100 to avoid collision with Trade Desk)
    const fixtureNumber: string = `FIX${10100 + i}`;

    const fixtureCreatedTime = baseNow - daysAgoOffset * DAY - Math.floor(Math.random() * 12) * HOUR;
    const fixtureUpdatedTime = fixtureCreatedTime + Math.floor(Math.random() * (daysAgoOffset * DAY * 0.5));
    const contractCreatedTime = fixtureCreatedTime + Math.floor(Math.random() * 2) * DAY;
    const contractUpdatedTime = contractCreatedTime + Math.floor(Math.random() * (daysAgoOffset * DAY * 0.3));

    // Create dummy order for this Out-of-Trade contract FIRST (so we can link fixture to it)
    const orderId = await createDummyOrderForContract(
      ctx,
      organization._id,
      _userId,
      contractCreatedTime
    );

    // Now create fixture with orderId link
    const fixtureId: Id<"fixtures"> = await ctx.db.insert("fixtures", {
      fixtureNumber,
      title: `${cargoType.name} ${loadPort.name} to ${dischargePort.name}`,
      organizationId: organization._id,
      orderId,  // Link to the dummy order
      status: fixtureStatus,
      createdAt: fixtureCreatedTime,
      updatedAt: fixtureUpdatedTime,
    });

    fixtures.push(fixtureId);

    // Prepare contract data for negotiation creation
    const quantity = Math.floor(Math.random() * 100000) + 100000;
    const freightRate = `$${(Math.random() * 20 + 15).toFixed(2)}/mt`;
    const demurrageRate = `$${Math.floor(Math.random() * 30000) + 40000}/day`;

    const contractData = {
      loadPortId: loadPort._id,
      dischargePortId: dischargePort._id,
      cargoTypeId: cargoType._id,
      vesselId: vessel._id,
      quantity,
      laycanStart: laycan.start,
      laycanEnd: laycan.end,
      freightRate,
      demurrageRate,
    };

    // Create dummy negotiation with analytics
    const negotiationId = await createDummyNegotiationForContract(
      ctx,
      orderId,
      _userId,
      charterer._id,
      contractData,
      contractCreatedTime
    );

    // Now create contract WITH order and negotiation links
    const contractId = await ctx.db.insert("contracts", {
      contractNumber: `CP${10000 + contractCounter}`,
      fixtureId,
      orderId,            // NOW LINKED
      negotiationId,      // NOW LINKED
      contractType: randomItem(["voyage-charter", "time-charter", "coa"] as const),
      ownerId: owner._id,
      chartererId: charterer._id,
      brokerId: broker._id,
      vesselId: vessel._id,
      loadPortId: loadPort._id,
      dischargePortId: dischargePort._id,
      laycanStart: laycan.start,
      laycanEnd: laycan.end,
      freightRate,
      freightRateType: "per-tonne",
      demurrageRate,
      despatchRate: `$${Math.floor(Math.random() * 15000) + 20000}/day`,
      addressCommission: "3.75%",
      brokerCommission: "1.25%",
      cargoTypeId: cargoType._id,
      quantity,
      quantityUnit: cargoType.unitType,
      status: contractStatus,
      approvalStatus,
      createdAt: contractCreatedTime,
      updatedAt: contractUpdatedTime,
    });

    contracts.push(contractId);
    contractCounter++;

    // Add workflow dates to contract
    await addWorkflowDatesToContract(ctx, contractId, contractStatus, contractCreatedTime);

    // Create approval/signature records for contract
    await createContractApprovalsAndSignatures(
      ctx,
      contractId,
      owner._id,
      charterer._id,
      broker._id,
      contractStatus,
      _userId,
      _userId, // Using same user for both parties in sample data
      contractCreatedTime
    );

    // Generate field changes for this contract (85% chance of having 3-5 changes)
    const shouldCreateChangesOOT = Math.random() < 0.85;
    console.log(`[Field Changes OOT] Contract ${contractCounter}: shouldCreateChanges=${shouldCreateChangesOOT}`);

    if (shouldCreateChangesOOT) {
      // Get contract data for field changes
      const contract = await ctx.db.get(contractId);
      console.log(`[Field Changes OOT] Contract retrieved: ${contract ? 'YES' : 'NO'}`);
      if (contract) {
        const quantity = contract.quantity!;
        const freightRate = contract.freightRate!;
        const demurrageRate = contract.demurrageRate!;

        // Generate initial values that differ from final values
        const initialOwner = randomItem(owners.filter(o => o._id !== owner._id));
        const initialCharterer = randomItem(charterers.filter(c => c._id !== charterer._id));
        const initialBroker = randomItem(brokers.filter(b => b._id !== broker._id));
        const initialLoadPort = randomItem(ports.filter(p => p._id !== loadPort._id));
        const initialQuantity = Math.floor(quantity * 0.9); // 90% of final
        const initialFreightRate = `$${(parseFloat(freightRate.replace(/[^0-9.]/g, '')) * 0.85).toFixed(2)}/mt`; // 85% of final
        const initialLaycanStart = laycan.start - (7 * DAY); // 7 days earlier
        const initialDemurrageRate = `$${Math.floor(parseInt(demurrageRate.replace(/[^0-9]/g, '')) * 0.85)}/day`; // 85% of final

        // Define possible fields to track
        const possibleFields = [
          { field: "ownerId", oldValue: initialOwner.name, newValue: owner.name },
          { field: "chartererId", oldValue: initialCharterer.name, newValue: charterer.name },
          { field: "brokerId", oldValue: initialBroker.name, newValue: broker.name },
          { field: "loadPortId", oldValue: initialLoadPort.name, newValue: loadPort.name },
          { field: "quantity", oldValue: initialQuantity.toString(), newValue: quantity.toString() },
          { field: "freightRate", oldValue: initialFreightRate, newValue: freightRate },
          { field: "laycanStart", oldValue: new Date(initialLaycanStart).toLocaleDateString(), newValue: new Date(laycan.start).toLocaleDateString() },
          { field: "demurrageRate", oldValue: initialDemurrageRate, newValue: demurrageRate },
        ];

      // Randomly select 3-5 fields
      const numChanges = Math.floor(Math.random() * 3) + 3; // 3-5 changes
      const shuffled = [...possibleFields].sort(() => Math.random() - 0.5);
      const selectedFields = shuffled.slice(0, numChanges);
      console.log(`[Field Changes OOT] Creating ${numChanges} field changes for contract ${contractId}`);

      // Create field changes with timestamps spread over a few days after contract creation
      for (let j = 0; j < selectedFields.length; j++) {
        const field = selectedFields[j];
        // TODO: Use timestamp for field changes: contractCreatedTime + (j * 0.5 + 0.5) * DAY

        // Get first user for field changes
        const firstUser = await ctx.db.query("users").first();
        console.log(`[Field Changes OOT] Got user: ${firstUser ? firstUser.name : 'NULL'}`);
        if (firstUser) {
          console.log(`[Field Changes OOT] Calling trackFieldChange for ${field.field}: ${field.oldValue} -> ${field.newValue}`);
          await trackFieldChange(
            ctx,
            "contract",
            contractId,
            field.field,
            field.oldValue,
            field.newValue,
            firstUser._id,
            `${field.field} adjusted during negotiation`
          );
          console.log(`[Field Changes OOT] Successfully tracked change for ${field.field}`);
        }
      }
      console.log(`[Field Changes OOT] Completed ${numChanges} field changes for contract ${contractId}`);
      }
    }
  }

  // Create 5 recap managers (wet market)
  for (let i = 0; i < 5; i++) {
    // Spread recap managers across 90 days (3 months)
    const daysAgoOffset = Math.floor((i / 4) * 89) + 1; // 1-90 days

    const laycan = generateLaycan();
    const loadPort = randomItem(ports);
    const dischargePort = randomItem(ports.filter((p) => p._id !== loadPort._id));
    const cargoType = randomItem(cargoTypes);
    const owner = randomItem(owners);
    const charterer = randomItem(charterers);
    const broker = randomItem(brokers);
    const vessel = randomItem(vessels);

    // Use weighted status selection for recap managers
    const recapRand = Math.random();
    let recapStatus: "draft" | "on-subs" | "fully-fixed";
    let recapApprovalStatus: "Signed" | "Pending signature" | "Approved";

    if (recapRand < 0.70) {
      // 70% complete (fully-fixed)
      recapStatus = "fully-fixed";
      recapApprovalStatus = "Signed";
    } else if (recapRand < 0.85) {
      // 15% on-subs (in-progress)
      recapStatus = "on-subs";
      recapApprovalStatus = "Pending signature";
    } else {
      // 15% draft (early stage)
      recapStatus = "draft";
      recapApprovalStatus = "Pending signature";
    }

    const recapNumber = `RCP${10000 + i}`;

    const recapCreatedTime = baseNow - daysAgoOffset * DAY - Math.floor(Math.random() * 12) * HOUR;
    const recapUpdatedTime = recapCreatedTime + Math.floor(Math.random() * (daysAgoOffset * DAY * 0.6));

    const recapId = await ctx.db.insert("recap_managers", {
      recapNumber,
      // orderId and negotiationId omitted - these are direct recap managers without negotiations
      contractType: randomItem(["voyage-charter", "time-charter"] as const),
      ownerId: owner._id,
      chartererId: charterer._id,
      brokerId: broker._id,
      vesselId: vessel._id,
      loadPortId: loadPort._id,
      dischargePortId: dischargePort._id,
      laycanStart: laycan.start,
      laycanEnd: laycan.end,
      freightRate: `WS ${Math.floor(Math.random() * 30) + 80}`,
      freightRateType: "worldscale",
      demurrageRate: `$${Math.floor(Math.random() * 40000) + 50000}/day`,
      despatchRate: `$${Math.floor(Math.random() * 20000) + 25000}/day`,
      addressCommission: "3.75%",
      brokerCommission: "1.25%",
      cargoTypeId: cargoType._id,
      quantity: Math.floor(Math.random() * 100000) + 150000,
      quantityUnit: cargoType.unitType,
      status: recapStatus,
      approvalStatus: recapApprovalStatus,
      createdAt: recapCreatedTime,
      updatedAt: recapUpdatedTime,
    });

    recapManagers.push(recapId);
  }

  return {
    contractsCreated: contracts.length,
    fixturesCreated: fixtures.length,
    recapManagersCreated: recapManagers.length,
  };
}

// ========================================
// ACTIVITY LOG ATTACHMENT LAYER
// Attaches activity logs to generated data based on fixture type
// ========================================

// Main dispatcher: Attach activity logs to all fixtures (limit queries to stay under limits)
export async function attachActivityLogsToFixtures(
  ctx: MutationCtx,
  userId: Id<"users">,
  baseNow: number
) {
  // Get a counterparty user for Trade Desk logs
  const users = await ctx.db.query("users").take(2);
  const counterpartyUser = users.length > 1
    ? users.find((u) => u._id !== userId) || users[0]
    : users[0];

  // Collect all fixtures (just metadata, not heavy)
  const fixtures = await ctx.db.query("fixtures").collect();
  console.log(`Processing ${fixtures.length} fixtures for activity logs`);

  let processedCount = 0;
  for (const fixture of fixtures) {
    if (fixture.orderId) {
      // Trade Desk flow - attach logs to negotiations
      await attachTradeDeskLogs(ctx, fixture, userId, counterpartyUser._id, baseNow);
    } else {
      // Out of Trade flow - attach logs to direct contracts
      await attachOutOfTradeLogs(ctx, fixture, userId, baseNow);
    }
    processedCount++;
  }

  console.log(`Attached activity logs to ${processedCount} fixtures`);
}

// Attach logs to Trade Desk fixtures (with orderId)
async function attachTradeDeskLogs(
  ctx: MutationCtx,
  fixture: any,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  baseNow: number
) {
  // Get all negotiations for this order (use index to avoid full table scan)
  const negotiations = await ctx.db
    .query("negotiations")
    .withIndex("by_order", (q) => q.eq("orderId", fixture.orderId))
    .collect();

  for (const negotiation of negotiations) {
    // Get contract for this negotiation (use index to avoid full table scan)
    const contract = await ctx.db
      .query("contracts")
      .withIndex("by_negotiation", (q) => q.eq("negotiationId", negotiation._id))
      .first();

    if (!contract) continue;

    // Calculate daysAgoOffset based on fixture creation time
    const DAY = 24 * 60 * 60 * 1000;
    const daysAgoOffset = Math.floor((baseNow - fixture.createdAt) / DAY);

    // Correct invalid status combinations before creating logs
    await correctTradeDeskStatusCombination(ctx, negotiation, contract);

    // Select scenario based on corrected negotiation and contract status
    const scenario = selectTradeDeskScenario(negotiation.status, contract.status, contract.approvalStatus);

    // Apply the chosen scenario
    await applyTradeDeskScenario(
      ctx,
      scenario,
      fixture.orderId!,
      negotiation._id,
      contract._id,
      userId,
      counterpartyUserId,
      daysAgoOffset,
      baseNow
    );
  }
}

// Correct invalid Trade Desk status combinations
async function correctTradeDeskStatusCombination(
  ctx: MutationCtx,
  negotiation: any,
  contract: any
) {
  let corrected = false;

  // Rule 1: If negotiation is "fixed", contract MUST be "final"
  if (negotiation.status === "fixed" && contract.status !== "final") {
    console.warn(`[Status Correction] Negotiation ${negotiation._id} is fixed but contract ${contract._id} is ${contract.status}. Upgrading contract to final.`);
    await ctx.db.patch(contract._id, {
      status: "final",
      approvalStatus: "Signed",
    });
    contract.status = "final";
    contract.approvalStatus = "Signed";
    corrected = true;
  }

  // Rule 2: If contract is "final", negotiation must be at least "firm" (ideally "fixed")
  if (contract.status === "final" && !["firm", "on-subs", "fixed"].includes(negotiation.status)) {
    console.warn(`[Status Correction] Contract ${contract._id} is final but negotiation ${negotiation._id} is ${negotiation.status}. Upgrading negotiation to fixed.`);
    await ctx.db.patch(negotiation._id, {
      status: "fixed",
    });
    negotiation.status = "fixed";
    corrected = true;
  }

  // Rule 3: If negotiation is "withdrawn" or "expired" and contract exists, this is likely invalid
  // Keep contract but ensure it's not final
  if (["withdrawn", "firm-offer-expired", "subs-failed"].includes(negotiation.status) && contract.status === "final") {
    console.warn(`[Status Correction] Negotiation ${negotiation._id} is ${negotiation.status} but contract ${contract._id} is final. Downgrading contract to draft.`);
    await ctx.db.patch(contract._id, {
      status: "draft",
    });
    contract.status = "draft";
    corrected = true;
  }

  // Rule 4 (NEW): Only correct TRULY invalid combinations
  // Valid in-progress combinations to preserve:
  // - on-subs + draft/working-copy ✅
  // - firm + draft/working-copy ✅
  // - firm-bid/firm-offer + no contract ✅
  // Invalid combinations to correct:
  // - indicative-* + contract exists → upgrade negotiation to "firm"
  if (contract && ["indicative-offer", "indicative-bid"].includes(negotiation.status)) {
    console.warn(`[Status Correction] Negotiation ${negotiation._id} is ${negotiation.status} but contract ${contract._id} exists. Upgrading negotiation to firm.`);
    await ctx.db.patch(negotiation._id, {
      status: "firm",
    });
    negotiation.status = "firm";
    corrected = true;
  }

  if (corrected) {
    console.log(`[Status Correction] Corrected statuses for negotiation ${negotiation._id} and contract ${contract._id}`);
  }
}

// Select Trade Desk scenario based on current status (status-first approach)
function selectTradeDeskScenario(
  negotiationStatus: string,
  contractStatus: string | null,
  _approvalStatus: string | undefined
): string {
  // No contract scenarios
  if (!contractStatus) {
    if (negotiationStatus === "indicative-offer" || negotiationStatus === "indicative-bid") {
      return "negotiation-indicative";
    }
    if (negotiationStatus === "firm-offer" || negotiationStatus === "firm-bid") {
      return "negotiation-firm";
    }
    if (negotiationStatus === "withdrawn") {
      return "negotiation-withdrawn";
    }
    if (negotiationStatus === "firm-offer-expired") {
      return "negotiation-expired";
    }
  }

  // Firm negotiation with contract
  if (negotiationStatus === "firm") {
    if (contractStatus === "draft") {
      return "firm-draft-contract";
    }
    if (contractStatus === "working-copy") {
      return "firm-working-contract";
    }
    if (contractStatus === "final") {
      return "firm-final-contract";
    }
    if (contractStatus === "rejected") {
      return "firm-rejected-contract";
    }
  }

  // On-subs negotiation with contract
  if (negotiationStatus === "on-subs") {
    if (contractStatus === "draft") {
      return "on-subs-draft-contract";
    }
    if (contractStatus === "working-copy") {
      return "on-subs-working-contract";
    }
    if (contractStatus === "final") {
      return "on-subs-final-contract";
    }
  }

  // Fixed negotiation (always has final contract)
  if (negotiationStatus === "fixed") {
    return "fixed-final-contract";
  }

  // Failed negotiation scenarios
  if (negotiationStatus === "subs-failed") {
    return "subs-failed";
  }

  // Amendment scenarios
  if (negotiationStatus === "firm-amendment") {
    if (contractStatus === "working-copy") {
      return "amendment-in-progress";
    }
    if (contractStatus === "final") {
      return "amendment-completed";
    }
  }

  // On-subs amendment
  if (negotiationStatus === "on-subs-amendment") {
    if (contractStatus === "working-copy") {
      return "on-subs-amendment-working";
    }
    if (contractStatus === "final") {
      return "on-subs-amendment-final";
    }
  }

  // Subs expired
  if (negotiationStatus === "subs-expired") {
    return "subs-expired";
  }

  // Default fallback: firm with final contract
  return "firm-final-contract";
}

// Apply Trade Desk scenario (status-aware)
async function applyTradeDeskScenario(
  ctx: MutationCtx,
  scenario: string,
  orderId: Id<"orders">,
  negotiationId: Id<"negotiations">,
  contractId: Id<"contracts"> | null,
  userId: Id<"users">,
  counterpartyUserId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  switch (scenario) {
    // Negotiation only scenarios (no contract)
    case "negotiation-indicative":
      await createTradeDeskScenario_NegotiationIndicative(ctx, orderId, negotiationId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;
    case "negotiation-firm":
      await createTradeDeskScenario_NegotiationFirm(ctx, orderId, negotiationId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;
    case "negotiation-withdrawn":
      await createTradeDeskScenario_WithdrawnNegotiation(ctx, orderId, negotiationId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;
    case "negotiation-expired":
      await createTradeDeskScenario_ExpiredOffer(ctx, orderId, negotiationId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;

    // Firm negotiation with contract scenarios
    case "firm-draft-contract":
      if (contractId) await createTradeDeskScenario_FirmWithDraftContract(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;
    case "firm-working-contract":
      if (contractId) await createTradeDeskScenario_FirmWithWorkingContract(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;
    case "firm-final-contract":
      if (contractId) await createTradeDeskScenario_FirmWithFinalContract(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;
    case "firm-rejected-contract":
      if (contractId) await createTradeDeskScenario_SubsFailed(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;

    // On-subs negotiation with contract scenarios
    case "on-subs-draft-contract":
      if (contractId) await createTradeDeskScenario_OnSubsWithDraftContract(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;
    case "on-subs-working-contract":
      if (contractId) await createTradeDeskScenario_OnSubsWithWorkingContract(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;
    case "on-subs-final-contract":
      if (contractId) await createTradeDeskScenario_OnSubsWithFinalContract(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;

    // Fixed negotiation scenario (always has final contract)
    case "fixed-final-contract":
      if (contractId) await createTradeDeskScenario_FixedWithFinalContract(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;

    // Failed scenarios
    case "subs-failed":
      if (contractId) await createTradeDeskScenario_SubsFailed(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;
    case "subs-expired":
      await createTradeDeskScenario_ExpiredOffer(ctx, orderId, negotiationId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;

    // Amendment scenarios (note: we don't have specific amendment functions yet, use firm scenarios)
    case "amendment-in-progress":
    case "on-subs-amendment-working":
      if (contractId) await createTradeDeskScenario_FirmWithWorkingContract(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;
    case "amendment-completed":
    case "on-subs-amendment-final":
      if (contractId) await createTradeDeskScenario_FirmWithFinalContract(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      break;

    default:
      // Default to firm with final contract
      if (contractId) {
        await createTradeDeskScenario_FirmWithFinalContract(ctx, orderId, negotiationId, contractId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      } else {
        await createTradeDeskScenario_NegotiationFirm(ctx, orderId, negotiationId, userId, counterpartyUserId, daysAgoOffset, baseNow);
      }
  }
}

// Attach logs to Out of Trade fixtures (no orderId)
async function attachOutOfTradeLogs(
  ctx: MutationCtx,
  fixture: any,
  userId: Id<"users">,
  baseNow: number
) {
  // Find direct contract for this fixture (use index to avoid full table scan)
  const contract = await ctx.db
    .query("contracts")
    .withIndex("by_fixture", (q) => q.eq("fixtureId", fixture._id))
    .first();

  if (!contract || contract.negotiationId) return; // Skip if no contract or has negotiation

  // Calculate daysAgoOffset based on fixture creation time
  const DAY = 24 * 60 * 60 * 1000;
  const daysAgoOffset = Math.floor((baseNow - fixture.createdAt) / DAY);

  // Pick scenario based on contract status and approval status
  const scenario = selectOutOfTradeScenario(contract.status, contract.approvalStatus);

  // Apply the chosen scenario
  await applyOutOfTradeScenario(ctx, scenario, contract._id, userId, daysAgoOffset, baseNow);
}

// Select Out of Trade scenario based on current status (status-first approach)
function selectOutOfTradeScenario(
  contractStatus: string,
  approvalStatus: string | undefined
): string {
  // Draft - just created
  if (contractStatus === "draft") {
    return "draft-only";
  }

  // Working copy - in review/editing
  if (contractStatus === "working-copy") {
    if (approvalStatus === "Pending approval") {
      return "under-review";
    }
    return "working-copy-only";
  }

  // Final - signed and completed
  if (contractStatus === "final") {
    if (approvalStatus === "Approved") {
      return "approved-and-signed";
    }
    if (approvalStatus === "Signed") {
      // Add variety: 30% quick sign, 70% standard path
      return Math.random() < 0.3 ? "direct-sign-quick" : "direct-sign";
    }
  }

  // Rejected
  if (contractStatus === "rejected") {
    return "rejected-contract";
  }

  // Default fallback
  return "draft-only";
}

// Apply Out of Trade scenario (status-aware)
async function applyOutOfTradeScenario(
  ctx: MutationCtx,
  scenario: string,
  contractId: Id<"contracts">,
  userId: Id<"users">,
  daysAgoOffset: number,
  baseNow: number
) {
  switch (scenario) {
    case "draft-only":
      await createOutOfTradeScenario_DraftContract(ctx, contractId, userId, daysAgoOffset, baseNow);
      break;
    case "working-copy-only":
      await createOutOfTradeScenario_WorkingCopyContract(ctx, contractId, userId, daysAgoOffset, baseNow);
      break;
    case "under-review":
      await createOutOfTradeScenario_UnderReview(ctx, contractId, userId, daysAgoOffset, baseNow);
      break;
    case "approved-and-signed":
      await createOutOfTradeScenario_ApprovedAndSigned(ctx, contractId, userId, daysAgoOffset, baseNow);
      break;
    case "direct-sign":
    case "direct-sign-quick":
      await createOutOfTradeScenario_DirectSign(ctx, contractId, userId, daysAgoOffset, baseNow);
      break;
    case "rejected-contract":
      await createOutOfTradeScenario_Rejected(ctx, contractId, userId, daysAgoOffset, baseNow);
      break;
    default:
      // Default to draft only
      await createOutOfTradeScenario_DraftContract(ctx, contractId, userId, daysAgoOffset, baseNow);
  }
}

// Master migration function
export const migrateAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Get first user and organization
    const user = await ctx.db.query("users").first();
    if (!user) {
      throw new Error("No users found. Please create a user first.");
    }

    const organization = await ctx.db.query("organizations").first();
    if (!organization) {
      throw new Error("No organizations found. Please create an organization first.");
    }

    // Check if migration already ran
    const existingOrders = await ctx.db.query("orders").first();
    if (existingOrders) {
      return {
        success: false,
        message: "Migration already ran. Database contains orders.",
        alreadyMigrated: true,
      };
    }

    try {
      // Migrate Trade Desk data (orders + negotiations)
      const tradeDeskResult = await migrateTradeDeskDataInternal(ctx, organization._id, user._id);

      // Migrate Fixtures data (contracts + recap managers)
      // Pass contract count from Trade Desk to avoid duplicate CP numbers
      const fixturesResult = await migrateFixturesDataInternal(
        ctx,
        user._id,
        tradeDeskResult.contractsCreated
      );

      return {
        success: true,
        message: "Migration completed successfully",
        results: {
          ordersCreated: tradeDeskResult.ordersCreated,
          negotiationsCreated: tradeDeskResult.negotiationsCreated,
          contractsCreated: (tradeDeskResult.contractsCreated || 0) + (fixturesResult.contractsCreated || 0),
          fixturesCreated: (tradeDeskResult.fixturesCreated || 0) + (fixturesResult.fixturesCreated || 0),
          recapManagersCreated: fixturesResult.recapManagersCreated,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Migration failed: ${error}`,
      };
    }
  },
});

// Check migration status
export const checkMigrationStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const ordersCount = (await ctx.db.query("orders").collect()).length;
    const negotiationsCount = (await ctx.db.query("negotiations").collect()).length;
    const contractsCount = (await ctx.db.query("contracts").collect()).length;
    const recapsCount = (await ctx.db.query("recap_managers").collect()).length;

    return {
      isMigrated: ordersCount > 0,
      counts: {
        orders: ordersCount,
        negotiations: negotiationsCount,
        contracts: contractsCount,
        recapManagers: recapsCount,
      },
    };
  },
});

// Verify unique CP IDs
export const verifyUniqueCPIDs = mutation({
  args: {},
  handler: async (ctx) => {
    const contracts = await ctx.db.query("contracts").collect();

    // Group by contractNumber
    const cpGroups: Record<string, any[]> = {};
    contracts.forEach((contract) => {
      const cpNum = contract.contractNumber;
      if (!cpGroups[cpNum]) {
        cpGroups[cpNum] = [];
      }
      cpGroups[cpNum].push(contract);
    });

    // Find duplicates
    const duplicates = Object.entries(cpGroups).filter(([_, contracts]) => contracts.length > 1);

    // Get CP number range
    const cpNumbers = contracts.map((c) => parseInt(c.contractNumber.replace("CP", "")));
    const minCP = cpNumbers.length > 0 ? Math.min(...cpNumbers) : 0;
    const maxCP = cpNumbers.length > 0 ? Math.max(...cpNumbers) : 0;

    return {
      totalContracts: contracts.length,
      uniqueCPIDs: Object.keys(cpGroups).length,
      duplicateCount: duplicates.length,
      duplicates: duplicates.map(([cpNum, contracts]) => ({
        cpNumber: cpNum,
        count: contracts.length,
        fixtureIds: contracts.map((c) => c.fixtureId),
      })),
      range: {
        min: `CP${minCP}`,
        max: `CP${maxCP}`,
        span: maxCP - minCP + 1,
        gaps: (maxCP - minCP + 1) - contracts.length,
      },
    };
  },
});

// Backfill activity logs for existing fixtures
export const backfillActivityLogs = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    if (users.length === 0) {
      throw new Error("No users found");
    }

    const mainUser = users[0];
    const counterpartyUser = users.length > 1 ? users[1] : users[0];

    // Get all contracts with orders and negotiations
    const contracts = await ctx.db.query("contracts").collect();
    const contractsWithOrdersAndNegotiations = contracts.filter(
      (c) => c.orderId && c.negotiationId
    );

    console.log(`Found ${contractsWithOrdersAndNegotiations.length} contracts with full lifecycle`);

    let activityLogsCreated = 0;

    for (const contract of contractsWithOrdersAndNegotiations) {
      if (!contract.orderId || !contract.negotiationId) continue;

      // Create activity logs for this contract's lifecycle
      try {
        // Order lifecycle
        await logActivity(
          ctx,
          "order",
          contract.orderId,
          "created",
          "Created order draft",
          { value: "draft", label: "Draft" },
          undefined,
          mainUser._id
        );
        activityLogsCreated++;

        await logActivity(
          ctx,
          "order",
          contract.orderId,
          "distributed",
          "Distributed the order to the market",
          { value: "distributed", label: "Distributed" },
          undefined,
          mainUser._id
        );
        activityLogsCreated++;

        // Negotiation lifecycle
        await logActivity(
          ctx,
          "negotiation",
          contract.negotiationId,
          "sent",
          "Sent indicative offer",
          { value: "indicative-offer", label: "Indicative offer" },
          undefined,
          mainUser._id
        );
        activityLogsCreated++;

        await logActivity(
          ctx,
          "negotiation",
          contract.negotiationId,
          "sent",
          "Sent indicative bid",
          { value: "indicative-bid", label: "Indicative bid" },
          undefined,
          counterpartyUser._id
        );
        activityLogsCreated++;

        await logActivity(
          ctx,
          "negotiation",
          contract.negotiationId,
          "sent",
          "Sent firm offer",
          { value: "firm-offer", label: "Firm offer" },
          undefined,
          mainUser._id
        );
        activityLogsCreated++;

        await logActivity(
          ctx,
          "negotiation",
          contract.negotiationId,
          "sent",
          "Sent firm bid",
          { value: "firm-bid", label: "Firm bid" },
          undefined,
          counterpartyUser._id
        );
        activityLogsCreated++;

        await logActivity(
          ctx,
          "negotiation",
          contract.negotiationId,
          "accepted",
          "Accepted firm bid. Offer is now firm",
          { value: "firm", label: "Firm" },
          undefined,
          mainUser._id
        );
        activityLogsCreated++;

        await logActivity(
          ctx,
          "negotiation",
          contract.negotiationId,
          "on-subs",
          "Went on subs",
          { value: "on-subs", label: "On Subs" },
          undefined,
          mainUser._id
        );
        activityLogsCreated++;

        await logActivity(
          ctx,
          "negotiation",
          contract.negotiationId,
          "fixed",
          "Set negotiation as fixed",
          { value: "fixed", label: "Fixed" },
          undefined,
          mainUser._id
        );
        activityLogsCreated++;

        // Contract lifecycle
        await logActivity(
          ctx,
          "contract",
          contract._id,
          "created",
          "Contract draft was created",
          { value: "draft", label: "Draft" }
        );
        activityLogsCreated++;

        await logActivity(
          ctx,
          "contract",
          contract._id,
          "status-changed",
          "Changed contract status to working copy",
          { value: "working-copy", label: "Working copy" },
          undefined,
          mainUser._id
        );
        activityLogsCreated++;

        await logActivity(
          ctx,
          "contract",
          contract._id,
          "signed",
          "Signed the contract. Status is now final",
          { value: "final", label: "Final" },
          undefined,
          mainUser._id
        );
        activityLogsCreated++;
      } catch (error) {
        console.error(`Error creating activity logs for contract ${contract._id}:`, error);
      }
    }

    return {
      success: true,
      contractsProcessed: contractsWithOrdersAndNegotiations.length,
      activityLogsCreated,
    };
  },
});

// Clear one batch of trading data - call repeatedly until empty
export const clearTradingDataBatch = mutation({
  args: {},
  handler: async (ctx) => {
    const BATCH_SIZE = 50;

    // Tables in reverse dependency order
    const tables = [
      "recap_addenda",
      "contract_addenda",
      "voyages",
      "recap_managers",
      "contracts",
      "fixtures",
      "negotiations",
      "orders",
      "field_changes",
      "activity_logs",
    ];

    // Try to delete a batch from the first non-empty table
    for (const tableName of tables) {
      const batch = await ctx.db.query(tableName as any).take(BATCH_SIZE);
      if (batch.length > 0) {
        for (const record of batch) {
          await ctx.db.delete(record._id);
        }
        return {
          success: true,
          table: tableName,
          deleted: batch.length,
          moreToDelete: true,
        };
      }
    }

    // All tables are empty
    return {
      success: true,
      table: null,
      deleted: 0,
      moreToDelete: false,
    };
  },
});
// Clear all trading data including vessels (use with caution!)
export const clearAllTradingData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear in reverse dependency order
    const recapAddenda = await ctx.db.query("recap_addenda").collect();
    for (const addendum of recapAddenda) {
      await ctx.db.delete(addendum._id);
    }

    const contractAddenda = await ctx.db.query("contract_addenda").collect();
    for (const addendum of contractAddenda) {
      await ctx.db.delete(addendum._id);
    }

    const voyages = await ctx.db.query("voyages").collect();
    for (const voyage of voyages) {
      await ctx.db.delete(voyage._id);
    }

    const recaps = await ctx.db.query("recap_managers").collect();
    for (const recap of recaps) {
      await ctx.db.delete(recap._id);
    }

    const contracts = await ctx.db.query("contracts").collect();
    for (const contract of contracts) {
      await ctx.db.delete(contract._id);
    }

    // Clear fixtures (after contracts are deleted)
    const fixtures = await ctx.db.query("fixtures").collect();
    for (const fixture of fixtures) {
      await ctx.db.delete(fixture._id);
    }

    const negotiations = await ctx.db.query("negotiations").collect();
    for (const negotiation of negotiations) {
      await ctx.db.delete(negotiation._id);
    }

    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      await ctx.db.delete(order._id);
    }

    // Clear vessels (after all dependencies are deleted)
    const vessels = await ctx.db.query("vessels").collect();
    for (const vessel of vessels) {
      await ctx.db.delete(vessel._id);
    }

    // Clear audit logs
    const fieldChanges = await ctx.db.query("field_changes").collect();
    for (const change of fieldChanges) {
      await ctx.db.delete(change._id);
    }

    const activityLogs = await ctx.db.query("activity_logs").collect();
    for (const log of activityLogs) {
      await ctx.db.delete(log._id);
    }

    return {
      success: true,
      message: "All trading data cleared including vessels",
    };
  },
});

/**
 * Backfill existing contracts with approval/signature data and analytics
 * This mutation parses activity logs to extract historical approval/signature events
 * and creates records in the new tables
 */
export const backfillFixtureData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting backfill migration...");

    let contractsProcessed = 0;
    let approvalsCreated = 0;
    let signaturesCreated = 0;
    let negotiationsProcessed = 0;

    // Get all contracts
    const contracts = await ctx.db.query("contracts").collect();

    for (const contract of contracts) {
      // Get activity logs for this contract
      const activityLogs = await ctx.db
        .query("activity_logs")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "contract").eq("entityId", contract._id)
        )
        .collect();

      // Sort logs by timestamp
      const sortedLogs = activityLogs.sort((a, b) => a.timestamp - b.timestamp);

      // Extract workflow dates from activity logs
      let workingCopyDate: number | undefined;
      let finalDate: number | undefined;
      let fullySignedDate: number | undefined;

      for (const log of sortedLogs) {
        if (
          log.status &&
          log.status.value === "contract-working-copy" &&
          !workingCopyDate
        ) {
          workingCopyDate = log.timestamp;
        }
        if (log.status && log.status.value === "contract-final" && !finalDate) {
          finalDate = log.timestamp;
        }
        if (log.status && log.status.value === "contract-fully-signed" && !fullySignedDate) {
          fullySignedDate = log.timestamp;
        }
      }

      // Update contract with workflow dates if found
      if (workingCopyDate || finalDate || fullySignedDate) {
        await ctx.db.patch(contract._id, {
          workingCopyDate,
          finalDate,
          fullySignedDate,
        });
      }

      // Check if approvals/signatures already exist
      const existingApprovals = await ctx.db
        .query("contract_approvals")
        .withIndex("by_contract", (q) => q.eq("contractId", contract._id))
        .collect();

      const existingSignatures = await ctx.db
        .query("contract_signatures")
        .withIndex("by_contract", (q) => q.eq("contractId", contract._id))
        .collect();

      // Only create if they don't exist
      if (existingApprovals.length === 0 && existingSignatures.length === 0) {

        // Create approval records based on contract parties
        const now = Date.now();
        const approvalStatus =
          contract.status === "final" ? "approved" : "pending";

        if (contract.ownerId) {
          await ctx.db.insert("contract_approvals", {
            contractId: contract._id,
            partyRole: "owner",
            companyId: contract.ownerId,
            status: approvalStatus,
            approvedBy: undefined, // Historical data - user unknown
            approvedAt:
              approvalStatus === "approved" ? workingCopyDate || now : undefined,
            createdAt: contract.createdAt,
            updatedAt: now,
          });
          approvalsCreated++;
        }

        if (contract.chartererId) {
          await ctx.db.insert("contract_approvals", {
            contractId: contract._id,
            partyRole: "charterer",
            companyId: contract.chartererId,
            status: approvalStatus,
            approvedBy: undefined, // Historical data - user unknown
            approvedAt:
              approvalStatus === "approved" ? workingCopyDate || now : undefined,
            createdAt: contract.createdAt,
            updatedAt: now,
          });
          approvalsCreated++;
        }

        // Create signature records based on contract parties
        const signatureStatus =
          contract.status === "final" ? "signed" : "pending";

        if (contract.ownerId) {
          await ctx.db.insert("contract_signatures", {
            contractId: contract._id,
            partyRole: "owner",
            companyId: contract.ownerId,
            status: signatureStatus,
            signedBy: undefined, // Historical data - user unknown
            signedAt:
              signatureStatus === "signed" ? finalDate || now : undefined,
            signingMethod:
              signatureStatus === "signed" ? "Manual" : undefined,
            createdAt: contract.createdAt,
            updatedAt: now,
          });
          signaturesCreated++;
        }

        if (contract.chartererId) {
          await ctx.db.insert("contract_signatures", {
            contractId: contract._id,
            partyRole: "charterer",
            companyId: contract.chartererId,
            status: signatureStatus,
            signedBy: undefined, // Historical data - user unknown
            signedAt:
              signatureStatus === "signed" ? finalDate || now : undefined,
            signingMethod:
              signatureStatus === "signed" ? "Manual" : undefined,
            createdAt: contract.createdAt,
            updatedAt: now,
          });
          signaturesCreated++;
        }
      }

      contractsProcessed++;
    }

    // Recompute analytics for all negotiations
    const negotiations = await ctx.db.query("negotiations").collect();

    for (const negotiation of negotiations) {
      // Check if analytics already exist
      if (
        !negotiation.highestFreightRateIndication &&
        !negotiation.lowestFreightRateIndication
      ) {
        // Extract freight rates from logs (simplified - real implementation would parse expandable data)
        const freightRates: Array<{ value: number; timestamp: number }> = [];
        const demurrageRates: Array<{ value: number; timestamp: number }> = [];

        // If we have current freight/demurrage rates, use them as baseline
        if (negotiation.freightRate) {
          const freightNum = parseFloat(
            negotiation.freightRate.replace(/[^0-9.]/g, "")
          );
          if (!isNaN(freightNum)) {
            freightRates.push({
              value: freightNum,
              timestamp: negotiation.updatedAt,
            });
          }
        }

        if (negotiation.demurrageRate) {
          const demurrageNum = parseFloat(
            negotiation.demurrageRate.replace(/[^0-9.]/g, "")
          );
          if (!isNaN(demurrageNum)) {
            demurrageRates.push({
              value: demurrageNum,
              timestamp: negotiation.updatedAt,
            });
          }
        }

        // Calculate analytics if we have data
        if (freightRates.length > 0) {
          const values = freightRates.map((r) => r.value);
          await ctx.db.patch(negotiation._id, {
            highestFreightRateIndication: Math.max(...values),
            lowestFreightRateIndication: Math.min(...values),
            firstFreightRateIndication: freightRates[0].value,
            updatedAt: Date.now(),
          });
        }

        if (demurrageRates.length > 0) {
          const values = demurrageRates.map((r) => r.value);
          await ctx.db.patch(negotiation._id, {
            highestDemurrageIndication: Math.max(...values),
            lowestDemurrageIndication: Math.min(...values),
            firstDemurrageIndication: demurrageRates[0].value,
            updatedAt: Date.now(),
          });
        }

        negotiationsProcessed++;
      }
    }

    console.log(
      `✅ Backfill complete: ${contractsProcessed} contracts, ${approvalsCreated} approvals, ${signaturesCreated} signatures, ${negotiationsProcessed} negotiations`
    );

    return {
      success: true,
      contractsProcessed,
      approvalsCreated,
      signaturesCreated,
      negotiationsProcessed,
    };
  },
});

