import { transactions } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { loadEditable } from "../utils/load-editable";
import { deleteTransactionSchema } from "../validators";

export const deleteTransactionBase = base.input(deleteTransactionSchema);

/**
 * Delete a manual transaction. The account's balance is re-derived from the
 * remaining rows on the next read, so removing an entry corrects the balance
 * immediately. Transfer legs cannot be deleted here (see {@link loadEditable}).
 */
export const deleteTransactionHandler = deleteTransactionBase.handler(
  async ({ context, input }) => {
    loadEditable(context.db, input.id);
    context.db.delete(transactions).where(eq(transactions.id, input.id)).run();
    return { id: input.id };
  }
);
