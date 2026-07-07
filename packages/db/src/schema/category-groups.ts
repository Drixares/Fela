import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * An optional first level above categories — "Logement", "Alimentation"… — used
 * only to organise the category list. Transactions never point at a group; they
 * always point at a leaf {@link categories} row, so a group is pure presentation
 * and can be renamed or deleted without touching the ledger.
 *
 * `sortOrder` lets the user (and the seed) fix a sensible display order that
 * name-sorting alone would not give.
 */
export const categoryGroups = sqliteTable("category_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type CategoryGroup = typeof categoryGroups.$inferSelect;
export type NewCategoryGroup = typeof categoryGroups.$inferInsert;
