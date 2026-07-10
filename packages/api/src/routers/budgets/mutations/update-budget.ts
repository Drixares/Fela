import { ORPCError } from "@orpc/server";
import { budgets } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { budgetNotFound } from "../utils/budget-errors";
import { loadBudgetLines } from "../utils/budget-lines";
import { toBudgetView } from "../utils/budget-view";
import { updateBudgetSchema } from "../validators";

export const updateBudgetBase = base.input(updateBudgetSchema);

/**
 * Edit a month's income and/or total budget. Only the fields sent are touched.
 * Lowering the total below the sum of existing category lines is refused — the
 * lines already carve up that money, so the total can never drop under them.
 */
export const updateBudgetHandler = updateBudgetBase.handler(
  async ({ context, input }) => {
    const { month, ...changes } = input;

    const existing = context.db
      .select()
      .from(budgets)
      .where(eq(budgets.month, month))
      .get();

    if (!existing) {
      throw budgetNotFound(month);
    }

    const lines = loadBudgetLines(context.db, existing.id);
    const allocated = lines.reduce((sum, line) => sum + line.amount, 0);
    const nextTotal = changes.totalBudget ?? existing.totalBudget;
    if (nextTotal < allocated) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Total budget cannot be lower than the sum of its lines",
      });
    }

    // With no fields to change, skip the write (an empty `.set({})` is an error).
    const updated =
      Object.keys(changes).length === 0
        ? existing
        : context.db
            .update(budgets)
            .set(changes)
            .where(eq(budgets.month, month))
            .returning()
            .get();

    if (!updated) {
      throw budgetNotFound(month);
    }

    return toBudgetView(updated, lines);
  }
);
