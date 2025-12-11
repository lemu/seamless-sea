/**
 * Manual migration to link existing Clerk user to Convex
 * Run with: npx convex run migrations/linkClerkUser:linkUser
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const linkUser = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists with this Clerk ID
    const existingByClerk = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (existingByClerk) {
      console.log("User already linked:", existingByClerk._id);
      return { success: true, userId: existingByClerk._id, action: "already_exists" };
    }

    // Check if user exists with this email (for migration)
    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingByEmail) {
      // Update existing user with Clerk ID
      await ctx.db.patch(existingByEmail._id, {
        clerkUserId: args.clerkUserId,
        migratedToClerk: true,
        updatedAt: Date.now(),
      });
      console.log("Linked existing user:", existingByEmail._id);
      return { success: true, userId: existingByEmail._id, action: "linked_existing" };
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      clerkUserId: args.clerkUserId,
      migratedToClerk: true,
      emailVerified: true,
      createdAt: Date.now(),
    });

    console.log("Created new user:", userId);
    return { success: true, userId, action: "created_new" };
  },
});
