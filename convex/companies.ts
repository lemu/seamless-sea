import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

// Internal seed function that can be called from other mutations
export const seedCompaniesInternal = async (ctx: MutationCtx) => {
  // Get a system user ID for createdBy field
  const systemUser = await ctx.db.query("users").first();
  if (!systemUser) {
    throw new Error("No users found. Please create a user first.");
  }

  const now = Date.now();

  // Charterers (8 companies)
  const charterers = [
    "Archer Daniels Midland",
    "Bunge",
    "Cofco",
    "Cargill",
    "Louis Dreyfus",
    "Mercuria",
    "Trafigura",
    "Vitol",
  ];

  // Brokers (8 companies)
  const brokers = [
    "BRS",
    "Clarksons",
    "Howe Robinson",
    "Ifchor Galbraiths",
    "McQuilling Partners",
    "Simpson Spence Young",
    "MB Shipbrokers",
    "Gibson",
  ];

  // Owners (8 companies)
  const owners = [
    "CMA CGM",
    "Cosco Shipping",
    "CMB Tech",
    "Hapag-Lloyd",
    "Mediterranean Shipping Company",
    "Maersk",
    "Evergreen",
    "Star Bulk Carriers",
  ];

  const createdCompanies = [];

  // Create charterers
  for (const name of charterers) {
    const companyId = await ctx.db.insert("companies", {
      name,
      displayName: name,
      companyType: "shipping-company",
      roles: ["charterer"],
      isVerified: true,
      isActive: true,
      createdBy: systemUser._id,
      createdAt: now,
      updatedAt: now,
    });
    createdCompanies.push({ name, id: companyId, role: "charterer" });
  }

  // Create brokers
  for (const name of brokers) {
    const companyId = await ctx.db.insert("companies", {
      name,
      displayName: name,
      companyType: "broker",
      roles: ["broker"],
      isVerified: true,
      isActive: true,
      createdBy: systemUser._id,
      createdAt: now,
      updatedAt: now,
    });
    createdCompanies.push({ name, id: companyId, role: "broker" });
  }

  // Create owners
  for (const name of owners) {
    const companyId = await ctx.db.insert("companies", {
      name,
      displayName: name,
      companyType: "shipping-company",
      roles: ["owner"],
      isVerified: true,
      isActive: true,
      createdBy: systemUser._id,
      createdAt: now,
      updatedAt: now,
    });
    createdCompanies.push({ name, id: companyId, role: "owner" });
  }

  return {
    success: true,
    message: `Successfully seeded ${createdCompanies.length} companies`,
    companies: createdCompanies,
  };
};

// Seed function to populate initial 24 companies
export const seedCompanies = mutation({
  args: {},
  handler: seedCompaniesInternal,
});

// Query all companies
export const list = query({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    return companies.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Query companies by role
export const listByRole = query({
  args: {
    role: v.union(v.literal("owner"), v.literal("charterer"), v.literal("broker")),
  },
  handler: async (ctx, args) => {
    const allCompanies = await ctx.db.query("companies").collect();
    return allCompanies.filter((company) =>
      company.roles.includes(args.role)
    );
  },
});

// Query companies with avatars
export const listWithAvatars = query({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").order("desc").collect();

    const companiesWithUrls = await Promise.all(
      companies.map(async (company) => {
        let avatarUrl = null;
        if (company.avatar) {
          avatarUrl = await ctx.storage.getUrl(company.avatar);
        }
        return { ...company, avatarUrl };
      })
    );

    return companiesWithUrls;
  },
});

// Get company by ID
export const getById = query({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get company by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
  },
});

// Create a new company
export const create = mutation({
  args: {
    name: v.string(),
    displayName: v.optional(v.string()),
    companyType: v.union(
      v.literal("shipping-company"),
      v.literal("broker"),
      v.literal("operator")
    ),
    roles: v.array(
      v.union(v.literal("owner"), v.literal("charterer"), v.literal("broker"))
    ),
    contact: v.optional(
      v.object({
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),
    isVerified: v.optional(v.boolean()),
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

    const now = Date.now();
    const companyId = await ctx.db.insert("companies", {
      name: args.name,
      displayName: args.displayName || args.name,
      companyType: args.companyType,
      roles: args.roles,
      contact: args.contact,
      isVerified: args.isVerified || false,
      isActive: true,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return companyId;
  },
});

// Update company
export const update = mutation({
  args: {
    id: v.id("companies"),
    name: v.optional(v.string()),
    displayName: v.optional(v.string()),
    companyType: v.optional(
      v.union(
        v.literal("shipping-company"),
        v.literal("broker"),
        v.literal("operator")
      )
    ),
    roles: v.optional(
      v.array(
        v.union(v.literal("owner"), v.literal("charterer"), v.literal("broker"))
      )
    ),
    contact: v.optional(
      v.object({
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),
    avatar: v.optional(v.id("_storage")),
    isVerified: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Generate upload URL for company avatar
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
