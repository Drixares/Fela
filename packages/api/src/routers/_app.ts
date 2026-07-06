import { implement } from "@orpc/server";
import { testRouter } from "./test/router.js";

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
};

export const appRouter = implement(appContract)
  // .$context<ServerContext>()
  .router(appContract);

export type AppRouter = typeof appRouter;
