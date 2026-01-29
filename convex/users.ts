import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./authQueries";

// Query to get the currently authenticated user
// NOTE: This function is deprecated - use api.auth.getCurrentUser with session token instead
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Get the authenticated user's ID from Convex Auth
    const identity = await ctx.auth.getUserIdentity();

    console.log("getCurrentUser - identity:", identity);

    if (!identity) {
      console.log("getCurrentUser - no identity");
      return null;
    }

    // Extract user ID from subject
    // Subject format: "{userId}|{accountId}"
    const userId = identity.subject.split("|")[0];
    console.log("getCurrentUser - extracted userId from subject:", userId);

    // Get user directly by ID
    const user = await ctx.db.get(userId as Id<"users">);

    console.log("getCurrentUser - found user:", user?._id || "null");

    if (!user) {
      console.log("getCurrentUser - no user found for userId:", userId);
      return null;
    }

    // Generate avatar URL if avatar exists
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await ctx.storage.getUrl(user.avatar);
    }

    return {
      ...user,
      avatarUrl
    };
  },
});

// Query to get user by ID with avatar URL
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Generate avatar URL if avatar exists
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await ctx.storage.getUrl(user.avatar);
    }

    return { ...user, avatarUrl };
  },
});

// Query to find user by email with avatar URL
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    console.log("Looking for user with email:", args.email);
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    
    if (!user) {
      console.log("User not found");
      return null;
    }
    
    // Generate avatar URL if avatar exists
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await ctx.storage.getUrl(user.avatar);
    }
    
    const userWithUrl = {
      ...user,
      avatarUrl
    };
    
    console.log("Found user with avatar URL:", userWithUrl);
    return userWithUrl;
  },
});

// Query to list all users (for debugging)
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    console.log("All users in database:", users);
    return users;
  },
});

// Mutation to update user avatar
export const updateUserAvatar = mutation({
  args: { 
    userId: v.id("users"), 
    avatarId: v.id("_storage") 
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      avatar: args.avatarId,
    });
  },
});

// HTTP action to generate upload URL for avatars
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});


// Mutation to create test user if not exists
export const createTestUser = mutation({
  args: {},
  handler: async (ctx) => {
    const email = "rafal@lemieszewski.com";
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    if (existingUser) {
      console.log("Test user already exists:", existingUser);
      return existingUser;
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      name: "Rafał Lemieszewski",
      email: email,
      createdAt: now,
      updatedAt: now,
    });

    const newUser = await ctx.db.get(userId);
    console.log("Created test user:", newUser);
    return newUser;
  },
});

// Create user manually (for scripts/migrations)
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    emailVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      emailVerified: args.emailVerified || false,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

// Force delete user (for admin scripts/cleanup - bypasses all checks)
export const forceDeleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.delete(args.userId);
    return { success: true };
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