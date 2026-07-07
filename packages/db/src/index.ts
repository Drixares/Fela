import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

/**
 * Open (or create) the local SQLite database at `path` and return a Drizzle
 * instance bound to the application schema.
 *
 * The caller owns the file location — in the Electron app this is
 * `app.getPath("userData")` — so this package stays free of any Electron or
 * environment coupling. Pass `":memory:"` for a throwaway database (used by the
 * test fixture).
 */
export function createDb(path: string) {
  const sqlite = new Database(path);
  // WAL keeps reads and writes from blocking each other; sensible default for a
  // local desktop database.
  sqlite.pragma("journal_mode = WAL");

  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;

/**
 * Apply every generated migration to `db`, bringing an empty database up to the
 * current schema. Idempotent — drizzle tracks applied migrations in its own
 * table, so re-running is a no-op.
 *
 * The migration SQL lives in this package's `drizzle/` folder, generated from
 * `schema/` with `pnpm --filter @repo/db db:generate`. The test fixture calls
 * this against a `:memory:` database to get a migrated context.
 */
export function migrateToLatest(db: Db): void {
  const migrationsFolder = fileURLToPath(
    new URL("../drizzle", import.meta.url)
  );
  migrate(db, { migrationsFolder });
}

export * from "./schema";

export { getAccountBalance, getAccountBalances } from "./balances";
export { createTransfer, getTransfer } from "./transfers";
export type { Transfer, TransferInput } from "./transfers";
export { DEFAULT_CATEGORY_SEED, seedDefaultCategories } from "./seed";
