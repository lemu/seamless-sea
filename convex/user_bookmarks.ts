import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserBookmarks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const bookmarks = await ctx.db
      .query("user_bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();

    return bookmarks.map((bookmark) => ({
      id: bookmark._id,
      name: bookmark.name,
      type: "user" as const,
      isDefault: bookmark.isDefault,
      createdAt: bookmark.createdAt,
      updatedAt: bookmark.updatedAt,
      count: bookmark.count,
      filtersState: bookmark.filtersState,
      tableState: bookmark.tableState,
    }));
  },
});

export const createBookmark = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    filtersState: v.optional(v.any()),
    tableState: v.optional(v.any()),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const bookmarkId = await ctx.db.insert("user_bookmarks", {
      userId: args.userId,
      name: args.name,
      isDefault: false,
      filtersState: args.filtersState,
      tableState: args.tableState,
      count: args.count,
      createdAt: now,
      updatedAt: now,
    });

    const bookmark = await ctx.db.get(bookmarkId);
    if (!bookmark) throw new Error("Failed to create bookmark");

    return {
      id: bookmark._id,
      name: bookmark.name,
      type: "user" as const,
      isDefault: bookmark.isDefault,
      createdAt: bookmark.createdAt,
      updatedAt: bookmark.updatedAt,
      count: bookmark.count,
      filtersState: bookmark.filtersState,
      tableState: bookmark.tableState,
    };
  },
});

export const updateBookmark = mutation({
  args: {
    bookmarkId: v.id("user_bookmarks"),
    name: v.optional(v.string()),
    filtersState: v.optional(v.any()),
    tableState: v.optional(v.any()),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { bookmarkId, ...updates } = args;
    const existing = await ctx.db.get(bookmarkId);
    if (!existing) throw new Error("Bookmark not found");

    const updateData: any = { updatedAt: Date.now() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.filtersState !== undefined) updateData.filtersState = updates.filtersState;
    if (updates.tableState !== undefined) updateData.tableState = updates.tableState;
    if (updates.count !== undefined) updateData.count = updates.count;

    await ctx.db.patch(bookmarkId, updateData);

    const updated = await ctx.db.get(bookmarkId);
    if (!updated) throw new Error("Failed to update bookmark");

    return {
      id: updated._id,
      name: updated.name,
      type: "user" as const,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      count: updated.count,
      filtersState: updated.filtersState,
      tableState: updated.tableState,
    };
  },
});

export const renameBookmark = mutation({
  args: {
    bookmarkId: v.id("user_bookmarks"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.bookmarkId);
    if (!existing) throw new Error("Bookmark not found");

    await ctx.db.patch(args.bookmarkId, {
      name: args.newName,
      updatedAt: Date.now(),
    });
  },
});

export const deleteBookmark = mutation({
  args: { bookmarkId: v.id("user_bookmarks") },
  handler: async (ctx, args) => {
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) throw new Error("Bookmark not found");
    await ctx.db.delete(args.bookmarkId);
  },
});

export const setDefaultBookmark = mutation({
  args: {
    userId: v.id("users"),
    bookmarkId: v.id("user_bookmarks"),
  },
  handler: async (ctx, args) => {
    // Verify bookmark exists and belongs to user
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== args.userId) {
      throw new Error("Bookmark not found or access denied");
    }

    // Unset all defaults for this user
    const allUserBookmarks = await ctx.db
      .query("user_bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const b of allUserBookmarks) {
      if (b.isDefault) {
        await ctx.db.patch(b._id, {
          isDefault: false,
          updatedAt: Date.now(),
        });
      }
    }

    // Set new default
    await ctx.db.patch(args.bookmarkId, {
      isDefault: true,
      updatedAt: Date.now(),
    });
  },
});
