import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireMember } from "./lib/auth";

/**
 * Reserve stock for an order ("consume"), or give back exactly what this order took ("restore").
 * Restoring replays the order's own stock moves, so products that started tracking later are never inflated.
 */
export async function moveOrderStock(ctx: MutationCtx, order: Doc<"orders">, mode: "consume" | "restore", reason: string, by?: Id<"members">) {
  if (mode === "consume") {
    for (const it of order.items) {
      if (!it.productId) continue;
      const p = await ctx.db.get(it.productId);
      if (!p || !p.trackStock) continue;
      const after = p.stock - it.qty;
      await ctx.db.patch(p._id, { stock: after });
      await ctx.db.insert("stockMoves", { productId: p._id, delta: -it.qty, after, reason, orderId: order._id, by });
    }
    return;
  }
  const moves = await ctx.db.query("stockMoves").withIndex("by_order", (q) => q.eq("orderId", order._id)).collect();
  const net = new Map<Id<"products">, number>();
  for (const mv of moves) net.set(mv.productId, (net.get(mv.productId) ?? 0) + mv.delta);
  for (const [pid, delta] of net) {
    if (delta === 0) continue;
    const p = await ctx.db.get(pid);
    if (!p) continue;
    const after = p.stock - delta;
    await ctx.db.patch(pid, { stock: after });
    await ctx.db.insert("stockMoves", { productId: pid, delta: -delta, after, reason, orderId: order._id, by });
  }
}

export const adjust = mutation({
  args: { token: v.string(), productId: v.id("products"), delta: v.optional(v.number()), set: v.optional(v.number()), lowAt: v.optional(v.number()), reason: v.string() },
  handler: async (ctx, a) => {
    const m = await requireMember(ctx, a.token, "stock");
    const p = await ctx.db.get(a.productId);
    if (!p) throw new ConvexError({ code: "not_found", message: "Product not found" });
    const after = a.set !== undefined ? a.set : p.stock + (a.delta ?? 0);
    if (!Number.isFinite(after)) throw new ConvexError({ code: "invalid", message: "Invalid quantity" });
    await ctx.db.patch(p._id, { stock: after, trackStock: true, ...(a.lowAt !== undefined ? { lowAt: a.lowAt } : {}) });
    if (after !== p.stock) await ctx.db.insert("stockMoves", { productId: p._id, delta: after - p.stock, after, reason: a.reason.trim() || "manual", by: m._id });
  },
});

export const overview = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token);
    const ps = await ctx.db.query("products").collect();
    const moves = await ctx.db.query("stockMoves").order("desc").take(80);
    const members = await ctx.db.query("members").collect();
    const orders = new Map<string, string>();
    for (const mv of moves) if (mv.orderId && !orders.has(mv.orderId)) { const o = await ctx.db.get(mv.orderId); if (o) orders.set(mv.orderId, o.number); }
    return {
      products: ps.sort((a, b) => a.sortOrder - b.sortOrder).map((p) => ({ id: p._id, name: p.name, active: p.active, trackStock: p.trackStock, stock: p.stock, lowAt: p.lowAt, sku: p.sku ?? null })),
      moves: moves.map((mv) => ({
        at: mv._creationTime, productId: mv.productId, delta: mv.delta, after: mv.after, reason: mv.reason,
        order: mv.orderId ? orders.get(mv.orderId) ?? null : null, by: members.find((x) => x._id === mv.by)?.name ?? null,
      })),
    };
  },
});
