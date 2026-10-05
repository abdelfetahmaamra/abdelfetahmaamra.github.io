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

export function ecotrack(keys?: Record<string, string>): Carrier {
  const env = (k: string) => keys?.[k] || process.env[k] || "";
  const base = env("ECOTRACK_BASE_URL").replace(/\/+$/, "");
  const token = env("ECOTRACK_TOKEN");
  let host = "EcoTrack";
  try { if (base) host = new URL(base).hostname.split(".")[0].toUpperCase(); } catch { /* invalid URL → generic name */ }
  const name = env("ECOTRACK_NAME") || host;
  const askCollection = env("ECOTRACK_ASK_COLLECTION") === "0" ? "0" : "1";
  // EcoTrack accepts api_token as query param OR Authorization: Bearer header — we send both for max compatibility
  const auth = { Authorization: "Bearer " + token, Accept: "application/json" };

  async function call(method: string, path: string, params?: Record<string, string | undefined>, body?: unknown) {
    // Always inject api_token into query params (EcoTrack primary auth method)
    const allParams: Record<string, string> = { api_token: token };
    if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined) allParams[k] = v;
    const qs = "?" + new URLSearchParams(allParams).toString();
    const r = await http(base + path + qs, { method, headers: { ...auth, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = r.json;
    if (r.status === 429 || j?.message === "Too Many Attempts.") throw new CarrierError(`${name}: rate limit reached (50/min), try again in a minute`);
    if (j === null) throw new CarrierError(`${name} HTTP ${r.status} — response is not valid JSON`);
    if (r.status === 401 || r.status === 403) throw new CarrierError(`${name}: Token rejected (${r.status}) — check the API token in Delivery → API Keys`);
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
        if (!base) return { ok: false, message: "Base URL is missing — enter it in Delivery → API Keys" };
        if (!token) return { ok: false, message: "API Token is missing — enter it in Delivery → API Keys" };
        const r = await http(`${base}/api/v1/validate/token?api_token=${encodeURIComponent(token)}`, { headers: auth });
        const j = r.json;
        if (r.status === 401 || r.status === 403) return { ok: false, message: `Token rejected (HTTP ${r.status}) — check your API token` };
        if (r.status >= 400) return { ok: false, message: `Server error HTTP ${r.status} — check the Base URL (e.g. https://dhd.ecotrack.dz)` };
        if (j === null) return { ok: false, message: `No JSON response — check the Base URL (e.g. https://dhd.ecotrack.dz)` };
        if (j?.success && j?.message === "VALID_TOKEN") return { ok: true, message: `Connected to ${name} ✓` };
        if (j?.message === "TOKEN_NOT_ALLOWED") return { ok: false, message: "API access is disabled — enable it in your EcoTrack courier dashboard" };
        return { ok: false, message: j?.message ?? `Unexpected response — verify Base URL and token` };
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
      const res = await fetch(`${base}/api/v1/get/order/label?api_token=${encodeURIComponent(token)}&tracking=${encodeURIComponent(tracking)}`, { headers: auth });
      if (!res.ok) throw new CarrierError(`${name} label HTTP ${res.status}`);
      return { pdf: await res.arrayBuffer() };
    },
    async cancel(tracking) {
      const r = await http(`${base}/api/v1/delete/order?api_token=${encodeURIComponent(token)}&tracking=${encodeURIComponent(tracking)}`, { method: "DELETE", headers: auth });
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
