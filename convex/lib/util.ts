import { wilaya, WILAYAS } from "./wilayas";

/** Lower-case, accent-free, apostrophe-free key used to match names across carriers. */
export function normKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, "");
}

/** Algerian mobile: 05/06/07 + 8 digits. Returns the 10-digit local form or null. */
export function cleanPhone(raw: string): string | null {
  let p = String(raw || "").replace(/[\s.\-()]/g, "");
  if (p.startsWith("+213")) p = "0" + p.slice(4);
  else if (p.startsWith("00213")) p = "0" + p.slice(5);
  else if (p.startsWith("213") && p.length === 12) p = "0" + p.slice(3);
  return /^0[567]\d{8}$/.test(p) ? p : null;
}

export function e164(phone: string): string {
  return "213" + phone.replace(/^0/, "");
}

export function clip(s: unknown, max = 200): string {
  return String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
}

/** Wilaya the carriers know (new 2026 wilayas 59–69 ship via their parent). */
export function shipWilaya(code: number) {
  const w = wilaya(code);
  if (!w) return undefined;
  return wilaya(w.s) ?? w;
}

export function wilayaName(code: number, lang: "fr" | "ar" = "fr"): string {
  const w = wilaya(code);
  return w ? (lang === "ar" ? w.a : w.n) : String(code);
}

export function isValidWilaya(code: number): boolean {
  return WILAYAS.some((w) => w.c === code);
}

export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "Client", last: "Client" };
  return { first: parts[0], last: parts.length > 1 ? parts.slice(1).join(" ") : parts[0] };
}

/** "Sérum x2, Crème x1 — RQ-10042", capped at max chars. */
export function productDescription(items: { name: string; qty: number }[], ref: string, max = 255): string {
  const suffix = " — " + ref;
  const names = items.map((i) => (i.qty > 1 ? `${i.name} x${i.qty}` : i.name)).join(", ");
  if (!names) return ref;
  if (names.length + suffix.length <= max) return names + suffix;
  return names.slice(0, max - suffix.length - 1) + "…" + suffix;
}

export function randomToken(bytes = 32): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const DAY = 24 * 60 * 60 * 1000;
export const HOUR = 60 * 60 * 1000;
