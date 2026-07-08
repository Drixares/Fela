import { categories, categoryGroups } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { groupNotFound } from "../utils/not-found";
import { deleteGroupSchema } from "../validators";

export const deleteGroupBase = base.input(deleteGroupSchema);

/**
 * Delete a group. Its categories are *not* deleted — they are un-grouped
 * (their `groupId` is cleared) so every transaction classified under them
 * keeps its category and its place in reports. Both writes run in one SQL
 * transaction so the group can never vanish while its categories still point
 * at it.
 */
export const deleteGroupHandler = deleteGroupBase.handler(
  async ({ context, input }) => {
    const group = context.db
      .select({ id: categoryGroups.id })
      .from(categoryGroups)
      .where(eq(categoryGroups.id, input.id))
      .get();
    if (!group) {
      throw groupNotFound(input.id);
    }

    context.db.transaction((tx) => {
      tx.update(categories)
        .set({ groupId: null })
        .where(eq(categories.groupId, input.id))
        .run();
      tx.delete(categoryGroups).where(eq(categoryGroups.id, input.id)).run();
    });

    return { id: input.id };
  }
);
