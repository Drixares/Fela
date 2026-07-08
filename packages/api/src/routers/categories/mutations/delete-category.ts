import { ORPCError } from "@orpc/server";
import { categories, categorizationRules, transactions } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { assertCategoryExists } from "../utils/assert-category-exists";
import { categoryNotFound } from "../utils/not-found";
import { deleteCategorySchema } from "../validators";

export const deleteCategoryBase = base.input(deleteCategorySchema);

/**
 * Delete a category, re-pointing the transactions filed under it so reports
 * never silently lose them:
 *
 * - with `reassignToId`, every such transaction moves to that category;
 * - without it, they become uncategorised (`categoryId` set to null).
 *
 * Categorization rules targeting the category follow the same reassignment;
 * without one they are deleted — a rule cannot file rows under nothing (see
 * issue #13).
 *
 * The re-point and the delete run in one SQL transaction, so neither a
 * transaction nor a rule can ever be left pointing at a category that no
 * longer exists.
 *
 * @returns the deleted id and how many transactions were re-pointed.
 */
export const deleteCategoryHandler = deleteCategoryBase.handler(
  async ({ context, input }) => {
    const category = context.db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.id))
      .get();
    if (!category) {
      throw categoryNotFound(input.id);
    }

    if (input.reassignToId !== undefined) {
      if (input.reassignToId === input.id) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot reassign a category's transactions to itself",
        });
      }
      assertCategoryExists(context.db, input.reassignToId);
    }

    const reassigned = context.db.transaction((tx) => {
      const affected = tx
        .update(transactions)
        .set({ categoryId: input.reassignToId ?? null })
        .where(eq(transactions.categoryId, input.id))
        .run();
      if (input.reassignToId !== undefined) {
        tx.update(categorizationRules)
          .set({ categoryId: input.reassignToId })
          .where(eq(categorizationRules.categoryId, input.id))
          .run();
      } else {
        tx.delete(categorizationRules)
          .where(eq(categorizationRules.categoryId, input.id))
          .run();
      }
      tx.delete(categories).where(eq(categories.id, input.id)).run();
      return affected.changes;
    });

    return { id: input.id, reassigned };
  }
);
