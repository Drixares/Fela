import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * A financial account the user tracks — bank account, cash, card, etc.
 * Its balance is never stored; it is derived from `initialBalance` plus the
 * sum of its transactions.
 */
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // checking | savings | cash | credit_card | investment | ...
  type: text("type").notNull(),
  // ISO 4217, e.g. "EUR". Kept per-account to allow multi-currency.
  currency: text("currency").notNull().default("EUR"),
  // Opening balance in minor units (cents). The ledger builds on top of it.
  initialBalance: integer("initial_balance").notNull().default(0),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
