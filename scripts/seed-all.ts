#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import * as readline from "readline";
import { config } from "dotenv";

// Load .env.local file
config({ path: join(process.cwd(), ".env.local") });

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found in environment variables");
  console.error("Make sure VITE_CONVEX_URL is set in your .env file");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// Mapping of filenames to company names
const FILENAME_TO_COMPANY: Record<string, string> = {
  // Brokers
  "brs.png": "BRS",
  "clarksons.png": "Clarksons",
  "gibson.png": "Gibson",
  "howe-robinson.png": "Howe Robinson",
  "ifchor-galbraiths.png": "Ifchor Galbraiths",
  "mb-shipbrokers.png": "MB Shipbrokers",
  "mcquilling-partners.png": "McQuilling Partners",
  "ssy.png": "Simpson Spence Young",

  // Charterers
  "adm.png": "Archer Daniels Midland",
  "bunge.png": "Bunge",
  "cargill.png": "Cargill",
  "cofco.png": "Cofco",
  "louis-dreyfus.png": "Louis Dreyfus",
  "mercuria.png": "Mercuria",
  "trafigura.png": "Trafigura",
  "vitol.png": "Vitol",

  // Owners
  "cma-cgm.png": "CMA CGM",
  "cmb-tech.png": "CMB Tech",
  "cosco.png": "Cosco Shipping",
  "evergreen.png": "Evergreen",
  "hapag-lloyd.png": "Hapag-Lloyd",
  "maersk.png": "Maersk",
  "msc.png": "Mediterranean Shipping Company",
  "star-bulk-carriers.png": "Star Bulk Carriers",
};

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
  console.log("🗑️  Step 1/3: Clearing existing data...\n");

  // Check current state
  const checkResult = await client.query("seed:checkSeeded", {});

  console.log("📊 Current database state:");
  console.log(`  - Companies: ${checkResult.counts.companies}`);
  console.log(`  - Ports: ${checkResult.counts.ports}`);
  console.log(`  - Vessels: ${checkResult.counts.vessels}`);
  console.log(`  - Cargo Types: ${checkResult.counts.cargoTypes}`);
  console.log(`  - Routes: ${checkResult.counts.routes}`);
  console.log(`  - Fixtures: ${checkResult.counts.fixtures}`);
  console.log(`  - Contracts: ${checkResult.counts.contracts}`);

  if (
    checkResult.counts.companies === 0 &&
    checkResult.counts.ports === 0 &&
    checkResult.counts.vessels === 0
  ) {
    console.log("\n✅ Database is already empty, skipping clear step.");
    return;
  }

  console.log("\n🗑️  Clearing database (including avatar cleanup)...");

  try {
    const result = await client.mutation("seed:clearAllReferenceData", {});

    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.error("❌ Error clearing database");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

async function seedDatabase() {
  console.log("\n🌱 Step 2/3: Seeding reference data...\n");

  try {
    const result = await client.mutation("seed:seedAll", {});

    if (result.success) {
      console.log("✅ Reference data seeded successfully!\n");

      // Show results
      for (const r of result.results) {
        console.log(`   ${r.message}`);
      }

      // Show final counts
      const finalCheck = await client.query("seed:checkSeeded", {});
      console.log("\n📊 Database state after seeding:");
      console.log(`  - Companies: ${finalCheck.counts.companies}`);
      console.log(`  - Ports: ${finalCheck.counts.ports}`);
      console.log(`  - Vessels: ${finalCheck.counts.vessels}`);
      console.log(`  - Cargo Types: ${finalCheck.counts.cargoTypes}`);
      console.log(`  - Routes: ${finalCheck.counts.routes}`);
      console.log(`  - Fixtures: ${finalCheck.counts.fixtures}`);
      console.log(`  - Contracts: ${finalCheck.counts.contracts}`);
    } else {
      console.error(`❌ Error: ${result.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

async function uploadCompanyAvatars() {
  console.log("\n📸 Step 3/3: Uploading company avatars...\n");

  const directories = ["brokers", "charterers", "owners"];
  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const dir of directories) {
    const dirPath = join(process.cwd(), "public", "company-logos", dir);
    console.log(`📁 Processing ${dir}...`);

    try {
      const files = readdirSync(dirPath).filter(f => f.endsWith(".png"));

      for (const filename of files) {
        const companyName = FILENAME_TO_COMPANY[filename];

        if (!companyName) {
          console.log(`  ⚠️  Skipping ${filename} - no mapping found`);
          skipped++;
          continue;
        }

        try {
          // Get company from database
          const companies = await client.query("companies:list", {});
          const company = companies.find((c: any) => c.name === companyName);

          if (!company) {
            console.log(`  ❌ ${filename} - company "${companyName}" not found in database`);
            errors++;
            continue;
          }

          // Read file
          const filePath = join(dirPath, filename);
          const fileBuffer = readFileSync(filePath);
          const blob = new Blob([fileBuffer], { type: "image/png" });

          // Generate upload URL
          const uploadUrl = await client.mutation("companies:generateUploadUrl", {});

          // Upload file
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "image/png" },
            body: blob,
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const { storageId } = await response.json();

          // Update company with avatar
          await client.mutation("companies:update", {
            id: company._id,
            avatar: storageId,
          });

          console.log(`  ✅ ${filename} → ${companyName}`);
          uploaded++;

        } catch (error) {
          console.log(`  ❌ ${filename} - ${error}`);
          errors++;
        }
      }
    } catch (error) {
      console.log(`  ❌ Error reading directory ${dir}: ${error}`);
      errors++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Avatar Upload Summary:");
  console.log(`  ✅ Uploaded: ${uploaded}`);
  console.log(`  ⚠️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log("=".repeat(50));

  if (uploaded > 0) {
    console.log("\n✨ Company avatars uploaded successfully!");
  }
}

async function seedAll() {
  console.log("🚀 Unified Seed Process\n");
  console.log(`📍 Target: ${CONVEX_URL}\n`);
  console.log("This will:");
  console.log("  1. Clear existing reference data (with avatar cleanup)");
  console.log("  2. Seed fresh reference data");
  console.log("  3. Upload company avatars");
  console.log("");

  // Check for --yes or -y flag
  const autoConfirm = process.argv.includes("--yes") || process.argv.includes("-y");

  let answer = "yes";
  if (!autoConfirm) {
    answer = await askQuestion("Continue? (yes/no): ");
  } else {
    console.log("Auto-confirmed with --yes flag");
  }

  if (answer.toLowerCase() !== "yes") {
    console.log("❌ Cancelled");
    return;
  }

  console.log("");

  try {
    // Step 1: Clear database
    await clearDatabase();

    // Step 2: Seed reference data
    await seedDatabase();

    // Step 3: Upload avatars
    await uploadCompanyAvatars();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 All steps completed successfully!");
    console.log("=".repeat(50));
    console.log("\n✨ Your database is now fully seeded with avatars!");
  } catch (error) {
    console.error("\n❌ Fatal error during seed process:", error);
    process.exit(1);
  }
}

seedAll();
