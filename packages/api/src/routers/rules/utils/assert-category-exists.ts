import { ORPCError } from "@orpc/server";
import type { Db } from "@repo/db";
import { categories } from "@repo/db";
import { eq } from "drizzle-orm";

/** Throw NOT_FOUND unless a category with `id` exists — a rule must target one. */
export function assertCategoryExists(db: Db, id: number): void {
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
