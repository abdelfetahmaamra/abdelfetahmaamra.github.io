import { internalMutation } from "./_generated/server";

export const updateSettings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").first();
    if (settings) {
      await ctx.db.patch(settings._id, {
        name: { ar: "رونق الحياة", fr: "Ronaq El Hayat" },
        tagline: { 
          ar: "لمسة طبيعية لجمال يومك", 
          fr: "Une touche naturelle pour votre beauté" 
        }
      });
    }
  },
});
