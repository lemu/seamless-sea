#!/usr/bin/env node
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

console.log("🗑️  Cleaning database - deleting all old users...\n");

try {
  const result = await client.mutation(api.cleanUsers.deleteAllUsers, {});
  console.log("✅ Success:", result.message);
  console.log(`   Deleted ${result.deletedCount} users\n`);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}

client.close();
