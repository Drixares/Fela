import { transactions } from "@repo/db";
import { base } from "src/context";

import { assertAccountExists } from "../utils/assert-account-exists";
import { assertCategoryExists } from "../utils/assert-category-exists";
import { normalizeText } from "../utils/normalize-text";
import { withNames } from "../utils/with-names";
import { createTransactionSchema } from "../validators";

export const createTransactionBase = base.input(createTransactionSchema);

/**
 * Record a manual transaction on an account. `amount` is signed minor units
 * (negative = outflow); an optional category files it for reports. The target
 * account — and the category, when given — must exist, so a movement can never
 * point at a row that isn't there.
 */
export const createTransactionHandler = createTransactionBase.handler(
  async ({ context, input }) => {
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
  }
);
