import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ========================================
// CONTRACT SIGNATURES
// ========================================

/**
 * Create a new signature record for a contract
 */
export const createContractSignature = mutation({
  args: {
    contractId: v.id("contracts"),
    partyRole: v.string(), // "owner", "charterer", "broker", etc.
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const signatureId = await ctx.db.insert("contract_signatures", {
      contractId: args.contractId,
      partyRole: args.partyRole,
      companyId: args.companyId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(signatureId);
  },
});

/**
 * Sign a contract
 */
export const signContract = mutation({
  args: {
    signatureId: v.id("contract_signatures"),
    userId: v.id("users"),
    signingMethod: v.optional(v.string()), // "DocuSign", "Manual", "Wet Ink", etc.
    documentStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.signatureId, {
      status: "signed",
      signedBy: args.userId,
      signedAt: now,
      signingMethod: args.signingMethod,
      documentStorageId: args.documentStorageId,
      updatedAt: now,
    });

    return await ctx.db.get(args.signatureId);
  },
});

/**
 * Reject a contract signature request
 */
export const rejectContractSignature = mutation({
  args: {
    signatureId: v.id("contract_signatures"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.signatureId, {
      status: "rejected",
      signedBy: args.userId,
      signedAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(args.signatureId);
  },
});

/**
 * Get all signatures for a contract
 */
export const getContractSignatures = query({
  args: {
    contractId: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    const signatures = await ctx.db
      .query("contract_signatures")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .collect();

    // Enrich with company and user data
    const enrichedSignatures = await Promise.all(
      signatures.map(async (signature) => {
        const company = await ctx.db.get(signature.companyId);
        let user = null;
        let userAvatarUrl = null;

        if (signature.signedBy) {
          user = await ctx.db.get(signature.signedBy);
          if (user?.avatar) {
            userAvatarUrl = await ctx.storage.getUrl(user.avatar);
          }
        }

        let companyAvatarUrl = null;
        if (company?.avatar) {
          companyAvatarUrl = await ctx.storage.getUrl(company.avatar);
        }

        let documentUrl = null;
        if (signature.documentStorageId) {
          documentUrl = await ctx.storage.getUrl(signature.documentStorageId);
        }

        return {
          ...signature,
          company,
          companyAvatarUrl,
          user,
          userAvatarUrl,
          documentUrl,
        };
      })
    );

    return enrichedSignatures;
  },
});

// ========================================
// ADDENDA SIGNATURES
// ========================================

/**
 * Create a new signature record for addenda
 */
export const createAddendaSignature = mutation({
  args: {
    addendaId: v.string(),
    addendaType: v.union(v.literal("contract"), v.literal("recap")),
    partyRole: v.string(),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const signatureId = await ctx.db.insert("addenda_signatures", {
      addendaId: args.addendaId,
      addendaType: args.addendaType,
      partyRole: args.partyRole,
      companyId: args.companyId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(signatureId);
  },
});

/**
 * Sign addenda
 */
export const signAddenda = mutation({
  args: {
    signatureId: v.id("addenda_signatures"),
    userId: v.id("users"),
    signingMethod: v.optional(v.string()),
    documentStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.signatureId, {
      status: "signed",
      signedBy: args.userId,
      signedAt: now,
      signingMethod: args.signingMethod,
      documentStorageId: args.documentStorageId,
      updatedAt: now,
    });

    return await ctx.db.get(args.signatureId);
  },
});

/**
 * Reject addenda signature request
 */
export const rejectAddendaSignature = mutation({
  args: {
    signatureId: v.id("addenda_signatures"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.signatureId, {
      status: "rejected",
      signedBy: args.userId,
      signedAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(args.signatureId);
  },
});

/**
 * Get all signatures for addenda
 */
export const getAddendaSignatures = query({
  args: {
    addendaId: v.string(),
  },
  handler: async (ctx, args) => {
    const signatures = await ctx.db
      .query("addenda_signatures")
      .withIndex("by_addenda", (q) => q.eq("addendaId", args.addendaId))
      .collect();

    // Enrich with company and user data
    const enrichedSignatures = await Promise.all(
      signatures.map(async (signature) => {
        const company = await ctx.db.get(signature.companyId);
        let user = null;
        let userAvatarUrl = null;

        if (signature.signedBy) {
          user = await ctx.db.get(signature.signedBy);
          if (user?.avatar) {
            userAvatarUrl = await ctx.storage.getUrl(user.avatar);
          }
        }

        let companyAvatarUrl = null;
        if (company?.avatar) {
          companyAvatarUrl = await ctx.storage.getUrl(company.avatar);
        }

        let documentUrl = null;
        if (signature.documentStorageId) {
          documentUrl = await ctx.storage.getUrl(signature.documentStorageId);
        }

        return {
          ...signature,
          company,
          companyAvatarUrl,
          user,
          userAvatarUrl,
          documentUrl,
        };
      })
    );

    return enrichedSignatures;
  },
});

/**
 * Compute signature summary for a contract
 * Returns: { total: number, signed: number, pending: number, rejected: number }
 */
export const getContractSignatureSummary = query({
  args: {
    contractId: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    const signatures = await ctx.db
      .query("contract_signatures")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .collect();

    const summary = {
      total: signatures.length,
      signed: signatures.filter((s) => s.status === "signed").length,
      pending: signatures.filter((s) => s.status === "pending").length,
      rejected: signatures.filter((s) => s.status === "rejected").length,
    };

    return summary;
  },
});

/**
 * Compute signature summary for addenda
 */
export const getAddendaSignatureSummary = query({
  args: {
    addendaId: v.string(),
  },
  handler: async (ctx, args) => {
    const signatures = await ctx.db
      .query("addenda_signatures")
      .withIndex("by_addenda", (q) => q.eq("addendaId", args.addendaId))
      .collect();

    const summary = {
      total: signatures.length,
      signed: signatures.filter((s) => s.status === "signed").length,
      pending: signatures.filter((s) => s.status === "pending").length,
      rejected: signatures.filter((s) => s.status === "rejected").length,
    };

    return summary;
  },
});
