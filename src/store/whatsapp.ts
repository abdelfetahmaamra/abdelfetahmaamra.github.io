import { wilaya, wName } from "../lib/geo";
import { useStore } from "./StoreContext";
import type { LastOrder } from "./types";

/** WhatsApp message with the full order, so a customer can still order when the network fails. */
export function useWaLink() {
  const { t, tx, money, product, lang, data } = useStore();
  return (o: LastOrder) => {
    const L = [t.waIntro + (o.number ? " (" + o.number + ")" : "")];
    o.items.forEach((l) => { const p = l.productId ? product(l.productId) : undefined; L.push("• " + l.qty + " × " + (p ? tx(p.name) : l.name) + " — " + money(l.price * l.qty)); });
    L.push(t.delivery + ": " + (o.mode === "home" ? t.home : t.desk) + " · " + wName(wilaya(o.wilayaCode), lang) + " / " + o.commune);
    if (o.address) L.push(o.address);
    L.push(t.total + ": " + money(o.total)); L.push(o.name + " · " + o.phone);
    return "https://wa.me/" + String(data.store.whatsapp || "").replace(/\D/g, "") + "?text=" + encodeURIComponent(L.join("\n"));
  };
}
