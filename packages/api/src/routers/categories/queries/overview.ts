import { categories, categoryGroups } from "@repo/db";
import type { Category, CategoryGroup } from "@repo/db";
import { asc } from "drizzle-orm";
import { base } from "src/context";

/** A group with its leaf categories nested under it — the overview's unit. */
type GroupWithCategories = CategoryGroup & { categories: Category[] };

/**
 * The whole classification tree: every group (ordered by its `sortOrder`,
 * then name) with its categories nested inside, plus the categories that
 * belong to no group. Categories are sorted by name within each bucket. This
 * is the exact shape the categories screen renders.
 */
export const overviewHandler = base.handler(async ({ context }) => {
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
});
