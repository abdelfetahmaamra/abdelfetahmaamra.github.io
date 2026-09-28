import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireMember } from "./lib/auth";
import { cleanPhone, wilayaName } from "./lib/util";

/** Automatic reliability badges computed from delivery history. */
function reliability(c: Doc<"customers">): string[] {
  const out: string[] = [];
  if (c.returned >= 2 || (c.returned >= 1 && c.returned >= c.delivered)) out.push("risk");
  else if (c.delivered >= 3) out.push("loyal");
  if (c.unreachable >= 3 && c.unreachable > c.delivered) out.push("unreachable");
  if (c.orders <= 1 && !out.length) out.push("new");
  return out;
}

export const list = query({
  args: { token: v.string(), search: v.optional(v.string()), tag: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await requireMember(ctx, a.token);
    const phone = a.search ? cleanPhone(a.search) : null;
    let rows = phone
      ? await ctx.db.query("customers").withIndex("by_phone", (q) => q.eq("phone", phone)).collect()
      : await ctx.db.query("customers").order("desc").take(1000);
    if (a.search && !phone) { const k = a.search.toLowerCase(); rows = rows.filter((c) => (c.name + " " + c.phone).toLowerCase().includes(k)); }
    if (a.tag) rows = rows.filter((c) => c.tags.includes(a.tag!) || reliability(c).includes(a.tag!));
    rows.sort((x, y) => y.lastOrderAt - x.lastOrderAt);
    return rows.slice(0, 500).map((c) => ({
      id: c._id, phone: c.phone, name: c.name, tags: c.tags, auto: reliability(c), orders: c.orders, delivered: c.delivered, returned: c.returned,
      cancelled: c.cancelled, unreachable: c.unreachable, spent: c.spent, lastOrderAt: c.lastOrderAt, blocked: !!c.blocked,
      wilaya: c.wilayaCode ? wilayaName(c.wilayaCode, "fr") : null, wilayaAr: c.wilayaCode ? wilayaName(c.wilayaCode, "ar") : null,
    }));
  },
});

export const allTags = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token);
    const set = new Set<string>();
    for (const c of await ctx.db.query("customers").collect()) c.tags.forEach((t) => set.add(t));
    return [...set].sort();
  },
});

export const update = mutation({
  args: { token: v.string(), id: v.id("customers"), tags: v.optional(v.array(v.string())), blocked: v.optional(v.boolean()), name: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await requireMember(ctx, a.token, "orders.confirm");
    const patch: Partial<Doc<"customers">> = {};
    if (a.tags) patch.tags = [...new Set(a.tags.map((t) => t.trim().slice(0, 30)).filter(Boolean))].slice(0, 12);
    if (a.blocked !== undefined) patch.blocked = a.blocked;
    if (a.name) patch.name = a.name.slice(0, 80);
    await ctx.db.patch(a.id, patch);
  },
});

export const orders = query({
  args: { token: v.string(), id: v.id("customers") },
  handler: async (ctx, { token, id }) => {
    await requireMember(ctx, token);
    const rows = await ctx.db.query("orders").withIndex("by_customer", (q) => q.eq("customerId", id)).order("desc").take(50);
    return rows.map((o) => ({ id: o._id, number: o.number, status: o.status, total: o.total, createdAt: o._creationTime }));
  },
});
