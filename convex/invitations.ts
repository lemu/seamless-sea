import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Token expiry: 7 days in milliseconds
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

// Create an invitation record (internal, used by action)
export const createInvitation = mutation({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
    role: v.string(),
    invitedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if there's already a pending invitation for this email and org
    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Check if user is already a member
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      const existingMembership = await ctx.db
        .query("memberships")
        .filter((q) =>
          q.and(
            q.eq(q.field("userId"), existingUser._id),
            q.eq(q.field("organizationId"), args.organizationId)
          )
        )
        .first();

      if (existingMembership) {
        throw new Error("This user is already a member of the organization");
      }
    }

    const token = generateToken();
    const now = Date.now();

    const invitationId = await ctx.db.insert("invitations", {
      email: args.email,
      organizationId: args.organizationId,
      role: args.role,
      token,
      invitedBy: args.invitedBy,
      status: "pending",
      expiresAt: now + INVITATION_EXPIRY_MS,
      createdAt: now,
    });

    return { invitationId, token };
  },
});

// Create invitation without sending email (for manual link generation)
export const createInvitationManual = mutation({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
    role: v.string(),
    invitedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user is admin of the organization
    const membership = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.invitedBy),
          q.eq(q.field("organizationId"), args.organizationId)
        )
      )
      .first();

    if (!membership || membership.role.toLowerCase() !== "admin") {
      throw new Error("Only admins can create invitations");
    }

    // Use the existing createInvitation logic
    // Check if there's already a pending invitation for this email and org
    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Check if user is already a member
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      const existingMembership = await ctx.db
        .query("memberships")
        .filter((q) =>
          q.and(
            q.eq(q.field("userId"), existingUser._id),
            q.eq(q.field("organizationId"), args.organizationId)
          )
        )
        .first();

      if (existingMembership) {
        throw new Error("This user is already a member of the organization");
      }
    }

    // Generate token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const now = Date.now();

    await ctx.db.insert("invitations", {
      email: args.email,
      organizationId: args.organizationId,
      role: args.role,
      token,
      invitedBy: args.invitedBy,
      status: "pending",
      expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: now,
    });

    return { token };
  },
});

// Send invitation (action that creates invitation and sends email)
export const sendInvitation = action({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
    role: v.string(),
    invitedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get organization and inviter details directly from database
    // @ts-ignore - Type inference issue with ctx.runQuery
    const organization = await ctx.runQuery(api.organizations.getOrganizationById, {
      organizationId: args.organizationId,
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    // @ts-ignore - Type inference issue with ctx.runQuery
    const inviter = await ctx.runQuery(api.users.getUserById, {
      userId: args.invitedBy,
    });

    if (!inviter) {
      throw new Error("Inviter not found");
    }

    // Create the invitation record
    const { token } = await ctx.runMutation(api.invitations.createInvitation, {
      email: args.email,
      organizationId: args.organizationId,
      role: args.role,
      invitedBy: args.invitedBy,
    });

    // Send the invitation email
    await ctx.runAction(api.email.sendInvitationEmail, {
      toEmail: args.email,
      inviterName: inviter.name,
      organizationName: organization.name,
      role: args.role,
      inviteToken: token,
    });

    return { success: true };
  },
});

// Get invitation by token
export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return null;
    }

    // Get organization details
    const organization = await ctx.db.get(invitation.organizationId);

    return {
      ...invitation,
      organizationName: organization?.name,
    };
  },
});

// Accept invitation
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error(`This invitation has already been ${invitation.status}`);
    }

    if (Date.now() > invitation.expiresAt) {
      // Mark as expired
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("This invitation has expired");
    }

    // Validate that the user's email matches the invitation email
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error(
        `This invitation is for ${invitation.email}, but you are signed in as ${user.email}. Please sign in with the correct account or contact your administrator.`
      );
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), invitation.organizationId)
        )
      )
      .first();

    if (existingMembership) {
      // Mark invitation as accepted since user is already a member
      await ctx.db.patch(invitation._id, {
        status: "accepted",
        acceptedAt: Date.now(),
      });
      return { alreadyMember: true };
    }

    // Create membership
    await ctx.db.insert("memberships", {
      userId: args.userId,
      organizationId: invitation.organizationId,
      role: invitation.role,
      createdAt: Date.now(),
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    return { success: true };
  },
});

