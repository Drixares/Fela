import type { Db } from "@repo/db";
import { categoryGroups } from "@repo/db";
import { eq } from "drizzle-orm";

import { groupNotFound } from "./not-found";

/** Throw NOT_FOUND unless a group with `id` exists — used before linking to it. */
export function assertGroupExists(db: Db, id: number): void {
  const group = db
    .select({ id: categoryGroups.id })
    .from(categoryGroups)
    .where(eq(categoryGroups.id, id))
    .get();
  if (!group) {
    throw groupNotFound(id);
  }
}
