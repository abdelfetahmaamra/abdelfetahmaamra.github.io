import type { CarrierState } from "../status";

export type CarrierCode = "yalidine" | "zr_express" | "noest" | "ecotrack";

export type ShipmentInput = {
  reference: string; // our order number, e.g. RQ-10042
  name: string;
  phone: string; // 0XXXXXXXXX
  phone2?: string;
  address: string;
  wilayaCode: number; // 1–58 (already mapped from 2026 wilayas via shipAs)
  wilayaName: string; // French name
  commune: string; // carrier-exact name when known
  amount: number; // COD the driver collects (products + delivery)
  description: string;
  stopDesk: boolean;
  stationCode?: string;
  weight?: number;
  canOpen?: boolean;
  remarks?: string;
  originWilayaName: string;
};

export type ShipmentResult = { tracking: string; labelUrl?: string; parcelId?: string; warning?: string };
export type TrackResult = { state: CarrierState; raw: string };
export type StopDesk = { code: string; name: string; wilayaCode: number | null; commune?: string; address?: string };
export type Label = { url: string } | { pdf: ArrayBuffer };

export interface Carrier {
  code: CarrierCode;
  label: string;
  configured: boolean;
  test(): Promise<{ ok: boolean; message: string }>;
  create(input: ShipmentInput): Promise<ShipmentResult>;
  track(items: { tracking: string; parcelId?: string | null }[]): Promise<Map<string, TrackResult>>;
  getLabel(tracking: string, parcelId?: string | null): Promise<Label>;
  cancel?(tracking: string, parcelId?: string | null): Promise<void>;
  /** Carriers that create drafts (NOEST, EcoTrack) need a validation call; retried from the admin if it failed. */
  validate?(tracking: string): Promise<void>;
  stopDesks(): Promise<StopDesk[]>;
  communes?(): Promise<{ wilayaCode: number; name: string }[]>;
}

export class CarrierError extends Error {}

export async function http(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<{ status: number; text: string; json: any }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), init.timeoutMs ?? 15000);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { status: res.status, text, json };
  } catch (e: any) {
    throw new CarrierError(e?.name === "AbortError" ? "Carrier did not answer in time" : "Network error: " + (e?.message ?? e));
  } finally {
    clearTimeout(timer);
  }
}

/** Flatten Laravel `{field:[msg]}` or ASP.NET `[{description}]` error bags. */
export function flattenErrors(bag: unknown): string | null {
  if (!bag) return null;
  if (Array.isArray(bag)) return bag.map((e: any) => (typeof e === "string" ? e : e?.description ?? e?.message ?? JSON.stringify(e))).join(" | ") || null;
  if (typeof bag === "object") {
    const parts = Object.entries(bag as Record<string, unknown>).map(([k, m]) => `${k}: ${Array.isArray(m) ? m.join(", ") : String(m)}`);
    return parts.join(" | ") || null;
  }
  return String(bag);
}

/** Run fn over items with at most `size` requests in flight. */
export async function pool<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map((x) => fn(x).catch(() => {})));
}

export function short(text: string, n = 180) {
  return text.replace(/\s+/g, " ").slice(0, n);
}
