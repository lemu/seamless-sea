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

async function checkFieldChanges() {
  console.log("🔍 Checking field_changes table directly\n");

  // Use the raw Convex API to query all field changes
  const queryFn = async () => {
    return await client.query("audit:getRecentChanges" as any, { limit: 10 });
  };

  try {
    const result: any = await queryFn();

    if (!result || result.length === 0) {
      console.log("❌ No field changes found in database!");
    } else {
      console.log(`✅ Found ${result.length} field changes:\n`);
      result.forEach((change: any, idx: number) => {
        console.log(`${idx + 1}. ${change.entityType} - ${change.fieldName}`);
        console.log(`   Entity ID: ${change.entityId}`);
        console.log(`   Change: ${change.oldValue} → ${change.newValue}`);
        console.log(`   User: ${change.user?.name || "Unknown"}`);
        console.log();
      });
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

checkFieldChanges().catch(console.error);
