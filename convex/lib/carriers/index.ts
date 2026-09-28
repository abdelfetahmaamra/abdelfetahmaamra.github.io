import { ecotrack } from "./ecotrack";
import { noest } from "./noest";
import type { Carrier, CarrierCode } from "./types";
import { yalidine } from "./yalidine";
import { zrExpress } from "./zr";

export function getCarrier(code: CarrierCode): Carrier {
  switch (code) {
    case "yalidine": return yalidine();
    case "zr_express": return zrExpress();
    case "noest": return noest();
    case "ecotrack": return ecotrack();
  }
}
export const CARRIERS: CarrierCode[] = ["yalidine", "zr_express", "noest", "ecotrack"];
export * from "./types";
