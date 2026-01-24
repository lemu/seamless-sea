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
    if (!user) {
      console.log("getCurrentUser: No auth user found");
      return null;
    }

    console.log("getCurrentUser: Auth user found:", user.email);

    // Try to get avatar URL from our users table (for backwards compatibility)
    let dbUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .first();

    console.log("getCurrentUser: DB user lookup result:", dbUser ? "FOUND" : "NOT FOUND", "for email:", user.email);

    // If user doesn't exist in users table, schedule a mutation to create it
    // (queries can't modify data, but we can trigger a mutation)
    if (!dbUser) {
      console.warn("⚠️ User authenticated but not in users table:", user.email);
    } else {
      console.log("✅ User found with appUserId:", dbUser._id);
    }

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
