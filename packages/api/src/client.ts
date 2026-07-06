import type { RouterClient } from "@orpc/server";
import { AppRouter } from "./routers/_app.js";

/**
 * Fully typed client shape for the application router. Consumers (e.g. the
 * Electron renderer) use this to type the client returned by
 * `createORPCClient`, without importing any server-side runtime code.
 */
export type AppRouterClient = RouterClient<AppRouter>;
