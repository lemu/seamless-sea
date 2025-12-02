#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found in environment variables");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function seedFixtures() {
  console.log("🚢 Seeding fixtures...\n");
  console.log(`📍 Target: ${CONVEX_URL}\n`);

  try {
    console.log("🚀 Creating fixtures with realistic maritime data...");

    // Call the fixtures seed mutation
    const result = await client.mutation("fixtures:seedFixtures", {});

    if (result.success) {
      console.log("\n✅ Fixtures seeded successfully!\n");

      // Show final counts
      const checkResult = await client.query("seed:checkSeeded", {});
      console.log("📊 Final database state:");
      console.log(`  - Fixtures: ${checkResult.counts.fixtures || 0}`);
      console.log(`  - Contracts: ${checkResult.counts.contracts || 0}`);
    } else {
      console.error(`\n❌ Error: ${result.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error seeding fixtures:", error);
    process.exit(1);
  }
}

seedFixtures();
