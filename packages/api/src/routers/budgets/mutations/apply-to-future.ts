import { budgets } from "@repo/db";
import { asc, eq, gt } from "drizzle-orm";
import { base } from "src/context";

import { budgetNotFound } from "../utils/budget-errors";
import { loadBudgetLines, replaceBudgetLines } from "../utils/budget-lines";
import { applyToFutureSchema } from "../validators";

export const applyToFutureBase = base.input(applyToFutureSchema);

/**
 * Propagate a month's budget **forward**: overwrite every **strictly-posterior
 * existing** month with `month`'s `income`, `totalBudget` and category lines.
 *
 * Propagation only ever moves forward — months ≤ `month` (the source itself and
 * the entire past) are never touched, so fixing a typo in a past month can still
 * be pushed forward without rewriting anything at or before it. It never creates
 * future months that don't already exist; only budgets already present are
 * overwritten. Each target's lines are cleared and replaced with the source's
 * verbatim, so a future month that had lines the source lacks ends up with none.
 *
 * Runs in one transaction and returns `{ affectedMonths }` — the exact months
 * overwritten, ascending — so the UI can name them back to the user. Month keys
 * are `YYYY-MM` and lexicographically ordered, so "strictly posterior" is simply
 * the months greater than the source key.
 */
export const applyToFutureHandler = applyToFutureBase.handler(
  async ({ context, input }) => {
    const { month } = input;

    return context.db.transaction((tx) => {
      const source = tx
        .select()
        .from(budgets)
        .where(eq(budgets.month, month))
        .get();

      if (!source) {
        throw budgetNotFound(month);
      }

      const sourceLines = loadBudgetLines(tx, source.id);

      const targets = tx
        .select()
        .from(budgets)
        .where(gt(budgets.month, month))
        .orderBy(asc(budgets.month))
        .all();

      for (const target of targets) {
        tx.update(budgets)
          .set({ income: source.income, totalBudget: source.totalBudget })
          .where(eq(budgets.id, target.id))
          .run();

        // Overwrite the target's lines with the source's — clears any the target
        // had that the source lacks, so it ends up mirroring the source exactly.
        replaceBudgetLines(tx, target.id, sourceLines);
      }

      return { affectedMonths: targets.map((target) => target.month) };
    });
  }
);
