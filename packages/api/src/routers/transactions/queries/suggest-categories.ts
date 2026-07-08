import { base } from "src/context";

import { categorize, loadApplicableRules } from "../../imports/utils/matching";
import {
  lastCategoryByPayee,
  payeeKey,
  type PayeeSuggestion,
} from "../utils/last-category-by-payee";
import { suggestCategoriesSchema } from "../validators";

export const suggestCategoriesBase = base.input(suggestCategoriesSchema);

/**
 * For each payee asked about, the last category it was filed under — the
 * history-based suggestion the transactions list shows on uncategorised rows so
 * classifying « un payee déjà rencontré » is a simple nod (issue #15). A payee
 * with no categorised history yields no entry, so the caller renders a
 * suggestion only where there is one. The `payee` is echoed back exactly as
 * asked, so the caller keys its rows by their own string without re-normalising.
 *
 * The suggestion is offered for « payee déjà rencontré **sans règle** » only:
 * if a rule already matches the payee, that rule — not the history — is what
 * should classify it (via import or retroactive application), so no suggestion
 * is returned. This mirrors the precedence the import preview applies per row.
 */
export const suggestCategoriesHandler = suggestCategoriesBase.handler(
  ({ context, input }) => {
    const byPayee = lastCategoryByPayee(context.db);
    const rules = loadApplicableRules(context.db);

    const out: { payee: string; category: PayeeSuggestion }[] = [];
    const seen = new Set<string>();
    for (const payee of input.payees) {
      if (seen.has(payee)) continue;
      seen.add(payee);
      if (categorize(payee, rules)) continue;
      const category = byPayee.get(payeeKey(payee));
      if (category) out.push({ payee, category });
    }
    return out;
  }
);
