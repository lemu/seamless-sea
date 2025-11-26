import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

// Internal seed function that can be called from other mutations
export const seedVesselsInternal = async (ctx: MutationCtx) => {
  const systemUser = await ctx.db.query("users").first();
  if (!systemUser) {
    throw new Error("No users found. Please create a user first.");
  }

  const now = Date.now();

    // Vessels from Trade Desk (18 vessels)
    const tradeDeskVessels = [
      "Copper Spirit",
      "Front Sparta",
      "Maran Poseidon",
      "Cedar",
      "Olympic Glory",
      "Star Fighter",
      "Nord Nightingale",
      "New Breeze",
      "Blue Moon",
      "TI Unity",
      "Golden Empress",
      "Pacific Diamond",
      "Silver Hawk",
      "Seaways Maximus",
      "Orient Quest",
      "Neptune Voyager",
      "Eagle Spirit",
      "Ocean Legend",
    ];

    // Vessels from Fixtures (14 vessels)
    const fixturesVessels = [
      "Kosta",
      "TBN", // To Be Named
      "Gisgo",
      "Xin Yue Yang",
      "Ever Given",
      "MSC Gulsun",
      "OOCL Hong Kong",
      "CMA CGM Antoine De Saint Exupery",
      "Madrid Maersk",
      "Cosco Shipping Universe",
      "HMM Algeciras",
      "ONE Innovation",
      "MOL Triumph",
      "Evergreen Ever Ace",
    ];

    // Combine and deduplicate
    const allVessels = [...new Set([...tradeDeskVessels, ...fixturesVessels])];

    const createdVessels = [];

    for (const name of allVessels) {
      const vesselId = await ctx.db.insert("vessels", {
        name,
        isVerified: true,
        isActive: true,
        createdBy: systemUser._id,
        createdAt: now,
        updatedAt: now,
      });
      createdVessels.push({ name, id: vesselId });
    }

  return {
    success: true,
    message: `Successfully seeded ${createdVessels.length} vessels`,
    vessels: createdVessels,
  };
};

// Seed function to populate vessels from existing data
export const seedVessels = mutation({
  args: {},
  handler: seedVesselsInternal,
});

// Query all vessels
export const list = query({
  args: {},
  handler: async (ctx) => {
    const vessels = await ctx.db.query("vessels").collect();
    return vessels.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Query vessels by owner
export const listByOwner = query({
  args: { ownerId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vessels")
      .withIndex("by_owner", (q) => q.eq("currentOwnerId", args.ownerId))
      .collect();
  },
});

// Get vessel by ID
export const getById = query({
  args: { id: v.id("vessels") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get vessel by IMO number
export const getByImo = query({
  args: { imoNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vessels")
      .withIndex("by_imo", (q) => q.eq("imoNumber", args.imoNumber))
      .first();
  },
});

// Get vessel by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vessels")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
  },
});

// Create a new vessel
export const create = mutation({
  args: {
    name: v.string(),
    imoNumber: v.optional(v.string()),
    callsign: v.optional(v.string()),
    mmsi: v.optional(v.string()),
    dwt: v.optional(v.number()),
    grt: v.optional(v.number()),
    draft: v.optional(v.number()),
    loa: v.optional(v.number()),
    beam: v.optional(v.number()),
    maxHeight: v.optional(v.number()),
    flag: v.optional(v.string()),
    vesselClass: v.optional(v.string()),
    speedKnots: v.optional(v.number()),
    consumptionPerDay: v.optional(v.number()),
    builtDate: v.optional(v.string()),
    currentOwnerId: v.optional(v.id("companies")),
    isVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    const vesselId = await ctx.db.insert("vessels", {
      name: args.name,
      imoNumber: args.imoNumber,
      callsign: args.callsign,
      mmsi: args.mmsi,
      dwt: args.dwt,
      grt: args.grt,
      draft: args.draft,
      loa: args.loa,
      beam: args.beam,
      maxHeight: args.maxHeight,
      flag: args.flag,
      vesselClass: args.vesselClass,
      speedKnots: args.speedKnots,
      consumptionPerDay: args.consumptionPerDay,
      builtDate: args.builtDate,
      currentOwnerId: args.currentOwnerId,
      isVerified: args.isVerified || false,
      isActive: true,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return vesselId;
  },
});

// Update vessel
export const update = mutation({
  args: {
    id: v.id("vessels"),
    name: v.optional(v.string()),
    imoNumber: v.optional(v.string()),
    callsign: v.optional(v.string()),
    mmsi: v.optional(v.string()),
    dwt: v.optional(v.number()),
    grt: v.optional(v.number()),
    draft: v.optional(v.number()),
    loa: v.optional(v.number()),
    beam: v.optional(v.number()),
    maxHeight: v.optional(v.number()),
    flag: v.optional(v.string()),
    vesselClass: v.optional(v.string()),
    speedKnots: v.optional(v.number()),
    consumptionPerDay: v.optional(v.number()),
    builtDate: v.optional(v.string()),
    currentOwnerId: v.optional(v.id("companies")),
    isVerified: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});
