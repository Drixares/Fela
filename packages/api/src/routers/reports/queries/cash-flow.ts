import { categories, transactions } from "@repo/db";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { base } from "src/context";

import { periodSchema } from "../validators";

export const cashFlowBase = base.input(periodSchema);

/** One month of the cash flow: money in, money out, and the difference. */
export interface CashFlowMonth {
  /** The calendar month as `YYYY-MM` (UTC), e.g. `"2026-03"`. */
  month: string;
  /** Total income over the month, as positive cents. */
  income: number;
  /** Total expenses over the month, as positive cents (a magnitude). */
  expenses: number;
  /** `income - expenses` — positive when the month ran a surplus. */
  net: number;
}

/** Enumerate the `YYYY-MM` months from `from` to `to` inclusive, in UTC. */
function monthsInRange(from: Date, to: Date): string[] {
  const months: string[] = [];
  let year = from.getUTCFullYear();
  let month = from.getUTCMonth(); // 0-11
  const endYear = to.getUTCFullYear();
  const endMonth = to.getUTCMonth();
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month + 1).padStart(2, "0")}`);
    if (month === 11) {
      month = 0;
      year += 1;
    } else {
      month += 1;
    }
  }
  return months;
}

/**
 * « Est-ce que je vis au-dessus de mes moyens ? » — the monthly cash flow,
 * income vs expenses, over the chosen period (see issue #16, and the V1 PRD #1
 * story 36). The period selector defaults to the last 12 months but any of the
 * shared presets applies; the contract only ever knows the resulting bounds.
 *
 * The income/expense split is driven by the *category's kind*, not the amount's
 * sign: an expense-category refund (a positive amount) nets against expenses
 * rather than reading as income, and vice versa. Movements filed under no
 * category carry no kind and so count on neither side — the honest report is the
 * one that separates the two columns the way the categories are typed. Transfer
 * legs — moving one's own money between accounts — are never income nor an
 * expense (story 39), so every row carrying a `transferId` is excluded.
 *
 * Each month's two sums are aggregated in SQL, bucketed by UTC calendar month;
 * the handler only enumerates the months in the range so a month with no
 * activity still shows up at zero — a cash flow with silent gaps would mislead.
 *
 * Because an uncategorized movement carries no kind, it counts on neither side.
 * That would let unclassified spending quietly flatter the cash flow, so the
 * report also returns `uncategorizedCount` — the number of non-transfer
 * movements in the period with no category — for the renderer to flag the report
 * as incomplete, the same honesty the group breakdown keeps (see issue #14).
 */
export const cashFlowHandler = cashFlowBase.handler(
  async ({ context, input }) => {
    const inPeriod = and(
      isNull(transactions.transferId),
      gte(transactions.date, input.from),
      lte(transactions.date, input.to)
    );

    const monthKey = sql<string>`strftime('%Y-%m', ${transactions.date}, 'unixepoch')`;

    const rows = context.db
      .select({
        month: monthKey,
        income: sql<number>`coalesce(sum(case when ${categories.kind} = 'income' then ${transactions.amount} else 0 end), 0)`,
        expenses: sql<number>`-coalesce(sum(case when ${categories.kind} = 'expense' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      // An uncategorized movement has no kind, so the inner join drops it — the
      // report only ever splits what the categories themselves classify.
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(inPeriod)
      .groupBy(monthKey)
      .all();

    const uncategorizedRow = context.db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(inPeriod, isNull(transactions.categoryId)))
      .get();

    const byMonth = new Map(rows.map((row) => [row.month, row]));

    const months: CashFlowMonth[] = monthsInRange(input.from, input.to).map(
      (month) => {
        const row = byMonth.get(month);
        const income = row?.income ?? 0;
        const expenses = row?.expenses ?? 0;
        return { month, income, expenses, net: income - expenses };
      }
    );

    const income = months.reduce((sum, m) => sum + m.income, 0);
    const expenses = months.reduce((sum, m) => sum + m.expenses, 0);

    return {
      months,
      income,
      expenses,
      net: income - expenses,
      uncategorizedCount: uncategorizedRow?.count ?? 0,
    };
  }
);
