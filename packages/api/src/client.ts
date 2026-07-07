import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "./routers/_app.js";

/**
 * Fully typed client shape for the application router. Consumers (e.g. the
 * Electron renderer) use this to type the client returned by
 * `createORPCClient`, without importing any server-side runtime code.
 */
export type AppRouterClient = RouterClient<AppRouter>;

/**
 * The account types the app understands. Kept here — on the client contract,
 * free of server runtime — so both the server (procedure input validation) and
 * the renderer (type picker + labels) draw from one source of truth. The `type`
 * column itself is free-form text in the schema; this list is the app's policy
 * on top of it. French labels live in the renderer's centralised strings.
 */
export const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "cash",
  "credit_card",
  "investment",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Whether a category tracks money coming in or going out. Kept here — on the
 * client contract, free of server runtime — so both the server (procedure
 * input validation) and the renderer (kind picker + labels) draw from one
 * source of truth. The `kind` column itself is free-form text in the schema;
 * this list is the app's policy on top of it. French labels live in the
 * renderer's centralised strings.
 */
export const CATEGORY_KINDS = ["income", "expense"] as const;

export type CategoryKind = (typeof CATEGORY_KINDS)[number];
