import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireMember } from "./lib/auth";
import { CONSUMES, FINAL, NEXT, can, permForTransition, type OrderStatus, type CarrierState } from "./lib/status";
import { cleanPhone, clip, DAY, isValidWilaya, wilayaName } from "./lib/util";
import { getSettings } from "./settings";
import { quoteFee } from "./shipping";
import { moveOrderStock } from "./stock";
import { attribution, deliveryMode, orderStatus } from "./schema";

/* =========================================================
   Creation (storefront + manual)
   ========================================================= */
export const orderInput = v.object({
  name: v.string(),
  phone: v.string(),
  phone2: v.optional(v.string()),
  wilayaCode: v.number(),
  commune: v.string(),
  address: v.optional(v.string()),
  mode: deliveryMode,
  stopDeskCode: v.optional(v.string()),
  items: v.array(v.object({ productId: v.string(), qty: v.number() })),
  lang: v.optional(v.string()),
  draftId: v.optional(v.string()),
  source: v.optional(attribution),
  website: v.optional(v.string()), // honeypot
});
type OrderInput = typeof orderInput.type;

type CreateResult =
  | { ok: true; number: string; id: Id<"orders">; subtotal: number; shipping: number; total: number; items: { name: string; qty: number; price: number; productId?: Id<"products"> }[] }
  | { ok: false; error: string; field?: string; product?: string };

async function bumpCounter(ctx: MutationCtx, name: string, by: number) {
  const c = await ctx.db.query("counters").withIndex("by_name", (q) => q.eq("name", name)).unique();
  if (c) await ctx.db.patch(c._id, { value: Math.max(0, c.value + by) });
  else if (by > 0) await ctx.db.insert("counters", { name, value: by });
}

async function nextNumber(ctx: MutationCtx): Promise<string> {
  const c = await ctx.db.query("counters").withIndex("by_name", (q) => q.eq("name", "order")).unique();
  const n = (c?.value ?? 0) + 1;
  if (c) await ctx.db.patch(c._id, { value: n });
  else await ctx.db.insert("counters", { name: "order", value: n });
  return "RQ-" + (10000 + n);
}

