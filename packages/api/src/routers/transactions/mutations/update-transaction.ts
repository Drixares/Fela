import { transactions } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { assertAccountExists } from "../utils/assert-account-exists";
import { assertCategoryExists } from "../utils/assert-category-exists";
import { loadEditable } from "../utils/load-editable";
import { normalizeText } from "../utils/normalize-text";
import { withNames } from "../utils/with-names";
import { updateTransactionSchema } from "../validators";

export const updateTransactionBase = base.input(updateTransactionSchema);

/**
 * Edit a manual transaction. Only the fields sent are touched; passing `null`
 * for `payee`, `note` or `categoryId` clears them. Moving the entry to another
 * account, or changing its amount, re-derives both accounts' balances on the
 * next read. Transfer legs cannot be edited here (see {@link loadEditable}).
 */
export const updateTransactionHandler = updateTransactionBase.handler(
  async ({ context, input }) => {
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
  }
);
