#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";
import { config } from "dotenv";
import { join } from "path";

// Load .env.local file
config({ path: join(process.cwd(), ".env.local") });

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found in environment variables");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function verifyUniqueCPIDs() {
  console.log("🔍 Verifying Contract Numbers (CP IDs)\n");

  const result = await client.mutation("migrations:verifyUniqueCPIDs", {});

  console.log("📊 Results:");
  console.log(`  Total contracts: ${result.totalContracts}`);
  console.log(`  Unique CP IDs: ${result.uniqueCPIDs}`);
  console.log(`  Duplicate CP IDs: ${result.duplicateCount}\n`);

  if (result.duplicateCount > 0) {
    console.log("❌ Found duplicate CP IDs:\n");
    result.duplicates.forEach((dup: any) => {
      console.log(`  ${dup.cpNumber} (${dup.count} contracts)`);
      console.log(`    Fixture IDs: ${dup.fixtureIds.join(", ")}\n`);
    });
    process.exit(1);
  } else {
    console.log("✅ All CP IDs are unique!");
    console.log(`\n📈 CP Number Range: ${result.range.min} → ${result.range.max}`);
    console.log(`   Total range: ${result.range.span} numbers`);
    console.log(`   Contracts created: ${result.totalContracts}`);
    console.log(`   Gap count: ${result.range.gaps}`);
  }
}

verifyUniqueCPIDs().catch(console.error);
