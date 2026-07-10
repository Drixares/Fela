import type { Budget } from "@repo/db";

/**
 * A category budget line — a slice of the total assigned to one category.
 * None exist yet (see roadmap decision #13); the field is reserved so the
 * "everything else" derivation already accounts for them.
 */
export interface BudgetLine {
  categoryId: number;
  amount: number;
}

export interface BudgetView {
  month: string;
  income: number;
  totalBudget: number;
  lines: BudgetLine[];
  everythingElse: number;
}

/**
 * Shape a stored budget into the API response. "Everything else" is never
 * stored — it is always derived as `max(0, totalBudget − Σ lines.amount)` and
 * recomputed here on every response.
 */
export function toBudgetView(
  budget: Budget,
  lines: BudgetLine[] = []
): BudgetView {
  const allocated = lines.reduce((sum, line) => sum + line.amount, 0);
  return {
    month: budget.month,
    income: budget.income,
    totalBudget: budget.totalBudget,
    lines,
    everythingElse: Math.max(0, budget.totalBudget - allocated),
  };
}
