import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// Helper function to calculate and update fixture's lastUpdated
// Duplicated here to avoid circular dependency issues with internal functions
async function updateFixtureLastUpdated(
  ctx: MutationCtx,
  fixtureId: Id<"fixtures">
): Promise<void> {
  const fixture = await ctx.db.get(fixtureId);
  if (!fixture) return;

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
  let negotiations: { updatedAt?: number; _creationTime: number }[] = [];
  if (fixture.orderId) {
    negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_order", (q) => q.eq("orderId", fixture.orderId!))
      .collect();
  }

  // Calculate max timestamp from all related entities
  const timestamps = [
    fixture._creationTime,
    fixture.updatedAt || 0,
    ...contracts.map((c) => c.updatedAt || c._creationTime),
    ...recapManagers.map((r) => r.updatedAt || r._creationTime),
    ...negotiations.map((n) => n.updatedAt || n._creationTime),
  ];

  const lastUpdated = Math.max(...timestamps);
  await ctx.db.patch(fixtureId, { lastUpdated });
}

// Helper function to rebuild fixture's searchText
// Duplicated here to avoid circular dependency issues with internal functions
async function updateFixtureSearchText(
  ctx: MutationCtx,
  fixtureId: Id<"fixtures">
): Promise<void> {
  const fixture = await ctx.db.get(fixtureId);
  if (!fixture) return;

  const values = new Set<string>();
  values.add(fixture.fixtureNumber);

  const contracts = await ctx.db.query("contracts").withIndex("by_fixture", (q) => q.eq("fixtureId", fixtureId)).collect();
  const recapManagers = await ctx.db.query("recap_managers").withIndex("by_fixture", (q) => q.eq("fixtureId", fixtureId)).collect();

  let negotiations: any[] = [];
  let order: any = null;
  if (fixture.orderId) {
    order = await ctx.db.get(fixture.orderId);
    negotiations = await ctx.db.query("negotiations").withIndex("by_order", (q) => q.eq("orderId", fixture.orderId!)).collect();
  }

  const vesselIds = new Set<string>();
  const companyIds = new Set<string>();
  const portIds = new Set<string>();
  const cargoTypeIds = new Set<string>();
  const userIds = new Set<string>();

  for (const c of contracts) {
    if (c.contractNumber) values.add(c.contractNumber);
    if (c.contractType) values.add(c.contractType);
    if (c.loadDeliveryType) values.add(c.loadDeliveryType);
    if (c.dischargeRedeliveryType) values.add(c.dischargeRedeliveryType);
    if (c.vesselId) vesselIds.add(c.vesselId);
    if (c.ownerId) companyIds.add(c.ownerId);
    if (c.chartererId) companyIds.add(c.chartererId);
    if (c.brokerId) companyIds.add(c.brokerId);
    if (c.loadPortId) portIds.add(c.loadPortId);
    if (c.dischargePortId) portIds.add(c.dischargePortId);
    if (c.cargoTypeId) cargoTypeIds.add(c.cargoTypeId);
  }
  for (const r of recapManagers) {
    if (r.recapNumber) values.add(r.recapNumber);
    if (r.contractType) values.add(r.contractType);
    if (r.vesselId) vesselIds.add(r.vesselId);
    if (r.ownerId) companyIds.add(r.ownerId);
    if (r.chartererId) companyIds.add(r.chartererId);
    if (r.brokerId) companyIds.add(r.brokerId);
    if (r.loadPortId) portIds.add(r.loadPortId);
    if (r.dischargePortId) portIds.add(r.dischargePortId);
    if (r.cargoTypeId) cargoTypeIds.add(r.cargoTypeId);
  }
  for (const n of negotiations) {
    if (n.negotiationNumber) values.add(n.negotiationNumber);
    if (n.marketIndexName) values.add(n.marketIndexName);
    if (n.loadDeliveryType) values.add(n.loadDeliveryType);
    if (n.dischargeRedeliveryType) values.add(n.dischargeRedeliveryType);
    if (n.vesselId) vesselIds.add(n.vesselId);
    if (n.counterpartyId) companyIds.add(n.counterpartyId);
    if (n.brokerId) companyIds.add(n.brokerId);
    if (n.dealCaptureUserId) userIds.add(n.dealCaptureUserId);
  }
  if (order) {
    if (order.createdByUserId) userIds.add(order.createdByUserId);
    if (order.loadPortId) portIds.add(order.loadPortId);
    if (order.dischargePortId) portIds.add(order.dischargePortId);
    if (order.cargoTypeId) cargoTypeIds.add(order.cargoTypeId);
  }

  for (const id of vesselIds) { const v = await ctx.db.get(id as Id<"vessels">); if (v) { values.add(v.name); if (v.imoNumber) values.add(v.imoNumber); } }
  for (const id of companyIds) { const c = await ctx.db.get(id as Id<"companies">); if (c) values.add(c.name); }
  for (const id of portIds) { const p = await ctx.db.get(id as Id<"ports">); if (p) { values.add(p.name); if (p.country) values.add(p.country); } }
  for (const id of cargoTypeIds) { const ct = await ctx.db.get(id as Id<"cargo_types">); if (ct) values.add(ct.name); }
  for (const id of userIds) { const u = await ctx.db.get(id as Id<"users">); if (u) values.add(u.name); }

  const searchText = Array.from(values).map((v) => v.toLowerCase()).join(" ");
  await ctx.db.patch(fixtureId, { searchText });
}

