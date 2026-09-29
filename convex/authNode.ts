"use node";
/**
 * Password handling runs in the Node runtime (scrypt). Sessions are created through internal mutations in auth.ts.
 *
 * Create the first owner from the terminal:
 *   npx convex run authNode:createOwner '{"email":"you@example.com","name":"Owner","password":"a-long-password"}'
 */
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { role } from "./schema";

function hash(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return "scrypt$" + salt.toString("hex") + "$" + key.toString("hex");
}
function verify(password: string, stored: string): boolean {
  const [alg, saltHex, keyHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !keyHex) return false;
  const key = scryptSync(password, Buffer.from(saltHex, "hex"), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(keyHex, "hex");
  return want.length === key.length && timingSafeEqual(want, key);
}
function checkPassword(p: string) {
  if (p.length < 10) throw new ConvexError({ code: "weak_password", message: "Password must be at least 10 characters" });
}

export const login = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }): Promise<{ token: string }> => {
    const e = email.trim().toLowerCase();
    const allowed = await ctx.runMutation(internal.auth.throttleLogin, { email: e });
    if (!allowed) throw new ConvexError({ code: "throttled", message: "Too many attempts. Wait 15 minutes." });
    const m = await ctx.runQuery(internal.auth.memberByEmail, { email: e });
    if (!m || !m.active || !verify(password, m.passwordHash)) {
      throw new ConvexError({ code: "bad_login", message: "Wrong email or password" });
    }
    const token = randomBytes(32).toString("hex");
    await ctx.runMutation(internal.auth.createSession, { memberId: m._id, token });
    return { token };
  },
});

/** CLI only (internal): bootstrap the first owner account. */
export const createOwner = internalAction({
  args: { email: v.string(), name: v.string(), password: v.string() },
  handler: async (ctx, a): Promise<string> => {
    checkPassword(a.password);
    await ctx.runMutation(internal.auth.insertMember, { email: a.email.trim().toLowerCase(), name: a.name, role: "owner", passwordHash: hash(a.password) });
    return "Owner created: " + a.email;
  },
});

/**
 * CLI only (internal): forgotten password. Also re-enables the account and signs it out everywhere.
 *   npx convex run authNode:resetPassword '{"email":"you@example.com","password":"a-new-long-password"}'
 */
export const resetPassword = internalAction({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, a): Promise<string> => {
    checkPassword(a.password);
    const email = a.email.trim().toLowerCase();
    const m = await ctx.runQuery(internal.auth.memberByEmail, { email });
    if (!m) throw new ConvexError({ code: "not_found", message: "No account with this email: " + email });
    await ctx.runMutation(internal.auth.patchPassword, { memberId: m._id, passwordHash: hash(a.password) });
    if (!m.active) await ctx.runMutation(internal.auth.reactivate, { memberId: m._id });
    return "Password reset for " + email + " (" + m.role + ")";
  },
});

/** Owner adds a team member. */
export const addMember = action({
  args: { token: v.string(), email: v.string(), name: v.string(), role, password: v.string() },
  handler: async (ctx, a): Promise<void> => {
    await ctx.runQuery(internal.auth.assertPerm, { token: a.token, perm: "team" });
    checkPassword(a.password);
    await ctx.runMutation(internal.auth.insertMember, { email: a.email.trim().toLowerCase(), name: a.name, role: a.role, passwordHash: hash(a.password) });
  },
});

/** Change a password: your own (with the current one), or anyone's if you are the owner. */
export const setPassword = action({
  args: { token: v.string(), memberId: v.optional(v.id("members")), current: v.optional(v.string()), password: v.string() },
  handler: async (ctx, a): Promise<void> => {
    checkPassword(a.password);
    const me = await ctx.runQuery(internal.auth.memberByToken, { token: a.token });
    if (!me) throw new ConvexError({ code: "unauthenticated", message: "Not signed in" });
    const targetId = a.memberId ?? me._id;
    if (targetId !== me._id) {
      if (me.role !== "owner") throw new ConvexError({ code: "forbidden", message: "Only the owner can reset passwords" });
    } else if (!a.current || !verify(a.current, me.passwordHash)) {
      throw new ConvexError({ code: "bad_login", message: "Current password is wrong" });
    }
    await ctx.runMutation(internal.auth.patchPassword, { memberId: targetId, passwordHash: hash(a.password), keepToken: targetId === me._id ? a.token : undefined });
  },
});
