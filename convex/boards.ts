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
    visibility: v.optional(v.union(v.literal("private"), v.literal("org_view"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const boardId = await ctx.db.insert("boards", {
      title: args.title,
      userId: args.userId,
      organizationId: args.organizationId,
      visibility: args.visibility ?? "private",
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
    visibility: v.optional(v.union(v.literal("private"), v.literal("org_view"))),
  },
  handler: async (ctx, args) => {
    const updates: Partial<{
      title: string;
      description: string;
      visibility: "private" | "org_view";
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.visibility !== undefined) updates.visibility = args.visibility;

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

// Query to get boards shared with the org (org_view visibility, not owned by current user)
export const getBoardsSharedWithOrg = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const boards = await ctx.db
      .query("boards")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("visibility"), "org_view"),
          q.neq(q.field("userId"), args.userId),
        )
      )
      .order("desc")
      .collect();

    return boards;
  },
});

// Mutation to seed a test board for development
export const seedTestBoard = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    const org = await ctx.db.query("organizations").first();
    if (!user || !org) throw new Error("No user or org found");

    const existing = await ctx.db
      .query("boards")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("title"), "test1"),
        )
      )
      .first();
    if (existing) return { skipped: true, board: existing };

    const now = Date.now();
    const id = await ctx.db.insert("boards", {
      title: "test1",
      userId: user._id,
      organizationId: org._id,
      visibility: "private",
      createdAt: now,
      updatedAt: now,
    });
    return { skipped: false, board: await ctx.db.get(id) };
  },
});

// Mutation to duplicate a board (creates a private copy for a different user)
export const duplicateBoard = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.boardId);
    if (!source) throw new Error("Board not found");

    const now = Date.now();
    const newBoardId = await ctx.db.insert("boards", {
      title: `${source.title} (copy)`,
      description: source.description,
      userId: args.userId,
      organizationId: args.organizationId,
      visibility: "private",
      createdAt: now,
      updatedAt: now,
    });

    // Duplicate all widgets from the source board
    const widgets = await ctx.db
      .query("widgets")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .collect();

    const widgetIdMap: Record<string, string> = {};
    for (const widget of widgets) {
      const newWidgetId = await ctx.db.insert("widgets", {
        boardId: newBoardId,
        type: widget.type,
        title: widget.title,
        config: widget.config,
        createdAt: now,
        updatedAt: now,
      });
      widgetIdMap[widget._id] = newWidgetId;
    }

    // Duplicate layouts, remapping widget IDs
    const layouts = await ctx.db
      .query("board_layouts")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .collect();

    for (const layout of layouts) {
      const remappedLayout = layout.layout.map((item) => ({
        ...item,
        i: widgetIdMap[item.i] ?? item.i,
      }));
      await ctx.db.insert("board_layouts", {
        boardId: newBoardId,
        breakpoint: layout.breakpoint,
        layout: remappedLayout,
        updatedAt: now,
      });
    }

    return newBoardId;
  },
});