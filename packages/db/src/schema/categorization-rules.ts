import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { categories } from "./categories";

/**
 * A user-defined auto-classification rule: "if a transaction's label contains
 * `pattern` → file it under `categoryId`" (see issue #13). Rules are applied
 * to incoming rows at import time (preview shows the would-be category,
 * commit writes it); they never re-classify rows already in the ledger.
 *
 * `sortOrder` is the application order: rules are tried lowest-first and the
 * FIRST match wins, so the user resolves conflicts between overlapping
 * patterns by reordering.
 *
 * The `categoryId` FK action is never exercised — the app does not enable
 * SQLite's foreign-key enforcement. Deleting a category cleans up its rules
 * explicitly inside the same SQL transaction (see `categories.delete`).
 */
export const categorizationRules = sqliteTable("categorization_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Substring looked for in the incoming label, case-insensitively.
  pattern: text("pattern").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type CategorizationRule = typeof categorizationRules.$inferSelect;
export type NewCategorizationRule = typeof categorizationRules.$inferInsert;
