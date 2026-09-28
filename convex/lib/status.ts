import type { Doc } from "../_generated/dataModel";

export type OrderStatus = Doc<"orders">["status"];
export type Role = Doc<"members">["role"];

/** Allowed manual transitions (dispatch to a carrier also moves confirmed/preparing → shipped). */
export const NEXT: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "unreachable", "cancelled"],
  unreachable: ["confirmed", "unreachable", "cancelled"],
  confirmed: ["preparing", "shipped", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: [],
  returned: [],
  cancelled: ["new"],
};

/** Statuses where stock is considered consumed. */
export const CONSUMES: Partial<Record<OrderStatus, true>> = { confirmed: true, preparing: true, shipped: true, delivered: true };
export const FINAL: Partial<Record<OrderStatus, true>> = { delivered: true, returned: true, cancelled: true };

export type Perm = "orders.confirm" | "orders.ship" | "catalog" | "stock" | "settings" | "team" | "view";

const ROLE_PERMS: Record<Role, Perm[]> = {
  owner: ["view", "orders.confirm", "orders.ship", "catalog", "stock", "settings", "team"],
  manager: ["view", "orders.confirm", "orders.ship", "catalog", "stock", "settings"],
  confirmer: ["view", "orders.confirm"],
  logistics: ["view", "orders.ship", "stock"],
};
export function can(role: Role, perm: Perm): boolean {
  return ROLE_PERMS[role].includes(perm);
}
export function permsOf(role: Role): Perm[] {
  return ROLE_PERMS[role];
}

/** Which permission a transition needs. */
export function permForTransition(to: OrderStatus): Perm {
  return to === "preparing" || to === "shipped" || to === "delivered" || to === "returned" ? "orders.ship" : "orders.confirm";
}

/** Normalized carrier states → what they mean for our order. */
export type CarrierState = "in_transit" | "out_for_delivery" | "delivered" | "returned" | "cancelled" | "attempt_failed" | "unknown";