async function createOrderCore(ctx: MutationCtx, input: OrderInput, opts: { manual?: boolean; by?: string; ip?: string }): Promise<CreateResult> {
  if (input.website) return { ok: false, error: "invalid" };
  const name = clip(input.name, 80);
  if (name.length < 2) return { ok: false, error: "name", field: "name" };
  const phone = cleanPhone(input.phone);
  if (!phone) return { ok: false, error: "phone", field: "phone" };
  const phone2 = input.phone2 ? cleanPhone(input.phone2) ?? undefined : undefined;
  if (!isValidWilaya(input.wilayaCode)) return { ok: false, error: "wilaya", field: "wilaya" };
  const commune = clip(input.commune, 80);
  if (!commune) return { ok: false, error: "commune", field: "commune" };
  if (!input.items.length || input.items.length > 20) return { ok: false, error: "items" };

  const settings = await getSettings(ctx);
  const now = Date.now();

  if (!opts.manual) {
    // Duplicate submit (double tap / retry): return the order already created from this checkout.
    const recent = await ctx.db.query("orders").withIndex("by_phone", (q) => q.eq("phone", phone)).order("desc").take(10);
    if (input.draftId) {
      const dup = recent.find((o) => o.draftId === input.draftId && now - o._creationTime < 30 * 60 * 1000);
      if (dup) return { ok: true, number: dup.number, id: dup._id, subtotal: dup.subtotal, shipping: dup.shipping, total: dup.total, items: dup.items };
    }
    if (recent.filter((o) => now - o._creationTime < DAY).length >= settings.maxOrdersPerPhonePerDay) return { ok: false, error: "limit" };
    if (opts.ip) {
      const key = "ip:" + opts.ip, since = now - 10 * 60 * 1000;
      const hits = await ctx.db.query("rateHits").withIndex("by_key", (q) => q.eq("key", key).gt("at", since)).collect();
      if (hits.length >= 8) return { ok: false, error: "limit" };
      await ctx.db.insert("rateHits", { key, at: now });
    }
  }

  // Prices always come from the database, never from the browser.
  const merged = new Map<string, number>();
  for (const it of input.items) merged.set(it.productId, Math.min(10, (merged.get(it.productId) ?? 0) + Math.max(1, Math.floor(it.qty || 1))));
  const items: { productId: Id<"products">; name: string; qty: number; price: number }[] = [];
  for (const [pid, qty] of merged) {
    const id = ctx.db.normalizeId("products", pid);
    const p = id ? await ctx.db.get(id) : null;
    if (!p || !p.active) return { ok: false, error: "product" };
    if (p.trackStock && p.stock < qty) return { ok: false, error: "out_of_stock", product: p.name.fr };
    items.push({ productId: p._id, name: p.name.fr, qty, price: p.price });
  }
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const shipping = await quoteFee(ctx, settings, input.wilayaCode, commune, input.mode, subtotal);
  if (shipping === null) return { ok: false, error: "mode_unavailable", field: "mode" };

  // Customer profile
  let customer = await ctx.db.query("customers").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
  if (customer?.blocked && !opts.manual) return { ok: false, error: "blocked" };
  if (customer) {
    await ctx.db.patch(customer._id, { name, orders: customer.orders + 1, lastOrderAt: now, wilayaCode: input.wilayaCode });
  } else {
    const cid = await ctx.db.insert("customers", { phone, name, tags: [], orders: 1, delivered: 0, returned: 0, cancelled: 0, unreachable: 0, spent: 0, lastOrderAt: now, wilayaCode: input.wilayaCode });
    customer = (await ctx.db.get(cid))!;
  }

  const number = await nextNumber(ctx);
  const id = await ctx.db.insert("orders", {
    number, status: "new", name, phone, phone2, wilayaCode: input.wilayaCode, commune,
    address: input.mode === "home" ? clip(input.address, 200) : "", mode: input.mode,
    stopDeskCode: input.mode === "desk" ? clip(input.stopDeskCode, 40) || undefined : undefined,
    stopDeskCarrier: input.mode === "desk" && input.stopDeskCode ? settings.defaultCarrier : undefined,
    items, subtotal, shipping, total: subtotal + shipping, lang: input.lang === "fr" ? "fr" : "ar",
    source: { ...(input.source ?? {}), ...(opts.ip ? { ip: opts.ip } : {}) },
    notes: [], history: [{ at: now, status: "new", by: opts.by }], attempts: 0, customerId: customer._id,
    draftId: input.draftId, stockConsumed: false, meta: {}, updatedAt: now,
  });

  await bumpCounter(ctx, "status:new", 1);
  if (input.draftId) {
    const ab = await ctx.db.query("abandoned").withIndex("by_draft", (q) => q.eq("draftId", input.draftId!)).unique();
    if (ab) await ctx.db.patch(ab._id, { status: "converted", orderId: id, updatedAt: now });
  }
  if (!opts.manual) await ctx.scheduler.runAfter(0, internal.meta.sendOrderEvent, { orderId: id, event: "Lead" });
  return { ok: true, number, id, subtotal, shipping, total: subtotal + shipping, items };
}

export const createFromStorefront = internalMutation({
  args: { input: orderInput, ip: v.optional(v.string()) },
  handler: (ctx, { input, ip }) => createOrderCore(ctx, input, { ip }),
});

export const createManual = mutation({
  args: { token: v.string(), input: orderInput, fromAbandoned: v.optional(v.id("abandoned")) },
  handler: async (ctx, { token, input, fromAbandoned }) => {
    const m = await requireMember(ctx, token, "orders.confirm");
    const r = await createOrderCore(ctx, { ...input, source: { ...(input.source ?? {}), landing: "admin" } }, { manual: true, by: m.name });
    if (r.ok && fromAbandoned) await ctx.db.patch(fromAbandoned, { status: "converted", orderId: r.id, updatedAt: Date.now() });
    return r;
  },
});

