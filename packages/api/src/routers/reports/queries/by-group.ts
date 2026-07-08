import { categories, categoryGroups, transactions } from "@repo/db";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { base } from "src/context";

import { periodSchema } from "../validators";

export const byGroupBase = base.input(periodSchema);

/** A group (or the null « Sans groupe » bucket) with its total spend. */
export interface GroupBreakdown {
  groupId: number | null;
  name: string | null;
  total: number;
}

/**
 * « Où part mon argent ? » at the top level: expenses over the period broken
 * down by category group (see issue #14, and the V1 PRD #1 story 35).
 *
 * An expense is an *outflow* — a negative `amount` — that is not a transfer
 * leg: moving one's own money between accounts is never a expense (story 39),
 * so every row carrying a `transferId` is excluded. Totals are returned as
 * positive magnitudes (`-SUM(amount)`) so the renderer can plot them directly.
 * Each subtotal is aggregated in SQL, never by scanning rows in JS (PRD); the
 * grand `total` is just those few subtotals added together.
 *
 * Categories that belong to no group are folded into a single `groupId: null`
 * bucket (name `null`; the renderer labels it « Sans groupe »). Outflows with
 * no category at all are reported separately as `uncategorized` — the visible
 * « Non classé » segment that keeps an incomplete report honest rather than
 * silently wrong (story 40).
 */
export const byGroupHandler = byGroupBase.handler(
  async ({ context, input }) => {
    const outflowInPeriod = and(
      isNull(transactions.transferId),
      sql`${transactions.amount} < 0`,
      gte(transactions.date, input.from),
      lte(transactions.date, input.to)
    );

    const grouped = context.db
      .select({
        groupId: categoryGroups.id,
        name: categoryGroups.name,
        total: sql<number>`-sum(${transactions.amount})`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(categoryGroups, eq(categories.groupId, categoryGroups.id))
      .where(outflowInPeriod)
      .groupBy(categoryGroups.id)
      .all();

    const uncategorizedRow = context.db
      .select({ total: sql<number>`-coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(outflowInPeriod, isNull(transactions.categoryId)))
      .get();

    const groups: GroupBreakdown[] = grouped
      .map((row) => ({
        // A category with no group joins to a null group row.
        groupId: row.groupId ?? null,
        name: row.name ?? null,
        total: row.total,
      }))
      .sort((a, b) => b.total - a.total);

    const uncategorized = uncategorizedRow?.total ?? 0;
    const total =
      groups.reduce((sum, group) => sum + group.total, 0) + uncategorized;

    return { total, groups, uncategorized };
  }
);
