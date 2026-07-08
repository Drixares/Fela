import { ORPCError } from "@orpc/server";
import { categorizationRules } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { reorderRulesSchema } from "../validators";

export const reorderRulesBase = base.input(reorderRulesSchema);

/**
 * Rewrite the application order: `orderedIds` becomes the new order, first
 * applied first. It must name every existing rule exactly once — a partial
 * or stale sequence (screen out of date, a rule created or deleted since)
 * is refused rather than silently reshuffling rules the caller never saw.
 * All rows are renumbered in one SQL transaction.
 */
export const reorderRulesHandler = reorderRulesBase.handler(
  async ({ context, input }) => {
    const existing = context.db
      .select({ id: categorizationRules.id })
      .from(categorizationRules)
      .all();

    const existingIds = new Set(existing.map((rule) => rule.id));
    const sentIds = new Set(input.orderedIds);
    const isExactPermutation =
      input.orderedIds.length === existing.length &&
      sentIds.size === input.orderedIds.length &&
      input.orderedIds.every((id) => existingIds.has(id));
    if (!isExactPermutation) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Reorder must list every rule exactly once — refresh and retry",
      });
    }

    context.db.transaction((tx) => {
      input.orderedIds.forEach((id, index) => {
        tx.update(categorizationRules)
          .set({ sortOrder: index })
          .where(eq(categorizationRules.id, id))
          .run();
      });
    });

    return { reordered: input.orderedIds.length };
  }
);
