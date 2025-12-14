import { mutation } from "./_generated/server";

/**
 * Delete all users from database with cascading deletes
 * Handles foreign key dependencies to prevent orphaned records
 */
export const deleteAllUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();

    let deletedUsers = 0;
    let deletedRelated = 0;

    for (const user of allUsers) {
      // Delete related records first (cascading delete)

      // Delete sessions
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      for (const session of sessions) {
        await ctx.db.delete(session._id);
        deletedRelated++;
      }

      // Delete memberships
      const memberships = await ctx.db
        .query("memberships")
        .filter((q) => q.eq(q.field("userId"), user._id))
        .collect();
      for (const membership of memberships) {
        await ctx.db.delete(membership._id);
        deletedRelated++;
      }

      // Delete boards
      const boards = await ctx.db
        .query("boards")
        .filter((q) => q.eq(q.field("userId"), user._id))
        .collect();
      for (const board of boards) {
        await ctx.db.delete(board._id);
        deletedRelated++;
      }

      // Delete pinned boards
      const pinnedBoards = await ctx.db
        .query("pinned_boards")
        .filter((q) => q.eq(q.field("userId"), user._id))
        .collect();
      for (const pinned of pinnedBoards) {
        await ctx.db.delete(pinned._id);
        deletedRelated++;
      }

      // Delete activity logs
      const activityLogs = await ctx.db
        .query("activity_logs")
        .filter((q) => q.eq(q.field("userId"), user._id))
        .collect();
      for (const log of activityLogs) {
        await ctx.db.delete(log._id);
        deletedRelated++;
      }

      // Delete field changes
      const fieldChanges = await ctx.db
        .query("field_changes")
        .filter((q) => q.eq(q.field("userId"), user._id))
        .collect();
      for (const change of fieldChanges) {
        await ctx.db.delete(change._id);
        deletedRelated++;
      }

      // Finally delete the user
      await ctx.db.delete(user._id);
      deletedUsers++;
    }

    console.log(`🗑️  Deleted ${deletedUsers} users and ${deletedRelated} related records`);

    return {
      success: true,
      deletedUsers,
      deletedRelated,
      message: `Deleted ${deletedUsers} users and ${deletedRelated} related records. Database is clean.`,
    };
  },
});
