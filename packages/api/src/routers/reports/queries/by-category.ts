import { categories, transactions } from "@repo/db";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { base } from "src/context";

import { groupBreakdownSchema } from "../validators";

export const byCategoryBase = base.input(groupBreakdownSchema);

/** A leaf category with its total spend over the period. */
export interface CategoryBreakdown {
  categoryId: number;
  name: string;
  total: number;
}

/**
 * The drill-down one level below {@link byGroupHandler} (see issue #14): the
 * expenses of a single group over the period, broken down by leaf category.
 *
 * `groupId: null` drills into the categories that belong to no group — the same
 * « Sans groupe » bucket the group-level breakdown surfaces. Like the group
 * level, an expense is a non-transfer outflow and totals are positive
 * magnitudes computed in SQL. Sorted biggest-first so the renderer shows where
 * the money went at a glance.
 */
export const byCategoryHandler = byCategoryBase.handler(
  async ({ context, input }) => {
    const groupFilter =
      input.groupId === null
        ? isNull(categories.groupId)
        : eq(categories.groupId, input.groupId);

    const rows = context.db
      .select({
        categoryId: categories.id,
        name: categories.name,
        total: sql<number>`-sum(${transactions.amount})`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          isNull(transactions.transferId),
          sql`${transactions.amount} < 0`,
          gte(transactions.date, input.from),
          lte(transactions.date, input.to),
          groupFilter
        )
      )
      .groupBy(categories.id)
      .all();

    const list: CategoryBreakdown[] = rows
      .map((row) => ({
        categoryId: row.categoryId,
        name: row.name,
        total: row.total,
      }))
      .sort((a, b) => b.total - a.total);

    const total = list.reduce((sum, category) => sum + category.total, 0);

    return { total, categories: list };
  }
);
