import { ORPCError } from "@orpc/server";
import {
  categories,
  categorizationRules,
  categoryGroups,
  transactions,
} from "@repo/db";
import type { Category, CategoryGroup, Db } from "@repo/db";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { CATEGORY_KINDS } from "../../client.js";
import { base } from "../../context.js";

/** A group with its leaf categories nested under it — the overview's unit. */
type GroupWithCategories = CategoryGroup & { categories: Category[] };

const nameSchema = z.string().trim().min(1).max(100);
const kindSchema = z.enum(CATEGORY_KINDS);
const idSchema = z.int().positive();

const groupNotFound = (id: number): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", { message: `No category group with id ${id}` });

const categoryNotFound = (id: number): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", { message: `No category with id ${id}` });

/** Throw NOT_FOUND unless a group with `id` exists — used before linking to it. */
function assertGroupExists(db: Db, id: number): void {
  const group = db
    .select({ id: categoryGroups.id })
    .from(categoryGroups)
    .where(eq(categoryGroups.id, id))
    .get();
  if (!group) {
    throw groupNotFound(id);
  }
}

/**
 * Category procedures — the two-level classification slice (see the V1 PRD, #1,
 * and issue #4). Categories are the leaf every transaction points at; groups are
 * an optional presentational level above them. Because transactions reference
 * only the leaf, groups can be renamed, deleted or reshuffled, and categories
 * moved between them, without ever touching — or corrupting — the ledger.
 *
 * Referential clean-up (un-grouping a group's categories, re-pointing a deleted
 * category's transactions) is done explicitly inside a SQL transaction rather
 * than via FK actions, since the app does not enable SQLite's foreign-key
 * enforcement. This keeps reports from ever silently losing a classification.
 */
export const categoriesRouter = base.router({
  /**
   * The whole classification tree: every group (ordered by its `sortOrder`,
   * then name) with its categories nested inside, plus the categories that
   * belong to no group. Categories are sorted by name within each bucket. This
   * is the exact shape the categories screen renders.
   */
  overview: base.handler(async ({ context }) => {
    const groups = context.db
      .select()
      .from(categoryGroups)
      .orderBy(asc(categoryGroups.sortOrder), asc(categoryGroups.name))
      .all();

    const allCategories = context.db
      .select()
      .from(categories)
      .orderBy(asc(categories.name))
      .all();

    const byGroup = new Map<number, Category[]>();
    const ungrouped: Category[] = [];
    for (const category of allCategories) {
      if (category.groupId === null) {
        ungrouped.push(category);
      } else {
        const bucket = byGroup.get(category.groupId) ?? [];
        bucket.push(category);
        byGroup.set(category.groupId, bucket);
      }
    }

    const withCategories: GroupWithCategories[] = groups.map((group) => ({
      ...group,
      categories: byGroup.get(group.id) ?? [],
    }));

    return { groups: withCategories, ungrouped };
  }),

  /**
   * Create a group. New groups are appended after existing ones (their
   * `sortOrder` is one past the current maximum), so creating a group never
   * reshuffles the ones already on screen.
   */
  createGroup: base
    .input(z.object({ name: nameSchema }))
    .handler(async ({ context, input }) => {
      const max = context.db
        .select({
          value: sql<number>`coalesce(max(${categoryGroups.sortOrder}), -1)`,
        })
        .from(categoryGroups)
        .get();

      return context.db
        .insert(categoryGroups)
        .values({ name: input.name, sortOrder: (max?.value ?? -1) + 1 })
        .returning()
        .get();
    }),

  /** Rename a group. 404 if it no longer exists. */
  renameGroup: base
    .input(z.object({ id: idSchema, name: nameSchema }))
    .handler(async ({ context, input }) => {
      const updated = context.db
        .update(categoryGroups)
        .set({ name: input.name })
        .where(eq(categoryGroups.id, input.id))
        .returning()
        .get();

      if (!updated) {
        throw groupNotFound(input.id);
      }
      return updated;
    }),

  /**
   * Delete a group. Its categories are *not* deleted — they are un-grouped
   * (their `groupId` is cleared) so every transaction classified under them
   * keeps its category and its place in reports. Both writes run in one SQL
   * transaction so the group can never vanish while its categories still point
   * at it.
   */
  deleteGroup: base
    .input(z.object({ id: idSchema }))
    .handler(async ({ context, input }) => {
      const group = context.db
        .select({ id: categoryGroups.id })
        .from(categoryGroups)
        .where(eq(categoryGroups.id, input.id))
        .get();
      if (!group) {
        throw groupNotFound(input.id);
      }

      context.db.transaction((tx) => {
        tx.update(categories)
          .set({ groupId: null })
          .where(eq(categories.groupId, input.id))
          .run();
        tx.delete(categoryGroups).where(eq(categoryGroups.id, input.id)).run();
      });

      return { id: input.id };
    }),

  /**
   * Create a leaf category. `groupId` is optional; when given it must reference
   * an existing group (a dangling link would silently disappear from the
   * overview), so it is validated up front.
   */
  create: base
    .input(
      z.object({
        name: nameSchema,
        kind: kindSchema,
        groupId: idSchema.nullish(),
      })
    )
    .handler(async ({ context, input }) => {
      if (input.groupId != null) {
        assertGroupExists(context.db, input.groupId);
      }

      return context.db
        .insert(categories)
        .values({
          name: input.name,
          kind: input.kind,
          groupId: input.groupId ?? null,
        })
        .returning()
        .get();
    }),

  /**
   * Rename and/or re-type a category. Only the fields sent are touched; moving
   * it between groups is a separate concern (see `move`). Its transactions are
   * never affected.
   */
  update: base
    .input(
      z.object({
        id: idSchema,
        name: nameSchema.optional(),
        kind: kindSchema.optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const { id, ...changes } = input;

      // Nothing to change → just read it back (an empty `.set({})` is an error),
      // still 404 if it is gone.
      const updated =
        Object.keys(changes).length === 0
          ? context.db
              .select()
              .from(categories)
              .where(eq(categories.id, id))
              .get()
          : context.db
              .update(categories)
              .set(changes)
              .where(eq(categories.id, id))
              .returning()
              .get();

      if (!updated) {
        throw categoryNotFound(id);
      }
      return updated;
    }),

  /**
   * Move a category into another group, or out of every group (`groupId: null`).
   * Only the category's link changes — its transactions keep pointing at it, so
   * no classified history is ever lost. A non-null target group must exist.
   */
  move: base
    .input(z.object({ id: idSchema, groupId: idSchema.nullable() }))
    .handler(async ({ context, input }) => {
      if (input.groupId !== null) {
        assertGroupExists(context.db, input.groupId);
      }

      const updated = context.db
        .update(categories)
        .set({ groupId: input.groupId })
        .where(eq(categories.id, input.id))
        .returning()
        .get();

      if (!updated) {
        throw categoryNotFound(input.id);
      }
      return updated;
    }),

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
  delete: base
    .input(z.object({ id: idSchema, reassignToId: idSchema.optional() }))
    .handler(async ({ context, input }) => {
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
        assertReassignTargetExists(context.db, input.reassignToId);
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
    }),
});

/** Throw NOT_FOUND unless the reassignment target category exists. */
function assertReassignTargetExists(db: Db, id: number): void {
  const target = db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .get();
  if (!target) {
    throw categoryNotFound(id);
  }
}
