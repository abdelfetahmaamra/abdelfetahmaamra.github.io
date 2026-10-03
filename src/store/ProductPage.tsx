import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Icon, Pattern, Sparkle } from "../lib/icons";
import { Art, tint } from "./art";
import { Checkout } from "./Checkout";
import { AddedToast } from "./Home";
import { Steps, useReveal } from "./Layout";
import { track } from "./pixels";
import { useStore } from "./StoreContext";

export function ProductPage() {
  const { t, tx, money, fill, data, lang, product, catName, addToCart, toast } = useStore();
  const [params] = useSearchParams();
  const p = product(params.get("p") || params.get("id") || "");
  const [img, setImg] = useState(0);
  const [barShown, setBarShown] = useState(false);
  const orderRef = useRef<HTMLDivElement>(null);
  useReveal([p?.id]);

  useEffect(() => {
    if (!p) return;
    document.title = tx(p.name) + " · " + tx(data.store.name);
    track("ViewContent", { value: p.price, ids: [p.id] });
    setImg(0);
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!p?.inStock) return;
    document.body.classList.add("has-sticky");
    const el = orderRef.current;
    let io: IntersectionObserver | undefined;
    if (el && "IntersectionObserver" in window) { io = new IntersectionObserver((e) => setBarShown(!e[0].isIntersecting), { threshold: 0.05 }); io.observe(el); }
    return () => { document.body.classList.remove("has-sticky"); io?.disconnect(); };
  }, [p?.id, p?.inStock]);

  if (!p) return <div className="wrap empty"><h1 className="disp">{t.notFound}</h1><Link className="btn" to="/">{t.backShop}</Link></div>;
  const bens = p.benefits ? (p.benefits[lang]?.length ? p.benefits[lang] : p.benefits.ar?.length ? p.benefits.ar : p.benefits.fr) : null;
  const gal = p.images || [];

  return (
    <div className="wrap">
      <div className="pgrid">
        <div className="up d1 pstick">
          <div className="pimg" style={{ background: tint(p)[2] }}>
            {gal.length ? <img src={gal[img]} alt={tx(p.name)} width={600} height={630} fetchPriority="high" decoding="async" />
              : <><Pattern /><div className="bt float"><Art p={p} w={200} /></div><Sparkle l="24%" t="26%" s={20} c="#D4A613" /><Sparkle l="70%" t="36%" s={15} c="#015112" cls="t2" /></>}
          </div>
          {gal.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto" }}>
              {gal.map((u, i) => (
                <button key={u} type="button" onClick={() => setImg(i)} style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 12, overflow: "hidden", border: "2px solid " + (i === img ? "var(--teal)" : "transparent"), padding: 0, cursor: "pointer", background: "none" }}>
                  <img src={u} alt="" loading="lazy" decoding="async" width={64} height={64} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <span className="up d1" style={{ color: "var(--teal)", fontWeight: 500, fontSize: 14 }}>{catName(p.cat)}{p.size ? " · " + tx(p.size) : ""}</span>
          <h1 className="ptitle up d2">{tx(p.name)}</h1>
          {p.desc && <p className="up d2" style={{ margin: 0, color: "var(--soft)", fontSize: 17, lineHeight: 1.7 }}>{tx(p.desc)}</p>}
          <div className="pprice up d3" style={{ marginTop: 10 }}>{money(p.price)}{p.compareAt ? <> <s className="muted" style={{ fontSize: 20, fontFamily: "var(--body)" }}>{money(p.compareAt)}</s></> : null}</div>
          <div className="minis up d3">
            <span className="mini"><Icon n="cash" />{t.trust[0][0]}</span><span className="mini"><Icon n="truck" />{t.trust[1][0]}</span><span className="mini"><Icon n="box" />{t.trust[3][0]}</span>
          </div>
          {p.inStock ? (<>
            <div className="panel up d4" id="order" ref={orderRef}><Checkout withQty items={(q) => [{ id: p.id, qty: q }]} /></div>
            <button type="button" className="btn ghost" style={{ width: "100%", marginTop: 12 }} onClick={() => { addToCart(p.id, 1); toast(<AddedToast />); }}><Icon n="bag" s={20} /><span>{t.addCart}</span></button>
          </>) : <div className="panel"><b>{t.out}</b></div>}
          {bens && bens.length > 0 && (
            <section className="rv" style={{ marginTop: 40 }}>
              <h2 className="disp" style={{ margin: 0, fontSize: 26 }}>{t.benefits}</h2>
              <ul className="blist">{bens.map((x, i) => <li key={i}><span className="ck"><Icon n="check" s={16} /></span><span>{x}</span></li>)}</ul>
            </section>
          )}
          {p.usage && tx(p.usage) && (
            <section className="rv" style={{ marginTop: 24, padding: 18, background: "#FCF6DB", borderRadius: 16 }}><b>{t.usage}</b><p style={{ margin: "6px 0 0", color: "#00370B" }}>{tx(p.usage)}</p></section>
          )}
          <section style={{ marginTop: 40 }}>
            <h2 className="disp rv" style={{ margin: 0, fontSize: 26 }}>{t.faqTitle}</h2>
            <div className="faq">{t.faq.map((f, i) => <details className="rv" key={i}><summary>{f[0]}<Icon n="plus" s={20} /></summary><p>{fill(f[1], { delivery: tx(data.store.deliveryDelay) })}</p></details>)}</div>
          </section>
        </div>
      </div>
      <section className="sec" style={{ textAlign: "center" }}><h2 className="rv">{t.stepsTitle}</h2><Steps /></section>
      {p.inStock && (
        <div className={"stickybar" + (barShown ? " show" : "")}>
          <div style={{ display: "flex", flexDirection: "column" }}><span className="muted" style={{ fontSize: 12 }}>{tx(p.name)}</span><b className="disp" style={{ fontSize: 20 }}>{money(p.price)}</b></div>
          <a className="btn" href="#order"><span>{t.sticky}</span><span className="arrw"><Icon n="arrow" s={16} className="arr" /></span></a>
        </div>
      )}
    </div>
  );
}
