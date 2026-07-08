import { transactions } from "@repo/db";
import { base } from "src/context";

import { assertAccountExists } from "../utils/assert-account-exists";
import { flagOfxAgainstStored } from "../utils/flag-ofx-against-stored";
import { effectiveCategoryId, loadApplicableRules } from "../utils/matching";
import { readOfxRows } from "../utils/read-ofx-rows";
import { resolveOverrides } from "../utils/resolve-overrides";
import { commitOfxSchema } from "../validators";

export const commitOfxBase = base.input(commitOfxSchema);

/**
 * Apply an OFX import (see issue #11): insert the file's new rows on the
 * account inside one SQL transaction, so a failed import leaves the ledger
 * exactly as it was. Rows whose FITID is already stored are skipped, so
 * re-importing an overlapping period never creates doubles.
 */
export const commitOfxHandler = commitOfxBase.handler(
  async ({ context, input }) => {
    assertAccountExists(context.db, input.accountId);
    const overrides = resolveOverrides(
      context.db,
      (input.categoryOverrides ?? []).map((o) => ({
        key: o.index,
        categoryId: o.categoryId,
      }))
    );
    const rows = readOfxRows(input.content);

    return context.db.transaction((tx) => {
      // Flag inside the transaction, against the same snapshot the inserts
      // will see, so a commit racing another write can't double-import.
      const flagged = flagOfxAgainstStored(tx, input.accountId, rows);
      // Keep each row's position in the full statement before dropping the
      // duplicates: overrides are keyed by that position (the order the
      // preview reported), so they still land right when duplicates are
      // interleaved.
      const fresh = flagged
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => !row.duplicate);

      if (fresh.length > 0) {
        // Classify each incoming row by the user's rules (issue #13); a
        // correction made on the preview screen takes precedence.
        const rules = loadApplicableRules(tx);
        tx.insert(transactions)
          .values(
            fresh.map(({ row, index }) => ({
              accountId: input.accountId,
              amount: row.amount,
              date: row.date,
              payee: row.label || null,
              categoryId: effectiveCategoryId(
                overrides,
                index,
                row.label,
                rules
              ),
              importExternalId: row.fitid,
            }))
          )
          .run();
      }

      return {
        imported: fresh.length,
        duplicates: flagged.length - fresh.length,
      };
    });
  }
);
