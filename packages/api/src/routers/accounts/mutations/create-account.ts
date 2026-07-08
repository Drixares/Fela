import { accounts } from "@repo/db";
import { base } from "src/context";

import { createAccountSchema } from "../validators";

export const createAccountBase = base.input(createAccountSchema);

/**
 * Create an account. The opening balance defaults to zero; the returned
 * `balance` equals it since a fresh account has no transactions yet.
 */
export const createAccountHandler = createAccountBase.handler(
  async ({ context, input }) => {
    const created = context.db
      .insert(accounts)
      .values({
        name: input.name,
        type: input.type,
        initialBalance: input.initialBalance,
      })
      .returning()
      .get();

    return { ...created, balance: created.initialBalance };
  }
);
