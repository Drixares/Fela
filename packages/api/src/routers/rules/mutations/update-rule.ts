import { categorizationRules } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { assertCategoryExists } from "../utils/assert-category-exists";
import { ruleNotFound } from "../utils/rule-not-found";
import { updateRuleSchema } from "../validators";

export const updateRuleBase = base.input(updateRuleSchema);

/**
 * Edit a rule's pattern and/or target category. Only the fields sent are
 * touched; the rule keeps its place in the application order (reordering is
 * a separate concern — see `reorder`). A new target category must exist.
 */
export const updateRuleHandler = updateRuleBase.handler(
  async ({ context, input }) => {
    const { id, ...changes } = input;
    if (changes.categoryId !== undefined) {
      assertCategoryExists(context.db, changes.categoryId);
    }

    // Nothing to change → just read it back (an empty `.set({})` is an
    // error), still 404 if it is gone.
    const updated =
      Object.keys(changes).length === 0
        ? context.db
            .select()
            .from(categorizationRules)
            .where(eq(categorizationRules.id, id))
            .get()
        : context.db
            .update(categorizationRules)
            .set(changes)
            .where(eq(categorizationRules.id, id))
            .returning()
            .get();

    if (!updated) {
      throw ruleNotFound(id);
    }
    return updated;
  }
);
