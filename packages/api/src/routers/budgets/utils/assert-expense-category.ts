import { ORPCError } from "@orpc/server";
import type { Db } from "@repo/db";
import { categories } from "@repo/db";
import { eq } from "drizzle-orm";

// Anything that can read rows — the top-level {@link Db} or a transaction handle,
// so the guard can run inside a handler's `db.transaction(...)`.
type Reader = Pick<Db, "select">;

/**
 * Throw unless `id` is an existing category of kind `expense` — the guard a
 * budget line must clear before it is written, in the style of
 * `assertCategoryExists`. A missing category is NOT_FOUND; an `income` category
 * is a BAD_REQUEST, since only expenses can be budgeted (income is a reference,
 * not something to carve up). Transfers never reach here — they carry no
 * category at all.
 */
export function assertExpenseCategory(db: Reader, id: number): void {
  const category = db
    .select({ kind: categories.kind })
    .from(categories)
    .where(eq(categories.id, id))
    .get();
  if (!category) {
    throw new ORPCError("NOT_FOUND", { message: `No category with id ${id}` });
  }
  if (category.kind !== "expense") {
    throw new ORPCError("BAD_REQUEST", {
      message: `Category ${id} is not an expense category`,
    });
  }
}
