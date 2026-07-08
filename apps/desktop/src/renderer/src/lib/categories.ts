import type { CategoriesOverview, Category } from './orpc'

/**
 * Every category as one flat list, in the overview's display order (grouped
 * ones first, then the ungrouped) — for pickers that don't care about groups,
 * like the rule form's target select and the import preview's per-row
 * correction select (see issue #13).
 */
export function flattenCategories(overview: CategoriesOverview | undefined): Category[] {
  return [
    ...(overview?.groups ?? []).flatMap((group) => group.categories),
    ...(overview?.ungrouped ?? [])
  ]
}
