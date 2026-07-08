import { accounts } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { accountNotFound } from "../utils/account-not-found";
import { withBalance } from "../utils/with-balance";
import { updateAccountSchema } from "../validators";

export const updateAccountBase = base.input(updateAccountSchema);

/**
 * Edit an account's name, type and/or opening balance. Only the fields sent
 * are touched; the balance is re-derived from the (possibly new) opening
 * balance and the existing transactions.
 */
export const updateAccountHandler = updateAccountBase.handler(
  async ({ context, input }) => {
    const { id, ...changes } = input;

    // With no fields to change, skip the write (an empty `.set({})` is an
    // error) and just read the account back — still a 404 if it is gone.
    const updated =
      Object.keys(changes).length === 0
        ? context.db.select().from(accounts).where(eq(accounts.id, id)).get()
        : context.db
            .update(accounts)
            .set(changes)
            .where(eq(accounts.id, id))
            .returning()
            .get();

    if (!updated) {
      throw accountNotFound(id);
    }

    return withBalance(context.db, updated);
  }
);
