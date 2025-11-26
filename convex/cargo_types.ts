import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

// Internal seed function that can be called from other mutations
export const seedCargoTypesInternal = async (ctx: MutationCtx) => {
  const now = Date.now();

    const cargoTypesData = [
      { name: "Iron Ore", category: "iron-ore", unitType: "mt" },
      { name: "Crude Oil", category: "crude-oil", unitType: "mt" },
      { name: "Grain", category: "grain", unitType: "mt" },
      { name: "Coal", category: "coal", unitType: "mt" },
      { name: "LNG", category: "lng", unitType: "cbm" },
      { name: "Containers", category: "container", unitType: "teu" },
      { name: "Wheat", category: "grain", unitType: "mt" },
      { name: "Corn", category: "grain", unitType: "mt" },
      { name: "Soybeans", category: "grain", unitType: "mt" },
      { name: "Steel Products", category: "dry-bulk", unitType: "mt" },
      { name: "Fertilizers", category: "dry-bulk", unitType: "mt" },
      { name: "Petroleum Products", category: "crude-oil", unitType: "mt" },
    ] as const;

    const createdCargoTypes = [];

    for (const cargoType of cargoTypesData) {
      const cargoTypeId = await ctx.db.insert("cargo_types", {
        name: cargoType.name,
        category: cargoType.category,
        unitType: cargoType.unitType,
        isActive: true,
        createdAt: now,
      });
      createdCargoTypes.push({ name: cargoType.name, id: cargoTypeId });
    }

  return {
    success: true,
    message: `Successfully seeded ${createdCargoTypes.length} cargo types`,
    cargoTypes: createdCargoTypes,
  };
};

// Seed function to populate common cargo types
export const seedCargoTypes = mutation({
  args: {},
  handler: seedCargoTypesInternal,
});

// Query all cargo types
export const list = query({
  args: {},
  handler: async (ctx) => {
    const cargoTypes = await ctx.db.query("cargo_types").collect();
    return cargoTypes.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Query cargo types by category
export const listByCategory = query({
  args: {
    category: v.union(
      v.literal("crude-oil"),
      v.literal("dry-bulk"),
      v.literal("container"),
      v.literal("lng"),
      v.literal("grain"),
      v.literal("iron-ore"),
      v.literal("coal"),
      v.literal("other")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cargo_types")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// Get cargo type by ID
export const getById = query({
  args: { id: v.id("cargo_types") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get cargo type by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cargo_types")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
  },
});

// Create a new cargo type
export const create = mutation({
  args: {
    name: v.string(),
    category: v.union(
      v.literal("crude-oil"),
      v.literal("dry-bulk"),
      v.literal("container"),
      v.literal("lng"),
      v.literal("grain"),
      v.literal("iron-ore"),
      v.literal("coal"),
      v.literal("other")
    ),
    unitType: v.union(v.literal("mt"), v.literal("cbm"), v.literal("teu")),
  },
  handler: async (ctx, args) => {
    const cargoTypeId = await ctx.db.insert("cargo_types", {
      name: args.name,
      category: args.category,
      unitType: args.unitType,
      isActive: true,
      createdAt: Date.now(),
    });

    return cargoTypeId;
  },
});

// Update cargo type
export const update = mutation({
  args: {
    id: v.id("cargo_types"),
    name: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("crude-oil"),
        v.literal("dry-bulk"),
        v.literal("container"),
        v.literal("lng"),
        v.literal("grain"),
        v.literal("iron-ore"),
        v.literal("coal"),
        v.literal("other")
      )
    ),
    unitType: v.optional(
      v.union(v.literal("mt"), v.literal("cbm"), v.literal("teu"))
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});
