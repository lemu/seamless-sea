#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";
import * as readline from "readline";

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found in environment variables");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

async function clearDatabase() {
  console.log("🗑️  Clear Database\n");
  console.log(`📍 Target: ${CONVEX_URL}\n`);

  // Check current state
  const checkResult = await client.query("seed:checkSeeded", {});

  console.log("📊 Current database state:");
  console.log(`  - Companies: ${checkResult.counts.companies}`);
  console.log(`  - Ports: ${checkResult.counts.ports}`);
  console.log(`  - Vessels: ${checkResult.counts.vessels}`);
  console.log(`  - Cargo Types: ${checkResult.counts.cargoTypes}`);
  console.log(`  - Routes: ${checkResult.counts.routes}`);

  if (
    checkResult.counts.companies === 0 &&
    checkResult.counts.ports === 0 &&
    checkResult.counts.vessels === 0 &&
    checkResult.counts.cargoTypes === 0 &&
    checkResult.counts.routes === 0
  ) {
    console.log("\n✅ Database is already empty!");
    return;
  }

  console.log("\n⚠️  WARNING: This will delete all reference data!");
  const answer = await askQuestion("Are you sure? (yes/no): ");

  if (answer.toLowerCase() !== "yes") {
    console.log("❌ Cancelled");
    return;
  }

  console.log("\n🗑️  Clearing database...");

  try {
    const result = await client.mutation("seed:clearAll", {});

    if (result.success) {
      console.log("✅ Database cleared successfully!");
    } else {
      console.error("❌ Error clearing database");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

clearDatabase();
