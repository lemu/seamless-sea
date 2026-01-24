import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Upload company avatars from public folder
 * This mutation takes base64 encoded image data and uploads it to Convex storage
 */
export const uploadAvatar = mutation({
  args: {
    companyName: v.string(),
    storageId: v.id("_storage"), // Already uploaded storage ID
  },
  handler: async (ctx, args) => {
    // Find ALL companies with this name (handles duplicates)
    const companies = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("name"), args.companyName))
      .collect();

    if (companies.length === 0) {
      throw new Error(`Company not found: ${args.companyName}`);
    }

    // Update ALL companies with this name
    const now = Date.now();
    for (const company of companies) {
      await ctx.db.patch(company._id, {
        avatar: args.storageId,
        updatedAt: now,
      });
    }

    return {
      success: true,
      companiesUpdated: companies.length,
      companyName: args.companyName,
      storageId: args.storageId,
    };
  },
});

/**
 * Map of company names to their logo filenames
 */
export const companyLogoMapping = {
  // Brokers
  "Ifchor Galbraiths": "brokers/ifchor-galbraiths.png",
  "Howe Robinson": "brokers/howe-robinson.png",
  "Clarksons": "brokers/clarksons.png",
  "Gibson": "brokers/gibson.png",
  "Simpson Spence Young": "brokers/ssy.png",
  "BRS": "brokers/brs.png",
  "McQuilling Partners": "brokers/mcquilling-partners.png",
  "MB Shipbrokers": "brokers/mb-shipbrokers.png",

  // Charterers
  "Bunge": "charterers/bunge.png",
  "Trafigura": "charterers/trafigura.png",
  "Vitol": "charterers/vitol.png",
  "Cargill": "charterers/cargill.png",
  "Louis Dreyfus": "charterers/louis-dreyfus.png",
  "Cofco": "charterers/cofco.png",
  "Archer Daniels Midland": "charterers/adm.png",
  "Mercuria": "charterers/mercuria.png",

  // Owners
  "Mediterranean Shipping Company": "owners/msc.png",
  "Hapag-Lloyd": "owners/hapag-lloyd.png",
  "Evergreen": "owners/evergreen.png",
  "Maersk": "owners/maersk.png",
  "Cosco Shipping": "owners/cosco.png",
  "Star Bulk Carriers": "owners/star-bulk-carriers.png",
  "CMB Tech": "owners/cmb-tech.png",
  "CMA CGM": "owners/cma-cgm.png",
};