/* =========================================================
   Views
   ========================================================= */
function view(o: Doc<"orders">) {
  return {
    id: o._id, number: o.number, createdAt: o._creationTime, status: o.status, name: o.name, phone: o.phone, phone2: o.phone2 ?? null,
    wilayaCode: o.wilayaCode, wilaya: wilayaName(o.wilayaCode, "fr"), wilayaAr: wilayaName(o.wilayaCode, "ar"), commune: o.commune, address: o.address,
    mode: o.mode, stopDeskCode: o.stopDeskCode ?? null, items: o.items, subtotal: o.subtotal, shipping: o.shipping, total: o.total, lang: o.lang,
    campaign: o.source.utm_campaign ?? null, source: o.source.utm_source ?? null, attempts: o.attempts, followUpAt: o.followUpAt ?? null,
    carrier: o.carrier ?? null, tracking: o.tracking ?? null, labelUrl: o.labelUrl ?? null, carrierStatus: o.carrierStatus ?? null,
    carrierError: o.carrierError ?? null, dispatchedAt: o.dispatchedAt ?? null, updatedAt: o.updatedAt,
  };
}
export type OrderView = ReturnType<typeof view>;

export const list = query({
  args: { token: v.string(), status: v.optional(orderStatus), search: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, a) => {
    await requireMember(ctx, a.token);
    const limit = Math.min(a.limit ?? 300, 1000);
    const s = (a.search ?? "").trim();
    const phone = cleanPhone(s);
    let rows: Doc<"orders">[];
    if (phone) rows = await ctx.db.query("orders").withIndex("by_phone", (q) => q.eq("phone", phone)).order("desc").take(limit);
    else if (/^RQ-\d+$/i.test(s)) rows = await ctx.db.query("orders").withIndex("by_number", (q) => q.eq("number", s.toUpperCase())).take(1);
    else if (a.status) rows = await ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", a.status!)).order("desc").take(limit);
    else rows = await ctx.db.query("orders").order("desc").take(limit);
    if (s && !phone && !/^RQ-/i.test(s)) {
      const k = s.toLowerCase();
      rows = rows.filter((o) => (o.name + " " + o.commune + " " + (o.tracking ?? "") + " " + o.phone).toLowerCase().includes(k));
    }
    if (a.status) rows = rows.filter((o) => o.status === a.status);
    return rows.map(view);
  },
});

export const counts = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token);
    const out: Record<string, number> = {};
    for (const st of ["new", "confirmed", "unreachable", "preparing", "shipped", "delivered", "returned", "cancelled"] as OrderStatus[]) {
      const c = await ctx.db.query("counters").withIndex("by_name", (q) => q.eq("name", "status:" + st)).unique();
      out[st] = c?.value ?? 0;
    }
    out.abandoned = (await ctx.db.query("abandoned").withIndex("by_status", (q) => q.eq("status", "open")).take(1000)).length;
    return out;
  },
});

export const get = query({
  args: { token: v.string(), id: v.id("orders") },
  handler: async (ctx, { token, id }) => {
    await requireMember(ctx, token);
    const o = await ctx.db.get(id);
    if (!o) return null;
    const c = await ctx.db.get(o.customerId);
    const others = (await ctx.db.query("orders").withIndex("by_phone", (q) => q.eq("phone", o.phone)).order("desc").take(20)).filter((x) => x._id !== o._id);
    return {
      ...view(o), notes: o.notes, history: o.history, stockConsumed: o.stockConsumed,
      customer: c ? { id: c._id, tags: c.tags, orders: c.orders, delivered: c.delivered, returned: c.returned, cancelled: c.cancelled, unreachable: c.unreachable, spent: c.spent, blocked: !!c.blocked } : null,
      others: others.map((x) => ({ id: x._id, number: x.number, status: x.status, total: x.total, createdAt: x._creationTime })),
    };
  },
});

