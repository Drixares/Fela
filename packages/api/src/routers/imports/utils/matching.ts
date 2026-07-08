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
 * Whether a rule's `pattern` matches a `label` — a case-insensitive substring
 * test. Named once so import classification (below) and retroactive
 * application (issue #15) can never drift on what « le libellé contient X »
 * means.
 */
export function patternMatches(label: string, pattern: string): boolean {
  return label.toLowerCase().includes(pattern.toLowerCase());
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
  for (const rule of rules) {
    if (patternMatches(label, rule.pattern)) {
      return rule;
    }
  }
  return null;
}

/**
 * What the preview announces for one incoming label: the category the rules
 * will file it under — id for the commit, name for the screen — or `null`
 * when no rule matches. Both import previews (CSV and OFX) return this exact
 * shape so their commits and renderers can't drift apart.
 */
export function announcedCategory(
  label: string,
  rules: ApplicableRule[]
): { id: number; name: string } | null {
  const match = categorize(label, rules);
  return match ? { id: match.categoryId, name: match.categoryName } : null;
}

/**
 * The category a committed row actually lands under: the user's preview
 * correction when one was sent for this row's key, else the ordered rules'
 * verdict. Naming the precedence once keeps the CSV and OFX commits agreeing
 * on it. A correction of `null` deliberately un-classifies a row a rule
 * matched.
 */
export function effectiveCategoryId<K>(
  overrides: Map<K, number | null>,
  key: K,
  label: string,
  rules: ApplicableRule[]
): number | null {
  return overrides.has(key)
    ? (overrides.get(key) ?? null)
    : (categorize(label, rules)?.categoryId ?? null);
}
