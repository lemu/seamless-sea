import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Internal function to track field changes
export async function trackFieldChange(
  ctx: MutationCtx,
  entityType: "order" | "negotiation" | "contract" | "recap_manager" | "contract_addenda" | "recap_addenda",
  entityId: Id<any>,
  fieldName: string,
  oldValue: any,
  newValue: any,
  userId: Id<"users">,
  changeReason?: string
) {
  // Convert values to strings for storage
  const oldValueStr = oldValue !== undefined && oldValue !== null ? String(oldValue) : undefined;
  const newValueStr = newValue !== undefined && newValue !== null ? String(newValue) : undefined;

  await ctx.db.insert("field_changes", {
    entityType,
    entityId: entityId.toString(),
    fieldName,
    oldValue: oldValueStr,
    newValue: newValueStr,
    changeReason,
    userId,
    timestamp: Date.now(),
  });
}

// Internal function to log activity
export async function logActivity(
  ctx: MutationCtx,
  entityType: "order" | "negotiation" | "contract" | "recap_manager",
  entityId: Id<any>,
  action: string,
  description: string,
  status?: { value: string; label: string },
  metadata?: any,
  userId?: Id<"users">,
  timestamp?: number
) {
  // Automatically generate expandable data for negotiation events
  let expandable: { data?: Array<{ label: string; value: string }> } | undefined;

  if (entityType === "negotiation") {
    try {
      const negotiation = await ctx.db.get(entityId);
      if (negotiation) {
        // Find the contract for this negotiation to get full details
        const contract = await ctx.db
          .query("contracts")
          .withIndex("by_negotiation", (q) => q.eq("negotiationId", entityId))
          .first();

        if (contract) {
          // Generate expandable parameter snapshot
          expandable = {
            data: [
              { label: "Freight Rate", value: contract.freightRate || "Not specified" },
              {
                label: "Laycan",
                value: contract.laycanStart && contract.laycanEnd
                  ? `${new Date(contract.laycanStart).toLocaleDateString()} - ${new Date(contract.laycanEnd).toLocaleDateString()}`
                  : "Not specified"
              },
              { label: "Quantity", value: contract.quantity ? `${contract.quantity} ${contract.quantityUnit || "MT"}` : "Not specified" },
              { label: "Demurrage", value: contract.demurrageRate || "Not specified" },
            ]
          };
        }
      }
    } catch (error) {
      // If we can't fetch negotiation/contract data, just skip expandable (don't fail the whole log)
      console.warn(`Failed to generate expandable data for negotiation ${entityId}:`, error);
    }
  }

  await ctx.db.insert("activity_logs", {
    entityType,
    entityId: entityId.toString(),
    action,
    description,
    status,
    metadata,
    userId,
    timestamp: timestamp || Date.now(),
    expandable,
  });
}

// Get field changes for an entity
export const getFieldChanges = query({
  args: {
    entityType: v.union(
      v.literal("order"),
      v.literal("negotiation"),
      v.literal("contract"),
      v.literal("recap_manager"),
      v.literal("contract_addenda"),
      v.literal("recap_addenda")
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const changes = await ctx.db
      .query("field_changes")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .collect();

    // Enrich with user data
    const enriched = await Promise.all(
      changes.map(async (change) => {
        const user = await ctx.db.get(change.userId);
        return {
          ...change,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
              }
            : null,
        };
      })
    );

    return enriched.sort((a, b) => b.timestamp - a.timestamp);
  },
});

// Get activity log for an entity
export const getActivityLog = query({
  args: {
    entityType: v.union(
      v.literal("order"),
      v.literal("negotiation"),
      v.literal("contract"),
      v.literal("recap_manager")
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activity_logs")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .collect();

    // Enrich with user data
    const enriched = await Promise.all(
      activities.map(async (activity) => {
        if (!activity.userId) {
          return { ...activity, user: null };
        }

        const user = await ctx.db.get(activity.userId);
        return {
          ...activity,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
              }
            : null,
        };
      })
    );

    return enriched.sort((a, b) => b.timestamp - a.timestamp);
  },
});

// Get recent changes across all entities (for dashboard)
export const getRecentChanges = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const changes = await ctx.db
      .query("field_changes")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    // Enrich with user data
    const enriched = await Promise.all(
      changes.map(async (change) => {
        const user = await ctx.db.get(change.userId);
        return {
          ...change,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

// Get recent activity across all entities (for dashboard)
export const getRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const activities = await ctx.db
      .query("activity_logs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    // Enrich with user data
    const enriched = await Promise.all(
      activities.map(async (activity) => {
        if (!activity.userId) {
          return { ...activity, user: null };
        }

        const user = await ctx.db.get(activity.userId);
        return {
          ...activity,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

// Get changes by user (for user activity dashboard)
export const getChangesByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const changes = await ctx.db
      .query("field_changes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return changes;
  },
});

// Manual activity log entry (for admins)
export const createActivityLog = mutation({
  args: {
    entityType: v.union(
      v.literal("order"),
      v.literal("negotiation"),
      v.literal("contract"),
      v.literal("recap_manager")
    ),
    entityId: v.string(),
    action: v.string(),
    description: v.string(),
    status: v.optional(
      v.object({
        value: v.string(),
        label: v.string(),
      })
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await logActivity(
      ctx,
      args.entityType,
      args.entityId as any,
      args.action,
      args.description,
      args.status,
      args.metadata,
      user._id
    );
  },
});
