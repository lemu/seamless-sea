import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate recap number (RCP12345)
function generateRecapNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `RCP${randomNum}`;
}

// Create a new recap manager (wet market)
export const create = mutation({
  args: {
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

    const recapId = await ctx.db.insert("recap_managers", {
      recapNumber,
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
