#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function checkNegotiations() {
  console.log("🔍 Checking negotiations data...\n");
  
  try {
    // Get first organization
    const org = await client.query("organizations:getFirstOrganization", {});
    
    if (!org) {
      console.log("❌ No organization found");
      return;
    }

    // Get orders with negotiations
    const orders = await client.query("orders:listWithNegotiations", { 
      organizationId: org._id 
    });

    console.log(`📊 Found ${orders.length} orders\n`);

    orders.slice(0, 2).forEach((order: any) => {
      console.log(`Order: ${order.orderNumber || order._id}`);
      console.log(`  Negotiations: ${order.negotiations?.length || 0}`);
      
      order.negotiations?.slice(0, 3).forEach((neg: any) => {
        console.log(`    - negotiationNumber: ${neg.negotiationNumber || 'MISSING'}`);
        console.log(`      _id: ${neg._id}`);
        console.log(`      counterparty: ${neg.counterparty?.name}`);
      });
      console.log();
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkNegotiations();
