import { budgetLines, budgets } from "@repo/db";
import { desc, eq, lt } from "drizzle-orm";
import { base } from "src/context";

import { loadBudgetLines } from "../utils/budget-lines";
import { toBudgetView } from "../utils/budget-view";
import { seedFromPreviousSchema } from "../validators";

export const seedFromPreviousBase = base.input(seedFromPreviousSchema);

/**
 * Pre-fill a month's budget by copying the nearest existing *prior* month — its
 * `income`, `totalBudget` and every category line — so the user never re-types a
 * budget that barely changes month to month.
 *
 * Three outcomes:
 * - the month already has a budget → no-op, returns that budget's view;
 * - an earlier month exists → creates `month` as a copy of the nearest one and
 *   returns the new `get`-shaped view;
 * - no earlier month exists (the very first budget) → returns `null`, the signal
 *   the UI uses to fall back to a blank `create`.
 *
 * The copy runs in one transaction so the new budget and its lines land together.
 * Month keys are `YYYY-MM` and lexicographically ordered, so "nearest prior" is
 * simply the greatest month strictly below the target.
 */
export const seedFromPreviousHandler = seedFromPreviousBase.handler(
  async ({ context, input }) => {
    const { month } = input;

    return context.db.transaction((tx) => {
      const existing = tx
        .select()
        .from(budgets)
        .where(eq(budgets.month, month))
        .get();

      if (existing) {
        return toBudgetView(existing, loadBudgetLines(tx, existing.id));
      }

      const source = tx
        .select()
        .from(budgets)
        .where(lt(budgets.month, month))
        .orderBy(desc(budgets.month))
        .limit(1)
        .get();

      if (!source) {
        return null;
      }

      const created = tx
        .insert(budgets)
        .values({
          month,
          income: source.income,
          totalBudget: source.totalBudget,
        })
        .returning()
        .get();

      // Copy the source's lines verbatim. They were validated when first set, so
      // no category re-check is needed — this only duplicates existing rows.
      const sourceLines = loadBudgetLines(tx, source.id);
      if (sourceLines.length > 0) {
        tx.insert(budgetLines)
          .values(
            sourceLines.map((line) => ({
              budgetId: created.id,
              categoryId: line.categoryId,
              amount: line.amount,
            }))
          )
          .run();
      }

      return toBudgetView(created, loadBudgetLines(tx, created.id));
    });
  }
);
