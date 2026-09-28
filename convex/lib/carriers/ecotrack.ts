/**
 * EcoTrack platform (DHD, Conexlog, Packers, and ~80 other couriers — each has its own https://{name}.ecotrack.dz).
 * Env: ECOTRACK_BASE_URL (e.g. https://dhd.ecotrack.dz), ECOTRACK_TOKEN, optional ECOTRACK_NAME.
 * Rate limit: 50 requests / minute.
 */
import type { CarrierState } from "../status";
import { type Carrier, CarrierError, flattenErrors, http, type TrackResult } from "./types";

const STATUS: Record<string, CarrierState> = {
  prete_a_expedier: "in_transit", prete_a_preparer: "in_transit", en_preparation_stock: "in_transit", en_ramassage: "in_transit",
  vers_hub: "in_transit", en_hub: "in_transit", vers_wilaya: "in_transit", en_preparation: "in_transit",
  en_livraison: "out_for_delivery", suspendu: "attempt_failed",
  livre_non_encaisse: "delivered", encaisse_non_paye: "delivered", paiements_prets: "delivered", paye_et_archive: "delivered",
  retour_chez_livreur: "returned", retour_transit_entrepot: "returned", retour_en_traitement: "returned", retour_recu: "returned", retour_archive: "returned",
  annule: "cancelled",
};
export function mapEcotrack(s: string): CarrierState { return STATUS[s] ?? (s ? "in_transit" : "unknown"); }

export function ecotrack(): Carrier {
  const base = (process.env.ECOTRACK_BASE_URL ?? "").replace(/\/+$/, "");
  const token = process.env.ECOTRACK_TOKEN ?? "";
  let host = "EcoTrack";
  try { if (base) host = new URL(base).hostname.split(".")[0].toUpperCase(); } catch { /* invalid URL → generic name */ }
  const name = process.env.ECOTRACK_NAME || host;
  const askCollection = process.env.ECOTRACK_ASK_COLLECTION === "0" ? "0" : "1";
  const auth = { Authorization: "Bearer " + token, Accept: "application/json" };

  async function call(method: string, path: string, params?: Record<string, string | undefined>, body?: unknown) {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString() : "";
    const r = await http(base + path + qs, { method, headers: { ...auth, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = r.json;
    if (r.status === 429 || j?.message === "Too Many Attempts.") throw new CarrierError(`${name}: rate limit reached (50/min), try again in a minute`);
    if (j === null) throw new CarrierError(`${name} HTTP ${r.status} — response is not valid JSON`);
    if (r.status === 422) throw new CarrierError(`${name}: ${j.message ?? "invalid data"} — ${flattenErrors(j.errors) ?? ""}`);
    if (r.status < 200 || r.status >= 300) throw new CarrierError(`${name} HTTP ${r.status}: ${j.message ?? ""}`);
    if (j.success === false) throw new CarrierError(`${name} ${j.error ?? ""}: ${flattenErrors(j.errors) ?? j.message ?? "request failed"}`);
    return j;
  }

  return {
    code: "ecotrack",
    label: name,
    configured: !!(base && token),
    async test() {
      try {
        const r = await http(`${base}/api/v1/validate/token?api_token=${encodeURIComponent(token)}`, { headers: auth });
        const j = r.json;
        if (j?.success && j?.message === "VALID_TOKEN") return { ok: true, message: "Connected" };
        if (j?.message === "TOKEN_NOT_ALLOWED") return { ok: false, message: "API access is disabled for this account — enable it in the courier's dashboard" };
        return { ok: false, message: j?.message ?? "Invalid token" };
      } catch (e: any) { return { ok: false, message: e.message }; }
    },
    async create(i) {
      const p: Record<string, string | undefined> = {
        nom_client: i.name, telephone: i.phone, adresse: i.address || i.commune, code_wilaya: String(i.wilayaCode), commune: i.commune,
        montant: String(Math.round(i.amount)), type: "1", reference: i.reference, stop_desk: i.stopDesk ? "1" : "0", produit: i.description,
        telephone_2: i.phone2, remarque: i.remarks, weight: i.weight !== undefined ? String(i.weight) : undefined,
      };
      if (i.stopDesk) { if (!i.stationCode) throw new CarrierError(`${name}: choose a stop desk.`); p.code_postal = i.stationCode; }
      const j = await call("POST", "/api/v1/create/order", p);
      if (!j?.tracking) throw new CarrierError(`${name}: create order failed`);
      try { await this.validate!(j.tracking); }
      catch (e: any) { return { tracking: j.tracking, warning: `${name}: parcel created but not validated yet — ${e.message}` }; }
      return { tracking: j.tracking };
    },
    async validate(tracking) {
      await call("POST", "/api/v1/valid/order", { tracking, ask_collection: askCollection });
    },
    async track(items) {
      const out = new Map<string, TrackResult>();
      for (let i = 0; i < items.length; i += 100) {
        const batch = items.slice(i, i + 100).map((x) => x.tracking);
        try {
          const j = await call("GET", "/api/v1/get/orders/status", { api_token: token, trackings: batch.join(","), status: "all" });
          for (const t of batch) {
            const s = j?.data?.[t]?.status;
            if (s) out.set(t, { state: mapEcotrack(String(s)), raw: String(s).replace(/_/g, " ") });
          }
        } catch { /* retry next run */ }
      }
      return out;
    },
    async getLabel(tracking) {
      const res = await fetch(`${base}/api/v1/get/order/label?tracking=${encodeURIComponent(tracking)}`, { headers: { Authorization: "Bearer " + token } });
      if (!res.ok) throw new CarrierError(`${name} label HTTP ${res.status}`);
      return { pdf: await res.arrayBuffer() };
    },
    async cancel(tracking) {
      const r = await http(`${base}/api/v1/delete/order?tracking=${encodeURIComponent(tracking)}`, { method: "DELETE", headers: auth });
      if (r.json?.delete !== "success" && r.json?.success !== true) throw new CarrierError(`${name}: validated parcels can't be deleted`);
    },
    async stopDesks() {
      const j = await call("GET", "/api/v1/get/communes");
      return Object.values(j ?? {})
        .filter((c: any) => Number(c.has_stop_desk) === 1)
        .map((c: any) => ({ code: String(c.code_postal), name: c.nom, wilayaCode: Number(c.wilaya_id) || null, commune: c.nom }));
    },
  };
}
