import { createClient } from "@convex-dev/better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";

// Better Auth component - uses the registered component from convex.config.ts
export const authComponent = createClient<DataModel>(components.betterAuth);

// Query to get current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    // Try to get avatar URL from our users table (for backwards compatibility)
    const dbUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .first();

    let avatarUrl = null;
    if (dbUser?.avatar) {
      avatarUrl = await ctx.storage.getUrl(dbUser.avatar);
    }

    return {
      ...user,
      avatarUrl,
      // Include our user's _id for compatibility with existing code
      appUserId: dbUser?._id,
    };
  },
});
