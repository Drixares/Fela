import { implement } from "@orpc/server";
import type { ServerContext } from "../context.js";
import { accountsRouter } from "./accounts/router.js";
import { categoriesRouter } from "./categories/router.js";
import { exportsRouter } from "./exports/router.js";
import { importsRouter } from "./imports/router.js";
import { rulesRouter } from "./rules/router.js";
import { testRouter } from "./test/router.js";
import { transactionsRouter } from "./transactions/router.js";
import { transfersRouter } from "./transfers/router.js";

/**
 * API contract: composed domain routers (each built with `base.router` / no lazy roots).
 * oRPC treats these as contract routers; `implement` ties the contract to the same
 * implementation and keeps client inference aligned without manual `AppRouterTree` aliases.
 *
 * @see https://orpc.dev/docs/contract-first/define-contract
 * @see https://orpc.dev/docs/contract-first/router-to-contract
 */
const appContract = {
  test: testRouter,
  accounts: accountsRouter,
  categories: categoriesRouter,
  exports: exportsRouter,
  imports: importsRouter,
  rules: rulesRouter,
  transactions: transactionsRouter,
  transfers: transfersRouter,
};

export const appRouter = implement(appContract)
  .$context<ServerContext>()
  .router(appContract);

export type AppRouter = typeof appRouter;
