import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { DAY, HOUR, wilayaName } from "./lib/util";

const OK = new Set(["confirmed", "preparing", "shipped", "delivered", "returned"]);

export const dashboard = query({
  args: { token: v.string(), days: v.number() },
  handler: async (ctx, { token, days: rawDays }) => {
    await requireMember(ctx, token);
    const days = Math.max(1, Math.min(90, Math.floor(rawDays)));
    const now = Date.now();
    const start = days <= 1 ? new Date(new Date().setHours(0, 0, 0, 0)).getTime() : now - days * DAY;
    const orders = await ctx.db.query("orders").withIndex("by_creation_time", (q) => q.gt("_creationTime", start)).take(8000);

    const processed = orders.filter((o) => o.status !== "new");
    const confirmed = orders.filter((o) => OK.has(o.status));
    const delivered = orders.filter((o) => o.status === "delivered");
    const returned = orders.filter((o) => o.status === "returned");
    const revenue = delivered.reduce((s, o) => s + o.total, 0);

    const series: { day: number; orders: number; confirmed: number }[] = [];
    const nDays = Math.max(1, Math.min(days, 90));
    for (let i = nDays - 1; i >= 0; i--) {
      const d0 = new Date(now - i * DAY); d0.setHours(0, 0, 0, 0);
      const t0 = d0.getTime(), t1 = t0 + DAY;
      const inDay = orders.filter((o) => o._creationTime >= t0 && o._creationTime < t1);
      series.push({ day: t0, orders: inDay.length, confirmed: inDay.filter((o) => OK.has(o.status)).length });
    }

    const prod = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of confirmed) for (const it of o.items) {
      const k = it.productId ?? it.name, p = prod.get(k) ?? { name: it.name, qty: 0, revenue: 0 };
      p.qty += it.qty; p.revenue += it.qty * it.price; prod.set(k, p);
    }
    const wil = new Map<number, { orders: number; delivered: number; returned: number }>();
    for (const o of orders) {
      const w = wil.get(o.wilayaCode) ?? { orders: 0, delivered: 0, returned: 0 };
      w.orders++; if (o.status === "delivered") w.delivered++; if (o.status === "returned") w.returned++; wil.set(o.wilayaCode, w);
    }
    const camp = new Map<string, { orders: number; confirmed: number; delivered: number; revenue: number }>();
    for (const o of orders) {
      const k = o.source.utm_campaign || "";
      const c = camp.get(k) ?? { orders: 0, confirmed: 0, delivered: 0, revenue: 0 };
      c.orders++; if (OK.has(o.status)) c.confirmed++; if (o.status === "delivered") { c.delivered++; c.revenue += o.total; } camp.set(k, c);
    }
    const car = new Map<string, { shipped: number; delivered: number; returned: number; inTransit: number }>();
    for (const o of orders) {
      if (!o.carrier) continue;
      const c = car.get(o.carrier) ?? { shipped: 0, delivered: 0, returned: 0, inTransit: 0 };
      c.shipped++; if (o.status === "delivered") c.delivered++; else if (o.status === "returned") c.returned++; else if (o.status === "shipped") c.inTransit++;
      car.set(o.carrier, c);
    }

    // Alerts are global (not limited to the period).
    const newOrders = await ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", "new")).take(3000);
    const unreach = await ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", "unreachable")).take(3000);
    const shipped = await ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", "shipped")).take(3000);
    const confirmedAll = await ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", "confirmed")).take(3000);
    const products = await ctx.db.query("products").collect();
    const openAb = await ctx.db.query("abandoned").withIndex("by_status", (q) => q.eq("status", "open")).take(1000);

    return {
      kpi: {
        orders: orders.length, pending: orders.filter((o) => o.status === "new").length,
        processed: processed.length, confirmed: confirmed.length, delivered: delivered.length, returned: returned.length,
        revenue, aov: delivered.length ? Math.round(revenue / delivered.length) : 0,
      },
      series,
      products: [...prod.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
      wilayas: [...wil.entries()].map(([code, x]) => ({ code, name: wilayaName(code, "fr"), nameAr: wilayaName(code, "ar"), ...x })).sort((a, b) => b.orders - a.orders).slice(0, 8),
      campaigns: [...camp.entries()].map(([name, x]) => ({ name, ...x })).sort((a, b) => b.orders - a.orders).slice(0, 10),
      carriers: [...car.entries()].map(([code, x]) => ({ code, ...x })),
      alerts: {
        stale: newOrders.filter((o) => now - o._creationTime > 2 * HOUR).length,
        followUps: unreach.filter((o) => !o.followUpAt || o.followUpAt <= now).length,
        toShip: confirmedAll.length,
        carrierErrors: [...confirmedAll, ...(await ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", "preparing")).take(3000))].filter((o) => o.carrierError).length,
        stuck: shipped.filter((o) => o.dispatchedAt && now - o.dispatchedAt > 10 * DAY).length,
        abandoned: openAb.length,
        lowStock: products.filter((p) => p.active && p.trackStock && p.stock > 0 && p.stock <= p.lowAt).map((p) => ({ id: p._id, name: p.name, stock: p.stock })),
        outOfStock: products.filter((p) => p.active && p.trackStock && p.stock <= 0).map((p) => ({ id: p._id, name: p.name })),
      },
    };
  },
});
