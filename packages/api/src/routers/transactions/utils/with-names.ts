import type { Db, Transaction } from "@repo/db";
import { accounts, categories } from "@repo/db";
import { eq } from "drizzle-orm";

/**
 * A transaction row plus the display names the renderer shows next to it — the
 * account it belongs to and, if any, the category it is filed under. Resolved on
 * the server so the renderer only renders (see the V1 PRD, #1, and issue #6).
 */
export type TransactionWithNames = Transaction & {
  accountName: string;
  categoryName: string | null;
};

/** Attach the account and category display names to a transaction row. */
export function withNames(db: Db, tx: Transaction): TransactionWithNames {
  const account = db
    .select({ name: accounts.name })
    .from(accounts)
    .where(eq(accounts.id, tx.accountId))
    .get();

  const category =
    tx.categoryId === null
      ? null
      : db
          .select({ name: categories.name })
          .from(categories)
          .where(eq(categories.id, tx.categoryId))
          .get();

  return {
    ...tx,
    accountName: account?.name ?? "",
    categoryName: category?.name ?? null,
  };
}
