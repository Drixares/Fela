import { ORPCError } from "@orpc/server";
import { categories, categorizationRules } from "@repo/db";
import type { Db } from "@repo/db";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { base } from "../../context.js";

const idSchema = z.int().positive();
// The substring looked for in incoming labels. Trimmed so an all-space
// pattern (which would match every label) is refused as empty.
const patternSchema = z.string().trim().min(1).max(100);

const ruleNotFound = (id: number): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", {
    message: `No categorization rule with id ${id}`,
  });

/** Throw NOT_FOUND unless a category with `id` exists — a rule must target one. */
function assertCategoryExists(db: Db, id: number): void {
  const category = db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .get();
  if (!category) {
    throw new ORPCError("NOT_FOUND", {
      message: `No category with id ${id}`,
    });
  }
}

/**
 * Categorization-rule procedures (see issue #13): « si le libellé contient X
 * → catégorie Y ». Rules classify *incoming* rows at import time; they never
 * rewrite the ledger. `sortOrder` is the application order — imports try the
 * rules lowest-first and the first match wins — so the management screen must
 * present the list in this exact order.
 */
export const rulesRouter = base.router({
  /** Every rule, in application order — the shape the rules screen renders. */
  list: base.handler(async ({ context }) => {
    return context.db
      .select()
      .from(categorizationRules)
      .orderBy(asc(categorizationRules.sortOrder), asc(categorizationRules.id))
      .all();
  }),

  /**
   * Create a rule. New rules are appended after existing ones (their
   * `sortOrder` is one past the current maximum), so a new rule never
   * preempts the ones the user already ordered. The target category must
   * exist — a dangling rule would classify rows under a category no report
   * can show.
   */
  create: base
    .input(z.object({ pattern: patternSchema, categoryId: idSchema }))
    .handler(async ({ context, input }) => {
      assertCategoryExists(context.db, input.categoryId);

      const max = context.db
        .select({
          value: sql<number>`coalesce(max(${categorizationRules.sortOrder}), -1)`,
        })
        .from(categorizationRules)
        .get();

      return context.db
        .insert(categorizationRules)
        .values({
          pattern: input.pattern,
          categoryId: input.categoryId,
          sortOrder: (max?.value ?? -1) + 1,
        })
        .returning()
        .get();
    }),

  /**
   * Edit a rule's pattern and/or target category. Only the fields sent are
   * touched; the rule keeps its place in the application order (reordering is
   * a separate concern — see `reorder`). A new target category must exist.
   */
  update: base
    .input(
      z.object({
        id: idSchema,
        pattern: patternSchema.optional(),
        categoryId: idSchema.optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const { id, ...changes } = input;
      if (changes.categoryId !== undefined) {
        assertCategoryExists(context.db, changes.categoryId);
      }

      // Nothing to change → just read it back (an empty `.set({})` is an
      // error), still 404 if it is gone.
      const updated =
        Object.keys(changes).length === 0
          ? context.db
              .select()
              .from(categorizationRules)
              .where(eq(categorizationRules.id, id))
              .get()
          : context.db
              .update(categorizationRules)
              .set(changes)
              .where(eq(categorizationRules.id, id))
              .returning()
              .get();

      if (!updated) {
        throw ruleNotFound(id);
      }
      return updated;
    }),

  /**
   * Delete a rule. Only future imports are affected — transactions the rule
   * already classified keep their category.
   */
  delete: base
    .input(z.object({ id: idSchema }))
    .handler(async ({ context, input }) => {
      const deleted = context.db
        .delete(categorizationRules)
        .where(eq(categorizationRules.id, input.id))
        .returning({ id: categorizationRules.id })
        .get();

      if (!deleted) {
        throw ruleNotFound(input.id);
      }
      return { id: input.id };
    }),

  /**
   * Rewrite the application order: `orderedIds` becomes the new order, first
   * applied first. It must name every existing rule exactly once — a partial
   * or stale sequence (screen out of date, a rule created or deleted since)
   * is refused rather than silently reshuffling rules the caller never saw.
   * All rows are renumbered in one SQL transaction.
   */
  reorder: base
    .input(z.object({ orderedIds: z.array(idSchema) }))
    .handler(async ({ context, input }) => {
      const existing = context.db
        .select({ id: categorizationRules.id })
        .from(categorizationRules)
        .all();

      const existingIds = new Set(existing.map((rule) => rule.id));
      const sentIds = new Set(input.orderedIds);
      const isExactPermutation =
        input.orderedIds.length === existing.length &&
        sentIds.size === input.orderedIds.length &&
        input.orderedIds.every((id) => existingIds.has(id));
      if (!isExactPermutation) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Reorder must list every rule exactly once — refresh and retry",
        });
      }

      context.db.transaction((tx) => {
        input.orderedIds.forEach((id, index) => {
          tx.update(categorizationRules)
            .set({ sortOrder: index })
            .where(eq(categorizationRules.id, id))
            .run();
        });
      });

      return { reordered: input.orderedIds.length };
    }),
});
