import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Helper to get random item from array
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper to generate laycan dates (start and end timestamps)
function generateLaycan(): { start: number; end: number } {
  const now = Date.now();
  const daysAhead = Math.floor(Math.random() * 90) + 30; // 30-120 days ahead
  const startDate = now + daysAhead * 24 * 60 * 60 * 1000;
  const duration = Math.floor(Math.random() * 5) + 3; // 3-7 days duration
  const endDate = startDate + duration * 24 * 60 * 60 * 1000;

  return { start: startDate, end: endDate };
}

// Migrate sample Trade Desk data
async function migrateTradeDeskData(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  // Get reference data
  const companies = await ctx.db.query("companies").collect();
  const charterers = companies.filter((c) => c.roles.includes("charterer"));
  const owners = companies.filter((c) => c.roles.includes("owner"));
  const brokers = companies.filter((c) => c.roles.includes("broker"));
  const vessels = await ctx.db.query("vessels").collect();
  const ports = await ctx.db.query("ports").collect();
  const cargoTypes = await ctx.db.query("cargo_types").collect();

  if (charterers.length === 0 || vessels.length === 0 || ports.length === 0) {
    throw new Error("Reference data not seeded. Please run seed functions first.");
  }

  const orders = [];
  const negotiations = [];

  // Create 15 sample orders with negotiations
  for (let i = 0; i < 15; i++) {
    const laycan = generateLaycan();
    const loadPort = randomItem(ports);
    const dischargePort = randomItem(ports.filter((p) => p._id !== loadPort._id));
    const cargoType = randomItem(cargoTypes);
    const type = randomItem(["buy", "sell", "charter"] as const);
    const stage = randomItem(["offer", "active", "negotiating", "pending"] as const);
    const status = randomItem(["draft", "distributed"] as const);

    // Generate order number
    const orderNumber = `ORD${10000 + i}`;

    // Create order
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      title: `${cargoType.name} ${loadPort.name} to ${dischargePort.name}`,
      type,
      stage,
      cargoTypeId: cargoType._id,
      quantity: Math.floor(Math.random() * 100000) + 50000,
      quantityUnit: cargoType.unitType,
      laycanStart: laycan.start,
      laycanEnd: laycan.end,
      loadPortId: loadPort._id,
      dischargePortId: dischargePort._id,
      freightRate: `WS ${Math.floor(Math.random() * 50) + 70}-${Math.floor(Math.random() * 50) + 90}`,
      freightRateType: "worldscale",
      demurrageRate: `$${Math.floor(Math.random() * 50000) + 40000}/day`,
      tce: `$${Math.floor(Math.random() * 100000) + 100000}`,
      validityHours: randomItem([24, 48, 72]),
      organizationId,
      chartererId: randomItem(charterers)._id,
      ownerId: randomItem(owners)._id,
      brokerId: randomItem(brokers)._id,
      status,
      createdAt: Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });

    orders.push(orderId);

    // Create 2-4 negotiations per order
    const numNegotiations = Math.floor(Math.random() * 3) + 2;
    for (let j = 0; j < numNegotiations; j++) {
      const counterparty = randomItem(charterers);
      const broker = randomItem(brokers);
      const vessel = randomItem(vessels);
      const statuses: Array<"indicative-offer" | "firm-offer" | "firm-bid" | "firm" | "on-subs"> = [
        "indicative-offer",
        "firm-offer",
        "firm-bid",
        "firm",
        "on-subs",
      ];

      const negotiationId = await ctx.db.insert("negotiations", {
        orderId,
        counterpartyId: counterparty._id,
        brokerId: broker._id,
        bidPrice: `WS ${Math.floor(Math.random() * 10) + 80}`,
        offerPrice: `WS ${Math.floor(Math.random() * 10) + 85}`,
        freightRate: `WS ${Math.floor(Math.random() * 10) + 82}`,
        demurrageRate: `$${Math.floor(Math.random() * 30000) + 50000}/day`,
        tce: `$${Math.floor(Math.random() * 50000) + 120000}`,
        validity: randomItem(["24h", "48h", "72h"]),
        vesselId: vessel._id,
        status: randomItem(statuses),
        personInChargeId: userId,
        createdAt: Date.now() - Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000,
        updatedAt: Date.now(),
      });

      negotiations.push(negotiationId);
    }
  }

  return {
    ordersCreated: orders.length,
    negotiationsCreated: negotiations.length,
  };
}

