import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * A monthly budget envelope — one row per month the user chooses to budget.
 *
 * Keyed by a `"YYYY-MM"` month string (readable, lexicographically sortable and
 * timezone-independent), unique so a month has at most one budget. Holds the net
 * monthly `income` and the `totalBudget` to distribute, both in positive minor
 * units (cents), consistent with `transactions.amount`.
 *
 * The derived "everything else" line — `max(0, totalBudget − Σ category lines)`
 * — is never stored; the API recomputes it on every read. This adopts Origin's
 * lighter model over YNAB envelopes (reopens roadmap decision #13; see
 * `docs/adr/0001-origin-budget-model.md`).
 */
export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // "YYYY-MM"; unique so each month owns at most one budget.
  month: text("month").notNull().unique(),
  // Net monthly income in minor units (cents), positive.
  income: integer("income").notNull(),
  // Total amount to distribute in minor units (cents), positive.
  totalBudget: integer("total_budget").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
