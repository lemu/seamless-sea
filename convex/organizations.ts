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
        return org ? { ...org, role: membership.role } : null;
      })
    );

    return organizations.filter((org): org is NonNullable<typeof org> => org !== null);
  },
});

// Get first organization (for development/testing)
export const getFirstOrganization = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("organizations").first();
  },
});
