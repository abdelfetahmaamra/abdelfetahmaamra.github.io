declare const __CONVEX_URL__: string;
declare const __CONVEX_SITE__: string;

/** Convex client URL (admin panel, websocket) and HTTP actions URL (storefront API). Set via env, see vite.config.ts. */
export const CONVEX_URL = __CONVEX_URL__;
export const SITE = __CONVEX_SITE__.replace(/\/+$/, "");
/** No backend configured → the store runs on data/demo.json and orders are not sent. */
export const DEMO = !SITE;
export const DEFAULT_LANG: Lang = "ar";

export type Lang = "ar" | "fr";
