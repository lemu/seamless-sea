import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

// Query to find user by Clerk ID (for Clerk integration)
export const getByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
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
    
    const userId = await ctx.db.insert("users", {
      name: "Rafał Lemieszewski",
      email: email,
      createdAt: Date.now(),
    });
    
    const newUser = await ctx.db.get(userId);
    console.log("Created test user:", newUser);
    return newUser;
  },
});