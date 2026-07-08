import { categories } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { categoryNotFound } from "../utils/not-found";
import { updateCategorySchema } from "../validators";

export const updateCategoryBase = base.input(updateCategorySchema);

/**
 * Rename and/or re-type a category. Only the fields sent are touched; moving
 * it between groups is a separate concern (see `move`). Its transactions are
 * never affected.
 */
export const updateCategoryHandler = updateCategoryBase.handler(
  async ({ context, input }) => {
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
  }
);
