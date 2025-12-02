#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found in environment variables");
  console.error("Make sure VITE_CONVEX_URL is set in your .env file");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function seedDatabase() {
  console.log("🌱 Starting database seed...\n");
  console.log(`📍 Target: ${CONVEX_URL}\n`);

  try {
    // Check if already seeded
    console.log("🔍 Checking if database is already seeded...");
    const checkResult = await client.query("seed:checkSeeded", {});

    console.log("\n📊 Current database state:");
    console.log(`  - Companies: ${checkResult.counts.companies}`);
    console.log(`  - Ports: ${checkResult.counts.ports}`);
    console.log(`  - Vessels: ${checkResult.counts.vessels}`);
    console.log(`  - Cargo Types: ${checkResult.counts.cargoTypes}`);
    console.log(`  - Routes: ${checkResult.counts.routes}`);
    console.log(`  - Fixtures: ${checkResult.counts.fixtures}`);
    console.log(`  - Contracts: ${checkResult.counts.contracts}`);

    if (checkResult.isSeeded) {
      console.log("\n⚠️  Database is already seeded!");
      console.log("   To re-seed, first run: npm run clear-db");
      return;
    }

    console.log("\n🚀 Seeding reference data...");

    // Run seed mutation
    const result = await client.mutation("seed:seedAll", {});

    if (result.success) {
      console.log("\n✅ Database seeded successfully!\n");

      // Show results
      for (const r of result.results) {
        console.log(`   ${r.message}`);
      }

      // Show final counts
      const finalCheck = await client.query("seed:checkSeeded", {});
      console.log("\n📊 Final database state:");
      console.log(`  - Companies: ${finalCheck.counts.companies}`);
      console.log(`  - Ports: ${finalCheck.counts.ports}`);
      console.log(`  - Vessels: ${finalCheck.counts.vessels}`);
      console.log(`  - Cargo Types: ${finalCheck.counts.cargoTypes}`);
      console.log(`  - Routes: ${finalCheck.counts.routes}`);
      console.log(`  - Fixtures: ${finalCheck.counts.fixtures}`);
      console.log(`  - Contracts: ${finalCheck.counts.contracts}`);
    } else {
      console.error(`\n❌ Error: ${result.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
