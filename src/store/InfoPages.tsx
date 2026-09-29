import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { cleanPhone } from "../lib/format";
import { WILAYAS, wName } from "../lib/geo";
import { Icon } from "../lib/icons";
import { useReveal } from "./Layout";
import { useStore } from "./StoreContext";
import { FAQ, INFO, NAV, type Block, type InfoSlug } from "./infoTexts";

/** {store} {phone} {confirm} {delivery} → values from the store settings. */
function useVars() {
  const { tx, fill, data } = useStore(), S = data.store;
  const v = { store: tx(S.name), phone: S.phone, confirm: tx(S.confirmDelay), delivery: tx(S.deliveryDelay) };
  return (s: string) => fill(s, v);
}

function useTitle(title: string) {
  const { tx, data } = useStore();
  useEffect(() => { document.title = title + " · " + tx(data.store.name); }, [title]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Shell({ kicker, title, intro, children }: { kicker: string; title: string; intro: string; children: ReactNode }) {
  const { lang } = useStore();
  useTitle(title);
  useReveal([title]);
  return (
    <div className="wrap info">
      <header className="info-hd">
        <span className="kicker up d1">{kicker}</span>
        <h1 className="disp up d2">{title}</h1>
        <p className="up d3">{intro}</p>
      </header>
      <div className="info-body">{children}</div>
      <InfoNav />
      <p className="muted info-upd">{NAV[lang].updated}</p>
    </div>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  const f = useVars();
  return (<>
    {blocks.map((b, i) => (
      <section className="panel info-sec rv" key={i}>
        {b.h && <h2>{f(b.h)}</h2>}
        {b.p?.map((p, j) => <p key={j}>{f(p)}</p>)}
        {b.list && <ul className="blist">{b.list.map((x, j) => <li key={j}><span className="ck"><Icon n="check" s={16} /></span><span>{f(x)}</span></li>)}</ul>}
      </section>
    ))}
  </>);
}

/** Links to all information pages, shown at the bottom of each one. */
function InfoNav() {
  const { lang } = useStore(), n = NAV[lang];
  const items: [string, string][] = [["/about", n.about], ["/delivery", n.delivery], ["/returns", n.returns], ["/faq", n.faq], ["/contact", n.contact], ["/privacy", n.privacy], ["/terms", n.terms]];
  return <nav className="chips info-nav" aria-label={n.info}>{items.map(([to, label]) => <Link key={to} className="chip" to={to}>{label}</Link>)}</nav>;
}

export function InfoPageView({ slug }: { slug: InfoSlug }) {
  const { lang } = useStore(), f = useVars(), pg = INFO[lang][slug];
  return <Shell kicker={f(pg.kicker)} title={pg.title} intro={f(pg.intro)}><Blocks blocks={pg.blocks} /></Shell>;
}

/* ---------- Delivery: the page text + a live price lookup per wilaya ---------- */
export function DeliveryPage() {
  const { lang, t, money, quote, data } = useStore(), f = useVars(), pg = INFO[lang].delivery;
  const [w, setW] = useState("");
  const free = data.store.freeShippingFrom;
  const fee = (m: "home" | "desk") => { const v = w ? quote(w, "", m, 0) : undefined; return v === undefined ? "—" : v === null ? t.notOffered : v === 0 ? t.free : money(v); };
  return (
    <Shell kicker={f(pg.kicker)} title={pg.title} intro={f(pg.intro)}>
      <section className="panel info-sec rv">
        <h2>{lang === "ar" ? "كم سعر التوصيل إلى ولايتكِ؟" : "Combien coûte la livraison chez vous ?"}</h2>
        <div className="f" style={{ maxWidth: 420 }}>
          <label htmlFor="d-w">{t.lWilaya}</label>
          <select id="d-w" value={w} onChange={(e) => setW(e.target.value)}>
            <option value="">{t.chooseW}</option>
            {WILAYAS.map((x) => <option key={x.c} value={x.c}>{(x.c < 10 ? "0" : "") + x.c + " - " + wName(x, lang)}</option>)}
          </select>
        </div>
        <div className="opts" style={{ marginTop: 12, maxWidth: 420 }}>
          <div className="opt" aria-pressed="false"><b>{t.home}</b><span>{fee("home")}</span></div>
          <div className="opt" aria-pressed="false"><b>{t.desk}</b><span>{fee("desk")}</span></div>
        </div>
        {free > 0 && <p style={{ color: "var(--teal)", fontWeight: 500 }}>{lang === "ar" ? "التوصيل مجاني للطلبات ابتداءً من " : "Livraison gratuite dès "}{money(free)}</p>}
        <p className="muted" style={{ fontSize: 14 }}>{lang === "ar" ? "السعر لبعض البلديات قد يختلف قليلاً، والسعر النهائي يظهر في استمارة الطلب." : "Le prix peut varier pour certaines communes ; le prix final s'affiche dans le formulaire de commande."}</p>
      </section>
      <Blocks blocks={pg.blocks} />
    </Shell>
  );
}

/* ---------- FAQ ---------- */
export function FaqPage() {
  const { lang } = useStore(), f = useVars(), n = NAV[lang];
  return (
    <Shell kicker={f("{store}")} title={n.faq} intro={lang === "ar" ? "إجابات عن أكثر الأسئلة التي تصلنا. لم تجدي جوابكِ؟ اتصلي بنا." : "Les réponses aux questions les plus fréquentes. Pas de réponse ? Contactez-nous."}>
      <div className="faq">{FAQ[lang].map(([q, a], i) => <details className="rv" key={i}><summary>{q}<Icon n="plus" s={20} /></summary><p>{f(a)}</p></details>)}</div>
      <p style={{ marginTop: 20 }}><Link className="btn" to="/contact">{n.contact}</Link></p>
    </Shell>
  );
}

/* ---------- Contact: phone, WhatsApp and a form that opens WhatsApp with the message ---------- */
export function ContactPage() {
  const { lang, t, tx, data } = useStore(), S = data.store, n = NAV[lang];
  const wa = String(S.whatsapp || "").replace(/\D/g, "");
  const [name, setName] = useState(""), [phone, setPhone] = useState(""), [order, setOrder] = useState(""), [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const L = lang === "ar"
    ? { intro: "فريقنا يرد على أسئلتكِ حول المنتجات والطلبات والتوصيل.", call: "اتصلي بنا", write: "راسلينا عبر WhatsApp", form: "أرسلي رسالة", order: "رقم الطلب", msg: "رسالتكِ", send: "إرسال عبر WhatsApp", need: "يرجى كتابة رسالتكِ.", hello: "السلام عليكم،", note: "يفتح WhatsApp برسالتكِ جاهزة، فقط اضغطي إرسال." }
    : { intro: "Notre équipe répond à vos questions sur les produits, les commandes et la livraison.", call: "Appelez-nous", write: "Écrivez-nous sur WhatsApp", form: "Envoyer un message", order: "N° de commande", msg: "Votre message", send: "Envoyer sur WhatsApp", need: "Veuillez écrire votre message.", hello: "Bonjour,", note: "WhatsApp s'ouvre avec votre message prêt, il suffit d'envoyer." };
  useTitle(n.contact);
  useReveal([]);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (msg.trim().length < 3) { setErr(true); return; }
    const text = [L.hello, msg.trim(), "", [name.trim(), phone.trim()].filter(Boolean).join(" · "), order.trim() ? L.order + ": " + order.trim() : ""].filter((x, i) => x || i === 2).join("\n");
    window.open("https://wa.me/" + wa + "?text=" + encodeURIComponent(text), "_blank", "noopener");
  }
  return (
    <div className="wrap info">
      <header className="info-hd">
        <span className="kicker up d1">{tx(S.name)}</span>
        <h1 className="disp up d2">{n.contact}</h1>
        <p className="up d3">{L.intro}</p>
      </header>
      <div className="info-contact">
        <div className="info-body">
          <a className="panel info-card rv" href={"tel:" + cleanPhone(S.phone)}><span className="ic"><Icon n="phone" /></span><span><b>{L.call}</b><span dir="ltr">{S.phone}</span></span></a>
          {wa && <a className="panel info-card rv" href={"https://wa.me/" + wa} target="_blank" rel="noopener"><span className="ic"><Icon n="chat" /></span><span><b>{L.write}</b><span dir="ltr">+{wa}</span></span></a>}
          <div className="panel info-card rv"><span className="ic"><Icon n="truck" /></span><span><b>{t.top2}</b><span>{t.top1}</span></span></div>
        </div>
        <form className="panel fields rv" noValidate onSubmit={submit}>
          <h2 className="disp" style={{ margin: 0, fontSize: 26 }}>{L.form}</h2>
          <div className="two">
            <div className="f"><label htmlFor="ct-n">{t.lName}</label><input id="ct-n" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            <div className="f"><label htmlFor="ct-p">{t.lPhone}</label><input id="ct-p" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></div>
          </div>
          <div className="f"><label htmlFor="ct-o">{L.order} <i>({t.optional})</i></label><input id="ct-o" dir="ltr" placeholder="RQ-10001" value={order} onChange={(e) => setOrder(e.target.value)} /></div>
          <div className={"f" + (err ? " bad" : "")}>
            <label htmlFor="ct-m">{L.msg}</label>
            <textarea id="ct-m" rows={5} value={msg} onChange={(e) => { setMsg(e.target.value); setErr(false); }} />
            <span className="e">{L.need}</span>
          </div>
          <button className="btn lg wa" type="submit"><Icon n="chat" s={20} /><span>{L.send}</span></button>
          <p className="note" style={{ margin: 0 }}><span>{L.note}</span></p>
        </form>
      </div>
      <InfoNav />
    </div>
  );
}
