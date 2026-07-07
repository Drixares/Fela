import { createDb, migrateToLatest } from "@repo/db";
import type { ServerContext } from "../context.js";

/**
 * Build a fresh {@link ServerContext} backed by a migrated in-memory SQLite
 * database — the exact context the Electron main process hands to the router,
 * but throwaway and isolated per call.
 *
 * This is the single test seam for the app (see the V1 PRD, #1): tests drive
 * the real `appRouter` procedures against this context and assert on their
 * observable output and on the database state read back through other
 * procedures — never on internal implementation details.
 *
 * @example
 * const context = createTestContext();
 * const accounts = await call(appRouter.accounts.list, undefined, { context });
 */
export function createTestContext(): ServerContext {
  const db = createDb(":memory:");
  migrateToLatest(db);
  return { db };
}