// Generate recap number (RCP12345)
function generateRecapNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `RCP${randomNum}`;
}

// Create a new recap manager (wet market)
export const create = mutation({
  args: {
    fixtureId: v.optional(v.id("fixtures")),
    negotiationId: v.optional(v.id("negotiations")),
    orderId: v.optional(v.id("orders")),
    parentRecapId: v.optional(v.id("recap_managers")),
    contractType: v.union(
      v.literal("voyage-charter"),
      v.literal("time-charter"),
      v.literal("bareboat"),
      v.literal("coa")
    ),
    ownerId: v.id("companies"),
    chartererId: v.id("companies"),
    brokerId: v.optional(v.id("companies")),
    vesselId: v.optional(v.id("vessels")),
    loadPortId: v.optional(v.id("ports")),
    dischargePortId: v.optional(v.id("ports")),
    laycanStart: v.optional(v.number()),
    laycanEnd: v.optional(v.number()),
    freightRate: v.optional(v.string()),
    freightRateType: v.optional(
      v.union(
        v.literal("worldscale"),
        v.literal("lumpsum"),
        v.literal("per-tonne")
      )
    ),
    demurrageRate: v.optional(v.string()),
    despatchRate: v.optional(v.string()),
    addressCommission: v.optional(v.string()),
    brokerCommission: v.optional(v.string()),
    cargoTypeId: v.optional(v.id("cargo_types")),
    quantity: v.optional(v.number()),
    quantityUnit: v.optional(v.string()),
    approvalStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const recapNumber = generateRecapNumber();

    // Validate: both orderId and negotiationId must be present, OR both must be empty
    if ((args.orderId && !args.negotiationId) || (!args.orderId && args.negotiationId)) {
      throw new Error("orderId and negotiationId must both be present or both be empty");
    }

    const recapId = await ctx.db.insert("recap_managers", {
      recapNumber,
      fixtureId: args.fixtureId,
      negotiationId: args.negotiationId,
      orderId: args.orderId,
      parentRecapId: args.parentRecapId,
      contractType: args.contractType,
      ownerId: args.ownerId,
      chartererId: args.chartererId,
      brokerId: args.brokerId,
      vesselId: args.vesselId,
      loadPortId: args.loadPortId,
      dischargePortId: args.dischargePortId,
      laycanStart: args.laycanStart,
      laycanEnd: args.laycanEnd,
      freightRate: args.freightRate,
      freightRateType: args.freightRateType,
      demurrageRate: args.demurrageRate,
      despatchRate: args.despatchRate,
      addressCommission: args.addressCommission,
      brokerCommission: args.brokerCommission,
      cargoTypeId: args.cargoTypeId,
      quantity: args.quantity,
      quantityUnit: args.quantityUnit,
      status: "draft",
      approvalStatus: args.approvalStatus,
      createdAt: now,
      updatedAt: now,
    });

    // Update the fixture's lastUpdated timestamp and searchText if fixtureId is provided
    if (args.fixtureId) {
      await updateFixtureLastUpdated(ctx, args.fixtureId);
      await updateFixtureSearchText(ctx, args.fixtureId);
    }

    // TODO: Log activity

    return recapId;
  },
});

