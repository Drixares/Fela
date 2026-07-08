import { transactions } from "@repo/db";
import { and, eq, isNotNull } from "drizzle-orm";

import { flagOfxDuplicates } from "./ofx-import";
import type { FlaggedOfxRow, OfxRow } from "./ofx-import";
import type { Reader } from "./reader";

/**
 * Tag each OFX row as new or duplicate against the FITIDs already stored on the
 * account (set semantics — see `flagOfxDuplicates`).
 */
export function flagOfxAgainstStored(
  db: Reader,
  accountId: number,
  rows: OfxRow[]
): FlaggedOfxRow[] {
  const stored = db
    .select({ externalId: transactions.importExternalId })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        isNotNull(transactions.importExternalId)
      )
    )
    .all();

  const storedIds = new Set(stored.map((row) => row.externalId!));
  return flagOfxDuplicates(rows, storedIds);
}
