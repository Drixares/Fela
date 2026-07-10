import type { Db } from "@repo/db";
import { budgetLines } from "@repo/db";
import { asc, eq } from "drizzle-orm";

import type { BudgetLine } from "./budget-view";

// Anything that can read rows — the top-level {@link Db} or the handle inside a
// `db.transaction(...)`, so a handler can load lines within its own transaction.
type Reader = Pick<Db, "select">;

/**
 * Load a budget's category lines in the view shape — `{ categoryId, amount }`,
 * ordered by insertion so the UI shows them in the order they were added. The
 * derived "everything else" is recomputed from these on every response; the
 * lines themselves are the only persisted part.
 */
export function loadBudgetLines(db: Reader, budgetId: number): BudgetLine[] {
  return db
    .select({
      categoryId: budgetLines.categoryId,
      amount: budgetLines.amount,
    })
    .from(budgetLines)
    .where(eq(budgetLines.budgetId, budgetId))
    .orderBy(asc(budgetLines.createdAt), asc(budgetLines.id))
    .all();
}
