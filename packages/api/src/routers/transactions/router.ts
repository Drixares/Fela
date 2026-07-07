import { ORPCError } from "@orpc/server";
import { accounts, categories, transactions } from "@repo/db";
import type { Db, Transaction } from "@repo/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { base } from "../../context.js";

/**
 * A transaction row plus the display names the renderer shows next to it — the
 * account it belongs to and, if any, the category it is filed under. Resolved on
 * the server so the renderer only renders (see the V1 PRD, #1, and issue #6).
 */
type TransactionWithNames = Transaction & {
  accountName: string;
  categoryName: string | null;
};

const idSchema = z.int().positive();
// Signed minor units (cents): negative = outflow, positive = inflow. A zero
// movement is meaningless, so it is rejected rather than stored as noise.
const amountSchema = z
  .int()
  .refine((n) => n !== 0, { error: "Amount must not be zero" });
// Free-text fields; blank input is normalised to null (see normalizeText).
const payeeSchema = z.string().max(200).nullish();
const noteSchema = z.string().max(1000).nullish();

const notFound = (id: number): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", { message: `No transaction with id ${id}` });

/** Trim a free-text field, collapsing an empty or whitespace-only value to null. */
function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Throw NOT_FOUND unless an account with `id` exists — guards create/update. */
function assertAccountExists(db: Db, id: number): void {
  const account = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.id, id))
    .get();
  if (!account) {
    throw new ORPCError("NOT_FOUND", { message: `No account with id ${id}` });
  }
}

/** Throw NOT_FOUND unless a category with `id` exists — guards create/update. */
function assertCategoryExists(db: Db, id: number): void {
  const category = db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .get();
  if (!category) {
    throw new ORPCError("NOT_FOUND", { message: `No category with id ${id}` });
  }
}

/** Attach the account and category display names to a transaction row. */
function withNames(db: Db, tx: Transaction): TransactionWithNames {
  const account = db
    .select({ name: accounts.name })
    .from(accounts)
    .where(eq(accounts.id, tx.accountId))
    .get();

  const category =
    tx.categoryId === null
      ? null
      : db
          .select({ name: categories.name })
          .from(categories)
          .where(eq(categories.id, tx.categoryId))
          .get();

  return {
    ...tx,
    accountName: account?.name ?? "",
    categoryName: category?.name ?? null,
  };
}

/**
 * Load a plain (non-transfer) transaction by id, or throw. A transfer is stored
 * as two linked legs sharing a `transferId`; editing or deleting a single leg
 * would unbalance the transfer, so the CRUD procedures refuse to touch one and
 * transfers must be managed as a unit (see `createTransfer` in @repo/db).
 */
function loadEditable(db: Db, id: number): Transaction {
  const tx = db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .get();

  if (!tx) {
    throw notFound(id);
  }
  if (tx.transferId !== null) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Cannot edit or delete a transfer leg directly",
    });
  }
  return tx;
}

/**
 * Transaction procedures — manual ledger entry (see the V1 PRD, #1, and issue
 * #6). The renderer only displays; every movement is created, edited and
 * removed here, and because balances are always derived from the signed sum of
 * these rows (see `getAccountBalance`), each write is reflected in the affected
 * account's balance immediately, with no cached total to keep in sync.
 */
export const transactionsRouter = base.router({
  /**
   * Every transaction, most recent first (ties broken by insertion order), each
   * carrying its account and category names for display. Pass `accountId` to
   * narrow the list to a single account; omit it for all accounts combined.
   */
  list: base
    .input(z.object({ accountId: idSchema.optional() }).optional())
    .handler(async ({ context, input }) => {
      const rows = context.db
        .select({
          transaction: transactions,
          accountName: accounts.name,
          categoryName: categories.name,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          input?.accountId
            ? eq(transactions.accountId, input.accountId)
            : undefined
        )
        .orderBy(desc(transactions.date), desc(transactions.id))
        .all();

      return rows.map(
        (row): TransactionWithNames => ({
          ...row.transaction,
          accountName: row.accountName,
          categoryName: row.categoryName,
        })
      );
    }),

  /**
   * Record a manual transaction on an account. `amount` is signed minor units
   * (negative = outflow); an optional category files it for reports. The target
   * account — and the category, when given — must exist, so a movement can never
   * point at a row that isn't there.
   */
  create: base
    .input(
      z.object({
        accountId: idSchema,
        amount: amountSchema,
        date: z.date(),
        payee: payeeSchema,
        categoryId: idSchema.nullish(),
        note: noteSchema,
      })
    )
    .handler(async ({ context, input }) => {
      assertAccountExists(context.db, input.accountId);
      if (input.categoryId != null) {
        assertCategoryExists(context.db, input.categoryId);
      }

      const created = context.db
        .insert(transactions)
        .values({
          accountId: input.accountId,
          amount: input.amount,
          date: input.date,
          payee: normalizeText(input.payee),
          categoryId: input.categoryId ?? null,
          note: normalizeText(input.note),
        })
        .returning()
        .get();

      return withNames(context.db, created);
    }),

  /**
   * Edit a manual transaction. Only the fields sent are touched; passing `null`
   * for `payee`, `note` or `categoryId` clears them. Moving the entry to another
   * account, or changing its amount, re-derives both accounts' balances on the
   * next read. Transfer legs cannot be edited here (see {@link loadEditable}).
   */
  update: base
    .input(
      z.object({
        id: idSchema,
        accountId: idSchema.optional(),
        amount: amountSchema.optional(),
        date: z.date().optional(),
        payee: payeeSchema,
        categoryId: idSchema.nullish(),
        note: noteSchema,
      })
    )
    .handler(async ({ context, input }) => {
      loadEditable(context.db, input.id);

      if (input.accountId !== undefined) {
        assertAccountExists(context.db, input.accountId);
      }
      if (input.categoryId != null) {
        assertCategoryExists(context.db, input.categoryId);
      }

      const changes: Partial<typeof transactions.$inferInsert> = {};
      if (input.accountId !== undefined) changes.accountId = input.accountId;
      if (input.amount !== undefined) changes.amount = input.amount;
      if (input.date !== undefined) changes.date = input.date;
      if (input.payee !== undefined) changes.payee = normalizeText(input.payee);
      if (input.note !== undefined) changes.note = normalizeText(input.note);
      if (input.categoryId !== undefined) changes.categoryId = input.categoryId;

      const updated =
        Object.keys(changes).length === 0
          ? context.db
              .select()
              .from(transactions)
              .where(eq(transactions.id, input.id))
              .get()
          : context.db
              .update(transactions)
              .set(changes)
              .where(eq(transactions.id, input.id))
              .returning()
              .get();

      // loadEditable already proved the row exists; the write can only return it.
      return withNames(context.db, updated!);
    }),

  /**
   * Delete a manual transaction. The account's balance is re-derived from the
   * remaining rows on the next read, so removing an entry corrects the balance
   * immediately. Transfer legs cannot be deleted here (see {@link loadEditable}).
   */
  delete: base
    .input(z.object({ id: idSchema }))
    .handler(async ({ context, input }) => {
      loadEditable(context.db, input.id);
      context.db
        .delete(transactions)
        .where(eq(transactions.id, input.id))
        .run();
      return { id: input.id };
    }),
});
