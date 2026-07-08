import { categorizationRules } from "@repo/db";
import { sql } from "drizzle-orm";
import { base } from "src/context";

import { assertCategoryExists } from "../utils/assert-category-exists";
import { createRuleSchema } from "../validators";

export const createRuleBase = base.input(createRuleSchema);

/**
 * Create a rule. New rules are appended after existing ones (their
 * `sortOrder` is one past the current maximum), so a new rule never
 * preempts the ones the user already ordered. The target category must
 * exist — a dangling rule would classify rows under a category no report
 * can show.
 */
export const createRuleHandler = createRuleBase.handler(
  async ({ context, input }) => {
    assertCategoryExists(context.db, input.categoryId);

    const max = context.db
      .select({
        value: sql<number>`coalesce(max(${categorizationRules.sortOrder}), -1)`,
      })
      .from(categorizationRules)
      .get();

    return context.db
      .insert(categorizationRules)
      .values({
        pattern: input.pattern,
        categoryId: input.categoryId,
        sortOrder: (max?.value ?? -1) + 1,
      })
      .returning()
      .get();
  }
);
