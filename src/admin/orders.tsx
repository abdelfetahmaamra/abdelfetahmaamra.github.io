import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";
import { SITE } from "../lib/config";
import { Icon } from "../lib/icons";
import { CommuneOptions, DrawerHead, Empty, keep, Loading, remember, St, Top, useAdmin, useFmt, useQ, useRun, WilayaOptions, errMsg } from "./core";

const NEXT: Record<string, string[]> = { new: ["confirmed", "unreachable", "cancelled"], unreachable: ["confirmed", "unreachable", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["cancelled"], shipped: ["delivered", "returned"], delivered: [], returned: [], cancelled: ["new"] };
const BTN: Record<string, string> = { confirmed: "pri", unreachable: "warn", cancelled: "red", preparing: "pri", shipped: "", delivered: "pri", returned: "red", new: "" };
const SHIP_PERM: Record<string, 1> = { preparing: 1, shipped: 1, delivered: 1, returned: 1 };
const STATUSES = ["new", "unreachable", "confirmed", "preparing", "shipped", "delivered", "returned", "cancelled"];
export function itemsTxt(items: { qty: number; name: string }[] = []) { return items.map((l) => l.qty + " × " + l.name).join("، "); }

/* ================= Dashboard ================= */
function Bars<R>({ rows, label, value, fmt }: { rows: R[]; label: (r: R) => string; value: (r: R) => number; fmt?: (r: R) => string }) {
  const { t } = useAdmin();
  if (!rows.length) return <p className="muted" style={{ margin: 0 }}>{t.none}</p>;
  const max = Math.max(...rows.map(value)) || 1;
  return (
    <div className="bars">
      {rows.map((r, i) => { const v = value(r); return (
        <div className="bar" key={i}><span className="nm" title={label(r)}>{label(r)}</span><span className="tr"><i style={{ width: Math.max(2, (v / max) * 100) + "%", animationDelay: i * 40 + "ms" }}></i></span><b>{fmt ? fmt(r) : v}</b></div>
      ); })}
    </div>
  );
}

export function Dashboard() {
  const { t, lang, go } = useAdmin(), F = useFmt();
  const [days, setDays] = useState(() => remember("days", 7));
  const s = useQ(api.stats.dashboard, { days }) as any;
  const pick = (d: number) => { keep("days", d); setDays(d); };
  const fmtDay = (ms: number) => new Date(ms).toLocaleDateString(lang === "ar" ? "ar-DZ-u-nu-latn" : "fr-FR", { day: "2-digit", month: "short" });

  let body = <Loading />;
  if (s) {
    const k = s.kpi, a = s.alerts, al: [string, string, string][] = [];
    if (a.stale) al.push(["red", F.fill(t.al.stale, { n: a.stale }), "orders:new"]);
    if (a.followUps) al.push(["", F.fill(t.al.followUps, { n: a.followUps }), "orders:unreachable"]);
    if (a.carrierErrors) al.push(["red", F.fill(t.al.carrierErrors, { n: a.carrierErrors }), "orders:confirmed"]);
    if (a.toShip) al.push(["", F.fill(t.al.toShip, { n: a.toShip }), "orders:confirmed"]);
    if (a.stuck) al.push(["", F.fill(t.al.stuck, { n: a.stuck }), "orders:shipped"]);
    if (a.abandoned) al.push(["", F.fill(t.al.abandoned, { n: a.abandoned }), "abandoned"]);
    a.outOfStock.forEach((p: any) => al.push(["red", F.fill(t.al.out, { p: F.tx(p.name) }), "stock"]));
    a.lowStock.forEach((p: any) => al.push(["", F.fill(t.al.low, { p: F.tx(p.name), n: p.stock }), "stock"]));
    const maxD = Math.max(...s.series.map((x: any) => x.orders)) || 1;
    body = (<>
      <div className="kpis">
        <div className="kpi"><span>{t.k.orders}</span><b>{k.orders}</b><small>{k.pending} {t.k.pending}</small></div>
        <div className="kpi" style={{ animationDelay: "60ms" }}><span>{t.k.conf}</span><b>{F.pct(k.confirmed, k.processed)}</b><small>{k.confirmed} / {k.processed}</small></div>
        <div className="kpi" style={{ animationDelay: "120ms" }}><span>{t.k.deliv}</span><b>{F.pct(k.delivered, k.delivered + k.returned)}</b><small>{k.delivered} {t.st.delivered} · {k.returned} {t.st.returned}</small></div>
        <div className="kpi" style={{ animationDelay: "180ms" }}><span>{t.k.revenue}</span><b>{F.money(k.revenue)}</b><small>{t.k.aov}: {F.money(k.aov)}</small></div>
      </div>
      <div className="cards2">
        <div className="box" style={{ gridColumn: "1/-1" }}><h2>{t.alerts}</h2><div className="alerts">
          {al.length ? al.map((x, i) => (
            <div className={"al " + x[0]} key={i}><span>{x[1]}</span><button type="button" onClick={() => { const g = x[2].split(":"); go(g[0], g[1] ? { status: g[1] } : undefined); }}>{t.view}</button></div>
          )) : <div className="al ok">{t.allGood}</div>}
        </div></div>
        {s.series.length > 1 && (
          <div className="box" style={{ gridColumn: "1/-1" }}>
            <h2>{t.perDay}<small><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "var(--teal)", verticalAlign: "middle" }}></span> {t.confirmedLegend} &nbsp; <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#BFD3CA", verticalAlign: "middle" }}></span> {t.ordersLegend}</small></h2>
            <div className="spark" dir="ltr">
              {s.series.map((x: any, i: number) => (
                <div className="c" tabIndex={0} aria-label={fmtDay(x.day) + ": " + x.orders} key={i}>
                  <i style={{ height: (x.orders / maxD) * 100 + "%", background: "#BFD3CA", position: "relative", animationDelay: i * 15 + "ms" }}>
                    <i style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: (x.orders ? (x.confirmed / x.orders) * 100 : 0) + "%", background: "var(--teal)", borderRadius: "4px 4px 0 0" }}></i>
                  </i>
                  <span className="tip">{fmtDay(x.day)} · {x.orders} / {x.confirmed}</span>
                </div>
              ))}
            </div>
            <div className="axis" dir="ltr"><span>{fmtDay(s.series[0].day)}</span><span>{fmtDay(s.series[s.series.length - 1].day)}</span></div>
          </div>
        )}
        <div className="box"><h2>{t.topProducts}</h2><Bars rows={s.products} label={(r: any) => r.name} value={(r: any) => r.qty} /></div>
        <div className="box"><h2>{t.topWilayas}<small>{t.k.orders} · {t.k.deliv}</small></h2><Bars rows={s.wilayas} label={(r: any) => (lang === "ar" ? r.nameAr : r.name)} value={(r: any) => r.orders} fmt={(r: any) => r.orders + " · " + F.pct(r.delivered, r.delivered + r.returned)} /></div>
        <div className="box"><h2>{t.campaigns}<small>{t.k.orders} · {t.k.conf} · {t.st.delivered}</small></h2><Bars rows={s.campaigns} label={(r: any) => r.name || t.noCampaign} value={(r: any) => r.orders} fmt={(r: any) => r.orders + " · " + F.pct(r.confirmed, r.orders) + " · " + r.delivered} /></div>
        <div className="box"><h2>{t.carriers}<small>{t.k.deliv}</small></h2><Bars rows={s.carriers} label={(r: any) => r.code} value={(r: any) => (r.delivered + r.returned ? (r.delivered / (r.delivered + r.returned)) * 100 : 0)} fmt={(r: any) => F.pct(r.delivered, r.delivered + r.returned) + " (" + r.delivered + "/" + (r.delivered + r.returned) + ") · " + r.inTransit + " ⇢"} /></div>
      </div>
    </>);
  }
  return (<>
    <Top title={t.tabs.dash}>
      <div className="seg" role="group">{[1, 7, 30, 90].map((d) => <button key={d} type="button" aria-pressed={d === days} onClick={() => pick(d)}>{(t.period as Record<string, string>)[d]}</button>)}</div>
    </Top>
    <div id="dash">{body}</div>
  </>);
}

