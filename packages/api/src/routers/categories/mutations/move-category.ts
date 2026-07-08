import { categories } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { assertGroupExists } from "../utils/assert-group-exists";
import { categoryNotFound } from "../utils/not-found";
import { moveCategorySchema } from "../validators";

export const moveCategoryBase = base.input(moveCategorySchema);

/**
 * Move a category into another group, or out of every group (`groupId: null`).
 * Only the category's link changes — its transactions keep pointing at it, so
 * no classified history is ever lost. A non-null target group must exist.
 */
export const moveCategoryHandler = moveCategoryBase.handler(
  async ({ context, input }) => {
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
  }
);
