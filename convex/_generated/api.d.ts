/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as abandoned from "../abandoned.js";
import type * as auth from "../auth.js";
import type * as authNode from "../authNode.js";
import type * as catalog from "../catalog.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as dispatch from "../dispatch.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_carriers_ecotrack from "../lib/carriers/ecotrack.js";
import type * as lib_carriers_index from "../lib/carriers/index.js";
import type * as lib_carriers_noest from "../lib/carriers/noest.js";
import type * as lib_carriers_types from "../lib/carriers/types.js";
import type * as lib_carriers_yalidine from "../lib/carriers/yalidine.js";
import type * as lib_carriers_zr from "../lib/carriers/zr.js";
import type * as lib_status from "../lib/status.js";
import type * as lib_util from "../lib/util.js";
import type * as lib_wilayas from "../lib/wilayas.js";
import type * as maintenance from "../maintenance.js";
import type * as meta from "../meta.js";
import type * as orders from "../orders.js";
import type * as settings from "../settings.js";
import type * as shipping from "../shipping.js";
import type * as stats from "../stats.js";
import type * as stock from "../stock.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  abandoned: typeof abandoned;
  auth: typeof auth;
  authNode: typeof authNode;
  catalog: typeof catalog;
  crons: typeof crons;
  customers: typeof customers;
  dispatch: typeof dispatch;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/carriers/ecotrack": typeof lib_carriers_ecotrack;
  "lib/carriers/index": typeof lib_carriers_index;
  "lib/carriers/noest": typeof lib_carriers_noest;
  "lib/carriers/types": typeof lib_carriers_types;
  "lib/carriers/yalidine": typeof lib_carriers_yalidine;
  "lib/carriers/zr": typeof lib_carriers_zr;
  "lib/status": typeof lib_status;
  "lib/util": typeof lib_util;
  "lib/wilayas": typeof lib_wilayas;
  maintenance: typeof maintenance;
  meta: typeof meta;
  orders: typeof orders;
  settings: typeof settings;
  shipping: typeof shipping;
  stats: typeof stats;
  stock: typeof stock;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
