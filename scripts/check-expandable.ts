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

async function checkExpandable() {
  console.log("🔍 Checking for expandable activity logs\n");

  const result: any = await client.query("fixtures:debugExpandableActivityLogs" as any, {});

  console.log("📊 Activity Logs Summary:");
  console.log(`   Total activity logs: ${result.total}`);
  console.log(`   With expandable data: ${result.withExpandable}\n`);

  if (result.withExpandable > 0) {
    console.log("✅ Sample expandable entries:");
    result.samples.forEach((sample: any, idx: number) => {
      console.log(`\n${idx + 1}. ${sample.entityType} - ${sample.action}`);
      console.log(`   Description: ${sample.description}`);
      console.log(`   Expandable data count: ${sample.expandableDataCount}`);
      console.log(`   Data:`, JSON.stringify(sample.expandableData, null, 2));
    });
  } else {
    console.log("❌ No activity logs with expandable data found!");
  }
}

checkExpandable().catch(console.error);
