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
    // Query contracts table directly using raw query
    const query = async () => {
      // We need to use a convex query that returns contracts
      // Let's create a simple query mutation pair for this
      return await client.query("seed:getFirstContract" as any, {});
    };

    let firstContract: any;
    try {
      firstContract = await query();
    } catch (e: any) {
      console.log("⚠️  Query 'seed:getFirstContract' doesn't exist, using alternative...\n");

      // Alternative: use the check script approach
      console.log("📊 Checking database directly for contracts...");
      // We'll need to add a helper query
      return;
    }

    if (!firstContract) {
      console.error("❌ No contract found in database!");
      return;
    }

    console.log(`✅ Found contract: ${firstContract._id}\n`);

    // Try to manually call a test mutation that creates a field change
    console.log("📝 Creating test field change...");

    const result: any = await client.mutation("fixtures:testCreateFieldChange" as any, {
      contractId: firstContract._id,
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
    if (error.data) console.error("Data:", error.data);
  }
}

testFieldChange().catch(console.error);
