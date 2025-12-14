import { mutation } from "./_generated/server";

/**
 * Clean up activity logs and field changes in batches
 * Use this for development to fix fixtures activity log display
 */
export const cleanOrphanedData = mutation({
  args: {},
  handler: async (ctx) => {
    let totalDeleted = 0;

    // Delete activity logs in batches (limit 1000 per call)
    const activityLogs = await ctx.db.query("activity_logs").take(1000);
    for (const log of activityLogs) {
      await ctx.db.delete(log._id);
      totalDeleted++;
    }

    // Delete field changes in batches (limit 1000 per call)
    const fieldChanges = await ctx.db.query("field_changes").take(1000);
    for (const change of fieldChanges) {
      await ctx.db.delete(change._id);
      totalDeleted++;
    }

    console.log(`🗑️  Cleaned ${totalDeleted} records (run again if more remain)`);

    return {
      success: true,
      deletedCount: totalDeleted,
      message: `Cleaned ${totalDeleted} records. Run again if more records remain.`,
    };
  },
});
