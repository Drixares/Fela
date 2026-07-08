import { ORPCError } from "@orpc/server";
import { transactions } from "@repo/db";
import { inArray } from "drizzle-orm";
import { base } from "src/context";

import { assertCategoryExists } from "../utils/assert-category-exists";
import { transactionNotFound } from "../utils/not-found";
import { bulkCategorizeSchema } from "../validators";

export const bulkCategorizeBase = base.input(bulkCategorizeSchema);

/**
 * File many transactions under one category in a single gesture — the bulk
 * correction pass after an import (see issue #9). `categoryId: null` clears
 * the category instead. All-or-nothing: every id must name an existing,
 * non-transfer transaction (a transfer leg carries no category by design),
 * and the rows are only written once every one has passed the check.
 */
export const bulkCategorizeHandler = bulkCategorizeBase.handler(
  async ({ context, input }) => {
    if (input.categoryId !== null) {
      assertCategoryExists(context.db, input.categoryId);
    }

    const ids = [...new Set(input.ids)];
    context.db.transaction((tx) => {
      const rows = tx
        .select({ id: transactions.id, transferId: transactions.transferId })
        .from(transactions)
        .where(inArray(transactions.id, ids))
        .all();

      if (rows.length !== ids.length) {
        const found = new Set(rows.map((row) => row.id));
        const missing = ids.find((id) => !found.has(id));
        throw transactionNotFound(missing!);
      }
      if (rows.some((row) => row.transferId !== null)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot categorize a transfer leg",
        });
      }

      tx.update(transactions)
        .set({ categoryId: input.categoryId })
        .where(inArray(transactions.id, ids))
        .run();
    });

    return { updated: ids.length };
  }
);
