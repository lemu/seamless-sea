import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Migration function to reorder user's organization memberships
// by deleting and recreating the Sea membership
export const reorderUserMemberships = mutation({
  args: {
    userId: v.id("users"),
    organizationIdToRecreate: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Find the existing membership
    const existingMembership = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), args.organizationIdToRecreate)
        )
      )
      .first();

    if (!existingMembership) {
      throw new Error("Membership not found");
    }

    // Store the role
    const role = existingMembership.role;

    // Delete the existing membership
    await ctx.db.delete(existingMembership._id);

    // Recreate with new timestamp
    const newMembershipId = await ctx.db.insert("memberships", {
      userId: args.userId,
      organizationId: args.organizationIdToRecreate,
      role: role,
      createdAt: Date.now(),
    });

    return {
      success: true,
      oldMembershipId: existingMembership._id,
      newMembershipId,
      message: `Membership recreated with new timestamp`,
    };
  },
});
