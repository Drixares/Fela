import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * A label used to classify transactions (Groceries, Salary, Rent…).
 * `kind` separates money coming in from money going out.
 */
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // "income" | "expense"
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
