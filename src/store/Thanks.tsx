import { useEffect, useMemo } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { wilaya, wName } from "../lib/geo";
import { Icon } from "../lib/icons";
import { lsGet, ssGet, ssSet } from "../lib/storage";
import { Steps, useReveal } from "./Layout";
import { track } from "./pixels";
import { useStore } from "./StoreContext";
import type { LastOrder } from "./types";
import { useWaLink } from "./whatsapp";

export function Thanks() {
  const { t, tx, money, fill, lang, data, product, clearCart } = useStore();
  const waLink = useWaLink();
  const [params] = useSearchParams(), n = params.get("n");
  const o = useMemo(() => lsGet<LastOrder | null>("ronaq_last_order", null), []);
  const valid = !!o && (!n || o.number === n);
  useReveal([valid]);

  useEffect(() => {
    if (!valid || !o) return;
    if (o.page && /cart/.test(o.page)) clearCart();
    if (!ssGet("ronaq_tracked_" + o.number, false)) { track("Lead", { value: o.total, ids: o.items.map((l) => l.productId || ""), eventID: o.number + "-Lead" }); ssSet("ronaq_tracked_" + o.number, true); }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#E7B7B9", "#B23A5E", "#BFD3CA", "#E8D2B0"], petals: HTMLElement[] = [];
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("span"); s.className = "petal"; s.style.left = Math.random() * 100 + "vw"; s.style.background = colors[i % 4];
      s.style.animationDuration = 2.8 + Math.random() * 2.4 + "s"; s.style.animationDelay = Math.random() * 0.8 + "s"; document.body.appendChild(s); petals.push(s);
    }
    const tm = setTimeout(() => petals.forEach((p) => p.remove()), 6500);
    return () => { clearTimeout(tm); petals.forEach((p) => p.remove()); };
  }, [valid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!valid || !o) return <Navigate to="/" replace />;
  return (
    <div className="wrap">
      <div className="thanks">
        <div className="okc"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="draw" pathLength={30} d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
        <h1 className="disp up d2" style={{ margin: 0, fontSize: "clamp(28px,4vw,42px)" }}>{t.thanksTitle}</h1>
        <p className="up d3" style={{ margin: 0, fontSize: 17, lineHeight: 1.7, color: "var(--soft)" }}>{fill(t.thanksText, { phone: o.phone, confirm: tx(data.store.confirmDelay), total: money(o.total) })}</p>
        <span className="oid up d3">{t.orderNo} <span dir="ltr">{o.number}</span></span>
        <div className="panel recap up d4">
          <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>{t.recap}</h2>
          <div className="sum">
            {o.items.map((l, i) => { const p = l.productId ? product(l.productId) : undefined; return <div className="l" key={i}><span>{l.qty} × {p ? tx(p.name) : l.name}</span><span>{money(l.price * l.qty)}</span></div>; })}
            <div className="l"><span>{t.ship} · {o.mode === "home" ? t.home : t.desk} · {wName(wilaya(o.wilayaCode), lang)}</span><span>{o.shipping ? money(o.shipping) : t.free}</span></div>
            <hr />
            <div className="tot"><b>{t.total}</b><strong>{money(o.total)}</strong></div>
          </div>
          <p className="muted" style={{ margin: "12px 0 0", fontSize: 14 }}>{fill(t.eta, { d: tx(data.store.deliveryDelay) })}</p>
        </div>
        <div className="up d4" style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%" }}>
          <a className="btn wa" href={waLink(o)} target="_blank" rel="noopener"><Icon n="chat" s={20} /><span>{t.waBtn}</span></a>
          <Link className="btn ghost" to="/">{t.backShop}</Link>
        </div>
      </div>
      <section className="sec" style={{ textAlign: "center" }}><Steps /></section>
    </div>
  );
}
