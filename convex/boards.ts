import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Query to get all boards for user in current organization
export const getBoardsByUserAndOrg = query({
  args: { 
    userId: v.id("users"), 
    organizationId: v.id("organizations") 
  },
  handler: async (ctx, args) => {
    const boards = await ctx.db
      .query("boards")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), args.organizationId)
        )
      )
      .order("desc") // Most recent first
      .collect();

    return boards;
  },
});

// Query to get user's pinned boards in current organization
export const getPinnedBoards = query({
  args: { 
    userId: v.id("users"), 
    organizationId: v.id("organizations") 
  },
  handler: async (ctx, args) => {
    const pinnedBoardRecords = await ctx.db
      .query("pinned_boards")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), args.organizationId)
        )
      )
      .order("asc") // Order by the 'order' field
      .collect();

    // Get the actual board data for each pinned board
    const pinnedBoards = await Promise.all(
      pinnedBoardRecords
        .sort((a, b) => a.order - b.order) // Ensure correct ordering
        .map(async (pinned) => {
          const board = await ctx.db.get(pinned.boardId);
          return board ? { ...board, pinOrder: pinned.order } : null;
        })
    );

    return pinnedBoards.filter(board => board !== null);
  },
});

// Query to get single board by ID
export const getBoardById = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    return board;
  },
});

// Mutation to create a new board
export const createBoard = mutation({
  args: {
    title: v.string(),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const boardId = await ctx.db.insert("boards", {
      title: args.title,
      userId: args.userId,
      organizationId: args.organizationId,
      createdAt: now,
      updatedAt: now,
    });

    return boardId;
  },
});

// Mutation to update board
export const updateBoard = mutation({
  args: {
    boardId: v.id("boards"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Partial<{
      title: string;
      description: string;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.boardId, updates);
  },
});

// Mutation to delete board
export const deleteBoard = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    // First, remove any pinned_boards references
    const pinnedRecords = await ctx.db
      .query("pinned_boards")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .collect();

    for (const pinned of pinnedRecords) {
      await ctx.db.delete(pinned._id);
    }

    // Then delete the board itself
    await ctx.db.delete(args.boardId);
  },
});

// Mutation to pin a board
export const pinBoard = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check if already pinned
    const existingPin = await ctx.db
      .query("pinned_boards")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("boardId"), args.boardId)
        )
      )
      .first();

    if (existingPin) {
      throw new Error("Board is already pinned");
    }

    // Check if user has reached the max of 5 pinned boards
    const pinnedCount = await ctx.db
      .query("pinned_boards")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), args.organizationId)
        )
      )
      .collect();

    if (pinnedCount.length >= 5) {
      throw new Error("Maximum of 5 boards can be pinned");
    }

    // Pin the board with the next available order
    await ctx.db.insert("pinned_boards", {
      userId: args.userId,
      organizationId: args.organizationId,
      boardId: args.boardId,
      pinnedAt: Date.now(),
      order: pinnedCount.length, // 0-indexed
    });
  },
});

// Mutation to unpin a board
export const unpinBoard = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const pinned = await ctx.db
      .query("pinned_boards")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("boardId"), args.boardId)
        )
      )
      .first();

    if (!pinned) {
      throw new Error("Board is not pinned");
    }

    await ctx.db.delete(pinned._id);

    // Reorder remaining pinned boards to maintain 0-4 sequence
    const remainingPinned = await ctx.db
      .query("pinned_boards")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("organizationId"), args.organizationId)
        )
      )
      .order("asc")
      .collect();

    // Update orders to maintain sequence
    for (let i = 0; i < remainingPinned.length; i++) {
      await ctx.db.patch(remainingPinned[i]._id, { order: i });
    }
  },
});