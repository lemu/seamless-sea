import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get user's organizations via memberships
export const getUserOrganizations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("memberships")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org) return null;

        // Generate avatar URL from Convex storage
        let avatarUrl = null;
        if (org.avatar) {
          avatarUrl = await ctx.storage.getUrl(org.avatar);
        }

        return { ...org, role: membership.role, avatarUrl };
      })
    );

    return organizations.filter((org): org is NonNullable<typeof org> => org !== null);
  },
});

// Get organization by ID
export const getOrganizationById = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) return null;

    // Generate avatar URL from Convex storage
    let avatarUrl = null;
    if (org.avatar) {
      avatarUrl = await ctx.storage.getUrl(org.avatar);
    }

    return { ...org, avatarUrl };
  },
});

// Get first organization (for development/testing)
export const getFirstOrganization = query({
  args: {},
  handler: async (ctx) => {
    const org = await ctx.db.query("organizations").first();
    if (!org) return null;

    // Generate avatar URL from Convex storage
    let avatarUrl = null;
    if (org.avatar) {
      avatarUrl = await ctx.storage.getUrl(org.avatar);
    }

    return { ...org, avatarUrl };
  },
});

// Create organization and set user as Admin
export const createOrganizationWithAdmin = mutation({
  args: {
    name: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create the organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      plan: "Pro",
      createdAt: now,
    });

    // Create admin membership for the user
    await ctx.db.insert("memberships", {
      userId: args.userId,
      organizationId: orgId,
      role: "Admin",
      createdAt: now,
    });

    return { organizationId: orgId };
  },
});
