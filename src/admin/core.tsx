import { Component, createContext, useContext, type ReactNode } from "react";
import { useQuery } from "convex/react";
import type { ConvexReactClient } from "convex/react";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";
import type { Lang } from "../lib/config";
import { fill, money, tx } from "../lib/format";
import type { AT } from "./i18n";

export type Geo = { wilayas: { c: number; n: string; a: string; s: number; z: "A" | "N" | "S" }[]; communes: Record<string, [string, string?][]> };
export type Me = { id: string; name: string; email: string; role: "owner" | "manager" | "confirmer" | "logistics"; perms: string[] };

export type AdminCtx = {
  lang: Lang; t: AT; token: string; me: Me; geo: Geo; settings: any; storeName: string; counts: Record<string, number>;
  convex: ConvexReactClient;
  can: (perm: string) => boolean;
  flash: (msg: string, bad?: boolean) => void;
  ask: (text?: string) => Promise<boolean>;
  openDrawer: (node: ReactNode) => void; closeDrawer: () => void;
  go: (tab: string, extra?: Record<string, string>) => void;
  logout: () => void; switchLang: () => void;
};
export const Ctx = createContext<AdminCtx | null>(null);
export function useAdmin() { const c = useContext(Ctx); if (!c) throw new Error("useAdmin outside admin"); return c; }

/** Readable message from a Convex error (ConvexError data, or the server error text). */
export function errMsg(e: any): string {
  return (e && e.data && (e.data.message || (typeof e.data === "string" ? e.data : ""))) || (e && e.message ? String(e.message).replace(/^.*Uncaught (ConvexError|Error): /, "").split("\n")[0] : "Error");
}
export function isAuthError(e: any) { return (e && e.data && e.data.code === "unauthenticated") || /unauth|Session|signed/i.test(errMsg(e)); }

type TokenArgs<F extends FunctionReference<any>> = Omit<FunctionArgs<F>, "token">;

/** Live query with the session token added. `undefined` while loading. */
export function useQ<F extends FunctionReference<"query">>(ref: F, args: TokenArgs<F> | "skip"): FunctionReturnType<F> | undefined {
  const { token } = useAdmin();
  return useQuery(ref, (args === "skip" ? "skip" : { ...args, token }) as any);
}

/** Mutations/actions with the token, plus a success/error toast (okMsg=false: silent on success). */
export function useRun() {
  const { convex, token, flash, t } = useAdmin();
  const withToken = (args: any) => ({ ...(args || {}), token });
  const m = <F extends FunctionReference<"mutation">>(ref: F, args: TokenArgs<F>): Promise<FunctionReturnType<F>> => convex.mutation(ref, withToken(args));
  const a = <F extends FunctionReference<"action">>(ref: F, args: TokenArgs<F>): Promise<FunctionReturnType<F>> => convex.action(ref, withToken(args));
  const q = <F extends FunctionReference<"query">>(ref: F, args: TokenArgs<F>): Promise<FunctionReturnType<F>> => convex.query(ref, withToken(args));
  function feedback<T>(p: Promise<T>, okMsg?: string | false): Promise<T> {
    return p.then((r) => { if (okMsg !== false) flash(okMsg || t.saved); return r; }, (e) => { flash(errMsg(e), true); throw e; });
  }
  return {
    m, a, q,
    runM: <F extends FunctionReference<"mutation">>(ref: F, args: TokenArgs<F>, okMsg?: string | false) => feedback(m(ref, args), okMsg),
    runA: <F extends FunctionReference<"action">>(ref: F, args: TokenArgs<F>, okMsg?: string | false) => feedback(a(ref, args), okMsg),
  };
}

/** Formatting helpers bound to the admin language. */
export function useFmt() {
  const { lang, t, geo } = useAdmin();
  const wilaya = (c: unknown) => geo.wilayas.find((w) => w.c === Number(c));
  return {
    tx: (o: any) => tx(o, lang), fill, money: (n: number) => money(n, lang),
    pct: (a: number, b: number) => (b ? Math.round((a / b) * 100) + "%" : "—"),
    dt: (ms?: number | null) => {
      if (!ms) return ""; const d = new Date(ms);
      return d.toLocaleDateString(lang === "ar" ? "ar-DZ-u-nu-latn" : "fr-FR", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    },
    ago: (ms: number) => { const m = Math.max(0, Math.round((Date.now() - ms) / 60000)); return m < 60 ? fill(t.ago.m, { n: m }) : m < 1440 ? fill(t.ago.h, { n: Math.round(m / 60) }) : fill(t.ago.d, { n: Math.round(m / 1440) }); },
    waNum: (p: string) => "213" + String(p).replace(/^0/, ""),
    wilaya, wname: (c: unknown) => { const w = wilaya(c); return w ? (lang === "ar" ? w.a : w.n) : String(c || ""); },
  };
}

export function St({ s, map, cls }: { s: string; map?: Record<string, string>; cls?: string }) {
  const { t } = useAdmin();
  return <span className={"st " + (cls || s)}>{(map || (t.st as Record<string, string>))[s] || s}</span>;
}

export function WilayaOptions() {
  const { geo, lang } = useAdmin();
  return <>{geo.wilayas.map((w) => <option key={w.c} value={w.c}>{(w.c < 10 ? "0" : "") + w.c + " - " + (lang === "ar" ? w.a : w.n)}</option>)}</>;
}
/** Communes of a wilaya; a saved value missing from the list stays selectable. */
export function CommuneOptions({ code, sel }: { code: unknown; sel?: string }) {
  const { geo, lang } = useAdmin();
  const list = geo.communes[String(code)] || [];
  const found = !!sel && list.some((c) => c[0] === sel);
  return (<>
    {sel && !found && <option value={sel}>{sel}</option>}
    {list.map((c) => <option key={c[0]} value={c[0]}>{lang === "ar" ? c[1] || c[0] : c[0]}</option>)}
  </>);
}

export function Top({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="top"><h1>{title}</h1><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{children}</div></div>;
}
export function Loading() { const { t } = useAdmin(); return <p className="muted">{t.loading}</p>; }
export function Empty() { const { t } = useAdmin(); return <div className="emptyst">{t.none}</div>; }

export function DrawerHead({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  const { t, closeDrawer } = useAdmin();
  return (
    <div className="dh">
      {sub ? <div><h2>{title}</h2><small className="muted">{sub}</small></div> : <h2>{title}</h2>}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{right}<button className="x" type="button" aria-label={t.close} onClick={closeDrawer}><XIcon /></button></div>
    </div>
  );
}
function XIcon() { return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>; }

/** Keeps per-tab filters (period, status, search…) while switching tabs, like the old panel. */
const memory: Record<string, any> = {};
export function remember<T>(key: string, d: T): T { return key in memory ? memory[key] : d; }
export function keep(key: string, v: unknown) { memory[key] = v; }

/** A failing live query shows its error here; an expired session signs out. */
export class ViewBoundary extends Component<{ onAuth: () => void; children: ReactNode; resetKey: string }, { err: any }> {
  state = { err: null as any };
  static getDerivedStateFromError(err: any) { return { err }; }
  componentDidCatch(err: any) { if (isAuthError(err)) this.props.onAuth(); }
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null }); }
  render() {
    if (this.state.err) return <div className="alert">{errMsg(this.state.err)} <button className="abtn" type="button" onClick={() => this.setState({ err: null })}>↻</button></div>;
    return this.props.children;
  }
}
