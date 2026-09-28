import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireMember } from "./lib/auth";
import { carrierCode, i18n } from "./schema";

export type Settings = Omit<Doc<"settings">, "_id" | "_creationTime">;

export const DEFAULT_SETTINGS: Settings = {
  key: "store",
  name: { ar: "رونق الحياة", fr: "Ronaq El Hayat" },
  tagline: { ar: "بارافارماسي للمرأة", fr: "Parapharmacie pour elle" },
  phone: "0676 61 04 57",
  whatsapp: "213676610457",
  freeShippingFrom: 0,
  confirmDelay: { ar: "24 ساعة", fr: "24 h" },
  deliveryDelay: { ar: "2 إلى 5 أيام", fr: "2 à 5 jours" },
  zoneFees: { A: { home: 400, desk: 250 }, N: { home: 600, desk: 400 }, S: { home: 900, desk: 600 } },
  defaultCarrier: undefined,
  originWilaya: 16,
  canOpenParcel: true,
  fbPixelId: undefined,
  tiktokPixelId: undefined,
  maxOrdersPerPhonePerDay: 3,
};

export async function getSettings(ctx: QueryCtx | MutationCtx): Promise<Settings> {
  const s = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "store")).unique();
  return s ?? DEFAULT_SETTINGS;
}

export const get = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token);
    return getSettings(ctx);
  },
});

const fee = v.object({ home: v.number(), desk: v.number() });

export const update = mutation({
  args: {
    token: v.string(),
    patch: v.object({
      name: v.optional(i18n),
      tagline: v.optional(i18n),
      phone: v.optional(v.string()),
      whatsapp: v.optional(v.string()),
      freeShippingFrom: v.optional(v.number()),
      confirmDelay: v.optional(i18n),
      deliveryDelay: v.optional(i18n),
      zoneFees: v.optional(v.object({ A: fee, N: fee, S: fee })),
      defaultCarrier: v.optional(v.union(carrierCode, v.null())),
      originWilaya: v.optional(v.number()),
      canOpenParcel: v.optional(v.boolean()),
      fbPixelId: v.optional(v.string()),
      tiktokPixelId: v.optional(v.string()),
      maxOrdersPerPhonePerDay: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { token, patch }) => {
    await requireMember(ctx, token, "settings");
    const { defaultCarrier, ...rest } = patch;
    const clean: Partial<Settings> = { ...rest };
    if (defaultCarrier !== undefined) clean.defaultCarrier = defaultCarrier ?? undefined;
    const s = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "store")).unique();
    if (s) await ctx.db.patch(s._id, clean);
    else await ctx.db.insert("settings", { ...DEFAULT_SETTINGS, ...clean });
  },
});
