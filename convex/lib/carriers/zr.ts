/**
 * ZR Express (new platform, api.zrexpress.app). Flow follows the live-tested CodFlow adapter (Apache-2.0):
 * create customer → resolve territories → create parcel → read tracking number.
 * Env: ZR_API_KEY, ZR_TENANT_ID.
 */
import type { CarrierState } from "../status";
import { stripAccents } from "../util";
import { type Carrier, CarrierError, flattenErrors, http, pool, type StopDesk, type TrackResult } from "./types";

const BASE = "https://api.zrexpress.app/api/v1";
export const ZR_UNSERVED = [33, 37, 50, 56];

const MAP: [CarrierState, string[]][] = [
  ["delivered", ["livre", "livre au client", "encaisse", "recouvert"]],
  ["returned", ["retour_sous_traitant", "colis_recupere", "attente_recuperation_fournisseur", "reinjecte_dans_stock", "recupere_par_fournisseur", "remboursement_reinjecte"]],
  ["out_for_delivery", ["en_livraison", "sortie_en_livraison", "out for delivery"]],
  ["in_transit", ["commande_recue", "en_traitement", "appel_confirmation", "en_preparation", "commande_confirmee", "pret_a_expedier", "confirme_au_bureau", "confirme_chez_partenaire", "dispatch", "vers_wilaya", "in transit", "at hub"]],
];
export function mapZr(name: string, description?: string, isReturn?: boolean): CarrierState {
  if (isReturn) return "returned";
  for (const raw of [name, description]) {
    if (!raw) continue;
    const k = stripAccents(raw).toLowerCase().trim();
    for (const [state, keys] of MAP) if (keys.includes(k)) return state;
  }
  return name ? "in_transit" : "unknown";
}

function zrPhone(p: string) {
  const s = p.trim().replace(/\s+/g, "");
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return "+" + s.slice(2);
  if (s.startsWith("0") && s.length === 10) return "+213" + s.slice(1);
  return "+" + s;
}

