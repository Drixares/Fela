import { accounts, getAccountBalances } from "@repo/db";
import { asc } from "drizzle-orm";
import { base } from "src/context";
import { listAccountsSchema } from "../validators";

export const listAccountsBase = base.input(listAccountsSchema);

export const listAccountsHandler = listAccountsBase.handler(
  async ({ input, context }) => {
    const rows = await context.db
      .select()
      .from(accounts)
      .orderBy(asc(accounts.name))
      .all();

    const balances = new Map(
      getAccountBalances(context.db).map((b) => [b.accountId, b.balance])
    );

    return rows
      .filter((account) => input?.includeArchived || !account.archived)
      .map((account) => ({
        ...account,
        balance: balances.get(account.id) ?? account.initialBalance,
      }));
  }
);
