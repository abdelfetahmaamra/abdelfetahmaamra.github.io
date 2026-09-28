import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { wilaya, WILAYAS } from "./lib/wilayas";
import { getSettings, type Settings } from "./settings";
import { carrierCode, deliveryMode } from "./schema";
import { normKey } from "./lib/util";

type Mode = "home" | "desk";

/** Delivery fee for a destination, or null when that mode isn't offered there. Commune override > wilaya override > zone default. */
export async function quoteFee(
  ctx: QueryCtx | MutationCtx,
  settings: Settings,
  wilayaCode: number,
  commune: string | undefined,
  mode: Mode,
  subtotal: number,
): Promise<number | null> {
  const w = wilaya(wilayaCode);
  if (!w) return null;
  let fee: number | undefined | null = undefined;
  if (commune) {
    const rows = await ctx.db.query("shippingRates").withIndex("by_wilaya", (q) => q.eq("wilayaCode", wilayaCode)).collect();
    const key = normKey(commune);
    const c = rows.find((r) => r.commune && normKey(r.commune) === key);
    if (c) fee = c[mode] ?? null;
    if (fee === undefined) {
      const wr = rows.find((r) => r.commune === undefined);
      if (wr) fee = wr[mode] ?? null;
    }
  } else {
    const wr = await ctx.db.query("shippingRates").withIndex("by_wilaya", (q) => q.eq("wilayaCode", wilayaCode).eq("commune", undefined)).first();
    if (wr) fee = wr[mode] ?? null;
  }
  if (fee === null) return null;
  if (fee === undefined) fee = settings.zoneFees[w.z][mode];
  if (settings.freeShippingFrom > 0 && subtotal >= settings.freeShippingFrom) return 0;
  return fee;
}

/** Full rate table the storefront uses to show prices instantly. */
export async function publicRates(ctx: QueryCtx) {
  const rows = await ctx.db.query("shippingRates").collect();
  return rows.map((r) => ({ w: r.wilayaCode, c: r.commune ?? null, h: r.home ?? null, d: r.desk ?? null }));
}

export const rates = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token);
    const s = await getSettings(ctx);
    const rows = await ctx.db.query("shippingRates").collect();
    return {
      zoneFees: s.zoneFees,
      rows: WILAYAS.map((w) => {
        const wr = rows.find((r) => r.wilayaCode === w.c && r.commune === undefined);
        return {
          code: w.c, name: w.n, nameAr: w.a, zone: w.z,
          home: wr ? wr.home ?? null : s.zoneFees[w.z].home,
          desk: wr ? wr.desk ?? null : s.zoneFees[w.z].desk,
          custom: !!wr,
          communes: rows.filter((r) => r.wilayaCode === w.c && r.commune !== undefined).map((r) => ({ id: r._id, commune: r.commune!, home: r.home ?? null, desk: r.desk ?? null })),
        };
      }),
    };
  },
});

/** Set a wilaya-wide or commune rate. `null` = mode not offered; `reset` removes the override. */
export const setRate = mutation({
  args: {
    token: v.string(),
    wilayaCode: v.number(),
    commune: v.optional(v.string()),
    home: v.union(v.number(), v.null()),
    desk: v.union(v.number(), v.null()),
    reset: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    await requireMember(ctx, a.token, "settings");
    const commune = a.commune?.trim() || undefined;
    const existing = await ctx.db.query("shippingRates").withIndex("by_wilaya", (q) => q.eq("wilayaCode", a.wilayaCode).eq("commune", commune)).first();
    if (a.reset) { if (existing) await ctx.db.delete(existing._id); return; }
    const doc = { wilayaCode: a.wilayaCode, commune, home: a.home ?? undefined, desk: a.desk ?? undefined };
    if (existing) await ctx.db.replace(existing._id, doc);
    else await ctx.db.insert("shippingRates", doc);
  },
});

export const stopDesks = query({
  args: { carrier: carrierCode, wilayaCode: v.number() },
  handler: async (ctx, { carrier, wilayaCode }) => {
    const w = wilaya(wilayaCode);
    const code = w ? w.s : wilayaCode;
    const rows = await ctx.db.query("stopDesks").withIndex("by_carrier_wilaya", (q) => q.eq("carrier", carrier).eq("wilayaCode", code)).collect();
    return rows.map((d) => ({ code: d.code, name: d.name, commune: d.commune ?? null, address: d.address ?? null }));
  },
});

export const quote = query({
  args: { wilayaCode: v.number(), commune: v.optional(v.string()), mode: deliveryMode, subtotal: v.number() },
  handler: async (ctx, a) => quoteFee(ctx, await getSettings(ctx), a.wilayaCode, a.commune, a.mode, a.subtotal),
});
