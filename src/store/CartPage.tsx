import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "../lib/icons";
import { tint, Visual } from "./art";
import { Checkout } from "./Checkout";
import { useReveal } from "./Layout";
import { useStore } from "./StoreContext";

export function CartPage() {
  const { t, tx, money, fill, data, cart, cartCount, product, setQty, removeFromCart } = useStore();
  const [leaving, setLeaving] = useState<string | null>(null);
  useReveal([cart.length]);
  const free = data.store.freeShippingFrom;

  if (!cart.length) {
    return (
      <div className="wrap"><div className="panel empty up d1" style={{ marginTop: 40 }}>
        <span style={{ width: 84, height: 84, borderRadius: "50%", background: "var(--blush)", color: "var(--rose-d)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="bag" s={36} /></span>
        <h1 className="disp" style={{ margin: 0, fontSize: 30 }}>{t.cartEmpty}</h1>
        <p className="muted" style={{ margin: 0 }}>{t.cartEmptySub}</p>
        <Link className="btn" to="/#catalog">{t.continueShop}</Link>
      </div></div>
    );
  }
  const sub = cart.reduce((s, l) => s + (product(l.id)?.price || 0) * l.qty, 0), left = free - sub;

  return (
    <div className="wrap">
      <h1 className="disp up d1" style={{ fontSize: "clamp(28px,4vw,42px)", margin: "36px 0 20px" }}>
        {t.cartTitle} <span className="muted" style={{ fontSize: 18, fontFamily: "var(--body)", fontWeight: 400 }}>({cartCount} {t.items})</span>
      </h1>
      <div className="cartgrid">
        <div className="panel up d2" id="lines">
          {free > 0 && (
            <div id="free" style={{ marginBottom: 10 }}>
              <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--teal)", fontWeight: 500 }}>{left > 0 ? fill(t.freeLeft, { x: money(left) }) : t.freeOk}</p>
              <div className="freebar"><i style={{ width: Math.min(100, (sub / free) * 100) + "%" }}></i></div>
            </div>
          )}
          {cart.map((l, i) => {
            const p = product(l.id)!, href = "/product?p=" + encodeURIComponent(p.slug);
            return (
              <div className={"line" + (leaving === p.id ? " out" : "")} key={p.id} style={{ animationDelay: i * 60 + "ms" }}>
                <Link className="th" to={href} style={{ background: tint(p)[2] }}><Visual p={p} w={54} alt={tx(p.name)} /></Link>
                <div>
                  <h3><Link to={href} style={{ color: "inherit", textDecoration: "none" }}>{tx(p.name)}</Link></h3>
                  <span className="muted" style={{ fontSize: 14 }}>{tx(p.size)} · {money(p.price)}</span>
                  <div className="qty" style={{ display: "inline-flex", marginTop: 8 }} role="group" aria-label={t.lQty}>
                    <button type="button" aria-label="−" onClick={() => setQty(p.id, l.qty - 1)}><Icon n="minus" s={16} /></button>
                    <output>{l.qty}</output>
                    <button type="button" aria-label="+" onClick={() => setQty(p.id, l.qty + 1)}><Icon n="plus" s={16} /></button>
                  </div>
                </div>
                <div className="end">
                  <b className="disp" style={{ fontSize: 20 }}>{money(p.price * l.qty)}</b>
                  <button type="button" className="rm" onClick={() => { setLeaving(p.id); setTimeout(() => { removeFromCart(p.id); setLeaving(null); }, 280); }}>{t.remove}</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="panel up d3 pstick" id="order"><Checkout items={() => cart} /></div>
      </div>
    </div>
  );
}