export function zrExpress(keys?: Record<string, string>): Carrier {
  const env = (k: string) => keys?.[k] || process.env[k] || "";
  const key = env("ZR_API_KEY");
  const tenant = env("ZR_TENANT_ID");
  const headers = { "X-Api-Key": key, "X-Tenant": tenant, "Content-Type": "application/json", Accept: "application/json" };
  const cityCache = new Map<number, string>();
  let hubCache: any[] | null = null;

  async function call(method: string, path: string, body?: unknown) {
    const r = await http(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (r.status < 200 || r.status >= 300) {
      const j = r.json;
      const msg = [j?.title, j?.detail, flattenErrors(j?.errors)].filter(Boolean).join(" — ") || j?.message || `ZR Express HTTP ${r.status}`;
      throw new CarrierError("ZR Express: " + msg);
    }
    if ((method === "GET" || method === "POST") && r.json === null && r.text) throw new CarrierError(`ZR Express HTTP ${r.status} — response is not valid JSON`);
    return r.json;
  }
  const search = (keyword: string, extra: Record<string, unknown> = {}) => call("POST", "/territories/search", { keyword, pageSize: 50, pageNumber: 1, ...extra });

  async function cityId(wilayaCode: number, wilayaName: string) {
    if (cityCache.has(wilayaCode)) return cityCache.get(wilayaCode)!;
    let items: any[] = (await search(stripAccents(wilayaName)))?.items ?? [];
    let hit = items.find((t) => Number(t.code) === wilayaCode && t.level === "wilaya");
    if (!hit) {
      items = (await search(String(wilayaCode), { pageSize: 200 }))?.items ?? [];
      hit = items.find((t) => Number(t.code) === wilayaCode && t.level === "wilaya");
    }
    if (!hit) throw new CarrierError(`ZR Express doesn't serve wilaya ${wilayaCode}`);
    cityCache.set(wilayaCode, hit.id);
    return hit.id as string;
  }
  async function districtId(city: string, commune: string) {
    const items: any[] = ((await search(stripAccents(commune)))?.items ?? []).filter((t: any) => t.level === "commune");
    const hit = items.find((t) => t.parentId === city) ?? items.find((t) => stripAccents(t.name).toLowerCase() === stripAccents(commune).toLowerCase());
    if (!hit) throw new CarrierError(`ZR Express: commune "${commune}" not found — check the spelling`);
    return hit.id as string;
  }
  async function hubs() {
    if (hubCache) return hubCache;
    const all: any[] = [];
    for (let n = 1; n <= 10; n++) {
      const j = await call("POST", "/hubs/search", { pageSize: 200, pageNumber: n });
      const items = j?.items ?? [];
      all.push(...items);
      if (!items.length || n >= (j?.totalPages ?? 1)) break;
    }
    hubCache = all;
    return all;
  }

  return {
    code: "zr_express",
    label: "ZR Express",
    configured: !!(key && tenant),
    async test() {
      try { await search("Alger"); return { ok: true, message: "Connected" }; }
      catch (e: any) { return { ok: false, message: e.message }; }
    },
    async create(i) {
      if (ZR_UNSERVED.includes(i.wilayaCode)) throw new CarrierError("ZR Express doesn't deliver to this wilaya");
      const phone = { number1: zrPhone(i.phone), ...(i.phone2 ? { number2: zrPhone(i.phone2) } : {}) };
      const cust = await call("POST", "/customers/individual", { name: i.name, phone });
      if (!cust?.id) throw new CarrierError("ZR Express: customer creation returned no ID");
      let city: string, district: string, hubId: string | undefined;
      if (i.stopDesk) {
        if (!i.stationCode) throw new CarrierError("ZR Express: choose a pickup point (hub) for this order.");
        const hub = (await hubs()).find((h) => h.id === i.stationCode || h.address?.districtTerritoryId === i.stationCode);
        if (!hub) throw new CarrierError("ZR Express: this pickup point no longer exists. Re-sync the stop desks.");
        city = hub.address?.cityTerritoryId; district = hub.address?.districtTerritoryId; hubId = hub.id;
        if (!city || !district) throw new CarrierError("ZR Express: pickup point has no address");
      } else {
        city = await cityId(i.wilayaCode, i.wilayaName);
        district = await districtId(city, i.commune);
      }
      const created = await call("POST", "/parcels", {
        customer: { customerId: cust.id, name: i.name, phone },
        deliveryAddress: { cityTerritoryId: city, districtTerritoryId: district, street: i.address || null },
        deliveryType: i.stopDesk ? "pickup-point" : "home",
        amount: i.amount,
        description: i.description,
        externalId: i.reference,
        orderedProducts: [{ productName: i.description, unitPrice: i.amount, quantity: 1, stockType: "none" }],
        ...(hubId ? { hubId } : {}),
      });
      if (!created?.id) throw new CarrierError("ZR Express: parcel creation returned no ID");
      const parcel = await call("GET", "/parcels/" + created.id);
      if (!parcel?.trackingNumber) throw new CarrierError("ZR Express: tracking number not available yet — try again in a minute");
      return { tracking: parcel.trackingNumber, parcelId: created.id };
    },
    async track(items) {
      const out = new Map<string, TrackResult>();
      await pool(items, 5, async (it) => {
        const p = await call("GET", "/parcels/" + encodeURIComponent(it.parcelId || it.tracking));
        const name = p?.state?.name ?? "", desc = p?.state?.description ?? "";
        out.set(it.tracking, { state: mapZr(name, desc, p?.isReturn === true), raw: desc || name });
      });
      return out;
    },
    async getLabel(tracking) {
      const j = await call("POST", "/parcels/labels/individual/pdf", { trackingNumbers: [tracking], format: "a6" });
      const url = j?.parcelLabelFiles?.[0]?.fileUrl;
      if (!url) throw new CarrierError("ZR Express: label not available");
      return { url };
    },
    async cancel(tracking) {
      const r = await http(BASE + "/parcels/bulk/by-tracking-number", { method: "DELETE", headers, body: JSON.stringify({ trackingNumbers: [tracking] }) });
      const j = r.json;
      if (j?.successCount === 1) return;
      const msgs = (j?.failures ?? []).map((f: any) => f.errorMessage).join("; ");
      if (/not found|404/i.test(msgs) || r.status === 404) return;
      throw new CarrierError("ZR Express: " + (msgs || `cancel failed (HTTP ${r.status})`));
    },
    async stopDesks() {
      const wmap = new Map<string, number>();
      for (let n = 1; n <= 5; n++) {
        const j = await call("POST", "/territories/search", { keyword: "", pageSize: 1000, pageNumber: n });
        const items = j?.items ?? [];
        for (const t of items) if (t.level === "wilaya") wmap.set(t.id, Number(t.code));
        if (!items.length || n >= (j?.totalPages ?? 1)) break;
      }
      const out: StopDesk[] = [];
      for (const h of await hubs()) {
        if (!h.isPickupPoint) continue;
        out.push({ code: h.id, name: h.name ?? h.id, wilayaCode: wmap.get(h.address?.cityTerritoryId) ?? null, commune: h.address?.district ?? undefined, address: h.address?.street ?? undefined });
      }
      return out;
    },
  };
}