/* =========================================================
   Status changes
   ========================================================= */
async function bumpCustomer(ctx: MutationCtx, o: Doc<"orders">, field: "delivered" | "returned" | "cancelled" | "unreachable", spent = 0) {
  const c = await ctx.db.get(o.customerId);
  if (c) await ctx.db.patch(c._id, { [field]: c[field] + 1, spent: c.spent + spent });
}

/** Apply a transition with every side effect (stock, customer stats, Meta events). Shared by the admin and the carrier sync. */
export async function transition(ctx: MutationCtx, o: Doc<"orders">, to: OrderStatus, by?: string, note?: string, byId?: Id<"members">) {
  const now = Date.now();
  const patch: Partial<Doc<"orders">> = { updatedAt: now };
  const history = [...o.history];
  if (to === o.status) {
    if (to !== "unreachable") return;
    patch.attempts = o.attempts + 1;
    history.push({ at: now, by, status: to, note: note || `#${o.attempts + 1}` });
    patch.history = history;
    await bumpCustomer(ctx, o, "unreachable");
    await ctx.db.patch(o._id, patch);
    return;
  }
  history.push({ at: now, by, status: to, from: o.status, note });
  patch.status = to;
  await bumpCounter(ctx, "status:" + o.status, -1);
  await bumpCounter(ctx, "status:" + to, 1);
  patch.history = history;
  if (to === "unreachable") { patch.attempts = o.attempts + 1; await bumpCustomer(ctx, o, "unreachable"); }
  if (FINAL[to]) patch.closedAt = now;
  if (to === "new") patch.closedAt = undefined;

  if (CONSUMES[to] && !o.stockConsumed) { await moveOrderStock(ctx, o, "consume", "order " + to, byId); patch.stockConsumed = true; }
  if ((to === "cancelled" || to === "returned") && o.stockConsumed) { await moveOrderStock(ctx, o, "restore", "order " + to, byId); patch.stockConsumed = false; }

  if (to === "delivered") await bumpCustomer(ctx, o, "delivered", o.total);
  if (to === "returned") await bumpCustomer(ctx, o, "returned");
  if (to === "cancelled") await bumpCustomer(ctx, o, "cancelled");
  if (o.status === "cancelled" && to === "new") {
    const c = await ctx.db.get(o.customerId);
    if (c) await ctx.db.patch(c._id, { cancelled: Math.max(0, c.cancelled - 1) });
  }

  await ctx.db.patch(o._id, patch);
  if (to === "confirmed" && !o.meta.purchase) await ctx.scheduler.runAfter(0, internal.meta.sendOrderEvent, { orderId: o._id, event: "Purchase" });
  if (to === "delivered" && !o.meta.delivered) await ctx.scheduler.runAfter(0, internal.meta.sendOrderEvent, { orderId: o._id, event: "OrderDelivered" });
}

export const setStatus = mutation({
  args: { token: v.string(), id: v.id("orders"), to: orderStatus, note: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const m = await requireMember(ctx, a.token);
    if (!can(m.role, permForTransition(a.to))) throw new ConvexError({ code: "forbidden", message: "Your role can't make this change" });
    const o = await ctx.db.get(a.id);
    if (!o) throw new ConvexError({ code: "not_found", message: "Order not found" });
    if (!(o.status === a.to && a.to === "unreachable") && !NEXT[o.status].includes(a.to)) {
      throw new ConvexError({ code: "invalid_transition", message: `Can't go from ${o.status} to ${a.to}` });
    }
    await transition(ctx, o, a.to, m.name, a.note ? clip(a.note, 300) : undefined, m._id);
  },
});

