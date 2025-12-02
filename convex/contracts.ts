import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate contract number (CP12345)
function generateContractNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `CP${randomNum}`;
}

// Create a new contract
export const create = mutation({
  args: {
    negotiationId: v.optional(v.id("negotiations")),
    orderId: v.optional(v.id("orders")),
    parentContractId: v.optional(v.id("contracts")),
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
    const contractNumber = generateContractNumber();

    // Validate: both orderId and negotiationId must be present, OR both must be empty
    if ((args.orderId && !args.negotiationId) || (!args.orderId && args.negotiationId)) {
      throw new Error("orderId and negotiationId must both be present or both be empty");
    }

    const contractId = await ctx.db.insert("contracts", {
      contractNumber,
      negotiationId: args.negotiationId,
      orderId: args.orderId,
      parentContractId: args.parentContractId,
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

    return contractId;
  },
});

// Update contract
export const update = mutation({
  args: {
    contractId: v.id("contracts"),
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
    const { contractId, ...updates } = args;

    const existing = await ctx.db.get(contractId);
    if (!existing) {
      throw new Error("Contract not found");
    }

    // TODO: Track field changes

    await ctx.db.patch(contractId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return contractId;
  },
});

// Update contract status
export const updateStatus = mutation({
  args: {
    contractId: v.id("contracts"),
    status: v.union(
      v.literal("draft"),
      v.literal("working-copy"),
      v.literal("final"),
      v.literal("rejected")
    ),
  },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract) {
      throw new Error("Contract not found");
    }

    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "final") {
      updates.signedAt = Date.now();
    }

    await ctx.db.patch(args.contractId, updates);

    // TODO: Log activity

    return args.contractId;
  },
});

// List all contracts
export const list = query({
  args: {},
  handler: async (ctx) => {
    const contracts = await ctx.db.query("contracts").collect();
    return contracts.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get contract by ID with full details
export const getById = query({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract) {
      return null;
    }

    // Get related entities
    const owner = await ctx.db.get(contract.ownerId);
    const charterer = await ctx.db.get(contract.chartererId);
    const broker = contract.brokerId
      ? await ctx.db.get(contract.brokerId)
      : null;
    const vessel = contract.vesselId
      ? await ctx.db.get(contract.vesselId)
      : null;
    const loadPort = contract.loadPortId
      ? await ctx.db.get(contract.loadPortId)
      : null;
    const dischargePort = contract.dischargePortId
      ? await ctx.db.get(contract.dischargePortId)
      : null;
    const cargoType = contract.cargoTypeId
      ? await ctx.db.get(contract.cargoTypeId)
      : null;
    const negotiation = contract.negotiationId
      ? await ctx.db.get(contract.negotiationId)
      : null;
    const order = contract.orderId ? await ctx.db.get(contract.orderId) : null;

    // Get addenda
    const addenda = await ctx.db
      .query("contract_addenda")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .collect();

    // Get voyages if COA
    const voyages =
      contract.contractType === "coa"
        ? await ctx.db
            .query("voyages")
            .withIndex("by_contract", (q) =>
              q.eq("parentContractId", args.contractId)
            )
            .collect()
        : [];

    return {
      ...contract,
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

// List contracts by status
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("draft"),
      v.literal("working-copy"),
      v.literal("final"),
      v.literal("rejected")
    ),
  },
  handler: async (ctx, args) => {
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();

    return contracts.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// List contracts by negotiation
export const listByNegotiation = query({
  args: { negotiationId: v.id("negotiations") },
  handler: async (ctx, args) => {
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_negotiation", (q) =>
        q.eq("negotiationId", args.negotiationId)
      )
      .collect();

    return contracts.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// List contracts by order
export const listByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    return contracts.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// List all contracts with enriched data
export const listEnriched = query({
  args: {},
  handler: async (ctx) => {
    const contracts = await ctx.db.query("contracts").collect();

    const enrichedContracts = await Promise.all(
      contracts.map(async (contract) => {
        // Get related entities
        const owner = contract.ownerId
          ? await ctx.db.get(contract.ownerId)
          : null;
        const charterer = contract.chartererId
          ? await ctx.db.get(contract.chartererId)
          : null;
        const broker = contract.brokerId
          ? await ctx.db.get(contract.brokerId)
          : null;
        const vessel = contract.vesselId
          ? await ctx.db.get(contract.vesselId)
          : null;
        const cargoType = contract.cargoTypeId
          ? await ctx.db.get(contract.cargoTypeId)
          : null;
        const loadPort = contract.loadPortId
          ? await ctx.db.get(contract.loadPortId)
          : null;
        const dischargePort = contract.dischargePortId
          ? await ctx.db.get(contract.dischargePortId)
          : null;

        // Get avatar URLs for companies
        const ownerWithAvatar = owner && {
          ...owner,
          avatarUrl: owner.avatar ? await ctx.storage.getUrl(owner.avatar) : null,
        };
        const chartererWithAvatar = charterer && {
          ...charterer,
          avatarUrl: charterer.avatar ? await ctx.storage.getUrl(charterer.avatar) : null,
        };
        const brokerWithAvatar = broker && {
          ...broker,
          avatarUrl: broker.avatar ? await ctx.storage.getUrl(broker.avatar) : null,
        };

        return {
          ...contract,
          owner: ownerWithAvatar,
          charterer: chartererWithAvatar,
          broker: brokerWithAvatar,
          vessel,
          cargoType,
          loadPort,
          dischargePort,
        };
      })
    );

    return enrichedContracts.sort((a, b) => b._creationTime - a._creationTime);
  },
});
