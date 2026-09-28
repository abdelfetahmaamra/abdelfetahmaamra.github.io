import { internalMutation } from "./_generated/server";
import { DAY } from "./lib/util";
import { DEFAULT_SETTINGS } from "./settings";

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const s of await ctx.db.query("sessions").collect()) if (s.expiresAt < now) await ctx.db.delete(s._id);
    const old = await ctx.db.query("rateHits").collect();
    for (const h of old) if (h.at < now - DAY) await ctx.db.delete(h._id);
  },
});

/**
 * One-time setup with starter categories and products (replace them from the admin afterwards):
 *   npx convex run maintenance:seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (!(await ctx.db.query("settings").first())) await ctx.db.insert("settings", DEFAULT_SETTINGS);
    if (await ctx.db.query("products").first()) return "Products already exist — nothing seeded.";
    const cats: Record<string, string> = {};
    const catDefs: [string, string, string][] = [
      ["face", "الوجه", "Visage"], ["hair", "الشعر", "Cheveux"], ["supp", "المكملات", "Compléments"], ["intimate", "العناية الحميمة", "Hygiène intime"], ["sun", "الحماية من الشمس", "Solaire"],
    ];
    for (let i = 0; i < catDefs.length; i++) {
      const [slug, ar, fr] = catDefs[i];
      cats[slug] = await ctx.db.insert("categories", { slug, name: { ar, fr }, sortOrder: i });
    }
    const P: [string, string, string, string, string, string, number, string, string][] = [
      ["serum-vitamine-c", "face", "سيروم فيتامين C", "Sérum Vitamine C", "30 مل", "30 ml", 2900, "dropper", "rose"],
      ["creme-acide-hyaluronique", "face", "كريم مرطب بحمض الهيالورونيك", "Crème hydratante à l'acide hyaluronique", "50 مل", "50 ml", 2400, "jar", "sage"],
      ["huile-de-ricin", "hair", "زيت الخروع للشعر", "Huile de ricin pour cheveux", "100 مل", "100 ml", 1200, "dropper", "sand"],
      ["shampooing-anti-chute", "hair", "شامبو ضد تساقط الشعر", "Shampooing anti-chute", "250 مل", "250 ml", 1800, "tube", "plum"],
      ["fer-acide-folique", "supp", "الحديد + حمض الفوليك", "Fer + acide folique", "30 كبسولة", "30 gélules", 1600, "jar", "rose"],
      ["collagene-marin", "supp", "كولاجين بحري", "Collagène marin", "30 كيس", "30 sachets", 3500, "jar", "sky"],
      ["gel-intime-doux", "intimate", "غسول حميمي لطيف", "Gel lavant intime doux", "200 مل", "200 ml", 1100, "tube", "sage"],
      ["ecran-solaire-spf50", "sun", "واقي شمس SPF 50+", "Écran solaire SPF 50+", "50 مل", "50 ml", 2200, "tube", "sand"],
    ];
    for (let i = 0; i < P.length; i++) {
      const [slug, cat, ar, fr, sar, sfr, price, shape, tint] = P[i];
      await ctx.db.insert("products", {
        slug, name: { ar, fr }, size: { ar: sar, fr: sfr }, price, categoryId: cats[cat] as never, images: [], shape, tint, active: true,
        trackStock: false, stock: 0, lowAt: 5, sortOrder: i,
        desc: { ar: "[وصف قصير للمنتج ولمن هو موجّه.]", fr: "[Courte description du produit et à qui il s'adresse.]" },
      });
    }
    return "Seeded 5 categories and 8 example products.";
  },
});
