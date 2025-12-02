#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found in environment variables");
  console.error("Make sure VITE_CONVEX_URL is set in your .env file");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function clearTradingData() {
  console.log("🗑️  Clearing trading data...\n");
  console.log(`📍 Target: ${CONVEX_URL}\n`);

  try {
    // Check migration status first
    console.log("🔍 Checking current state...");
    const status = await client.mutation("migrations:checkMigrationStatus", {});

    console.log("\n📊 Current database state:");
    console.log(`  - Orders: ${status.counts.orders}`);
    console.log(`  - Negotiations: ${status.counts.negotiations}`);
    console.log(`  - Contracts: ${status.counts.contracts}`);
    console.log(`  - Recap Managers: ${status.counts.recapManagers}`);

    if (status.counts.orders === 0 && status.counts.negotiations === 0 && status.counts.contracts === 0) {
      console.log("\n✅ Trading data is already empty!");
      return;
    }

    console.log("\n🗑️  Clearing all trading data in batches...\n");

    let totalDeleted = 0;
    let batchCount = 0;
    let moreToDelete = true;

    while (moreToDelete) {
      const result = await client.mutation("migrations:clearTradingDataBatch", {});

      if (result.deleted > 0) {
        totalDeleted += result.deleted;
        batchCount++;
        process.stdout.write(`\r   Deleted ${totalDeleted} records (batch ${batchCount} from ${result.table})...`);
      }

      moreToDelete = result.moreToDelete;
    }

    console.log("\n\n✅ Trading data cleared successfully!");
    console.log(`   Total records deleted: ${totalDeleted}`);
    console.log("\nℹ️  To re-populate the data, run: npm run seed-all");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

clearTradingData();
