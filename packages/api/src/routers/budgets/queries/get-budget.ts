import { budgets } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { loadBudgetLines } from "../utils/budget-lines";
import { toBudgetView } from "../utils/budget-view";
import { getBudgetSchema } from "../validators";

export const getBudgetBase = base.input(getBudgetSchema);

/**
 * Read the budget for a month. Returns the derived view (income, total, the
 * category lines and the "everything else" remainder) or `null` when the month
 * has no budget yet — the signal the UI uses to show its empty state.
 */
export const getBudgetHandler = getBudgetBase.handler(
  async ({ context, input }) => {
    const budget = context.db
      .select()
      .from(budgets)
      .where(eq(budgets.month, input.month))
      .get();

    return budget
      ? toBudgetView(budget, loadBudgetLines(context.db, budget.id))
      : null;
  }
);
