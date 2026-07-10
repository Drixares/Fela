import { sql } from "drizzle-orm";
import {
  check,
  integer,
  sqliteTable,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { budgets } from "./budgets";
import { categories } from "./categories";

/**
 * A single category line inside a monthly {@link budgets} envelope — the amount
 * the user carved out of the total for one expense category. Summing every line
 * for a budget gives what is allocated; the derived "everything else" is
 * `max(0, totalBudget − Σ lines)` and is never stored (see `toBudgetView`).
 *
 * At most one line per `(budgetId, categoryId)` — the unique index below makes
 * `setLine` an upsert rather than a source of duplicates. `amount` is in minor
 * units (cents), non-negative — the `CHECK` guards that at the table so it holds
 * even outside the API's validators.
 *
 * The two foreign keys carry `onDelete: "cascade"`, but the app does not enable
 * SQLite's foreign-key enforcement, so those actions are never exercised at
 * runtime: deleting a budget or a category cleans up its lines *explicitly*
 * inside a SQL transaction (see `deleteCategoryHandler`), the same idiom the
 * {@link categorizationRules} table follows. The API only ever writes lines for
 * categories of kind `expense` (validated up front); income and transfers never
 * appear here.
 */
export const budgetLines = sqliteTable(
  "budget_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    budgetId: integer("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    // Allocated amount in minor units (cents), non-negative.
    amount: integer("amount").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("budget_lines_budget_category_unique").on(
      t.budgetId,
      t.categoryId
    ),
    check("budget_lines_amount_nonneg", sql`${t.amount} >= 0`),
  ]
);

export type BudgetLine = typeof budgetLines.$inferSelect;
export type NewBudgetLine = typeof budgetLines.$inferInsert;