// Accept invitation by email (for Better Auth users who may not have a users table entry)
export const acceptInvitationByEmail = mutation({
  args: {
    token: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error(`This invitation has already been ${invitation.status}`);
    }

    if (Date.now() > invitation.expiresAt) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("This invitation has expired");
    }

    // Validate that the provided email matches the invitation email
    if (args.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error(
        `This invitation is for ${invitation.email}, but you are signed in as ${args.email}. Please sign in with the correct account or contact your administrator.`
      );
    }

    // Look up or create user in our users table
    let dbUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!dbUser) {
      // Create user in our users table
      const now = Date.now();
      const userId = await ctx.db.insert("users", {
        name: args.name,
        email: args.email,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      });
      dbUser = await ctx.db.get(userId);
    }

    if (!dbUser) {
      throw new Error("Failed to create user record");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), dbUser._id),
          q.eq(q.field("organizationId"), invitation.organizationId)
        )
      )
      .first();

    if (existingMembership) {
      await ctx.db.patch(invitation._id, {
        status: "accepted",
        acceptedAt: Date.now(),
      });
      return { alreadyMember: true, userId: dbUser._id };
    }

    // Create membership
    await ctx.db.insert("memberships", {
      userId: dbUser._id,
      organizationId: invitation.organizationId,
      role: invitation.role,
      createdAt: Date.now(),
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    return { success: true, userId: dbUser._id };
  },
});

// Get organization invitations (admin only)
export const getOrganizationInvitations = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user is admin of the organization
    const membership = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), args.organizationId)
        )
      )
      .first();

    if (!membership || membership.role.toLowerCase() !== "admin") {
      throw new Error("Only admins can view organization invitations");
    }

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    // Get inviter details for each invitation
    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const inviter = await ctx.db.get(invitation.invitedBy);
        return {
          ...invitation,
          inviterName: inviter?.name,
          inviterEmail: inviter?.email,
        };
      })
    );

    return invitationsWithDetails;
  },
});

// Get invitations by email (for debugging/scripts)
export const getInvitationsByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    // Get inviter and organization details
    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const inviter = await ctx.db.get(invitation.invitedBy);
        const organization = await ctx.db.get(invitation.organizationId);
        return {
          ...invitation,
          inviterName: inviter?.name,
          inviterEmail: inviter?.email,
          organizationName: organization?.name || "Unknown Organization",
        };
      })
    );

    return invitationsWithDetails;
  },
});

// Delete invitation (admin only, for revoked/expired/accepted invitations)
export const deleteInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check if user is admin of the organization
    const membership = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), invitation.organizationId)
        )
      )
      .first();

    if (!membership || membership.role.toLowerCase() !== "admin") {
      throw new Error("Only admins can delete invitations");
    }

    // Only allow deleting non-pending invitations
    if (invitation.status === "pending") {
      throw new Error("Cannot delete a pending invitation. Revoke it first.");
    }

    await ctx.db.delete(args.invitationId);

    return { success: true };
  },
});

// Revoke invitation (admin only)
export const revokeInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check if user is admin of the organization
    const membership = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), invitation.organizationId)
        )
      )
      .first();

    if (!membership || membership.role.toLowerCase() !== "admin") {
      throw new Error("Only admins can revoke invitations");
    }

    if (invitation.status !== "pending") {
      throw new Error(`Cannot revoke an invitation that has been ${invitation.status}`);
    }

    await ctx.db.patch(args.invitationId, {
      status: "revoked",
    });

    return { success: true };
  },
});

// Force delete invitation (for admin scripts/cleanup - bypasses all checks)
export const forceDeleteInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    await ctx.db.delete(args.invitationId);
    return { success: true };
  },
});
