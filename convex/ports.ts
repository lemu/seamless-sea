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

  const portsData = [
    {
      name: "Singapore", unlocode: "SGSIN", country: "Singapore", countryCode: "SG",
      lat: 1.283333, lon: 103.85, zone: "SE Asia", maxDraft: 20.5, maxDWT: 400000,
      berths: 62, terminalOperator: "PSA", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Rotterdam", unlocode: "NLRTM", country: "Netherlands", countryCode: "NL",
      lat: 51.916667, lon: 4.5, zone: "NW Europe", maxDraft: 23.0, maxDWT: 550000,
      berths: 95, terminalOperator: "Port of Rotterdam", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Shanghai", unlocode: "CNSHA", country: "China", countryCode: "CN",
      lat: 31.233333, lon: 121.466667, zone: "E Asia", maxDraft: 21.5, maxDWT: 500000,
      berths: 118, terminalOperator: "SIPG", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Qingdao", unlocode: "CNTAO", country: "China", countryCode: "CN",
      lat: 36.066667, lon: 120.383333, zone: "E Asia", maxDraft: 20.0, maxDWT: 400000,
      berths: 74, terminalOperator: "QPA", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Tianjin", unlocode: "CNTXG", country: "China", countryCode: "CN",
      lat: 39.133333, lon: 117.2, zone: "E Asia", maxDraft: 18.5, maxDWT: 300000,
      berths: 88, terminalOperator: "TPA", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Ningbo-Zhoushan", unlocode: "CNNGB", country: "China", countryCode: "CN",
      lat: 29.866667, lon: 122.1, zone: "E Asia", maxDraft: 21.0, maxDWT: 450000,
      berths: 105, terminalOperator: "NBPA", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Guangzhou", unlocode: "CNGZH", country: "China", countryCode: "CN",
      lat: 22.9, lon: 113.316667, zone: "E Asia", maxDraft: 16.5, maxDWT: 250000,
      berths: 82, terminalOperator: "GPA", operationalStatus: "Open", restrictions: "Draft limit 16.5 m",
    },
    {
      name: "Hong Kong", unlocode: "HKHKG", country: "Hong Kong", countryCode: "HK",
      lat: 22.283333, lon: 114.15, zone: "E Asia", maxDraft: 15.5, maxDWT: 200000,
      berths: 52, terminalOperator: "Hutchison Ports", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Busan", unlocode: "KRPUS", country: "South Korea", countryCode: "KR",
      lat: 35.1, lon: 129.033333, zone: "E Asia", maxDraft: 18.0, maxDWT: 300000,
      berths: 78, terminalOperator: "BPA", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Dubai (Jebel Ali)", unlocode: "AEJEA", country: "United Arab Emirates", countryCode: "AE",
      lat: 25.0, lon: 55.05, zone: "Middle East", maxDraft: 19.0, maxDWT: 350000,
      berths: 67, terminalOperator: "DP World", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Port Said", unlocode: "EGPSD", country: "Egypt", countryCode: "EG",
      lat: 31.266667, lon: 32.3, zone: "Mediterranean", maxDraft: 16.5, maxDWT: 200000,
      berths: 44, terminalOperator: "SCCT", operationalStatus: "Open", restrictions: "Suez Canal transit window",
    },
    {
      name: "Antwerp", unlocode: "BEANR", country: "Belgium", countryCode: "BE",
      lat: 51.216667, lon: 4.416667, zone: "NW Europe", maxDraft: 17.0, maxDWT: 280000,
      berths: 68, terminalOperator: "Antwerp Bruges", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Hamburg", unlocode: "DEHAM", country: "Germany", countryCode: "DE",
      lat: 53.55, lon: 10.0, zone: "NW Europe", maxDraft: 15.5, maxDWT: 240000,
      berths: 58, terminalOperator: "HPA", operationalStatus: "Open", restrictions: "Tidal draft restriction 15.5 m",
    },
    {
      name: "Los Angeles", unlocode: "USLAX", country: "United States", countryCode: "US",
      lat: 33.733333, lon: -118.266667, zone: "W Coast NA", maxDraft: 15.5, maxDWT: 175000,
      berths: 35, terminalOperator: "POLA", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Houston", unlocode: "USHOU", country: "United States", countryCode: "US",
      lat: 29.760833, lon: -95.369444, zone: "Gulf of Mexico", maxDraft: 14.0, maxDWT: 300000,
      berths: 50, terminalOperator: "Port Houston", operationalStatus: "Open", restrictions: "Channel depth 14 m",
    },
    {
      name: "Tubarao", unlocode: "BRTUB", country: "Brazil", countryCode: "BR",
      lat: -20.283333, lon: -40.283333, zone: "South America", maxDraft: 21.5, maxDWT: 400000,
      berths: 8, terminalOperator: "Vale", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Port Hedland", unlocode: "AUPHE", country: "Australia", countryCode: "AU",
      lat: -20.316667, lon: 118.566667, zone: "SW Pacific", maxDraft: 20.0, maxDWT: 550000,
      berths: 12, terminalOperator: "PHPA", operationalStatus: "Open", restrictions: "Tidal window required",
    },
    {
      name: "Dampier", unlocode: "AUDPM", country: "Australia", countryCode: "AU",
      lat: -20.65, lon: 116.716667, zone: "SW Pacific", maxDraft: 18.5, maxDWT: 450000,
      berths: 10, terminalOperator: "RTIO", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Richards Bay", unlocode: "ZARCB", country: "South Africa", countryCode: "ZA",
      lat: -28.8, lon: 32.083333, zone: "S Africa", maxDraft: 17.5, maxDWT: 230000,
      berths: 14, terminalOperator: "RBCT", operationalStatus: "Open", restrictions: "None",
    },
    {
      name: "Paradip", unlocode: "INPBD", country: "India", countryCode: "IN",
      lat: 20.316667, lon: 86.666667, zone: "Indian Sub.", maxDraft: 14.5, maxDWT: 200000,
      berths: 18, terminalOperator: "PPT", operationalStatus: "Open", restrictions: "Seasonal swell restrictions",
    },
  ];

  const createdPorts = [];

  for (const port of portsData) {
    const existingPort = await ctx.db
      .query("ports")
      .filter((q) => q.eq(q.field("unlocode"), port.unlocode))
      .first();

    if (existingPort) {
      // Update with new fields if missing
      if (existingPort.zone == null) {
        await ctx.db.patch(existingPort._id, {
          zone: port.zone,
          maxDraft: port.maxDraft,
          maxDWT: port.maxDWT,
          berths: port.berths,
          terminalOperator: port.terminalOperator,
          operationalStatus: port.operationalStatus,
          restrictions: port.restrictions,
        });
      }
      console.log(`✓ Port already exists: ${port.name} (${existingPort._id})`);
      createdPorts.push({ name: port.name, id: existingPort._id });
      continue;
    }

    const portId = await ctx.db.insert("ports", {
      name: port.name,
      unlocode: port.unlocode,
      country: port.country,
      countryCode: port.countryCode,
      latitude: port.lat,
      longitude: port.lon,
      zone: port.zone,
      maxDraft: port.maxDraft,
      maxDWT: port.maxDWT,
      berths: port.berths,
      terminalOperator: port.terminalOperator,
      operationalStatus: port.operationalStatus,
      restrictions: port.restrictions,
      isVerified: true,
      isActive: true,
      createdBy: systemUser._id,
      createdAt: now,
    });
    console.log(`+ Created port: ${port.name} (${portId})`);
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

// Canonical 20 UNLOCODEs — any port not in this list is stale and should be removed
const CANONICAL_UNLOCODES = new Set([
  "SGSIN", "NLRTM", "CNSHA", "CNTAO", "CNTXG", "CNNGB", "CNGZH",
  "HKHKG", "KRPUS", "AEJEA", "EGPSD", "BEANR", "DEHAM",
  "USLAX", "USHOU", "BRTUB", "AUPHE", "AUDPM", "ZARCB", "INPBD",
]);

export const cleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const allPorts = await ctx.db.query("ports").collect();
    let deleted = 0;

    // Step 1: delete non-canonical ports
    for (const port of allPorts) {
      if (!port.unlocode || !CANONICAL_UNLOCODES.has(port.unlocode)) {
        const sample = await ctx.db
          .query("port_sample_data")
          .withIndex("by_port", (q) => q.eq("portId", port._id))
          .first();
        if (sample) await ctx.db.delete(sample._id);
        await ctx.db.delete(port._id);
        console.log(`- Deleted non-canonical port: ${port.name} (${port.unlocode ?? "no LOCODE"})`);
        deleted++;
      }
    }

    // Step 2: deduplicate — for each UNLOCODE keep the record with the most fields (has `zone`)
    const canonicalPorts = await ctx.db.query("ports").collect();
    const byUnlocode = new Map<string, typeof canonicalPorts>();
    for (const port of canonicalPorts) {
      if (!port.unlocode) continue;
      const group = byUnlocode.get(port.unlocode) ?? [];
      group.push(port);
      byUnlocode.set(port.unlocode, group);
    }

    for (const [unlocode, group] of byUnlocode) {
      if (group.length <= 1) continue;
      // Keep the one with `zone` defined (the full record); delete the rest
      const keep = group.find((p) => p.zone != null) ?? group[0];
      for (const port of group) {
        if (port._id === keep._id) continue;
        const sample = await ctx.db
          .query("port_sample_data")
          .withIndex("by_port", (q) => q.eq("portId", port._id))
          .first();
        if (sample) await ctx.db.delete(sample._id);
        await ctx.db.delete(port._id);
        console.log(`- Deleted duplicate port: ${port.name} (${unlocode})`);
        deleted++;
      }
    }

    const remaining = (await ctx.db.query("ports").collect()).length;
    return { deleted, remaining };
  },
});