// Migrate sample Fixtures data
async function migrateFixturesData(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  // Get reference data
  const companies = await ctx.db.query("companies").collect();
  const charterers = companies.filter((c) => c.roles.includes("charterer"));
  const owners = companies.filter((c) => c.roles.includes("owner"));
  const brokers = companies.filter((c) => c.roles.includes("broker"));
  const vessels = await ctx.db.query("vessels").collect();
  const ports = await ctx.db.query("ports").collect();
  const cargoTypes = await ctx.db.query("cargo_types").collect();

  // Get some existing orders and negotiations
  const orders = await ctx.db.query("orders").take(10);

  const contracts = [];
  const recapManagers = [];

  // Create 10 contracts (dry market) from existing negotiations
  for (let i = 0; i < 10; i++) {
    const order = randomItem(orders);
    const laycan = generateLaycan();
    const loadPort = randomItem(ports);
    const dischargePort = randomItem(ports.filter((p) => p._id !== loadPort._id));
    const cargoType = randomItem(cargoTypes);
    const owner = randomItem(owners);
    const charterer = randomItem(charterers);
    const broker = randomItem(brokers);
    const vessel = randomItem(vessels);

    const contractNumber = `CP${10000 + i}`;
    const statuses: Array<"draft" | "working-copy" | "final"> = ["draft", "working-copy", "final"];

    const contractId = await ctx.db.insert("contracts", {
      contractNumber,
      orderId: order._id,
      contractType: randomItem(["voyage-charter", "time-charter", "coa"] as const),
      ownerId: owner._id,
      chartererId: charterer._id,
      brokerId: broker._id,
      vesselId: vessel._id,
      loadPortId: loadPort._id,
      dischargePortId: dischargePort._id,
      laycanStart: laycan.start,
      laycanEnd: laycan.end,
      freightRate: `$${(Math.random() * 20 + 15).toFixed(2)}/mt`,
      freightRateType: "per-tonne",
      demurrageRate: `$${Math.floor(Math.random() * 30000) + 40000}/day`,
      despatchRate: `$${Math.floor(Math.random() * 15000) + 20000}/day`,
      addressCommission: "3.75%",
      brokerCommission: "1.25%",
      cargoTypeId: cargoType._id,
      quantity: Math.floor(Math.random() * 100000) + 100000,
      quantityUnit: cargoType.unitType,
      status: randomItem(statuses),
      approvalStatus: randomItem(["Signed", "Pending approval", "Approved"]),
      createdAt: Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });

    contracts.push(contractId);
  }

  // Create 5 recap managers (wet market)
  for (let i = 0; i < 5; i++) {
    const order = randomItem(orders);
    const laycan = generateLaycan();
    const loadPort = randomItem(ports);
    const dischargePort = randomItem(ports.filter((p) => p._id !== loadPort._id));
    const cargoType = randomItem(cargoTypes);
    const owner = randomItem(owners);
    const charterer = randomItem(charterers);
    const broker = randomItem(brokers);
    const vessel = randomItem(vessels);

    const recapNumber = `RCP${10000 + i}`;
    const statuses: Array<"draft" | "on-subs" | "fully-fixed"> = ["draft", "on-subs", "fully-fixed"];

    const recapId = await ctx.db.insert("recap_managers", {
      recapNumber,
      orderId: order._id,
      contractType: randomItem(["voyage-charter", "time-charter"] as const),
      ownerId: owner._id,
      chartererId: charterer._id,
      brokerId: broker._id,
      vesselId: vessel._id,
      loadPortId: loadPort._id,
      dischargePortId: dischargePort._id,
      laycanStart: laycan.start,
      laycanEnd: laycan.end,
      freightRate: `WS ${Math.floor(Math.random() * 30) + 80}`,
      freightRateType: "worldscale",
      demurrageRate: `$${Math.floor(Math.random() * 40000) + 50000}/day`,
      despatchRate: `$${Math.floor(Math.random() * 20000) + 25000}/day`,
      addressCommission: "3.75%",
      brokerCommission: "1.25%",
      cargoTypeId: cargoType._id,
      quantity: Math.floor(Math.random() * 100000) + 150000,
      quantityUnit: cargoType.unitType,
      status: randomItem(statuses),
      approvalStatus: randomItem(["Signed", "Pending signature", "Approved"]),
      createdAt: Date.now() - Math.floor(Math.random() * 45) * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });

    recapManagers.push(recapId);
  }

  return {
    contractsCreated: contracts.length,
    recapManagersCreated: recapManagers.length,
  };
}

