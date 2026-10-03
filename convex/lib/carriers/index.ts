import { ecotrack } from "./ecotrack";
import { noest } from "./noest";
import type { Carrier, CarrierCode } from "./types";
import { yalidine } from "./yalidine";
import { zrExpress } from "./zr";

/**
 * Inject DB-stored carrier keys into process.env before reading them.
 * Env vars always take precedence (so Convex Dashboard > DB panel keys).
 */
export function injectKeys(dbKeys?: Record<string, Record<string, string>> | null) {
  if (!dbKeys) return;
  for (const keys of Object.values(dbKeys)) {
    for (const [k, v] of Object.entries(keys)) {
      if (v && !process.env[k]) (process.env as any)[k] = v;
    }
  }
}

export function getCarrier(code: CarrierCode, dbKeys?: Record<string, Record<string, string>> | null): Carrier {
  if (dbKeys) injectKeys(dbKeys);
  switch (code) {
    case "yalidine": return yalidine();
    case "zr_express": return zrExpress();
    case "noest": return noest();
    case "ecotrack": return ecotrack();
  }
}
export const CARRIERS: CarrierCode[] = ["yalidine", "zr_express", "noest", "ecotrack"];
export * from "./types";
