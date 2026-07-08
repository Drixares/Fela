import { base } from "src/context";

import {
  lastCategoryByPayee,
  suggestionFor,
} from "../../transactions/utils/last-category-by-payee";
import { assertAccountExists } from "../utils/assert-account-exists";
import { matchAgainstStored } from "../utils/match-against-stored";
import { announcedCategory, loadApplicableRules } from "../utils/matching";
import { readRows } from "../utils/read-rows";
import { resolveMapping } from "../utils/resolve-mapping";
import { previewSchema } from "../validators";

export const previewBase = base.input(previewSchema);

/**
 * Dry-run an import: parse the file, apply the mapping and report what a
 * commit would do — without writing anything. An invalid file or mapping is
 * refused here with the same error a commit would give.
 */
export const previewHandler = previewBase.handler(
  async ({ context, input }) => {
    assertAccountExists(context.db, input.accountId);
    const mapping = resolveMapping(context.db, input.accountId, input.mapping);
    const rows = readRows(input.content, mapping);

    const flagged = matchAgainstStored(context.db, input.accountId, rows);
    const duplicateCount = flagged.filter((row) => row.duplicate).length;
    // Announce the category each rule will assign (issue #13) — id for the
    // commit, name for the screen — so the user corrects the classification
    // before validating rather than after.
    const rules = loadApplicableRules(context.db);
    // For rows no rule matches, propose the last category used for that payee
    // (issue #15). The incoming label is what a committed row's payee becomes,
    // so it is the lookup key; the rule takes precedence (see `suggestionFor`).
    const suggestions = lastCategoryByPayee(context.db);
    return {
      // Explicit payload (not the internal MatchedRow) — the fingerprint is
      // an implementation detail, and the renderer only renders these. Each
      // probable duplicate carries the stored transaction it collided with,
      // so the user can unfold it, judge it, and force a false positive in.
      rows: flagged.map((row) => {
        const category = announcedCategory(row.label, rules);
        return {
          line: row.line,
          date: row.date,
          amount: row.amount,
          label: row.label,
          duplicate: row.duplicate,
          existing: row.existing,
          category,
          suggestion: suggestionFor(suggestions, row.label, category),
        };
      }),
      newCount: flagged.length - duplicateCount,
      duplicateCount,
    };
  }
);
