import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Backfill activity logs: clears all existing logs and regenerates them
// in batches (action orchestrator to avoid mutation timeout).
// Run: npx convex run backfillActivityLogs:backfillActivityLogs
export const backfillActivityLogs = action({
  handler: async (ctx): Promise<{ message: string }> => {
    // Step 1: Clear existing logs
    // @ts-ignore - Type inference issue with deeply nested internal API
    const clearResult = await ctx.runMutation(internal.migrations.clearActivityLogs);
    console.log(`Cleared ${clearResult.cleared} existing activity logs`);

    // Step 2: Get fixture IDs and users
    // @ts-ignore - Type inference issue with deeply nested internal API
    const backfillData = await ctx.runMutation(internal.migrations.getActivityLogBackfillData);
    const fixtureIds = backfillData.fixtureIds as Id<"fixtures">[];
    const userId = backfillData.userId as Id<"users">;
    const counterpartyUserId = backfillData.counterpartyUserId as Id<"users">;

    // Step 3: Process in batches of 10
    const BATCH_SIZE = 10;
    const baseNow = Date.now();
    let totalProcessed = 0;

    for (let i = 0; i < fixtureIds.length; i += BATCH_SIZE) {
      const batch = fixtureIds.slice(i, i + BATCH_SIZE);
      // @ts-ignore - Type inference issue with deeply nested internal API
      const result = await ctx.runMutation(internal.migrations.processActivityLogBatch, {
        fixtureIds: batch,
        userId,
        counterpartyUserId,
        baseNow,
      });
      totalProcessed += result.processed;
      console.log(
        `Processed batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.processed} fixtures (${totalProcessed}/${fixtureIds.length})`
      );
    }

    return {
      message: `Cleared ${clearResult.cleared} old logs, regenerated logs for ${totalProcessed} fixtures`,
    };
  },
});
