import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { cleanPhone, clip, wilayaName } from "./lib/util";

/** Storefront: keep a draft of an unfinished checkout once a valid phone was typed. */
export const upsert = internalMutation({
  args: {
    draftId: v.string(), name: v.optional(v.string()), phone: v.string(), wilayaCode: v.optional(v.number()), commune: v.optional(v.string()),
    items: v.array(v.object({ productId: v.string(), qty: v.number() })), page: v.optional(v.string()), lang: v.optional(v.string()),
    ip: v.optional(v.string()),
  },
  handler: async (ctx, { ip, ...a }) => {
    const phone = cleanPhone(a.phone);
    if (!phone || a.draftId.length > 60) return;
    if (ip) {
      const key = "ab:" + ip, since = Date.now() - 10 * 60 * 1000;
      const hits = await ctx.db.query("rateHits").withIndex("by_key", (q) => q.eq("key", key).gt("at", since)).take(40);
      if (hits.length >= 30) return;
      await ctx.db.insert("rateHits", { key, at: Date.now() });
    }
    const items = [];
    let total = 0;
    for (const it of a.items.slice(0, 20)) {
      const id = ctx.db.normalizeId("products", it.productId);
      const p = id ? await ctx.db.get(id) : null;
      if (!p) continue;
      const qty = Math.min(10, Math.max(1, Math.floor(it.qty || 1)));
      items.push({ productId: p._id, name: p.name.fr, qty, price: p.price });
      total += qty * p.price;
    }
    const doc = {
      draftId: a.draftId, phone, name: clip(a.name, 80), wilayaCode: a.wilayaCode, commune: a.commune ? clip(a.commune, 80) : undefined,
      items, total, page: a.page ? clip(a.page, 120) : undefined, lang: a.lang === "fr" ? "fr" : "ar", updatedAt: Date.now(),
    };
    const ex = await ctx.db.query("abandoned").withIndex("by_draft", (q) => q.eq("draftId", a.draftId)).unique();
    if (ex) { if (ex.status !== "converted") await ctx.db.patch(ex._id, doc); }
    else await ctx.db.insert("abandoned", { ...doc, status: "open" });
  },
});

export const list = query({
  args: { token: v.string(), status: v.optional(v.union(v.literal("open"), v.literal("contacted"), v.literal("converted"), v.literal("ignored"))) },
  handler: async (ctx, { token, status }) => {
    await requireMember(ctx, token);
    const rows = status
      ? await ctx.db.query("abandoned").withIndex("by_status", (q) => q.eq("status", status)).order("desc").take(300)
      : await ctx.db.query("abandoned").order("desc").take(300);
    return rows.map((a) => ({
      id: a._id, draftId: a.draftId, at: a.updatedAt, status: a.status, name: a.name, phone: a.phone, wilayaCode: a.wilayaCode ?? null,
      wilaya: a.wilayaCode ? wilayaName(a.wilayaCode, "fr") : null, wilayaAr: a.wilayaCode ? wilayaName(a.wilayaCode, "ar") : null,
      commune: a.commune ?? null, items: a.items, total: a.total, lang: a.lang, orderId: a.orderId ?? null,
    }));
  },
});

export const setStatus = mutation({
  args: { token: v.string(), id: v.id("abandoned"), status: v.union(v.literal("open"), v.literal("contacted"), v.literal("ignored")) },
  handler: async (ctx, { token, id, status }) => {
    await requireMember(ctx, token, "orders.confirm");
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});
