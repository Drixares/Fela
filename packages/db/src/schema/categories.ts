import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { categoryGroups } from "./category-groups";

/**
 * A label used to classify transactions (Groceries, Salary, Rent…) — the leaf
 * level every transaction points at. `kind` separates money coming in from
 * money going out.
 *
 * `groupId` is an optional link to a {@link categoryGroups} row. It is purely
 * organisational: moving a category between groups (or clearing the link) never
 * touches the transactions classified under it, and deleting the group only
 * sets this back to null (see the `set null` FK below).
 */
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // "income" | "expense"
  groupId: integer("group_id").references(() => categoryGroups.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