export const bulkStatus = mutation({
  args: { token: v.string(), ids: v.array(v.id("orders")), to: orderStatus },
  handler: async (ctx, a) => {
    const m = await requireMember(ctx, a.token);
    if (!can(m.role, permForTransition(a.to))) throw new ConvexError({ code: "forbidden", message: "Your role can't make this change" });
    let done = 0;
    for (const id of a.ids.slice(0, 200)) {
      const o = await ctx.db.get(id);
      if (o && NEXT[o.status].includes(a.to)) { await transition(ctx, o, a.to, m.name, undefined, m._id); done++; }
    }
    return done;
  },
});

export const addNote = mutation({
  args: { token: v.string(), id: v.id("orders"), text: v.string() },
  handler: async (ctx, a) => {
    const m = await requireMember(ctx, a.token);
    if (!can(m.role, "orders.confirm") && !can(m.role, "orders.ship")) throw new ConvexError({ code: "forbidden", message: "Your role can't add notes" });
    const o = await ctx.db.get(a.id);
    if (!o) throw new ConvexError({ code: "not_found", message: "Order not found" });
    const text = clip(a.text, 500);
    if (!text) return;
    await ctx.db.patch(o._id, { notes: [...o.notes, { at: Date.now(), by: m.name, text }], updatedAt: Date.now() });
  },
});

export const setFollowUp = mutation({
  args: { token: v.string(), id: v.id("orders"), at: v.union(v.number(), v.null()) },
  handler: async (ctx, a) => {
    await requireMember(ctx, a.token, "orders.confirm");
    await ctx.db.patch(a.id, { followUpAt: a.at ?? undefined, updatedAt: Date.now() });
  },
});

