import { mutation, query } from "./_generated/server";
import { seedCompaniesInternal } from "./companies";
import { seedPortsInternal } from "./ports";
import { seedVesselsInternal } from "./vessels";
import { seedCargoTypesInternal } from "./cargo_types";
import { seedRoutesInternal } from "./routes";
import { migrateTradeDeskDataInternal, migrateFixturesDataInternal, attachActivityLogsToFixtures } from "./migrations";

// Master seed function to populate all reference data
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const results = [];

    try {
      // 1. Seed companies (charterers, brokers, owners)
      const companiesResult = await seedCompaniesInternal(ctx);
      results.push(companiesResult);

      // 2. Seed ports
      const portsResult = await seedPortsInternal(ctx);
      results.push(portsResult);

      // 3. Seed vessels
      const vesselsResult = await seedVesselsInternal(ctx);
      results.push(vesselsResult);

      // 4. Seed cargo types
      const cargoTypesResult = await seedCargoTypesInternal(ctx);
      results.push(cargoTypesResult);

      // 5. Seed routes (depends on ports)
      const routesResult = await seedRoutesInternal(ctx);
      results.push(routesResult);

      // Get user and organization for fixture migration
      const user = await ctx.db.query("users").first();
      if (!user) {
        throw new Error("No users found. Please create a user first.");
      }

      const organization = await ctx.db.query("organizations").first();
      if (!organization) {
        throw new Error("No organizations found. Please create an organization first.");
      }

      // 6. Seed Trade Desk data (orders + negotiations + contracts)
      const tradeDeskResult = await migrateTradeDeskDataInternal(ctx, organization._id, user._id);
      results.push(tradeDeskResult);

      // 7. Seed Fixtures data (direct contracts + recap managers)
      // Pass contract count from Trade Desk to avoid duplicate CP numbers
      const fixturesResult = await migrateFixturesDataInternal(
        ctx,
        user._id,
        tradeDeskResult.contractsCreated
      );
      results.push(fixturesResult);

      // 8. Attach activity logs to all fixtures (both Trade Desk and Out of Trade)
      const baseNow = Date.now();
      await attachActivityLogsToFixtures(ctx, user._id, baseNow);
      results.push({
        message: "Activity logs attached to all fixtures"
      });

      return {
        success: true,
        message: "Successfully seeded all reference data, fixtures, and activity logs",
        results,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error seeding data: ${error}`,
        results,
      };
    }
  },
});

// Check if database is already seeded
export const checkSeeded = query({
  args: {},
  handler: async (ctx) => {
    const companiesCount = (await ctx.db.query("companies").collect()).length;
    const portsCount = (await ctx.db.query("ports").collect()).length;
    const vesselsCount = (await ctx.db.query("vessels").collect()).length;
    const cargoTypesCount = (await ctx.db.query("cargo_types").collect()).length;
    const routesCount = (await ctx.db.query("routes").collect()).length;
    const fixturesCount = (await ctx.db.query("fixtures").collect()).length;
    const contractsCount = (await ctx.db.query("contracts").collect()).length;

    return {
      isSeeded: companiesCount > 0 && portsCount > 0 && vesselsCount > 0 && cargoTypesCount > 0,
      counts: {
        companies: companiesCount,
        ports: portsCount,
        vessels: vesselsCount,
        cargoTypes: cargoTypesCount,
        routes: routesCount,
        fixtures: fixturesCount,
        contracts: contractsCount,
      },
    };
  },
});

// Clear all reference data (use with caution!)
export const clearAllReferenceData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear in reverse dependency order

    // Clear contracts first (depends on fixtures)
    const contracts = await ctx.db.query("contracts").collect();
    for (const contract of contracts) {
      await ctx.db.delete(contract._id);
    }

    // Clear fixtures
    const fixtures = await ctx.db.query("fixtures").collect();
    for (const fixture of fixtures) {
      await ctx.db.delete(fixture._id);
    }

    const routes = await ctx.db.query("routes").collect();
    for (const route of routes) {
      await ctx.db.delete(route._id);
    }

    const cargoTypes = await ctx.db.query("cargo_types").collect();
    for (const cargoType of cargoTypes) {
      await ctx.db.delete(cargoType._id);
    }

    const vessels = await ctx.db.query("vessels").collect();
    for (const vessel of vessels) {
      await ctx.db.delete(vessel._id);
    }

    const ports = await ctx.db.query("ports").collect();
    for (const port of ports) {
      await ctx.db.delete(port._id);
    }

    // Clean up company avatars from storage before deleting companies
    const companies = await ctx.db.query("companies").collect();
    let avatarsDeleted = 0;
    for (const company of companies) {
      if (company.avatar) {
        try {
          await ctx.storage.delete(company.avatar);
          avatarsDeleted++;
        } catch (error) {
          console.error(`Failed to delete avatar for ${company.name}:`, error);
        }
      }
      await ctx.db.delete(company._id);
    }

    return {
      success: true,
      message: `All reference data cleared (${avatarsDeleted} avatars removed from storage)`,
    };
  },
});
