import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Generate fixture number (FIX12345)
function generateFixtureNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `FIX${randomNum}`;
}

// Internal helper function to recalculate and update fixture's lastUpdated
// This should be called whenever contracts, recap managers, or negotiations are modified
async function calculateFixtureLastUpdated(
  ctx: MutationCtx,
  fixtureId: Id<"fixtures">
): Promise<number> {
  const fixture = await ctx.db.get(fixtureId);
  if (!fixture) {
    throw new Error("Fixture not found");
  }

  // Get contracts for this fixture
  const contracts = await ctx.db
    .query("contracts")
    .withIndex("by_fixture", (q) => q.eq("fixtureId", fixtureId))
    .collect();

  // Get recap managers for this fixture
  const recapManagers = await ctx.db
    .query("recap_managers")
    .withIndex("by_fixture", (q) => q.eq("fixtureId", fixtureId))
    .collect();

  // Get negotiations via the order (if exists)
  let negotiations: { updatedAt?: number; createdAt?: number; _creationTime: number }[] = [];
  if (fixture.orderId) {
    negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_order", (q) => q.eq("orderId", fixture.orderId!))
      .collect();
  }

  // Calculate max timestamp from related entities only (NOT fixture's own timestamps)
  // This aligns with what the UI displays (contract-level dates)
  //
  // IMPORTANT: Use updatedAt ONLY (not _creationTime) because:
  // - _creationTime is when the Convex document was created (e.g., when seed ran recently)
  // - updatedAt is the logical timestamp set by business logic (e.g., seed data dates)
  // - For sorting, we want the logical business date, not the database creation time
  // - _creationTime would be larger (more recent) but represent the wrong time
  const timestamps: number[] = [];

  // Collect updatedAt from contracts (fall back to createdAt if no updatedAt)
  for (const c of contracts) {
    if (c.updatedAt !== undefined) {
      timestamps.push(c.updatedAt);
    } else if (c.createdAt !== undefined) {
      timestamps.push(c.createdAt);
    }
  }

  // Collect updatedAt from recap managers
  for (const r of recapManagers) {
    if (r.updatedAt !== undefined) {
      timestamps.push(r.updatedAt);
    } else if (r.createdAt !== undefined) {
      timestamps.push(r.createdAt);
    }
  }

  // Collect updatedAt from negotiations
  for (const n of negotiations) {
    if (n.updatedAt !== undefined) {
      timestamps.push(n.updatedAt);
    } else if (n.createdAt !== undefined) {
      timestamps.push(n.createdAt);
    }
  }

  // If no related entities exist or none have timestamps, fall back to fixture's createdAt
  return timestamps.length > 0
    ? Math.max(...timestamps)
    : fixture.createdAt ?? fixture._creationTime;
}

// Public mutation to manually recalculate lastUpdated (for backfill or debugging)
export const recalculateLastUpdated = mutation({
  args: { fixtureId: v.id("fixtures") },
  handler: async (ctx, args) => {
    const lastUpdated = await calculateFixtureLastUpdated(ctx, args.fixtureId);
    await ctx.db.patch(args.fixtureId, { lastUpdated });
    return lastUpdated;
  },
});

// Backfill mutation to populate lastUpdated for all existing fixtures
export const backfillLastUpdated = mutation({
  args: {},
  handler: async (ctx) => {
    const fixtures = await ctx.db.query("fixtures").collect();
    let updated = 0;

    for (const fixture of fixtures) {
      const lastUpdated = await calculateFixtureLastUpdated(ctx, fixture._id);
      await ctx.db.patch(fixture._id, { lastUpdated });
      updated++;
    }

    return { updated, message: `Updated lastUpdated for ${updated} fixtures` };
  },
});

