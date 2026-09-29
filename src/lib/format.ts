import type { Lang } from "./config";

export type Bi = { ar?: string; fr?: string } | string | null | undefined;

/** Pick the text for the current language from a {ar, fr} pair. */
export function tx(o: Bi | any, lang: Lang): string { return o && typeof o === "object" ? (o[lang] || o.ar || o.fr || "") : (o || ""); }
export function fill(s: string, v: Record<string, unknown>) { return String(s).replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? String(v[k]) : "")); }
export function money(n: number, lang: Lang) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + (lang === "ar" ? "دج" : "DA"); }
export function normKey(s: string) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, "").replace(/[-_]/g, " ").replace(/\s+/g, " ").trim().toLowerCase(); }
export function cleanPhone(v: string) { return String(v).replace(/[\s.\-()]/g, "").replace(/^\+213/, "0").replace(/^00213/, "0"); }
export function validPhone(v: string) { return /^0[567]\d{8}$/.test(cleanPhone(v)); }
/** Restart a CSS "bump" animation on an element. */
export function bump(el: Element | null) { if (!el) return; el.classList.remove("bump"); void (el as HTMLElement).offsetWidth; el.classList.add("bump"); }
