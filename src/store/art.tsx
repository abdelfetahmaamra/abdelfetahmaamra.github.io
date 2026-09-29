import type { Product } from "./types";

/* Placeholder bottle/jar/tube drawings used until a product has real photos. */
const TINTS: Record<string, [string, string, string]> = {
  rose: ["#E7B7B9", "#8E3150", "#F6E4E2"], sage: ["#BFD3CA", "#1E5A55", "#E3EDE8"], sand: ["#E8D2B0", "#7A5230", "#F3E9DA"],
  plum: ["#CDB6D6", "#4B2A56", "#ECE2F0"], sky: ["#BCD2E0", "#2D4F6B", "#E1EBF1"],
};
export function tint(p: Product) { return TINTS[p.tint || ""] || TINTS.rose; }

function Label({ y, h, b }: { y: number; h: number; b: string }) {
  return (<>
    <rect x="40" y={y} width="40" height={h} rx="4" fill="#fff" opacity=".85" />
    <rect x="46" y={y + 10} width="28" height="4" rx="2" fill={b} opacity=".7" />
    <rect x="46" y={y + 20} width="20" height="3" rx="1.5" fill={b} opacity=".4" />
  </>);
}

export function Art({ p, w }: { p: Product; w: number }) {
  const [a, b] = tint(p);
  let body;
  if (p.shape === "jar") body = (<>
    <rect x="22" y="62" width="76" height="24" rx="7" fill={b} /><rect x="18" y="82" width="84" height="68" rx="18" fill={a} />
    <rect x="32" y="100" width="56" height="30" rx="4" fill="#fff" opacity=".85" />
  </>);
  else if (p.shape === "tube") body = (<>
    <rect x="56" y="4" width="10" height="20" rx="2" fill={b} /><rect x="56" y="4" width="30" height="8" rx="4" fill={b} />
    <rect x="44" y="22" width="32" height="18" rx="5" fill={b} /><rect x="30" y="38" width="60" height="112" rx="20" fill={a} /><Label y={74} h={48} b={b} />
  </>);
  else body = (<>
    <rect x="50" y="6" width="20" height="34" rx="6" fill={b} /><rect x="46" y="36" width="28" height="12" rx="3" fill={b} />
    <rect x="32" y="46" width="56" height="104" rx="16" fill={a} /><Label y={78} h={44} b={b} />
  </>);
  return <svg width={w} height={Math.round((w * 4) / 3)} viewBox="0 0 120 160" aria-hidden="true">{body}</svg>;
}

/** First photo if the product has one, otherwise the drawing. */
export function Visual({ p, w, alt, eager }: { p: Product; w: number; alt: string; eager?: boolean }) {
  if (p.images && p.images.length) {
    return <img src={p.images[0]} alt={alt} width={400} height={420} decoding="async" {...(eager ? { fetchPriority: "high" as const } : { loading: "lazy" as const })} />;
  }
  return <Art p={p} w={w} />;
}