// Create a new fixture
export const create = mutation({
  args: {
    orderId: v.optional(v.id("orders")),
    title: v.optional(v.string()),
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("working-copy"),
        v.literal("final"),
        v.literal("on-subs"),
        v.literal("fully-fixed"),
        v.literal("canceled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const fixtureNumber = generateFixtureNumber();

    const fixtureId = await ctx.db.insert("fixtures", {
      fixtureNumber,
      orderId: args.orderId,
      title: args.title,
      organizationId: args.organizationId,
      status: args.status || "draft",
      lastUpdated: now, // Initialize lastUpdated to creation time
      createdAt: now,
      updatedAt: now,
    });

    return fixtureId;
  },
});

// Update fixture
export const update = mutation({
  args: {
    fixtureId: v.id("fixtures"),
    title: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("working-copy"),
        v.literal("final"),
        v.literal("on-subs"),
        v.literal("fully-fixed"),
        v.literal("canceled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { fixtureId, ...updates } = args;

    const existing = await ctx.db.get(fixtureId);
    if (!existing) {
      throw new Error("Fixture not found");
    }

    const now = Date.now();

    // Recalculate lastUpdated to include this update
    const lastUpdated = await calculateFixtureLastUpdated(ctx, fixtureId);
    const newLastUpdated = Math.max(lastUpdated, now);

    await ctx.db.patch(fixtureId, {
      ...updates,
      lastUpdated: newLastUpdated,
      updatedAt: now,
    });

    return fixtureId;
  },
});

// Delete fixture
export const remove = mutation({
  args: { fixtureId: v.id("fixtures") },
  handler: async (ctx, args) => {
    const fixture = await ctx.db.get(args.fixtureId);
    if (!fixture) {
      throw new Error("Fixture not found");
    }

    await ctx.db.delete(args.fixtureId);
  },
});

// List all fixtures
export const list = query({
  args: {},
  handler: async (ctx) => {
    const fixtures = await ctx.db.query("fixtures").collect();
    return fixtures.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get fixture by ID
export const getById = query({
  args: { fixtureId: v.id("fixtures") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fixtureId);
  },
});

// List fixtures by organization
export const listByOrganization = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const fixtures = await ctx.db
      .query("fixtures")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return fixtures.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Helper function to enrich a single fixture with all related data
async function enrichFixture(
  ctx: { db: any; storage: any },
  fixture: any
) {
  // Get contracts for this fixture
  const contracts = await ctx.db
    .query("contracts")
    .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
    .collect();

  // Get recap managers for this fixture
  const recapManagers = await ctx.db
    .query("recap_managers")
    .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
    .collect();

  // Enrich contracts with company data and avatars
  const enrichedContracts = await Promise.all(
    contracts.map(async (contract: any) => {
      const owner = contract.ownerId
        ? await ctx.db.get(contract.ownerId)
        : null;
      const charterer = contract.chartererId
        ? await ctx.db.get(contract.chartererId)
        : null;
      const broker = contract.brokerId
        ? await ctx.db.get(contract.brokerId)
        : null;
      const vessel = contract.vesselId
        ? await ctx.db.get(contract.vesselId)
        : null;
      const loadPort = contract.loadPortId
        ? await ctx.db.get(contract.loadPortId)
        : null;
      const dischargePort = contract.dischargePortId
        ? await ctx.db.get(contract.dischargePortId)
        : null;
      const cargoType = contract.cargoTypeId
        ? await ctx.db.get(contract.cargoTypeId)
        : null;
      const negotiation = contract.negotiationId
        ? await ctx.db.get(contract.negotiationId)
        : null;
      const order = contract.orderId
        ? await ctx.db.get(contract.orderId)
        : null;

      // Get avatar URLs
      const ownerWithAvatar = owner && {
        ...owner,
        avatarUrl: owner.avatar
          ? await ctx.storage.getUrl(owner.avatar)
          : null,
      };
      const chartererWithAvatar = charterer && {
        ...charterer,
        avatarUrl: charterer.avatar
          ? await ctx.storage.getUrl(charterer.avatar)
          : null,
      };
      const brokerWithAvatar = broker && {
        ...broker,
        avatarUrl: broker.avatar
          ? await ctx.storage.getUrl(broker.avatar)
          : null,
      };

      // Get contract approvals
      const approvals = await ctx.db
        .query("contract_approvals")
        .withIndex("by_contract", (q: any) => q.eq("contractId", contract._id))
        .collect();

      // Enrich approvals with company and user data
      const enrichedApprovals = await Promise.all(
        approvals.map(async (approval: any) => {
          const company = await ctx.db.get(approval.companyId);
          let user = null;
          let userAvatarUrl = null;

          if (approval.approvedBy) {
            user = await ctx.db.get(approval.approvedBy);
            if (user?.avatar) {
              userAvatarUrl = await ctx.storage.getUrl(user.avatar);
            }
          }

          let companyAvatarUrl = null;
          if (company?.avatar) {
            companyAvatarUrl = await ctx.storage.getUrl(company.avatar);
          }

          return {
            ...approval,
            company,
            companyAvatarUrl,
            user,
            userAvatarUrl,
          };
        })
      );

      // Calculate approval summary
      const approvalSummary = {
        total: approvals.length,
        approved: approvals.filter((a: any) => a.status === "approved").length,
        pending: approvals.filter((a: any) => a.status === "pending").length,
        rejected: approvals.filter((a: any) => a.status === "rejected").length,
      };

      // Get contract signatures
      const signatures = await ctx.db
        .query("contract_signatures")
        .withIndex("by_contract", (q: any) => q.eq("contractId", contract._id))
        .collect();

      // Enrich signatures with company and user data
      const enrichedSignatures = await Promise.all(
        signatures.map(async (signature: any) => {
          const company = await ctx.db.get(signature.companyId);
          let user = null;
          let userAvatarUrl = null;

          if (signature.signedBy) {
            user = await ctx.db.get(signature.signedBy);
            if (user?.avatar) {
              userAvatarUrl = await ctx.storage.getUrl(user.avatar);
            }
          }

          let companyAvatarUrl = null;
          if (company?.avatar) {
            companyAvatarUrl = await ctx.storage.getUrl(company.avatar);
          }

          let documentUrl = null;
          if (signature.documentStorageId) {
            documentUrl = await ctx.storage.getUrl(signature.documentStorageId);
          }

          return {
            ...signature,
            company,
            companyAvatarUrl,
            user,
            userAvatarUrl,
            documentUrl,
          };
        })
      );

      // Calculate signature summary
      const signatureSummary = {
        total: signatures.length,
        signed: signatures.filter((s: any) => s.status === "signed").length,
        pending: signatures.filter((s: any) => s.status === "pending").length,
        rejected: signatures.filter((s: any) => s.status === "rejected").length,
      };

      return {
        ...contract,
        owner: ownerWithAvatar,
        charterer: chartererWithAvatar,
        broker: brokerWithAvatar,
        vessel,
        loadPort,
        dischargePort,
        cargoType,
        negotiation,
        order,
        approvals: enrichedApprovals,
        approvalSummary,
        signatures: enrichedSignatures,
        signatureSummary,
      };
    })
  );

  // Enrich recap managers with company data and avatars
  const enrichedRecaps = await Promise.all(
    recapManagers.map(async (recap: any) => {
      const owner = recap.ownerId
        ? await ctx.db.get(recap.ownerId)
        : null;
      const charterer = recap.chartererId
        ? await ctx.db.get(recap.chartererId)
        : null;
      const broker = recap.brokerId
        ? await ctx.db.get(recap.brokerId)
        : null;
      const vessel = recap.vesselId
        ? await ctx.db.get(recap.vesselId)
        : null;
      const loadPort = recap.loadPortId
        ? await ctx.db.get(recap.loadPortId)
        : null;
      const dischargePort = recap.dischargePortId
        ? await ctx.db.get(recap.dischargePortId)
        : null;
      const cargoType = recap.cargoTypeId
        ? await ctx.db.get(recap.cargoTypeId)
        : null;
      const negotiation = recap.negotiationId
        ? await ctx.db.get(recap.negotiationId)
        : null;
      const order = recap.orderId
        ? await ctx.db.get(recap.orderId)
        : null;

      // Get avatar URLs
      const ownerWithAvatar = owner && {
        ...owner,
        avatarUrl: owner.avatar
          ? await ctx.storage.getUrl(owner.avatar)
          : null,
      };
      const chartererWithAvatar = charterer && {
        ...charterer,
        avatarUrl: charterer.avatar
          ? await ctx.storage.getUrl(charterer.avatar)
          : null,
      };
      const brokerWithAvatar = broker && {
        ...broker,
        avatarUrl: broker.avatar
          ? await ctx.storage.getUrl(broker.avatar)
          : null,
      };

      return {
        ...recap,
        owner: ownerWithAvatar,
        charterer: chartererWithAvatar,
        broker: brokerWithAvatar,
        vessel,
        loadPort,
        dischargePort,
        cargoType,
        negotiation,
        order,
      };
    })
  );

  // Get order if exists
  const order = fixture.orderId
    ? await ctx.db.get(fixture.orderId)
    : null;

  // Get negotiations for this fixture's order (for negotiation-only fixtures)
  let enrichedNegotiations: any[] = [];
  if (fixture.orderId) {
    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_order", (q: any) => q.eq("orderId", fixture.orderId!))
      .collect();

    // Enrich negotiations with company data
    enrichedNegotiations = await Promise.all(
      negotiations.map(async (neg: any) => {
        const counterparty = neg.counterpartyId
          ? await ctx.db.get(neg.counterpartyId)
          : null;
        const broker = neg.brokerId
          ? await ctx.db.get(neg.brokerId)
          : null;
        const vessel = neg.vesselId
          ? await ctx.db.get(neg.vesselId)
          : null;
        const personInCharge = neg.personInChargeId
          ? await ctx.db.get(neg.personInChargeId)
          : null;

        // Get avatar URLs
        const counterpartyWithAvatar = counterparty && {
          ...counterparty,
          avatarUrl: counterparty.avatar
            ? await ctx.storage.getUrl(counterparty.avatar)
            : null,
        };
        const brokerWithAvatar = broker && {
          ...broker,
          avatarUrl: broker.avatar
            ? await ctx.storage.getUrl(broker.avatar)
            : null,
        };
        const personInChargeWithAvatar = personInCharge && {
          ...personInCharge,
          avatarUrl: personInCharge.avatar
            ? await ctx.storage.getUrl(personInCharge.avatar)
            : null,
        };

        return {
          ...neg,
          counterparty: counterpartyWithAvatar,
          broker: brokerWithAvatar,
          vessel,
          personInCharge: personInChargeWithAvatar,
        };
      })
    );
  }

  return {
    ...fixture,
    order,
    contracts: enrichedContracts,
    recapManagers: enrichedRecaps,
    negotiations: enrichedNegotiations,
  };
}

// Shared args type for paginated query
const paginatedQueryArgs = {
  organizationId: v.optional(v.id("organizations")),
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
  paginationUnit: v.optional(v.union(v.literal("fixture"), v.literal("negotiation"), v.literal("contract"))),
  // Server-side filters
  status: v.optional(v.array(v.string())),
  vesselNames: v.optional(v.array(v.string())),
  ownerNames: v.optional(v.array(v.string())),
  chartererNames: v.optional(v.array(v.string())),
  dateRangeStart: v.optional(v.number()),
  dateRangeEnd: v.optional(v.number()),
  // Global search
  searchTerms: v.optional(v.array(v.string())),
  // Sorting
  sortField: v.optional(v.string()),
  sortDirection: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
};

type PaginatedQueryArgs = {
  organizationId?: Id<"organizations">;
  cursor?: string;
  limit?: number;
  paginationUnit?: "fixture" | "negotiation" | "contract";
  status?: string[];
  vesselNames?: string[];
  ownerNames?: string[];
  chartererNames?: string[];
  dateRangeStart?: number;
  dateRangeEnd?: number;
  searchTerms?: string[];
  sortField?: string;
  sortDirection?: "asc" | "desc";
};

// Helper: resolve name-based filters to ID sets (shared across pagination modes)
async function resolveNameFilters(ctx: { db: any }, args: PaginatedQueryArgs) {
  let vesselIds: Set<string> | null = null;
  if (args.vesselNames && args.vesselNames.length > 0) {
    const vesselNameSet = new Set(args.vesselNames.map(n => n.toLowerCase()));
    const vessels = await ctx.db.query("vessels").collect();
    vesselIds = new Set(
      vessels
        .filter((v: any) => vesselNameSet.has(v.name.toLowerCase()))
        .map((v: any) => v._id)
    );
  }

  let ownerIds: Set<string> | null = null;
  if (args.ownerNames && args.ownerNames.length > 0) {
    const ownerNameSet = new Set(args.ownerNames.map(n => n.toLowerCase()));
    const companies = await ctx.db.query("companies").collect();
    ownerIds = new Set(
      companies
        .filter((c: any) => ownerNameSet.has(c.name.toLowerCase()))
        .map((c: any) => c._id)
    );
  }

  let chartererIds: Set<string> | null = null;
  if (args.chartererNames && args.chartererNames.length > 0) {
    const chartererNameSet = new Set(args.chartererNames.map(n => n.toLowerCase()));
    const companies = await ctx.db.query("companies").collect();
    chartererIds = new Set(
      companies
        .filter((c: any) => chartererNameSet.has(c.name.toLowerCase()))
        .map((c: any) => c._id)
    );
  }

  return { vesselIds, ownerIds, chartererIds };
}

// Helper: load search indexes for global search
async function loadSearchIndexes(ctx: { db: any }): Promise<{
  vesselNameById: Map<string, string>;
  companyNameById: Map<string, string>;
}> {
  const allVessels = await ctx.db.query("vessels").collect();
  const allCompanies = await ctx.db.query("companies").collect();
  return {
    vesselNameById: new Map<string, string>(allVessels.map((v: any) => [v._id as string, v.name.toLowerCase() as string])),
    companyNameById: new Map<string, string>(allCompanies.map((c: any) => [c._id as string, c.name.toLowerCase() as string])),
  };
}

// Helper: check if an entity matches name-based filters
function matchesEntityFilters(
  item: { vesselId?: string; ownerId?: string; chartererId?: string },
  filters: { vesselIds: Set<string> | null; ownerIds: Set<string> | null; chartererIds: Set<string> | null }
): boolean {
  if (filters.vesselIds !== null && (!item.vesselId || !filters.vesselIds.has(item.vesselId))) return false;
  if (filters.ownerIds !== null && (!item.ownerId || !filters.ownerIds.has(item.ownerId))) return false;
  if (filters.chartererIds !== null && (!item.chartererId || !filters.chartererIds.has(item.chartererId))) return false;
  return true;
}

// Fields that require loading related tables for sorting
const LOOKUP_SORT_FIELDS = new Set([
  "loadPortName", "loadPortCountry", "dischargePortName", "dischargePortCountry",
  "vessels", "vesselImo", "owner", "broker", "charterer",
  "cargoTypeName",
]);

type SortLookups = {
  vesselById: Map<string, { name: string; imoNumber?: string }>;
  companyNameById: Map<string, string>;
  portById: Map<string, { name: string; country?: string }>;
  cargoTypeNameById: Map<string, string>;
};

async function loadSortLookups(ctx: { db: any }): Promise<SortLookups> {
  const [allVessels, allCompanies, allPorts, allCargoTypes] = await Promise.all([
    ctx.db.query("vessels").collect(),
    ctx.db.query("companies").collect(),
    ctx.db.query("ports").collect(),
    ctx.db.query("cargo_types").collect(),
  ]);
  return {
    vesselById: new Map(allVessels.map((v: any) => [v._id, { name: v.name, imoNumber: v.imoNumber }])),
    companyNameById: new Map(allCompanies.map((c: any) => [c._id, c.name])),
    portById: new Map(allPorts.map((p: any) => [p._id, { name: p.name, country: p.country }])),
    cargoTypeNameById: new Map(allCargoTypes.map((ct: any) => [ct._id, ct.name])),
  };
}

// Fields that exist only on negotiations (need negotiation lookup in contract/fixture mode)
const NEGOTIATION_SORT_FIELDS = new Set([
  "highestFreightRateIndication", "lowestFreightRateIndication", "firstFreightRateIndication",
  "highestFreightRateLastDay", "lowestFreightRateLastDay", "firstFreightRateLastDay",
  "highestDemurrageIndication", "lowestDemurrageIndication",
  "marketIndex", "marketIndexName", "grossFreight",
  "addressCommissionPercent", "addressCommissionTotal",
  "brokerCommissionPercent", "brokerCommissionTotal",
]);

// Fields that exist only on contracts (need contract lookup in fixture mode)
const CONTRACT_SORT_FIELDS = new Set([
  "loadDeliveryType", "dischargeRedeliveryType",
  "workingCopyDate", "finalDate", "fullySignedDate", "contractType",
]);

// Computed fields that need derivation from multiple sources
const COMPUTED_SORT_FIELDS = new Set([
  "freightSavingsPercent", "freightVsMarketPercent", "demurrageSavingsPercent",
  "daysToWorkingCopy", "daysToFinal", "daysToSigned",
]);

// Map accessorKey → raw DB field name for mismatched fields
function mapSortFieldToRawField(field: string): string {
  switch (field) {
    case "finalFreightRate": return "freightRate";
    case "finalDemurrageRate": return "demurrageRate";
    case "cargoQuantity": return "quantity";
    case "cpDate": return "_creationTime";
    default: return field;
  }
}

// Helper: compute derived sort value from entity + negotiation data
function computeDerivedSortValue(
  field: string,
  entity: any,
  negotiation: any,
): number | undefined {
  if (field === "freightSavingsPercent") {
    const highest = negotiation?.highestFreightRateIndication;
    const final = entity?.freightRate;
    return (highest != null && final != null && highest !== 0)
      ? ((highest - final) / highest) * 100
      : undefined;
  }
  if (field === "freightVsMarketPercent") {
    const final = entity?.freightRate;
    const market = negotiation?.marketIndex;
    return (final != null && market != null && market !== 0)
      ? ((final - market) / market) * 100
      : undefined;
  }
  if (field === "demurrageSavingsPercent") {
    const highest = negotiation?.highestDemurrageIndication;
    const final = entity?.demurrageRate;
    return (highest != null && final != null && highest !== 0)
      ? ((highest - final) / highest) * 100
      : undefined;
  }
  if (field === "daysToWorkingCopy") {
    const cp = entity?._creationTime;
    const wc = entity?.workingCopyDate;
    return (cp != null && wc != null)
      ? Math.round((wc - cp) / (1000 * 60 * 60 * 24))
      : undefined;
  }
  if (field === "daysToFinal") {
    const wc = entity?.workingCopyDate;
    const final = entity?.finalDate;
    return (wc != null && final != null)
      ? Math.round((final - wc) / (1000 * 60 * 60 * 24))
      : undefined;
  }
  if (field === "daysToSigned") {
    const final = entity?.finalDate;
    const signed = entity?.fullySignedDate;
    return (final != null && signed != null)
      ? Math.round((signed - final) / (1000 * 60 * 60 * 24))
      : undefined;
  }
  return undefined;
}


// Helper: build a sort comparator from query args
function buildSortComparator<T>(
  args: PaginatedQueryArgs,
  getFieldValue: (item: T, field: string) => string | number | undefined,
  getDefaultTime: (item: T) => number,
  getStableKey: (item: T) => string,
): (a: T, b: T) => number {
  const field = args.sortField || "lastUpdated";
  const desc = (args.sortDirection ?? "desc") === "desc";

  return (a, b) => {
    let aVal = getFieldValue(a, field);
    let bVal = getFieldValue(b, field);

    // Fallback for lastUpdated
    if (field === "lastUpdated") {
      aVal = aVal ?? getDefaultTime(a);
      bVal = bVal ?? getDefaultTime(b);
    }

    // Nulls sort last regardless of direction
    if (aVal == null && bVal == null) return getStableKey(a).localeCompare(getStableKey(b));
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    let cmp: number;
    if (typeof aVal === "number" && typeof bVal === "number") {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal).localeCompare(String(bVal));
    }

    if (cmp !== 0) return desc ? -cmp : cmp;
    return getStableKey(a).localeCompare(getStableKey(b));
  };
}

// Paginate by fixture (original behavior)
async function paginateByFixture(ctx: { db: any; storage: any }, args: PaginatedQueryArgs) {
  const limit = args.limit ?? 25;
  const orgId = args.organizationId;

  let allFixtures = orgId !== undefined
    ? await ctx.db
        .query("fixtures")
        .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
        .order("desc")
        .collect()
    : await ctx.db.query("fixtures").order("desc").collect();

  const unfilteredTotalCount = allFixtures.length;

  // Apply fixture-level status filter
  if (args.status && args.status.length > 0) {
    const statusSet = new Set(args.status);
    allFixtures = allFixtures.filter((f: any) => statusSet.has(f.status));
  }

  // Apply date range filter
  if (args.dateRangeStart !== undefined || args.dateRangeEnd !== undefined) {
    allFixtures = allFixtures.filter((f: any) => {
      const createdAt = f._creationTime;
      if (args.dateRangeStart !== undefined && createdAt < args.dateRangeStart) return false;
      if (args.dateRangeEnd !== undefined && createdAt > args.dateRangeEnd) return false;
      return true;
    });
  }

  // Apply contract-level filters (vessel, owner, charterer)
  const hasContractFilters =
    (args.vesselNames && args.vesselNames.length > 0) ||
    (args.ownerNames && args.ownerNames.length > 0) ||
    (args.chartererNames && args.chartererNames.length > 0);

  if (hasContractFilters) {
    const nameFilters = await resolveNameFilters(ctx, args);
    const filteredFixtures: typeof allFixtures = [];
    for (const fixture of allFixtures) {
      const contracts = await ctx.db
        .query("contracts")
        .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
        .collect();
      const recapManagers = await ctx.db
        .query("recap_managers")
        .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
        .collect();

      if ([...contracts, ...recapManagers].some((item: any) => matchesEntityFilters(item, nameFilters))) {
        filteredFixtures.push(fixture);
      }
    }
    allFixtures = filteredFixtures;
  }

  // Apply global search
  if (args.searchTerms && args.searchTerms.length > 0) {
    const searchTermsLower = args.searchTerms.map(t => t.toLowerCase());
    const { vesselNameById, companyNameById } = await loadSearchIndexes(ctx);
    const filteredFixtures: typeof allFixtures = [];

    for (const fixture of allFixtures) {
      const contracts = await ctx.db
        .query("contracts")
        .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
        .collect();
      const recapManagers = await ctx.db
        .query("recap_managers")
        .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
        .collect();

      const searchableFields: string[] = [fixture.fixtureNumber.toLowerCase()];
      [...contracts, ...recapManagers].forEach((item: any) => {
        if ('contractNumber' in item && item.contractNumber) searchableFields.push(item.contractNumber.toLowerCase());
        if ('recapNumber' in item && item.recapNumber) searchableFields.push(item.recapNumber.toLowerCase());
        if (item.vesselId) { const n = vesselNameById.get(item.vesselId); if (n) searchableFields.push(n); }
        if (item.ownerId) { const n = companyNameById.get(item.ownerId); if (n) searchableFields.push(n); }
        if (item.chartererId) { const n = companyNameById.get(item.chartererId); if (n) searchableFields.push(n); }
        if (item.brokerId) { const n = companyNameById.get(item.brokerId); if (n) searchableFields.push(n); }
      });

      if (searchTermsLower.every(term => searchableFields.join(' ').includes(term))) {
        filteredFixtures.push(fixture);
      }
    }
    allFixtures = filteredFixtures;
  }

  // Load lookup data for sorting by related fields
  const sortField = args.sortField ?? "";
  const needsLookups = LOOKUP_SORT_FIELDS.has(sortField);
  const lookups = needsLookups ? await loadSortLookups(ctx) : null;

  // For fixture mode, load representative contract + negotiation per fixture for related-field sorting
  const needsEntityData = needsLookups || NEGOTIATION_SORT_FIELDS.has(sortField)
    || CONTRACT_SORT_FIELDS.has(sortField) || COMPUTED_SORT_FIELDS.has(sortField);
  let fixtureEntityMap: Map<string, { contract: any; negotiation: any }> | null = null;
  if (needsEntityData) {
    fixtureEntityMap = new Map();
    for (const fixture of allFixtures) {
      const contracts = await ctx.db
        .query("contracts")
        .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
        .take(1);
      let contract = contracts.length > 0 ? contracts[0] : null;
      if (!contract) {
        const recaps = await ctx.db
          .query("recap_managers")
          .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
          .take(1);
        contract = recaps.length > 0 ? recaps[0] : null;
      }
      const negotiation = contract?.negotiationId
        ? await ctx.db.get(contract.negotiationId)
        : null;
      fixtureEntityMap.set(fixture._id, { contract, negotiation });
    }
  }

  // Sort by requested field (default: lastUpdated desc)
  allFixtures.sort(buildSortComparator<any>(
    args,
    (f, field) => {
      if (field === "lastUpdated") return f.lastUpdated ?? f._creationTime;
      if (field === "fixtureId") return f.fixtureNumber;
      // Related-field sorting via representative contract/recap
      const entityData = fixtureEntityMap?.get(f._id);
      const entity = entityData?.contract;
      const neg = entityData?.negotiation;
      if (field === "loadPortName") return entity?.loadPortId ? lookups?.portById.get(entity.loadPortId)?.name : undefined;
      if (field === "loadPortCountry") return entity?.loadPortId ? lookups?.portById.get(entity.loadPortId)?.country : undefined;
      if (field === "dischargePortName") return entity?.dischargePortId ? lookups?.portById.get(entity.dischargePortId)?.name : undefined;
      if (field === "dischargePortCountry") return entity?.dischargePortId ? lookups?.portById.get(entity.dischargePortId)?.country : undefined;
      if (field === "vessels") return entity?.vesselId ? lookups?.vesselById.get(entity.vesselId)?.name : undefined;
      if (field === "vesselImo") return entity?.vesselId ? lookups?.vesselById.get(entity.vesselId)?.imoNumber : undefined;
      if (field === "owner") return entity?.ownerId ? lookups?.companyNameById.get(entity.ownerId) : undefined;
      if (field === "charterer") return entity?.chartererId ? lookups?.companyNameById.get(entity.chartererId) : undefined;
      if (field === "broker") return entity?.brokerId ? lookups?.companyNameById.get(entity.brokerId) : undefined;
      if (field === "cargoTypeName") return entity?.cargoTypeId ? lookups?.cargoTypeNameById.get(entity.cargoTypeId) : undefined;
      // Negotiation-only fields
      if (NEGOTIATION_SORT_FIELDS.has(field)) return neg?.[field];
      // Contract-only fields
      if (CONTRACT_SORT_FIELDS.has(field)) return entity?.[field];
      // Computed fields
      if (COMPUTED_SORT_FIELDS.has(field)) return computeDerivedSortValue(field, entity, neg);
      // Field name mapping for mismatches (e.g. finalFreightRate → freightRate)
      return entity?.[mapSortFieldToRawField(field)] ?? f[mapSortFieldToRawField(field)];
    },
    (f) => f._creationTime,
    (f) => f._id,
  ));

  // Cursor pagination
  let startIndex = 0;
  if (args.cursor) {
    const cursorIndex = allFixtures.findIndex((f: any) => f._id === args.cursor);
    if (cursorIndex !== -1) startIndex = cursorIndex + 1;
  }

  const pageFixtures = allFixtures.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < allFixtures.length;
  const nextCursor = pageFixtures.length > 0 ? pageFixtures[pageFixtures.length - 1]._id : null;

  const enrichedFixtures = await Promise.all(
    pageFixtures.map(async (fixture: any) => {
      const enriched = await enrichFixture(ctx, fixture);
      return { ...enriched, lastUpdated: fixture.lastUpdated ?? fixture._creationTime };
    })
  );

  return {
    items: enrichedFixtures,
    nextCursor,
    hasMore,
    totalCount: allFixtures.length,
    unfilteredTotalCount,
  };
}

// Paginate by negotiation — each page item is a negotiation
async function paginateByNegotiation(ctx: { db: any; storage: any }, args: PaginatedQueryArgs) {
  const limit = args.limit ?? 25;
  const orgId = args.organizationId;

  // Get all fixtures for org
  const allFixtures = orgId !== undefined
    ? await ctx.db
        .query("fixtures")
        .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
        .collect()
    : await ctx.db.query("fixtures").collect();

  // Build flat list of negotiation tuples
  type NegTuple = {
    negotiation: any;
    fixture: any;
    orderId: any;
    contractEntity?: any;
    contractVesselId?: string;
    contractOwnerId?: string;
    contractChartererId?: string;
    contractLoadPortId?: string;
    contractDischargePortId?: string;
    contractBrokerId?: string;
  };
  const allNegotiations: NegTuple[] = [];

  for (const fixture of allFixtures) {
    if (!fixture.orderId) continue;
    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_order", (q: any) => q.eq("orderId", fixture.orderId))
      .collect();

    // Load contracts/recaps to get vessel/owner/charterer for linked negotiations
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
      .collect();
    const recaps = await ctx.db
      .query("recap_managers")
      .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
      .collect();

    // Map negotiationId → contract/recap entity (full entity for sort access)
    const negContractMap = new Map<string, any>();
    for (const entity of [...contracts, ...recaps]) {
      if (entity.negotiationId && !negContractMap.has(entity.negotiationId)) {
        negContractMap.set(entity.negotiationId, entity);
      }
    }

    for (const neg of negotiations) {
      const contractEntity = negContractMap.get(neg._id);
      allNegotiations.push({
        negotiation: neg,
        fixture,
        orderId: fixture.orderId,
        contractEntity,
        contractVesselId: contractEntity?.vesselId,
        contractOwnerId: contractEntity?.ownerId,
        contractChartererId: contractEntity?.chartererId,
        contractLoadPortId: contractEntity?.loadPortId,
        contractDischargePortId: contractEntity?.dischargePortId,
        contractBrokerId: contractEntity?.brokerId,
      });
    }
  }

  const unfilteredTotalCount = allNegotiations.length;

  // Apply filters
  let filtered = allNegotiations;

  // Status filter: match negotiation status directly
  if (args.status && args.status.length > 0) {
    const statusSet = new Set(args.status);
    filtered = filtered.filter(t => statusSet.has(t.negotiation.status));
  }

  // Date range filter on negotiation creation time
  if (args.dateRangeStart !== undefined || args.dateRangeEnd !== undefined) {
    filtered = filtered.filter(t => {
      const createdAt = t.negotiation._creationTime;
      if (args.dateRangeStart !== undefined && createdAt < args.dateRangeStart) return false;
      if (args.dateRangeEnd !== undefined && createdAt > args.dateRangeEnd) return false;
      return true;
    });
  }

  // Name-based filters (vessel, owner/counterparty, charterer/broker)
  const hasNameFilters =
    (args.vesselNames && args.vesselNames.length > 0) ||
    (args.ownerNames && args.ownerNames.length > 0) ||
    (args.chartererNames && args.chartererNames.length > 0);

  if (hasNameFilters) {
    const nameFilters = await resolveNameFilters(ctx, args);
    filtered = filtered.filter(t => {
      const neg = t.negotiation;
      // Vessel: check negotiation's vesselId OR linked contract's vesselId
      if (nameFilters.vesselIds !== null) {
        const effectiveVessel = neg.vesselId || t.contractVesselId;
        if (!effectiveVessel || !nameFilters.vesselIds.has(effectiveVessel)) return false;
      }
      // Owner: check linked contract's ownerId (negotiations don't have an owner)
      if (nameFilters.ownerIds !== null) {
        const effectiveOwner = t.contractOwnerId;
        if (!effectiveOwner || !nameFilters.ownerIds.has(effectiveOwner)) return false;
      }
      // Charterer: check negotiation's counterpartyId OR linked contract's chartererId
      if (nameFilters.chartererIds !== null) {
        const effectiveCharterer = neg.counterpartyId || t.contractChartererId;
        if (!effectiveCharterer || !nameFilters.chartererIds.has(effectiveCharterer)) return false;
      }
      return true;
    });
  }

  // Global search
  if (args.searchTerms && args.searchTerms.length > 0) {
    const searchTermsLower = args.searchTerms.map(t => t.toLowerCase());
    const { vesselNameById, companyNameById } = await loadSearchIndexes(ctx);

    filtered = filtered.filter(t => {
      const neg = t.negotiation;
      const fix = t.fixture;
      const fields: string[] = [fix.fixtureNumber.toLowerCase()];
      if (neg.negotiationNumber) fields.push(neg.negotiationNumber.toLowerCase());
      if (neg.vesselId) { const n = vesselNameById.get(neg.vesselId); if (n) fields.push(n); }
      if (neg.counterpartyId) { const n = companyNameById.get(neg.counterpartyId); if (n) fields.push(n); }
      if (neg.brokerId) { const n = companyNameById.get(neg.brokerId); if (n) fields.push(n); }
      return searchTermsLower.every(term => fields.join(' ').includes(term));
    });
  }

  // Load lookup data for sorting by related fields
  const sortFieldNeg = args.sortField ?? "";
  const needsLookupsNeg = LOOKUP_SORT_FIELDS.has(sortFieldNeg);
  const lookups = needsLookupsNeg ? await loadSortLookups(ctx) : null;

  // Sort by requested field (default: lastUpdated desc)
  filtered.sort(buildSortComparator<NegTuple>(
    args,
    (t, field) => {
      if (field === "lastUpdated") return t.negotiation.updatedAt ?? t.negotiation._creationTime;
      if (field === "negotiationId") return t.negotiation.negotiationNumber;
      if (field === "fixtureId") return t.fixture.fixtureNumber;
      if (field === "status") return t.negotiation.status;
      if (field === "loadPortName") {
        const id = t.contractLoadPortId;
        return id ? lookups?.portById.get(id)?.name : undefined;
      }
      if (field === "loadPortCountry") {
        const id = t.contractLoadPortId;
        return id ? lookups?.portById.get(id)?.country : undefined;
      }
      if (field === "dischargePortName") {
        const id = t.contractDischargePortId;
        return id ? lookups?.portById.get(id)?.name : undefined;
      }
      if (field === "dischargePortCountry") {
        const id = t.contractDischargePortId;
        return id ? lookups?.portById.get(id)?.country : undefined;
      }
      if (field === "vessels") {
        const id = t.negotiation.vesselId || t.contractVesselId;
        return id ? lookups?.vesselById.get(id)?.name : undefined;
      }
      if (field === "vesselImo") {
        const id = t.negotiation.vesselId || t.contractVesselId;
        return id ? lookups?.vesselById.get(id)?.imoNumber : undefined;
      }
      if (field === "owner") {
        const id = t.contractOwnerId;
        return id ? lookups?.companyNameById.get(id) : undefined;
      }
      if (field === "charterer") {
        const id = t.negotiation.counterpartyId || t.contractChartererId;
        return id ? lookups?.companyNameById.get(id) : undefined;
      }
      if (field === "broker") {
        const id = t.negotiation.brokerId || t.contractBrokerId;
        return id ? lookups?.companyNameById.get(id) : undefined;
      }
      if (field === "cargoTypeName") {
        const id = t.contractEntity?.cargoTypeId;
        return id ? lookups?.cargoTypeNameById.get(id) : undefined;
      }
      // Negotiation-only fields (direct access — negotiation is the primary entity)
      if (NEGOTIATION_SORT_FIELDS.has(field)) return t.negotiation[field];
      // Contract-only fields
      if (CONTRACT_SORT_FIELDS.has(field)) return t.contractEntity?.[field];
      // Computed fields
      if (COMPUTED_SORT_FIELDS.has(field)) return computeDerivedSortValue(field, t.contractEntity, t.negotiation);
      // Field name mapping for mismatches, check negotiation first then contract
      const rawField = mapSortFieldToRawField(field);
      return t.negotiation[rawField] ?? t.contractEntity?.[rawField];
    },
    (t) => t.negotiation._creationTime,
    (t) => t.negotiation._id,
  ));

  // Cursor pagination (cursor = negotiation _id)
  let startIndex = 0;
  if (args.cursor) {
    const cursorIndex = filtered.findIndex(t => t.negotiation._id === args.cursor);
    if (cursorIndex !== -1) startIndex = cursorIndex + 1;
  }

  const pageTuples = filtered.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < filtered.length;
  const nextCursor = pageTuples.length > 0 ? pageTuples[pageTuples.length - 1].negotiation._id : null;

  // Group paginated negotiations by fixture, then enrich each fixture
  // scoping negotiations to only those on this page
  const fixtureMap = new Map<string, { fixture: any; negotiationIds: Set<string> }>();
  for (const t of pageTuples) {
    if (!fixtureMap.has(t.fixture._id)) {
      fixtureMap.set(t.fixture._id, { fixture: t.fixture, negotiationIds: new Set() });
    }
    fixtureMap.get(t.fixture._id)!.negotiationIds.add(t.negotiation._id);
  }

  const enrichedFixtures = await Promise.all(
    Array.from(fixtureMap.values()).map(async ({ fixture, negotiationIds }) => {
      const enriched = await enrichFixture(ctx, fixture);
      // Scope: only include negotiations that are on this page
      enriched.negotiations = enriched.negotiations.filter(
        (n: any) => negotiationIds.has(n._id)
      );
      // Also scope contracts/recaps to those linked to paginated negotiations
      enriched.contracts = enriched.contracts.filter(
        (c: any) => c.negotiationId && negotiationIds.has(c.negotiationId)
      );
      enriched.recapManagers = enriched.recapManagers.filter(
        (r: any) => r.negotiationId && negotiationIds.has(r.negotiationId)
      );
      return { ...enriched, lastUpdated: fixture.lastUpdated ?? fixture._creationTime };
    })
  );

  return {
    items: enrichedFixtures,
    nextCursor,
    hasMore,
    totalCount: filtered.length,
    unfilteredTotalCount,
  };
}

// Paginate by contract — each page item is a contract or recap manager
async function paginateByContract(ctx: { db: any; storage: any }, args: PaginatedQueryArgs) {
  const limit = args.limit ?? 25;
  const orgId = args.organizationId;

  const allFixtures = orgId !== undefined
    ? await ctx.db
        .query("fixtures")
        .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
        .collect()
    : await ctx.db.query("fixtures").collect();

  // Build flat list of contract/recap tuples, deduplicating by negotiationId
  type ContractTuple = { entity: any; fixture: any; type: "c" | "r"; cursorKey: string; negotiation?: any };
  const allItems: ContractTuple[] = [];

  for (const fixture of allFixtures) {
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
      .collect();
    const recaps = await ctx.db
      .query("recap_managers")
      .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
      .collect();

    // Deduplicate: prefer contracts over recaps for same negotiationId
    const seenNegotiations = new Set<string>();
    for (const c of contracts) {
      const negId = c.negotiationId;
      if (negId) seenNegotiations.add(negId as string);
      allItems.push({ entity: c, fixture, type: "c", cursorKey: `c:${c._id}` });
    }
    for (const r of recaps) {
      const negId = r.negotiationId;
      if (negId && seenNegotiations.has(negId as string)) continue;
      if (negId) seenNegotiations.add(negId as string);
      allItems.push({ entity: r, fixture, type: "r", cursorKey: `r:${r._id}` });
    }
  }

  const unfilteredTotalCount = allItems.length;

  let filtered = allItems;

  // Status filter: match contract/recap status directly
  if (args.status && args.status.length > 0) {
    const statusSet = new Set(args.status);
    filtered = filtered.filter(t => statusSet.has(t.entity.status));
  }

  // Date range filter
  if (args.dateRangeStart !== undefined || args.dateRangeEnd !== undefined) {
    filtered = filtered.filter(t => {
      const createdAt = t.entity._creationTime;
      if (args.dateRangeStart !== undefined && createdAt < args.dateRangeStart) return false;
      if (args.dateRangeEnd !== undefined && createdAt > args.dateRangeEnd) return false;
      return true;
    });
  }

  // Name-based filters
  const hasNameFilters =
    (args.vesselNames && args.vesselNames.length > 0) ||
    (args.ownerNames && args.ownerNames.length > 0) ||
    (args.chartererNames && args.chartererNames.length > 0);

  if (hasNameFilters) {
    const nameFilters = await resolveNameFilters(ctx, args);
    filtered = filtered.filter(t => matchesEntityFilters(t.entity, nameFilters));
  }

  // Global search
  if (args.searchTerms && args.searchTerms.length > 0) {
    const searchTermsLower = args.searchTerms.map(t => t.toLowerCase());
    const { vesselNameById, companyNameById } = await loadSearchIndexes(ctx);

    filtered = filtered.filter(t => {
      const entity = t.entity;
      const fix = t.fixture;
      const fields: string[] = [fix.fixtureNumber.toLowerCase()];
      if ('contractNumber' in entity && entity.contractNumber) fields.push(entity.contractNumber.toLowerCase());
      if ('recapNumber' in entity && entity.recapNumber) fields.push(entity.recapNumber.toLowerCase());
      if (entity.vesselId) { const n = vesselNameById.get(entity.vesselId); if (n) fields.push(n); }
      if (entity.ownerId) { const n = companyNameById.get(entity.ownerId); if (n) fields.push(n); }
      if (entity.chartererId) { const n = companyNameById.get(entity.chartererId); if (n) fields.push(n); }
      if (entity.brokerId) { const n = companyNameById.get(entity.brokerId); if (n) fields.push(n); }
      return searchTermsLower.every(term => fields.join(' ').includes(term));
    });
  }

  // Load lookup data for sorting by related fields
  const sortFieldContract = args.sortField ?? "";
  const needsLookupsContract = LOOKUP_SORT_FIELDS.has(sortFieldContract);
  const lookups = needsLookupsContract ? await loadSortLookups(ctx) : null;

  // Load linked negotiations when sorting by negotiation-only or computed fields
  const needsNegotiationContract = NEGOTIATION_SORT_FIELDS.has(sortFieldContract) || COMPUTED_SORT_FIELDS.has(sortFieldContract);
  if (needsNegotiationContract) {
    for (const t of filtered) {
      if (t.entity.negotiationId) {
        t.negotiation = await ctx.db.get(t.entity.negotiationId);
      }
    }
  }

  // Sort by requested field (default: lastUpdated desc)
  filtered.sort(buildSortComparator<ContractTuple>(
    args,
    (t, field) => {
      if (field === "lastUpdated") return t.entity.updatedAt ?? t.entity._creationTime;
      if (field === "cpId") return t.entity.cpNumber;
      if (field === "fixtureId") return t.fixture.fixtureNumber;
      if (field === "status") return t.entity.status;
      if (field === "loadPortName") return t.entity.loadPortId ? lookups?.portById.get(t.entity.loadPortId)?.name : undefined;
      if (field === "loadPortCountry") return t.entity.loadPortId ? lookups?.portById.get(t.entity.loadPortId)?.country : undefined;
      if (field === "dischargePortName") return t.entity.dischargePortId ? lookups?.portById.get(t.entity.dischargePortId)?.name : undefined;
      if (field === "dischargePortCountry") return t.entity.dischargePortId ? lookups?.portById.get(t.entity.dischargePortId)?.country : undefined;
      if (field === "vessels") return t.entity.vesselId ? lookups?.vesselById.get(t.entity.vesselId)?.name : undefined;
      if (field === "vesselImo") return t.entity.vesselId ? lookups?.vesselById.get(t.entity.vesselId)?.imoNumber : undefined;
      if (field === "owner") return t.entity.ownerId ? lookups?.companyNameById.get(t.entity.ownerId) : undefined;
      if (field === "charterer") return t.entity.chartererId ? lookups?.companyNameById.get(t.entity.chartererId) : undefined;
      if (field === "broker") return t.entity.brokerId ? lookups?.companyNameById.get(t.entity.brokerId) : undefined;
      if (field === "cargoTypeName") return t.entity.cargoTypeId ? lookups?.cargoTypeNameById.get(t.entity.cargoTypeId) : undefined;
      // Negotiation-only fields (load from linked negotiation)
      if (NEGOTIATION_SORT_FIELDS.has(field)) return t.negotiation?.[field];
      // Contract-only fields (direct access — entity IS a contract/recap)
      if (CONTRACT_SORT_FIELDS.has(field)) return t.entity[field];
      // Computed fields
      if (COMPUTED_SORT_FIELDS.has(field)) return computeDerivedSortValue(field, t.entity, t.negotiation);
      // Field name mapping for mismatches
      return t.entity[mapSortFieldToRawField(field)];
    },
    (t) => t.entity._creationTime,
    (t) => t.cursorKey,
  ));

  // Cursor pagination (composite cursor: "c:{id}" or "r:{id}")
  let startIndex = 0;
  if (args.cursor) {
    const cursorIndex = filtered.findIndex(t => t.cursorKey === args.cursor);
    if (cursorIndex !== -1) startIndex = cursorIndex + 1;
  }

  const pageTuples = filtered.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < filtered.length;
  const nextCursor = pageTuples.length > 0 ? pageTuples[pageTuples.length - 1].cursorKey : null;

  // Group by fixture, scope to only paginated entities
  const fixtureMap = new Map<string, { fixture: any; contractIds: Set<string>; recapIds: Set<string> }>();
  for (const t of pageTuples) {
    if (!fixtureMap.has(t.fixture._id)) {
      fixtureMap.set(t.fixture._id, { fixture: t.fixture, contractIds: new Set(), recapIds: new Set() });
    }
    const entry = fixtureMap.get(t.fixture._id)!;
    if (t.type === "c") entry.contractIds.add(t.entity._id);
    else entry.recapIds.add(t.entity._id);
  }

  const enrichedFixtures = await Promise.all(
    Array.from(fixtureMap.values()).map(async ({ fixture, contractIds, recapIds }) => {
      const enriched = await enrichFixture(ctx, fixture);
      // Scope to only paginated contracts/recaps
      enriched.contracts = enriched.contracts.filter((c: any) => contractIds.has(c._id));
      enriched.recapManagers = enriched.recapManagers.filter((r: any) => recapIds.has(r._id));
      // Scope negotiations to those linked to paginated contracts/recaps
      const negIds = new Set<string>();
      enriched.contracts.forEach((c: any) => { if (c.negotiationId) negIds.add(c.negotiationId); });
      enriched.recapManagers.forEach((r: any) => { if (r.negotiationId) negIds.add(r.negotiationId); });
      enriched.negotiations = enriched.negotiations.filter((n: any) => negIds.has(n._id));
      return { ...enriched, lastUpdated: fixture.lastUpdated ?? fixture._creationTime };
    })
  );

  return {
    items: enrichedFixtures,
    nextCursor,
    hasMore,
    totalCount: filtered.length,
    unfilteredTotalCount,
  };
}

// List fixtures with enriched data - PAGINATED VERSION
// Returns cursor-based pagination for better performance with large datasets
// paginationUnit controls what entity drives pagination:
//   "fixture" (default) — paginate by fixtures
//   "negotiation" — paginate by negotiations
//   "contract" — paginate by contracts/recap managers
export const listEnrichedPaginated = query({
  args: paginatedQueryArgs,
  handler: async (ctx, args) => {
    const unit = args.paginationUnit ?? "fixture";
    if (unit === "negotiation") return paginateByNegotiation(ctx, args);
    if (unit === "contract") return paginateByContract(ctx, args);
    return paginateByFixture(ctx, args);
  },
});

// List all fixtures with enriched contract data and company avatars
// NOTE: This query fetches ALL data and should only be used as fallback.
// For production use, prefer listEnrichedPaginated for better performance.
export const listEnriched = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Get fixtures (optionally filtered by organization)
    let fixtures;
    const orgId = args.organizationId;
    if (orgId !== undefined) {
      fixtures = await ctx.db
        .query("fixtures")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", orgId)
        )
        .collect();
    } else {
      fixtures = await ctx.db.query("fixtures").collect();
    }

    // Enrich each fixture using the shared helper function
    const enrichedFixtures = await Promise.all(
      fixtures.map((fixture) => enrichFixture(ctx, fixture))
    );

    return enrichedFixtures.sort((a, b) => b._creationTime - a._creationTime);
  },
});
// Get approval status for an entity
export const getApprovalStatus = query({
  args: {
    entityType: v.union(
      v.literal("order"),
      v.literal("contract"),
      v.literal("recap_manager"),
      v.literal("fixture")
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const approvals = await ctx.db
      .query("approvals")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .collect();

    const approved = approvals.filter((a) => a.approved).length;
    const rejected = approvals.filter((a) => !a.approved).length;
    const total = approvals.length;

    // Enrich with user data
    const enrichedApprovals = await Promise.all(
      approvals.map(async (approval) => {
        const user = await ctx.db.get(approval.userId);
        return {
          ...approval,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                avatarUrl: user.avatar
                  ? await ctx.storage.getUrl(user.avatar)
                  : null,
              }
            : null,
        };
      })
    );

    return {
      approvals: enrichedApprovals,
      summary: {
        approved,
        rejected,
        total,
        pending: Math.max(0, 2 - total), // Assuming 2 approvals needed
      },
    };
  },
});

