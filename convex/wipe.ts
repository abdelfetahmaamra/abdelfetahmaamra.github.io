import { internalMutation } from "./_generated/server";

export const all = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    for (const p of products) {
      await ctx.db.delete(p._id);
    }
    const categories = await ctx.db.query("categories").collect();
    for (const c of categories) {
      await ctx.db.delete(c._id);
    }
    return "All mock products and categories have been deleted.";
  },
});
