import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Diagnostic query to check company avatar data consistency
 */
export const checkCompanyAvatarConsistency = query({
  args: {
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all companies with this name
    const companies = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("name"), args.companyName))
      .collect();

    console.log(`Found ${companies.length} companies named "${args.companyName}"`);

    const results = [];

    for (const company of companies) {
      // Get avatar URL if exists
      let avatarUrl = null;
      if (company.avatar) {
        avatarUrl = await ctx.storage.getUrl(company.avatar);
      }

      // Find contracts that reference this company
      const asOwner = await ctx.db
        .query("contracts")
        .filter((q) => q.eq(q.field("ownerId"), company._id))
        .collect();

      const asCharterer = await ctx.db
        .query("contracts")
        .filter((q) => q.eq(q.field("chartererId"), company._id))
        .collect();

      const asBroker = await ctx.db
        .query("contracts")
        .filter((q) => q.eq(q.field("brokerId"), company._id))
        .collect();

      results.push({
        companyId: company._id,
        companyName: company.name,
        hasAvatar: !!company.avatar,
        avatarId: company.avatar || null,
        avatarUrl,
        referencedInContracts: {
          asOwner: asOwner.length,
          asCharterer: asCharterer.length,
          asBroker: asBroker.length,
          total: asOwner.length + asCharterer.length + asBroker.length,
        },
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      });
    }

    return results;
  },
});
