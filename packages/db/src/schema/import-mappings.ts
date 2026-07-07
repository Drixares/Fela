import { integer, sqliteTable } from "drizzle-orm/sqlite-core";

import { accounts } from "./accounts";

/**
 * The CSV column mapping remembered for an account — which column (0-based)
 * holds the date, the amount and the label in that bank's export format.
 *
 * Captured on the first import into the account and reused on every following
 * one, so the user maps their bank's columns exactly once (see issue #8). One
 * row per account; re-importing with a different mapping overwrites it.
 */
export const importMappings = sqliteTable("import_mappings", {
  accountId: integer("account_id")
    .primaryKey()
    .references(() => accounts.id, { onDelete: "cascade" }),
  dateColumn: integer("date_column").notNull(),
  amountColumn: integer("amount_column").notNull(),
  labelColumn: integer("label_column").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type ImportMapping = typeof importMappings.$inferSelect;
export type NewImportMapping = typeof importMappings.$inferInsert;
