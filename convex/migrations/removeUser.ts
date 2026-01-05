import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Migration function to completely remove a user from production
// Removes all memberships and the user record
export const removeUserCompletely = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find all memberships for this user
    const memberships = await ctx.db
      .query("memberships")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Delete all memberships
    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // Find and delete any boards created by this user
    const boards = await ctx.db
      .query("boards")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // For each board, delete associated widgets
    let totalWidgets = 0;
    for (const board of boards) {
      const widgets = await ctx.db
        .query("widgets")
        .filter((q) => q.eq(q.field("boardId"), board._id))
        .collect();

      for (const widget of widgets) {
        await ctx.db.delete(widget._id);
        totalWidgets++;
      }

      await ctx.db.delete(board._id);
    }

    // Delete pinned boards
    const pinnedBoards = await ctx.db
      .query("pinned_boards")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    for (const pinnedBoard of pinnedBoards) {
      await ctx.db.delete(pinnedBoard._id);
    }

    // Get the user before deletion for the response
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Delete the user record
    await ctx.db.delete(args.userId);

    return {
      success: true,
      deletedUser: {
        email: user.email,
        name: user.name,
      },
      deletedMemberships: memberships.length,
      deletedBoards: boards.length,
      deletedWidgets: totalWidgets,
      deletedPinnedBoards: pinnedBoards.length,
    };
  },
});
