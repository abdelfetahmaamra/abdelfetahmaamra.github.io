/* Shape of GET /api/storefront (see convex/catalog.ts › storefront). */
export type BiText = { ar: string; fr: string };
export type Product = {
  id: string; slug: string; name: BiText; size?: BiText | null; desc?: BiText | null;
  benefits?: { ar: string[]; fr: string[] } | null; usage?: BiText | null;
  price: number; compareAt?: number | null; cat?: string | null; images?: string[];
  shape?: string; tint?: string; inStock: boolean;
};
export type Category = { slug: string; name: BiText; parent: string | null };
export type Rate = { w: number; c?: string | null; h?: number | null; d?: number | null };
export type StoreInfo = {
  name: BiText; tagline: BiText; phone: string; whatsapp: string; freeShippingFrom: number;
  confirmDelay: BiText; deliveryDelay: BiText; zoneFees: Record<"A" | "N" | "S", { home: number | null; desk: number | null }>;
  fbPixelId?: string | null; tiktokPixelId?: string | null; defaultCarrier?: string | null;
};
export type StoreData = { store: StoreInfo; categories: Category[]; products: Product[]; rates: Rate[] };
export type CartLine = { id: string; qty: number };
export type Mode = "home" | "desk";
export type LastOrder = {
  number: string; name: string; phone: string; wilayaCode: number; commune: string; address: string; mode: Mode;
  items: { productId?: string; name: string; qty: number; price: number }[]; subtotal?: number; shipping?: number; total: number; page?: string; at?: number;
};
