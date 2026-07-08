import { categories } from "@repo/db";
import { base } from "src/context";

import { assertGroupExists } from "../utils/assert-group-exists";
import { createCategorySchema } from "../validators";

export const createCategoryBase = base.input(createCategorySchema);

/**
 * Create a leaf category. `groupId` is optional; when given it must reference
 * an existing group (a dangling link would silently disappear from the
 * overview), so it is validated up front.
 */
export const createCategoryHandler = createCategoryBase.handler(
  async ({ context, input }) => {
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
  }
);
