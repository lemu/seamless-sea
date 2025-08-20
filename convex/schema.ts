import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Example users table
  users: defineTable({
    name: v.string(),
    email: v.string(),
    createdAt: v.number(),
  }),

  // Example todos table to integrate with Tide UI
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }),
});
