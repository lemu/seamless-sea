import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Mutation to create organizations and memberships
export const setupOrganizationsForUser = mutation({
  args: { userEmail: v.string() },
  handler: async (ctx, args) => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.userEmail))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Create or get Acme organization
    let acmeOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), "Acme"))
      .first();

    if (!acmeOrg) {
      const acmeOrgId = await ctx.db.insert("organizations", {
        name: "Acme",
        plan: "Enterprise",
        createdAt: Date.now(),
      });
      acmeOrg = await ctx.db.get(acmeOrgId);
    }

    // Create or get Sea organization
    let seaOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), "Sea"))
      .first();

    if (!seaOrg) {
      const seaOrgId = await ctx.db.insert("organizations", {
        name: "Sea",
        plan: "Pro",
        createdAt: Date.now(),
      });
      seaOrg = await ctx.db.get(seaOrgId);
    }

    // Create memberships if they don't exist
    const existingAcmeMembership = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("organizationId"), acmeOrg!._id)
        )
      )
      .first();

    if (!existingAcmeMembership) {
      await ctx.db.insert("memberships", {
        userId: user._id,
        organizationId: acmeOrg!._id,
        role: "Trader",
        createdAt: Date.now(),
      });
    }

    const existingSeaMembership = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("organizationId"), seaOrg!._id)
        )
      )
      .first();

    if (!existingSeaMembership) {
      await ctx.db.insert("memberships", {
        userId: user._id,
        organizationId: seaOrg!._id,
        role: "Broker",
        createdAt: Date.now(),
      });
    }

    return {
      message: "Organizations and memberships created successfully",
      organizations: [acmeOrg, seaOrg],
    };
  },
});

// Query to get user's organizations
export const getUserOrganizations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all memberships for this user
    const memberships = await ctx.db
      .query("memberships")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Get organization details for each membership
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        
        // Generate avatar URL if exists
        let avatarUrl = null;
        if (org?.avatar) {
          avatarUrl = await ctx.storage.getUrl(org.avatar);
        }

        return {
          ...org,
          avatarUrl,
          role: membership.role,
          membershipId: membership._id,
        };
      })
    );

    return organizations.filter(org => org !== null);
  },
});