/* ================= Orders ================= */
function useCarriers() { return useQ(api.dispatch.carrierList, {}) as any; }
function CarrierPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useAdmin(), C = useCarriers();
  const list = (C?.carriers || []).filter((c: any) => c.configured);
  const def = value || C?.defaultCarrier || list[0]?.code || "";
  useEffect(() => { if (def && def !== value) onChange(def); }, [def]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <select aria-label={t.carrier} value={def} onChange={(e) => onChange(e.target.value)} style={{ height: 44, border: "1px solid var(--line2)", borderRadius: 12, padding: "0 10px", background: "#fff" }}>
      {list.length ? list.map((c: any) => <option key={c.code} value={c.code}>{c.label}</option>) : <option value="">—</option>}
    </select>
  );
}

function csv(rows: any[]) {
  const cols = [["number", "N°"], ["createdAt", "Date"], ["status", "Statut"], ["name", "Nom"], ["phone", "Téléphone"], ["wilayaCode", "Code wilaya"], ["wilaya", "Wilaya"], ["commune", "Commune"], ["address", "Adresse"], ["mode", "Livraison"], ["items", "Produits"], ["subtotal", "Sous-total"], ["shipping", "Livraison DA"], ["total", "Total"], ["carrier", "Transporteur"], ["tracking", "Suivi"], ["campaign", "Campagne"]];
  const lines = [cols.map((c) => c[1]).join(",")].concat(rows.map((o) => cols.map((c) => {
    const v = c[0] === "items" ? itemsTxt(o.items) : c[0] === "createdAt" ? new Date(o.createdAt).toISOString() : o[c[0]];
    return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  }).join(",")));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  a.download = "commandes-" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
}

