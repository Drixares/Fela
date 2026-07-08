import type { Db } from "@repo/db";
import { transactions } from "@repo/db";
import { and, isNull, isNotNull, ne, or } from "drizzle-orm";

import { patternMatches } from "../../imports/utils/matching";

/** Anything that can read rows — the top-level {@link Db} or a transaction handle. */
type Reader = Pick<Db, "select">;

/**
 * The ids of the ledger transactions a rule « le libellé contient `pattern` →
 * `categoryId` » would reclassify if applied retroactively (issue #15): every
 * non-transfer row whose payee contains the pattern and is not already filed
 * under the target category. A transfer leg (no category by design) is never a
 * candidate, and a row already in the target is excluded so the reported count
 * is the number of rows that will actually change.
 *
 * The `patternMatches` filter runs in JS, against the same case-insensitive
 * "contains" the import uses, so a preview count and a commit can never disagree
 * on what the pattern means; the SQL narrows the candidates first (non-transfer,
 * payee present, category differs) so only plausible rows are pulled.
 */
export function retroactiveMatchIds(
  db: Reader,
  pattern: string,
  categoryId: number
): number[] {
  const candidates = db
    .select({ id: transactions.id, payee: transactions.payee })
    .from(transactions)
    .where(
      and(
        isNull(transactions.transferId),
        isNotNull(transactions.payee),
        or(
          isNull(transactions.categoryId),
          ne(transactions.categoryId, categoryId)
        )
      )
    )
    .all();

  return candidates
    .filter((row) => row.payee !== null && patternMatches(row.payee, pattern))
    .map((row) => row.id);
}
