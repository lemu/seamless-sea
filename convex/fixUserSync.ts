import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./authQueries";

// List all users in the users table - for diagnostics
export const listAllUsersInTable = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(u => ({
      id: u._id,
      email: u.email,
      emailExact: JSON.stringify(u.email),
      name: u.name,
    }));
  },
});

// Direct fix: update user email by ID - run from Convex dashboard
export const updateUserEmail = mutation({
  args: {
    userId: v.id("users"),
    newEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const oldEmail = user.email;
    await ctx.db.patch(args.userId, {
      email: args.newEmail,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Updated email from "${oldEmail}" to "${args.newEmail}"`,
      userId: args.userId,
    };
  },
});

// Delete user from users table (to allow re-sync)
export const deleteUserFromTable = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    await ctx.db.delete(args.userId);

    return {
      success: true,
      message: `Deleted user: ${user.email} (${args.userId})`,
    };
  },
});

// Diagnostic query to check the exact state of user accounts
export const diagnoseUserSync = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const searchEmail = args.email.trim().toLowerCase();

    // Get all users from users table
    const allUsers = await ctx.db.query("users").collect();

    // Find potential matches (case-insensitive, trimmed)
    const potentialMatches = allUsers.filter(u =>
      u.email.trim().toLowerCase() === searchEmail
    );

    // Exact match lookup (what getCurrentUser does)
    const exactMatch = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    // Get auth user if authenticated
    const authUser = await authComponent.safeGetAuthUser(ctx);

    return {
      searchedEmail: args.email,
      normalizedEmail: searchEmail,
      authUser: authUser ? {
        id: authUser._id,
        email: authUser.email,
        emailExact: JSON.stringify(authUser.email), // Shows any hidden chars
      } : null,
      exactMatchFound: !!exactMatch,
      exactMatch: exactMatch ? {
        id: exactMatch._id,
        email: exactMatch.email,
        emailExact: JSON.stringify(exactMatch.email), // Shows any hidden chars
      } : null,
      potentialMatchesCount: potentialMatches.length,
      potentialMatches: potentialMatches.map(u => ({
        id: u._id,
        email: u.email,
        emailExact: JSON.stringify(u.email),
        name: u.name,
      })),
      diagnosis: exactMatch
        ? "✅ Email matches exactly"
        : potentialMatches.length > 0
          ? `⚠️ Found ${potentialMatches.length} case-insensitive match(es) but NO exact match. Email may have case/whitespace difference.`
          : "❌ No matching user found at all",
    };
  },
});

// Fix the email in users table to match what Better Auth uses
export const fixUserEmail = mutation({
  args: {
    targetEmail: v.string(),  // The email we're looking for (case-insensitive)
    correctEmail: v.string(), // The exact email from Better Auth
  },
  handler: async (ctx, args) => {
    const searchEmail = args.targetEmail.trim().toLowerCase();

    // Get all users from users table
    const allUsers = await ctx.db.query("users").collect();

    // Find the user with case-insensitive match
    const userToFix = allUsers.find(u =>
      u.email.trim().toLowerCase() === searchEmail
    );

    if (!userToFix) {
      return {
        success: false,
        message: `No user found with email matching: ${args.targetEmail}`,
      };
    }

    // Check if already correct
    if (userToFix.email === args.correctEmail) {
      return {
        success: true,
        message: "Email already matches exactly, no fix needed",
        userId: userToFix._id,
        email: userToFix.email,
      };
    }

    // Update the email to the correct case
    await ctx.db.patch(userToFix._id, {
      email: args.correctEmail,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Fixed email from "${userToFix.email}" to "${args.correctEmail}"`,
      userId: userToFix._id,
      oldEmail: userToFix.email,
      newEmail: args.correctEmail,
    };
  },
});

// Combined fix: diagnose and fix in one call
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

    const caseInsensitiveMatch = allUsers.find(u =>
      u.email.trim().toLowerCase() === normalizedAuthEmail
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
