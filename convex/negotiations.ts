import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// Generate negotiation number (NEG12345)
function generateNegotiationNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `NEG${randomNum}`;
}

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

// Helper function to update fixture's lastUpdated via order
async function updateFixtureLastUpdatedViaOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">
): Promise<void> {
  // Find fixture linked to this order
  const fixture = await ctx.db
    .query("fixtures")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .first();

  if (fixture) {
    await updateFixtureLastUpdated(ctx, fixture._id);
  }
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

// Helper function to update fixture's searchText via order
async function updateFixtureSearchTextViaOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">
): Promise<void> {
  const fixture = await ctx.db
    .query("fixtures")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .first();

  if (fixture) {
    await updateFixtureSearchText(ctx, fixture._id);
  }
}

// Create a new negotiation
export const create = mutation({
  args: {
    orderId: v.id("orders"),
    counterpartyId: v.id("companies"),
    brokerId: v.optional(v.id("companies")),
    bidPrice: v.optional(v.string()),
    offerPrice: v.optional(v.string()),
    freightRate: v.optional(v.string()),
    demurrageRate: v.optional(v.string()),
    tce: v.optional(v.string()),
    validity: v.optional(v.string()),
    vesselId: v.optional(v.id("vessels")),
    status: v.optional(
      v.union(
        v.literal("indicative-offer"),
        v.literal("indicative-bid"),
        v.literal("firm-offer"),
        v.literal("firm-bid"),
        v.literal("firm"),
        v.literal("on-subs"),
        v.literal("fixed"),
        v.literal("firm-offer-expired"),
        v.literal("withdrawn"),
        v.literal("firm-amendment"),
        v.literal("subs-expired"),
        v.literal("subs-failed"),
        v.literal("on-subs-amendment")
      )
    ),
    personInChargeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const negotiationNumber = generateNegotiationNumber();

    const negotiationId = await ctx.db.insert("negotiations", {
      negotiationNumber,
      orderId: args.orderId,
      counterpartyId: args.counterpartyId,
      brokerId: args.brokerId,
      bidPrice: args.bidPrice,
      offerPrice: args.offerPrice,
      freightRate: args.freightRate,
      demurrageRate: args.demurrageRate,
      tce: args.tce,
      validity: args.validity,
      vesselId: args.vesselId,
      status: args.status || "indicative-offer",
      personInChargeId: args.personInChargeId,
      createdAt: now,
      updatedAt: now,
    });

    // Update the fixture's lastUpdated timestamp and searchText via the order
    await updateFixtureLastUpdatedViaOrder(ctx, args.orderId);
    await updateFixtureSearchTextViaOrder(ctx, args.orderId);

    // TODO: Log activity
    // await logActivity(ctx, "negotiation", negotiationId, "created", ...);

    return negotiationId;
  },
});

