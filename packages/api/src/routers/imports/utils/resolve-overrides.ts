import { ORPCError } from "@orpc/server";
import type { Db } from "@repo/db";
import { categories } from "@repo/db";
import { eq } from "drizzle-orm";

/**
 * Throw NOT_FOUND unless every category named by the overrides exists — a
 * dangling correction would classify rows under a category no report can show.
 * Returns the corrections as a lookup by row key.
 */
export function resolveOverrides<K>(
  db: Db,
  overrides: { key: K; categoryId: number | null }[]
): Map<K, number | null> {
  for (const override of overrides) {
    if (override.categoryId === null) continue;
    const category = db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, override.categoryId))
      .get();
    if (!category) {
      throw new ORPCError("NOT_FOUND", {
        message: `No category with id ${override.categoryId}`,
      });
    }
  }
  return new Map(overrides.map((o) => [o.key, o.categoryId]));
}
