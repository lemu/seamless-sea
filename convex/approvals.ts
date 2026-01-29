import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ========================================
// CONTRACT APPROVALS
// ========================================

/**
 * Create a new approval record for a contract
 */
export const createContractApproval = mutation({
  args: {
    contractId: v.id("contracts"),
    partyRole: v.string(), // "owner", "charterer", "broker", etc.
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const approvalId = await ctx.db.insert("contract_approvals", {
      contractId: args.contractId,
      partyRole: args.partyRole,
      companyId: args.companyId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(approvalId);
  },
});

/**
 * Approve a contract
 */
export const approveContract = mutation({
  args: {
    approvalId: v.id("contract_approvals"),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.approvalId, {
      status: "approved",
      approvedBy: args.userId,
      approvedAt: now,
      notes: args.notes,
      updatedAt: now,
    });

    return await ctx.db.get(args.approvalId);
  },
});

/**
 * Reject a contract approval
 */
export const rejectContractApproval = mutation({
  args: {
    approvalId: v.id("contract_approvals"),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.approvalId, {
      status: "rejected",
      approvedBy: args.userId,
      approvedAt: now,
      notes: args.notes,
      updatedAt: now,
    });

    return await ctx.db.get(args.approvalId);
  },
});

/**
 * Get all approvals for a contract
 */
export const getContractApprovals = query({
  args: {
    contractId: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    const approvals = await ctx.db
      .query("contract_approvals")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .collect();

    // Enrich with company and user data
    const enrichedApprovals = await Promise.all(
      approvals.map(async (approval) => {
        const company = await ctx.db.get(approval.companyId);
        let user = null;
        let avatarUrl = null;

        if (approval.approvedBy) {
          user = await ctx.db.get(approval.approvedBy);
          if (user?.avatar) {
            avatarUrl = await ctx.storage.getUrl(user.avatar);
          }
        }

        let companyAvatarUrl = null;
        if (company?.avatar) {
          companyAvatarUrl = await ctx.storage.getUrl(company.avatar);
        }

        return {
          ...approval,
          company,
          companyAvatarUrl,
          user,
          userAvatarUrl: avatarUrl,
        };
      })
    );

    return enrichedApprovals;
  },
});

// ========================================
// ADDENDA APPROVALS
// ========================================

/**
 * Create a new approval record for addenda
 */
export const createAddendaApproval = mutation({
  args: {
    addendaId: v.string(),
    addendaType: v.union(v.literal("contract"), v.literal("recap")),
    partyRole: v.string(),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const approvalId = await ctx.db.insert("addenda_approvals", {
      addendaId: args.addendaId,
      addendaType: args.addendaType,
      partyRole: args.partyRole,
      companyId: args.companyId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(approvalId);
  },
});

/**
 * Approve addenda
 */
export const approveAddenda = mutation({
  args: {
    approvalId: v.id("addenda_approvals"),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.approvalId, {
      status: "approved",
      approvedBy: args.userId,
      approvedAt: now,
      notes: args.notes,
      updatedAt: now,
    });

    return await ctx.db.get(args.approvalId);
  },
});

/**
 * Reject addenda approval
 */
export const rejectAddendaApproval = mutation({
  args: {
    approvalId: v.id("addenda_approvals"),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.approvalId, {
      status: "rejected",
      approvedBy: args.userId,
      approvedAt: now,
      notes: args.notes,
      updatedAt: now,
    });

    return await ctx.db.get(args.approvalId);
  },
});

/**
 * Get all approvals for addenda
 */
export const getAddendaApprovals = query({
  args: {
    addendaId: v.string(),
  },
  handler: async (ctx, args) => {
    const approvals = await ctx.db
      .query("addenda_approvals")
      .withIndex("by_addenda", (q) => q.eq("addendaId", args.addendaId))
      .collect();

    // Enrich with company and user data
    const enrichedApprovals = await Promise.all(
      approvals.map(async (approval) => {
        const company = await ctx.db.get(approval.companyId);
        let user = null;
        let avatarUrl = null;

        if (approval.approvedBy) {
          user = await ctx.db.get(approval.approvedBy);
          if (user?.avatar) {
            avatarUrl = await ctx.storage.getUrl(user.avatar);
          }
        }

        let companyAvatarUrl = null;
        if (company?.avatar) {
          companyAvatarUrl = await ctx.storage.getUrl(company.avatar);
        }

        return {
          ...approval,
          company,
          companyAvatarUrl,
          user,
          userAvatarUrl: avatarUrl,
        };
      })
    );

    return enrichedApprovals;
  },
});

/**
 * Compute approval summary for a contract
 * Returns: { total: number, approved: number, pending: number, rejected: number }
 */
export const getContractApprovalSummary = query({
  args: {
    contractId: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    const approvals = await ctx.db
      .query("contract_approvals")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .collect();

    const summary = {
      total: approvals.length,
      approved: approvals.filter((a) => a.status === "approved").length,
      pending: approvals.filter((a) => a.status === "pending").length,
      rejected: approvals.filter((a) => a.status === "rejected").length,
    };

    return summary;
  },
});

/**
 * Compute approval summary for addenda
 */
export const getAddendaApprovalSummary = query({
  args: {
    addendaId: v.string(),
  },
  handler: async (ctx, args) => {
    const approvals = await ctx.db
      .query("addenda_approvals")
      .withIndex("by_addenda", (q) => q.eq("addendaId", args.addendaId))
      .collect();

    const summary = {
      total: approvals.length,
      approved: approvals.filter((a) => a.status === "approved").length,
      pending: approvals.filter((a) => a.status === "pending").length,
      rejected: approvals.filter((a) => a.status === "rejected").length,
    };

    return summary;
  },
});
