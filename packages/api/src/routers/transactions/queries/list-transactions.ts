import { accounts, categories, transactions } from "@repo/db";
import { desc, eq, sql } from "drizzle-orm";
import { base } from "src/context";

import { listFilterClause } from "../utils/list-filter-clause";
import type { TransactionWithNames } from "../utils/with-names";
import { listFiltersSchema } from "../validators";

export const listTransactionsBase = base.input(listFiltersSchema);

/**
 * The transactions matching the filters (see {@link listFiltersSchema}; no
 * filters = everything), most recent first (ties broken by insertion order),
 * each carrying its account and category names for display — plus the
 * matching rows' `count` and signed `sum`, aggregated in SQL from the same
 * WHERE clause so « combien chez Amazon cette année ? » is answered by the
 * list itself.
 */
export const listTransactionsHandler = listTransactionsBase.handler(
  async ({ context, input }) => {
    const filter = listFilterClause(input);

    const rows = context.db
      .select({
        transaction: transactions,
        accountName: accounts.name,
        categoryName: categories.name,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(filter)
      .orderBy(desc(transactions.date), desc(transactions.id))
      .all();

    const totals = context.db
      .select({
        count: sql<number>`count(*)`,
        sum: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(filter)
      .get();

    return {
      transactions: rows.map(
        (row): TransactionWithNames => ({
          ...row.transaction,
          accountName: row.accountName,
          categoryName: row.categoryName,
        })
      ),
      count: totals?.count ?? 0,
      sum: totals?.sum ?? 0,
    };
  }
);
