import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

// Internal seed function that can be called from other mutations
export const seedRoutesInternal = async (ctx: MutationCtx) => {
  const now = Date.now();

    // Get ports by name to create routes
    const tubarao = await ctx.db
      .query("ports")
      .filter((q) => q.eq(q.field("name"), "Tubarao"))
      .first();
    const qingdao = await ctx.db
      .query("ports")
      .filter((q) => q.eq(q.field("name"), "Qingdao"))
      .first();
    const tianjin = await ctx.db
      .query("ports")
      .filter((q) => q.eq(q.field("name"), "Tianjin"))
      .first();
    const rotterdam = await ctx.db
      .query("ports")
      .filter((q) => q.eq(q.field("name"), "Rotterdam"))
      .first();
    const singapore = await ctx.db
      .query("ports")
      .filter((q) => q.eq(q.field("name"), "Singapore"))
      .first();
    const houston = await ctx.db
      .query("ports")
      .filter((q) => q.eq(q.field("name"), "Houston"))
      .first();

    if (!tubarao || !qingdao || !tianjin || !rotterdam || !singapore || !houston) {
      throw new Error("Required ports not found. Please seed ports first.");
    }

    // Common trading routes with approximate distances
    const routesData = [
      {
        name: "Tubarao to Qingdao",
        loadPortId: tubarao._id,
        dischargePortId: qingdao._id,
        averageDistanceNm: 11500,
        averageDurationDays: 28,
      },
      {
        name: "Tubarao to Tianjin",
        loadPortId: tubarao._id,
        dischargePortId: tianjin._id,
        averageDistanceNm: 11700,
        averageDurationDays: 29,
      },
      {
        name: "Houston to Rotterdam",
        loadPortId: houston._id,
        dischargePortId: rotterdam._id,
        averageDistanceNm: 4800,
        averageDurationDays: 12,
      },
      {
        name: "Singapore to Rotterdam",
        loadPortId: singapore._id,
        dischargePortId: rotterdam._id,
        averageDistanceNm: 8400,
        averageDurationDays: 21,
      },
      {
        name: "Qingdao to Rotterdam",
        loadPortId: qingdao._id,
        dischargePortId: rotterdam._id,
        averageDistanceNm: 10800,
        averageDurationDays: 27,
      },
    ];

    const createdRoutes = [];

    for (const route of routesData) {
      // Check if route already exists by loadPortId + dischargePortId combination
      const existingRoute = await ctx.db
        .query("routes")
        .filter((q) =>
          q.and(
            q.eq(q.field("loadPortId"), route.loadPortId),
            q.eq(q.field("dischargePortId"), route.dischargePortId)
          )
        )
        .first();

      if (existingRoute) {
        console.log(`✓ Route already exists: ${route.name} (${existingRoute._id})`);
        createdRoutes.push({ name: route.name, id: existingRoute._id });
        continue;
      }

      const routeId = await ctx.db.insert("routes", {
        name: route.name,
        loadPortId: route.loadPortId,
        dischargePortId: route.dischargePortId,
        averageDistanceNm: route.averageDistanceNm,
        averageDurationDays: route.averageDurationDays,
        isActive: true,
        createdAt: now,
      });
      console.log(`+ Created route: ${route.name} (${routeId})`);
      createdRoutes.push({ name: route.name, id: routeId });
    }

  return {
    success: true,
    message: `Successfully seeded ${createdRoutes.length} routes`,
    routes: createdRoutes,
  };
};

// Seed function to populate common routes
export const seedRoutes = mutation({
  args: {},
  handler: seedRoutesInternal,
});

// Query all routes
export const list = query({
  args: {},
  handler: async (ctx) => {
    const routes = await ctx.db.query("routes").collect();
    return routes.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Query routes by load port
export const listByLoadPort = query({
  args: { loadPortId: v.id("ports") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("routes")
      .withIndex("by_load_port", (q) => q.eq("loadPortId", args.loadPortId))
      .collect();
  },
});

// Query routes by discharge port
export const listByDischargePort = query({
  args: { dischargePortId: v.id("ports") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("routes")
      .withIndex("by_discharge_port", (q) => q.eq("dischargePortId", args.dischargePortId))
      .collect();
  },
});

// Get route by ID
export const getById = query({
  args: { id: v.id("routes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new route
export const create = mutation({
  args: {
    name: v.string(),
    loadPortId: v.id("ports"),
    dischargePortId: v.id("ports"),
    averageDistanceNm: v.optional(v.number()),
    averageDurationDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const routeId = await ctx.db.insert("routes", {
      name: args.name,
      loadPortId: args.loadPortId,
      dischargePortId: args.dischargePortId,
      averageDistanceNm: args.averageDistanceNm,
      averageDurationDays: args.averageDurationDays,
      isActive: true,
      createdAt: Date.now(),
    });

    return routeId;
  },
});

// Update route
export const update = mutation({
  args: {
    id: v.id("routes"),
    name: v.optional(v.string()),
    averageDistanceNm: v.optional(v.number()),
    averageDurationDays: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});
