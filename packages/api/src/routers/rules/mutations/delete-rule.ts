import { categorizationRules } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { ruleNotFound } from "../utils/rule-not-found";
import { deleteRuleSchema } from "../validators";

export const deleteRuleBase = base.input(deleteRuleSchema);

/**
 * Delete a rule. Only future imports are affected — transactions the rule
 * already classified keep their category.
 */
export const deleteRuleHandler = deleteRuleBase.handler(
  async ({ context, input }) => {
    const deleted = context.db
      .delete(categorizationRules)
      .where(eq(categorizationRules.id, input.id))
      .returning({ id: categorizationRules.id })
      .get();

    if (!deleted) {
      throw ruleNotFound(input.id);
    }
    return { id: input.id };
  }
);
