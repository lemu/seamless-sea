import { query } from "./_generated/server";
import { authComponent } from "./authQueries";

// Diagnostic query to check user authentication state
export const checkCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      return { error: "No authenticated user" };
    }

    // Check if user exists in users table
    const dbUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .first();

    return {
      authUser: {
        id: authUser._id,
        email: authUser.email,
        name: authUser.name,
      },
      dbUser: dbUser ? {
        _id: dbUser._id,
        email: dbUser.email,
        name: dbUser.name,
      } : null,
      appUserId: dbUser?._id,
      diagnosis: dbUser
        ? "✅ User found in both auth and users table"
        : "❌ User in auth but NOT in users table - this is the problem!",
    };
  },
});
