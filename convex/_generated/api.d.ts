/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as boards from "../boards.js";
import type * as cargo_types from "../cargo_types.js";
import type * as cleanOrphanedData from "../cleanOrphanedData.js";
import type * as cleanUsers from "../cleanUsers.js";
import type * as companies from "../companies.js";
import type * as contracts from "../contracts.js";
import type * as debug from "../debug.js";
import type * as fixtures from "../fixtures.js";
import type * as migrations from "../migrations.js";
import type * as negotiations from "../negotiations.js";
import type * as orders from "../orders.js";
import type * as organizations from "../organizations.js";
import type * as ports from "../ports.js";
import type * as recapManagers from "../recapManagers.js";
import type * as routes from "../routes.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as vessels from "../vessels.js";
import type * as widgets from "../widgets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  auth: typeof auth;
  boards: typeof boards;
  cargo_types: typeof cargo_types;
  cleanOrphanedData: typeof cleanOrphanedData;
  cleanUsers: typeof cleanUsers;
  companies: typeof companies;
  contracts: typeof contracts;
  debug: typeof debug;
  fixtures: typeof fixtures;
  migrations: typeof migrations;
  negotiations: typeof negotiations;
  orders: typeof orders;
  organizations: typeof organizations;
  ports: typeof ports;
  recapManagers: typeof recapManagers;
  routes: typeof routes;
  seed: typeof seed;
  users: typeof users;
  vessels: typeof vessels;
  widgets: typeof widgets;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
