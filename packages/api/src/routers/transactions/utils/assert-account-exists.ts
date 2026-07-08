import { ORPCError } from "@orpc/server";
import type { Db } from "@repo/db";
import { accounts } from "@repo/db";
import { eq } from "drizzle-orm";

/** Throw NOT_FOUND unless an account with `id` exists — guards create/update. */
export function assertAccountExists(db: Db, id: number): void {
  const account = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.id, id))
    .get();
  if (!account) {
    throw new ORPCError("NOT_FOUND", { message: `No account with id ${id}` });
  }
}
