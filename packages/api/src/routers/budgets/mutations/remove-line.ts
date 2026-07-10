import { budgetLines, budgets } from "@repo/db";
import { and, eq } from "drizzle-orm";
import { base } from "src/context";

import { budgetNotFound } from "../utils/budget-errors";
import { loadBudgetLines } from "../utils/budget-lines";
import { toBudgetView } from "../utils/budget-view";
import { removeLineSchema } from "../validators";

export const removeLineBase = base.input(removeLineSchema);

/**
 * Drop a category line from a month's budget. Its amount mechanically returns to
 * the derived "everything else" — nothing else is recomputed and, crucially,
 * `totalBudget` is never lowered (a raise from a past auto-increase stays put).
 * Removing a line that was never set is a no-op that still returns the view.
 */
export const removeLineHandler = removeLineBase.handler(
  async ({ context, input }) => {
    const { month, categoryId } = input;

    return context.db.transaction((tx) => {
      const budget = tx
        .select()
        .from(budgets)
        .where(eq(budgets.month, month))
        .get();

      if (!budget) {
        throw budgetNotFound(month);
      }

      tx.delete(budgetLines)
        .where(
          and(
            eq(budgetLines.budgetId, budget.id),
            eq(budgetLines.categoryId, categoryId)
          )
        )
        .run();

      return toBudgetView(budget, loadBudgetLines(tx, budget.id));
    });
  }
);
