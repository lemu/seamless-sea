import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table with authentication
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.optional(v.string()),
    avatar: v.optional(v.id("_storage")),
    emailVerified: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  // Sessions table for bcrypt authentication
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"]),

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
  })
    .index("by_userId", ["userId"])
    .index("by_organizationId", ["organizationId"]),

  // Organization Invitations
  invitations: defineTable({
    email: v.string(),
    organizationId: v.id("organizations"),
    role: v.string(), // Admin, Trader, Broker
    token: v.string(),
    invitedBy: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked")
    ),
    expiresAt: v.number(), // 7 days from creation
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_organization", ["organizationId"]),

  // Password Reset Tokens
  password_reset_tokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(), // 1 hour from creation
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"]),

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

  // === Maritime Trading Tables ===

  // Companies - All maritime companies (owners, charterers, brokers)
  companies: defineTable({
    name: v.string(),
    displayName: v.optional(v.string()),
    companyType: v.union(
      v.literal("shipping-company"),
      v.literal("broker"),
      v.literal("operator")
    ),
    roles: v.array(v.union(
      v.literal("owner"),
      v.literal("charterer"),
      v.literal("broker")
    )), // Company can have multiple roles
    avatar: v.optional(v.id("_storage")),
    contact: v.optional(v.object({
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
      website: v.optional(v.string()),
    })),
    isVerified: v.boolean(), // Admin-approved reference data
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_verified", ["isVerified"])
    .index("by_active", ["isActive"]),

  // Vessels - Ship information
  vessels: defineTable({
    name: v.string(),
    imoNumber: v.optional(v.string()),
    callsign: v.optional(v.string()),
    mmsi: v.optional(v.string()),
    dwt: v.optional(v.number()), // Deadweight tonnage
    grt: v.optional(v.number()), // Gross register tonnage
    draft: v.optional(v.number()), // meters
    loa: v.optional(v.number()), // Length overall (meters)
    beam: v.optional(v.number()), // Width (meters)
    maxHeight: v.optional(v.number()), // meters
    flag: v.optional(v.string()),
    vesselClass: v.optional(v.string()),
    speedKnots: v.optional(v.number()),
    consumptionPerDay: v.optional(v.number()), // liters per day
    builtDate: v.optional(v.string()),
    currentOwnerId: v.optional(v.id("companies")),
    isVerified: v.boolean(),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_imo", ["imoNumber"])
    .index("by_owner", ["currentOwnerId"])
    .index("by_verified", ["isVerified"]),

  // Ports - Port information
  ports: defineTable({
    name: v.string(),
    unlocode: v.optional(v.string()), // UN/LOCODE standard
    country: v.string(),
    countryCode: v.string(), // ISO 2-letter code
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    timezone: v.optional(v.string()),
    isVerified: v.boolean(),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_unlocode", ["unlocode"])
    .index("by_country", ["country"])
    .index("by_verified", ["isVerified"]),

  // Cargo Types - Reference data for cargo
  cargo_types: defineTable({
    name: v.string(),
    category: v.union(
      v.literal("crude-oil"),
      v.literal("dry-bulk"),
      v.literal("container"),
      v.literal("lng"),
      v.literal("grain"),
      v.literal("iron-ore"),
      v.literal("coal"),
      v.literal("other")
    ),
    unitType: v.union(v.literal("mt"), v.literal("cbm"), v.literal("teu")),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_category", ["category"]),

  // Orders - Top-level trading orders
  orders: defineTable({
    orderNumber: v.string(), // ORD12345
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("buy"),
      v.literal("sell"),
      v.literal("charter")
    ),
    stage: v.union(
      v.literal("offer"),
      v.literal("active"),
      v.literal("negotiating"),
      v.literal("pending")
    ),
    cargoTypeId: v.optional(v.id("cargo_types")),
    quantity: v.optional(v.number()),
    quantityUnit: v.optional(v.string()),
    laycanStart: v.optional(v.number()), // timestamp
    laycanEnd: v.optional(v.number()), // timestamp
    loadPortId: v.optional(v.id("ports")),
    dischargePortId: v.optional(v.id("ports")),
    freightRate: v.optional(v.string()), // e.g., "WS 85-90" or "$25.12/mt"
    freightRateType: v.optional(v.union(
      v.literal("worldscale"),
      v.literal("lumpsum"),
      v.literal("per-tonne")
    )),
    demurrageRate: v.optional(v.string()),
    despatchRate: v.optional(v.string()),
    tce: v.optional(v.string()), // Time Charter Equivalent
    validityHours: v.optional(v.number()),
    organizationId: v.id("organizations"),
    chartererId: v.optional(v.id("companies")),
    ownerId: v.optional(v.id("companies")),
    brokerId: v.optional(v.id("companies")),
    status: v.union(
      v.literal("draft"),
      v.literal("distributed"),
      v.literal("withdrawn")
    ),
    approvalStatus: v.optional(v.string()),
    createdByUserId: v.optional(v.id("users")), // User who created the order
    createdAt: v.number(),
    updatedAt: v.number(),
    distributedAt: v.optional(v.number()),
    withdrawnAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_orderNumber", ["orderNumber"])
    .index("by_status", ["status"])
    .index("by_stage", ["stage"]),

  // Fixtures - Grouping of contracts resulting from orders/negotiations
  fixtures: defineTable({
    fixtureNumber: v.string(), // FIX12345
    orderId: v.optional(v.id("orders")),
    title: v.optional(v.string()),
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("draft"),
      v.literal("working-copy"),
      v.literal("final"),
      v.literal("on-subs"),
      v.literal("fully-fixed"),
      v.literal("canceled")
    ),
    // Denormalized lastUpdated timestamp - max of fixture, contracts, recaps, negotiations timestamps
    // Updated automatically when related entities change
    lastUpdated: v.optional(v.number()),
    // Denormalized search text - all searchable values concatenated lowercase
    // Updated automatically when related entities change
    searchText: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_fixtureNumber", ["fixtureNumber"])
    .index("by_order", ["orderId"])
    .index("by_status", ["status"])
    .index("by_organization_and_status", ["organizationId", "status"]),

  // Negotiations - Individual offers/bids (previously "offers")
  negotiations: defineTable({
    negotiationNumber: v.optional(v.string()), // NEG12345 (optional for migration)
    orderId: v.id("orders"),
    counterpartyId: v.id("companies"), // The company making the offer/bid
    brokerId: v.optional(v.id("companies")),
    bidPrice: v.optional(v.string()),
    offerPrice: v.optional(v.string()),
    freightRate: v.optional(v.string()),
    demurrageRate: v.optional(v.string()),
    tce: v.optional(v.string()),
    validity: v.optional(v.string()), // "48h", "72h", etc
    vesselId: v.optional(v.id("vessels")),
    status: v.union(
      v.literal("indicative-offer"),
      v.literal("indicative-bid"),
      v.literal("firm-offer"),
      v.literal("firm-bid"),
      v.literal("firm"),
      v.literal("on-subs"),
      v.literal("fixed"),
      v.literal("firm-offer-expired"),
      v.literal("withdrawn"),
      v.literal("firm-amendment"),
      v.literal("subs-expired"),
      v.literal("subs-failed"),
      v.literal("on-subs-amendment")
    ),
    personInChargeId: v.optional(v.id("users")),

    // Delivery Types
    loadDeliveryType: v.optional(v.string()), // "Free In", "Free Out", "FIO", etc.
    dischargeRedeliveryType: v.optional(v.string()),

    // User Tracking
    dealCaptureUserId: v.optional(v.id("users")), // Person who captured the deal

    // Freight Rate Analytics (computed from negotiation history)
    highestFreightRateIndication: v.optional(v.number()),
    lowestFreightRateIndication: v.optional(v.number()),
    firstFreightRateIndication: v.optional(v.number()),
    highestFreightRateLastDay: v.optional(v.number()),
    lowestFreightRateLastDay: v.optional(v.number()),
    firstFreightRateLastDay: v.optional(v.number()),

    // Demurrage Analytics (computed from negotiation history)
    highestDemurrageIndication: v.optional(v.number()),
    lowestDemurrageIndication: v.optional(v.number()),
    firstDemurrageIndication: v.optional(v.number()),
    highestDemurrageLastDay: v.optional(v.number()),
    lowestDemurrageLastDay: v.optional(v.number()),
    firstDemurrageLastDay: v.optional(v.number()),

    // Market Comparison
    marketIndex: v.optional(v.number()), // Market rate for comparison
    marketIndexName: v.optional(v.string()), // e.g., "Baltic Dry Index"

    // Commission Details
    addressCommissionPercent: v.optional(v.number()),
    addressCommissionTotal: v.optional(v.number()),
    brokerCommissionPercent: v.optional(v.number()),
    brokerCommissionTotal: v.optional(v.number()),

    // Gross Freight
    grossFreight: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_counterparty", ["counterpartyId"])
    .index("by_status", ["status"])
    .index("by_negotiationNumber", ["negotiationNumber"]),

  // Contracts - Dry market charter parties
  contracts: defineTable({
    contractNumber: v.string(), // CP12345
    fixtureId: v.optional(v.id("fixtures")), // Group multiple contracts under one fixture
    negotiationId: v.optional(v.id("negotiations")),
    orderId: v.optional(v.id("orders")),
    parentContractId: v.optional(v.id("contracts")), // For COA voyages
    contractType: v.union(
      v.literal("voyage-charter"),
      v.literal("time-charter"),
      v.literal("bareboat"),
      v.literal("coa")
    ),
    ownerId: v.id("companies"),
    chartererId: v.id("companies"),
    brokerId: v.optional(v.id("companies")),
    vesselId: v.optional(v.id("vessels")),
    loadPortId: v.optional(v.id("ports")),
    dischargePortId: v.optional(v.id("ports")),
    loadDeliveryType: v.optional(v.string()), // FIO, FIOS, Liner Terms, etc.
    dischargeRedeliveryType: v.optional(v.string()), // FIO, FIOS, Liner Terms, etc.
    laycanStart: v.optional(v.number()),
    laycanEnd: v.optional(v.number()),
    freightRate: v.optional(v.string()),
    freightRateType: v.optional(v.union(
      v.literal("worldscale"),
      v.literal("lumpsum"),
      v.literal("per-tonne")
    )),
    demurrageRate: v.optional(v.string()),
    despatchRate: v.optional(v.string()),
    addressCommission: v.optional(v.string()),
    brokerCommission: v.optional(v.string()),
    cargoTypeId: v.optional(v.id("cargo_types")),
    quantity: v.optional(v.number()),
    quantityUnit: v.optional(v.string()),
    fullCpChainStorageId: v.optional(v.id("_storage")),
    itineraryStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("draft"),
      v.literal("working-copy"),
      v.literal("final"),
      v.literal("rejected")
    ),
    approvalStatus: v.optional(v.string()),
    signedAt: v.optional(v.number()),

    // CP Workflow Dates (for timeline tooltips)
    workingCopyDate: v.optional(v.number()), // When moved to Working Copy
    finalDate: v.optional(v.number()), // When finalized
    fullySignedDate: v.optional(v.number()), // When all parties signed

    // CP URL
    cpUrl: v.optional(v.string()), // Link to the CP document

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_contractNumber", ["contractNumber"])
    .index("by_fixture", ["fixtureId"])
    .index("by_negotiation", ["negotiationId"])
    .index("by_order", ["orderId"])
    .index("by_parent", ["parentContractId"])
    .index("by_status", ["status"]),

  // Recap Managers - Wet market contracts
  recap_managers: defineTable({
    recapNumber: v.string(), // RCP12345
    fixtureId: v.optional(v.id("fixtures")), // Group multiple recaps under one fixture
    negotiationId: v.optional(v.id("negotiations")),
    orderId: v.optional(v.id("orders")),
    parentRecapId: v.optional(v.id("recap_managers")), // For COA voyages
    contractType: v.union(
      v.literal("voyage-charter"),
      v.literal("time-charter"),
      v.literal("bareboat"),
      v.literal("coa")
    ),
    ownerId: v.id("companies"),
    chartererId: v.id("companies"),
    brokerId: v.optional(v.id("companies")),
    vesselId: v.optional(v.id("vessels")),
    loadPortId: v.optional(v.id("ports")),
    dischargePortId: v.optional(v.id("ports")),
    laycanStart: v.optional(v.number()),
    laycanEnd: v.optional(v.number()),
    freightRate: v.optional(v.string()),
    freightRateType: v.optional(v.union(
      v.literal("worldscale"),
      v.literal("lumpsum"),
      v.literal("per-tonne")
    )),
    demurrageRate: v.optional(v.string()),
    despatchRate: v.optional(v.string()),
    addressCommission: v.optional(v.string()),
    brokerCommission: v.optional(v.string()),
    cargoTypeId: v.optional(v.id("cargo_types")),
    quantity: v.optional(v.number()),
    quantityUnit: v.optional(v.string()),
    fullCpChainStorageId: v.optional(v.id("_storage")),
    itineraryStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("draft"),
      v.literal("on-subs"),
      v.literal("fully-fixed"),
      v.literal("canceled"),
      v.literal("failed")
    ),
    approvalStatus: v.optional(v.string()),
    fixedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_recapNumber", ["recapNumber"])
    .index("by_fixture", ["fixtureId"])
    .index("by_negotiation", ["negotiationId"])
    .index("by_order", ["orderId"])
    .index("by_parent", ["parentRecapId"])
    .index("by_status", ["status"]),

  // Contract Addenda - Modifications to contracts (dry market)
  contract_addenda: defineTable({
    contractId: v.id("contracts"),
    addendaNumber: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("working-copy"),
      v.literal("final")
    ),
    approvalStatus: v.optional(v.string()),
    documentStorageId: v.optional(v.id("_storage")),

    // Workflow Dates (for timeline tooltips)
    workingCopyDate: v.optional(v.number()),
    finalDate: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_contract", ["contractId"])
    .index("by_status", ["status"]),

  // Recap Addenda - Modifications to recap managers (wet market)
  recap_addenda: defineTable({
    recapManagerId: v.id("recap_managers"),
    addendaNumber: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("working-copy"),
      v.literal("final")
    ),
    approvalStatus: v.optional(v.string()),
    documentStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_recap", ["recapManagerId"])
    .index("by_status", ["status"]),

  // Contract Approvals - Flexible party approval system for contracts
  contract_approvals: defineTable({
    contractId: v.id("contracts"),
    partyRole: v.string(), // "owner", "charterer", "broker", etc.
    companyId: v.id("companies"),
    approvedBy: v.optional(v.id("users")), // User who approved
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    approvedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_contract", ["contractId"])
    .index("by_status", ["status"])
    .index("by_company", ["companyId"]),

  // Contract Signatures - Flexible party signature system for contracts
  contract_signatures: defineTable({
    contractId: v.id("contracts"),
    partyRole: v.string(), // "owner", "charterer", "broker", etc.
    companyId: v.id("companies"),
    signedBy: v.optional(v.id("users")), // User who signed
    status: v.union(
      v.literal("pending"),
      v.literal("signed"),
      v.literal("rejected")
    ),
    signingMethod: v.optional(v.string()), // "DocuSign", "Manual", "Wet Ink", etc.
    signedAt: v.optional(v.number()),
    documentStorageId: v.optional(v.id("_storage")), // Signed document
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_contract", ["contractId"])
    .index("by_status", ["status"])
    .index("by_company", ["companyId"]),

  // Addenda Approvals - Flexible party approval system for addenda
  addenda_approvals: defineTable({
    addendaId: v.string(), // Store as string to handle both contract_addenda and recap_addenda IDs
    addendaType: v.union(
      v.literal("contract"),
      v.literal("recap")
    ),
    partyRole: v.string(),
    companyId: v.id("companies"),
    approvedBy: v.optional(v.id("users")),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    approvedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_addenda", ["addendaId"])
    .index("by_status", ["status"])
    .index("by_company", ["companyId"]),

  // Addenda Signatures - Flexible party signature system for addenda
  addenda_signatures: defineTable({
    addendaId: v.string(), // Store as string to handle both contract_addenda and recap_addenda IDs
    addendaType: v.union(
      v.literal("contract"),
      v.literal("recap")
    ),
    partyRole: v.string(),
    companyId: v.id("companies"),
    signedBy: v.optional(v.id("users")),
    status: v.union(
      v.literal("pending"),
      v.literal("signed"),
      v.literal("rejected")
    ),
    signingMethod: v.optional(v.string()),
    signedAt: v.optional(v.number()),
    documentStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_addenda", ["addendaId"])
    .index("by_status", ["status"])
    .index("by_company", ["companyId"]),

  // Field Changes - Complete audit trail
  field_changes: defineTable({
    entityType: v.union(
      v.literal("order"),
      v.literal("negotiation"),
      v.literal("contract"),
      v.literal("recap_manager"),
      v.literal("contract_addenda"),
      v.literal("recap_addenda")
    ),
    entityId: v.string(), // Store as string to handle different ID types
    fieldName: v.string(),
    oldValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    changeReason: v.optional(v.string()),
    userId: v.id("users"),
    timestamp: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  // Activity Logs - Human-readable event log
  activity_logs: defineTable({
    entityType: v.union(
      v.literal("order"),
      v.literal("negotiation"),
      v.literal("contract"),
      v.literal("recap_manager")
    ),
    entityId: v.string(),
    action: v.string(), // created, distributed, answered, fixed, withdrawn, signed, on-subs, canceled, etc
    description: v.string(),
    status: v.optional(v.object({
      value: v.string(),
      label: v.string(),
    })),
    metadata: v.optional(v.any()), // Additional data as JSON
    expandable: v.optional(v.object({
      data: v.optional(v.array(v.object({
        label: v.string(),
        value: v.string(),
      }))),
      content: v.optional(v.string()),
    })),
    userId: v.optional(v.id("users")),
    timestamp: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_timestamp", ["timestamp"]),

  // Approvals - Track approval status for contracts and fixtures
  approvals: defineTable({
    entityType: v.union(
      v.literal("order"),
      v.literal("contract"),
      v.literal("recap_manager"),
      v.literal("fixture")
    ),
    entityId: v.string(),
    userId: v.id("users"),
    approved: v.boolean(),
    comment: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  // Voyages - Individual voyages under COA
  voyages: defineTable({
    parentContractId: v.optional(v.id("contracts")),
    parentRecapId: v.optional(v.id("recap_managers")),
    voyageNumber: v.number(),
    vesselId: v.optional(v.id("vessels")),
    loadPortId: v.optional(v.id("ports")),
    dischargePortId: v.optional(v.id("ports")),
    laycanStart: v.optional(v.number()),
    laycanEnd: v.optional(v.number()),
    cargoQuantity: v.optional(v.number()),
    status: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_contract", ["parentContractId"])
    .index("by_recap", ["parentRecapId"]),

  // Routes - Common trading routes
  routes: defineTable({
    name: v.string(),
    loadPortId: v.id("ports"),
    dischargePortId: v.id("ports"),
    averageDistanceNm: v.optional(v.number()), // Nautical miles
    averageDurationDays: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_load_port", ["loadPortId"])
    .index("by_discharge_port", ["dischargePortId"]),

  // User Bookmarks - Persistent user bookmarks for Fixtures table
  user_bookmarks: defineTable({
    userId: v.id("users"),
    name: v.string(),
    isDefault: v.boolean(),
    count: v.optional(v.number()),

    // Filters State - nested object
    filtersState: v.optional(v.object({
      activeFilters: v.any(), // Record<string, FilterValue> - complex type
      pinnedFilters: v.array(v.string()),
      globalSearchTerms: v.array(v.string()),
    })),

    // Table State - nested object
    tableState: v.optional(v.object({
      sorting: v.any(), // TanStack Table types
      columnVisibility: v.any(),
      grouping: v.any(),
      columnOrder: v.any(),
      columnSizing: v.any(),
    })),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_user_and_default", ["userId", "isDefault"]),

});
