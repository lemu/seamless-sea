import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

// Internal seed function that can be called from other mutations
export const seedPortsInternal = async (ctx: MutationCtx) => {
  const systemUser = await ctx.db.query("users").first();
  if (!systemUser) {
    throw new Error("No users found. Please create a user first.");
  }

  const now = Date.now();

  // Common ports from existing data
  const portsData = [
    { name: "Tubarao", unlocode: "BRTUB", country: "Brazil", countryCode: "BR", lat: -20.283333, lon: -40.283333 },
    { name: "Qingdao", unlocode: "CNTAO", country: "China", countryCode: "CN", lat: 36.066667, lon: 120.383333 },
    { name: "Tianjin", unlocode: "CNTXG", country: "China", countryCode: "CN", lat: 39.133333, lon: 117.2 },
    { name: "Rotterdam", unlocode: "NLRTM", country: "Netherlands", countryCode: "NL", lat: 51.916667, lon: 4.5 },
    { name: "Singapore", unlocode: "SGSIN", country: "Singapore", countryCode: "SG", lat: 1.283333, lon: 103.85 },
    { name: "Shanghai", unlocode: "CNSHA", country: "China", countryCode: "CN", lat: 31.233333, lon: 121.466667 },
    { name: "Houston", unlocode: "USHOU", country: "United States", countryCode: "US", lat: 29.760833, lon: -95.369444 },
    { name: "Antwerp", unlocode: "BEANR", country: "Belgium", countryCode: "BE", lat: 51.216667, lon: 4.416667 },
    { name: "Hamburg", unlocode: "DEHAM", country: "Germany", countryCode: "DE", lat: 53.55, lon: 10.0 },
    { name: "Los Angeles", unlocode: "USLAX", country: "United States", countryCode: "US", lat: 33.733333, lon: -118.266667 },
    { name: "Dubai", unlocode: "AEDXB", country: "United Arab Emirates", countryCode: "AE", lat: 25.266667, lon: 55.333333 },
    { name: "Hong Kong", unlocode: "HKHKG", country: "Hong Kong", countryCode: "HK", lat: 22.283333, lon: 114.15 },
    { name: "Busan", unlocode: "KRPUS", country: "South Korea", countryCode: "KR", lat: 35.1, lon: 129.033333 },
    { name: "Port Said", unlocode: "EGPSD", country: "Egypt", countryCode: "EG", lat: 31.266667, lon: 32.3 },
    { name: "Jebel Ali", unlocode: "AEJEA", country: "United Arab Emirates", countryCode: "AE", lat: 25.0, lon: 55.05 },
  ];

  const createdPorts = [];

  for (const port of portsData) {
    const portId = await ctx.db.insert("ports", {
      name: port.name,
      unlocode: port.unlocode,
      country: port.country,
      countryCode: port.countryCode,
      latitude: port.lat,
      longitude: port.lon,
      isVerified: true,
      isActive: true,
      createdBy: systemUser._id,
      createdAt: now,
    });
    createdPorts.push({ name: port.name, id: portId });
  }

  return {
    success: true,
    message: `Successfully seeded ${createdPorts.length} ports`,
    ports: createdPorts,
  };
};

// Seed function to populate common ports
export const seedPorts = mutation({
  args: {},
  handler: seedPortsInternal,
});

// Query all ports
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ports = await ctx.db.query("ports").collect();
    return ports.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Query ports by country
export const listByCountry = query({
  args: { countryCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ports")
      .withIndex("by_country", (q) => q.eq("country", args.countryCode))
      .collect();
  },
});

// Get port by ID
export const getById = query({
  args: { id: v.id("ports") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get port by UNLOCODE
export const getByUnlocode = query({
  args: { unlocode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ports")
      .withIndex("by_unlocode", (q) => q.eq("unlocode", args.unlocode))
      .first();
  },
});

// Create a new port
export const create = mutation({
  args: {
    name: v.string(),
    unlocode: v.optional(v.string()),
    country: v.string(),
    countryCode: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    timezone: v.optional(v.string()),
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

    const portId = await ctx.db.insert("ports", {
      name: args.name,
      unlocode: args.unlocode,
      country: args.country,
      countryCode: args.countryCode,
      latitude: args.latitude,
      longitude: args.longitude,
      timezone: args.timezone,
      isVerified: args.isVerified || false,
      isActive: true,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    return portId;
  },
});

// Update port
export const update = mutation({
  args: {
    id: v.id("ports"),
    name: v.optional(v.string()),
    unlocode: v.optional(v.string()),
    country: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    timezone: v.optional(v.string()),
    isVerified: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});
