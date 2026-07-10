import { budgetLines, budgets } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { assertExpenseCategory } from "../utils/assert-expense-category";
import { budgetNotFound } from "../utils/budget-errors";
import { loadBudgetLines } from "../utils/budget-lines";
import { toBudgetView } from "../utils/budget-view";
import { setLineSchema } from "../validators";

export const setLineBase = base.input(setLineSchema);

/**
 * Assign (or re-assign) an amount to one expense category inside a month's
 * budget — an upsert keyed by `(budgetId, categoryId)`, so repeating it on the
 * same category updates the line instead of duplicating it. The category must
 * exist and be of kind `expense` (income and unknown categories are rejected).
 *
 * Auto-increase rule: if the lines now sum above `totalBudget`, the total is
 * raised to that sum so "everything else" lands at 0 rather than going negative.
 * The returned view carries the (possibly raised) `totalBudget`, which the UI
 * compares against the value it held to decide whether to warn. The whole thing
 * runs in one transaction so the read-back sum and the raise stay consistent.
 */
export const setLineHandler = setLineBase.handler(
  async ({ context, input }) => {
    const { month, categoryId, amount } = input;

    return context.db.transaction((tx) => {
      const budget = tx
        .select()
        .from(budgets)
        .where(eq(budgets.month, month))
        .get();

      if (!budget) {
        throw budgetNotFound(month);
      }

      assertExpenseCategory(tx, categoryId);

      tx.insert(budgetLines)
        .values({ budgetId: budget.id, categoryId, amount })
        .onConflictDoUpdate({
          target: [budgetLines.budgetId, budgetLines.categoryId],
          set: { amount },
        })
        .run();

      const lines = loadBudgetLines(tx, budget.id);
      const allocated = lines.reduce((sum, line) => sum + line.amount, 0);

      // Auto-increase: never let the total sit below what is already allocated.
      const effective =
        allocated > budget.totalBudget
          ? (tx
              .update(budgets)
              .set({ totalBudget: allocated })
              .where(eq(budgets.id, budget.id))
              .returning()
              .get() ?? budget)
          : budget;

      return toBudgetView(effective, lines);
    });
  }
);
