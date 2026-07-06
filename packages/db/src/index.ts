import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/**
 * Open (or create) the local SQLite database at `path` and return a Drizzle
 * instance bound to the application schema.
 *
 * The caller owns the file location — in the Electron app this is
 * `app.getPath("userData")` — so this package stays free of any Electron or
 * environment coupling.
 */
export function createDb(path: string) {
  const sqlite = new Database(path);
  // WAL keeps reads and writes from blocking each other; sensible default for a
  // local desktop database.
  sqlite.pragma("journal_mode = WAL");

  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;

export { messages } from "./schema";
export type { Message, NewMessage } from "./schema";