// Update recap manager
export const update = mutation({
  args: {
    recapId: v.id("recap_managers"),
    vesselId: v.optional(v.id("vessels")),
    loadPortId: v.optional(v.id("ports")),
    dischargePortId: v.optional(v.id("ports")),
    laycanStart: v.optional(v.number()),
    laycanEnd: v.optional(v.number()),
    freightRate: v.optional(v.string()),
    freightRateType: v.optional(
      v.union(
        v.literal("worldscale"),
        v.literal("lumpsum"),
        v.literal("per-tonne")
      )
    ),
    demurrageRate: v.optional(v.string()),
    despatchRate: v.optional(v.string()),
    addressCommission: v.optional(v.string()),
    brokerCommission: v.optional(v.string()),
    quantity: v.optional(v.number()),
    quantityUnit: v.optional(v.string()),
    approvalStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { recapId, ...updates } = args;

    const existing = await ctx.db.get(recapId);
    if (!existing) {
      throw new Error("Recap manager not found");
    }

    // TODO: Track field changes

    await ctx.db.patch(recapId, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Update the fixture's lastUpdated timestamp and searchText if fixtureId exists
    if (existing.fixtureId) {
      await updateFixtureLastUpdated(ctx, existing.fixtureId);
      await updateFixtureSearchText(ctx, existing.fixtureId);
    }

    return recapId;
  },
});

// Update recap manager status
export const updateStatus = mutation({
  args: {
    recapId: v.id("recap_managers"),
    status: v.union(
      v.literal("draft"),
      v.literal("on-subs"),
      v.literal("fully-fixed"),
      v.literal("canceled"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const recap = await ctx.db.get(args.recapId);
    if (!recap) {
      throw new Error("Recap manager not found");
    }

    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "fully-fixed") {
      updates.fixedAt = Date.now();
    }

    await ctx.db.patch(args.recapId, updates);

    // Update the fixture's lastUpdated timestamp and searchText if fixtureId exists
    if (recap.fixtureId) {
      await updateFixtureLastUpdated(ctx, recap.fixtureId);
      await updateFixtureSearchText(ctx, recap.fixtureId);
    }

    // TODO: Log activity

    return args.recapId;
  },
});

// List all recap managers
export const list = query({
  args: {},
  handler: async (ctx) => {
    const recaps = await ctx.db.query("recap_managers").collect();
    return recaps.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get recap manager by ID with full details
export const getById = query({
  args: { recapId: v.id("recap_managers") },
  handler: async (ctx, args) => {
    const recap = await ctx.db.get(args.recapId);
    if (!recap) {
      return null;
    }

    // Get related entities
    const owner = await ctx.db.get(recap.ownerId);
    const charterer = await ctx.db.get(recap.chartererId);
    const broker = recap.brokerId ? await ctx.db.get(recap.brokerId) : null;
    const vessel = recap.vesselId ? await ctx.db.get(recap.vesselId) : null;
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
    const order = recap.orderId ? await ctx.db.get(recap.orderId) : null;

    // Get addenda
    const addenda = await ctx.db
      .query("recap_addenda")
      .withIndex("by_recap", (q) => q.eq("recapManagerId", args.recapId))
      .collect();

    // Get voyages if COA
    const voyages =
      recap.contractType === "coa"
        ? await ctx.db
            .query("voyages")
            .withIndex("by_recap", (q) => q.eq("parentRecapId", args.recapId))
            .collect()
        : [];

    return {
      ...recap,
      owner,
      charterer,
      broker,
      vessel,
      loadPort,
      dischargePort,
      cargoType,
      negotiation,
      order,
      addenda,
      voyages,
    };
  },
});

// List recap managers by status
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("draft"),
      v.literal("on-subs"),
      v.literal("fully-fixed"),
      v.literal("canceled"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const recaps = await ctx.db
      .query("recap_managers")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();

    return recaps.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// List recap managers by negotiation
export const listByNegotiation = query({
  args: { negotiationId: v.id("negotiations") },
  handler: async (ctx, args) => {
    const recaps = await ctx.db
      .query("recap_managers")
      .withIndex("by_negotiation", (q) =>
        q.eq("negotiationId", args.negotiationId)
      )
      .collect();

    return recaps.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// List recap managers by order
export const listByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const recaps = await ctx.db
      .query("recap_managers")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    return recaps.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// List all recap managers with enriched data
export const listEnriched = query({
  args: {},
  handler: async (ctx) => {
    const recaps = await ctx.db.query("recap_managers").collect();

    const enrichedRecaps = await Promise.all(
      recaps.map(async (recap) => {
        // Get related entities
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
        const cargoType = recap.cargoTypeId
          ? await ctx.db.get(recap.cargoTypeId)
          : null;
        const loadPort = recap.loadPortId
          ? await ctx.db.get(recap.loadPortId)
          : null;
        const dischargePort = recap.dischargePortId
          ? await ctx.db.get(recap.dischargePortId)
          : null;

        // Get avatar URLs for companies
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

        return {
          ...recap,
          owner: ownerWithAvatar,
          charterer: chartererWithAvatar,
          broker: brokerWithAvatar,
          vessel,
          cargoType,
          loadPort,
          dischargePort,
        };
      })
    );

    return enrichedRecaps.sort((a, b) => b._creationTime - a._creationTime);
  },
});
