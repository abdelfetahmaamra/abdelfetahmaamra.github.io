/**
 * NOEST Express. Orders are created as drafts and MUST be validated to reach logistics — done automatically here.
 * Env: NOEST_API_TOKEN, NOEST_USER_GUID.
 */
import type { CarrierState } from "../status";
import { type Carrier, CarrierError, flattenErrors, http, type TrackResult } from "./types";

const BASE = "https://app.noest-dz.com";

/** NOEST publishes no status vocabulary; this matches its French event texts/keys (best effort, raw text is always stored). */
export function mapNoest(key: string, text: string): CarrierState {
  const k = (key || "").toLowerCase(), t = (text || "").toLowerCase();
  // Conservative on purpose: only clear terminal events move an order automatically.
  if (["livred", "livre", "delivered", "livraison_effectuee"].includes(k) || /^(colis )?livr[ée]e?(\s|$|\s+au client)/.test(t)) return "delivered";
  if (["return_received", "retour_recu", "retourne_expediteur"].includes(k) || /retour(n[ée]e?)?\s+(re[çc]u|au vendeur|à l'exp[ée]diteur|au partenaire)/.test(t)) return "returned";
  if (/tentative|injoignable|report/.test(t)) return "attempt_failed";
  if (/en livraison|sortie? en livraison|chez le livreur/.test(t)) return "out_for_delivery";
  return k || t ? "in_transit" : "unknown";
}

export function noest(): Carrier {
  const token = process.env.NOEST_API_TOKEN ?? "";
  const guid = process.env.NOEST_USER_GUID ?? "";
  const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json", Accept: "application/json" };

  async function call(method: string, path: string, body?: unknown) {
    const r = await http(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (r.json === null) throw new CarrierError(`NOEST HTTP ${r.status} — response is not valid JSON`);
    if (r.status < 200 || r.status >= 300) throw new CarrierError("NOEST: " + (r.json?.message ?? `HTTP ${r.status}`));
    return r.json;
  }

  return {
    code: "noest",
    label: "NOEST Express",
    configured: !!(token && guid),
    async test() {
      try { const j = await call("GET", "/api/public/desks"); return { ok: !!j && typeof j === "object", message: "Connected" }; }
      catch (e: any) { return { ok: false, message: e.message }; }
    },
    async create(i) {
      const body: Record<string, unknown> = {
        user_guid: guid, client: i.name, phone: i.phone, adresse: i.address || i.commune, wilaya_id: i.wilayaCode, commune: i.commune,
        montant: i.amount, produit: i.description, type_id: 1, stop_desk: i.stopDesk ? 1 : 0, poids: i.weight ?? 0, reference: i.reference,
      };
      if (i.phone2) body.phone_2 = i.phone2;
      if (i.stopDesk) { if (!i.stationCode) throw new CarrierError("NOEST: choose a stop desk station (e.g. 16A)."); body.station_code = i.stationCode; }
      if (i.remarks) body.remarque = i.remarks;
      if (i.canOpen !== undefined) body.can_open = i.canOpen ? 1 : 0;
      const j = await call("POST", "/api/public/create/order", body);
      if (!j?.tracking) throw new CarrierError("NOEST: " + (flattenErrors(j?.errors) ?? j?.message ?? "no tracking number returned"));
      try { await this.validate!(j.tracking); }
      catch (e: any) { return { tracking: j.tracking, warning: "NOEST: parcel created but not validated yet — " + e.message }; }
      return { tracking: j.tracking };
    },
    async validate(tracking) {
      const v = await call("POST", "/api/public/valid/order", { user_guid: guid, tracking });
      if (v?.success === false) throw new CarrierError(v?.message ?? "NOEST validate failed");
    },
    async track(items) {
      const out = new Map<string, TrackResult>();
      for (let i = 0; i < items.length; i += 50) {
        const batch = items.slice(i, i + 50).map((x) => x.tracking);
        try {
          const j = await call("POST", "/api/public/get/trackings/info", { trackings: batch });
          for (const t of batch) {
            const acts: any[] = j?.[t]?.activity ?? [];
            if (!acts.length) continue;
            const last = acts.reduce((a, b) => (String(b.date ?? "") >= String(a.date ?? "") ? b : a));
            out.set(t, { state: mapNoest(last.event_key ?? "", last.event ?? ""), raw: String(last.event ?? last.event_key ?? "") });
          }
        } catch { /* retry next run */ }
      }
      return out;
    },
    async getLabel(tracking) {
      const res = await fetch(`${BASE}/api/public/get/order/label?tracking=${encodeURIComponent(tracking)}`, { headers: { Authorization: "Bearer " + token } });
      if (!res.ok) throw new CarrierError(`NOEST label HTTP ${res.status}`);
      return { pdf: await res.arrayBuffer() };
    },
    async cancel(tracking) {
      const j = await call("POST", "/api/public/delete/order", { user_guid: guid, tracking });
      if (j?.success === false) throw new CarrierError("NOEST: validated parcels can't be deleted — contact NOEST");
    },
    async stopDesks() {
      const j = await call("GET", "/api/public/desks");
      return Object.values(j ?? {}).map((d: any) => {
        const w = parseInt(String(d.code), 10);
        return { code: String(d.code), name: d.name, wilayaCode: w >= 1 && w <= 58 ? w : null, commune: d.commune ?? undefined, address: d.address ?? undefined };
      });
    },
  };
}
