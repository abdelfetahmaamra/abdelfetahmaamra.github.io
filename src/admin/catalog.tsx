import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";
import { Icon } from "../lib/icons";
import { DrawerHead, Empty, errMsg, keep, Loading, remember, St, Top, useAdmin, useFmt, useQ, useRun } from "./core";
import { OrderDrawer } from "./orders";

/* ================= Customers ================= */
export function Customers() {
  const { t, lang, openDrawer } = useAdmin(), F = useFmt();
  const [input, setInput] = useState(() => remember("cq", ""));
  const [q, setQ] = useState(input);
  const [tag, setTag] = useState(() => remember("ctag", ""));
  useEffect(() => { const id = setTimeout(() => { setQ(input.trim()); keep("cq", input.trim()); }, 400); return () => clearTimeout(id); }, [input]);
  const tags = (useQ(api.customers.allTags, {}) || []) as string[];
  const rows = useQ(api.customers.list, { search: q || undefined, tag: tag || undefined }) as any[] | undefined;
  const auto = t.auto as Record<string, string>;
  const all: [string, string][] = ["loyal", "risk", "unreachable"].map((k) => [k, auto[k]] as [string, string]).concat(tags.map((x) => [x, x] as [string, string]));
  const pick = (v: string) => { keep("ctag", v); setTag(v); };
  const open = (c: any) => openDrawer(<CustomerDrawer key={c.id} c={c} />);

  return (<>
    <Top title={t.tabs.customers} />
    <div className="filters">
      <input type="search" placeholder={t.search} aria-label={t.search} value={input} onChange={(e) => setInput(e.target.value)} />
      <button className="fchip" type="button" aria-pressed={!tag} onClick={() => pick("")}>{t.all}</button>
      {all.map((x) => <button key={x[0]} className="fchip" type="button" aria-pressed={tag === x[0]} onClick={() => pick(x[0])}>{x[1]}</button>)}
    </div>
    <div id="clist">
      {!rows ? <Loading /> : !rows.length ? <Empty /> : (
        <div className="tscroll"><table className="tbl">
          <thead><tr><th>{t.cols.customer}</th><th>{t.cols.wilaya}</th><th>{t.cols.orders}</th><th>{t.st.delivered} / {t.st.returned}</th><th>{t.cols.spent}</th><th>{t.cols.last}</th><th>{t.cols.tags}</th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={c.id} tabIndex={0} onClick={() => open(c)} onKeyDown={(e) => { if (e.key === "Enter") open(c); }}>
              <td><b style={{ fontWeight: 500 }}><bdi>{c.name}</bdi></b><br /><small className="muted" dir="ltr">{c.phone}</small></td>
              <td>{lang === "ar" ? c.wilayaAr || "" : c.wilaya || ""}</td>
              <td className="num">{c.orders}</td>
              <td className="num">{c.delivered} / {c.returned}</td>
              <td className="num">{F.money(c.spent)}</td>
              <td className="num">{F.ago(c.lastOrderAt)}</td>
              <td>
                {c.auto.map((x: string) => <span key={x} className={"tag " + (x === "loyal" ? "good" : x === "risk" ? "risk" : x === "unreachable" ? "warn" : "")}>{auto[x]}</span>)}
                {c.tags.map((x: string) => <span key={x} className="tag">{x}</span>)}
                {c.blocked && <span className="tag risk">{t.blocked}</span>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  </>);
}

function CustomerDrawer({ c }: { c: any }) {
  const { t, can, closeDrawer, openDrawer } = useAdmin(), F = useFmt(), R = useRun();
  const [tags, setTags] = useState(c.tags.join(", "));
  const orders = useQ(api.customers.orders, { id: c.id }) as any[] | undefined;
  return (<>
    <DrawerHead title={<bdi>{c.name}</bdi>} sub={<span dir="ltr">{c.phone}</span>} />
    <div className="db">
      <div className="acts">
        <a className="abtn" href={"tel:" + c.phone}><Icon n="phone" s={18} />{t.call}</a>
        <a className="abtn wa" target="_blank" rel="noopener" href={"https://wa.me/" + F.waNum(c.phone)}><Icon n="chat" s={18} />{t.wa}</a>
        {can("orders.confirm") && <button className={"abtn " + (c.blocked ? "" : "red")} type="button" onClick={() => R.runM(api.customers.update, { id: c.id, blocked: !c.blocked }).then(closeDrawer, () => {})}>{c.blocked ? t.unblock : t.block}</button>}
      </div>
      <div className="kv">
        <span>{t.cols.orders}</span><b>{c.orders}</b><span>{t.st.delivered}</span><b>{c.delivered}</b><span>{t.st.returned}</span><b>{c.returned}</b>
        <span>{t.st.cancelled}</span><b>{c.cancelled}</b><span>{t.st.unreachable}</span><b>{c.unreachable}</b><span>{t.cols.spent}</span><b>{F.money(c.spent)}</b>
      </div>
      {can("orders.confirm") && (
        <div><p className="sec-t">{t.cols.tags}</p><div className="mini-f">
          <label className="sr" htmlFor="tg">{t.cols.tags}</label>
          <input id="tg" placeholder={t.tagsHint} value={tags} onChange={(e) => setTags(e.target.value)} />
          <button type="button" className="abtn pri" onClick={() => R.runM(api.customers.update, { id: c.id, tags: tags.split(",") }).catch(() => {})}>{t.save}</button>
        </div></div>
      )}
      <div><p className="sec-t">{t.cols.orders}</p>
        {!orders ? <Loading /> : !orders.length ? t.none : orders.map((o) => (
          <button key={o.id} type="button" className="abtn" style={{ width: "100%", justifyContent: "space-between", marginBottom: 6 }} onClick={() => openDrawer(<OrderDrawer key={o.id} id={o.id} />)}><bdi>{o.number}</bdi><span>{F.money(o.total)}</span><St s={o.status} /></button>
        ))}
      </div>
    </div>
  </>);
}

/* ================= Products ================= */
const TINTS = ["rose", "sage", "sand", "plum", "sky"], SHAPES = ["dropper", "jar", "tube"];

export function Products() {
  const { t, openDrawer } = useAdmin(), F = useFmt();
  const d = useQ(api.catalog.adminProducts, {}) as any;
  const edit = (p: any) => openDrawer(<ProductEditor key={p ? p.id : "new" + Date.now()} p={p} />);
  return (<>
    <Top title={t.prod.title}>
      <button className="abtn" type="button" onClick={() => d && openDrawer(<CategoryEditor key="cats" />)}>{t.cat.title}</button>
      <button className="abtn pri" type="button" onClick={() => d && edit(null)}><Icon n="plus" s={18} />{t.prod.new}</button>
    </Top>
    <div id="plist">
      {!d ? <Loading /> : !d.products.length ? <Empty /> : (
        <div className="tscroll"><table className="tbl">
          <thead><tr><th></th><th>{t.cols.product}</th><th>{t.prod.category}</th><th>{t.cols.price}</th><th>{t.cols.stock}</th><th>{t.cols.status}</th></tr></thead>
          <tbody>{d.products.map((p: any) => {
            const cat = d.categories.find((c: any) => c.id === p.categoryId), img = p.imageUrls[0]?.url;
            return (
              <tr key={p.id} tabIndex={0} onClick={() => edit(p)} onKeyDown={(e) => { if (e.key === "Enter") edit(p); }}>
                <td style={{ width: 64 }}>{img ? <img src={img} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover" }} /> : <span style={{ display: "block", width: 48, height: 48, borderRadius: "24px 24px 8px 8px", background: "#F1E4DF" }}></span>}</td>
                <td><b style={{ fontWeight: 500 }}>{F.tx(p.name)}</b><br /><small className="muted">{p.slug}</small></td>
                <td>{cat ? F.tx(cat.name) : "—"}</td>
                <td className="num">{F.money(p.price)}</td>
                <td className="num">{p.trackStock ? p.stock : "—"}</td>
                <td>{p.active ? <span className="st delivered">{t.prod.active}</span> : <span className="st cancelled">{t.prod.hidden}</span>}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
    </div>
  </>);
}

/** Resize to 1200 px and re-encode as WebP (≈80–150 KB) so product pages load fast on 3G. */
function compress(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.resolve(file);
  return new Promise((resolve) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1200 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      const done = (b: Blob | null) => resolve(b && b.size < file.size ? b : file);
      c.toBlob((b) => { if (b && b.type === "image/webp") done(b); else c.toBlob(done, "image/jpeg", 0.82); }, "image/webp", 0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(u); resolve(file); };
    img.src = u;
  });
}

function Field({ id, label, value, onChange, type = "text", ...rest }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; [k: string]: any }) {
  return <div className="f"><label htmlFor={id}>{label}</label><input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} /></div>;
}
function Area({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return <div className="f"><label htmlFor={id}>{label}</label><textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} style={{ border: "1px solid var(--line2)", borderRadius: 12, padding: "10px 12px", font: "inherit", fontSize: 15, resize: "vertical" }} /></div>;
}

function ProductEditor({ p }: { p: any }) {
  const { t, flash, closeDrawer } = useAdmin(), F = useFmt(), R = useRun();
  const d = useQ(api.catalog.adminProducts, {}) as any;
  const s = (v: any) => (v == null ? "" : String(v));
  const [v, setV] = useState(() => ({
    nar: s(p?.name.ar), nfr: s(p?.name.fr), price: s(p?.price), cmp: s(p?.compareAt), cat: s(p?.categoryId), slug: s(p?.slug),
    sar: s(p?.size?.ar), sfr: s(p?.size?.fr), dar: s(p?.desc?.ar), dfr: s(p?.desc?.fr),
    bar: p?.benefits ? p.benefits.ar.join("\n") : "", bfr: p?.benefits ? p.benefits.fr.join("\n") : "", uar: s(p?.usage?.ar), ufr: s(p?.usage?.fr),
    w: s(p?.weightKg), sku: s(p?.sku), low: p ? s(p.lowAt) : "5", ord: p ? s(p.sortOrder) : "", shape: p?.shape || "dropper", tint: p?.tint || "rose",
    active: !p || p.active, track: !!p?.trackStock,
  }));
  const set = (k: keyof typeof v) => (x: any) => setV((o) => ({ ...o, [k]: x }));
  const [imgs, setImgs] = useState<{ id: string; url: string }[]>(() => (p ? p.imageUrls.filter((i: any) => i.url).map((i: any) => ({ id: i.id, url: i.url })) : []));
  const [err, setErr] = useState("");
  const cats = d?.categories || [];
  const order = v.ord !== "" ? v.ord : String(d?.products.length ?? 0);

  async function upload(files: File[]) {
    try {
      for (const file of files) {
        flash(t.prod.uploading);
        const [url, blob] = await Promise.all([R.m(api.catalog.generateUploadUrl, {}), compress(file)]);
        const res = await fetch(url as string, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
        const j = await res.json();
        setImgs((l) => [...l, { id: j.storageId, url: URL.createObjectURL(blob) }]);
      }
    } catch (e) { flash(errMsg(e), true); }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    const tr = (x: string) => x.trim(), num = (x: string) => (x.trim() === "" ? undefined : Number(x));
    const lines = (x: string) => x.split("\n").map((l) => l.trim()).filter(Boolean);
    const both = (a: string, b: string) => (tr(a) || tr(b) ? { ar: tr(a), fr: tr(b) } : undefined);
    if (!tr(v.nar) && !tr(v.nfr)) return setErr(t.prod.nameFr);
    const data = {
      slug: tr(v.slug), name: { ar: tr(v.nar) || tr(v.nfr), fr: tr(v.nfr) || tr(v.nar) }, price: num(v.price) || 0, compareAt: num(v.cmp),
      categoryId: (tr(v.cat) || undefined) as any, images: imgs.map((i) => i.id) as any, size: both(v.sar, v.sfr), desc: both(v.dar, v.dfr),
      benefits: lines(v.bar).length || lines(v.bfr).length ? { ar: lines(v.bar), fr: lines(v.bfr) } : undefined, usage: both(v.uar, v.ufr),
      shape: v.shape, tint: v.tint, active: v.active, trackStock: v.track, lowAt: num(v.low) || 0,
      weightKg: num(v.w), sku: tr(v.sku) || undefined, sortOrder: num(order) || 0,
    };
    R.runM(api.catalog.saveProduct, { id: p ? p.id : undefined, data }).then(closeDrawer, () => {});
  }
  const move = (i: number) => setImgs((l) => { const n = [...l]; n.unshift(n.splice(i, 1)[0]); return n; });

  return (<>
    <DrawerHead title={p ? F.tx(p.name) : t.prod.new} />
    <div className="db"><form className="fields" noValidate onSubmit={submit}>
      <div className="two"><Field id="p-nar" label={t.prod.nameAr} value={v.nar} onChange={set("nar")} /><Field id="p-nfr" label={t.prod.nameFr} value={v.nfr} onChange={set("nfr")} /></div>
      <div className="two"><Field id="p-price" label={t.prod.price} value={v.price} onChange={set("price")} type="number" min={0} /><Field id="p-cmp" label={t.prod.compareAt + " (" + t.optional + ")"} value={v.cmp} onChange={set("cmp")} type="number" min={0} /></div>
      <div className="two">
        <div className="f"><label htmlFor="p-cat">{t.prod.category}</label>
          <select id="p-cat" value={v.cat} onChange={(e) => set("cat")(e.target.value)}>
            <option value="">{t.prod.noCat}</option>
            {cats.map((c: any) => { const par = cats.find((x: any) => x.id === c.parentId); return <option key={c.id} value={c.id}>{(par ? F.tx(par.name) + " › " : "") + F.tx(c.name)}</option>; })}
          </select></div>
        <Field id="p-slug" label={t.prod.slug} value={v.slug} onChange={set("slug")} />
      </div>
      <div className="f">
        <span style={{ fontSize: 15, fontWeight: 500 }}>{t.prod.images}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {imgs.map((im, i) => (
            <div key={im.id} style={{ position: "relative", width: 92 }}>
              <img src={im.url} alt="" style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 12, border: "2px solid " + (i ? "var(--line)" : "var(--teal)") }} />
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {i > 0 && <button type="button" className="abtn" style={{ minHeight: 32, padding: "0 8px", fontSize: 12 }} onClick={() => move(i)}>{t.prod.main}</button>}
                <button type="button" className="abtn red" style={{ minHeight: 32, padding: "0 8px", fontSize: 12 }} aria-label={t.del} onClick={() => setImgs((l) => l.filter((_, j) => j !== i))}>×</button>
              </div>
            </div>
          ))}
        </div>
        <label className="abtn" style={{ width: "max-content", cursor: "pointer" }}><Icon n="plus" s={18} />{t.prod.upload}
          <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { upload(Array.from(e.target.files || [])); e.target.value = ""; }} /></label>
      </div>
      <div className="two"><Field id="p-sar" label={t.prod.sizeAr} value={v.sar} onChange={set("sar")} /><Field id="p-sfr" label={t.prod.sizeFr} value={v.sfr} onChange={set("sfr")} /></div>
      <Area id="p-dar" label={t.prod.descAr} value={v.dar} onChange={set("dar")} /><Area id="p-dfr" label={t.prod.descFr} value={v.dfr} onChange={set("dfr")} />
      <Area id="p-bar" label={t.prod.benAr} value={v.bar} onChange={set("bar")} /><Area id="p-bfr" label={t.prod.benFr} value={v.bfr} onChange={set("bfr")} />
      <Area id="p-uar" label={t.prod.useAr} value={v.uar} onChange={set("uar")} /><Area id="p-ufr" label={t.prod.useFr} value={v.ufr} onChange={set("ufr")} />
      <div className="two"><Field id="p-w" label={t.prod.weight} value={v.w} onChange={set("w")} type="number" step="0.01" min={0} /><Field id="p-sku" label={t.prod.sku} value={v.sku} onChange={set("sku")} /></div>
      <div className="two"><Field id="p-low" label={t.cols.lowAt} value={v.low} onChange={set("low")} type="number" min={0} /><Field id="p-ord" label={t.prod.order} value={order} onChange={set("ord")} type="number" /></div>
      <div className="two">
        <div className="f"><label htmlFor="p-shape">{t.prod.shape}</label><select id="p-shape" value={v.shape} onChange={(e) => set("shape")(e.target.value)}>{SHAPES.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="f"><label htmlFor="p-tint">{t.prod.tint}</label><select id="p-tint" value={v.tint} onChange={(e) => set("tint")(e.target.value)}>{TINTS.map((x) => <option key={x}>{x}</option>)}</select></div>
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 44 }}><input type="checkbox" checked={v.active} onChange={(e) => set("active")(e.target.checked)} style={{ width: 20, height: 20 }} /> {t.prod.active}</label>
      <label style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 44 }}><input type="checkbox" checked={v.track} onChange={(e) => set("track")(e.target.checked)} style={{ width: 20, height: 20 }} /> {t.prod.track}</label>
      <div className="alert" hidden={!err}>{err}</div>
      <button className="btn lg" type="submit">{t.save}</button>
    </form></div>
  </>);
}

function CategoryEditor() {
  const { t, ask } = useAdmin(), F = useFmt(), R = useRun();
  const d = useQ(api.catalog.adminProducts, {}) as any;
  const [edits, setEdits] = useState<Record<string, { ar: string; fr: string; par: string; ord: string }>>({});
  const [nw, setNw] = useState({ ar: "", fr: "", par: "" });
  if (!d) return <><DrawerHead title={t.cat.title} /><div className="db"><Loading /></div></>;
  const cats = d.categories as any[], tops = cats.filter((c) => !c.parentId);
  const val = (c: any) => edits[c.id] || { ar: c.name.ar, fr: c.name.fr, par: c.parentId || "", ord: String(c.sortOrder) };
  const edit = (c: any, patch: Partial<{ ar: string; fr: string; par: string; ord: string }>) => setEdits((e) => ({ ...e, [c.id]: { ...val(c), ...patch } }));

  return (<>
    <DrawerHead title={t.cat.title} />
    <div className="db">
      {cats.map((c) => { const x = val(c); return (
        <div key={c.id} className="box" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, marginInlineStart: c.parentId ? 24 : undefined }}>
          <div className="mini-f"><input aria-label="ar" value={x.ar} onChange={(e) => edit(c, { ar: e.target.value })} /><input aria-label="fr" value={x.fr} onChange={(e) => edit(c, { fr: e.target.value })} /></div>
          <div className="mini-f">
            <select aria-label={t.cat.parent} value={x.par} onChange={(e) => edit(c, { par: e.target.value })}><option value="">{t.cat.none}</option>{tops.filter((p) => p.id !== c.id).map((p) => <option key={p.id} value={p.id}>{F.tx(p.name)}</option>)}</select>
            <input type="number" aria-label={t.prod.order} value={x.ord} onChange={(e) => edit(c, { ord: e.target.value })} style={{ maxWidth: 80 }} />
            <button className="abtn pri" type="button" onClick={() => R.runM(api.catalog.saveCategory, { id: c.id, slug: c.slug, name: { ar: x.ar.trim(), fr: x.fr.trim() }, parentId: (x.par || undefined) as any, sortOrder: Number(x.ord) || 0 }).catch(() => {})}>{t.save}</button>
            <button className="abtn red" type="button" onClick={() => ask().then((y) => { if (y) R.runM(api.catalog.deleteCategory, { id: c.id }).catch(() => {}); })}>{t.del}</button>
          </div>
        </div>
      ); })}
      <div className="box" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <b>{t.cat.new}</b>
        <div className="mini-f"><input placeholder={t.prod.nameAr} value={nw.ar} onChange={(e) => setNw({ ...nw, ar: e.target.value })} /><input placeholder={t.prod.nameFr} value={nw.fr} onChange={(e) => setNw({ ...nw, fr: e.target.value })} /></div>
        <div className="mini-f">
          <select aria-label={t.cat.parent} value={nw.par} onChange={(e) => setNw({ ...nw, par: e.target.value })}><option value="">{t.cat.none}</option>{tops.map((p) => <option key={p.id} value={p.id}>{F.tx(p.name)}</option>)}</select>
          <button className="abtn pri" type="button" onClick={() => {
            const ar = nw.ar.trim(), fr = nw.fr.trim(); if (!ar && !fr) return;
            R.runM(api.catalog.saveCategory, { slug: "", name: { ar: ar || fr, fr: fr || ar }, parentId: (nw.par || undefined) as any, sortOrder: cats.length }).then(() => setNw({ ar: "", fr: "", par: "" }), () => {});
          }}>{t.add}</button>
        </div>
      </div>
    </div>
  </>);
}

