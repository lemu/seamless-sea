import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Generate order number (ORD12345)
function generateOrderNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `ORD${randomNum}`;
}

// Create a new order
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.union(v.literal("buy"), v.literal("sell"), v.literal("charter")),
    stage: v.optional(
      v.union(
        v.literal("offer"),
        v.literal("active"),
        v.literal("negotiating"),
        v.literal("pending")
      )
    ),
    cargoTypeId: v.optional(v.id("cargo_types")),
    quantity: v.optional(v.number()),
    quantityUnit: v.optional(v.string()),
    laycanStart: v.optional(v.number()),
    laycanEnd: v.optional(v.number()),
    loadPortId: v.optional(v.id("ports")),
    dischargePortId: v.optional(v.id("ports")),
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
    tce: v.optional(v.string()),
    validityHours: v.optional(v.number()),
    chartererId: v.optional(v.id("companies")),
    ownerId: v.optional(v.id("companies")),
    brokerId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const orderNumber = generateOrderNumber();

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      title: args.title,
      description: args.description,
      type: args.type,
      stage: args.stage || "offer",
      cargoTypeId: args.cargoTypeId,
      quantity: args.quantity,
      quantityUnit: args.quantityUnit,
      laycanStart: args.laycanStart,
      laycanEnd: args.laycanEnd,
      loadPortId: args.loadPortId,
      dischargePortId: args.dischargePortId,
      freightRate: args.freightRate,
      freightRateType: args.freightRateType,
      demurrageRate: args.demurrageRate,
      despatchRate: args.despatchRate,
      tce: args.tce,
      validityHours: args.validityHours,
      organizationId: args.organizationId,
      chartererId: args.chartererId,
      ownerId: args.ownerId,
      brokerId: args.brokerId,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    // TODO: Log activity
    // await logActivity(ctx, "order", orderId, "created", ...);

    return orderId;
  },
});

// Update an existing order
export const update = mutation({
  args: {
    orderId: v.id("orders"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    stage: v.optional(
      v.union(
        v.literal("offer"),
        v.literal("active"),
        v.literal("negotiating"),
        v.literal("pending")
      )
    ),
    cargoTypeId: v.optional(v.id("cargo_types")),
    quantity: v.optional(v.number()),
    quantityUnit: v.optional(v.string()),
    laycanStart: v.optional(v.number()),
    laycanEnd: v.optional(v.number()),
    loadPortId: v.optional(v.id("ports")),
    dischargePortId: v.optional(v.id("ports")),
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
    tce: v.optional(v.string()),
    validityHours: v.optional(v.number()),
    chartererId: v.optional(v.id("companies")),
    ownerId: v.optional(v.id("companies")),
    brokerId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    const { orderId, ...updates } = args;

    // Get existing order for field change tracking
    const existingOrder = await ctx.db.get(orderId);
    if (!existingOrder) {
      throw new Error("Order not found");
    }

    // TODO: Track field changes
    // for (const [key, newValue] of Object.entries(updates)) {
    //   if (newValue !== undefined && existingOrder[key] !== newValue) {
    //     await trackFieldChange(ctx, "order", orderId, key, existingOrder[key], newValue);
    //   }
    // }

    await ctx.db.patch(orderId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return orderId;
  },
});

// Distribute an order (change status to distributed)
export const distribute = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      status: "distributed",
      distributedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // TODO: Log activity
    // await logActivity(ctx, "order", args.orderId, "distributed", ...);

    return args.orderId;
  },
});

// Withdraw an order (change status to withdrawn)
export const withdraw = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      status: "withdrawn",
      withdrawnAt: Date.now(),
      updatedAt: Date.now(),
    });

    // TODO: Log activity
    // await logActivity(ctx, "order", args.orderId, "withdrawn", ...);

    return args.orderId;
  },
});

// List all orders for an organization
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return orders.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get order by ID with full details
export const getById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }

    // Get related negotiations
    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Get related entities (cargo, ports, companies)
    let cargoType = null;
    if (order.cargoTypeId) {
      cargoType = await ctx.db.get(order.cargoTypeId);
    }

    let loadPort = null;
    if (order.loadPortId) {
      loadPort = await ctx.db.get(order.loadPortId);
    }

    let dischargePort = null;
    if (order.dischargePortId) {
      dischargePort = await ctx.db.get(order.dischargePortId);
    }

    let charterer = null;
    if (order.chartererId) {
      charterer = await ctx.db.get(order.chartererId);
    }

    let owner = null;
    if (order.ownerId) {
      owner = await ctx.db.get(order.ownerId);
    }

    let broker = null;
    if (order.brokerId) {
      broker = await ctx.db.get(order.brokerId);
    }

    return {
      ...order,
      negotiations,
      cargoType,
      loadPort,
      dischargePort,
      charterer,
      owner,
      broker,
    };
  },
});

// List orders by status
export const listByStatus = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("draft"),
      v.literal("distributed"),
      v.literal("withdrawn")
    ),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), args.status))
      .collect();

    return orders.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// List orders by stage
export const listByStage = query({
  args: {
    organizationId: v.id("organizations"),
    stage: v.union(
      v.literal("offer"),
      v.literal("active"),
      v.literal("negotiating"),
      v.literal("pending")
    ),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("stage"), args.stage))
      .collect();

    return orders.sort((a, b) => b._creationTime - a._creationTime);
  },
});
