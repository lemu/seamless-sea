import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate negotiation number (NEG12345)
function generateNegotiationNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `NEG${randomNum}`;
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
