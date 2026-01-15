import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get organization members with user details
export const getOrganizationMembers = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("memberships")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    const membersWithDetails = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        if (!user) return null;

        // Generate avatar URL if avatar exists
        let avatarUrl = null;
        if (user.avatar) {
          avatarUrl = await ctx.storage.getUrl(user.avatar);
        }

        return {
          membershipId: membership._id,
          userId: user._id,
          name: user.name,
          email: user.email,
          avatarUrl,
          role: membership.role,
          joinedAt: membership.createdAt,
        };
      })
    );

    return membersWithDetails.filter(
      (member): member is NonNullable<typeof member> => member !== null
    );
  },
});

// Get user's membership in an organization
export const getMembership = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), args.organizationId)
        )
      )
      .first();
  },
});

// Get all memberships for a user
export const getUserMemberships = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("memberships")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const membershipsWithOrgs = await Promise.all(
      memberships.map(async (membership) => {
        const organization = await ctx.db.get(membership.organizationId);
        return {
          ...membership,
          organizationName: organization?.name || "Unknown Organization",
        };
      })
    );

    return membershipsWithOrgs;
  },
});

// Remove member from organization (admin only)
export const removeMember = mutation({
  args: {
    membershipId: v.id("memberships"),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const membershipToRemove = await ctx.db.get(args.membershipId);
    if (!membershipToRemove) {
      throw new Error("Membership not found");
    }

    // Check if requesting user is admin of the organization
    const requestingMembership = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.requestingUserId),
          q.eq(q.field("organizationId"), membershipToRemove.organizationId)
        )
      )
      .first();

    if (!requestingMembership || requestingMembership.role.toLowerCase() !== "admin") {
      throw new Error("Only admins can remove members");
    }

    // Prevent self-removal if they're the only admin
    if (membershipToRemove.userId === args.requestingUserId) {
      const adminCount = await ctx.db
        .query("memberships")
        .filter((q) =>
          q.and(
            q.eq(q.field("organizationId"), membershipToRemove.organizationId),
            q.or(
              q.eq(q.field("role"), "Admin"),
              q.eq(q.field("role"), "admin")
            )
          )
        )
        .collect();

      if (adminCount.length === 1) {
        throw new Error(
          "Cannot remove yourself as the only admin. Transfer admin role first."
        );
      }
    }

    await ctx.db.delete(args.membershipId);
    return { success: true };
  },
});

// Update member role (admin only)
export const updateMemberRole = mutation({
  args: {
    membershipId: v.id("memberships"),
    requestingUserId: v.id("users"),
    newRole: v.string(),
  },
  handler: async (ctx, args) => {
    const membershipToUpdate = await ctx.db.get(args.membershipId);
    if (!membershipToUpdate) {
      throw new Error("Membership not found");
    }

    // Check if requesting user is admin of the organization
    const requestingMembership = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.requestingUserId),
          q.eq(q.field("organizationId"), membershipToUpdate.organizationId)
        )
      )
      .first();

    if (!requestingMembership || requestingMembership.role.toLowerCase() !== "admin") {
      throw new Error("Only admins can update member roles");
    }

    // Prevent downgrading the only admin
    if (
      membershipToUpdate.role.toLowerCase() === "admin" &&
      args.newRole.toLowerCase() !== "admin"
    ) {
      const adminCount = await ctx.db
        .query("memberships")
        .filter((q) =>
          q.and(
            q.eq(q.field("organizationId"), membershipToUpdate.organizationId),
            q.or(
              q.eq(q.field("role"), "Admin"),
              q.eq(q.field("role"), "admin")
            )
          )
        )
        .collect();

      if (adminCount.length === 1) {
        throw new Error(
          "Cannot downgrade the only admin. Promote another member first."
        );
      }
    }

    await ctx.db.patch(args.membershipId, { role: args.newRole });
    return { success: true };
  },
});

// Add member to organization (for dev/migration purposes)
export const addMember = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if membership already exists
    const existing = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), args.organizationId)
        )
      )
      .first();

    if (existing) {
      throw new Error("Membership already exists");
    }

    const membershipId = await ctx.db.insert("memberships", {
      userId: args.userId,
      organizationId: args.organizationId,
      role: args.role,
      createdAt: Date.now(),
    });

    return { membershipId };
  },
});

// Force update member role (for admin scripts/migrations - bypasses permission checks)
export const forceUpdateMemberRole = mutation({
  args: {
    membershipId: v.id("memberships"),
    newRole: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    await ctx.db.patch(args.membershipId, { role: args.newRole });
    return { success: true };
  },
});

// Force delete membership (for admin scripts/cleanup - bypasses all checks)
export const forceDeleteMembership = mutation({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    await ctx.db.delete(args.membershipId);
    return { success: true };
  },
});
