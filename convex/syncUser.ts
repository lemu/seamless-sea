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

// Auto-fix: Diagnose and fix the current user's sync issue
// Call this when user is authenticated but appUserId is missing
export const autoFixCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    // Get the authenticated user from Better Auth
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      return {
        success: false,
        message: "No authenticated user found. Please log in first.",
      };
    }

    const authEmail = authUser.email;

    // Try exact lookup first
    const exactMatch = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authEmail))
      .first();

    if (exactMatch) {
      return {
        success: true,
        message: "User already synced correctly",
        userId: exactMatch._id,
        email: exactMatch.email,
        authEmail: authEmail,
      };
    }

    // No exact match - try case-insensitive lookup
    const allUsers = await ctx.db.query("users").collect();
    const normalizedAuthEmail = authEmail.trim().toLowerCase();

    const caseInsensitiveMatch = allUsers.find(
      (u) => u.email.trim().toLowerCase() === normalizedAuthEmail
    );

    if (caseInsensitiveMatch) {
      // Found a match with different casing - fix it
      await ctx.db.patch(caseInsensitiveMatch._id, {
        email: authEmail,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        message: `Fixed email case mismatch: "${caseInsensitiveMatch.email}" → "${authEmail}"`,
        userId: caseInsensitiveMatch._id,
        oldEmail: caseInsensitiveMatch.email,
        newEmail: authEmail,
      };
    }

    // No match at all - create new user entry
    const now = Date.now();
    const newUserId = await ctx.db.insert("users", {
      name: authUser.name,
      email: authEmail,
      emailVerified: authUser.emailVerified ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      message: `Created new user entry for: ${authEmail}`,
      userId: newUserId,
      email: authEmail,
      created: true,
    };
  },
});
