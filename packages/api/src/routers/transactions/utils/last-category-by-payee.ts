import { categories, transactions } from "@repo/db";
import type { Db } from "@repo/db";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";

/** A category as the history suggestion offers it — id for a write, name for the screen. */
export interface PayeeSuggestion {
  id: number;
  name: string;
}

/**
 * The lookup key for a payee: lower-cased, trimmed, inner whitespace collapsed
 * — so « SNCF », « sncf » and «  SNCF  » all resolve to the same history. Bank
 * exports render the same merchant with cosmetic case/spacing differences, so
 * keying on the raw string would split one payee's history into several.
 */
export function payeeKey(payee: string): string {
  return payee.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Anything that can read rows — the top-level {@link Db} or a transaction handle. */
type Reader = Pick<Db, "select">;

/**
 * The last category each payee was filed under, keyed by {@link payeeKey} — the
 * heart of the history-based suggestion (issue #15): « pour un payee déjà
 * rencontré sans règle, propose la dernière catégorie utilisée ». No dedicated
 * table — this is a plain read over the ledger, shared by the import preview
 * and the transactions list so both propose the same category.
 *
 * Transfer legs (no category by design) and uncategorised rows are excluded by
 * the inner join and the `transfer_id IS NULL` filter, so a payee only ever
 * suggests a real, deliberate classification. Rows arrive most-recent-first, so
 * the first seen per key is the latest — exactly the category to propose.
 */
export function lastCategoryByPayee(db: Reader): Map<string, PayeeSuggestion> {
  const rows = db
    .select({
      payee: transactions.payee,
      categoryId: categories.id,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(isNull(transactions.transferId), isNotNull(transactions.payee)))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .all();

  const byPayee = new Map<string, PayeeSuggestion>();
  for (const row of rows) {
    if (row.payee === null) continue;
    const key = payeeKey(row.payee);
    if (!byPayee.has(key)) {
      byPayee.set(key, { id: row.categoryId, name: row.categoryName });
    }
  }
  return byPayee;
}

/**
 * The history suggestion for one incoming label: the last category used for its
 * payee, or `null` when a rule already claims the row (the history is offered
 * for « sans règle » rows only) or the payee has no history. Shared by the CSV
 * and OFX import previews so they can't drift on this precedence.
 */
export function suggestionFor(
  suggestions: Map<string, PayeeSuggestion>,
  label: string,
  ruleCategory: PayeeSuggestion | null
): PayeeSuggestion | null {
  return ruleCategory ? null : (suggestions.get(payeeKey(label)) ?? null);
}
