import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Cleanup duplicate companies one at a time to avoid read limits
 */
export const cleanupDuplicateForCompany = mutation({
  args: {
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`🧹 Cleaning up duplicates for: ${args.companyName}`);

    // Get all companies with this name
    const companies = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("name"), args.companyName))
      .collect();

    if (companies.length <= 1) {
      console.log(`   ✅ No duplicates found`);
      return { cleaned: false, reason: "no_duplicates" };
    }

    console.log(`   Found ${companies.length} records`);

    // Sort by creation time (newest first)
    companies.sort((a, b) => b.createdAt - a.createdAt);

    const keepRecord = companies[0];
    const deleteRecord = companies[1]; // Only delete one at a time

    console.log(`   Keeping: ${keepRecord._id}`);
    console.log(`   Deleting: ${deleteRecord._id}`);

    // Migrate all contract references
    const contractsAsOwner = await ctx.db
      .query("contracts")
      .filter((q) => q.eq(q.field("ownerId"), deleteRecord._id))
      .collect();

    for (const contract of contractsAsOwner) {
      await ctx.db.patch(contract._id, { ownerId: keepRecord._id });
    }

    const contractsAsCharterer = await ctx.db
      .query("contracts")
      .filter((q) => q.eq(q.field("chartererId"), deleteRecord._id))
      .collect();

    for (const contract of contractsAsCharterer) {
      await ctx.db.patch(contract._id, { chartererId: keepRecord._id });
    }

    const contractsAsBroker = await ctx.db
      .query("contracts")
      .filter((q) => q.eq(q.field("brokerId"), deleteRecord._id))
      .collect();

    for (const contract of contractsAsBroker) {
      await ctx.db.patch(contract._id, { brokerId: keepRecord._id });
    }

    console.log(`   Updated ${contractsAsOwner.length + contractsAsCharterer.length + contractsAsBroker.length} contracts`);

    // Delete the old record
    await ctx.db.delete(deleteRecord._id);
    console.log(`   ✅ Deleted old record`);

    return {
      cleaned: true,
      companyName: args.companyName,
      deletedId: deleteRecord._id,
      keptId: keepRecord._id,
      contractsUpdated: contractsAsOwner.length + contractsAsCharterer.length + contractsAsBroker.length,
    };
  },
});
