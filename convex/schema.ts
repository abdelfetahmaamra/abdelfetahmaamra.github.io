import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const i18n = v.object({ ar: v.string(), fr: v.string() });
export const i18nList = v.object({ ar: v.array(v.string()), fr: v.array(v.string()) });

export const orderStatus = v.union(
  v.literal("new"),
  v.literal("confirmed"),
  v.literal("unreachable"),
  v.literal("cancelled"),
  v.literal("preparing"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("returned"),
);
export const deliveryMode = v.union(v.literal("home"), v.literal("desk"));
export const carrierCode = v.union(v.literal("yalidine"), v.literal("zr_express"), v.literal("noest"), v.literal("ecotrack"));
export const role = v.union(v.literal("owner"), v.literal("manager"), v.literal("confirmer"), v.literal("logistics"));

export const orderItem = v.object({
  productId: v.optional(v.id("products")),
  name: v.string(),
  qty: v.number(),
  price: v.number(),
});

export const attribution = v.object({
  utm_source: v.optional(v.string()),
  utm_medium: v.optional(v.string()),
  utm_campaign: v.optional(v.string()),
  utm_content: v.optional(v.string()),
  fbclid: v.optional(v.string()),
  ttclid: v.optional(v.string()),
  fbc: v.optional(v.string()),
  fbp: v.optional(v.string()),
  landing: v.optional(v.string()),
  page: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  ip: v.optional(v.string()),
});

export default defineSchema({
  /* ---------- Catalog ---------- */
  categories: defineTable({
    slug: v.string(),
    name: i18n,
    parentId: v.optional(v.id("categories")),
    sortOrder: v.number(),
  }).index("by_slug", ["slug"]),

  products: defineTable({
    slug: v.string(),
    name: i18n,
    size: v.optional(i18n),
    desc: v.optional(i18n),
    benefits: v.optional(i18nList),
    usage: v.optional(i18n),
    price: v.number(),
    compareAt: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    images: v.array(v.id("_storage")),
    shape: v.optional(v.string()), // placeholder art when no photo: dropper | jar | tube
    tint: v.optional(v.string()),
    active: v.boolean(),
    trackStock: v.boolean(),
    stock: v.number(),
    lowAt: v.number(),
    weightKg: v.optional(v.number()),
    sku: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["active", "sortOrder"]),

  stockMoves: defineTable({
    productId: v.id("products"),
    delta: v.number(),
    after: v.number(),
    reason: v.string(),
    orderId: v.optional(v.id("orders")),
    by: v.optional(v.id("members")),
  })
    .index("by_product", ["productId"])
    .index("by_order", ["orderId"]),

  /* ---------- Orders ---------- */
  orders: defineTable({
    number: v.string(),
    status: orderStatus,
    name: v.string(),
    phone: v.string(),
    phone2: v.optional(v.string()),
    wilayaCode: v.number(),
    commune: v.string(),
    address: v.string(),
    mode: deliveryMode,
    stopDeskCode: v.optional(v.string()),
    stopDeskCarrier: v.optional(carrierCode), // the stop desk code belongs to this carrier
    items: v.array(orderItem),
    subtotal: v.number(),
    shipping: v.number(),
    total: v.number(),
    lang: v.string(),
    source: attribution,
    notes: v.array(v.object({ at: v.number(), by: v.optional(v.string()), text: v.string() })),
    history: v.array(
      v.object({ at: v.number(), by: v.optional(v.string()), status: v.optional(orderStatus), from: v.optional(orderStatus), note: v.optional(v.string()) }),
    ),
    attempts: v.number(),
    followUpAt: v.optional(v.number()),
    customerId: v.id("customers"),
    draftId: v.optional(v.string()),
    // shipping
    carrier: v.optional(carrierCode),
    tracking: v.optional(v.string()),
    carrierParcelId: v.optional(v.string()),
    labelUrl: v.optional(v.string()),
    carrierStatus: v.optional(v.string()),
    carrierError: v.optional(v.string()),
    dispatchedAt: v.optional(v.number()),
    dispatchingAt: v.optional(v.number()), // lock while a carrier call is in flight
    lastSyncAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    stockConsumed: v.boolean(),
    // Meta Conversions API bookkeeping
    meta: v.object({ lead: v.optional(v.boolean()), purchase: v.optional(v.boolean()), delivered: v.optional(v.boolean()) }),
    updatedAt: v.number(),
  })
    .index("by_number", ["number"])
    .index("by_status", ["status"])
    .index("by_phone", ["phone"])
    .index("by_customer", ["customerId"])
    .index("by_tracking", ["tracking"])
    .index("by_carrier_status", ["carrier", "status"]),

  abandoned: defineTable({
    draftId: v.string(),
    phone: v.string(),
    name: v.string(),
    wilayaCode: v.optional(v.number()),
    commune: v.optional(v.string()),
    items: v.array(orderItem),
    total: v.number(),
    page: v.optional(v.string()),
    lang: v.string(),
    status: v.union(v.literal("open"), v.literal("contacted"), v.literal("converted"), v.literal("ignored")),
    orderId: v.optional(v.id("orders")),
    updatedAt: v.number(),
  })
    .index("by_draft", ["draftId"])
    .index("by_status", ["status"]),

  customers: defineTable({
    phone: v.string(),
    name: v.string(),
    tags: v.array(v.string()),
    orders: v.number(),
    delivered: v.number(),
    returned: v.number(),
    cancelled: v.number(),
    unreachable: v.number(),
    spent: v.number(),
    lastOrderAt: v.number(),
    wilayaCode: v.optional(v.number()),
    blocked: v.optional(v.boolean()),
  }).index("by_phone", ["phone"]),

  /* ---------- Delivery ---------- */
  shippingRates: defineTable({
    wilayaCode: v.number(),
    commune: v.optional(v.string()), // undefined = whole wilaya
    home: v.optional(v.number()), // undefined = not offered
    desk: v.optional(v.number()),
  }).index("by_wilaya", ["wilayaCode", "commune"]),

  stopDesks: defineTable({
    carrier: carrierCode,
    code: v.string(),
    name: v.string(),
    wilayaCode: v.optional(v.number()),
    commune: v.optional(v.string()),
    address: v.optional(v.string()),
  })
    .index("by_carrier_wilaya", ["carrier", "wilayaCode"])
    .index("by_carrier_code", ["carrier", "code"]),

  carrierGeo: defineTable({
    carrier: carrierCode,
    wilayaCode: v.number(),
    name: v.string(), // exact carrier spelling
    key: v.string(), // normalized for matching
  }).index("by_carrier_wilaya_key", ["carrier", "wilayaCode", "key"]),

  carrierLogs: defineTable({
    carrier: carrierCode,
    kind: v.string(),
    ok: v.boolean(),
    message: v.string(),
    orderId: v.optional(v.id("orders")),
  }),

  /* ---------- Settings, team ---------- */
  settings: defineTable({
    key: v.literal("store"),
    name: i18n,
    tagline: i18n,
    phone: v.string(),
    whatsapp: v.string(),
    freeShippingFrom: v.number(),
    confirmDelay: i18n,
    deliveryDelay: i18n,
    zoneFees: v.object({
      A: v.object({ home: v.number(), desk: v.number() }),
      N: v.object({ home: v.number(), desk: v.number() }),
      S: v.object({ home: v.number(), desk: v.number() }),
    }),
    defaultCarrier: v.optional(carrierCode),
    originWilaya: v.number(),
    canOpenParcel: v.boolean(),
    fbPixelId: v.optional(v.string()),
    tiktokPixelId: v.optional(v.string()),
    maxOrdersPerPhonePerDay: v.number(),
  }).index("by_key", ["key"]),

  members: defineTable({
    email: v.string(),
    name: v.string(),
    role: role,
    passwordHash: v.string(),
    active: v.boolean(),
    lastLoginAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    token: v.string(),
    memberId: v.id("members"),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  labelTokens: defineTable({ token: v.string(), orderId: v.id("orders"), expiresAt: v.number() }).index("by_token", ["token"]),

  counters: defineTable({ name: v.string(), value: v.number() }).index("by_name", ["name"]),

  rateHits: defineTable({ key: v.string(), at: v.number() }).index("by_key", ["key", "at"]),
});
