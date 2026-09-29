import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_LANG, type Lang } from "../lib/config";
import { fill, money, normKey, tx } from "../lib/format";
import { wilaya } from "../lib/geo";
import { I18N, type Texts } from "../lib/i18n";
import { lsGet, lsSet } from "../lib/storage";
import { loadStore } from "./api";
import { initPixels, track } from "./pixels";
import type { CartLine, Mode, Product, StoreData } from "./types";

type Ctx = {
  data: StoreData; lang: Lang; t: Texts; setLang: (l: Lang) => void;
  tx: (o: any) => string; money: (n: number) => string; fill: typeof fill;
  product: (id: string) => Product | undefined; catName: (slug?: string | null) => string;
  quote: (code: string | number, commune: string, mode: Mode, subtotal: number) => number | null;
  cart: CartLine[]; cartCount: number; badgeBump: number;
  addToCart: (id: string, q?: number) => void; setQty: (id: string, q: number) => void; removeFromCart: (id: string) => void; clearCart: () => void;
  toast: (node: ReactNode) => void;
};
const StoreCtx = createContext<Ctx | null>(null);
export function useStore() { const c = useContext(StoreCtx); if (!c) throw new Error("useStore outside StoreProvider"); return c; }

export function useLang() {
  const [lang, setLangState] = useState<Lang>(() => lsGet<Lang | null>("ronaq_lang", null) || DEFAULT_LANG);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; }, [lang]);
  const setLang = useCallback((l: Lang) => { lsSet("ronaq_lang", l); setLangState(l); }, []);
  return [lang, setLang] as const;
}

export function StoreProvider({ children, loading, failed }: { children: ReactNode; loading: ReactNode; failed: (t: Texts) => ReactNode }) {
  const [lang, setLang] = useLang();
  const [data, setData] = useState<StoreData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { loadStore(setData).then(setData, () => setError(true)); }, []);
  useEffect(() => { if (data) initPixels(data.store); }, [data]);

  const [rawCart, setRawCart] = useState<CartLine[]>(() => lsGet<CartLine[]>("ronaq_cart", []));
  const [badgeBump, setBadgeBump] = useState(0);
  const [toastNode, setToastNode] = useState<ReactNode>(null);
  const [toastShow, setToastShow] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const value = useMemo<Ctx | null>(() => {
    if (!data) return null;
    const t = I18N[lang] as Texts;
    const _tx = (o: any) => tx(o, lang);
    const product = (id: string) => data.products.find((p) => p.id === id || p.slug === id);
    const cart = rawCart.filter((l) => { const p = product(l.id); return p && p.inStock; });
    const save = (c: CartLine[]) => { lsSet("ronaq_cart", c); setRawCart(c); setBadgeBump((n) => n + 1); };
    /** Same rule as the server: commune override > wilaya override > zone default; null = not offered. */
    const quote = (code: string | number, commune: string, mode: Mode, subtotal: number) => {
      const w = wilaya(code); if (!w) return null;
      const key = normKey(commune);
      const rows = data.rates.filter((r) => r.w === w.c);
      const cr = commune ? rows.find((r) => r.c && normKey(r.c) === key) : undefined;
      const src = cr || rows.find((r) => !r.c);
      const fee = src ? (mode === "home" ? src.h : src.d) : data.store.zoneFees[w.z][mode];
      if (fee == null) return null;
      if (data.store.freeShippingFrom > 0 && subtotal >= data.store.freeShippingFrom) return 0;
      return fee;
    };
    return {
      data, lang, t, setLang, tx: _tx, money: (n) => money(n, lang), fill,
      product, catName: (slug) => { const c = data.categories.find((x) => x.slug === slug); return c ? _tx(c.name) : ""; },
      quote, cart, cartCount: cart.reduce((s, l) => s + l.qty, 0), badgeBump,
      addToCart: (id, q = 1) => {
        const c = cart.map((l) => ({ ...l })), f = c.find((l) => l.id === id);
        if (f) f.qty = Math.min(10, f.qty + q); else c.push({ id, qty: q });
        save(c); const p = product(id); track("AddToCart", { value: (p?.price || 0) * q, ids: [id] });
      },
      setQty: (id, q) => save(cart.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(10, q)) } : l))),
      removeFromCart: (id) => save(cart.filter((l) => l.id !== id)),
      clearCart: () => save([]),
      toast: (node) => {
        setToastNode(node); requestAnimationFrame(() => setToastShow(true));
        clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToastShow(false), 3200);
      },
    };
  }, [data, lang, setLang, rawCart, badgeBump]);

  if (error && !data) return <>{failed(I18N[lang] as Texts)}</>;
  if (!value) return <>{loading}</>;
  return (
    <StoreCtx.Provider value={value}>
      {children}
      <div className={"toast" + (toastShow ? " show" : "")} role="status">{toastNode}</div>
    </StoreCtx.Provider>
  );
}
