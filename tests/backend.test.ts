/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.maintenance.seed, {});
  // owner (bypass node scrypt action: insert directly + session)
  const memberId = await t.mutation(internal.auth.insertMember, { email: "o@x.dz", name: "Owner", role: "owner", passwordHash: "x" });
  await t.mutation(internal.auth.createSession, { memberId, token: "tok" });
  const sf = await t.query(api.catalog.storefront, {});
  return { t, sf, token: "tok" };
}

test("storefront order → confirm → stock, customer, stats", async () => {
  const { t, sf, token } = await setup();
  expect(sf.products.length).toBe(8);
  const p = sf.products[0];
  await t.mutation(api.stock.adjust, { token, productId: p.id as any, set: 10, reason: "init" });
  const r: any = await t.mutation(internal.orders.createFromStorefront, { input: { name: "Amina B", phone: "0550 12 34 56", wilayaCode: 60, commune: "Barika", mode: "home", address: "Cité 1", items: [{ productId: p.id, qty: 2 }], draftId: "D1", lang: "ar" }, ip: "1.2.3.4" });
  expect(r.ok).toBe(true);
  expect(r.number).toBe("RQ-10001");
  expect(r.shipping).toBe(600); // Barika ships as Batna, zone N
  expect(r.total).toBe(p.price * 2 + 600);
  // duplicate submit returns the same order
  const dup: any = await t.mutation(internal.orders.createFromStorefront, { input: { name: "Amina B", phone: "0550123456", wilayaCode: 60, commune: "Barika", mode: "home", items: [{ productId: p.id, qty: 2 }], draftId: "D1" } });
  expect(dup.number).toBe("RQ-10001");
  await t.mutation(api.orders.setStatus, { token, id: r.id, to: "confirmed" });
  const st = await t.query(api.stock.overview, { token });
  expect(st.products.find((x: any) => x.id === p.id)!.stock).toBe(8);
  await t.mutation(api.orders.setStatus, { token, id: r.id, to: "cancelled" });
  const st2 = await t.query(api.stock.overview, { token });
  expect(st2.products.find((x: any) => x.id === p.id)!.stock).toBe(10);
  const dash = await t.query(api.stats.dashboard, { token, days: 7 });
  expect(dash.kpi.orders).toBe(1);
  const counts = await t.query(api.orders.counts, { token });
  expect(counts.cancelled).toBe(1);
  // invalid transitions are refused
  await expect(t.mutation(api.orders.setStatus, { token, id: r.id, to: "delivered" })).rejects.toThrow();
});

test("rate limit, validation, desk not offered", async () => {
  const { t, sf, token } = await setup();
  const pid = sf.products[1].id;
  const base = { name: "Sara", phone: "0661000000", wilayaCode: 16, commune: "Bab Ezzouar", mode: "home" as const, items: [{ productId: pid, qty: 1 }] };
  for (let i = 0; i < 3; i++) expect((await t.mutation(internal.orders.createFromStorefront, { input: { ...base, draftId: "d" + i } }) as any).ok).toBe(true);
  expect(((await t.mutation(internal.orders.createFromStorefront, { input: { ...base, draftId: "d9" } })) as any).error).toBe("limit");
  expect(((await t.mutation(internal.orders.createFromStorefront, { input: { ...base, phone: "0212345678" } })) as any).error).toBe("phone");
  await t.mutation(api.shipping.setRate, { token, wilayaCode: 11, home: 1200, desk: null });
  const r: any = await t.mutation(internal.orders.createFromStorefront, { input: { ...base, phone: "0770000000", wilayaCode: 11, commune: "Tamanrasset", mode: "desk" } });
  expect(r.error).toBe("mode_unavailable");
  const r2: any = await t.mutation(internal.orders.createFromStorefront, { input: { ...base, phone: "0770000000", wilayaCode: 11, commune: "Tamanrasset" } });
  expect(r2.shipping).toBe(1200);
});

test("abandoned draft converts; edit order; http endpoint", async () => {
  const { t, sf, token } = await setup();
  const pid = sf.products[2].id;
  await t.mutation(internal.abandoned.upsert, { draftId: "DX", phone: "0555111222", name: "Lina", items: [{ productId: pid, qty: 1 }] });
  let ab = await t.query(api.abandoned.list, { token, status: "open" });
  expect(ab.length).toBe(1);
  const res = await t.fetch("/api/order", { method: "POST", body: JSON.stringify({ name: "Lina M", phone: "0555111222", wilayaCode: 31, commune: "Oran", mode: "desk", items: [{ productId: pid, qty: 1 }], draftId: "DX" }) });
  const j: any = await res.json();
  expect(j.ok).toBe(true);
  ab = await t.query(api.abandoned.list, { token, status: "converted" });
  expect(ab.length).toBe(1);
  const list = await t.query(api.orders.list, { token, search: "0555111222" });
  await t.mutation(api.orders.edit, { token, id: list[0].id as any, fields: { mode: "home", address: "Rue 5" } });
  const o: any = await t.query(api.orders.get, { token, id: list[0].id as any });
  expect(o.mode).toBe("home");
  expect(o.shipping).toBe(600);
  const sfr = await t.fetch("/api/storefront", { method: "GET" });
  expect((await sfr.json() as any).products.length).toBe(8);
});

