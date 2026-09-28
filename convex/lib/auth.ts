import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { can, type Perm } from "./status";

export type Member = Doc<"members">;

/** Resolve the signed-in team member from a session token, or throw. */
export async function requireMember(ctx: QueryCtx | MutationCtx, token: string, perm: Perm = "view"): Promise<Member> {
  if (!token) throw new ConvexError({ code: "unauthenticated", message: "Not signed in" });
  const s = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!s || s.expiresAt < Date.now()) throw new ConvexError({ code: "unauthenticated", message: "Session expired" });
  const m = await ctx.db.get(s.memberId);
  if (!m || !m.active) throw new ConvexError({ code: "unauthenticated", message: "Account disabled" });
  if (!can(m.role, perm)) throw new ConvexError({ code: "forbidden", message: "You don't have access to this" });
  return m;
}