// Get detailed fixture with all relationships and audit trail
export const getFixtureDetails = query({
  args: { fixtureId: v.id("fixtures") },
  handler: async (ctx, args) => {
    const fixture = await ctx.db.get(args.fixtureId);
    if (!fixture) {
      return null;
    }

    // Get contracts for this fixture
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_fixture", (q) => q.eq("fixtureId", fixture._id))
      .collect();

    // Get recap managers for this fixture
    const recapManagers = await ctx.db
      .query("recap_managers")
      .withIndex("by_fixture", (q) => q.eq("fixtureId", fixture._id))
      .collect();

    // Enrich contracts with all related data
    const enrichedContracts = await Promise.all(
      contracts.map(async (contract) => {
        const owner = contract.ownerId ? await ctx.db.get(contract.ownerId) : null;
        const charterer = contract.chartererId ? await ctx.db.get(contract.chartererId) : null;
        const broker = contract.brokerId ? await ctx.db.get(contract.brokerId) : null;
        const vessel = contract.vesselId ? await ctx.db.get(contract.vesselId) : null;
        const loadPort = contract.loadPortId ? await ctx.db.get(contract.loadPortId) : null;
        const dischargePort = contract.dischargePortId ? await ctx.db.get(contract.dischargePortId) : null;
        const cargoType = contract.cargoTypeId ? await ctx.db.get(contract.cargoTypeId) : null;
        const negotiation = contract.negotiationId ? await ctx.db.get(contract.negotiationId) : null;
        const order = contract.orderId ? await ctx.db.get(contract.orderId) : null;

        // Get person in charge from negotiation
        const personInCharge = negotiation?.personInChargeId
          ? await ctx.db.get(negotiation.personInChargeId)
          : null;

        // Get avatars
        const ownerWithAvatar = owner && {
          ...owner,
          avatarUrl: owner.avatar ? await ctx.storage.getUrl(owner.avatar) : null,
        };
        const chartererWithAvatar = charterer && {
          ...charterer,
          avatarUrl: charterer.avatar ? await ctx.storage.getUrl(charterer.avatar) : null,
        };
        const brokerWithAvatar = broker && {
          ...broker,
          avatarUrl: broker.avatar ? await ctx.storage.getUrl(broker.avatar) : null,
        };
        const personInChargeWithAvatar = personInCharge && {
          ...personInCharge,
          avatarUrl: personInCharge.avatar ? await ctx.storage.getUrl(personInCharge.avatar) : null,
        };

        return {
          ...contract,
          owner: ownerWithAvatar,
          charterer: chartererWithAvatar,
          broker: brokerWithAvatar,
          vessel,
          loadPort,
          dischargePort,
          cargoType,
          negotiation,
          order,
          personInCharge: personInChargeWithAvatar,
        };
      })
    );

    // Get order if exists
    const order = fixture.orderId ? await ctx.db.get(fixture.orderId) : null;

    return {
      ...fixture,
      order,
      contracts: enrichedContracts,
      recapManagers,
    };
  },
});
// Internal seed function for fixtures with realistic maritime data
export const seedFixturesInternal = async (ctx: MutationCtx) => {
  console.log("🚢 Seeding fixtures...");

  // Get the first organization for the fixture
  const organization = await ctx.db.query("organizations").first();
  if (!organization) {
    throw new Error("No organization found. Please seed organizations first.");
  }

  const now = Date.now();

  // Create dedicated seed users for consistent activity logs across all instances
  const seedUsers = await Promise.all([
    ctx.db.insert("users", {
      name: "John Smith",
      email: "john.smith@seamless-sea.test",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    }),
    ctx.db.insert("users", {
      name: "Sarah Johnson",
      email: "sarah.johnson@seamless-sea.test",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    }),
    ctx.db.insert("users", {
      name: "Michael Chen",
      email: "michael.chen@seamless-sea.test",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    }),
    ctx.db.insert("users", {
      name: "Emily Rodriguez",
      email: "emily.rodriguez@seamless-sea.test",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    }),
    ctx.db.insert("users", {
      name: "David Kim",
      email: "david.kim@seamless-sea.test",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    }),
  ]);

  // Helper to randomly select a seed user for variety
  const randomUser = () => seedUsers[Math.floor(Math.random() * seedUsers.length)];

  // Get reference data
  const companies = await ctx.db.query("companies").collect();
  const vessels = await ctx.db.query("vessels").collect();
  const ports = await ctx.db.query("ports").collect();
  const cargoTypes = await ctx.db.query("cargo_types").collect();

  if (
    companies.length === 0 ||
    vessels.length === 0 ||
    ports.length === 0 ||
    cargoTypes.length === 0
  ) {
    throw new Error(
      "Reference data not found. Please seed companies, vessels, ports, and cargo types first."
    );
  }

  // Filter companies by role
  const owners = companies.filter((c) => c.roles.includes("owner"));
  const charterers = companies.filter((c) => c.roles.includes("charterer"));
  const brokers = companies.filter((c) => c.roles.includes("broker"));

  // Real maritime market rates based on vessel types
  const getMarketRates = (vesselClass: string | undefined) => {
    // VLCC - Very Large Crude Carriers (oil tankers)
    if (vesselClass?.includes("TI class") || vesselClass?.includes("VLCC")) {
      return {
        freightRate: `$${(28 + Math.random() * 4).toFixed(2)}/mt`, // $28-32/mt
        demurrageRate: `$${Math.floor(32000 + Math.random() * 4000)}/day`, // $32k-36k/day
        laycanDuration: 3, // 3 days
      };
    }
    // Aframax (medium oil tankers)
    if (vesselClass?.includes("Aframax")) {
      return {
        freightRate: `WS ${Math.floor(95 + Math.random() * 35)}`, // WS 95-130
        demurrageRate: `$${Math.floor(22000 + Math.random() * 3000)}/day`, // $22k-25k/day
        laycanDuration: 2,
      };
    }
    // Capesize (large bulk carriers)
    if (vesselClass?.includes("Capesize") || vesselClass?.includes("Valemax") || vesselClass?.includes("VLOC")) {
      return {
        freightRate: `$${(23 + Math.random() * 5).toFixed(2)}/mt`, // $23-28/mt
        demurrageRate: `$${Math.floor(22000 + Math.random() * 4000)}/day`, // $22k-26k/day
        laycanDuration: 5, // 5 days
      };
    }
    // Container ships
    if (vesselClass?.includes("class") && vesselClass?.includes("Ever") || vesselClass?.includes("MSC") || vesselClass?.includes("HMM") || vesselClass?.includes("OOCL") || vesselClass?.includes("ONE")) {
      return {
        freightRate: `$${Math.floor(2200 + Math.random() * 800)}/FEU`, // $2,200-3,000/FEU
        demurrageRate: `$${Math.floor(12000 + Math.random() * 4000)}/day`, // $12k-16k/day
        laycanDuration: 2,
      };
    }
    // Default (smaller vessels)
    return {
      freightRate: `$${(15 + Math.random() * 15).toFixed(2)}/mt`,
      demurrageRate: `$${Math.floor(8000 + Math.random() * 7000)}/day`,
      laycanDuration: 3,
    };
  };

  // Helper: Get delivery terms based on cargo category
  const getDeliveryTerms = (cargoCategory: string) => {
    if (cargoCategory === "Dry Bulk") {
      const terms = ["FIO", "FIOS", "FIO Trimmed", "FIOST"];
      const term = terms[Math.floor(Math.random() * terms.length)];
      return { load: term, discharge: term };
    } else if (cargoCategory === "Tanker") {
      return { load: "Free In", discharge: "Free Out" };
    } else if (cargoCategory === "Container") {
      return { load: "Liner Terms", discharge: "Liner Terms" };
    } else {
      return { load: "FIO", discharge: "FIO" };
    }
  };

  // Helper: Get market index name based on vessel class
  const getMarketIndexName = (vesselClass: string | undefined) => {
    if (!vesselClass) return "Baltic Dry Index";

    if (vesselClass.includes("Capesize") || vesselClass.includes("Valemax") || vesselClass.includes("VLOC")) {
      const indices = ["Baltic Capesize Index", "BCI C5 (W Australia-China)", "BCI C3 (Tubarao-Qingdao)"];
      return indices[Math.floor(Math.random() * indices.length)];
    } else if (vesselClass.includes("VLCC") || vesselClass.includes("TI class")) {
      const indices = ["TD3C (MEG-China)", "TD1 (MEG-US Gulf)", "TD2 (MEG-Singapore)"];
      return indices[Math.floor(Math.random() * indices.length)];
    } else if (vesselClass.includes("Aframax")) {
      const indices = ["TD6 (Black Sea-Med)", "TD7 (North Sea-Cont)", "TD17 (Baltic-UKC)"];
      return indices[Math.floor(Math.random() * indices.length)];
    } else if (vesselClass.includes("Ever") || vesselClass.includes("MSC") || vesselClass.includes("HMM") || vesselClass.includes("OOCL")) {
      return "SCFI (Shanghai Containerized Freight Index)";
    } else {
      return "Baltic Dry Index";
    }
  };

  // Helper: Get commission rates by vessel type
  const getCommissionRates = (vesselClass: string | undefined) => {
    if (!vesselClass) return { address: 3.75, broker: 1.25 };

    // Container ships have lower commissions
    if (vesselClass.includes("Ever") || vesselClass.includes("MSC") || vesselClass.includes("HMM") || vesselClass.includes("OOCL") || vesselClass.includes("ONE")) {
      return { address: 2.5, broker: 1.0 };
    }
    // Specialty vessels (Valemax, VLOC) have higher commissions
    else if (vesselClass.includes("Valemax") || vesselClass.includes("VLOC")) {
      return { address: 5.0, broker: 2.5 };
    }
    // Standard (dry bulk, tankers)
    else {
      return { address: 3.75, broker: 1.25 };
    }
  };

  // Helper: Add contract workflow dates based on status
  const addContractWorkflowDates = (status: string, createdTime: number) => {
    // Speed variation: 20% fast, 60% normal, 20% slow
    const speedRand = Math.random();
    const speedMultiplier = speedRand < 0.2 ? 0.5 : speedRand < 0.8 ? 1.0 : 1.5;

    const dates: any = {};

    if (status === "working-copy" || status === "final") {
      // Draft → Working Copy: 1-2 days
      const workingCopyDelay = (1 + Math.random()) * 24 * 60 * 60 * 1000 * speedMultiplier;
      dates.workingCopyDate = createdTime + workingCopyDelay;
    }

    if (status === "final") {
      // Working Copy → Final: 2-4 days
      const workingCopyDelay = (1 + Math.random()) * 24 * 60 * 60 * 1000 * speedMultiplier;
      dates.workingCopyDate = createdTime + workingCopyDelay;

      const finalDelay = (2 + Math.random() * 2) * 24 * 60 * 60 * 1000 * speedMultiplier;
      dates.finalDate = dates.workingCopyDate + finalDelay;

      // 50% chance of being fully signed
      if (Math.random() < 0.5) {
        // Final → Fully Signed: 0.5-1.5 days
        const signedDelay = (0.5 + Math.random()) * 24 * 60 * 60 * 1000 * speedMultiplier;
        dates.fullySignedDate = dates.finalDate + signedDelay;
      }
    }

    return dates;
  };

  // Helper: Generate freight analytics from final rate
  const generateFreightAnalytics = (finalRate: string, vesselClass: string | undefined) => {
    const finalRateNum = parseFloat(finalRate.replace(/[^0-9.]/g, ""));

    // Negotiation started high and came down
    const highestRate = finalRateNum * (1.1 + Math.random() * 0.2); // 10-30% higher
    const lowestRate = finalRateNum * (1 - Math.random() * 0.05); // 0-5% lower
    const firstRate = finalRateNum * (1.1 + Math.random() * 0.15); // 10-25% higher

    // Last day rates (tighter range)
    const highestLastDay = finalRateNum * (1.05 + Math.random() * 0.1); // 5-15% higher
    const lowestLastDay = finalRateNum * (1 - Math.random() * 0.02); // 0-2% lower
    const firstLastDay = finalRateNum * (1.05 + Math.random() * 0.08); // 5-13% higher

    // Market index (slightly higher than final rate)
    const marketIndex = finalRateNum * (1 + Math.random() * 0.05); // 0-5% above final
    const marketIndexName = getMarketIndexName(vesselClass);

    return {
      highestFreightRateIndication: highestRate,
      lowestFreightRateIndication: lowestRate,
      firstFreightRateIndication: firstRate,
      highestFreightRateLastDay: highestLastDay,
      lowestFreightRateLastDay: lowestLastDay,
      firstFreightRateLastDay: firstLastDay,
      marketIndex,
      marketIndexName,
    };
  };

  // Helper: Generate demurrage analytics from final rate
  const generateDemurrageAnalytics = (finalRate: string) => {
    const finalRateNum = parseFloat(finalRate.replace(/[^0-9.]/g, ""));

    // Negotiation started high and came down
    const highestRate = finalRateNum * (1.1 + Math.random() * 0.25); // 10-35% higher
    const lowestRate = finalRateNum * (1 - Math.random() * 0.1); // 0-10% lower
    const firstRate = finalRateNum * (1.1 + Math.random() * 0.2); // 10-30% higher

    // Last day rates (tighter range)
    const highestLastDay = finalRateNum * (1.05 + Math.random() * 0.1); // 5-15% higher
    const lowestLastDay = finalRateNum * (1 - Math.random() * 0.05); // 0-5% lower
    const firstLastDay = finalRateNum * (1.05 + Math.random() * 0.08); // 5-13% higher

    return {
      highestDemurrageIndication: highestRate,
      lowestDemurrageIndication: lowestRate,
      firstDemurrageIndication: firstRate,
      highestDemurrageLastDay: highestLastDay,
      lowestDemurrageLastDay: lowestLastDay,
      firstDemurrageLastDay: firstLastDay,
    };
  };

  // Helper: Calculate commissions and gross freight
  const calculateCommissionsAndGrossFreight = (
    freightRate: string,
    quantity: number,
    vesselClass: string | undefined
  ) => {
    const rateNum = parseFloat(freightRate.replace(/[^0-9.]/g, ""));
    const commissionRates = getCommissionRates(vesselClass);

    // Calculate gross freight
    const grossFreight = rateNum * quantity;

    // Calculate commission totals
    const addressCommissionTotal = (grossFreight * commissionRates.address) / 100;
    const brokerCommissionTotal = (grossFreight * commissionRates.broker) / 100;

    return {
      grossFreight,
      addressCommissionPercent: commissionRates.address,
      addressCommissionTotal,
      brokerCommissionPercent: commissionRates.broker,
      brokerCommissionTotal,
    };
  };

  // Helper: Generate progressive status flow for a fixture
  const generateStatusProgression = (finalStatus: string, showFullProgression: boolean) => {
    const statuses = [];

    // Order phase
    statuses.push({
      phase: "order",
      status: "draft",
      label: "Draft",
      action: "created",
      description: "Order created",
      daysOffset: 0,
    });

    statuses.push({
      phase: "order",
      status: "distributed",
      label: "Distributed",
      action: "distributed",
      description: "Order distributed to market",
      daysOffset: 0.25, // 6 hours later
    });

    if (finalStatus === "fully-fixed" && showFullProgression) {
      // Full negotiation progression for 70-80% of fully-fixed fixtures
      statuses.push({
        phase: "negotiation",
        status: "indicative-offer",
        label: "Indicative Offer",
        action: "created",
        description: "Initial indicative offer received",
        daysOffset: 1,
      });

      statuses.push({
        phase: "negotiation",
        status: "indicative-bid",
        label: "Indicative Bid",
        action: "updated",
        description: "Counter-bid submitted",
        daysOffset: 2,
      });

      statuses.push({
        phase: "negotiation",
        status: "firm-offer",
        label: "Firm Offer",
        action: "updated",
        description: "Offer upgraded to firm terms",
        daysOffset: 3,
      });

      statuses.push({
        phase: "negotiation",
        status: "firm-bid",
        label: "Firm Bid",
        action: "updated",
        description: "Final firm bid accepted",
        daysOffset: 4,
      });

      statuses.push({
        phase: "negotiation",
        status: "on-subs",
        label: "On Subs",
        action: "updated",
        description: "Agreement subject to conditions",
        daysOffset: 4.5,
      });

      statuses.push({
        phase: "negotiation",
        status: "fixed",
        label: "Fixed",
        action: "fixed",
        description: "Negotiation successfully concluded",
        daysOffset: 6,
      });
    } else if (finalStatus === "fully-fixed") {
      // Shorter path for remaining 20-30% of fully-fixed fixtures
      statuses.push({
        phase: "negotiation",
        status: "firm-offer",
        label: "Firm Offer",
        action: "created",
        description: "Firm offer received",
        daysOffset: 1,
      });

      statuses.push({
        phase: "negotiation",
        status: "fixed",
        label: "Fixed",
        action: "fixed",
        description: "Terms agreed and fixed",
        daysOffset: 3,
      });
    } else {
      // Partial progression for non-fully-fixed
      statuses.push({
        phase: "negotiation",
        status: "indicative-offer",
        label: "Indicative Offer",
        action: "created",
        description: "Initial offer received",
        daysOffset: 1,
      });

      if (Math.random() < 0.6) {
        statuses.push({
          phase: "negotiation",
          status: "firm-offer",
          label: "Firm Offer",
          action: "updated",
          description: "Offer confirmed as firm",
          daysOffset: 2.5,
        });
      }
    }

    // Contract phase (if negotiation was fixed)
    if (finalStatus === "fully-fixed" || finalStatus === "final" || finalStatus === "on-subs") {
      statuses.push({
        phase: "contract",
        status: "draft",
        label: "Draft",
        action: "created",
        description: "Contract draft prepared",
        daysOffset: showFullProgression ? 7 : 4,
      });

      statuses.push({
        phase: "contract",
        status: "working-copy",
        label: "Working Copy",
        action: "updated",
        description: "Contract circulated for review",
        daysOffset: showFullProgression ? 8 : 4.5,
      });

      if (finalStatus === "fully-fixed" || finalStatus === "final") {
        statuses.push({
          phase: "contract",
          status: "final",
          label: "Final",
          action: "finalized",
          description: "Contract finalized and ready for execution",
          daysOffset: showFullProgression ? 10 : 6,
        });
      }
    }

    return statuses;
  };

  // Helper: Create field changes with all tracked fields
  const createFieldChange = async (
    entityType: "order" | "negotiation" | "contract" | "recap_manager" | "contract_addenda" | "recap_addenda",
    entityId: any,
    fieldName: string,
    oldValue: string,
    newValue: string,
    reason: string,
    timestamp: number
  ) => {
    await ctx.db.insert("field_changes", {
      entityType,
      entityId: entityId.toString(),
      fieldName,
      oldValue,
      newValue,
      changeReason: reason,
      userId: randomUser(),
      timestamp,
    });
  };

  // Helper: Create activity log
  const createActivityLog = async (
    entityType: "order" | "negotiation" | "contract" | "recap_manager",
    entityId: any,
    action: string,
    description: string,
    statusValue: string,
    statusLabel: string,
    timestamp: number,
    expandable?: Array<{ label: string; value: string }>
  ) => {
    await ctx.db.insert("activity_logs", {
      entityType,
      entityId,
      action,
      description,
      status: {
        value: statusValue,
        label: statusLabel,
      },
      userId: randomUser(),
      timestamp,
      expandable: expandable ? { data: expandable } : undefined,
    });
  };

  const fixturesCreated = [];

  // Create 140 fixtures with realistic progression
  for (let i = 0; i < 140; i++) {
    const fixtureNumber = `FIX${10000 + i}`;

    // Determine fixture pattern: 60% trade flow (order→negotiation→contract), 40% direct contracts
    const isTradeFlow = Math.random() < 0.6;

    // Only trade flow fixtures can have multiple contracts; direct contracts must have separate fixtures
    const hasMultipleContracts = isTradeFlow && Math.random() < 0.4; // 40% chance for trade flow only
    const numContracts = hasMultipleContracts ? Math.floor(Math.random() * 2) + 2 : 1; // 2-3 contracts

    // Weighted status distribution (more fully-fixed)
    const rand = Math.random();
    let fixtureStatus: "draft" | "working-copy" | "final" | "on-subs" | "fully-fixed" | "canceled";
    if (rand < 0.5) fixtureStatus = "fully-fixed"; // 50%
    else if (rand < 0.7) fixtureStatus = "final"; // 20%
    else if (rand < 0.85) fixtureStatus = "on-subs"; // 15%
    else if (rand < 0.95) fixtureStatus = "working-copy"; // 10%
    else fixtureStatus = "draft"; // 5%

    // Determine if this gets full progression (70-80% of fully-fixed)
    const showFullProgression = fixtureStatus === "fully-fixed" && Math.random() < 0.75;

    // Generate status progression
    const statusProgression = generateStatusProgression(fixtureStatus, showFullProgression);

    // Calculate base timeline
    const maxDaysOffset = Math.max(...statusProgression.map(s => s.daysOffset));
    const startTime = now - (maxDaysOffset + 5) * 24 * 60 * 60 * 1000; // Start N+5 days ago

    // Create an order for this fixture (only for trade flow fixtures)
    const orderNumber = `ORD${10000 + i}`;
    const orderTimestamp = startTime;
    const orderId = isTradeFlow ? await ctx.db.insert("orders", {
      orderNumber,
      type: "charter",
      stage: "active",
      organizationId: organization._id,
      status: "distributed",
      createdAt: orderTimestamp,
      updatedAt: now,
    }) : undefined;

    // Create fixture (linked to order only for trade flow)
    // Note: lastUpdated will be set after all contracts/negotiations are created
    const fixtureId = await ctx.db.insert("fixtures", {
      fixtureNumber,
      orderId: isTradeFlow ? orderId : undefined,
      organizationId: organization._id,
      status: fixtureStatus,
      lastUpdated: now, // Will be recalculated after seeding
      createdAt: orderTimestamp,
      updatedAt: now,
    });

    // Create contracts for this fixture
    for (let j = 0; j < numContracts; j++) {
      const owner = owners[Math.floor(Math.random() * owners.length)];
      const charterer = charterers[Math.floor(Math.random() * charterers.length)];
      const broker = brokers[Math.floor(Math.random() * brokers.length)];
      const vessel = vessels[Math.floor(Math.random() * vessels.length)];
      const loadPort = ports[Math.floor(Math.random() * ports.length)];
      const dischargePort = ports[Math.floor(Math.random() * ports.length)];
      const cargoType = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
      const contractType = Math.random() < 0.7 ? "voyage-charter" : "time-charter";

      // Get realistic market rates based on vessel class
      const marketRates = getMarketRates(vessel.vesselClass);

      // Laycan based on vessel class
      const laycanDuration = marketRates.laycanDuration;
      const laycanStartOffset = 15 * 24 * 60 * 60 * 1000 + Math.random() * 45 * 24 * 60 * 60 * 1000;
      const laycanStart = now + laycanStartOffset;
      const laycanEnd = laycanStart + laycanDuration * 24 * 60 * 60 * 1000;

      const freightRate = marketRates.freightRate;
      const demurrageRate = marketRates.demurrageRate;

      const contractNumber = `CP${30000 + fixturesCreated.length * 3 + j}`;

      // Determine contract status based on fixture status
      let contractStatus: "draft" | "working-copy" | "final" | "rejected";
      if (fixtureStatus === "fully-fixed" || fixtureStatus === "final") {
        contractStatus = "final";
      } else if (fixtureStatus === "on-subs" || fixtureStatus === "working-copy") {
        contractStatus = "working-copy";
      } else {
        contractStatus = "draft";
      }

      // Create a negotiation for this contract (only for trade flow fixtures)
      let negotiationId;
      const negotiationNumber = `NEG${10000 + i * 10 + j}`;

      // Negotiation status based on fixture status
      let negotiationStatus: "indicative-offer" | "indicative-bid" | "firm-offer" | "firm-bid" | "firm" | "on-subs" | "fixed" | "withdrawn" | "firm-offer-expired" | "firm-amendment" | "on-subs-amendment" | "subs-expired" | "subs-failed" = "indicative-offer";
      if (fixtureStatus === "fully-fixed" || fixtureStatus === "final") {
        negotiationStatus = "fixed";
      } else if (fixtureStatus === "on-subs") {
        negotiationStatus = "on-subs";
      } else if (fixtureStatus === "working-copy") {
        negotiationStatus = "firm-offer";
      }

      if (isTradeFlow) {
        // TypeScript: orderId is guaranteed to be defined when isTradeFlow is true
        if (!orderId) throw new Error("orderId must be defined for trade flow");

        negotiationId = await ctx.db.insert("negotiations", {
          negotiationNumber,
          orderId,
          counterpartyId: charterer._id,
          brokerId: broker._id,
          vesselId: vessel._id,
          status: negotiationStatus,
          createdAt: startTime + 1 * 24 * 60 * 60 * 1000,
          updatedAt: now,
        });
      }

      // Initial values for changes
      const initialOwner = owners[Math.floor(Math.random() * owners.length)];
      const initialCharterer = charterers[Math.floor(Math.random() * charterers.length)];
      const initialBroker = brokers[Math.floor(Math.random() * brokers.length)];
      const initialLoadPort = ports[Math.floor(Math.random() * ports.length)];
      const initialQuantity = Math.floor(Math.random() * 50000) + 20000;
      const quantity = Math.floor(Math.random() * 50000) + 20000;
      const initialFreightRate = `$${(parseFloat(freightRate.replace(/[^0-9.]/g, '')) * 0.92).toFixed(2)}/mt`;
      const initialDemurrageRate = `$${Math.floor(parseInt(demurrageRate.replace(/[^0-9]/g, '')) * 0.85)}/day`;
      const initialLaycanStart = laycanStart - 7 * 24 * 60 * 60 * 1000;

      // Add analytics for fixed negotiations
      if (isTradeFlow && negotiationId && negotiationStatus === "fixed") {
        const freightAnalytics = generateFreightAnalytics(freightRate, vessel.vesselClass);
        const demurrageAnalytics = generateDemurrageAnalytics(demurrageRate);
        const deliveryTerms = getDeliveryTerms(cargoType.category);
        const commissionsAndGrossFreight = calculateCommissionsAndGrossFreight(
          freightRate,
          quantity,
          vessel.vesselClass
        );

        await ctx.db.patch(negotiationId, {
          ...freightAnalytics,
          ...demurrageAnalytics,
          ...commissionsAndGrossFreight,
          loadDeliveryType: deliveryTerms.load,
          dischargeRedeliveryType: deliveryTerms.discharge,
        });
      }

      const contractCreationTime = startTime + (showFullProgression ? 7 : 4) * 24 * 60 * 60 * 1000;
      const contractId = await ctx.db.insert("contracts", {
        contractNumber,
        fixtureId,
        negotiationId,
        orderId: negotiationId ? orderId : undefined,
        contractType,
        ownerId: owner._id,
        chartererId: charterer._id,
        brokerId: broker._id,
        vesselId: vessel._id,
        loadPortId: loadPort._id,
        dischargePortId: dischargePort._id,
        laycanStart,
        laycanEnd,
        freightRate,
        freightRateType: freightRate.includes("WS") ? "worldscale" : "per-tonne",
        demurrageRate,
        despatchRate: `$${Math.floor(parseInt(demurrageRate.replace(/[^0-9]/g, '')) * 0.5)}/day`,
        addressCommission: "3.75%",
        brokerCommission: "1.25%",
        cargoTypeId: cargoType._id,
        quantity,
        quantityUnit: "MT",
        status: contractStatus,
        ...addContractWorkflowDates(contractStatus, contractCreationTime),
        createdAt: contractCreationTime,
        updatedAt: now,
      });

      // Generate 3-5 field changes for most contracts (85%)
      const numFieldChanges = Math.random() < 0.85 ? Math.floor(Math.random() * 3) + 3 : 0; // 3-5 changes
      const changeFields = [];

      // Decide which fields will change
      const possibleFields = [
        { field: "chartererId", old: initialCharterer._id, new: charterer._id, oldName: initialCharterer.name, newName: charterer.name, reason: "Charterer changed after negotiations" },
        { field: "brokerId", old: initialBroker._id, new: broker._id, oldName: initialBroker.name, newName: broker.name, reason: "Broker assignment updated" },
        { field: "ownerId", old: initialOwner._id, new: owner._id, oldName: initialOwner.name, newName: owner.name, reason: "Vessel owner confirmed" },
        { field: "loadPortId", old: initialLoadPort._id, new: loadPort._id, oldName: initialLoadPort.name, newName: loadPort.name, reason: "Load port adjusted per charterer request" },
        { field: "quantity", old: initialQuantity.toString(), new: quantity.toString(), oldName: initialQuantity.toString(), newName: quantity.toString(), reason: "Cargo quantity finalized" },
        { field: "freightRate", old: initialFreightRate, new: freightRate, oldName: initialFreightRate, newName: freightRate, reason: "Freight rate negotiated to market level" },
        { field: "laycanStart", old: new Date(initialLaycanStart).toISOString(), new: new Date(laycanStart).toISOString(), oldName: new Date(initialLaycanStart).toLocaleDateString(), newName: new Date(laycanStart).toLocaleDateString(), reason: "Laycan adjusted for vessel schedule" },
        { field: "demurrageRate", old: initialDemurrageRate, new: demurrageRate, oldName: initialDemurrageRate, newName: demurrageRate, reason: "Demurrage rate adjusted per market conditions" },
      ];

      // Randomly select fields to change
      const shuffled = [...possibleFields].sort(() => Math.random() - 0.5);
      const selectedChanges = shuffled.slice(0, numFieldChanges);

      // Create field changes with timestamps spread during contract phase
      for (let k = 0; k < selectedChanges.length; k++) {
        const change = selectedChanges[k];
        const changeTimestamp = contractCreationTime + (k * 0.5 + 0.5) * 24 * 60 * 60 * 1000; // Spread over days

        await createFieldChange(
          "contract",
          contractId,
          change.field,
          change.oldName,
          change.newName,
          change.reason,
          changeTimestamp
        );

        changeFields.push({ label: change.field.replace("Id", "").replace(/([A-Z])/g, " $1").trim(), value: `${change.oldName} → ${change.newName}` });
      }

      // Create activity logs based on status progression
      for (const statusStep of statusProgression) {
        const stepTimestamp = startTime + statusStep.daysOffset * 24 * 60 * 60 * 1000;

        if (statusStep.phase === "order" && orderId) {
          // Order phase logs (only for trade flow)
          await createActivityLog(
            "order",
            orderId,
            statusStep.action,
            statusStep.description,
            `order-${statusStep.status}`,
            statusStep.label,
            stepTimestamp,
            statusStep.action === "created" ? [
              { label: "Vessel", value: vessel.name },
              { label: "Route", value: `${loadPort.name} → ${dischargePort.name}` },
              { label: "Cargo", value: cargoType.name },
            ] : undefined
          );
        } else if (statusStep.phase === "negotiation" && negotiationId) {
          // Negotiation phase logs
          await createActivityLog(
            "negotiation",
            negotiationId,
            statusStep.action,
            `${statusStep.description} with ${charterer.name}`,
            `negotiation-${statusStep.status}`,
            statusStep.label,
            stepTimestamp
          );
        } else if (statusStep.phase === "contract") {
          // Contract phase logs with field changes in expandable
          const expandableData = statusStep.action === "updated" && changeFields.length > 0
            ? changeFields
            : statusStep.action === "created"
            ? [
                { label: "Parties", value: `${owner.name} / ${charterer.name}` },
                { label: "Broker", value: broker.name },
                { label: "Vessel", value: vessel.name },
              ]
            : undefined;

          await createActivityLog(
            "contract",
            contractId,
            statusStep.action,
            `${statusStep.description} - ${contractNumber}`,
            `contract-${statusStep.status}`,
            statusStep.label,
            stepTimestamp,
            expandableData
          );
        }
      }
    }

    fixturesCreated.push({ fixtureNumber, numContracts, status: fixtureStatus });
  }

  console.log(`✅ Created ${fixturesCreated.length} fixtures`);
  console.log(
    `   - ${fixturesCreated.filter((f) => f.numContracts > 1).length} with multiple contracts`
  );
  console.log(
    `   - ${fixturesCreated.filter((f) => f.numContracts === 1).length} with single contracts`
  );
  console.log(
    `   - ${fixturesCreated.filter((f) => f.status === "fully-fixed").length} fully-fixed (with rich progression)`
  );

  return {
    success: true,
    message: `✅ Seeded ${fixturesCreated.length} fixtures with ${fixturesCreated.reduce((sum, f) => sum + f.numContracts, 0)} total contracts`,
    count: fixturesCreated.length,
  };
};

