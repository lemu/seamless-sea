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
import type * as clerkSync from "../clerkSync.js";
import type * as companies from "../companies.js";
import type * as contracts from "../contracts.js";
import type * as debug from "../debug.js";
import type * as fixtures from "../fixtures.js";
import type * as http from "../http.js";
import type * as listUnmigratedUsers from "../listUnmigratedUsers.js";
import type * as migrations from "../migrations.js";
import type * as migrations_linkClerkUser from "../migrations/linkClerkUser.js";
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

declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  auth: typeof auth;
  boards: typeof boards;
  cargo_types: typeof cargo_types;
  clerkSync: typeof clerkSync;
  companies: typeof companies;
  contracts: typeof contracts;
  debug: typeof debug;
  fixtures: typeof fixtures;
  http: typeof http;
  listUnmigratedUsers: typeof listUnmigratedUsers;
  migrations: typeof migrations;
  "migrations/linkClerkUser": typeof migrations_linkClerkUser;
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
