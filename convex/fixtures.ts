import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

// Generate fixture number (FIX12345)
function generateFixtureNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `FIX${randomNum}`;
}

// Create a new fixture
export const create = mutation({
  args: {
    orderId: v.optional(v.id("orders")),
    title: v.optional(v.string()),
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("working-copy"),
        v.literal("final"),
        v.literal("on-subs"),
        v.literal("fully-fixed"),
        v.literal("canceled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const fixtureNumber = generateFixtureNumber();

    const fixtureId = await ctx.db.insert("fixtures", {
      fixtureNumber,
      orderId: args.orderId,
      title: args.title,
      organizationId: args.organizationId,
      status: args.status || "draft",
      createdAt: now,
      updatedAt: now,
    });

    return fixtureId;
  },
});

// Update fixture
export const update = mutation({
  args: {
    fixtureId: v.id("fixtures"),
    title: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("working-copy"),
        v.literal("final"),
        v.literal("on-subs"),
        v.literal("fully-fixed"),
        v.literal("canceled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { fixtureId, ...updates } = args;

    const existing = await ctx.db.get(fixtureId);
    if (!existing) {
      throw new Error("Fixture not found");
    }

    await ctx.db.patch(fixtureId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return fixtureId;
  },
});

// Delete fixture
export const remove = mutation({
  args: { fixtureId: v.id("fixtures") },
  handler: async (ctx, args) => {
    const fixture = await ctx.db.get(args.fixtureId);
    if (!fixture) {
      throw new Error("Fixture not found");
    }

    await ctx.db.delete(args.fixtureId);
  },
});

// List all fixtures
export const list = query({
  args: {},
  handler: async (ctx) => {
    const fixtures = await ctx.db.query("fixtures").collect();
    return fixtures.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get fixture by ID
export const getById = query({
  args: { fixtureId: v.id("fixtures") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fixtureId);
  },
});

// List fixtures by organization
export const listByOrganization = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const fixtures = await ctx.db
      .query("fixtures")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return fixtures.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// List all fixtures with enriched contract data and company avatars
export const listEnriched = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Get fixtures (optionally filtered by organization)
    let fixtures;
    const orgId = args.organizationId;
    if (orgId !== undefined) {
      fixtures = await ctx.db
        .query("fixtures")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", orgId)
        )
        .collect();
    } else {
      fixtures = await ctx.db.query("fixtures").collect();
    }

    // Enrich each fixture with contracts/recaps and company data
    const enrichedFixtures = await Promise.all(
      fixtures.map(async (fixture) => {
        // Get contracts for this fixture
        const contracts = await ctx.db
          .query("contracts")
          .withIndex("by_fixture", (q) => q.eq("fixtureId", fixture._id))
          .collect();

        // Get recap managers for this fixture
        const recapManagers = await ctx.db
          .query("recap_managers")
          .withIndex("by_fixture", (q) => q.eq("fixtureId", fixture._id))
          .collect();

        // Enrich contracts with company data and avatars
        const enrichedContracts = await Promise.all(
          contracts.map(async (contract) => {
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
            const order = contract.orderId
              ? await ctx.db.get(contract.orderId)
              : null;

            // Get avatar URLs
            const ownerWithAvatar = owner && {
              ...owner,
              avatarUrl: owner.avatar
                ? await ctx.storage.getUrl(owner.avatar)
                : null,
            };
            const chartererWithAvatar = charterer && {
              ...charterer,
              avatarUrl: charterer.avatar
                ? await ctx.storage.getUrl(charterer.avatar)
                : null,
            };
            const brokerWithAvatar = broker && {
              ...broker,
              avatarUrl: broker.avatar
                ? await ctx.storage.getUrl(broker.avatar)
                : null,
            };

            return {
              ...contract,
              owner: ownerWithAvatar,
              charterer: chartererWithAvatar,
              broker: brokerWithAvatar,
              vessel,
              loadPort,
              dischargePort,
              cargoType,
              negotiation,
              order,
            };
          })
        );

        // Enrich recap managers with company data and avatars
        const enrichedRecaps = await Promise.all(
          recapManagers.map(async (recap) => {
            const owner = recap.ownerId
              ? await ctx.db.get(recap.ownerId)
              : null;
            const charterer = recap.chartererId
              ? await ctx.db.get(recap.chartererId)
              : null;
            const broker = recap.brokerId
              ? await ctx.db.get(recap.brokerId)
              : null;
            const vessel = recap.vesselId
              ? await ctx.db.get(recap.vesselId)
              : null;
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
            const order = recap.orderId
              ? await ctx.db.get(recap.orderId)
              : null;

            // Get avatar URLs
            const ownerWithAvatar = owner && {
              ...owner,
              avatarUrl: owner.avatar
                ? await ctx.storage.getUrl(owner.avatar)
                : null,
            };
            const chartererWithAvatar = charterer && {
              ...charterer,
              avatarUrl: charterer.avatar
                ? await ctx.storage.getUrl(charterer.avatar)
                : null,
            };
            const brokerWithAvatar = broker && {
              ...broker,
              avatarUrl: broker.avatar
                ? await ctx.storage.getUrl(broker.avatar)
                : null,
            };

            return {
              ...recap,
              owner: ownerWithAvatar,
              charterer: chartererWithAvatar,
              broker: brokerWithAvatar,
              vessel,
              loadPort,
              dischargePort,
              cargoType,
              negotiation,
              order,
            };
          })
        );

        // Get order if exists
        const order = fixture.orderId
          ? await ctx.db.get(fixture.orderId)
          : null;

        return {
          ...fixture,
          order,
          contracts: enrichedContracts,
          recapManagers: enrichedRecaps,
        };
      })
    );

    return enrichedFixtures.sort((a, b) => b._creationTime - a._creationTime);
  },
});
// Get approval status for an entity
export const getApprovalStatus = query({
  args: {
    entityType: v.union(
      v.literal("order"),
      v.literal("contract"),
      v.literal("recap_manager"),
      v.literal("fixture")
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const approvals = await ctx.db
      .query("approvals")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .collect();

    const approved = approvals.filter((a) => a.approved).length;
    const rejected = approvals.filter((a) => !a.approved).length;
    const total = approvals.length;

    // Enrich with user data
    const enrichedApprovals = await Promise.all(
      approvals.map(async (approval) => {
        const user = await ctx.db.get(approval.userId);
        return {
          ...approval,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                avatarUrl: user.avatar
                  ? await ctx.storage.getUrl(user.avatar)
                  : null,
              }
            : null,
        };
      })
    );

    return {
      approvals: enrichedApprovals,
      summary: {
        approved,
        rejected,
        total,
        pending: Math.max(0, 2 - total), // Assuming 2 approvals needed
      },
    };
  },
});

// Get detailed fixture with all relationships and audit trail
export const getFixtureDetails = query({
  args: { fixtureId: v.id("fixtures") },
  handler: async (ctx, args) => {
    const fixture = await ctx.db.get(args.fixtureId);
    if (!fixture) {
      return null;
    }

    // Get contracts for this fixture
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_fixture", (q) => q.eq("fixtureId", fixture._id))
      .collect();

    // Get recap managers for this fixture
    const recapManagers = await ctx.db
      .query("recap_managers")
      .withIndex("by_fixture", (q) => q.eq("fixtureId", fixture._id))
      .collect();

    // Enrich contracts with all related data
    const enrichedContracts = await Promise.all(
      contracts.map(async (contract) => {
        const owner = contract.ownerId ? await ctx.db.get(contract.ownerId) : null;
        const charterer = contract.chartererId ? await ctx.db.get(contract.chartererId) : null;
        const broker = contract.brokerId ? await ctx.db.get(contract.brokerId) : null;
        const vessel = contract.vesselId ? await ctx.db.get(contract.vesselId) : null;
        const loadPort = contract.loadPortId ? await ctx.db.get(contract.loadPortId) : null;
        const dischargePort = contract.dischargePortId ? await ctx.db.get(contract.dischargePortId) : null;
        const cargoType = contract.cargoTypeId ? await ctx.db.get(contract.cargoTypeId) : null;
        const negotiation = contract.negotiationId ? await ctx.db.get(contract.negotiationId) : null;
        const order = contract.orderId ? await ctx.db.get(contract.orderId) : null;

        // Get person in charge from negotiation
        const personInCharge = negotiation?.personInChargeId
          ? await ctx.db.get(negotiation.personInChargeId)
          : null;

        // Get avatars
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
        const personInChargeWithAvatar = personInCharge && {
          ...personInCharge,
          avatarUrl: personInCharge.avatar ? await ctx.storage.getUrl(personInCharge.avatar) : null,
        };

        return {
          ...contract,
          owner: ownerWithAvatar,
          charterer: chartererWithAvatar,
          broker: brokerWithAvatar,
          vessel,
          loadPort,
          dischargePort,
          cargoType,
          negotiation,
          order,
          personInCharge: personInChargeWithAvatar,
        };
      })
    );

    // Get order if exists
    const order = fixture.orderId ? await ctx.db.get(fixture.orderId) : null;

    return {
      ...fixture,
      order,
      contracts: enrichedContracts,
      recapManagers,
    };
  },
});
// Internal seed function for fixtures with realistic maritime data
export const seedFixturesInternal = async (ctx: MutationCtx) => {
  console.log("🚢 Seeding fixtures...");

  // Get the first organization for the fixture
  const organization = await ctx.db.query("organizations").first();
  if (!organization) {
    throw new Error("No organization found. Please seed organizations first.");
  }

  // Get system user for audit trail
  const systemUser = await ctx.db.query("users").first();
  if (!systemUser) {
    throw new Error("No users found. Please create a user first.");
  }

  // Get reference data
  const companies = await ctx.db.query("companies").collect();
  const vessels = await ctx.db.query("vessels").collect();
  const ports = await ctx.db.query("ports").collect();
  const cargoTypes = await ctx.db.query("cargo_types").collect();

  if (
    companies.length === 0 ||
    vessels.length === 0 ||
    ports.length === 0 ||
    cargoTypes.length === 0
  ) {
    throw new Error(
      "Reference data not found. Please seed companies, vessels, ports, and cargo types first."
    );
  }

  // Filter companies by role
  const owners = companies.filter((c) => c.roles.includes("owner"));
  const charterers = companies.filter((c) => c.roles.includes("charterer"));
  const brokers = companies.filter((c) => c.roles.includes("broker"));

  // Real maritime market rates based on vessel types
  const getMarketRates = (vesselClass: string | undefined) => {
    // VLCC - Very Large Crude Carriers (oil tankers)
    if (vesselClass?.includes("TI class") || vesselClass?.includes("VLCC")) {
      return {
        freightRate: `$${(28 + Math.random() * 4).toFixed(2)}/mt`, // $28-32/mt
        demurrageRate: `$${Math.floor(32000 + Math.random() * 4000)}/day`, // $32k-36k/day
        laycanDuration: 3, // 3 days
      };
    }
    // Aframax (medium oil tankers)
    if (vesselClass?.includes("Aframax")) {
      return {
        freightRate: `WS ${Math.floor(95 + Math.random() * 35)}`, // WS 95-130
        demurrageRate: `$${Math.floor(22000 + Math.random() * 3000)}/day`, // $22k-25k/day
        laycanDuration: 2,
      };
    }
    // Capesize (large bulk carriers)
    if (vesselClass?.includes("Capesize") || vesselClass?.includes("Valemax") || vesselClass?.includes("VLOC")) {
      return {
        freightRate: `$${(23 + Math.random() * 5).toFixed(2)}/mt`, // $23-28/mt
        demurrageRate: `$${Math.floor(22000 + Math.random() * 4000)}/day`, // $22k-26k/day
        laycanDuration: 5, // 5 days
      };
    }
    // Container ships
    if (vesselClass?.includes("class") && vesselClass?.includes("Ever") || vesselClass?.includes("MSC") || vesselClass?.includes("HMM") || vesselClass?.includes("OOCL") || vesselClass?.includes("ONE")) {
      return {
        freightRate: `$${Math.floor(2200 + Math.random() * 800)}/FEU`, // $2,200-3,000/FEU
        demurrageRate: `$${Math.floor(12000 + Math.random() * 4000)}/day`, // $12k-16k/day
        laycanDuration: 2,
      };
    }
    // Default (smaller vessels)
    return {
      freightRate: `$${(15 + Math.random() * 15).toFixed(2)}/mt`,
      demurrageRate: `$${Math.floor(8000 + Math.random() * 7000)}/day`,
      laycanDuration: 3,
    };
  };

  // Helper: Generate progressive status flow for a fixture
  const generateStatusProgression = (finalStatus: string, showFullProgression: boolean) => {
    const statuses = [];

    // Order phase
    statuses.push({
      phase: "order",
      status: "draft",
      label: "Draft",
      action: "created",
      description: "Order created",
      daysOffset: 0,
    });

    statuses.push({
      phase: "order",
      status: "distributed",
      label: "Distributed",
      action: "distributed",
      description: "Order distributed to market",
      daysOffset: 0.25, // 6 hours later
    });

    if (finalStatus === "fully-fixed" && showFullProgression) {
      // Full negotiation progression for 70-80% of fully-fixed fixtures
      statuses.push({
        phase: "negotiation",
        status: "indicative-offer",
        label: "Indicative Offer",
        action: "created",
        description: "Initial indicative offer received",
        daysOffset: 1,
      });

      statuses.push({
        phase: "negotiation",
        status: "indicative-bid",
        label: "Indicative Bid",
        action: "updated",
        description: "Counter-bid submitted",
        daysOffset: 2,
      });

      statuses.push({
        phase: "negotiation",
        status: "firm-offer",
        label: "Firm Offer",
        action: "updated",
        description: "Offer upgraded to firm terms",
        daysOffset: 3,
      });

      statuses.push({
        phase: "negotiation",
        status: "firm-bid",
        label: "Firm Bid",
        action: "updated",
        description: "Final firm bid accepted",
        daysOffset: 4,
      });

      statuses.push({
        phase: "negotiation",
        status: "on-subs",
        label: "On Subs",
        action: "updated",
        description: "Agreement subject to conditions",
        daysOffset: 4.5,
      });

      statuses.push({
        phase: "negotiation",
        status: "fixed",
        label: "Fixed",
        action: "fixed",
        description: "Negotiation successfully concluded",
        daysOffset: 6,
      });
    } else if (finalStatus === "fully-fixed") {
      // Shorter path for remaining 20-30% of fully-fixed fixtures
      statuses.push({
        phase: "negotiation",
        status: "firm-offer",
        label: "Firm Offer",
        action: "created",
        description: "Firm offer received",
        daysOffset: 1,
      });

      statuses.push({
        phase: "negotiation",
        status: "fixed",
        label: "Fixed",
        action: "fixed",
        description: "Terms agreed and fixed",
        daysOffset: 3,
      });
    } else {
      // Partial progression for non-fully-fixed
      statuses.push({
        phase: "negotiation",
        status: "indicative-offer",
        label: "Indicative Offer",
        action: "created",
        description: "Initial offer received",
        daysOffset: 1,
      });

      if (Math.random() < 0.6) {
        statuses.push({
          phase: "negotiation",
          status: "firm-offer",
          label: "Firm Offer",
          action: "updated",
          description: "Offer confirmed as firm",
          daysOffset: 2.5,
        });
      }
    }

    // Contract phase (if negotiation was fixed)
    if (finalStatus === "fully-fixed" || finalStatus === "final" || finalStatus === "on-subs") {
      statuses.push({
        phase: "contract",
        status: "draft",
        label: "Draft",
        action: "created",
        description: "Contract draft prepared",
        daysOffset: showFullProgression ? 7 : 4,
      });

      statuses.push({
        phase: "contract",
        status: "working-copy",
        label: "Working Copy",
        action: "updated",
        description: "Contract circulated for review",
        daysOffset: showFullProgression ? 8 : 4.5,
      });

      if (finalStatus === "fully-fixed" || finalStatus === "final") {
        statuses.push({
          phase: "contract",
          status: "final",
          label: "Final",
          action: "finalized",
          description: "Contract finalized and ready for execution",
          daysOffset: showFullProgression ? 10 : 6,
        });
      }
    }

    return statuses;
  };

  // Helper: Create field changes with all tracked fields
  const createFieldChange = async (
    entityType: "order" | "negotiation" | "contract" | "recap_manager" | "contract_addenda" | "recap_addenda",
    entityId: any,
    fieldName: string,
    oldValue: string,
    newValue: string,
    reason: string,
    timestamp: number
  ) => {
    await ctx.db.insert("field_changes", {
      entityType,
      entityId: entityId.toString(),
      fieldName,
      oldValue,
      newValue,
      changeReason: reason,
      userId: systemUser._id,
      timestamp,
    });
  };

  // Helper: Create activity log
  const createActivityLog = async (
    entityType: "order" | "negotiation" | "contract" | "recap_manager",
    entityId: any,
    action: string,
    description: string,
    statusValue: string,
    statusLabel: string,
    timestamp: number,
    expandable?: Array<{ label: string; value: string }>
  ) => {
    await ctx.db.insert("activity_logs", {
      entityType,
      entityId,
      action,
      description,
      status: {
        value: statusValue,
        label: statusLabel,
      },
      userId: systemUser._id,
      timestamp,
      expandable: expandable ? { data: expandable } : undefined,
    });
  };

  const now = Date.now();
  const fixturesCreated = [];

  // Create 140 fixtures with realistic progression
  for (let i = 0; i < 140; i++) {
    const fixtureNumber = `FIX${10000 + i}`;

    // Determine fixture pattern: 60% trade flow (order→negotiation→contract), 40% direct contracts
    const isTradeFlow = Math.random() < 0.6;

    // Only trade flow fixtures can have multiple contracts; direct contracts must have separate fixtures
    const hasMultipleContracts = isTradeFlow && Math.random() < 0.4; // 40% chance for trade flow only
    const numContracts = hasMultipleContracts ? Math.floor(Math.random() * 2) + 2 : 1; // 2-3 contracts

    // Weighted status distribution (more fully-fixed)
    const rand = Math.random();
    let fixtureStatus: "draft" | "working-copy" | "final" | "on-subs" | "fully-fixed" | "canceled";
    if (rand < 0.5) fixtureStatus = "fully-fixed"; // 50%
    else if (rand < 0.7) fixtureStatus = "final"; // 20%
    else if (rand < 0.85) fixtureStatus = "on-subs"; // 15%
    else if (rand < 0.95) fixtureStatus = "working-copy"; // 10%
    else fixtureStatus = "draft"; // 5%

    // Determine if this gets full progression (70-80% of fully-fixed)
    const showFullProgression = fixtureStatus === "fully-fixed" && Math.random() < 0.75;

    // Generate status progression
    const statusProgression = generateStatusProgression(fixtureStatus, showFullProgression);

    // Calculate base timeline
    const maxDaysOffset = Math.max(...statusProgression.map(s => s.daysOffset));
    const startTime = now - (maxDaysOffset + 5) * 24 * 60 * 60 * 1000; // Start N+5 days ago

    // Create an order for this fixture (only for trade flow fixtures)
    const orderNumber = `ORD${10000 + i}`;
    const orderTimestamp = startTime;
    const orderId = isTradeFlow ? await ctx.db.insert("orders", {
      orderNumber,
      type: "charter",
      stage: "active",
      organizationId: organization._id,
      status: "distributed",
      createdAt: orderTimestamp,
      updatedAt: now,
    }) : undefined;

    // Create fixture (linked to order only for trade flow)
    const fixtureId = await ctx.db.insert("fixtures", {
      fixtureNumber,
      orderId: isTradeFlow ? orderId : undefined,
      organizationId: organization._id,
      status: fixtureStatus,
      createdAt: orderTimestamp,
      updatedAt: now,
    });

    // Create contracts for this fixture
    for (let j = 0; j < numContracts; j++) {
      const owner = owners[Math.floor(Math.random() * owners.length)];
      const charterer = charterers[Math.floor(Math.random() * charterers.length)];
      const broker = brokers[Math.floor(Math.random() * brokers.length)];
      const vessel = vessels[Math.floor(Math.random() * vessels.length)];
      const loadPort = ports[Math.floor(Math.random() * ports.length)];
      const dischargePort = ports[Math.floor(Math.random() * ports.length)];
      const cargoType = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
      const contractType = Math.random() < 0.7 ? "voyage-charter" : "time-charter";

      // Get realistic market rates based on vessel class
      const marketRates = getMarketRates(vessel.vesselClass);

      // Laycan based on vessel class
      const laycanDuration = marketRates.laycanDuration;
      const laycanStartOffset = 15 * 24 * 60 * 60 * 1000 + Math.random() * 45 * 24 * 60 * 60 * 1000;
      const laycanStart = now + laycanStartOffset;
      const laycanEnd = laycanStart + laycanDuration * 24 * 60 * 60 * 1000;

      const freightRate = marketRates.freightRate;
      const demurrageRate = marketRates.demurrageRate;

      const contractNumber = `CP${30000 + fixturesCreated.length * 3 + j}`;

      // Determine contract status based on fixture status
      let contractStatus: "draft" | "working-copy" | "final" | "rejected";
      if (fixtureStatus === "fully-fixed" || fixtureStatus === "final") {
        contractStatus = "final";
      } else if (fixtureStatus === "on-subs" || fixtureStatus === "working-copy") {
        contractStatus = "working-copy";
      } else {
        contractStatus = "draft";
      }

      // Create a negotiation for this contract (only for trade flow fixtures)
      let negotiationId;
      const negotiationNumber = `NEG${10000 + i * 10 + j}`;

      // Negotiation status based on fixture status
      let negotiationStatus: "indicative-offer" | "indicative-bid" | "firm-offer" | "firm-bid" | "firm" | "on-subs" | "fixed" | "withdrawn" | "firm-offer-expired" | "firm-amendment" | "on-subs-amendment" | "subs-expired" | "subs-failed" = "indicative-offer";
      if (fixtureStatus === "fully-fixed" || fixtureStatus === "final") {
        negotiationStatus = "fixed";
      } else if (fixtureStatus === "on-subs") {
        negotiationStatus = "on-subs";
      } else if (fixtureStatus === "working-copy") {
        negotiationStatus = "firm-offer";
      }

      if (isTradeFlow) {
        // TypeScript: orderId is guaranteed to be defined when isTradeFlow is true
        if (!orderId) throw new Error("orderId must be defined for trade flow");

        negotiationId = await ctx.db.insert("negotiations", {
          negotiationNumber,
          orderId,
          counterpartyId: charterer._id,
          brokerId: broker._id,
          vesselId: vessel._id,
          status: negotiationStatus,
          createdAt: startTime + 1 * 24 * 60 * 60 * 1000,
          updatedAt: now,
        });
      }

      // Initial values for changes
      const initialOwner = owners[Math.floor(Math.random() * owners.length)];
      const initialCharterer = charterers[Math.floor(Math.random() * charterers.length)];
      const initialBroker = brokers[Math.floor(Math.random() * brokers.length)];
      const initialLoadPort = ports[Math.floor(Math.random() * ports.length)];
      const initialQuantity = Math.floor(Math.random() * 50000) + 20000;
      const quantity = Math.floor(Math.random() * 50000) + 20000;
      const initialFreightRate = `$${(parseFloat(freightRate.replace(/[^0-9.]/g, '')) * 0.92).toFixed(2)}/mt`;
      const initialDemurrageRate = `$${Math.floor(parseInt(demurrageRate.replace(/[^0-9]/g, '')) * 0.85)}/day`;
      const initialLaycanStart = laycanStart - 7 * 24 * 60 * 60 * 1000;

      const contractId = await ctx.db.insert("contracts", {
        contractNumber,
        fixtureId,
        negotiationId,
        orderId: negotiationId ? orderId : undefined,
        contractType,
        ownerId: owner._id,
        chartererId: charterer._id,
        brokerId: broker._id,
        vesselId: vessel._id,
        loadPortId: loadPort._id,
        dischargePortId: dischargePort._id,
        laycanStart,
        laycanEnd,
        freightRate,
        freightRateType: freightRate.includes("WS") ? "worldscale" : "per-tonne",
        demurrageRate,
        despatchRate: `$${Math.floor(parseInt(demurrageRate.replace(/[^0-9]/g, '')) * 0.5)}/day`,
        addressCommission: "3.75%",
        brokerCommission: "1.25%",
        cargoTypeId: cargoType._id,
        quantity,
        quantityUnit: "MT",
        status: contractStatus,
        createdAt: startTime + (showFullProgression ? 7 : 4) * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });

      // Generate 3-5 field changes for most contracts (85%)
      const numFieldChanges = Math.random() < 0.85 ? Math.floor(Math.random() * 3) + 3 : 0; // 3-5 changes
      const changeFields = [];

      // Decide which fields will change
      const possibleFields = [
        { field: "chartererId", old: initialCharterer._id, new: charterer._id, oldName: initialCharterer.name, newName: charterer.name, reason: "Charterer changed after negotiations" },
        { field: "brokerId", old: initialBroker._id, new: broker._id, oldName: initialBroker.name, newName: broker.name, reason: "Broker assignment updated" },
        { field: "ownerId", old: initialOwner._id, new: owner._id, oldName: initialOwner.name, newName: owner.name, reason: "Vessel owner confirmed" },
        { field: "loadPortId", old: initialLoadPort._id, new: loadPort._id, oldName: initialLoadPort.name, newName: loadPort.name, reason: "Load port adjusted per charterer request" },
        { field: "quantity", old: initialQuantity.toString(), new: quantity.toString(), oldName: initialQuantity.toString(), newName: quantity.toString(), reason: "Cargo quantity finalized" },
        { field: "freightRate", old: initialFreightRate, new: freightRate, oldName: initialFreightRate, newName: freightRate, reason: "Freight rate negotiated to market level" },
        { field: "laycanStart", old: new Date(initialLaycanStart).toISOString(), new: new Date(laycanStart).toISOString(), oldName: new Date(initialLaycanStart).toLocaleDateString(), newName: new Date(laycanStart).toLocaleDateString(), reason: "Laycan adjusted for vessel schedule" },
        { field: "demurrageRate", old: initialDemurrageRate, new: demurrageRate, oldName: initialDemurrageRate, newName: demurrageRate, reason: "Demurrage rate adjusted per market conditions" },
      ];

      // Randomly select fields to change
      const shuffled = [...possibleFields].sort(() => Math.random() - 0.5);
      const selectedChanges = shuffled.slice(0, numFieldChanges);

      // Create field changes with timestamps spread during contract phase
      const contractCreationTime = startTime + (showFullProgression ? 7 : 4) * 24 * 60 * 60 * 1000;
      for (let k = 0; k < selectedChanges.length; k++) {
        const change = selectedChanges[k];
        const changeTimestamp = contractCreationTime + (k * 0.5 + 0.5) * 24 * 60 * 60 * 1000; // Spread over days

        await createFieldChange(
          "contract",
          contractId,
          change.field,
          change.oldName,
          change.newName,
          change.reason,
          changeTimestamp
        );

        changeFields.push({ label: change.field.replace("Id", "").replace(/([A-Z])/g, " $1").trim(), value: `${change.oldName} → ${change.newName}` });
      }

      // Create activity logs based on status progression
      for (const statusStep of statusProgression) {
        const stepTimestamp = startTime + statusStep.daysOffset * 24 * 60 * 60 * 1000;

        if (statusStep.phase === "order" && orderId) {
          // Order phase logs (only for trade flow)
          await createActivityLog(
            "order",
            orderId,
            statusStep.action,
            statusStep.description,
            `order-${statusStep.status}`,
            statusStep.label,
            stepTimestamp,
            statusStep.action === "created" ? [
              { label: "Vessel", value: vessel.name },
              { label: "Route", value: `${loadPort.name} → ${dischargePort.name}` },
              { label: "Cargo", value: cargoType.name },
            ] : undefined
          );
        } else if (statusStep.phase === "negotiation" && negotiationId) {
          // Negotiation phase logs
          await createActivityLog(
            "negotiation",
            negotiationId,
            statusStep.action,
            `${statusStep.description} with ${charterer.name}`,
            `negotiation-${statusStep.status}`,
            statusStep.label,
            stepTimestamp
          );
        } else if (statusStep.phase === "contract") {
          // Contract phase logs with field changes in expandable
          const expandableData = statusStep.action === "updated" && changeFields.length > 0
            ? changeFields
            : statusStep.action === "created"
            ? [
                { label: "Parties", value: `${owner.name} / ${charterer.name}` },
                { label: "Broker", value: broker.name },
                { label: "Vessel", value: vessel.name },
              ]
            : undefined;

          await createActivityLog(
            "contract",
            contractId,
            statusStep.action,
            `${statusStep.description} - ${contractNumber}`,
            `contract-${statusStep.status}`,
            statusStep.label,
            stepTimestamp,
            expandableData
          );
        }
      }
    }

    fixturesCreated.push({ fixtureNumber, numContracts, status: fixtureStatus });
  }

  console.log(`✅ Created ${fixturesCreated.length} fixtures`);
  console.log(
    `   - ${fixturesCreated.filter((f) => f.numContracts > 1).length} with multiple contracts`
  );
  console.log(
    `   - ${fixturesCreated.filter((f) => f.numContracts === 1).length} with single contracts`
  );
  console.log(
    `   - ${fixturesCreated.filter((f) => f.status === "fully-fixed").length} fully-fixed (with rich progression)`
  );

  return {
    success: true,
    message: `✅ Seeded ${fixturesCreated.length} fixtures with ${fixturesCreated.reduce((sum, f) => sum + f.numContracts, 0)} total contracts`,
    count: fixturesCreated.length,
  };
};

// Quick fix: Update all fixtures and orders to use the new organization
export const updateToNewOrg = mutation({
  args: {},
  handler: async (ctx) => {
    const oldOrgId = "jn74yz9z6a4dgqz6s1197cvxzs7p2g27" as any;
    const newOrgId = "jn7ccnv64at1jyxt0ytp6nwe457p2qrm" as any;

    // Update fixtures
    const fixtures = await ctx.db
      .query("fixtures")
      .filter((q) => q.eq(q.field("organizationId"), oldOrgId))
      .collect();

    for (const fixture of fixtures) {
      await ctx.db.patch(fixture._id, { organizationId: newOrgId });
    }

    // Update orders
    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("organizationId"), oldOrgId))
      .collect();

    for (const order of orders) {
      await ctx.db.patch(order._id, { organizationId: newOrgId });
    }

    return {
      success: true,
      fixturesUpdated: fixtures.length,
      ordersUpdated: orders.length,
    };
  },
});
