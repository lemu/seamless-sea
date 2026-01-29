import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./authQueries";

// Diagnostic query to check auth state
export const checkAuthState = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    const convexAuth = await ctx.auth.getUserIdentity();

    return {
      betterAuthUser: authUser ? {
        id: authUser._id,
        email: authUser.email,
        name: authUser.name,
      } : null,
      convexAuth: convexAuth ? {
        subject: convexAuth.subject,
        tokenIdentifier: convexAuth.tokenIdentifier,
      } : null,
      authenticated: !!authUser || !!convexAuth,
    };
  },
});

// One-time mutation to sync Better Auth user to users table
// Takes email/name as parameters to bypass auth context issues
export const syncCurrentUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists in users table
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      return {
        success: true,
        message: "User already exists in users table",
        userId: existingUser._id,
      };
    }

    // Create user in users table
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      message: "User synced successfully",
      userId,
    };
  },
});
