import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

// Generate fixture number (FIX12345)
function generateFixtureNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `FIX${randomNum}`;
}

// Helper: Rebuild search index for a specific fixture
async function rebuildFixtureSearchIndex(
  ctx: MutationCtx,
  fixtureId: any
) {
  const fixtureDoc = await ctx.db.get(fixtureId);
  if (!fixtureDoc) return;

  // Type assertion: we know this is a fixture based on the fixtureId
  const fixture = fixtureDoc as any;

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

  // Collect all searchable text from contracts
  const searchableFields: string[] = [
    fixture.fixtureNumber,
    fixture.title || "",
  ];

  // Extract data from all contracts
  for (const contract of contracts) {
    searchableFields.push(contract.contractNumber);

    // Get related entities
    const [vessel, owner, charterer, broker, loadPort, dischargePort, cargoType, order] =
      await Promise.all([
        contract.vesselId ? ctx.db.get(contract.vesselId) : null,
        contract.ownerId ? ctx.db.get(contract.ownerId) : null,
        contract.chartererId ? ctx.db.get(contract.chartererId) : null,
        contract.brokerId ? ctx.db.get(contract.brokerId) : null,
        contract.loadPortId ? ctx.db.get(contract.loadPortId) : null,
        contract.dischargePortId ? ctx.db.get(contract.dischargePortId) : null,
        contract.cargoTypeId ? ctx.db.get(contract.cargoTypeId) : null,
        contract.orderId ? ctx.db.get(contract.orderId) : null,
      ]);

    if (vessel) searchableFields.push(vessel.name, vessel.imoNumber || "");
    if (owner) searchableFields.push(owner.name);
    if (charterer) searchableFields.push(charterer.name);
    if (broker) searchableFields.push(broker.name);
    if (loadPort)
      searchableFields.push(loadPort.name, loadPort.country, loadPort.unlocode || "");
    if (dischargePort)
      searchableFields.push(
        dischargePort.name,
        dischargePort.country,
        dischargePort.unlocode || ""
      );
    if (cargoType) searchableFields.push(cargoType.name);
    if (order) searchableFields.push(order.orderNumber);
  }

  // Extract data from all recap managers
  for (const recap of recapManagers) {
    searchableFields.push(recap.recapNumber);

    const [vessel, owner, charterer, broker, loadPort, dischargePort, cargoType] =
      await Promise.all([
        recap.vesselId ? ctx.db.get(recap.vesselId) : null,
        recap.ownerId ? ctx.db.get(recap.ownerId) : null,
        recap.chartererId ? ctx.db.get(recap.chartererId) : null,
        recap.brokerId ? ctx.db.get(recap.brokerId) : null,
        recap.loadPortId ? ctx.db.get(recap.loadPortId) : null,
        recap.dischargePortId ? ctx.db.get(recap.dischargePortId) : null,
        recap.cargoTypeId ? ctx.db.get(recap.cargoTypeId) : null,
      ]);

    if (vessel) searchableFields.push(vessel.name, vessel.imoNumber || "");
    if (owner) searchableFields.push(owner.name);
    if (charterer) searchableFields.push(charterer.name);
    if (broker) searchableFields.push(broker.name);
    if (loadPort) searchableFields.push(loadPort.name, loadPort.country);
    if (dischargePort)
      searchableFields.push(dischargePort.name, dischargePort.country);
    if (cargoType) searchableFields.push(cargoType.name);
  }

  // Build search text (lowercase, space-separated)
  const searchText = searchableFields
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Delete old search entry
  const oldSearch = await ctx.db
    .query("fixture_search_index")
    .withIndex("by_fixture", (q) => q.eq("fixtureId", fixtureId as any))
    .first();

  if (oldSearch) {
    await ctx.db.delete(oldSearch._id);
  }

  // Create new search entry
  await ctx.db.insert("fixture_search_index", {
    fixtureId: fixtureId as any,
    searchText,
    organizationId: fixture.organizationId,
    updatedAt: Date.now(),
  });
}

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
      createdAt: now,
      updatedAt: now,
    });

    // Rebuild search index for this fixture
    await rebuildFixtureSearchIndex(ctx, fixtureId);

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

    await ctx.db.patch(fixtureId, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Rebuild search index for this fixture
    await rebuildFixtureSearchIndex(ctx, fixtureId);

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

// List all fixtures with enriched contract data and company avatars
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

    // Enrich each fixture with contracts/recaps and company data
    const enrichedFixtures = await Promise.all(
      fixtures.map(async (fixture) => {
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

        // Enrich contracts with company data and avatars
        const enrichedContracts = await Promise.all(
          contracts.map(async (contract) => {
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
              .withIndex("by_contract", (q) => q.eq("contractId", contract._id))
              .collect();

            // Enrich approvals with company and user data
            const enrichedApprovals = await Promise.all(
              approvals.map(async (approval) => {
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
              approved: approvals.filter((a) => a.status === "approved").length,
              pending: approvals.filter((a) => a.status === "pending").length,
              rejected: approvals.filter((a) => a.status === "rejected").length,
            };

            // Get contract signatures
            const signatures = await ctx.db
              .query("contract_signatures")
              .withIndex("by_contract", (q) => q.eq("contractId", contract._id))
              .collect();

            // Enrich signatures with company and user data
            const enrichedSignatures = await Promise.all(
              signatures.map(async (signature) => {
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
              signed: signatures.filter((s) => s.status === "signed").length,
              pending: signatures.filter((s) => s.status === "pending").length,
              rejected: signatures.filter((s) => s.status === "rejected").length,
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
          recapManagers.map(async (recap) => {
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

        return {
          ...fixture,
          order,
          contracts: enrichedContracts,
          recapManagers: enrichedRecaps,
        };
      })
    );

    return enrichedFixtures.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Server-side paginated query with filtering, sorting, and search
export const listPaginated = query({
  args: {
    organizationId: v.id("organizations"),
    cursor: v.optional(v.string()), // Format: "timestamp:id"
    limit: v.number(), // 25, 50, 100

    // Filters (40+ supported)
    filters: v.optional(v.object({
      // Text/multiselect filters
      vessels: v.optional(v.array(v.string())),
      status: v.optional(v.array(v.string())),
      owner: v.optional(v.array(v.string())),
      broker: v.optional(v.array(v.string())),
      charterer: v.optional(v.array(v.string())),
      loadPortName: v.optional(v.array(v.string())),
      loadPortCountry: v.optional(v.array(v.string())),
      loadDeliveryType: v.optional(v.array(v.string())),
      dischargePortName: v.optional(v.array(v.string())),
      dischargePortCountry: v.optional(v.array(v.string())),
      dischargeRedeliveryType: v.optional(v.array(v.string())),
      cargoTypeName: v.optional(v.array(v.string())),
      marketIndexName: v.optional(v.array(v.string())),
      contractType: v.optional(v.array(v.string())),
      contractStatus: v.optional(v.array(v.string())),

      // Number range filters
      cargoQuantity: v.optional(v.object({ min: v.number(), max: v.number() })),
      finalFreightRate: v.optional(v.object({ min: v.number(), max: v.number() })),

      // Date range filters
      laycanStart: v.optional(v.object({ min: v.number(), max: v.number() })),
      cpDate: v.optional(v.object({ min: v.number(), max: v.number() })),
    })),

    // Sorting
    sorting: v.optional(v.array(v.object({
      field: v.string(),
      direction: v.union(v.literal("asc"), v.literal("desc")),
    }))),

    // Global search
    searchTerms: v.optional(v.array(v.string())),
  },

  handler: async (ctx, args) => {
    // 1. Handle search terms first (narrows down result set)
    let fixtureIdsSet: Set<string> | null = null;
    if (args.searchTerms && args.searchTerms.length > 0) {
      const searchResults = await ctx.db
        .query("fixture_search_index")
        .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
        .collect();

      // Filter search results in memory (Convex doesn't support .includes() in filters)
      const filtered = searchResults.filter((result) => {
        return args.searchTerms!.every((term) =>
          result.searchText.includes(term.toLowerCase())
        );
      });

      fixtureIdsSet = new Set(filtered.map((r) => r.fixtureId));

      // Early exit if no matches
      if (fixtureIdsSet.size === 0) {
        return { items: [], nextCursor: null, hasMore: false, totalCount: 0 };
      }
    }

    // 2. Start with base query (use appropriate index)
    // Note: _creationTime is automatically appended to all indexes by Convex
    let query = ctx.db
      .query("fixtures")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    // 3. Apply simple filters (status and date ranges)
    if (args.filters?.status && args.filters.status.length > 0) {
      // Status filter: match any of the provided statuses
      query = query.filter((q) => {
        return q.or(...args.filters!.status!.map((s) => q.eq(q.field("status"), s)));
      });
    }

    if (args.filters?.cpDate) {
      // Date range filter
      query = query.filter((q) => {
        return q.and(
          q.gte(q.field("createdAt"), args.filters!.cpDate!.min),
          q.lte(q.field("createdAt"), args.filters!.cpDate!.max)
        );
      });
    }

    // 4. Apply cursor pagination
    if (args.cursor) {
      const [timestamp, id] = args.cursor.split(":");
      query = query.filter((q) =>
        q.or(
          q.lt(q.field("_creationTime"), parseFloat(timestamp)),
          q.and(
            q.eq(q.field("_creationTime"), parseFloat(timestamp)),
            q.lt(q.field("_id"), id)
          )
        )
      );
    }

    // 5. Apply sorting and fetch results
    const sortDirection = args.sorting?.[0]?.direction || "desc";
    let results = await query.order(sortDirection).take(args.limit + 1);

    // 6. Apply search filter if needed (post-query filtering)
    if (fixtureIdsSet) {
      results = results.filter((f) => fixtureIdsSet!.has(f._id));
    }

    // 7. Check if more results exist
    const hasMore = results.length > args.limit;
    const items = hasMore ? results.slice(0, args.limit) : results;

    // 8. Generate next cursor
    const nextCursor =
      hasMore && items.length > 0
        ? `${items[items.length - 1]._creationTime}:${items[items.length - 1]._id}`
        : null;

    // 9. Full enrichment (same structure as listEnriched for compatibility)
    const enrichedItems = await Promise.all(
      items.map(async (fixture) => {
        // Get contracts and recap managers
        const contracts = await ctx.db
          .query("contracts")
          .withIndex("by_fixture", (q) => q.eq("fixtureId", fixture._id))
          .collect();

        const recapManagers = await ctx.db
          .query("recap_managers")
          .withIndex("by_fixture", (q) => q.eq("fixtureId", fixture._id))
          .collect();

        // Enrich contracts with related entities
        const enrichedContracts = await Promise.all(
          contracts.map(async (contract) => {
            const [owner, charterer, broker, vessel, loadPort, dischargePort, cargoType, negotiation, order] = await Promise.all([
              contract.ownerId ? ctx.db.get(contract.ownerId) : null,
              contract.chartererId ? ctx.db.get(contract.chartererId) : null,
              contract.brokerId ? ctx.db.get(contract.brokerId) : null,
              contract.vesselId ? ctx.db.get(contract.vesselId) : null,
              contract.loadPortId ? ctx.db.get(contract.loadPortId) : null,
              contract.dischargePortId ? ctx.db.get(contract.dischargePortId) : null,
              contract.cargoTypeId ? ctx.db.get(contract.cargoTypeId) : null,
              contract.negotiationId ? ctx.db.get(contract.negotiationId) : null,
              contract.orderId ? ctx.db.get(contract.orderId) : null,
            ]);

            return {
              ...contract,
              owner,
              charterer,
              broker,
              vessel,
              loadPort,
              dischargePort,
              cargoType,
              negotiation,
              order,
            };
          })
        );

        // Get order
        const order = fixture.orderId ? await ctx.db.get(fixture.orderId) : null;

        return {
          ...fixture,
          order,
          contracts: enrichedContracts,
          recapManagers, // Recap managers with minimal enrichment
        };
      })
    );

    return {
      items: enrichedItems,
      nextCursor,
      hasMore,
      totalCount: null,
    };
  },
});

// Helper: Minimal enrichment (batch operations)
async function enrichMinimal(ctx: any, fixtures: any[], filters?: any) {
  // Batch fetch all contracts in one query per fixture
  const allContractsPromises = fixtures.map((f) =>
    ctx.db
      .query("contracts")
      .withIndex("by_fixture", (q: any) => q.eq("fixtureId", f._id))
      .collect()
  );
  const allContracts = await Promise.all(allContractsPromises);

  // Extract all unique IDs
  const companyIds = new Set<string>();
  const vesselIds = new Set<string>();
  const portIds = new Set<string>();
  const cargoTypeIds = new Set<string>();
  const negotiationIds = new Set<string>();

  allContracts.flat().forEach((contract) => {
    if (contract.ownerId) companyIds.add(contract.ownerId);
    if (contract.chartererId) companyIds.add(contract.chartererId);
    if (contract.brokerId) companyIds.add(contract.brokerId);
    if (contract.vesselId) vesselIds.add(contract.vesselId);
    if (contract.loadPortId) portIds.add(contract.loadPortId);
    if (contract.dischargePortId) portIds.add(contract.dischargePortId);
    if (contract.cargoTypeId) cargoTypeIds.add(contract.cargoTypeId);
    if (contract.negotiationId) negotiationIds.add(contract.negotiationId);
  });

  // Batch fetch all related entities
  const [companies, vessels, ports, cargoTypes, negotiations] = await Promise.all([
    Promise.all(Array.from(companyIds).map((id) => ctx.db.get(id))),
    Promise.all(Array.from(vesselIds).map((id) => ctx.db.get(id))),
    Promise.all(Array.from(portIds).map((id) => ctx.db.get(id))),
    Promise.all(Array.from(cargoTypeIds).map((id) => ctx.db.get(id))),
    Promise.all(Array.from(negotiationIds).map((id) => ctx.db.get(id))),
  ]);

  // Create lookup maps
  const companyMap = new Map(companies.filter(Boolean).map((c) => [c._id, c]));
  const vesselMap = new Map(vessels.filter(Boolean).map((v) => [v._id, v]));
  const portMap = new Map(ports.filter(Boolean).map((p) => [p._id, p]));
  const cargoTypeMap = new Map(cargoTypes.filter(Boolean).map((ct) => [ct._id, ct]));
  const negotiationMap = new Map(negotiations.filter(Boolean).map((n) => [n._id, n]));

  // Build minimal fixture data (only what's needed for table)
  const enrichedFixtures = fixtures.map((fixture, index) => {
    const contracts = allContracts[index];
    const primaryContract = contracts[0];

    if (!primaryContract) {
      return {
        ...fixture,
        vessels: null,
        owner: null,
        charterer: null,
        broker: null,
        loadPort: null,
        dischargePort: null,
        cargoType: null,
        cargoQuantity: null,
        laycanStart: null,
        laycanEnd: null,
        freightRate: null,
        demurrageRate: null,
        contractType: null,
        contractStatus: null,
        cpDate: null,
        marketIndexName: null,
      };
    }

    const vessel = vesselMap.get(primaryContract.vesselId);
    const owner = companyMap.get(primaryContract.ownerId);
    const charterer = companyMap.get(primaryContract.chartererId);
    const broker = companyMap.get(primaryContract.brokerId);
    const loadPort = portMap.get(primaryContract.loadPortId);
    const dischargePort = portMap.get(primaryContract.dischargePortId);
    const cargoType = cargoTypeMap.get(primaryContract.cargoTypeId);
    const negotiation = negotiationMap.get(primaryContract.negotiationId);

    return {
      ...fixture,
      // Essential table display fields
      vessels: vessel?.name || null,
      owner: owner?.name || null,
      charterer: charterer?.name || null,
      broker: broker?.name || null,
      loadPort: loadPort?.name || null,
      loadPortCountry: loadPort?.country || null,
      dischargePort: dischargePort?.name || null,
      dischargePortCountry: dischargePort?.country || null,
      cargoType: cargoType?.name || null,
      cargoQuantity: primaryContract.quantity || null,
      laycanStart: primaryContract.laycanStart || null,
      laycanEnd: primaryContract.laycanEnd || null,
      freightRate: primaryContract.freightRate || null,
      demurrageRate: primaryContract.demurrageRate || null,
      contractType: primaryContract.contractType || null,
      contractStatus: primaryContract.status || null,
      cpDate: primaryContract.createdAt || null,
      loadDeliveryType: primaryContract.loadDeliveryType || null,
      dischargeRedeliveryType: primaryContract.dischargeRedeliveryType || null,
      marketIndexName: negotiation?.marketIndexName || null,
    };
  });

  // Apply client-side filters that can't be done on fixture table directly
  // (filters on related entities like vessel name, company names, etc.)
  let filtered = enrichedFixtures;

  if (filters) {
    filtered = enrichedFixtures.filter((f) => {
      // Vessel filter
      if (filters.vessels && filters.vessels.length > 0) {
        if (!f.vessels || !filters.vessels.includes(f.vessels)) return false;
      }

      // Owner filter
      if (filters.owner && filters.owner.length > 0) {
        if (!f.owner || !filters.owner.includes(f.owner)) return false;
      }

      // Charterer filter
      if (filters.charterer && filters.charterer.length > 0) {
        if (!f.charterer || !filters.charterer.includes(f.charterer)) return false;
      }

      // Broker filter
      if (filters.broker && filters.broker.length > 0) {
        if (!f.broker || !filters.broker.includes(f.broker)) return false;
      }

      // Load port name filter
      if (filters.loadPortName && filters.loadPortName.length > 0) {
        if (!f.loadPort || !filters.loadPortName.includes(f.loadPort)) return false;
      }

      // Load port country filter
      if (filters.loadPortCountry && filters.loadPortCountry.length > 0) {
        if (!f.loadPortCountry || !filters.loadPortCountry.includes(f.loadPortCountry)) return false;
      }

      // Discharge port name filter
      if (filters.dischargePortName && filters.dischargePortName.length > 0) {
        if (!f.dischargePort || !filters.dischargePortName.includes(f.dischargePort)) return false;
      }

      // Discharge port country filter
      if (filters.dischargePortCountry && filters.dischargePortCountry.length > 0) {
        if (!f.dischargePortCountry || !filters.dischargePortCountry.includes(f.dischargePortCountry))
          return false;
      }

      // Cargo type filter
      if (filters.cargoTypeName && filters.cargoTypeName.length > 0) {
        if (!f.cargoType || !filters.cargoTypeName.includes(f.cargoType)) return false;
      }

      // Contract type filter
      if (filters.contractType && filters.contractType.length > 0) {
        if (!f.contractType || !filters.contractType.includes(f.contractType)) return false;
      }

      // Contract status filter
      if (filters.contractStatus && filters.contractStatus.length > 0) {
        if (!f.contractStatus || !filters.contractStatus.includes(f.contractStatus)) return false;
      }

      // Delivery type filters
      if (filters.loadDeliveryType && filters.loadDeliveryType.length > 0) {
        if (!f.loadDeliveryType || !filters.loadDeliveryType.includes(f.loadDeliveryType))
          return false;
      }

      if (filters.dischargeRedeliveryType && filters.dischargeRedeliveryType.length > 0) {
        if (
          !f.dischargeRedeliveryType ||
          !filters.dischargeRedeliveryType.includes(f.dischargeRedeliveryType)
        )
          return false;
      }

      // Market index filter
      if (filters.marketIndexName && filters.marketIndexName.length > 0) {
        if (!f.marketIndexName || !filters.marketIndexName.includes(f.marketIndexName)) return false;
      }

      // Cargo quantity range filter
      if (filters.cargoQuantity) {
        if (
          !f.cargoQuantity ||
          f.cargoQuantity < filters.cargoQuantity.min ||
          f.cargoQuantity > filters.cargoQuantity.max
        )
          return false;
      }

      // Laycan date range filter
      if (filters.laycanStart) {
        if (
          !f.laycanStart ||
          f.laycanStart < filters.laycanStart.min ||
          f.laycanStart > filters.laycanStart.max
        )
          return false;
      }

      return true;
    });
  }

  return filtered;
}

// Get filter options (computed on-demand without caching)
export const getFilterOptions = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Query reference tables directly
    const [vessels, companies, ports, cargoTypes, fixtures] = await Promise.all([
      ctx.db.query("vessels").collect(),
      ctx.db.query("companies").collect(),
      ctx.db.query("ports").collect(),
      ctx.db.query("cargo_types").collect(),
      ctx.db
        .query("fixtures")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .take(100), // Limit to first 100 for performance
    ]);

    // Get sample contracts to extract unique values
    const sampleContracts = await Promise.all(
      fixtures.slice(0, 50).map((f) =>
        ctx.db
          .query("contracts")
          .withIndex("by_fixture", (q) => q.eq("fixtureId", f._id))
          .first()
      )
    );
    const contracts = sampleContracts.filter(Boolean);

    // Get sample negotiations for market index names
    const negotiationIds = contracts
      .map((c) => c!.negotiationId)
      .filter(Boolean)
      .slice(0, 20);
    const negotiations = await Promise.all(
      negotiationIds.map((id) => ctx.db.get(id!))
    );

    // Extract unique values
    const uniqueMarketIndexNames = [
      ...new Set(
        negotiations
          .filter(Boolean)
          .map((n) => n!.marketIndexName)
          .filter(Boolean)
      ),
    ];

    const uniqueContractTypes = [...new Set(contracts.map((c) => c!.contractType))];
    const uniqueContractStatuses = [...new Set(contracts.map((c) => c!.status))];
    const uniqueLoadDeliveryTypes = [
      ...new Set(contracts.map((c) => c!.loadDeliveryType).filter(Boolean)),
    ];
    const uniqueDischargeRedeliveryTypes = [
      ...new Set(contracts.map((c) => c!.dischargeRedeliveryType).filter(Boolean)),
    ];

    // Get users for deal capture, order created by, etc.
    const users = await ctx.db.query("users").collect();

    // Define standard stages and approval statuses (these are derived/computed fields)
    const standardStages = ["inquiry", "indication", "recap", "firm", "subjects", "main-terms"];
    const standardApprovalStatuses = ["pending", "partially-approved", "approved", "rejected"];

    return {
      vessels: vessels.map((v) => ({ value: v.name, label: v.name })),
      owners: companies
        .filter((c) => c.roles?.includes("owner"))
        .map((c) => ({ value: c.name, label: c.name })),
      charterers: companies
        .filter((c) => c.roles?.includes("charterer"))
        .map((c) => ({ value: c.name, label: c.name })),
      brokers: companies
        .filter((c) => c.roles?.includes("broker"))
        .map((c) => ({ value: c.name, label: c.name })),
      loadPorts: ports.map((p) => ({ value: p.name, label: p.name })),
      loadCountries: [
        ...new Set(ports.map((p) => p.country)),
      ].map((country) => ({ value: country, label: country })),
      dischargePorts: ports.map((p) => ({ value: p.name, label: p.name })),
      dischargeCountries: [
        ...new Set(ports.map((p) => p.country)),
      ].map((country) => ({ value: country, label: country })),
      cargoTypes: cargoTypes.map((ct) => ({ value: ct.name, label: ct.name })),
      contractTypes: uniqueContractTypes.map((ct) => ({
        value: ct,
        label: ct
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
      })),
      loadDeliveryTypes: uniqueLoadDeliveryTypes.map((ldt) => ({
        value: ldt,
        label: ldt,
      })),
      dischargeRedeliveryTypes: uniqueDischargeRedeliveryTypes.map((drt) => ({
        value: drt,
        label: drt,
      })),
      marketIndexNames: uniqueMarketIndexNames.map((min) => ({
        value: min,
        label: min,
      })),
      status: [
        "draft",
        "working-copy",
        "final",
        "on-subs",
        "fully-fixed",
        "canceled",
      ].map((status) => ({
        value: status,
        label: status
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
      })),
      stages: standardStages.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ") })),
      approvalStatuses: standardApprovalStatuses.map((s) => ({
        value: s,
        label: s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
      })),
      // Approval/signature status options (standard values)
      ownerApprovalStatuses: ["pending", "approved", "rejected"].map((s) => ({
        value: s,
        label: s.charAt(0).toUpperCase() + s.slice(1),
      })),
      chartererApprovalStatuses: ["pending", "approved", "rejected"].map((s) => ({
        value: s,
        label: s.charAt(0).toUpperCase() + s.slice(1),
      })),
      ownerSignatureStatuses: ["not-sent", "sent", "signed"].map((s) => ({
        value: s,
        label: s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      })),
      chartererSignatureStatuses: ["not-sent", "sent", "signed"].map((s) => ({
        value: s,
        label: s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      })),
      // User tracking
      dealCaptureUsers: users.map((u) => ({ value: u.name, label: u.name })),
      orderCreatedBy: users.map((u) => ({ value: u.name, label: u.name })),
      negotiationCreatedBy: users.map((u) => ({ value: u.name, label: u.name })),
    };
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
    const fixtureId = await ctx.db.insert("fixtures", {
      fixtureNumber,
      orderId: isTradeFlow ? orderId : undefined,
      organizationId: organization._id,
      status: fixtureStatus,
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

      // Generate delivery terms for this contract
      const deliveryTerms = getDeliveryTerms(cargoType.category);

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
        loadDeliveryType: deliveryTerms.load,
        dischargeRedeliveryType: deliveryTerms.discharge,
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
