import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { DEMO, SITE } from "../lib/config";
import { bump, cleanPhone, validPhone } from "../lib/format";
import { WILAYAS, wilaya, wName } from "../lib/geo";
import { Icon, Spinner } from "../lib/icons";
import { lsGet, lsSet, ssDel, ssGet, ssSet } from "../lib/storage";
import { communes, getJSON, post, type PostResult } from "./api";
import { attribution, track } from "./pixels";
import { useStore } from "./StoreContext";
import type { CartLine, LastOrder, Mode } from "./types";
import { useWaLink } from "./whatsapp";

type Saved = { name?: string; phone?: string; wilaya?: number; commune?: string; address?: string };
type Desk = { code: string; name: string; commune?: string };
const OTHER = "__other";

/** Order form used on the product page (single product + quantity) and on the cart page. */
export function Checkout({ withQty, items }: { withQty?: boolean; items: (q: number) => CartLine[] }) {
  const S = useStore(), { t, lang, money, product, quote, data } = S;
  const navigate = useNavigate(), waLink = useWaLink();
  const saved = useMemo(() => lsGet<Saved>("ronaq_customer", {}), []);
  const draftId = useMemo(() => { const d = ssGet<string | null>("ronaq_draft", null) || "D" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); ssSet("ronaq_draft", d); return d; }, []);

  const [name, setName] = useState(saved.name || "");
  const [phone, setPhone] = useState(saved.phone || "");
  const [wil, setWil] = useState(saved.wilaya ? String(saved.wilaya) : "");
  const [communeSel, setCommuneSel] = useState("");
  const [communeOther, setCommuneOther] = useState("");
  const [list, setList] = useState<[string, string?][] | null>([]);
  const [address, setAddress] = useState(saved.address || "");
  const [mode, setMode] = useState<Mode>("home");
  const [desks, setDesks] = useState<Desk[]>([]);
  const [desk, setDesk] = useState("");
  const [q, setQ] = useState(1);
  const [bad, setBad] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; wa?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null), totalRef = useRef<HTMLElement>(null), qtyRef = useRef<HTMLOutputElement>(null);
  const keepCommune = useRef(saved.commune || "");

  const commune = communeSel === OTHER ? communeOther.trim() : communeSel;
  const lines = items(q);
  const sub = lines.reduce((s, l) => s + (product(l.id)?.price || 0) * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const w = wilaya(wil);
  const feeFor = (m: Mode) => (w ? quote(w.c, commune, m, sub) : undefined);
  const fee = wil ? feeFor(mode) ?? null : null;
  const total = sub + (fee || 0);

  // Communes (and stop desks) of the chosen wilaya. If the list can't load (bad signal), let the customer type it.
  useEffect(() => {
    if (!wil) { setList([]); setCommuneSel(""); return; }
    let alive = true;
    setList(null);
    communes(wil).then(
      (l) => { if (!alive) return; setList(l); const k = keepCommune.current; setCommuneSel(k && l.some((c) => c[0] === k) ? k : ""); keepCommune.current = ""; },
      () => { if (!alive) return; setList([]); setCommuneSel(OTHER); },
    );
    setDesks([]); setDesk("");
    const carrier = data.store.defaultCarrier;
    if (carrier && !DEMO) getJSON<Desk[]>(SITE + "/api/desks?carrier=" + encodeURIComponent(carrier) + "&wilaya=" + encodeURIComponent(wil)).then((d) => { if (alive) setDesks(d || []); }, () => {});
    return () => { alive = false; };
  }, [wil, data.store.defaultCarrier]);

  // A delivery mode not offered for this wilaya/commune switches to the other one.
  useEffect(() => { if (w && feeFor(mode) === null) setMode(mode === "home" ? "desk" : "home"); });

  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } bump(totalRef.current); }, [mode, wil, communeSel, q]);

  // Unfinished-checkout capture (debounced), plus InitiateCheckout on first interaction.
  const live = useRef({ name, phone, wil, commune, lines, total }); live.current = { name, phone, wil, commune, lines, total };
  const started = useRef(false), draftTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function touched() {
    if (!started.current) { started.current = true; import("./Thanks").catch(() => {}); track("InitiateCheckout", { value: live.current.total, ids: live.current.lines.map((l) => l.id) }); }
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const s = live.current; if (!validPhone(s.phone) || DEMO) return;
      post("/api/abandon", { draftId, name: s.name.trim(), phone: cleanPhone(s.phone), wilayaCode: Number(s.wil) || undefined, commune: s.commune, items: s.lines.map((l) => ({ productId: l.id, qty: l.qty })), page: location.pathname, lang }, true);
    }, 1500);
  }
  useEffect(() => () => clearTimeout(draftTimer.current), []);
  const clear = (k: string) => setBad((b) => { if (!b.has(k)) return b; const n = new Set(b); n.delete(k); return n; });

  function markBad(keys: string[]) {
    setBad(new Set()); // remove then re-add so the shake animation replays
    requestAnimationFrame(() => setBad(new Set(keys)));
    const el = formRef.current?.elements.namedItem(keys[0] === "commune" && communeSel === OTHER ? "communeOther" : keys[0]) as HTMLElement | null;
    if (el) { el.focus(); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }

  function demoOrder() {
    const its = lines.map((l) => { const p = product(l.id)!; return { productId: p.id, name: p.name.fr, qty: l.qty, price: p.price }; });
    return { ok: true, number: "RQ-DEMO" + Math.floor(Math.random() * 9000 + 1000), subtotal: sub, shipping: fee || 0, total, items: its };
  }

  function submit(e: FormEvent) {
    e.preventDefault(); if (sending) return;
    const errs: string[] = [];
    if (name.trim().length < 2) errs.push("name");
    if (!validPhone(phone)) errs.push("phone");
    if (!wil) errs.push("wilaya");
    if (!commune) errs.push("commune");
    if (errs.length) return markBad(errs);
    const hp = (formRef.current?.elements.namedItem("website") as HTMLInputElement | null)?.value;
    if (hp || !lines.length || !w) return;
    setAlert(null); setSending(true);
    const body = {
      name: name.trim(), phone: cleanPhone(phone), wilayaCode: w.c, commune, address: mode === "home" ? address.trim() : "",
      mode, stopDeskCode: mode === "desk" ? desk || undefined : undefined, lang, draftId, website: "",
      items: lines.map((l) => ({ productId: l.id, qty: l.qty })), source: attribution(),
    };
    lsSet("ronaq_customer", { name: body.name, phone: body.phone, wilaya: w.c, commune: body.commune, address: body.address });
    (DEMO ? Promise.resolve(demoOrder() as PostResult) : post("/api/order", body)).then((r) => {
      if (!r || !r.ok) { const err: any = new Error((r && r.error) || "net"); err.field = r && r.field; throw err; }
      const order: LastOrder = { number: r.number, name: body.name, phone: body.phone, wilayaCode: w.c, commune: body.commune, address: body.address, mode, items: r.items, subtotal: r.subtotal, shipping: r.shipping, total: r.total, page: location.pathname, at: Date.now() };
      lsSet("ronaq_last_order", order); ssDel("ronaq_draft");
      navigate("/merci?n=" + encodeURIComponent(r.number));
    }).catch((err) => {
      setSending(false);
      const code: string = err && err.message;
      if (["name", "phone", "wilaya", "commune"].includes(code)) return markBad([code]);
      const errsT = t.errs as Record<string, string>;
      const draft: LastOrder = { number: "", name: body.name, phone: body.phone, wilayaCode: w.c, commune: body.commune, address: body.address, mode, items: lines.map((l) => { const p = product(l.id)!; return { name: S.tx(p.name), qty: l.qty, price: p.price }; }), total };
      setAlert({ msg: errsT[code] || t.errs.net, wa: code === "net" || !errsT[code] ? waLink(draft) : undefined });
    });
  }

  const cls = (k: string) => "f" + (bad.has(k) ? " bad" : "");
  const feeText = (v: number | null | undefined) => (v === undefined ? "—" : v === null ? t.notOffered : v === 0 ? t.free : money(v));
  const showDesk = mode === "desk" && desks.length > 0;

  return (
    <form className="fields" noValidate ref={formRef} onSubmit={submit}>
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div>
        <h2 className="disp" style={{ margin: 0, fontSize: "clamp(24px,3vw,32px)", lineHeight: 1.25 }}>{t.orderTitle}</h2>
        <p style={{ margin: "4px 0 0", color: "var(--teal)", fontWeight: 500, fontSize: 15 }}>{t.orderSub}</p>
      </div>
      <div className={cls("name")}>
        <label htmlFor="c-name">{t.lName}</label>
        <input id="c-name" name="name" autoComplete="name" placeholder={t.phName} value={name} onChange={(e) => { setName(e.target.value); clear("name"); touched(); }} />
        <span className="e">{t.errName}</span>
      </div>
      <div className={cls("phone")}>
        <label htmlFor="c-phone">{t.lPhone}</label>
        <input id="c-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: lang === "ar" ? "right" : "left" }} placeholder="05XX XX XX XX" value={phone} onChange={(e) => { setPhone(e.target.value); clear("phone"); touched(); }} />
        <span className="e">{t.errPhone}</span>
      </div>
      <div className="two">
        <div className={cls("wilaya")}>
          <label htmlFor="c-wilaya">{t.lWilaya}</label>
          <select id="c-wilaya" name="wilaya" value={wil} onChange={(e) => { setWil(e.target.value); clear("wilaya"); touched(); }}>
            <option value="">{t.chooseW}</option>
            {WILAYAS.map((x) => <option key={x.c} value={x.c}>{(x.c < 10 ? "0" : "") + x.c + " - " + wName(x, lang)}</option>)}
          </select>
          <span className="e">{t.errWilaya}</span>
        </div>
        <div className={cls("commune")}>
          <label htmlFor="c-commune">{t.lCommune}</label>
          <select id="c-commune" name="commune" disabled={list === null} value={communeSel}
            onChange={(e) => { setCommuneSel(e.target.value); clear("commune"); touched(); if (e.target.value === OTHER) setTimeout(() => (formRef.current?.elements.namedItem("communeOther") as HTMLInputElement | null)?.focus()); }}>
            {list === null ? <option value="">{t.loading}</option> : (<>
              <option value="">{t.chooseC}</option>
              {list.map((c) => <option key={c[0]} value={c[0]}>{lang === "ar" ? c[1] || c[0] : c[0]}</option>)}
              {wil && <option value={OTHER}>{t.otherC}</option>}
            </>)}
          </select>
          <input id="c-commune-o" name="communeOther" placeholder={t.phCommune} style={{ display: communeSel === OTHER ? "" : "none", marginTop: 8 }} value={communeOther} onChange={(e) => { setCommuneOther(e.target.value); clear("commune"); touched(); }} />
          <span className="e">{t.errCommune}</span>
        </div>
      </div>
      <div className="f">
        <span id="c-mode-l" style={{ fontSize: 15, fontWeight: 500 }}>{t.lMode}</span>
        <div className="opts" role="group" aria-labelledby="c-mode-l">
          {(["home", "desk"] as Mode[]).map((m) => {
            const v = feeFor(m);
            return (
              <button key={m} type="button" className="opt" aria-pressed={mode === m} disabled={v === null} style={{ opacity: v === null ? 0.5 : undefined }} onClick={() => setMode(m)}>
                <b>{m === "home" ? t.home : t.desk}</b><span>{feeText(v)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="f" style={{ display: showDesk ? "" : "none" }}>
        <label htmlFor="c-desk">{t.lDesk} <i>({t.optional})</i></label>
        <select id="c-desk" name="desk" value={desk} onChange={(e) => setDesk(e.target.value)}>
          <option value="">{t.chooseD}</option>
          {desks.map((d) => <option key={d.code} value={d.code}>{d.name + (d.commune ? " — " + d.commune : "")}</option>)}
        </select>
      </div>
      <div className="f" style={{ display: mode === "home" ? "" : "none" }}>
        <label htmlFor="c-address">{t.lAddress} <i>({t.optional})</i></label>
        <input id="c-address" name="address" autoComplete="street-address" placeholder={t.phAddress} value={address} onChange={(e) => { setAddress(e.target.value); touched(); }} />
      </div>
      {withQty && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span id="c-qty-l" style={{ fontSize: 15, fontWeight: 500 }}>{t.lQty}</span>
          <div className="qty" role="group" aria-labelledby="c-qty-l">
            <button type="button" aria-label="−" onClick={() => { setQ((x) => Math.max(1, x - 1)); bump(qtyRef.current); }}><Icon n="minus" s={18} /></button>
            <output aria-live="polite" ref={qtyRef}>{q}</output>
            <button type="button" aria-label="+" onClick={() => { setQ((x) => Math.min(10, x + 1)); bump(qtyRef.current); }}><Icon n="plus" s={18} /></button>
          </div>
        </div>
      )}
      <div className="sum">
        <div className="l"><span>{t.sub} ({count})</span><span>{money(sub)}</span></div>
        <div className="l"><span>{t.ship} <span>{w ? "· " + wName(w, lang) : ""}</span></span><span>{fee == null ? "—" : fee === 0 ? t.free : money(fee)}</span></div>
        <hr />
        <div className="tot"><b>{t.total}</b><strong ref={totalRef}>{money(total)}</strong></div>
      </div>
      <div className="alert" role="alert" hidden={!alert}>
        {alert?.msg}{alert?.wa && <> <a href={alert.wa} target="_blank" rel="noopener" style={{ color: "inherit", fontWeight: 600 }}>WhatsApp</a></>}
      </div>
      <button className={"btn lg" + (sending ? "" : " pulse")} type="submit" disabled={sending}>
        {sending ? <><Spinner /><span>{t.sending}</span></> : <span className="lbl">{t.submit}</span>}
      </button>
      <p className="note" style={{ margin: 0 }}><Icon n="cash" s={18} /><span>{t.payNote}</span></p>
    </form>
  );
}
