import { categoryGroups } from "@repo/db";
import { sql } from "drizzle-orm";
import { base } from "src/context";

import { createGroupSchema } from "../validators";

export const createGroupBase = base.input(createGroupSchema);

/**
 * Create a group. New groups are appended after existing ones (their
 * `sortOrder` is one past the current maximum), so creating a group never
 * reshuffles the ones already on screen.
 */
export const createGroupHandler = createGroupBase.handler(
  async ({ context, input }) => {
    const max = context.db
      .select({
        value: sql<number>`coalesce(max(${categoryGroups.sortOrder}), -1)`,
      })
      .from(categoryGroups)
      .get();

    return context.db
      .insert(categoryGroups)
      .values({ name: input.name, sortOrder: (max?.value ?? -1) + 1 })
      .returning()
      .get();
  }
);
