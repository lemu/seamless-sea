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

async function verifyDistribution() {
  console.log("📊 Verifying Status Distribution\n");

  // Get all negotiations
  const negotiations = await client.query("api:negotiations:list" as any, {});

  // Count by status
  const negStatusCounts: Record<string, number> = {};
  negotiations.forEach((neg: any) => {
    negStatusCounts[neg.status] = (negStatusCounts[neg.status] || 0) + 1;
  });

  console.log("🔹 Negotiation Status Distribution:");
  const totalNegs = negotiations.length;
  Object.entries(negStatusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
    const percentage = ((count / totalNegs) * 100).toFixed(1);
    console.log(`  ${status.padEnd(20)} ${count.toString().padStart(3)} (${percentage}%)`);
  });

  // Get all contracts
  const contracts = await client.query("api:contracts:list" as any, {});

  // Count by status
  const contractStatusCounts: Record<string, number> = {};
  contracts.forEach((contract: any) => {
    contractStatusCounts[contract.status] = (contractStatusCounts[contract.status] || 0) + 1;
  });

  console.log("\n🔹 Contract Status Distribution:");
  const totalContracts = contracts.length;
  Object.entries(contractStatusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
    const percentage = ((count / totalContracts) * 100).toFixed(1);
    console.log(`  ${status.padEnd(20)} ${count.toString().padStart(3)} (${percentage}%)`);
  });

  // Count status combinations
  console.log("\n🔹 Status Combinations:");
  const combinations: Record<string, number> = {};

  // Create a map of negotiationId -> contract
  const negotiationToContract = new Map();
  contracts.forEach((contract: any) => {
    negotiationToContract.set(contract.negotiationId, contract);
  });

  negotiations.forEach((neg: any) => {
    const contract = negotiationToContract.get(neg._id);
    const combo = contract
      ? `${neg.status} + ${contract.status}`
      : `${neg.status} (no contract)`;
    combinations[combo] = (combinations[combo] || 0) + 1;
  });

  Object.entries(combinations).sort((a, b) => b[1] - a[1]).forEach(([combo, count]) => {
    const percentage = ((count / totalNegs) * 100).toFixed(1);
    console.log(`  ${combo.padEnd(45)} ${count.toString().padStart(3)} (${percentage}%)`);
  });

  // Summary
  const inProgressCount = negotiations.filter((neg: any) => {
    const contract = negotiationToContract.get(neg._id);
    if (!contract) {
      return ["firm-bid", "firm-offer", "indicative-bid", "indicative-offer"].includes(neg.status);
    }
    return (neg.status === "on-subs" || neg.status === "firm") &&
           (contract.status === "draft" || contract.status === "working-copy");
  }).length;

  const inProgressPercentage = ((inProgressCount / totalNegs) * 100).toFixed(1);

  console.log("\n📈 Summary:");
  console.log(`  Total negotiations: ${totalNegs}`);
  console.log(`  Total contracts: ${totalContracts}`);
  console.log(`  In-progress: ${inProgressCount} (${inProgressPercentage}%) - Target: 30%`);
  console.log(`  Complete: ${totalNegs - inProgressCount} (${(100 - parseFloat(inProgressPercentage)).toFixed(1)}%) - Target: 70%`);
}

verifyDistribution().catch(console.error);