// Quick fix: Update all fixtures and orders to use the new organization
export const updateToNewOrg = mutation({
  args: {},
  handler: async (ctx) => {
    const oldOrgId = "jn74yz9z6a4dgqz6s1197cvxzs7p2g27" as any;
    const newOrgId = "jn7ccnv64at1jyxt0ytp6nwe457p2qrm" as any;

    // Update fixtures
    const fixtures = await ctx.db
      .query("fixtures")
      .filter((q) => q.eq(q.field("organizationId"), oldOrgId))
      .collect();

    for (const fixture of fixtures) {
      await ctx.db.patch(fixture._id, { organizationId: newOrgId });
    }

    // Update orders
    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("organizationId"), oldOrgId))
      .collect();

    for (const order of orders) {
      await ctx.db.patch(order._id, { organizationId: newOrgId });
    }

    return {
      success: true,
      fixturesUpdated: fixtures.length,
      ordersUpdated: orders.length,
    };
  },
});

// Lightweight query to compute bookmark counts (total fixtures, negotiations, contracts)
// without enrichment or avatar lookups - just counting.
export const getBookmarkCounts = query({
  args: { organizationId: v.optional(v.id("organizations")) },
  handler: async (ctx, args) => {
    const allFixtures = args.organizationId
      ? await ctx.db
          .query("fixtures")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", args.organizationId!)
          )
          .collect()
      : await ctx.db.query("fixtures").collect();

    const uniqueNegotiationIds = new Set<string>();
    let totalContractItems = 0;

    for (const fixture of allFixtures) {
      const contracts = await ctx.db
        .query("contracts")
        .withIndex("by_fixture", (q) => q.eq("fixtureId", fixture._id))
        .collect();

      const recaps = await ctx.db
        .query("recap_managers")
        .withIndex("by_fixture", (q) => q.eq("fixtureId", fixture._id))
        .collect();

      // Deduplicate contracts+recaps by negotiationId (mirrors transformFixturesToTableData)
      const seenNegs = new Set<string>();
      for (const item of [...contracts, ...recaps]) {
        const negId =
          item.negotiationId ||
          ("negotiation" in item ? (item as { negotiation?: { _id: string } }).negotiation?._id : undefined);
        if (negId) {
          if (seenNegs.has(negId as string)) continue;
          seenNegs.add(negId as string);
          uniqueNegotiationIds.add(negId as string);
        }
        totalContractItems++;
      }

      // Standalone negotiations (fixtures with negotiations but no contracts/recaps)
      if (contracts.length === 0 && recaps.length === 0 && fixture.orderId) {
        const negotiations = await ctx.db
          .query("negotiations")
          .withIndex("by_order", (q) => q.eq("orderId", fixture.orderId!))
          .collect();
        for (const neg of negotiations) {
          uniqueNegotiationIds.add(neg._id);
          totalContractItems++;
        }
      }
    }

    return {
      totalFixtures: allFixtures.length,
      totalNegotiations: uniqueNegotiationIds.size,
      totalContracts: totalContractItems,
    };
  },
});

