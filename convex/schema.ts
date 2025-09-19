import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Example users table
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatar: v.optional(v.id("_storage")),
    createdAt: v.number(),
  }),

  // Organizations table
  organizations: defineTable({
    name: v.string(),
    plan: v.string(), // Enterprise, Pro, etc.
    avatar: v.optional(v.id("_storage")),
    createdAt: v.number(),
  }),

  // User-Organization memberships (many-to-many relationship)
  memberships: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    role: v.string(), // Trader, Broker, Admin, etc.
    createdAt: v.number(),
  }),

  // Boards table - User + Organization scoped dashboards
  boards: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Pinned boards - Max 5 per user per organization
  pinned_boards: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"), 
    boardId: v.id("boards"),
    pinnedAt: v.number(),
    order: v.number(), // 0-4 for ordering in sidebar
  }),

  // Widgets table - Individual widget instances on boards
  widgets: defineTable({
    boardId: v.id("boards"),
    type: v.union(v.literal("chart"), v.literal("table"), v.literal("empty")), // Expandable widget types
    title: v.string(),
    config: v.any(), // Widget-specific configuration (chart settings, table data source, etc.)
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Board layouts table - Responsive grid layouts per breakpoint
  board_layouts: defineTable({
    boardId: v.id("boards"),
    breakpoint: v.string(), // "lg", "md", "sm", "xs", "xxs"
    layout: v.array(v.object({
      i: v.string(), // widget id
      x: v.number(), // grid x position
      y: v.number(), // grid y position
      w: v.number(), // width in grid units
      h: v.number(), // height in grid units
    })),
    updatedAt: v.number(),
  }),

});