// Update a negotiation
export const update = mutation({
  args: {
    negotiationId: v.id("negotiations"),
    bidPrice: v.optional(v.string()),
    offerPrice: v.optional(v.string()),
    freightRate: v.optional(v.string()),
    demurrageRate: v.optional(v.string()),
    tce: v.optional(v.string()),
    validity: v.optional(v.string()),
    vesselId: v.optional(v.id("vessels")),
    personInChargeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { negotiationId, ...updates } = args;

    // Get existing for field change tracking
    const existing = await ctx.db.get(negotiationId);
    if (!existing) {
      throw new Error("Negotiation not found");
    }

    // TODO: Track field changes

    await ctx.db.patch(negotiationId, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Update the fixture's lastUpdated timestamp and searchText via the order
    await updateFixtureLastUpdatedViaOrder(ctx, existing.orderId);
    await updateFixtureSearchTextViaOrder(ctx, existing.orderId);

    return negotiationId;
  },
});

// Update negotiation status
export const updateStatus = mutation({
  args: {
    negotiationId: v.id("negotiations"),
    status: v.union(
      v.literal("indicative-offer"),
      v.literal("indicative-bid"),
      v.literal("firm-offer"),
      v.literal("firm-bid"),
      v.literal("firm"),
      v.literal("on-subs"),
      v.literal("fixed"),
      v.literal("firm-offer-expired"),
      v.literal("withdrawn"),
      v.literal("firm-amendment"),
      v.literal("subs-expired"),
      v.literal("subs-failed"),
      v.literal("on-subs-amendment")
    ),
  },
  handler: async (ctx, args) => {
    const negotiation = await ctx.db.get(args.negotiationId);
    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    await ctx.db.patch(args.negotiationId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Update the fixture's lastUpdated timestamp and searchText via the order
    await updateFixtureLastUpdatedViaOrder(ctx, negotiation.orderId);
    await updateFixtureSearchTextViaOrder(ctx, negotiation.orderId);

    // TODO: Log activity
    // await logActivity(ctx, "negotiation", args.negotiationId, "status_changed", ...);

    return args.negotiationId;
  },
});

// List negotiations by order
export const listByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Enrich with related data
    const enriched = await Promise.all(
      negotiations.map(async (negotiation) => {
        const counterparty = await ctx.db.get(negotiation.counterpartyId);
        const broker = negotiation.brokerId
          ? await ctx.db.get(negotiation.brokerId)
          : null;
        const vessel = negotiation.vesselId
          ? await ctx.db.get(negotiation.vesselId)
          : null;
        const personInCharge = negotiation.personInChargeId
          ? await ctx.db.get(negotiation.personInChargeId)
          : null;

        return {
          ...negotiation,
          counterparty,
          broker,
          vessel,
          personInCharge,
        };
      })
    );

    return enriched.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get negotiation by ID
export const getById = query({
  args: { negotiationId: v.id("negotiations") },
  handler: async (ctx, args) => {
    const negotiation = await ctx.db.get(args.negotiationId);
    if (!negotiation) {
      return null;
    }

    // Get related entities
    const counterparty = await ctx.db.get(negotiation.counterpartyId);
    const broker = negotiation.brokerId
      ? await ctx.db.get(negotiation.brokerId)
      : null;
    const vessel = negotiation.vesselId
      ? await ctx.db.get(negotiation.vesselId)
      : null;
    const personInCharge = negotiation.personInChargeId
      ? await ctx.db.get(negotiation.personInChargeId)
      : null;
    const order = await ctx.db.get(negotiation.orderId);

    return {
      ...negotiation,
      counterparty,
      broker,
      vessel,
      personInCharge,
      order,
    };
  },
});

// List negotiations by status
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("indicative-offer"),
      v.literal("indicative-bid"),
      v.literal("firm-offer"),
      v.literal("firm-bid"),
      v.literal("firm"),
      v.literal("on-subs"),
      v.literal("fixed"),
      v.literal("firm-offer-expired"),
      v.literal("withdrawn"),
      v.literal("firm-amendment"),
      v.literal("subs-expired"),
      v.literal("subs-failed"),
      v.literal("on-subs-amendment")
    ),
  },
  handler: async (ctx, args) => {
    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();

    return negotiations.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// List negotiations by counterparty
export const listByCounterparty = query({
  args: { counterpartyId: v.id("companies") },
  handler: async (ctx, args) => {
    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_counterparty", (q) =>
        q.eq("counterpartyId", args.counterpartyId)
      )
      .collect();

    return negotiations.sort((a, b) => b._creationTime - a._creationTime);
  },
});

/**
 * Calculate analytics for a negotiation from activity log history
 * This should be called when a negotiation reaches "firm" or "fixed" status
 */
