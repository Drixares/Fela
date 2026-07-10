import type { Db } from "@repo/db";
import { budgetLines } from "@repo/db";
import { asc, eq } from "drizzle-orm";

import type { BudgetLine } from "./budget-view";

// Anything that can read rows — the top-level {@link Db} or the handle inside a
// `db.transaction(...)`, so a handler can load lines within its own transaction.
type Reader = Pick<Db, "select">;

// The write side of the same seam — used to copy lines within a transaction.
type Writer = Pick<Db, "delete" | "insert">;

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

/**
 * Replace a budget's category lines with `lines` — clear whatever it holds, then
 * copy the given lines verbatim. Shared by the two handlers that duplicate one
 * budget's lines onto another (`seedFromPrevious` copies onto a fresh budget, so
 * the clear is a no-op there; `applyToFuture` overwrites existing months). The
 * lines were validated when first set, so no category re-check is needed — this
 * only duplicates existing rows. Must run inside the caller's transaction.
 */
export function replaceBudgetLines(
  db: Writer,
  budgetId: number,
  lines: BudgetLine[]
): void {
  db.delete(budgetLines).where(eq(budgetLines.budgetId, budgetId)).run();
  if (lines.length > 0) {
    db.insert(budgetLines)
      .values(
        lines.map((line) => ({
          budgetId,
          categoryId: line.categoryId,
          amount: line.amount,
        }))
      )
      .run();
  }
}
