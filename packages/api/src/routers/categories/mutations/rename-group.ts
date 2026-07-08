import { categoryGroups } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { groupNotFound } from "../utils/not-found";
import { renameGroupSchema } from "../validators";

export const renameGroupBase = base.input(renameGroupSchema);

/** Rename a group. 404 if it no longer exists. */
export const renameGroupHandler = renameGroupBase.handler(
  async ({ context, input }) => {
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
  }
);