// Returns all unique filter option values from the full unfiltered dataset.
// This query is independent of pagination/active filters so dropdown options
// don't shrink when a filter is applied.
export const getFilterOptions = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Bulk-load all reference tables in parallel
    const [allVessels, allCompanies, allPorts, allCargoTypes, allUsers] = await Promise.all([
      ctx.db.query("vessels").collect(),
      ctx.db.query("companies").collect(),
      ctx.db.query("ports").collect(),
      ctx.db.query("cargo_types").collect(),
      ctx.db.query("users").collect(),
    ]);

    // Build lookup maps
    const vesselMap = new Map(allVessels.map((v: any) => [v._id as string, v.name as string]));
    const companyMap = new Map(allCompanies.map((c: any) => [c._id as string, c.name as string]));
    const portMap = new Map(allPorts.map((p: any) => [p._id as string, { name: p.name as string, country: p.country as string }]));
    const cargoTypeMap = new Map(allCargoTypes.map((ct: any) => [ct._id as string, ct.name as string]));
    const userMap = new Map(allUsers.map((u: any) => [u._id as string, u.name as string]));

    // Sets to collect unique values
    const vessels = new Set<string>();
    const owners = new Set<string>();
    const brokers = new Set<string>();
    const charterers = new Set<string>();
    const loadPortNames = new Set<string>();
    const loadPortCountries = new Set<string>();
    const dischargePortNames = new Set<string>();
    const dischargePortCountries = new Set<string>();
    const cargoTypeNames = new Set<string>();
    const contractTypes = new Set<string>();
    const stages = new Set<string>();
    const loadDeliveryTypes = new Set<string>();
    const dischargeRedeliveryTypes = new Set<string>();
    const marketIndexNames = new Set<string>();
    const approvalStatuses = new Set<string>();
    const dealCaptureUsers = new Set<string>();
    const orderCreatedByUsers = new Set<string>();
    const ownerApprovalStatuses = new Set<string>();
    const chartererApprovalStatuses = new Set<string>();
    const ownerSignatureStatuses = new Set<string>();
    const chartererSignatureStatuses = new Set<string>();
    const ownerApprovedByUsers = new Set<string>();
    const chartererApprovedByUsers = new Set<string>();
    const ownerSignedByUsers = new Set<string>();
    const chartererSignedByUsers = new Set<string>();

    // Helper: format contract type for display (matches transformFixturesToTableData)
    const formatContractType = (ct: string) => {
      if (ct === "voyage-charter") return "Voyage charter";
      if (ct === "time-charter") return "TC";
      if (ct === "coa") return "COA";
      return ct;
    };

    // Helper: derive stage from contract type
    const deriveStage = (ct: string) => ct === "coa" ? "COA" : "Charter Party";

    // Helper: collect fields from a contract/recap entity
    const collectFromEntity = (entity: any) => {
      if (entity.vesselId) { const n = vesselMap.get(entity.vesselId as string); if (n) vessels.add(n); }
      if (entity.ownerId) { const n = companyMap.get(entity.ownerId as string); if (n) owners.add(n); }
      if (entity.brokerId) { const n = companyMap.get(entity.brokerId as string); if (n) brokers.add(n); }
      if (entity.chartererId) { const n = companyMap.get(entity.chartererId as string); if (n) charterers.add(n); }
      if (entity.loadPortId) {
        const p = portMap.get(entity.loadPortId as string);
        if (p) { loadPortNames.add(p.name); loadPortCountries.add(p.country); }
      }
      if (entity.dischargePortId) {
        const p = portMap.get(entity.dischargePortId as string);
        if (p) { dischargePortNames.add(p.name); dischargePortCountries.add(p.country); }
      }
      if (entity.cargoTypeId) { const n = cargoTypeMap.get(entity.cargoTypeId as string); if (n) cargoTypeNames.add(n); }
      if (entity.contractType) {
        contractTypes.add(formatContractType(entity.contractType));
        stages.add(deriveStage(entity.contractType));
      }
      if (entity.approvalStatus) approvalStatuses.add(entity.approvalStatus);
    };

    // Get all fixtures for org
    const allFixtures = await ctx.db
      .query("fixtures")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Iterate fixtures to collect from contracts, recaps, negotiations
    for (const fixture of allFixtures) {
      // Contracts
      const contracts = await ctx.db
        .query("contracts")
        .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
        .collect();

      for (const c of contracts) {
        collectFromEntity(c);
      }

      // Recap managers
      const recaps = await ctx.db
        .query("recap_managers")
        .withIndex("by_fixture", (q: any) => q.eq("fixtureId", fixture._id))
        .collect();

      for (const r of recaps) {
        collectFromEntity(r);
      }

      // Negotiations (via order)
      if (fixture.orderId) {
        const order = await ctx.db.get(fixture.orderId);
        if (order?.createdByUserId) {
          const n = userMap.get(order.createdByUserId as string);
          if (n) orderCreatedByUsers.add(n);
        }

        const negotiations = await ctx.db
          .query("negotiations")
          .withIndex("by_order", (q: any) => q.eq("orderId", fixture.orderId!))
          .collect();

        for (const neg of negotiations) {
          if (neg.loadDeliveryType) loadDeliveryTypes.add(neg.loadDeliveryType);
          if (neg.dischargeRedeliveryType) dischargeRedeliveryTypes.add(neg.dischargeRedeliveryType);
          if (neg.marketIndexName) marketIndexNames.add(neg.marketIndexName);
          if (neg.dealCaptureUserId) {
            const n = userMap.get(neg.dealCaptureUserId as string);
            if (n) dealCaptureUsers.add(n);
          }
          // Negotiation-only rows contribute "Negotiation" stage
          stages.add("Negotiation");
          // Negotiation vessel/counterparty/broker
          if (neg.vesselId) { const n = vesselMap.get(neg.vesselId as string); if (n) vessels.add(n); }
          if (neg.counterpartyId) { const n = companyMap.get(neg.counterpartyId as string); if (n) charterers.add(n); }
          if (neg.brokerId) { const n = companyMap.get(neg.brokerId as string); if (n) brokers.add(n); }
        }
      }

      // Contract approvals and signatures
      for (const c of contracts) {
        const approvals = await ctx.db
          .query("contract_approvals")
          .withIndex("by_contract", (q: any) => q.eq("contractId", c._id))
          .collect();

        for (const a of approvals) {
          if (a.partyRole === "owner") {
            if (a.status) ownerApprovalStatuses.add(a.status);
            if (a.approvedBy) { const n = userMap.get(a.approvedBy as string); if (n) ownerApprovedByUsers.add(n); }
          }
          if (a.partyRole === "charterer") {
            if (a.status) chartererApprovalStatuses.add(a.status);
            if (a.approvedBy) { const n = userMap.get(a.approvedBy as string); if (n) chartererApprovedByUsers.add(n); }
          }
        }

        const signatures = await ctx.db
          .query("contract_signatures")
          .withIndex("by_contract", (q: any) => q.eq("contractId", c._id))
          .collect();

        for (const s of signatures) {
          if (s.partyRole === "owner") {
            if (s.status) ownerSignatureStatuses.add(s.status);
            if (s.signedBy) { const n = userMap.get(s.signedBy as string); if (n) ownerSignedByUsers.add(n); }
          }
          if (s.partyRole === "charterer") {
            if (s.status) chartererSignatureStatuses.add(s.status);
            if (s.signedBy) { const n = userMap.get(s.signedBy as string); if (n) chartererSignedByUsers.add(n); }
          }
        }
      }
    }

    // Helper: convert Set to sorted {value, label} array
    const toOptions = (set: Set<string>) =>
      Array.from(set).filter(Boolean).sort().map((v) => ({ value: v, label: v }));

    return {
      vessels: toOptions(vessels),
      owner: toOptions(owners),
      broker: toOptions(brokers),
      charterer: toOptions(charterers),
      loadPortName: toOptions(loadPortNames),
      loadPortCountry: toOptions(loadPortCountries),
      dischargePortName: toOptions(dischargePortNames),
      dischargePortCountry: toOptions(dischargePortCountries),
      cargoTypeName: toOptions(cargoTypeNames),
      contractType: toOptions(contractTypes),
      stage: toOptions(stages),
      loadDeliveryType: toOptions(loadDeliveryTypes),
      dischargeRedeliveryType: toOptions(dischargeRedeliveryTypes),
      marketIndexName: toOptions(marketIndexNames),
      approvalStatus: toOptions(approvalStatuses),
      dealCaptureUser: toOptions(dealCaptureUsers),
      orderCreatedBy: toOptions(orderCreatedByUsers),
      negotiationCreatedBy: toOptions(new Set<string>()), // Not in schema, always empty
      ownerApprovalStatus: toOptions(ownerApprovalStatuses),
      chartererApprovalStatus: toOptions(chartererApprovalStatuses),
      ownerSignatureStatus: toOptions(ownerSignatureStatuses),
      chartererSignatureStatus: toOptions(chartererSignatureStatuses),
      ownerApprovedBy: toOptions(ownerApprovedByUsers),
      chartererApprovedBy: toOptions(chartererApprovedByUsers),
      ownerSignedBy: toOptions(ownerSignedByUsers),
      chartererSignedBy: toOptions(chartererSignedByUsers),
    };
  },
});
