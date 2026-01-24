import { mutation } from "./_generated/server";

/**
 * One-time cleanup mutation to remove duplicate company records
 * Keeps the newer records (which most contracts reference) and deletes older duplicates
 */
export const removeDuplicateCompanies = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🧹 Starting duplicate company cleanup...\n");

    let companiesChecked = 0;
    let duplicatesRemoved = 0;

    // Get all companies
    const allCompanies = await ctx.db.query("companies").collect();

    // Group companies by name
    const companiesByName = new Map<string, typeof allCompanies>();
    for (const company of allCompanies) {
      const existing = companiesByName.get(company.name) || [];
      existing.push(company);
      companiesByName.set(company.name, existing);
    }

    // Process each group
    for (const [name, companies] of companiesByName) {
      companiesChecked++;

      if (companies.length === 1) {
        // No duplicates for this company
        continue;
      }

      console.log(`\n⚠️  Found ${companies.length} records for "${name}"`);

      // Sort by creation time (newest first)
      companies.sort((a, b) => b.createdAt - a.createdAt);

      // Keep the newest record, delete the rest
      const keepRecord = companies[0];
      const deleteRecords = companies.slice(1);

      console.log(`   ✅ Keeping: ${keepRecord._id} (created ${new Date(keepRecord.createdAt).toISOString()})`);

      for (const oldRecord of deleteRecords) {
        // Check if this record is referenced by any contracts
        const asOwner = await ctx.db
          .query("contracts")
          .filter((q) => q.eq(q.field("ownerId"), oldRecord._id))
          .first();

        const asCharterer = await ctx.db
          .query("contracts")
          .filter((q) => q.eq(q.field("chartererId"), oldRecord._id))
          .first();

        const asBroker = await ctx.db
          .query("contracts")
          .filter((q) => q.eq(q.field("brokerId"), oldRecord._id))
          .first();

        if (asOwner || asCharterer || asBroker) {
          console.log(`   ⚠️  Cannot delete ${oldRecord._id} - still referenced by contracts`);
          console.log(`      Migrating references to newer record...`);

          // Update all contracts that reference this old company to use the new one
          if (asOwner) {
            const contractsAsOwner = await ctx.db
              .query("contracts")
              .filter((q) => q.eq(q.field("ownerId"), oldRecord._id))
              .collect();

            for (const contract of contractsAsOwner) {
              await ctx.db.patch(contract._id, {
                ownerId: keepRecord._id,
              });
            }
            console.log(`      ✅ Updated ${contractsAsOwner.length} contracts (as owner)`);
          }

          if (asCharterer) {
            const contractsAsCharterer = await ctx.db
              .query("contracts")
              .filter((q) => q.eq(q.field("chartererId"), oldRecord._id))
              .collect();

            for (const contract of contractsAsCharterer) {
              await ctx.db.patch(contract._id, {
                chartererId: keepRecord._id,
              });
            }
            console.log(`      ✅ Updated ${contractsAsCharterer.length} contracts (as charterer)`);
          }

          if (asBroker) {
            const contractsAsBroker = await ctx.db
              .query("contracts")
              .filter((q) => q.eq(q.field("brokerId"), oldRecord._id))
              .collect();

            for (const contract of contractsAsBroker) {
              await ctx.db.patch(contract._id, {
                brokerId: keepRecord._id,
              });
            }
            console.log(`      ✅ Updated ${contractsAsBroker.length} contracts (as broker)`);
          }
        }

        // Now safe to delete
        await ctx.db.delete(oldRecord._id);
        duplicatesRemoved++;
        console.log(`   🗑️  Deleted: ${oldRecord._id} (created ${new Date(oldRecord.createdAt).toISOString()})`);
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log(`✨ Cleanup complete!`);
    console.log(`📊 Companies checked: ${companiesChecked}`);
    console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`);
    console.log("=".repeat(70));

    return {
      companiesChecked,
      duplicatesRemoved,
    };
  },
});
