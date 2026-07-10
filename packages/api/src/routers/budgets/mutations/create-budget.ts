import { budgets } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { budgetAlreadyExists } from "../utils/budget-errors";
import { toBudgetView } from "../utils/budget-view";
import { createBudgetSchema } from "../validators";

export const createBudgetBase = base.input(createBudgetSchema);

/**
 * Create the budget for a month from a net income and a total to distribute.
 * Refuses if the month already has a budget (one budget per month). The fresh
 * budget has no category lines, so "everything else" equals the whole total.
 */
export const createBudgetHandler = createBudgetBase.handler(
  async ({ context, input }) => {
    const existing = context.db
      .select()
      .from(budgets)
      .where(eq(budgets.month, input.month))
      .get();

    if (existing) {
      throw budgetAlreadyExists(input.month);
    }

    const created = context.db
      .insert(budgets)
      .values({
        month: input.month,
        income: input.income,
        totalBudget: input.totalBudget,
      })
      .returning()
      .get();

    return toBudgetView(created);
  }
);
