import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { accounts } from "./accounts";
import { categories } from "./categories";

/**
 * A single money movement on an account.
 * `amount` is in minor units (cents) and SIGNED: negative = outflow,
 * positive = inflow. Balances are computed by summing this column.
 *
 * A transfer between two accounts is modelled as two rows sharing the same
 * `transferId` (one negative leg on the source, one positive leg on the
 * destination); such rows carry no category.
 */
export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    amount: integer("amount").notNull(), // signed minor units (cents)
    date: integer("date", { mode: "timestamp" }).notNull(),
    payee: text("payee"), // "Carrefour", "Employeur"…
    note: text("note"),
    // Links the two legs of a transfer between accounts.
    transferId: text("transfer_id"),
    // Heuristic dedup fingerprint set on CSV-imported rows (account + date +
    // amount + normalised label) so re-importing an overlapping export never
    // creates doubles (see issue #8). Null on manually entered rows.
    importFingerprint: text("import_fingerprint"),
    // Exact dedup key set on OFX-imported rows: the bank's own transaction id
    // (FITID), unique per account by the OFX spec. Indexed and checked on import
    // (not a DB constraint) so re-importing an overlapping period never creates
    // doubles (see issue #11). Null on manual and CSV-imported rows.
    importExternalId: text("import_external_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("tx_account_idx").on(t.accountId),
    index("tx_date_idx").on(t.date),
    index("tx_import_fingerprint_idx").on(t.importFingerprint),
    index("tx_import_external_id_idx").on(t.importExternalId),
  ]
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
