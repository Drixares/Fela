import { os } from "@orpc/server";
import type { Db } from "@repo/db";

/**
 * Initial context supplied by the server host (the Electron main process) when
 * upgrading the oRPC connection. Routers read `db` from here instead of
 * importing a database instance directly, which keeps the api package free of
 * any knowledge about where the database file lives.
 */
export interface ServerContext {
  db: Db;
}

export const base = os.$context<ServerContext>();
