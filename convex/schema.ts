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

  // Example todos table to integrate with Tide UI
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }),
});
