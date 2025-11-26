import { mutation } from "./_generated/server";
import { seedCompanies } from "./companies";
import { seedPorts } from "./ports";
import { seedVessels } from "./vessels";
import { seedCargoTypes } from "./cargo_types";
import { seedRoutes } from "./routes";

// Master seed function to populate all reference data
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const results = [];

    try {
      // 1. Seed companies (charterers, brokers, owners)
      const companiesResult = await seedCompanies(ctx, {});
      results.push(companiesResult);

      // 2. Seed ports
      const portsResult = await seedPorts(ctx, {});
      results.push(portsResult);

      // 3. Seed vessels
      const vesselsResult = await seedVessels(ctx, {});
      results.push(vesselsResult);

      // 4. Seed cargo types
      const cargoTypesResult = await seedCargoTypes(ctx, {});
      results.push(cargoTypesResult);

      // 5. Seed routes (depends on ports)
      const routesResult = await seedRoutes(ctx, {});
      results.push(routesResult);

      return {
        success: true,
        message: "Successfully seeded all reference data",
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
export const checkSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const companiesCount = (await ctx.db.query("companies").collect()).length;
    const portsCount = (await ctx.db.query("ports").collect()).length;
    const vesselsCount = (await ctx.db.query("vessels").collect()).length;
    const cargoTypesCount = (await ctx.db.query("cargo_types").collect()).length;
    const routesCount = (await ctx.db.query("routes").collect()).length;

    return {
      isSeeded: companiesCount > 0 && portsCount > 0 && vesselsCount > 0 && cargoTypesCount > 0,
      counts: {
        companies: companiesCount,
        ports: portsCount,
        vessels: vesselsCount,
        cargoTypes: cargoTypesCount,
        routes: routesCount,
      },
    };
  },
});

// Clear all data (use with caution!)
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear in reverse dependency order
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

    const companies = await ctx.db.query("companies").collect();
    for (const company of companies) {
      await ctx.db.delete(company._id);
    }

    return {
      success: true,
      message: "All reference data cleared",
    };
  },
});
