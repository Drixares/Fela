import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import { Card } from '@repo/ui/components/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@repo/ui/components/empty'
import { Skeleton } from '@repo/ui/components/skeleton'
import { FolderPlusIcon, PencilIcon, PlusIcon, TagsIcon, Trash2Icon } from 'lucide-react'

import { type Category, type CategoryGroupWithCategories, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'
import { CategoryFormDialog } from './CategoryFormDialog'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'
import { DeleteGroupDialog } from './DeleteGroupDialog'
import { GroupFormDialog } from './GroupFormDialog'

const t = strings.categories

/** One leaf category row: its name, a kind badge, and edit/delete actions. */
function CategoryRow({
  category,
  onEdit,
  onDelete
}: {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}): React.JSX.Element {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate">{category.name}</span>
        <Badge variant={category.kind === 'income' ? 'default' : 'secondary'}>
          {t.kinds[category.kind]}
        </Badge>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="icon-sm" variant="ghost" aria-label={t.edit} onClick={() => onEdit(category)}>
          <PencilIcon />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t.delete}
          onClick={() => onDelete(category)}
        >
          <Trash2Icon />
        </Button>
      </div>
    </li>
  )
}

/**
 * The categories screen: the two-level tree — groups, each holding its leaf
 * categories, plus the categories that belong to no group — with the actions to
 * create, rename, move and delete both levels. Every mutation flows through the
 * `categories.*` procedures, which keep the ledger intact (moves preserve
 * history, deletes reassign or uncategorise rather than orphan).
 */
export function CategoriesPanel(): React.JSX.Element {
  const { data, isLoading } = useQuery(orpc.categories.overview.queryOptions())

  const [groupForm, setGroupForm] = useState<{ group?: CategoryGroupWithCategories } | null>(null)
  const [categoryForm, setCategoryForm] = useState<{
    category?: Category
    defaultGroupId?: number | null
  } | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<CategoryGroupWithCategories | undefined>()
  const [deletingCategory, setDeletingCategory] = useState<Category | undefined>()

  const groups = data?.groups ?? []
  const ungrouped = data?.ungrouped ?? []
  const allCategories = [...groups.flatMap((g) => g.categories), ...ungrouped]
  const isEmpty = groups.length === 0 && ungrouped.length === 0

  const editCategory = (category: Category): void => setCategoryForm({ category })

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-sm font-medium tracking-wide uppercase">{t.title}</h2>
        {!isEmpty && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setGroupForm({})}>
              <FolderPlusIcon />
              {t.addGroup}
            </Button>
            <Button size="sm" onClick={() => setCategoryForm({})}>
              <PlusIcon />
              {t.addCategory}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Card className="gap-0 p-0">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </Card>
      ) : isEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TagsIcon />
            </EmptyMedia>
            <EmptyTitle>{t.empty}</EmptyTitle>
            <EmptyDescription>{t.emptyHint}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setGroupForm({})}>
                <FolderPlusIcon />
                {t.addGroup}
              </Button>
              <Button onClick={() => setCategoryForm({})}>
                <PlusIcon />
                {t.addCategory}
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <Card key={group.id} className="gap-0 p-0">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                <span className="font-medium">{group.name}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.addCategory}
                    onClick={() => setCategoryForm({ defaultGroupId: group.id })}
                  >
                    <PlusIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.edit}
                    onClick={() => setGroupForm({ group })}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.delete}
                    onClick={() => setDeletingGroup(group)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
              {group.categories.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">{t.emptyHint}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {group.categories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      onEdit={editCategory}
                      onDelete={setDeletingCategory}
                    />
                  ))}
                </ul>
              )}
            </Card>
          ))}

          {ungrouped.length > 0 && (
            <Card className="gap-0 p-0">
              <div className="border-b border-border px-4 py-2.5">
                <span className="font-medium text-muted-foreground">{t.ungrouped}</span>
              </div>
              <ul className="divide-y divide-border">
                {ungrouped.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    onEdit={editCategory}
                    onDelete={setDeletingCategory}
                  />
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <GroupFormDialog
        open={groupForm !== null}
        onOpenChange={(open) => !open && setGroupForm(null)}
        group={groupForm?.group}
      />
      <CategoryFormDialog
        open={categoryForm !== null}
        onOpenChange={(open) => !open && setCategoryForm(null)}
        category={categoryForm?.category}
        defaultGroupId={categoryForm?.defaultGroupId}
        groups={groups}
      />
      <DeleteGroupDialog
        open={deletingGroup !== undefined}
        onOpenChange={(open) => !open && setDeletingGroup(undefined)}
        group={deletingGroup}
      />
      <DeleteCategoryDialog
        open={deletingCategory !== undefined}
        onOpenChange={(open) => !open && setDeletingCategory(undefined)}
        category={deletingCategory}
        allCategories={allCategories}
      />
    </section>
  )
}
