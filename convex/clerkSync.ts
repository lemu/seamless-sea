/**
 * Clerk Sync Mutations
 *
 * Internal mutations called by the webhook handler to sync Clerk data to Convex.
 * These handle user creation/updates, organization sync, and membership management.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sync user from Clerk to Convex
 * - Creates new user if doesn't exist
 * - Links existing user by email (for migration)
 * - Updates user data if already synced
 */
export const syncUser = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.email) {
      console.error("Cannot sync user without email");
      return null;
    }

    // Check if user exists by Clerk ID
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (existingUser) {
      // Update existing synced user
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        email: args.email,
        emailVerified: true,
        migratedToClerk: true,
        updatedAt: Date.now(),
      });
      console.log(`Updated user ${args.email} with Clerk ID ${args.clerkUserId}`);
      return existingUser._id;
    }

    // Check if user exists by email (migration case - link old user to Clerk)
    const userByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (userByEmail) {
      // Link existing user to Clerk ID
      await ctx.db.patch(userByEmail._id, {
        clerkUserId: args.clerkUserId,
        name: args.name,
        emailVerified: true,
        migratedToClerk: true,
        updatedAt: Date.now(),
      });
      console.log(`Linked existing user ${args.email} to Clerk ID ${args.clerkUserId}`);
      return userByEmail._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      name: args.name,
      email: args.email,
      emailVerified: true,
      migratedToClerk: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log(`Created new user ${args.email} with Clerk ID ${args.clerkUserId}`);
    return userId;
  },
});

/**
 * Sync organization from Clerk to Convex
 * - Creates new organization if doesn't exist
 * - Updates organization data if already synced
 */
export const syncOrganization = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if organization exists by Clerk ID
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (existing) {
      // Update existing organization
      await ctx.db.patch(existing._id, {
        name: args.name,
      });
      console.log(`Updated organization ${args.name} with Clerk ID ${args.clerkOrgId}`);
      return existing._id;
    }

    // Create new organization
    const orgId = await ctx.db.insert("organizations", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      plan: "Pro", // Default plan for free tier
      createdAt: Date.now(),
    });

    console.log(`Created new organization ${args.name} with Clerk ID ${args.clerkOrgId}`);
    return orgId;
  },
});

/**
 * Sync membership from Clerk to Convex
 * - Maps Clerk roles to internal roles
 * - Creates or updates membership
 */
export const syncMembership = internalMutation({
  args: {
    clerkMembershipId: v.string(),
    clerkUserId: v.string(),
    clerkOrgId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      console.error(`User not found for Clerk ID: ${args.clerkUserId}`);
      return null;
    }

    // Find organization by Clerk ID
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) {
      console.error(`Organization not found for Clerk ID: ${args.clerkOrgId}`);
      return null;
    }

    // Map Clerk roles to internal roles
    // Free tier only has: org:admin, org:member
    const roleMap: Record<string, string> = {
      "org:admin": "Admin",
      "org:member": "Trader", // Default role for members
      "admin": "Admin",
      "member": "Trader",
    };
    const mappedRole = roleMap[args.role] || "Trader";

    // Check if membership exists by Clerk ID
    const existingByClerk = await ctx.db
      .query("memberships")
      .withIndex("by_clerkMembershipId", (q) =>
        q.eq("clerkMembershipId", args.clerkMembershipId)
      )
      .first();

    if (existingByClerk) {
      // Update existing membership
      await ctx.db.patch(existingByClerk._id, {
        role: mappedRole,
      });
      console.log(`Updated membership for user ${user.email} in org ${org.name}`);
      return existingByClerk._id;
    }

    // Check if membership exists by user+org (for migration)
    const existingByUserOrg = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("organizationId"), org._id)
        )
      )
      .first();

    if (existingByUserOrg) {
      // Link existing membership to Clerk
      await ctx.db.patch(existingByUserOrg._id, {
        clerkMembershipId: args.clerkMembershipId,
        role: mappedRole,
      });
      console.log(`Linked existing membership for user ${user.email} in org ${org.name}`);
      return existingByUserOrg._id;
    }

    // Create new membership
    const membershipId = await ctx.db.insert("memberships", {
      clerkMembershipId: args.clerkMembershipId,
      userId: user._id,
      organizationId: org._id,
      role: mappedRole,
      createdAt: Date.now(),
    });

    console.log(`Created new membership for user ${user.email} in org ${org.name}`);
    return membershipId;
  },
});

/**
 * Remove membership when deleted in Clerk
 */
export const removeMembership = internalMutation({
  args: { clerkMembershipId: v.string() },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_clerkMembershipId", (q) =>
        q.eq("clerkMembershipId", args.clerkMembershipId)
      )
      .first();

    if (membership) {
      await ctx.db.delete(membership._id);
      console.log(`Removed membership with Clerk ID ${args.clerkMembershipId}`);
    }
  },
});

/**
 * Soft delete user when deleted in Clerk
 * Keep business data (orders, contracts) but anonymize user
 */
export const markUserDeleted = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (user) {
      // Soft delete - anonymize but keep records for data integrity
      await ctx.db.patch(user._id, {
        name: "Deleted User",
        email: `deleted_${user._id}@deleted.local`,
        emailVerified: false,
        clerkUserId: undefined,
        migratedToClerk: false,
        updatedAt: Date.now(),
      });
      console.log(`Anonymized deleted user with Clerk ID ${args.clerkUserId}`);
    }
  },
});
