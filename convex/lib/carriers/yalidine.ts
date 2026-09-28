/**
 * Yalidine (also Yalitec, Guepex… same platform). API reference behaviour follows the live-tested
 * CodFlow adapter (Apache-2.0). Env: YALIDINE_API_ID, YALIDINE_API_TOKEN, optional YALIDINE_BASE_URL + YALIDINE_PROXY_SECRET.
 */
import type { CarrierState } from "../status";
import { splitName } from "../util";
import { type Carrier, CarrierError, http, pool, short, type TrackResult } from "./types";

const DELIVERED = ["Livré"];
const CANCELLED = ["Annulé"];
const RETURNED = ["Retourné au vendeur", "Retour vers vendeur", "Retour non retiré", "Colis abandonné", "Echange échoué", "Echèc livraison"];
const OUT = ["Sorti en livraison"];
const ATTEMPT = ["Tentative échouée"];

export function mapYalidine(status: string): CarrierState {
  const s = status.trim(), l = s.toLowerCase();
  const has = (list: string[]) => list.some((x) => x === s || x.toLowerCase() === l);
  if (has(DELIVERED)) return "delivered";
  if (has(CANCELLED)) return "cancelled";
  if (has(RETURNED)) return "returned";
  if (has(OUT)) return "out_for_delivery";
  if (has(ATTEMPT)) return "attempt_failed";
  return s ? "in_transit" : "unknown";
}

export function yalidine(): Carrier {
  const id = process.env.YALIDINE_API_ID ?? "";
  const token = process.env.YALIDINE_API_TOKEN ?? "";
  const base = (process.env.YALIDINE_BASE_URL || "https://api.yalidine.app/v1").replace(/\/+$/, "");
  const headers: Record<string, string> = { "X-API-ID": id, "X-API-TOKEN": token, "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.YALIDINE_PROXY_SECRET) headers["X-Proxy-Secret"] = process.env.YALIDINE_PROXY_SECRET;

  async function call(path: string, init: RequestInit = {}) {
    const r = await http(base + path, { ...init, headers });
    if (r.status < 200 || r.status >= 300) {
      const j = r.json;
      const msg = typeof j?.message === "string" ? j.message : typeof j?.error === "string" ? j.error : j?.error?.message;
      throw new CarrierError(msg ? `Yalidine HTTP ${r.status}: ${msg}` : `Yalidine HTTP ${r.status} (body: ${short(r.text)})`);
    }
    return r.json;
  }

  async function paged(path: string, maxPages: number) {
    const out: any[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const j = await call(`${path}${path.includes("?") ? "&" : "?"}page_size=1000&page=${page}`);
      const data = j?.data ?? [];
      out.push(...data);
      if (!j?.has_more || !data.length) break;
    }
    return out;
  }

  return {
    code: "yalidine",
    label: "Yalidine",
    configured: !!(id && token),
    async test() {
      try { await call("/wilayas/?page_size=1"); return { ok: true, message: "Connected" }; }
      catch (e: any) { return { ok: false, message: e.message }; }
    },
    async create(i) {
      const n = splitName(i.name);
      let stopdeskId: number | null = null;
      if (i.stopDesk) {
        if (!i.stationCode) throw new CarrierError("Yalidine: choose a stop desk (pickup center) for this order.");
        stopdeskId = parseInt(i.stationCode, 10);
        if (Number.isNaN(stopdeskId)) throw new CarrierError(`Yalidine: stop desk "${i.stationCode}" is not a valid center id.`);
      }
      if (i.amount > 150000) throw new CarrierError("Yalidine: COD amount above 150 000 DA is not accepted.");
      const parcel = {
        order_id: i.reference,
        from_wilaya_name: i.originWilayaName,
        firstname: n.first,
        familyname: n.last,
        contact_phone: i.phone,
        address: i.address || i.commune,
        to_commune_name: i.commune,
        to_wilaya_name: i.wilayaName,
        product_list: i.description,
        price: Math.round(i.amount),
        do_insurance: false,
        declared_value: Math.round(i.amount),
        length: 1, width: 1, height: 1,
        weight: i.weight ?? 1,
        freeshipping: true, // amount already includes the delivery fee
        is_stopdesk: i.stopDesk,
        stopdesk_id: stopdeskId,
        has_exchange: false,
      };
      const j = await call("/parcels/", { method: "POST", body: JSON.stringify([parcel]) });
      const r = j?.[i.reference] ?? (j ? Object.values(j)[0] : null) as any;
      if (!r) throw new CarrierError("Yalidine: empty answer");
      if (!r.success || !r.tracking) throw new CarrierError("Yalidine: " + (r.message || "parcel creation failed"));
      return { tracking: r.tracking, labelUrl: r.label ?? undefined };
    },
    async track(items) {
      const out = new Map<string, TrackResult>();
      await pool(items, 5, async (it) => {
        const j = await call("/histories/" + encodeURIComponent(it.tracking));
        const rows: any[] = j?.data ?? [];
        if (!rows.length) return;
        const last = rows.reduce((a, b) => (String(b.date_status) > String(a.date_status) ? b : a));
        const raw = String(last.status ?? "") + (last.reason ? ` — ${last.reason}` : "");
        out.set(it.tracking, { state: mapYalidine(String(last.status ?? "")), raw });
      });
      return out;
    },
    async getLabel(tracking) {
      const j = await call("/parcels/" + encodeURIComponent(tracking));
      const p = j?.data?.[0] ?? j;
      if (!p?.label) throw new CarrierError("Yalidine: no label for this parcel");
      return { url: p.label };
    },
    async cancel(tracking) {
      const j = await call("/parcels/" + encodeURIComponent(tracking), { method: "DELETE" });
      const ok = Array.isArray(j) ? j[0]?.deleted === true : j?.deleted === true;
      if (!ok) throw new CarrierError("Yalidine: can only delete parcels still « En préparation »");
    },
    async stopDesks() {
      const rows = await paged("/centers/", 10);
      return rows.map((c) => ({ code: String(c.center_id), name: c.name, wilayaCode: Number(c.wilaya_id) || null, commune: c.commune_name ?? undefined, address: c.address || undefined }));
    },
    async communes() {
      const rows = await paged("/communes/", 5);
      return rows.map((c) => ({ wilayaCode: Number(c.wilaya_id), name: String(c.name) }));
    },
  };
}
