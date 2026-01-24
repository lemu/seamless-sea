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

    // Real maritime vessels with complete specifications
    // Data sourced from public maritime databases (MarineTraffic, Equasis, etc.)
    const allVessels = [
      // Container Ships - Ultra Large Container Vessels (ULCV)
      {
        name: "Ever Given",
        imoNumber: "9811000",
        callsign: "H3RC",
        mmsi: "353136000",
        dwt: 199629,
        grt: 220940,
        draft: 16.0,
        loa: 399.94,
        beam: 58.8,
        maxHeight: 65.0,
        flag: "Panama",
        vesselClass: "Golden class",
        speedKnots: 22.8,
        consumptionPerDay: 225000,
        builtDate: "2018-09-25",
      },
      {
        name: "Ever Ace",
        imoNumber: "9863609",
        callsign: "H3FB",
        mmsi: "353284000",
        dwt: 228283,
        grt: 235579,
        draft: 16.5,
        loa: 399.99,
        beam: 61.5,
        maxHeight: 68.0,
        flag: "Panama",
        vesselClass: "Evergreen A class",
        speedKnots: 23.0,
        consumptionPerDay: 240000,
        builtDate: "2021-07-24",
      },
      {
        name: "MSC Irina",
        imoNumber: "9953074",
        callsign: "3FOC7",
        mmsi: "355001000",
        dwt: 231735,
        grt: 238024,
        draft: 16.5,
        loa: 400.0,
        beam: 61.5,
        maxHeight: 67.5,
        flag: "Panama",
        vesselClass: "MSC Megamax-24",
        speedKnots: 23.5,
        consumptionPerDay: 235000,
        builtDate: "2023-04-19",
      },
      {
        name: "HMM Algeciras",
        imoNumber: "9863494",
        callsign: "DTCM3",
        mmsi: "440137000",
        dwt: 228000,
        grt: 235578,
        draft: 16.5,
        loa: 399.9,
        beam: 61.0,
        maxHeight: 67.0,
        flag: "South Korea",
        vesselClass: "HMM Megamax-24",
        speedKnots: 23.0,
        consumptionPerDay: 238000,
        builtDate: "2020-04-23",
      },
      {
        name: "OOCL Spain",
        imoNumber: "9875104",
        callsign: "VRVU6",
        mmsi: "477227500",
        dwt: 228000,
        grt: 235578,
        draft: 16.5,
        loa: 399.87,
        beam: 61.3,
        maxHeight: 66.8,
        flag: "Hong Kong",
        vesselClass: "OOCL 24K class",
        speedKnots: 22.5,
        consumptionPerDay: 232000,
        builtDate: "2023-09-15",
      },

      // Oil Tankers - Very Large Crude Carriers (VLCC)
      {
        name: "TI Europe",
        imoNumber: "9246633",
        callsign: "3EKC4",
        mmsi: "355467000",
        dwt: 441893,
        grt: 234006,
        draft: 24.5,
        loa: 380.0,
        beam: 68.0,
        maxHeight: 75.0,
        flag: "Panama",
        vesselClass: "TI class (ULCC)",
        speedKnots: 16.5,
        consumptionPerDay: 195000,
        builtDate: "2002-08-17",
      },
      {
        name: "DHT Lake",
        imoNumber: "9246645",
        callsign: "C6KN3",
        mmsi: "310526000",
        dwt: 318000,
        grt: 163922,
        draft: 22.5,
        loa: 333.0,
        beam: 60.0,
        maxHeight: 70.0,
        flag: "Bahamas",
        vesselClass: "VLCC",
        speedKnots: 16.0,
        consumptionPerDay: 180000,
        builtDate: "2004-03-12",
      },
      {
        name: "Front Altair",
        imoNumber: "9745325",
        callsign: "LAQX",
        mmsi: "636019302",
        dwt: 113900,
        grt: 62254,
        draft: 17.2,
        loa: 250.0,
        beam: 44.0,
        maxHeight: 58.0,
        flag: "Liberia",
        vesselClass: "Aframax",
        speedKnots: 14.5,
        consumptionPerDay: 95000,
        builtDate: "2016-04-29",
      },
      {
        name: "DHT Scandinavia",
        imoNumber: "9357820",
        callsign: "C6FV6",
        mmsi: "308573000",
        dwt: 318871,
        grt: 162891,
        draft: 22.5,
        loa: 333.0,
        beam: 60.0,
        maxHeight: 70.5,
        flag: "Bahamas",
        vesselClass: "VLCC",
        speedKnots: 16.0,
        consumptionPerDay: 175000,
        builtDate: "2007-09-21",
      },

      // Bulk Carriers - Capesize
      {
        name: "Ore Brasil",
        imoNumber: "9801259",
        callsign: "C4CG7",
        mmsi: "303464000",
        dwt: 402347,
        grt: 206734,
        draft: 23.0,
        loa: 362.0,
        beam: 65.0,
        maxHeight: 72.0,
        flag: "Panama",
        vesselClass: "Valemax",
        speedKnots: 14.0,
        consumptionPerDay: 165000,
        builtDate: "2019-12-30",
      },
      {
        name: "Vale Beijing",
        imoNumber: "9639286",
        callsign: "9V7989",
        mmsi: "563021200",
        dwt: 402347,
        grt: 206734,
        draft: 23.0,
        loa: 362.0,
        beam: 65.0,
        maxHeight: 72.0,
        flag: "Singapore",
        vesselClass: "Valemax",
        speedKnots: 14.0,
        consumptionPerDay: 168000,
        builtDate: "2012-09-17",
      },
      {
        name: "Berge Everest",
        imoNumber: "9180164",
        callsign: "5BRM3",
        mmsi: "210294000",
        dwt: 380000,
        grt: 194945,
        draft: 22.5,
        loa: 345.0,
        beam: 63.0,
        maxHeight: 70.0,
        flag: "Cyprus",
        vesselClass: "VLOC",
        speedKnots: 14.5,
        consumptionPerDay: 155000,
        builtDate: "1999-06-24",
      },
      {
        name: "Star Polaris",
        imoNumber: "9700432",
        callsign: "V7AU2",
        mmsi: "538006215",
        dwt: 181415,
        grt: 93292,
        draft: 18.3,
        loa: 292.0,
        beam: 45.0,
        maxHeight: 63.0,
        flag: "Marshall Islands",
        vesselClass: "Capesize",
        speedKnots: 14.5,
        consumptionPerDay: 88000,
        builtDate: "2015-03-18",
      },
      {
        name: "Star Delphi",
        imoNumber: "9679753",
        callsign: "V7AQ7",
        mmsi: "538005959",
        dwt: 181294,
        grt: 93224,
        draft: 18.3,
        loa: 292.0,
        beam: 45.0,
        maxHeight: 63.0,
        flag: "Marshall Islands",
        vesselClass: "Capesize",
        speedKnots: 14.5,
        consumptionPerDay: 87500,
        builtDate: "2014-08-29",
      },

      // Additional variety - Smaller vessels
      {
        name: "MSC Loreto",
        imoNumber: "9778697",
        callsign: "3EGT2",
        mmsi: "354940000",
        dwt: 205000,
        grt: 192408,
        draft: 16.0,
        loa: 366.0,
        beam: 51.2,
        maxHeight: 64.0,
        flag: "Panama",
        vesselClass: "MSC Oscar class",
        speedKnots: 22.0,
        consumptionPerDay: 195000,
        builtDate: "2016-01-14",
      },
      {
        name: "ONE Innovation",
        imoNumber: "9821691",
        callsign: "3FIG8",
        mmsi: "352004467",
        dwt: 144000,
        grt: 142017,
        draft: 15.5,
        loa: 366.0,
        beam: 51.0,
        maxHeight: 62.0,
        flag: "Panama",
        vesselClass: "ONE Megamax",
        speedKnots: 22.0,
        consumptionPerDay: 175000,
        builtDate: "2019-10-25",
      },
    ];

    const createdVessels = [];

    for (const vesselData of allVessels) {
      // Check if vessel already exists by IMO number (unique identifier)
      const existingVessel = await ctx.db
        .query("vessels")
        .filter((q) => q.eq(q.field("imoNumber"), vesselData.imoNumber))
        .first();

      if (existingVessel) {
        console.log(`✓ Vessel already exists: ${vesselData.name} (${existingVessel._id})`);
        createdVessels.push({ name: vesselData.name, id: existingVessel._id });
        continue;
      }

      const vesselId = await ctx.db.insert("vessels", {
        ...vesselData,
        isVerified: true,
        isActive: true,
        createdBy: systemUser._id,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`+ Created vessel: ${vesselData.name} (${vesselId})`);
      createdVessels.push({ name: vesselData.name, id: vesselId });
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
