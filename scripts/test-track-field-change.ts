#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), ".env.local") });

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;
if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function testFieldChange() {
  console.log("🧪 Testing trackFieldChange function\n");

  try {
    // Get all contracts directly
    const fixtures: any = await client.query("fixtures:listEnriched" as any, {});

    if (!fixtures || fixtures.length === 0) {
      console.error("❌ No fixtures found!");
      return;
    }

    // Find a fixture with a contract
    const fixtureWithContract = fixtures.find((f: any) => f.contract?._id);

    if (!fixtureWithContract || !fixtureWithContract.contract?._id) {
      console.error("❌ No contract found in any fixture!");
      console.log(`Checked ${fixtures.length} fixtures`);
      return;
    }

    console.log(`✅ Found fixture: ${fixtureWithContract.fixtureNumber}`);
    console.log(`✅ Contract ID: ${fixtureWithContract.contract._id}\n`);

    // Try to manually call a test mutation that creates a field change
    console.log("📝 Creating test field change...");

    const result: any = await client.mutation("fixtures:testCreateFieldChange" as any, {
      contractId: fixtureWithContract.contract._id,
    });

    console.log("✅ Test mutation result:", result);

    // Now check if the field change was created
    console.log("\n🔍 Checking if field change was created...");
    const fieldChanges: any = await client.query("audit:getRecentChanges" as any, { limit: 10 });

    if (fieldChanges && fieldChanges.length > 0) {
      console.log(`✅ Found ${fieldChanges.length} field changes`);
      fieldChanges.forEach((change: any, idx: number) => {
        console.log(`${idx + 1}. ${change.fieldName}: ${change.oldValue} → ${change.newValue}`);
      });
    } else {
      console.log("❌ No field changes found after test");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.stack) console.error(error.stack);
  }
}

testFieldChange().catch(console.error);
