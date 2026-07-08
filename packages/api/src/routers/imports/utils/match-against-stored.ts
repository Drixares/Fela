import { transactions } from "@repo/db";
import { and, eq, isNotNull } from "drizzle-orm";

import { flagWithMatches } from "./csv-import";
import type { ExistingMatch, ImportRow, MatchedRow } from "./csv-import";
import type { Reader } from "./reader";

/**
 * Tag each parsed row as new or probable duplicate against the account's stored
 * rows, pairing every probable duplicate with the stored transaction it
 * collided with (multiset semantics — see `flagWithMatches`). Preview shows the
 * match so the user can judge each collision; commit only reads the verdict.
 */
export function matchAgainstStored(
  db: Reader,
  accountId: number,
  rows: ImportRow[]
): MatchedRow[] {
  const stored = db
    .select({
      fingerprint: transactions.importFingerprint,
      date: transactions.date,
      amount: transactions.amount,
      label: transactions.payee,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        isNotNull(transactions.importFingerprint)
      )
    )
    .all();

  const byFingerprint = new Map<string, ExistingMatch[]>();
  for (const row of stored) {
    const match: ExistingMatch = {
      date: row.date,
      amount: row.amount,
      label: row.label ?? "",
    };
    const queue = byFingerprint.get(row.fingerprint!);
    if (queue) queue.push(match);
    else byFingerprint.set(row.fingerprint!, [match]);
  }
  return flagWithMatches(accountId, rows, byFingerprint);
}
