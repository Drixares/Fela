import type { Account, Db } from "@repo/db";
import { getAccountBalance } from "@repo/db";

/** An account row plus its derived balance — the shape the renderer consumes. */
export type AccountWithBalance = Account & { balance: number };

/** Attach the derived balance to an account row already read from the db. */
export function withBalance(db: Db, account: Account): AccountWithBalance {
  return { ...account, balance: getAccountBalance(db, account.id) };
}
