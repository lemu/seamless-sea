import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Query to get all widgets for a specific board
export const getWidgetsByBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const widgets = await ctx.db
      .query("widgets")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .order("desc") // Most recent first
      .collect();

    return widgets;
  },
});

// Query to get board layouts for all breakpoints
export const getBoardLayouts = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const layouts = await ctx.db
      .query("board_layouts")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .collect();

    // Convert to object with breakpoint as key for easier access
    const layoutsObj: Record<string, any> = {};
    layouts.forEach(layout => {
      layoutsObj[layout.breakpoint] = layout.layout;
    });

    return layoutsObj;
  },
});

// Mutation to create a new widget
export const createWidget = mutation({
  args: {
    boardId: v.id("boards"),
    type: v.union(v.literal("chart"), v.literal("table"), v.literal("empty")),
    title: v.string(),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const widgetId = await ctx.db.insert("widgets", {
      boardId: args.boardId,
      type: args.type,
      title: args.title,
      config: args.config,
      createdAt: now,
      updatedAt: now,
    });

    return widgetId;
  },
});

// Mutation to update a widget
export const updateWidget = mutation({
  args: {
    widgetId: v.id("widgets"),
    title: v.optional(v.string()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const updates: Partial<{
      title: string;
      config: any;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.config !== undefined) updates.config = args.config;

    await ctx.db.patch(args.widgetId, updates);
  },
});

// Mutation to delete a widget
export const deleteWidget = mutation({
  args: { widgetId: v.id("widgets") },
  handler: async (ctx, args) => {
    // Get the widget to find its board
    const widget = await ctx.db.get(args.widgetId);
    if (!widget) {
      throw new Error("Widget not found");
    }

    // Remove widget from all layout configurations
    const layouts = await ctx.db
      .query("board_layouts")
      .filter((q) => q.eq(q.field("boardId"), widget.boardId))
      .collect();

    for (const layout of layouts) {
      // Filter out the deleted widget from the layout
      const updatedLayout = layout.layout.filter(item => item.i !== args.widgetId);
      await ctx.db.patch(layout._id, {
        layout: updatedLayout,
        updatedAt: Date.now(),
      });
    }

    // Delete the widget
    await ctx.db.delete(args.widgetId);
  },
});

// Mutation to update board layout for a specific breakpoint
export const updateBoardLayout = mutation({
  args: {
    boardId: v.id("boards"),
    breakpoint: v.string(),
    layout: v.array(v.object({
      i: v.string(),
      x: v.number(),
      y: v.number(),
      w: v.number(),
      h: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Check if layout already exists for this board and breakpoint
    const existingLayout = await ctx.db
      .query("board_layouts")
      .filter((q) => 
        q.and(
          q.eq(q.field("boardId"), args.boardId),
          q.eq(q.field("breakpoint"), args.breakpoint)
        )
      )
      .first();

    const now = Date.now();

    if (existingLayout) {
      // Update existing layout
      await ctx.db.patch(existingLayout._id, {
        layout: args.layout,
        updatedAt: now,
      });
    } else {
      // Create new layout
      await ctx.db.insert("board_layouts", {
        boardId: args.boardId,
        breakpoint: args.breakpoint,
        layout: args.layout,
        updatedAt: now,
      });
    }
  },
});

// Mutation to batch update layouts for multiple breakpoints
export const batchUpdateLayouts = mutation({
  args: {
    boardId: v.id("boards"),
    layouts: v.object({
      lg: v.optional(v.array(v.object({
        i: v.string(),
        x: v.number(),
        y: v.number(),
        w: v.number(),
        h: v.number(),
      }))),
      md: v.optional(v.array(v.object({
        i: v.string(),
        x: v.number(),
        y: v.number(),
        w: v.number(),
        h: v.number(),
      }))),
      sm: v.optional(v.array(v.object({
        i: v.string(),
        x: v.number(),
        y: v.number(),
        w: v.number(),
        h: v.number(),
      }))),
      xs: v.optional(v.array(v.object({
        i: v.string(),
        x: v.number(),
        y: v.number(),
        w: v.number(),
        h: v.number(),
      }))),
      xxs: v.optional(v.array(v.object({
        i: v.string(),
        x: v.number(),
        y: v.number(),
        w: v.number(),
        h: v.number(),
      }))),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Process each breakpoint layout
    for (const [breakpoint, layout] of Object.entries(args.layouts)) {
      if (!layout) continue;

      // Check if layout already exists
      const existingLayout = await ctx.db
        .query("board_layouts")
        .filter((q) => 
          q.and(
            q.eq(q.field("boardId"), args.boardId),
            q.eq(q.field("breakpoint"), breakpoint)
          )
        )
        .first();

      if (existingLayout) {
        await ctx.db.patch(existingLayout._id, {
          layout,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("board_layouts", {
          boardId: args.boardId,
          breakpoint,
          layout,
          updatedAt: now,
        });
      }
    }
  },
});