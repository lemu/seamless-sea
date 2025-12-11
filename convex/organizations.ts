import { query } from "./_generated/server";
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

        // Generate avatar URL with priority:
        // 1. Convex storage avatar (uploaded)
        // 2. Clerk-provided organization avatar URL
        let avatarUrl = null;
        if (org.avatar) {
          avatarUrl = await ctx.storage.getUrl(org.avatar);
        } else if (org.clerkImageUrl) {
          avatarUrl = org.clerkImageUrl;
        }

        return { ...org, role: membership.role, avatarUrl };
      })
    );

    return organizations.filter((org): org is NonNullable<typeof org> => org !== null);
  },
});

// Get first organization (for development/testing)
export const getFirstOrganization = query({
  args: {},
  handler: async (ctx) => {
    const org = await ctx.db.query("organizations").first();
    if (!org) return null;

    // Generate avatar URL with priority:
    // 1. Convex storage avatar (uploaded)
    // 2. Clerk-provided organization avatar URL
    let avatarUrl = null;
    if (org.avatar) {
      avatarUrl = await ctx.storage.getUrl(org.avatar);
    } else if (org.clerkImageUrl) {
      avatarUrl = org.clerkImageUrl;
    }

    return { ...org, avatarUrl };
  },
});
