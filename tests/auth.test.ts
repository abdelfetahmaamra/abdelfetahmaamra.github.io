// @vitest-environment node
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");

test("owner bootstrap, login, add member, throttle", async () => {
  const t = convexTest(schema, modules);
  await t.action(internal.authNode.createOwner, { email: "Owner@Ronaq.dz", name: "Isla", password: "a-very-long-pass" });
  const { token } = await t.action(api.authNode.login, { email: "owner@ronaq.dz", password: "a-very-long-pass" });
  const me = await t.query(api.auth.me, { token });
  expect(me?.role).toBe("owner");
  await t.action(api.authNode.addMember, { token, email: "c@r.dz", name: "Conf", role: "confirmer", password: "another-long-pass" });
  const ms = await t.query(api.auth.listMembers, { token });
  expect(ms.length).toBe(2);
  await expect(t.action(api.authNode.login, { email: "c@r.dz", password: "wrong-password" })).rejects.toThrow();
  const c = await t.action(api.authNode.login, { email: "c@r.dz", password: "another-long-pass" });
  await expect(t.query(api.auth.listMembers, { token: c.token })).rejects.toThrow();
  await t.action(api.authNode.setPassword, { token: c.token, current: "another-long-pass", password: "new-long-password" });
  await t.action(api.authNode.login, { email: "c@r.dz", password: "new-long-password" });
});
