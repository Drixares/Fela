import { os } from "@orpc/server";
import { accounts, getAccountBalances } from "@repo/db";
import { asc } from "drizzle-orm";
import type { ServerContext } from "../../context.js";

const base = os.$context<ServerContext>();

/**
 * Read-only account procedures. This is the thinnest real slice of the ledger:
 * the renderer lists accounts with their derived balances. Full CRUD lands in a
 * later slice — see the V1 PRD (#1).
 */
export const accountsRouter = base.router({
  /**
   * Every account with its current balance (initial balance + signed sum of its
   * transactions), computed in a single grouped query. Archived accounts are
   * included; the renderer decides what to hide.
   */
  list: base.handler(async ({ context }) => {
    const rows = await context.db
      .select()
      .from(accounts)
      .orderBy(asc(accounts.name))
      .all();

    const balances = new Map(
      getAccountBalances(context.db).map((b) => [b.accountId, b.balance])
    );

    return rows.map((account) => ({
      ...account,
      balance: balances.get(account.id) ?? account.initialBalance,
    }));
  }),
});
