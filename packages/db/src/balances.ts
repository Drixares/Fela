import { eq, sql } from "drizzle-orm";

import type { Db } from "./index";
import { accounts, transactions } from "./schema";

/**
 * The current balance of a single account, in minor units (cents).
 *
 * A balance is never stored — it is always derived as `initialBalance` plus
 * the signed sum of the account's transactions, so there is a single source of
 * truth and no way for a cached balance to drift.
 *
 * @throws if no account exists with the given id.
 */
export function getAccountBalance(db: Db, accountId: number): number {
  const account = db
    .select({ initialBalance: accounts.initialBalance })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .get();

  if (!account) {
    throw new Error(`No account with id ${accountId}`);
  }

  const row = db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.accountId, accountId))
    .get();

  return account.initialBalance + (row?.total ?? 0);
}

/**
 * The current balance of every account, in minor units (cents), computed in a
 * single grouped query — use this for dashboards rather than calling
 * {@link getAccountBalance} in a loop.
 */
export function getAccountBalances(
  db: Db
): { accountId: number; balance: number }[] {
  return db
    .select({
      accountId: accounts.id,
      balance: sql<number>`${accounts.initialBalance} + coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .groupBy(accounts.id)
    .all();
}
