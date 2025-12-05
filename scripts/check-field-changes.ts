#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), ".env.local") });

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;
if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function checkFieldChanges() {
  console.log("🔍 Checking for field changes in database\n");

  // Query field changes for a specific contract
  const fixtures: any = await client.query(api.fixtures.list as any, {});

  console.log(`📊 Found ${fixtures.length} fixtures\n`);

  for (const fixture of fixtures.slice(0, 5)) {
    if (!fixture.contract?._id) continue;

    console.log(`\n🔎 Fixture: ${fixture.orderNumber} (Contract ID: ${fixture.contract._id})`);

    try {
      const fieldChanges: any = await client.query(
        api.fixtures.getFieldChanges as any,
        {
          entityType: "contract",
          entityId: fixture.contract._id,
        }
      );

      if (fieldChanges && fieldChanges.length > 0) {
        console.log(`   ✅ Found ${fieldChanges.length} field changes:`);
        fieldChanges.slice(0, 3).forEach((change: any) => {
          console.log(`      - ${change.fieldName}: ${change.oldValue} → ${change.newValue}`);
        });
      } else {
        console.log(`   ❌ No field changes found`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error querying: ${error.message}`);
    }
  }
}

checkFieldChanges().catch(console.error);
