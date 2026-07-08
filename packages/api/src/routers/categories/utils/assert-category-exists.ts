import type { Db } from "@repo/db";
import { categories } from "@repo/db";
import { eq } from "drizzle-orm";

import { categoryNotFound } from "./not-found";

/** Throw NOT_FOUND unless a category with `id` exists. */
export function assertCategoryExists(db: Db, id: number): void {
  const target = db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .get();
  if (!target) {
    throw categoryNotFound(id);
  }
}
