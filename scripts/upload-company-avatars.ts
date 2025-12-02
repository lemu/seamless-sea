#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found in environment variables");
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

async function uploadCompanyAvatars() {
  console.log("🚀 Starting company avatar upload...\n");
  console.log(`📍 Target: ${CONVEX_URL}\n`);

  const directories = ["brokers", "charterers", "owners"];
  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const dir of directories) {
    const dirPath = join(process.cwd(), "public", "company-logos", dir);
    console.log(`\n📁 Processing ${dir}...`);
    
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
  console.log("📊 Upload Summary:");
  console.log(`  ✅ Uploaded: ${uploaded}`);
  console.log(`  ⚠️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log("=".repeat(50));
  
  if (uploaded > 0) {
    console.log("\n✨ Avatar upload complete!");
  }
}

uploadCompanyAvatars();