test("dispatch to Yalidine and sync delivered", async () => {
  const { t, sf, token } = await setup();
  vi.stubEnv("YALIDINE_API_ID", "id"); vi.stubEnv("YALIDINE_API_TOKEN", "tk");
  const r: any = await t.mutation(internal.orders.createFromStorefront, { input: { name: "Nour Hadj", phone: "0770123123", wilayaCode: 16, commune: "Bab Ezzouar", mode: "home", address: "Cité", items: [{ productId: sf.products[0].id, qty: 1 }] } });
  await t.mutation(api.orders.setStatus, { token, id: r.id, to: "confirmed" });
  const calls: any[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
    calls.push({ url, init });
    if (url.includes("/parcels/")) return new Response(JSON.stringify({ [r.number]: { success: true, order_id: r.number, tracking: "yal-ABC123", label: "https://yalidine.app/label/x", message: "ok" } }), { status: 200 });
    if (url.includes("/histories/")) return new Response(JSON.stringify({ has_more: false, total_data: 2, data: [{ date_status: "2026-09-27 10:00:00", status: "Sorti en livraison" }, { date_status: "2026-09-28 12:00:00", status: "Livré" }] }), { status: 200 });
    return new Response("{}", { status: 404 });
  }));
  const d: any = await t.action(api.dispatch.dispatch, { token, id: r.id, carrier: "yalidine" });
  expect(d.ok).toBe(true);
  const body = JSON.parse(calls[0].init.body)[0];
  expect(body.to_wilaya_name).toBe("Alger");
  expect(body.price).toBe(r.total);
  expect(body.freeshipping).toBe(true);
  let o: any = await t.query(api.orders.get, { token, id: r.id });
  expect(o.status).toBe("shipped");
  expect(o.tracking).toBe("yal-ABC123");
  await t.action(internal.dispatch.syncStatuses, {});
  o = await t.query(api.orders.get, { token, id: r.id });
  expect(o.status).toBe("delivered");
  expect(o.carrierStatus).toContain("Livré");
  expect(o.customer.delivered).toBe(1);
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
});

test("permissions: confirmer can't ship or edit settings", async () => {
  const { t, sf } = await setup();
  const mid = await t.mutation(internal.auth.insertMember, { email: "c@x.dz", name: "Conf", role: "confirmer", passwordHash: "x" });
  await t.mutation(internal.auth.createSession, { memberId: mid, token: "ctok" });
  const r: any = await t.mutation(internal.orders.createFromStorefront, { input: { name: "Hind L", phone: "0550999888", wilayaCode: 9, commune: "Blida", mode: "home", items: [{ productId: sf.products[0].id, qty: 1 }] } });
  await t.mutation(api.orders.setStatus, { token: "ctok", id: r.id, to: "confirmed" });
  await expect(t.mutation(api.orders.setStatus, { token: "ctok", id: r.id, to: "preparing" })).rejects.toThrow();
  await expect(t.mutation(api.settings.update, { token: "ctok", patch: { phone: "x" } })).rejects.toThrow();
  await expect(t.query(api.orders.list, { token: "bad" })).rejects.toThrow();
});

test("review fixes: double dispatch, NOEST draft kept, stock replay, counters", async () => {
  const { t, sf, token } = await setup();
  vi.stubEnv("NOEST_API_TOKEN", "tk"); vi.stubEnv("NOEST_USER_GUID", "g");
  const p = sf.products[0];
  const r: any = await t.mutation(internal.orders.createFromStorefront, { input: { name: "Kenza T", phone: "0661223344", wilayaCode: 19, commune: "Sétif", mode: "home", address: "x", items: [{ productId: p.id, qty: 1 }] } });
  await t.mutation(api.orders.setStatus, { token, id: r.id, to: "confirmed" });
  // start tracking stock AFTER confirmation: cancelling must not inflate it
  await t.mutation(api.stock.adjust, { token, productId: p.id as any, set: 5, reason: "init" });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("create/order")) return new Response(JSON.stringify({ success: true, tracking: "NOE-1" }), { status: 200 });
    if (url.includes("valid/order")) return new Response(JSON.stringify({ success: false, message: "busy" }), { status: 200 });
    return new Response("{}", { status: 200 });
  }));
  const d: any = await t.action(api.dispatch.dispatch, { token, id: r.id, carrier: "noest" });
  expect(d.ok).toBe(true);
  let o: any = await t.query(api.orders.get, { token, id: r.id });
  expect(o.tracking).toBe("NOE-1");
  expect(o.carrierError).toContain("not validated");
  await expect(t.action(api.dispatch.dispatch, { token, id: r.id, carrier: "noest" })).rejects.toThrow();
  let c = await t.query(api.orders.counts, { token });
  expect(c.shipped).toBe(1); expect(c.new).toBe(0);
  await t.mutation(internal.orders.applyCarrierState, { id: r.id, state: "returned", raw: "Retour reçu" });
  const st = await t.query(api.stock.overview, { token });
  expect(st.products.find((x: any) => x.id === p.id)!.stock).toBe(5);
  c = await t.query(api.orders.counts, { token });
  expect(c.returned).toBe(1); expect(c.shipped).toBe(0);
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
});
