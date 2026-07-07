import { SelectGroup, SelectItem, SelectLabel } from '@repo/ui/components/select'

import type { CategoriesOverview } from '../../lib/orpc'

/** Sentinel select value for "not filed under any category" (values are strings). */
export const NO_CATEGORY = 'none'

/** The category tree flattened to its leaf categories, grouped ones first. */
export function flatCategories(
  overview: CategoriesOverview | undefined
): { id: number; name: string }[] {
  if (!overview) return []
  return [...overview.groups.flatMap((g) => g.categories), ...overview.ungrouped]
}

/**
 * The category tree as Select options — each non-empty group with its label,
 * then the ungrouped categories. Shared by every category picker (transaction
 * form, filters, bulk recategorization) so they all present the same tree.
 * Sentinel entries (« Sans catégorie », « Toutes les catégories »…) stay at the
 * call site: each picker has its own.
 */
export function CategorySelectOptions({
  categories
}: {
  categories?: CategoriesOverview
}): React.JSX.Element {
  const groups = categories?.groups ?? []
  const ungrouped = categories?.ungrouped ?? []
  return (
    <>
      {groups.map(
        (group) =>
          group.categories.length > 0 && (
            <SelectGroup key={group.id}>
              <SelectLabel>{group.name}</SelectLabel>
              {group.categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )
      )}
      {ungrouped.map((category) => (
        <SelectItem key={category.id} value={String(category.id)}>
          {category.name}
        </SelectItem>
      ))}
    </>
  )
}
