import type {
  Account,
  Category,
  CategoryGroup,
  Db,
  Transaction,
} from "@repo/db";
import { accounts, categories, categoryGroups, transactions } from "@repo/db";
import { asc } from "drizzle-orm";

/**
 * The user's whole history — the four tables issue #10 names, read in one shot
 * so the export is a coherent snapshot, each ordered by id so output is
 * stable. Transfers stay identifiable in the flat transaction list through
 * their shared `transferId`. Import mappings are deliberately left out: they
 * are per-account import tooling, not history the user needs to take along.
 */
export function readSnapshot(db: Db): {
  accounts: Account[];
  categoryGroups: CategoryGroup[];
  categories: Category[];
  transactions: Transaction[];
} {
  return {
    accounts: db.select().from(accounts).orderBy(asc(accounts.id)).all(),
    categoryGroups: db
      .select()
      .from(categoryGroups)
      .orderBy(asc(categoryGroups.id))
      .all(),
    categories: db.select().from(categories).orderBy(asc(categories.id)).all(),
    transactions: db
      .select()
      .from(transactions)
      .orderBy(asc(transactions.id))
      .all(),
  };
}