// Master migration function
export const migrateAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Get first user and organization
    const user = await ctx.db.query("users").first();
    if (!user) {
      throw new Error("No users found. Please create a user first.");
    }

    const organization = await ctx.db.query("organizations").first();
    if (!organization) {
      throw new Error("No organizations found. Please create an organization first.");
    }

    // Check if migration already ran
    const existingOrders = await ctx.db.query("orders").first();
    if (existingOrders) {
      return {
        success: false,
        message: "Migration already ran. Database contains orders.",
        alreadyMigrated: true,
      };
    }

    try {
      // Migrate Trade Desk data (orders + negotiations)
      const tradeDeskResult = await migrateTradeDeskData(ctx, organization._id, user._id);

      // Migrate Fixtures data (contracts + recap managers)
      const fixturesResult = await migrateFixturesData(ctx, user._id);

      return {
        success: true,
        message: "Migration completed successfully",
        results: {
          ...tradeDeskResult,
          ...fixturesResult,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Migration failed: ${error}`,
      };
    }
  },
});

// Check migration status
export const checkMigrationStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const ordersCount = (await ctx.db.query("orders").collect()).length;
    const negotiationsCount = (await ctx.db.query("negotiations").collect()).length;
    const contractsCount = (await ctx.db.query("contracts").collect()).length;
    const recapsCount = (await ctx.db.query("recap_managers").collect()).length;

    return {
      isMigrated: ordersCount > 0,
      counts: {
        orders: ordersCount,
        negotiations: negotiationsCount,
        contracts: contractsCount,
        recapManagers: recapsCount,
      },
    };
  },
});

// Clear all trading data (use with caution!)
export const clearTradingData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear in reverse dependency order
    const recapAddenda = await ctx.db.query("recap_addenda").collect();
    for (const addendum of recapAddenda) {
      await ctx.db.delete(addendum._id);
    }

    const contractAddenda = await ctx.db.query("contract_addenda").collect();
    for (const addendum of contractAddenda) {
      await ctx.db.delete(addendum._id);
    }

    const voyages = await ctx.db.query("voyages").collect();
    for (const voyage of voyages) {
      await ctx.db.delete(voyage._id);
    }

    const recaps = await ctx.db.query("recap_managers").collect();
    for (const recap of recaps) {
      await ctx.db.delete(recap._id);
    }

    const contracts = await ctx.db.query("contracts").collect();
    for (const contract of contracts) {
      await ctx.db.delete(contract._id);
    }

    const negotiations = await ctx.db.query("negotiations").collect();
    for (const negotiation of negotiations) {
      await ctx.db.delete(negotiation._id);
    }

    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      await ctx.db.delete(order._id);
    }

    // Clear audit logs
    const fieldChanges = await ctx.db.query("field_changes").collect();
    for (const change of fieldChanges) {
      await ctx.db.delete(change._id);
    }

    const activityLogs = await ctx.db.query("activity_logs").collect();
    for (const log of activityLogs) {
      await ctx.db.delete(log._id);
    }

    return {
      success: true,
      message: "All trading data cleared",
    };
  },
});
