#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found in environment variables");
  console.error("Make sure VITE_CONVEX_URL is set in your .env file");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function migrateData() {
  console.log("🚀 Starting data migration...\n");
  console.log(`📍 Target: ${CONVEX_URL}\n`);

  try {
    // Check if migration already ran
    console.log("🔍 Checking migration status...");
    const status = await client.mutation("migrations:checkMigrationStatus", {});

    console.log("\n📊 Current database state:");
    console.log(`  - Orders: ${status.counts.orders}`);
    console.log(`  - Negotiations: ${status.counts.negotiations}`);
    console.log(`  - Contracts: ${status.counts.contracts}`);
    console.log(`  - Recap Managers: ${status.counts.recapManagers}`);

    if (status.isMigrated) {
      console.log("\n⚠️  Migration already completed!");
      console.log("   To re-migrate, first run: npm run clear-trading-data");
      return;
    }

    console.log("\n🔄 Running migration...");

    // Run migration
    const result = await client.mutation("migrations:migrateAll", {});

    if (result.success) {
      console.log("\n✅ Migration completed successfully!\n");
      console.log("📈 Migration results:");
      console.log(`  - Orders created: ${result.results.ordersCreated}`);
      console.log(`  - Negotiations created: ${result.results.negotiationsCreated}`);
      console.log(`  - Contracts created: ${result.results.contractsCreated}`);
      console.log(`  - Recap Managers created: ${result.results.recapManagersCreated}`);

      // Show final counts
      const finalStatus = await client.mutation("migrations:checkMigrationStatus", {});
      console.log("\n📊 Final database state:");
      console.log(`  - Orders: ${finalStatus.counts.orders}`);
      console.log(`  - Negotiations: ${finalStatus.counts.negotiations}`);
      console.log(`  - Contracts: ${finalStatus.counts.contracts}`);
      console.log(`  - Recap Managers: ${finalStatus.counts.recapManagers}`);

      console.log("\n✨ Database is ready for use!");
    } else {
      console.error(`\n❌ Error: ${result.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error running migration:", error);
    process.exit(1);
  }
}

migrateData();
