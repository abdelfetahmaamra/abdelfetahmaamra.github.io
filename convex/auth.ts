import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { permsOf } from "./lib/status";
import { role } from "./schema";
import { DAY } from "./lib/util";

const SESSION_DAYS = 30;

/* ---------- internal helpers used by authNode.ts ---------- */
export const memberByEmail = internalQuery({
  args: { email: v.string() },
  handler: (ctx, { email }) => ctx.db.query("members").withIndex("by_email", (q) => q.eq("email", email)).unique(),
});

export const memberByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!s || s.expiresAt < Date.now()) return null;
    const m = await ctx.db.get(s.memberId);
    return m && m.active ? m : null;
  },
});

export const assertPerm = internalQuery({
  args: { token: v.string(), perm: v.string() },
  handler: async (ctx, { token, perm }) => {
    const m = await requireMember(ctx, token, perm as never);
    return m._id;
  },
});

export const throttleLogin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const key = "login:" + email, since = Date.now() - 15 * 60 * 1000;
    const hits = await ctx.db.query("rateHits").withIndex("by_key", (q) => q.eq("key", key).gt("at", since)).collect();
    if (hits.length >= 8) return false;
    await ctx.db.insert("rateHits", { key, at: Date.now() });
    return true;
  },
});

export const createSession = internalMutation({
  args: { memberId: v.id("members"), token: v.string() },
  handler: async (ctx, { memberId, token }) => {
    await ctx.db.insert("sessions", { token, memberId, expiresAt: Date.now() + SESSION_DAYS * DAY });
    await ctx.db.patch(memberId, { lastLoginAt: Date.now() });
  },
});

export const insertMember = internalMutation({
  args: { email: v.string(), name: v.string(), role, passwordHash: v.string() },
  handler: async (ctx, a) => {
    const exists = await ctx.db.query("members").withIndex("by_email", (q) => q.eq("email", a.email)).unique();
    if (exists) throw new ConvexError({ code: "exists", message: "This email already has an account" });
    return ctx.db.insert("members", { ...a, active: true });
  },
});

export const reactivate = internalMutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => { await ctx.db.patch(memberId, { active: true }); },
});

export const patchPassword = internalMutation({
  args: { memberId: v.id("members"), passwordHash: v.string(), keepToken: v.optional(v.string()) },
  handler: async (ctx, { memberId, passwordHash, keepToken }) => {
    await ctx.db.patch(memberId, { passwordHash });
    // Sign the member out everywhere else.
    for (const s of await ctx.db.query("sessions").collect()) if (s.memberId === memberId && s.token !== keepToken) await ctx.db.delete(s._id);
  },
});

/* ---------- public ---------- */
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    try {
      const m = await requireMember(ctx, token);
      return { id: m._id, name: m.name, email: m.email, role: m.role, perms: permsOf(m.role) };
    } catch {
      return null;
    }
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (s) await ctx.db.delete(s._id);
  },
});

export const listMembers = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireMember(ctx, token, "team");
    const ms = await ctx.db.query("members").collect();
    return ms.map((m) => ({ id: m._id, name: m.name, email: m.email, role: m.role, active: m.active, lastLoginAt: m.lastLoginAt }));
  },
});

export const updateMember = mutation({
  args: { token: v.string(), memberId: v.id("members"), role: v.optional(role), active: v.optional(v.boolean()), name: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const me = await requireMember(ctx, a.token, "team");
    if (a.memberId === me._id && (a.role && a.role !== "owner" || a.active === false)) {
      throw new ConvexError({ code: "forbidden", message: "You can't remove your own owner access" });
    }
    const patch: Record<string, unknown> = {};
    if (a.role) patch.role = a.role;
    if (a.active !== undefined) patch.active = a.active;
    if (a.name) patch.name = a.name;
    await ctx.db.patch(a.memberId, patch);
    if (a.active === false) {
      const ss = await ctx.db.query("sessions").collect();
      for (const s of ss) if (s.memberId === a.memberId) await ctx.db.delete(s._id);
    }
  },
});
