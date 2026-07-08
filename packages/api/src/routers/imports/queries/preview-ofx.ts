import { base } from "src/context";

import {
  lastCategoryByPayee,
  suggestionFor,
} from "../../transactions/utils/last-category-by-payee";
import { assertAccountExists } from "../utils/assert-account-exists";
import { flagOfxAgainstStored } from "../utils/flag-ofx-against-stored";
import { announcedCategory, loadApplicableRules } from "../utils/matching";
import { readOfxRows } from "../utils/read-ofx-rows";
import { previewOfxSchema } from "../validators";

export const previewOfxBase = base.input(previewOfxSchema);

/**
 * Dry-run an OFX import (see issue #11): parse the file and report what a
 * commit would do — without writing anything. No column mapping: OFX carries
 * its own tags. Duplicates are flagged by FITID against the account's stored
 * rows. An unreadable file is refused here with the same error a commit gives.
 */
export const previewOfxHandler = previewOfxBase.handler(
  async ({ context, input }) => {
    assertAccountExists(context.db, input.accountId);
    const rows = readOfxRows(input.content);

    const flagged = flagOfxAgainstStored(context.db, input.accountId, rows);
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
      // Explicit payload (not the internal FlaggedOfxRow) — the FITID is an
      // implementation detail, and the renderer only renders these fields.
      rows: flagged.map((row) => {
        const category = announcedCategory(row.label, rules);
        return {
          date: row.date,
          amount: row.amount,
          label: row.label,
          duplicate: row.duplicate,
          category,
          suggestion: suggestionFor(suggestions, row.label, category),
        };
      }),
      newCount: flagged.length - duplicateCount,
      duplicateCount,
    };
  }
);