export function Orders({ extra }: { extra: Record<string, string> | null }) {
  const { t, lang, counts, can, openDrawer, flash } = useAdmin(), F = useFmt(), R = useRun();
  const [status, setStatus] = useState<string>(() => (extra && extra.status) || remember("ostatus", ""));
  const [input, setInput] = useState(() => remember("oq", ""));
  const [q, setQ] = useState(input);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkCarrier, setBulkCarrier] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  useEffect(() => { keep("ostatus", status); }, [status]);
  useEffect(() => { const id = setTimeout(() => { setQ(input.trim()); keep("oq", input.trim()); }, 350); return () => clearTimeout(id); }, [input]);
  const rows = useQ(api.orders.list, { status: (status || undefined) as any, search: q || undefined, limit: 400 }) as any[] | undefined;
  const open = (id: string) => openDrawer(<OrderDrawer key={id} id={id} />);
  const ids = [...sel];
  const toggle = (id: string, on: boolean) => setSel((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });

  function bulkShip() {
    if (!bulkCarrier) return flash(t.noCarrier, true);
    setBulkBusy(true);
    R.a(api.dispatch.dispatchMany, { ids: ids as any, carrier: bulkCarrier as any }).then((res: any[]) => {
      const ok = res.filter((r) => r.ok).length; flash(F.fill(t.bulkDone, { ok, bad: res.length - ok }), res.length - ok > 0);
      setSel(new Set()); setBulkBusy(false);
    }, (e) => { flash(errMsg(e), true); setBulkBusy(false); });
  }

  return (<>
    <Top title={t.tabs.orders}>
      {can("orders.confirm") && <button className="abtn pri" type="button" onClick={() => openDrawer(<ManualOrder key={"m" + Date.now()} />)}><Icon n="plus" s={18} />{t.newOrder}</button>}
      <button className="abtn" type="button" onClick={() => csv(rows || [])}><Icon n="download" s={18} />{t.export}</button>
    </Top>
    <div className="filters">
      <input type="search" placeholder={t.search} aria-label={t.search} value={input} onChange={(e) => setInput(e.target.value)} />
      <button type="button" className="fchip" aria-pressed={!status} onClick={() => { setStatus(""); setSel(new Set()); }}>{t.all}</button>
      {STATUSES.map((s) => <button key={s} type="button" className="fchip" aria-pressed={status === s} onClick={() => { setStatus(s); setSel(new Set()); }}>{(t.st as Record<string, string>)[s]} <em>{counts[s] || 0}</em></button>)}
    </div>
    {ids.length > 0 && (
      <div id="bulk" className="acts" style={{ marginBottom: 10 }}>
        <b style={{ alignSelf: "center" }}>{F.fill(t.selected, { n: ids.length })}</b>
        {can("orders.ship") && (<>
          <button className="abtn" type="button" onClick={() => R.runM(api.orders.bulkStatus, { ids: ids as any, to: "preparing" }).then(() => setSel(new Set()), () => {})}>{t.bulkPrep}</button>
          <CarrierPicker value={bulkCarrier} onChange={setBulkCarrier} />
          <button className="abtn pri" type="button" disabled={bulkBusy} onClick={bulkShip}>{bulkBusy ? t.loading : <><Icon n="send" s={18} />{t.bulkShip}</>}</button>
        </>)}
      </div>
    )}
    <div id="olist">
      {!rows ? <Loading /> : !rows.length ? <Empty /> : (
        <div className="tscroll"><table className="tbl">
          <thead><tr><th style={{ width: 36 }}><span className="sr">✓</span></th><th>{t.cols.order}</th><th>{t.cols.date}</th><th>{t.cols.customer}</th><th>{t.cols.wilaya}</th><th>{t.cols.items}</th><th>{t.cols.total}</th><th>{t.cols.status}</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} tabIndex={0} onClick={(e) => { if ((e.target as HTMLElement).closest("input")) return; open(o.id); }} onKeyDown={(e) => { if (e.key === "Enter") open(o.id); }}>
                <td><input type="checkbox" aria-label={o.number} checked={sel.has(o.id)} onChange={(e) => toggle(o.id, e.target.checked)} style={{ width: 18, height: 18 }} /></td>
                <td className="num"><bdi>{o.number}</bdi>{o.campaign && <><br /><small className="muted">{o.campaign}</small></>}</td>
                <td className="num">{F.dt(o.createdAt)}<br /><small className="muted">{F.ago(o.createdAt)}</small></td>
                <td><b style={{ fontWeight: 500 }}><bdi>{o.name}</bdi></b><br /><small className="muted" dir="ltr">{o.phone}</small></td>
                <td>{lang === "ar" ? o.wilayaAr : o.wilaya}<br /><small className="muted">{o.commune} · {o.mode === "desk" ? t.cols.desk : t.cols.home}</small></td>
                <td style={{ maxWidth: 240 }}>{itemsTxt(o.items)}</td>
                <td className="num"><b>{F.money(o.total)}</b></td>
                <td>
                  <St s={o.status} />{o.attempts ? <> <small className="muted">×{o.attempts}</small></> : null}
                  {o.tracking && <><br /><small className="muted" dir="ltr">{o.carrier} {o.tracking}</small></>}
                  {o.carrierError && <><br /><small style={{ color: "var(--err)" }}>⚠ {t.carrierError}</small></>}
                  {o.carrierStatus && <><br /><small className="muted">{o.carrierStatus}</small></>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  </>);
}

/* ---------- order drawer ---------- */
export function OrderDrawer({ id }: { id: string }) {
  const A = useAdmin(), { t, lang, can, ask, flash, closeDrawer, openDrawer, convex, storeName } = A, F = useFmt(), R = useRun();
  const o = useQ(api.orders.get, { id: id as any }) as any;
  const C = useCarriers();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [fu, setFu] = useState<string | null>(null);
  const [carrier, setCarrier] = useState("");
  const [desks, setDesks] = useState<any[]>([]);
  const [deskCode, setDeskCode] = useState("");
  const [shipping, setShipping] = useState(false);
  useEffect(() => { if (o === null) closeDrawer(); }, [o, closeDrawer]);
  useEffect(() => { setBusy(false); }, [o?.status, o?.attempts]);
  useEffect(() => {
    if (!o || o.mode !== "desk" || !carrier) return;
    convex.query(api.shipping.stopDesks, { carrier: carrier as any, wilayaCode: o.wilayaCode }).then((d: any[]) => { setDesks(d); setDeskCode(d.some((x) => x.code === o.stopDeskCode) ? o.stopDeskCode : ""); }, () => {});
  }, [carrier, o?.mode, o?.wilayaCode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return <DrawerHead title={t.loading} />;
  const waMsg = F.fill(t.waConfirm, { name: o.name, store: storeName, id: o.number, items: itemsTxt(o.items), total: F.money(o.total), wilaya: lang === "ar" ? o.wilayaAr : o.wilaya });
  const c = o.customer;
  const canEdit = !o.tracking && ["new", "unreachable", "confirmed", "preparing"].includes(o.status) && can("orders.confirm");
  const next = (NEXT[o.status] || []).filter((to) => can(SHIP_PERM[to] ? "orders.ship" : "orders.confirm"));
  const canShip = can("orders.ship") && !o.tracking && (o.status === "confirmed" || o.status === "preparing");
  const fuValue = fu ?? (o.followUpAt ? new Date(o.followUpAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

  const setStatusTo = (to: string) => {
    const doIt = () => { setBusy(true); R.runM(api.orders.setStatus, { id: o.id, to: to as any }).catch(() => setBusy(false)); };
    if (to === "cancelled" || to === "returned") ask().then((y) => { if (y) doIt(); }); else doIt();
  };
  const addNote = () => { const v = note.trim(); if (v) R.runM(api.orders.addNote, { id: o.id, text: v }, false).then(() => setNote(""), () => {}); };
  const ship = () => {
    setShipping(true);
    R.a(api.dispatch.dispatch, { id: o.id, carrier: carrier as any, stationCode: deskCode || undefined }).then((r: any) => {
      setShipping(false); if (r.ok) flash(r.number + " → " + r.tracking); else flash(r.error, true);
    }, (e) => { setShipping(false); flash(errMsg(e), true); });
  };
  const label = () => {
    const w = window.open("", "_blank");
    R.a(api.dispatch.label, { id: o.id }).then((r: any) => {
      const url = r.url || SITE + "/api/label?k=" + encodeURIComponent(r.key);
      if (w) w.location = url; else location.href = url;
    }, (e) => { if (w) w.close(); flash(errMsg(e), true); });
  };

  return (<>
    <DrawerHead title={<bdi>{o.number}</bdi>} sub={F.dt(o.createdAt) + " · " + F.ago(o.createdAt)} right={<St s={o.status} />} />
    <div className="db">
      <div className="acts">
        <a className="abtn" href={"tel:" + o.phone}><Icon n="phone" s={18} />{t.call} <bdi dir="ltr">{o.phone}</bdi></a>
        <a className="abtn wa" target="_blank" rel="noopener" href={"https://wa.me/" + F.waNum(o.phone) + "?text=" + encodeURIComponent(waMsg)}><Icon n="chat" s={18} />{t.wa}</a>
      </div>
      {next.length > 0 && (
        <div><p className="sec-t">{t.cols.status}</p><div className="acts">
          {next.map((s) => <button key={s} type="button" disabled={busy} className={"abtn " + BTN[s]} onClick={() => setStatusTo(s)}>{(t.to as Record<string, string>)[s]}{s === "unreachable" && o.status === "unreachable" ? " (+1)" : ""}</button>)}
        </div></div>
      )}
      {(o.status === "unreachable" || o.attempts > 0) && (
        <div><p className="sec-t">{t.attempts}: <b>{o.attempts}</b></p>
          <div className="mini-f"><label className="sr" htmlFor="fu">{t.followUp}</label><input id="fu" type="datetime-local" value={fuValue} onChange={(e) => setFu(e.target.value)} />
            <button type="button" className="abtn" onClick={() => R.runM(api.orders.setFollowUp, { id: o.id, at: fuValue ? new Date(fuValue).getTime() : null }).catch(() => {})}>{t.save}</button></div>
        </div>
      )}
      {o.tracking ? (
        <div className="box" style={{ padding: "14px 16px" }}>
          <p className="sec-t">{t.ship}</p>
          <div className="kv"><span>{t.carrier}</span><b>{o.carrier}</b><span>{t.tracking}</span><b dir="ltr" style={{ textAlign: "start" }}>{o.tracking}</b>{o.carrierStatus && <><span>{t.carrierStatus}</span><b>{o.carrierStatus}</b></>}</div>
          <div className="acts" style={{ marginTop: 10 }}>
            <button type="button" className="abtn" onClick={label}><Icon n="file" s={18} />{t.label}</button>
            {can("orders.ship") && o.status === "shipped" && <button type="button" className="abtn red" onClick={() => ask().then((y) => { if (y) R.runA(api.dispatch.cancelShipment, { id: o.id }).catch(() => {}); })}>{t.cancelShip}</button>}
            {can("orders.ship") && o.carrierError && (o.carrier === "noest" || o.carrier === "ecotrack") && <button type="button" className="abtn warn" onClick={() => R.runA(api.dispatch.revalidate, { id: o.id }).catch(() => {})}>{t.revalidate}</button>}
          </div>
          {o.carrierError && <div className="alert" style={{ marginTop: 10 }}>{o.carrierError}</div>}
        </div>
      ) : canShip ? (
        <div className="box" style={{ padding: "14px 16px" }}>
          <p className="sec-t">{t.ship}</p>
          {o.carrierError && <div className="alert" style={{ marginBottom: 10 }}>{o.carrierError}</div>}
          {C?.carriers.some((x: any) => x.configured) ? (
            <div className="mini-f">
              <CarrierPicker value={carrier} onChange={setCarrier} />
              {o.mode === "desk" && <select aria-label={t.stopDesk} value={deskCode} onChange={(e) => setDeskCode(e.target.value)}><option value="">{t.stopDesk}…</option>{desks.map((x) => <option key={x.code} value={x.code}>{x.name + (x.commune ? " — " + x.commune : "")}</option>)}</select>}
              <button type="button" className="abtn pri" disabled={shipping} onClick={ship}>{shipping ? t.loading : <><Icon n="send" s={18} />{t.sendTo}</>}</button>
            </div>
          ) : <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t.noCarrier}</p>}
        </div>
      ) : null}
      <div className="kv">
        <span>{t.cols.customer}</span><b><bdi>{o.name}</bdi> {c && <>{c.tags.map((x: string) => <span className="tag" key={x}>{x}</span>)}{c.blocked && <span className="tag risk">{t.blocked}</span>}</>}</b>
        {c && <><span>{t.cols.orders}</span><b>{c.orders} · {c.delivered} {t.st.delivered} · {c.returned} {t.st.returned} · {c.cancelled} {t.st.cancelled}</b></>}
        {o.phone2 && <><span>{t.phone2}</span><b dir="ltr" style={{ textAlign: "start" }}>{o.phone2}</b></>}
        <span>{t.cols.wilaya}</span><b>{lang === "ar" ? o.wilayaAr : o.wilaya} / {o.commune}</b>
        <span>{t.mode}</span><b>{o.mode === "desk" ? t.desk + (o.stopDeskCode ? " · " + o.stopDeskCode : "") : t.home}{o.address ? " · " + o.address : ""}</b>
        <span>{t.cols.items}</span><b>{itemsTxt(o.items)}</b>
        <span>{t.cols.total}</span><b>{F.money(o.subtotal)} + {F.money(o.shipping)} = {F.money(o.total)}</b>
        {(o.campaign || o.source) && <><span>UTM</span><b>{[o.source, o.campaign].filter(Boolean).join(" / ")}</b></>}
      </div>
      {canEdit ? <EditOrder o={o} /> : o.tracking ? <p className="muted" style={{ fontSize: 13, margin: 0 }}>{t.locked}</p> : null}
      <div>
        <p className="sec-t">{t.notes}</p>
        {o.notes.map((n: any, i: number) => <div key={i} style={{ background: "#FBF5F1", borderRadius: 10, padding: "10px 12px", fontSize: 14, marginBottom: 6 }}>{n.text}<br /><small className="muted">{n.by || ""} · {F.dt(n.at)}</small></div>)}
        <div className="mini-f"><label className="sr" htmlFor="note">{t.notes}</label><input id="note" placeholder={t.addNote} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} /><button type="button" className="abtn" onClick={addNote}>{t.add}</button></div>
      </div>
      {o.others.length > 0 && (
        <div><p className="sec-t">{t.cols.orders}</p>
          {o.others.map((x: any) => <button key={x.id} type="button" className="abtn" style={{ width: "100%", justifyContent: "space-between", marginBottom: 6 }} onClick={() => openDrawer(<OrderDrawer key={x.id} id={x.id} />)}><bdi>{x.number}</bdi><span>{F.money(x.total)}</span><St s={x.status} /></button>)}
        </div>
      )}
      <div><p className="sec-t">{t.history}</p><ul className="hist">
        {o.history.slice().reverse().map((h: any, i: number) => (
          <li key={i}>{h.status && <>{h.from ? (t.st as Record<string, string>)[h.from] + " → " : ""}<b>{(t.st as Record<string, string>)[h.status]}</b></>}{h.note && <> <span className="muted">{h.note}</span></>}<time>{h.by || ""} · {F.dt(h.at)}</time></li>
        ))}
      </ul></div>
    </div>
  </>);
}

/** Edit form: its own copy of the order, so live updates don't overwrite what is being typed. */
function EditOrder({ o }: { o: any }) {
  const { t } = useAdmin(), F = useFmt(), R = useRun();
  const [f, setF] = useState(() => ({ name: o.name, phone: o.phone, wilayaCode: String(o.wilayaCode), commune: o.commune, mode: o.mode, address: o.address || "", shipping: String(o.shipping), recompute: false, qty: o.items.map((l: any) => String(l.qty)) as string[] }));
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  function save() {
    const fields: any = { name: f.name, phone: f.phone, wilayaCode: Number(f.wilayaCode), commune: f.commune, mode: f.mode, address: f.address };
    if (!o.stockConsumed) fields.items = o.items.map((l: any, i: number) => ({ productId: l.productId, name: l.name, price: l.price, qty: Number(f.qty[i]) || 0 }));
    if (f.recompute) fields.recomputeShipping = true; else fields.shipping = Number(f.shipping) || 0;
    R.runM(api.orders.edit, { id: o.id, fields }).catch(() => {});
  }
  return (
    <details>
      <summary style={{ cursor: "pointer", fontWeight: 600, minHeight: 40, display: "flex", alignItems: "center" }}>{t.editOrder}</summary>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        <div className="mini-f"><input aria-label={t.name} value={f.name} onChange={(e) => set({ name: e.target.value })} /><input dir="ltr" aria-label={t.cols.phone} value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
        <div className="mini-f">
          <select aria-label={t.cols.wilaya} value={f.wilayaCode} onChange={(e) => set({ wilayaCode: e.target.value, commune: "", recompute: true })}><WilayaOptions /></select>
          <select aria-label={t.commune} value={f.commune} onChange={(e) => set({ commune: e.target.value })}>{!f.commune && <option value="">—</option>}<CommuneOptions code={f.wilayaCode} sel={f.wilayaCode === String(o.wilayaCode) ? o.commune : ""} /></select>
        </div>
        <div className="mini-f">
          <select aria-label={t.mode} value={f.mode} onChange={(e) => set({ mode: e.target.value, recompute: true })}><option value="home">{t.home}</option><option value="desk">{t.desk}</option></select>
          <input aria-label={t.address} placeholder={t.address} value={f.address} onChange={(e) => set({ address: e.target.value })} />
        </div>
        {o.stockConsumed ? <p className="muted" style={{ fontSize: 13, margin: 0 }}>{t.qtyLocked}</p> : o.items.map((l: any, i: number) => (
          <div className="mini-f" key={i}><span style={{ flex: 2, alignSelf: "center", fontSize: 14 }}>{l.name} · {F.money(l.price)}</span><label className="sr" htmlFor={"q" + i}>qty</label>
            <input id={"q" + i} type="number" min={0} max={10} value={f.qty[i]} onChange={(e) => set({ qty: f.qty.map((x, j) => (j === i ? e.target.value : x)) })} style={{ maxWidth: 90 }} /></div>
        ))}
        <div className="mini-f">
          <label style={{ alignSelf: "center", fontSize: 14, flex: 1 }} htmlFor="e-ship">{t.shipping}</label>
          <input id="e-ship" type="number" value={f.shipping} onChange={(e) => set({ shipping: e.target.value })} style={{ maxWidth: 130 }} />
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={f.recompute} onChange={(e) => set({ recompute: e.target.checked })} /> {t.recompute}</label>
        </div>
        <button type="button" className="abtn pri" onClick={save}>{t.save}</button>
      </div>
    </details>
  );
}

/* ================= Abandoned ================= */
export function Abandoned() {
  const { t, lang, can, storeName, openDrawer } = useAdmin(), F = useFmt(), R = useRun();
  const [f, setF] = useState<string>(() => remember("abF", "open"));
  const rows = useQ(api.abandoned.list, { status: f as any }) as any[] | undefined;
  return (<>
    <Top title={t.tabs.abandoned} />
    <div className="filters">{["open", "contacted", "converted", "ignored"].map((s) => <button key={s} className="fchip" type="button" aria-pressed={f === s} onClick={() => { keep("abF", s); setF(s); }}>{(t.ast as Record<string, string>)[s]}</button>)}</div>
    <div id="alist">
      {!rows ? <Loading /> : !rows.length ? <Empty /> : (
        <div className="tscroll"><table className="tbl">
          <thead><tr><th>{t.cols.when}</th><th>{t.cols.customer}</th><th>{t.cols.wilaya}</th><th>{t.cols.items}</th><th>{t.cols.total}</th><th>{t.cols.action}</th></tr></thead>
          <tbody>{rows.map((a) => {
            const msg = F.fill(t.waAband, { name: a.name || "", store: storeName, items: itemsTxt(a.items) });
            return (
              <tr key={a.id} style={{ cursor: "default" }}>
                <td className="num">{F.ago(a.at)}</td>
                <td><bdi>{a.name || "—"}</bdi><br /><small className="muted" dir="ltr">{a.phone}</small></td>
                <td>{lang === "ar" ? a.wilayaAr || "" : a.wilaya || ""}{a.commune && <><br /><small className="muted">{a.commune}</small></>}</td>
                <td>{itemsTxt(a.items)}</td>
                <td className="num">{F.money(a.total)}</td>
                <td><div className="acts">
                  <a className="abtn" href={"tel:" + a.phone} aria-label={t.call}><Icon n="phone" s={18} /></a>
                  <a className="abtn wa" target="_blank" rel="noopener" href={"https://wa.me/" + F.waNum(a.phone) + "?text=" + encodeURIComponent(msg)} aria-label="WhatsApp"><Icon n="chat" s={18} /></a>
                  {a.status !== "converted" && can("orders.confirm") && (<>
                    <button type="button" className="abtn pri" onClick={() => openDrawer(<ManualOrder key={"m" + a.id} ab={a} />)}>{t.makeOrder}</button>
                    {a.status === "open" && (<>
                      <button type="button" className="abtn" onClick={() => R.runM(api.abandoned.setStatus, { id: a.id, status: "contacted" }).catch(() => {})}>{t.contacted}</button>
                      <button type="button" className="abtn" onClick={() => R.runM(api.abandoned.setStatus, { id: a.id, status: "ignored" }).catch(() => {})}>{t.ignore}</button>
                    </>)}
                  </>)}
                </div></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
    </div>
  </>);
}

/* ================= Manual order (phone / from abandoned) ================= */
export function ManualOrder({ ab }: { ab?: any }) {
  const { t, lang, flash, openDrawer } = useAdmin(), F = useFmt(), R = useRun();
  const cat = useQ(api.catalog.adminProducts, {}) as any;
  const prods = (cat?.products || []).filter((p: any) => p.active);
  const [name, setName] = useState(ab ? ab.name || "" : ""), [phone, setPhone] = useState(ab ? ab.phone : "");
  const [w, setW] = useState(String((ab && ab.wilayaCode) || 16)), [commune, setCommune] = useState((ab && ab.commune) || "");
  const [mode, setMode] = useState("home"), [address, setAddress] = useState("");
  const [lines, setLines] = useState<{ productId: string; qty: number }[] | null>(ab && ab.items.length ? ab.items.map((i: any) => ({ productId: i.productId, qty: i.qty })) : null);
  const inited = useRef(false);
  useEffect(() => { if (!inited.current && prods.length && !lines) { inited.current = true; setLines([{ productId: prods[0].id, qty: 1 }]); } }, [prods.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const ls = lines || [];
  const setLine = (i: number, patch: Partial<{ productId: string; qty: number }>) => setLines(ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  function submit(e: FormEvent) {
    e.preventDefault();
    const input = { name, phone, wilayaCode: Number(w), commune, mode: mode as any, address, items: ls.map((l) => ({ productId: l.productId as any, qty: l.qty })), lang };
    R.m(api.orders.createManual, { input, fromAbandoned: ab ? ab.id : undefined }).then((r: any) => {
      if (!r.ok) return flash(r.error + (r.product ? ": " + r.product : ""), true);
      flash(r.number); openDrawer(<OrderDrawer key={r.id} id={r.id} />);
    }, (e2) => flash(errMsg(e2), true));
  }

  return (<>
    <DrawerHead title={t.newOrder} />
    <div className="db">
      {!cat ? <Loading /> : (
        <form className="fields" noValidate onSubmit={submit}>
          <div className="f"><label htmlFor="m-name">{t.name}</label><input id="m-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="f"><label htmlFor="m-phone">{t.cols.phone}</label><input id="m-phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="two">
            <div className="f"><label htmlFor="m-w">{t.cols.wilaya}</label><select id="m-w" value={w} onChange={(e) => { setW(e.target.value); setCommune(""); }}><WilayaOptions /></select></div>
            <div className="f"><label htmlFor="m-c">{t.commune}</label><select id="m-c" value={commune} onChange={(e) => setCommune(e.target.value)}>{!commune && <option value="">—</option>}<CommuneOptions code={w} sel={ab && String(ab.wilayaCode) === w ? ab.commune : ""} /></select></div>
          </div>
          <div className="two">
            <div className="f"><label htmlFor="m-mode">{t.mode}</label><select id="m-mode" value={mode} onChange={(e) => setMode(e.target.value)}><option value="home">{t.home}</option><option value="desk">{t.desk}</option></select></div>
            <div className="f"><label htmlFor="m-addr">{t.address}</label><input id="m-addr" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          </div>
          <div className="f">
            <span style={{ fontSize: 15, fontWeight: 500 }}>{t.cols.items}</span>
            {ls.map((l, i) => (
              <div className="mini-f" key={i}>
                <select aria-label={t.cols.product} value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })}>{prods.map((p: any) => <option key={p.id} value={p.id}>{F.tx(p.name)} — {F.money(p.price)}</option>)}</select>
                <input type="number" min={1} max={10} value={l.qty} aria-label="qty" style={{ maxWidth: 80 }} onChange={(e) => setLine(i, { qty: Number(e.target.value) || 1 })} />
                <button type="button" className="abtn" aria-label={t.del} onClick={() => { const n = ls.filter((_, j) => j !== i); setLines(n.length ? n : [{ productId: prods[0].id, qty: 1 }]); }}>×</button>
              </div>
            ))}
            <button type="button" className="abtn" onClick={() => setLines([...ls, { productId: prods[0]?.id, qty: 1 }])}><Icon n="plus" s={18} />{t.addLine}</button>
          </div>
          <button type="submit" className="btn lg">{t.create}</button>
        </form>
      )}
    </div>
  </>);
}
