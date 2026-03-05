import { query } from "./_generated/server";
import { v } from "convex/values";

// Static placeholder news items used when the news table is empty
const PLACEHOLDER_NEWS = [
  {
    _id: "placeholder-1" as any,
    title: "Baltic Dry Index Rises 4.2% on Strong Chinese Iron Ore Demand",
    summary: "The BDI climbed to its highest level in three months as Chinese steel mills boosted iron ore procurement ahead of the winter construction season.",
    category: "Market",
    priority: "breaking" as const,
    publishedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    url: undefined,
    _creationTime: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    _id: "placeholder-2" as any,
    title: "IMO Adopts Revised Carbon Intensity Indicator Regulations for 2026",
    summary: "The International Maritime Organization has finalised amendments to CII regulations, tightening the annual reduction factor from 5% to 7% starting next year.",
    category: "Regulatory",
    priority: "normal" as const,
    publishedAt: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
    url: undefined,
    _creationTime: Date.now() - 5 * 60 * 60 * 1000,
  },
  {
    _id: "placeholder-3" as any,
    title: "Panama Canal Drought Restrictions Eased; Daily Transits Increase to 36",
    summary: "Water levels at Gatun Lake have recovered sufficiently for the Panama Canal Authority to lift draft restrictions and restore vessel transit slots.",
    category: "Port",
    priority: "normal" as const,
    publishedAt: Date.now() - 9 * 60 * 60 * 1000, // 9 hours ago
    url: undefined,
    _creationTime: Date.now() - 9 * 60 * 60 * 1000,
  },
];

/**
 * Returns the 3 latest/breaking news items.
 * Falls back to static placeholder items if the news table is empty.
 */
export const getLatestNews = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 3;

    // Fetch breaking items first, then normal, ordered by publishedAt desc
    const breaking = await ctx.db
      .query("news")
      .withIndex("by_priority", (q) => q.eq("priority", "breaking"))
      .order("desc")
      .take(limit);

    if (breaking.length >= limit) {
      return breaking.slice(0, limit);
    }

    const needed = limit - breaking.length;
    const normal = await ctx.db
      .query("news")
      .withIndex("by_priority", (q) => q.eq("priority", "normal"))
      .order("desc")
      .take(needed);

    const combined = [...breaking, ...normal];

    // If no records exist, fall back to static placeholders
    if (combined.length === 0) {
      return PLACEHOLDER_NEWS.slice(0, limit);
    }

    return combined.slice(0, limit);
  },
});

/**
 * Returns top-3 preview items for each attention category plus total counts.
 * Used to populate the Needs Your Attention section on the Home page.
 */
export const getAttentionItems = query({
  args: {},
  handler: async (ctx) => {
    // --- Pending Approvals ---
    const allPendingApprovals = await ctx.db
      .query("contract_approvals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    const pendingApprovalsPreview = await Promise.all(
      allPendingApprovals.slice(0, 3).map(async (approval) => {
        const contract = await ctx.db.get(approval.contractId);
        const company = await ctx.db.get(approval.companyId);
        return {
          id: approval._id,
          itemRef: contract?.contractNumber ?? "—",
          label: company?.displayName ?? company?.name ?? approval.partyRole,
          status: "pending" as const,
          updatedAt: approval.updatedAt,
        };
      })
    );

    // --- On-Subs Recap Managers ---
    const allOnSubs = await ctx.db
      .query("recap_managers")
      .withIndex("by_status", (q) => q.eq("status", "on-subs"))
      .order("desc")
      .collect();

    const onSubsPreview = await Promise.all(
      allOnSubs.slice(0, 3).map(async (recap) => {
        const owner = await ctx.db.get(recap.ownerId);
        const charterer = await ctx.db.get(recap.chartererId);
        return {
          id: recap._id,
          itemRef: recap.recapNumber,
          label: `${owner?.displayName ?? owner?.name ?? "—"} / ${charterer?.displayName ?? charterer?.name ?? "—"}`,
          status: "on-subs" as const,
          updatedAt: recap.updatedAt,
        };
      })
    );

    // --- Draft Items (contracts + recap_managers combined) ---
    const draftContracts = await ctx.db
      .query("contracts")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .order("desc")
      .collect();

    const draftRecaps = await ctx.db
      .query("recap_managers")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .order("desc")
      .collect();

    const allDrafts = [
      ...draftContracts.map((c) => ({
        id: c._id,
        itemRef: c.contractNumber,
        status: "draft" as const,
        updatedAt: c.updatedAt,
        kind: "contract" as const,
        ownerId: c.ownerId,
        chartererId: c.chartererId,
      })),
      ...draftRecaps.map((r) => ({
        id: r._id,
        itemRef: r.recapNumber,
        status: "draft" as const,
        updatedAt: r.updatedAt,
        kind: "recap" as const,
        ownerId: r.ownerId,
        chartererId: r.chartererId,
      })),
    ].sort((a, b) => b.updatedAt - a.updatedAt);

    const draftsPreview = await Promise.all(
      allDrafts.slice(0, 3).map(async (item) => {
        const owner = await ctx.db.get(item.ownerId);
        const charterer = await ctx.db.get(item.chartererId);
        return {
          id: item.id,
          itemRef: item.itemRef,
          label: `${owner?.displayName ?? owner?.name ?? "—"} / ${charterer?.displayName ?? charterer?.name ?? "—"}`,
          status: "draft" as const,
          updatedAt: item.updatedAt,
        };
      })
    );

    // --- Active Negotiations ---
    const activeStatuses = [
      "indicative-offer",
      "indicative-bid",
      "firm-offer",
      "firm-bid",
      "firm",
      "on-subs",
      "firm-amendment",
      "on-subs-amendment",
    ] as const;

    // Collect active negotiations across all active statuses
    const activeNegotiationsArrays = await Promise.all(
      activeStatuses.map((status) =>
        ctx.db
          .query("negotiations")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .collect()
      )
    );
    const allActiveNegotiations = activeNegotiationsArrays
      .flat()
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const activeNegotiationsPreview = await Promise.all(
      allActiveNegotiations.slice(0, 3).map(async (neg) => {
        const counterparty = await ctx.db.get(neg.counterpartyId);
        const order = await ctx.db.get(neg.orderId);
        return {
          id: neg._id,
          itemRef: neg.negotiationNumber ?? order?.orderNumber ?? "—",
          label: counterparty?.displayName ?? counterparty?.name ?? "—",
          status: neg.status,
          updatedAt: neg.updatedAt,
        };
      })
    );

    return {
      pendingApprovals: {
        count: allPendingApprovals.length,
        items: pendingApprovalsPreview,
      },
      onSubs: {
        count: allOnSubs.length,
        items: onSubsPreview,
      },
      drafts: {
        count: allDrafts.length,
        items: draftsPreview,
      },
      activeNegotiations: {
        count: allActiveNegotiations.length,
        items: activeNegotiationsPreview,
      },
    };
  },
});

/**
 * Returns the most recent activity log entry with action "fixed" or "on-subs".
 * Used to trigger the Deal Celebration banner reactively.
 */
export const getLatestDealActivity = query({
  args: {},
  handler: async (ctx) => {
    const fixedActivity = await ctx.db
      .query("activity_logs")
      .order("desc")
      .filter((q) =>
        q.or(
          q.eq(q.field("action"), "fixed"),
          q.eq(q.field("action"), "on-subs")
        )
      )
      .first();

    return fixedActivity ?? null;
  },
});
