import { categories, categorizationRules } from "@repo/db";
import type { Db } from "@repo/db";
import { asc, eq } from "drizzle-orm";

/**
 * Rule matching — the pure heart of the categorization engine (issue #13):
 * « si le libellé contient X → catégorie Y ». Shared by the rules screen's
 * procedures and by the import preview/commit, so what the preview announces
 * is exactly what the commit writes.
 */

/** One rule as the matcher consumes it, joined with its category's name so the import preview can display the classification. */
export interface ApplicableRule {
  pattern: string;
  categoryId: number;
  categoryName: string;
}

/**
 * Anything that can read rule rows — the top-level {@link Db} or the handle
 * inside `db.transaction(...)`, so commit can load rules within its own
 * transaction.
 */
type Reader = Pick<Db, "select">;

/**
 * Every rule in application order, ready for {@link categorize}. The join is
 * inner on purpose: a rule pointing at a vanished category (impossible while
 * `categories.delete` cleans up, but cheap to be safe against) classifies
 * nothing rather than classifying into nothing.
 */
export function loadApplicableRules(db: Reader): ApplicableRule[] {
  return db
    .select({
      pattern: categorizationRules.pattern,
      categoryId: categorizationRules.categoryId,
      categoryName: categories.name,
    })
    .from(categorizationRules)
    .innerJoin(categories, eq(categorizationRules.categoryId, categories.id))
    .orderBy(asc(categorizationRules.sortOrder), asc(categorizationRules.id))
    .all();
}

/**
 * The category the ordered rules assign to an incoming label, or `null` when
 * no rule matches. "Contains" is case-insensitive — bank labels shout in
 * inconsistent case — and the FIRST matching rule wins, so overlapping
 * patterns are resolved by the user's ordering.
 */
export function categorize(
  label: string,
  rules: ApplicableRule[]
): ApplicableRule | null {
  const haystack = label.toLowerCase();
  for (const rule of rules) {
    if (haystack.includes(rule.pattern.toLowerCase())) {
      return rule;
    }
  }
  return null;
}
