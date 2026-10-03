import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Icon, Sparkle, type IconName } from "../lib/icons";
import { tint, Visual } from "./art";
import { Steps, useReveal } from "./Layout";
import { useStore } from "./StoreContext";
import type { Product } from "./types";

export function AddedToast() {
  const { t } = useStore();
  return <><Icon n="check" s={20} /><span>{t.added}</span><Link to="/cart">{t.viewCart}</Link></>;
}

function Card({ p, i }: { p: Product; i: number }) {
  const { t, tx, money, catName, addToCart, toast } = useStore();
  const [ok, setOk] = useState(false);
  const href = "/product?p=" + encodeURIComponent(p.slug);
  return (
    <article className="card" style={{ animationDelay: i * 60 + "ms" }}>
      <Link className="img" to={href} style={{ background: tint(p)[2] }} aria-label={tx(p.name)}><Visual p={p} w={110} alt={tx(p.name)} /></Link>
      <div className="info">
        <span className="cat">{catName(p.cat)}</span>
        <h3><Link to={href}>{tx(p.name)}</Link></h3>
        <span className="muted" style={{ fontSize: 14 }}>{tx(p.size)}</span>
        <span className="price">{money(p.price)}{p.compareAt ? <> <s className="muted" style={{ fontSize: 15, fontFamily: "var(--body)" }}>{money(p.compareAt)}</s></> : null}</span>
      </div>
      {p.inStock ? (
        <div className="acts">
          <Link className="btn sm" to={href}>{t.buy}</Link>
          <button type="button" className={"iconbtn" + (ok ? " ok" : "")} aria-label={t.addCart}
            onClick={() => { addToCart(p.id, 1); setOk(true); setTimeout(() => setOk(false), 1500); toast(<AddedToast />); }}>
            <Icon n={ok ? "check" : "bag"} s={20} />
          </button>
        </div>
      ) : (
        <div className="acts"><span className="btn sm" style={{ background: "#EEE9E7", color: "#5B5052", cursor: "default" }}>{t.out}</span></div>
      )}
    </article>
  );
}

export function Home() {
  const { t, tx, data } = useStore();
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") || "all";
  const ps = data.products, a = ps[1] || ps[0], b = ps[0], c = ps[ps.length - 1] || ps[0];
  const tops = data.categories.filter((x) => !x.parent);
  const inCat = (p: Product) => {
    if (cat === "all" || p.cat === cat) return true;
    const sub = data.categories.find((x) => x.slug === p.cat);
    return !!(sub && sub.parent === cat);
  };
  const shown = ps.filter(inCat);
  useReveal([shown.length, cat]);
  const pick = (slug: string) => setParams(slug === "all" ? {} : { cat: slug }, { replace: true, preventScrollReset: true });
  const icons: IconName[] = ["cash", "truck", "phone", "box"];

  return (<>
    <section className="hero"><div className="wrap">
      <div>
        <span className="kicker up d1">{t.kicker}</span>
        <h1 className="up d2">{t.heroTitle}</h1>
        <p className="up d3">{t.heroText}</p>
        <div className="ctas up d4">
          <a className="btn pulse" href="#catalog"><span>{t.heroCta}</span><span className="arrw"><Icon n="arrow" s={18} className="arr" /></span></a>
          <a className="btn ghost" href="#how">{t.heroCta2}</a>
        </div>
      </div>
      <div className="stage up d2" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Ronaq El Hayat Logo" style={{ width: '100%', maxWidth: '400px', objectFit: 'contain', filter: 'drop-shadow(0 14px 24px rgba(0,55,11,0.15))' }} className="float" />
        <Sparkle l="15%" t="19%" s={22} c="#D4A613" /><Sparkle l="80%" t="30%" s={16} c="#015112" cls="t2" /><Sparkle l="27%" t="75%" s={14} c="#B0880B" cls="t3" />
        <div className="badge floatB" style={{ left: "-5%", top: "60%" }}><span className="ic"><Icon n="cash" s={22} /></span><span><b>{t.badge1}</b><span className="muted">{t.badge1s}</span></span></div>
        <div className="badge float f3" style={{ right: "-5%", top: "15%" }}><span style={{ color: "var(--rose)" }}><Icon n="truck" s={22} /></span><b>{t.badge2}</b></div>
      </div>
    </div></section>
    <div className="wrap"><div className="trust up d4">
      {t.trust.map((x, i) => <div className="t" key={i}><span className="ic"><Icon n={icons[i]} /></span><span><b>{x[0]}</b><span>{x[1]}</span></span></div>)}
    </div></div>
    <section className="sec" id="catalog"><div className="wrap">
      <div className="rv"><h2>{t.catTitle}</h2><p className="sub">{t.catSub}</p></div>
      <div className="chips" role="group" aria-label={t.catTitle}>
        <button type="button" className="chip" aria-pressed={cat === "all"} onClick={() => pick("all")}>{t.all}</button>
        {tops.map((k) => <button key={k.slug} type="button" className="chip" aria-pressed={k.slug === cat} onClick={() => pick(k.slug)}>{tx(k.name)}</button>)}
      </div>
      <div className="grid" id="grid">{shown.map((p, i) => <Card key={p.id} p={p} i={i} />)}</div>
    </div></section>
    <section className="sec" id="how"><div className="wrap" style={{ textAlign: "center" }}><h2 className="rv">{t.stepsTitle}</h2><Steps /></div></section>
  </>);
}