export const calculateAnalytics = mutation({
  args: {
    negotiationId: v.id("negotiations"),
  },
  handler: async (ctx, args) => {
    const negotiation = await ctx.db.get(args.negotiationId);
    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    // Get all activity logs for this negotiation
    const activityLogs = await ctx.db
      .query("activity_logs")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "negotiation").eq("entityId", negotiation._id)
      )
      .collect();

    // Sort by timestamp
    const sortedLogs = activityLogs.sort((a, b) => a.timestamp - b.timestamp);

    // Extract freight rates and demurrage values from activity logs
    // Activity logs with expandable data may contain freight/demurrage information
    const freightRates: Array<{ value: number; timestamp: number }> = [];
    const demurrageRates: Array<{ value: number; timestamp: number }> = [];

    for (const log of sortedLogs) {
      // Check if expandable data contains rate information
      if (log.expandable?.data) {
        for (const item of log.expandable.data) {
          // Look for freight rate entries
          if (
            item.label.toLowerCase().includes("freight") ||
            item.label.toLowerCase().includes("rate")
          ) {
            const numericValue = parseFloat(item.value.replace(/[^0-9.]/g, ""));
            if (!isNaN(numericValue)) {
              freightRates.push({
                value: numericValue,
                timestamp: log.timestamp,
              });
            }
          }
          // Look for demurrage entries
          if (item.label.toLowerCase().includes("demurrage")) {
            const numericValue = parseFloat(item.value.replace(/[^0-9.]/g, ""));
            if (!isNaN(numericValue)) {
              demurrageRates.push({
                value: numericValue,
                timestamp: log.timestamp,
              });
            }
          }
        }
      }

      // Also check if the negotiation's freightRate/demurrageRate fields have numeric values
      if (log.timestamp && negotiation.freightRate) {
        const freightNum = parseFloat(
          negotiation.freightRate.replace(/[^0-9.]/g, "")
        );
        if (!isNaN(freightNum) && freightRates.length === 0) {
          freightRates.push({ value: freightNum, timestamp: log.timestamp });
        }
      }

      if (log.timestamp && negotiation.demurrageRate) {
        const demurrageNum = parseFloat(
          negotiation.demurrageRate.replace(/[^0-9.]/g, "")
        );
        if (!isNaN(demurrageNum) && demurrageRates.length === 0) {
          demurrageRates.push({
            value: demurrageNum,
            timestamp: log.timestamp,
          });
        }
      }
    }

    // Calculate analytics for freight rates
    let highestFreightRateIndication: number | undefined;
    let lowestFreightRateIndication: number | undefined;
    let firstFreightRateIndication: number | undefined;
    let highestFreightRateLastDay: number | undefined;
    let lowestFreightRateLastDay: number | undefined;
    let firstFreightRateLastDay: number | undefined;

    if (freightRates.length > 0) {
      const values = freightRates.map((r) => r.value);
      highestFreightRateIndication = Math.max(...values);
      lowestFreightRateIndication = Math.min(...values);
      firstFreightRateIndication = freightRates[0].value;

      // Get last day's rates (last 24 hours of activity)
      const lastTimestamp = freightRates[freightRates.length - 1].timestamp;
      const oneDayMs = 24 * 60 * 60 * 1000;
      const lastDayRates = freightRates.filter(
        (r) => r.timestamp >= lastTimestamp - oneDayMs
      );

      if (lastDayRates.length > 0) {
        const lastDayValues = lastDayRates.map((r) => r.value);
        highestFreightRateLastDay = Math.max(...lastDayValues);
        lowestFreightRateLastDay = Math.min(...lastDayValues);
        firstFreightRateLastDay = lastDayRates[0].value;
      }
    }

    // Calculate analytics for demurrage rates
    let highestDemurrageIndication: number | undefined;
    let lowestDemurrageIndication: number | undefined;
    let firstDemurrageIndication: number | undefined;
    let highestDemurrageLastDay: number | undefined;
    let lowestDemurrageLastDay: number | undefined;
    let firstDemurrageLastDay: number | undefined;

    if (demurrageRates.length > 0) {
      const values = demurrageRates.map((r) => r.value);
      highestDemurrageIndication = Math.max(...values);
      lowestDemurrageIndication = Math.min(...values);
      firstDemurrageIndication = demurrageRates[0].value;

      // Get last day's rates
      const lastTimestamp = demurrageRates[demurrageRates.length - 1].timestamp;
      const oneDayMs = 24 * 60 * 60 * 1000;
      const lastDayRates = demurrageRates.filter(
        (r) => r.timestamp >= lastTimestamp - oneDayMs
      );

      if (lastDayRates.length > 0) {
        const lastDayValues = lastDayRates.map((r) => r.value);
        highestDemurrageLastDay = Math.max(...lastDayValues);
        lowestDemurrageLastDay = Math.min(...lastDayValues);
        firstDemurrageLastDay = lastDayRates[0].value;
      }
    }

    // Update the negotiation with calculated analytics
    await ctx.db.patch(args.negotiationId, {
      highestFreightRateIndication,
      lowestFreightRateIndication,
      firstFreightRateIndication,
      highestFreightRateLastDay,
      lowestFreightRateLastDay,
      firstFreightRateLastDay,
      highestDemurrageIndication,
      lowestDemurrageIndication,
      firstDemurrageIndication,
      highestDemurrageLastDay,
      lowestDemurrageLastDay,
      firstDemurrageLastDay,
      updatedAt: Date.now(),
    });

    // Update the fixture's lastUpdated timestamp and searchText via the order
    await updateFixtureLastUpdatedViaOrder(ctx, negotiation.orderId);
    await updateFixtureSearchTextViaOrder(ctx, negotiation.orderId);

    return {
      message: "Analytics calculated successfully",
      freightRatesFound: freightRates.length,
      demurrageRatesFound: demurrageRates.length,
    };
  },
});
