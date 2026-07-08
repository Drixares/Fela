import { categorizationRules, transactions } from "@repo/db";
import { eq, inArray } from "drizzle-orm";
import { base } from "src/context";

import { retroactiveMatchIds } from "../utils/retroactive-matches";
import { ruleNotFound } from "../utils/rule-not-found";
import { applyRetroactiveSchema } from "../validators";

export const applyRetroactiveBase = base.input(applyRetroactiveSchema);

/**
 * Apply an existing rule to the transactions already in the ledger (issue #15):
 * every non-transfer row whose payee matches the rule's pattern and is not
 * already under its category is refiled under it. Runs only on this explicit
 * call — « l'application rétroactive n'a lieu que sur demande explicite » — so
 * a bare rule creation never rewrites history.
 *
 * Matching and the write share one SQL transaction, so a concurrent write can't
 * slip a row past the count the caller was shown. Returns how many rows changed.
 */
export const applyRetroactiveHandler = applyRetroactiveBase.handler(
  ({ context, input }) => {
    return context.db.transaction((tx) => {
      const rule = tx
        .select({
          pattern: categorizationRules.pattern,
          categoryId: categorizationRules.categoryId,
        })
        .from(categorizationRules)
        .where(eq(categorizationRules.id, input.id))
        .get();
      if (!rule) {
        throw ruleNotFound(input.id);
      }

      const ids = retroactiveMatchIds(tx, rule.pattern, rule.categoryId);
      if (ids.length > 0) {
        tx.update(transactions)
          .set({ categoryId: rule.categoryId })
          .where(inArray(transactions.id, ids))
          .run();
      }
      return { updated: ids.length };
    });
  }
);
