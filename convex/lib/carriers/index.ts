import { ecotrack } from "./ecotrack";
import { noest } from "./noest";
import type { Carrier, CarrierCode } from "./types";
import { yalidine } from "./yalidine";
import { zrExpress } from "./zr";

/**
 * @deprecated process.env mutation doesn't work in Convex's sandboxed runtime.
 * Keys are now passed directly to each carrier factory via getCarrier(code, dbKeys).
 * Kept only for backward-compat with any external callers.
 */
export function injectKeys(dbKeys?: Record<string, Record<string, string>> | null) {
  if (!dbKeys) return;
  for (const keys of Object.values(dbKeys)) {
    for (const [k, v] of Object.entries(keys)) {
      if (v && !process.env[k]) (process.env as any)[k] = v;
    }
  }
}

/**
 * Build a carrier adapter. DB keys are passed directly to each factory so they work
 * even when process.env is read-only (Convex query / action runtime).
 */
export function getCarrier(code: CarrierCode, dbKeys?: Record<string, Record<string, string>> | null): Carrier {
  const k = dbKeys ?? {};
  switch (code) {
    case "yalidine":   return yalidine(k.yalidine);
    case "zr_express": return zrExpress(k.zr_express);
    case "noest":      return noest(k.noest);
    case "ecotrack":   return ecotrack(k.ecotrack);
  }
}
export const CARRIERS: CarrierCode[] = ["yalidine", "zr_express", "noest", "ecotrack"];
export * from "./types";
