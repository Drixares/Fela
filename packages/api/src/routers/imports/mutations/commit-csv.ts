import { importMappings, transactions } from "@repo/db";
import { base } from "src/context";

import { assertAccountExists } from "../utils/assert-account-exists";
import { matchAgainstStored } from "../utils/match-against-stored";
import { effectiveCategoryId, loadApplicableRules } from "../utils/matching";
import { readRows } from "../utils/read-rows";
import { resolveMapping } from "../utils/resolve-mapping";
import { resolveOverrides } from "../utils/resolve-overrides";
import { commitSchema } from "../validators";

export const commitBase = base.input(commitSchema);

/**
 * Apply an import: insert the file's rows on the account and remember the
 * column mapping for the next import — all inside one SQL transaction, so a
 * failed import leaves the ledger and the mapping exactly as they were.
 */
export const commitHandler = commitBase.handler(async ({ context, input }) => {
  assertAccountExists(context.db, input.accountId);
  const overrides = resolveOverrides(
    context.db,
    (input.categoryOverrides ?? []).map((o) => ({
      key: o.line,
      categoryId: o.categoryId,
    }))
  );
  const mapping = resolveMapping(context.db, input.accountId, input.mapping);
  const rows = readRows(input.content, mapping);
  const forced = new Set(input.forceLines ?? []);

  return context.db.transaction((tx) => {
    // Flag inside the transaction, against the same snapshot the inserts
    // will see, so a commit racing another write can't double-import.
    const flagged = matchAgainstStored(tx, input.accountId, rows);
    // A row imports when it's new, or when the user forced it despite the
    // duplicate flag. A forced row enters with its fingerprint, so a later
    // re-import sees it stored and skips it — it lands exactly once.
    const toImport = flagged.filter(
      (row) => !row.duplicate || forced.has(row.line)
    );

    if (toImport.length > 0) {
      // Classify each incoming row by the user's rules (issue #13), so
      // matching rows land already categorised. Rules are re-read here
      // rather than trusted from the preview, but the two cannot diverge
      // through the app: the preview lives in a modal dialog, so no rule
      // can change between it and this commit. A correction made on the
      // preview screen takes precedence over the rules' verdict.
      const rules = loadApplicableRules(tx);
      tx.insert(transactions)
        .values(
          toImport.map((row) => ({
            accountId: input.accountId,
            amount: row.amount,
            date: row.date,
            payee: row.label,
            categoryId: effectiveCategoryId(
              overrides,
              row.line,
              row.label,
              rules
            ),
            importFingerprint: row.fingerprint,
          }))
        )
        .run();
    }

    tx.insert(importMappings)
      .values({ accountId: input.accountId, ...mapping })
      .onConflictDoUpdate({
        target: importMappings.accountId,
        set: { ...mapping, updatedAt: new Date() },
      })
      .run();

    return {
      imported: toImport.length,
      duplicates: flagged.length - toImport.length,
    };
  });
});