/* ================= Stock ================= */
export function Stock() {
  const { t, can } = useAdmin(), F = useFmt(), R = useRun();
  const d = useQ(api.stock.overview, {}) as any;
  const [delta, setDelta] = useState<Record<string, string>>({}), [reason, setReason] = useState<Record<string, string>>({});
  if (!d) return <><Top title={t.tabs.stock} /><Loading /></>;
  const canS = can("stock");
  const pname = (id: string) => { const p = d.products.find((x: any) => x.id === id); return p ? F.tx(p.name) : "?"; };
  return (<>
    <Top title={t.tabs.stock} />
    <div id="slist">
      <div className="tscroll"><table className="tbl">
        <thead><tr><th>{t.cols.product}</th><th>{t.cols.stock}</th><th>{t.cols.lowAt}</th><th>{t.cols.status}</th>{canS && <th>{t.cols.action}</th>}</tr></thead>
        <tbody>{d.products.map((p: any) => (
          <tr key={p.id} style={{ cursor: "default" }}>
            <td>{F.tx(p.name)}{p.sku && <><br /><small className="muted">{p.sku}</small></>}{!p.active && <> <small className="muted">({t.prod.hidden})</small></>}</td>
            <td className="num"><b style={{ fontSize: 17 }}>{p.trackStock ? p.stock : "—"}</b></td>
            <td className="num">{p.trackStock ? p.lowAt : "—"}</td>
            <td>{!p.trackStock ? <span className="st cancelled">{t.stock.untracked}</span> : p.stock <= 0 ? <span className="st returned">{t.stock.out}</span> : p.stock <= p.lowAt ? <span className="st unreachable">{t.stock.low}</span> : <span className="st delivered">{t.stock.ok}</span>}</td>
            {canS && <td>{p.trackStock ? (
              <div className="mini-f" style={{ minWidth: 340 }}>
                <label className="sr" htmlFor={"d-" + p.id}>±</label>
                <input id={"d-" + p.id} type="number" placeholder="±" style={{ maxWidth: 90 }} value={delta[p.id] || ""} onChange={(e) => setDelta({ ...delta, [p.id]: e.target.value })} />
                <input placeholder={t.stock.reason} aria-label={t.stock.reason} value={reason[p.id] || ""} onChange={(e) => setReason({ ...reason, [p.id]: e.target.value })} />
                <button type="button" className="abtn" onClick={() => {
                  const dd = Number(delta[p.id]); if (!dd) return;
                  R.runM(api.stock.adjust, { productId: p.id, delta: dd, reason: reason[p.id] || "" }).then(() => { setDelta({ ...delta, [p.id]: "" }); setReason({ ...reason, [p.id]: "" }); }, () => {});
                }}>{t.stock.adjust}</button>
              </div>
            ) : <button type="button" className="abtn pri" onClick={() => R.runM(api.stock.adjust, { productId: p.id, set: 0, reason: "init" }).catch(() => {})}>{t.stock.start}</button>}</td>}
          </tr>
        ))}</tbody>
      </table></div>
      <div className="box" style={{ marginTop: 14 }}>
        <h2>{t.stock.moves}</h2>
        {d.moves.length ? <ul className="hist">{d.moves.map((mv: any, i: number) => (
          <li key={i}><b>{pname(mv.productId)}</b> {mv.delta > 0 ? "+" : ""}{mv.delta} → {mv.after} · {mv.reason}{mv.order && <> <bdi>({mv.order})</bdi></>}<time>{mv.by || ""} · {F.dt(mv.at)}</time></li>
        ))}</ul> : <p className="muted" style={{ margin: 0 }}>{t.none}</p>}
      </div>
    </div>
  </>);
}
