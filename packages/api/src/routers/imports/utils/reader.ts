import type { Db } from "@repo/db";

/**
 * Anything that can read rows — the top-level {@link Db} or the handle inside
 * `db.transaction(...)`, so commit can re-check duplicates within its own
 * transaction.
 */
export type Reader = Pick<Db, "select">;
