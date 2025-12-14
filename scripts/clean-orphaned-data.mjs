#!/usr/bin/env node
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

console.log("🗑️  Cleaning orphaned data...\n");

try {
  const result = await client.mutation(api.cleanOrphanedData.cleanOrphanedData, {});
  console.log("✅ Success:", result.message);
  console.log(`   Deleted ${result.deletedCount} orphaned records\n`);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