/** Edit before dispatch: contact, address, delivery mode, quantities, fee. */
export const edit = mutation({
  args: {
    token: v.string(), id: v.id("orders"),
    fields: v.object({
      name: v.optional(v.string()), phone: v.optional(v.string()), phone2: v.optional(v.string()),
      wilayaCode: v.optional(v.number()), commune: v.optional(v.string()), address: v.optional(v.string()),
      mode: v.optional(deliveryMode), stopDeskCode: v.optional(v.string()),
      items: v.optional(v.array(v.object({ productId: v.optional(v.id("products")), name: v.string(), qty: v.number(), price: v.number() }))),
      shipping: v.optional(v.number()), recomputeShipping: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { token, id, fields: f }) => {
    const m = await requireMember(ctx, token, "orders.confirm");
    const o = await ctx.db.get(id);
    if (!o) throw new ConvexError({ code: "not_found", message: "Order not found" });
    if (o.tracking || FINAL[o.status] || o.status === "shipped") throw new ConvexError({ code: "locked", message: "This order was already shipped or closed" });
    const patch: Partial<Doc<"orders">> = { updatedAt: Date.now() };
    if (f.name !== undefined) patch.name = clip(f.name, 80);
    if (f.phone !== undefined) { const p = cleanPhone(f.phone); if (!p) throw new ConvexError({ code: "invalid", message: "Invalid phone number" }); patch.phone = p; }
    if (f.phone2 !== undefined) patch.phone2 = f.phone2 ? cleanPhone(f.phone2) ?? undefined : undefined;
    if (f.wilayaCode !== undefined) { if (!isValidWilaya(f.wilayaCode)) throw new ConvexError({ code: "invalid", message: "Invalid wilaya" }); patch.wilayaCode = f.wilayaCode; }
    if (f.commune !== undefined) patch.commune = clip(f.commune, 80);
    if (f.address !== undefined) patch.address = clip(f.address, 200);
    if (f.mode !== undefined) patch.mode = f.mode;
    if (f.stopDeskCode !== undefined) patch.stopDeskCode = f.stopDeskCode || undefined;
    let items = o.items;
    if (f.items) {
      if (o.stockConsumed) throw new ConvexError({ code: "locked", message: "Quantities can't change after confirmation (stock already reserved). Cancel and recreate instead." });
      items = f.items.filter((i) => i.qty > 0).map((i) => ({ ...i, qty: Math.min(10, Math.floor(i.qty)) }));
      if (!items.length) throw new ConvexError({ code: "invalid", message: "An order needs at least one product" });
      patch.items = items;
    }
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    let shipping = f.shipping ?? o.shipping;
    if (f.recomputeShipping || ((f.wilayaCode !== undefined || f.mode !== undefined || f.commune !== undefined) && f.shipping === undefined)) {
      const q = await quoteFee(ctx, await getSettings(ctx), patch.wilayaCode ?? o.wilayaCode, patch.commune ?? o.commune, patch.mode ?? o.mode, subtotal);
      if (q === null) throw new ConvexError({ code: "invalid", message: "This delivery mode isn't offered for that wilaya" });
      shipping = q;
    }
    patch.subtotal = subtotal; patch.shipping = shipping; patch.total = subtotal + shipping;
    patch.history = [...o.history, { at: Date.now(), by: m.name, note: "edit: " + Object.keys(f).join(", ") }];
    if (patch.phone && patch.phone !== o.phone) {
      const oldC = await ctx.db.get(o.customerId);
      if (oldC) await ctx.db.patch(oldC._id, { orders: Math.max(0, oldC.orders - 1) });
      const ex = await ctx.db.query("customers").withIndex("by_phone", (q) => q.eq("phone", patch.phone!)).unique();
      if (ex) { await ctx.db.patch(ex._id, { orders: ex.orders + 1, lastOrderAt: Date.now() }); patch.customerId = ex._id; }
      else patch.customerId = await ctx.db.insert("customers", { phone: patch.phone, name: patch.name ?? o.name, tags: [], orders: 1, delivered: 0, returned: 0, cancelled: 0, unreachable: 0, spent: 0, lastOrderAt: Date.now(), wilayaCode: patch.wilayaCode ?? o.wilayaCode });
    }
    await ctx.db.patch(id, patch);
  },
});

/* =========================================================
   Carrier hooks (internal)
   ========================================================= */
export const forDispatch = internalQuery({
  args: { id: v.id("orders") },
  handler: (ctx, { id }) => ctx.db.get(id),
});

/** Lock an order before calling a carrier so a double click can't create two parcels. */
export const claimDispatch = internalMutation({
  args: { id: v.id("orders") },
  handler: async (ctx, { id }) => {
    const o = await ctx.db.get(id);
    if (!o) throw new ConvexError({ code: "not_found", message: "Order not found" });
    if (o.tracking) throw new ConvexError({ code: "already", message: `Already sent to ${o.carrier} (${o.tracking})` });
    if (o.dispatchingAt && Date.now() - o.dispatchingAt < 3 * 60 * 1000) throw new ConvexError({ code: "busy", message: "This order is being sent right now" });
    if (o.status !== "confirmed" && o.status !== "preparing") throw new ConvexError({ code: "invalid", message: "Confirm the order before sending it" });
    await ctx.db.patch(id, { dispatchingAt: Date.now() });
  },
});

export const markDispatched = internalMutation({
  args: { id: v.id("orders"), carrier: v.string(), tracking: v.string(), labelUrl: v.optional(v.string()), parcelId: v.optional(v.string()), by: v.optional(v.string()), warning: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const o = await ctx.db.get(a.id);
    if (!o) return;
    if (o.tracking && o.tracking !== a.tracking) {
      await ctx.db.patch(o._id, { dispatchingAt: undefined, carrierError: `Duplicate parcel created: ${a.carrier} ${a.tracking} — cancel it at the carrier`, updatedAt: Date.now() });
      return;
    }
    await ctx.db.patch(o._id, {
      carrier: a.carrier as Doc<"orders">["carrier"], tracking: a.tracking, labelUrl: a.labelUrl, carrierParcelId: a.parcelId,
      carrierError: a.warning, dispatchedAt: Date.now(), dispatchingAt: undefined, carrierStatus: undefined,
    });
    const fresh = (await ctx.db.get(o._id))!;
    if (fresh.status === "confirmed" || fresh.status === "preparing") await transition(ctx, fresh, "shipped", a.by, `${a.carrier} ${a.tracking}`);
    else await ctx.db.patch(o._id, { carrierError: `Order was ${fresh.status} while sending — cancel parcel ${a.tracking} at ${a.carrier}` });
  },
});

export const markDispatchError = internalMutation({
  args: { id: v.id("orders"), error: v.string() },
  handler: async (ctx, { id, error }) => { await ctx.db.patch(id, { carrierError: clip(error, 400), dispatchingAt: undefined, updatedAt: Date.now() }); },
});

export const clearCarrierError = internalMutation({
  args: { id: v.id("orders") },
  handler: async (ctx, { id }) => { await ctx.db.patch(id, { carrierError: undefined, updatedAt: Date.now() }); },
});

export const clearShipment = internalMutation({
  args: { id: v.id("orders"), by: v.optional(v.string()) },
  handler: async (ctx, { id, by }) => {
    const o = await ctx.db.get(id);
    if (!o) return;
    await ctx.db.patch(id, {
      carrier: undefined, tracking: undefined, labelUrl: undefined, carrierParcelId: undefined, carrierStatus: undefined, dispatchedAt: undefined, carrierError: undefined,
      updatedAt: Date.now(),
    });
    const fresh = (await ctx.db.get(id))!;
    if (fresh.status === "shipped") await transition(ctx, fresh, "preparing", by, `shipment cancelled (${o.carrier} ${o.tracking})`);
  },
});

export const shippedByCarrier = internalQuery({
  args: { carrier: v.string(), limit: v.number() },
  handler: async (ctx, { carrier, limit }) => {
    const rows = await ctx.db.query("orders").withIndex("by_carrier_status", (q) => q.eq("carrier", carrier as never).eq("status", "shipped")).collect();
    return rows
      .filter((o) => o.tracking)
      .sort((a, b) => (a.lastSyncAt ?? 0) - (b.lastSyncAt ?? 0))
      .slice(0, limit)
      .map((o) => ({ id: o._id, tracking: o.tracking!, parcelId: o.carrierParcelId ?? null }));
  },
});

export const applyCarrierState = internalMutation({
  args: { id: v.id("orders"), state: v.string(), raw: v.string() },
  handler: async (ctx, { id, state, raw }) => {
    const o = await ctx.db.get(id);
    if (!o) return;
    await ctx.db.patch(o._id, { carrierStatus: clip(raw, 120), lastSyncAt: Date.now() });
    if (o.status !== "shipped") return; // only shipped orders move automatically
    const s = state as CarrierState;
    if (s === "delivered") await transition(ctx, (await ctx.db.get(id))!, "delivered", "sync", raw);
    else if (s === "returned") await transition(ctx, (await ctx.db.get(id))!, "returned", "sync", raw);
    else if (s === "cancelled") await transition(ctx, (await ctx.db.get(id))!, "cancelled", "sync", "carrier: " + raw);
  },
});

export const touchSync = internalMutation({
  args: { ids: v.array(v.id("orders")) },
  handler: async (ctx, { ids }) => { for (const id of ids) await ctx.db.patch(id, { lastSyncAt: Date.now() }); },
});

export const setMetaFlag = internalMutation({
  args: { id: v.id("orders"), flag: v.union(v.literal("lead"), v.literal("purchase"), v.literal("delivered")) },
  handler: async (ctx, { id, flag }) => {
    const o = await ctx.db.get(id);
    if (o) await ctx.db.patch(id, { meta: { ...o.meta, [flag]: true } });
  },
});

export async function loadOrder(ctx: QueryCtx, id: Id<"orders">) { return ctx.db.get(id); }
