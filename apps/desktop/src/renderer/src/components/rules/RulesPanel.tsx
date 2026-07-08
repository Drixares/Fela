import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { toast } from '@repo/ui/components/sonner'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  WandIcon
} from 'lucide-react'

import { type Category, type Rule, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'
import { DeleteRuleDialog } from './DeleteRuleDialog'
import { RuleFormDialog } from './RuleFormDialog'

const t = strings.rules

/** One rule row: « le libellé contient <pattern> → <catégorie> » plus its
 * reorder (application order — first match wins) and edit/delete actions. */
function RuleRow({
  rule,
  categoryName,
  isFirst,
  isLast,
  onMove,
  onEdit,
  onDelete
}: {
  rule: Rule
  categoryName: string | undefined
  isFirst: boolean
  isLast: boolean
  onMove: (rule: Rule, direction: -1 | 1) => void
  onEdit: (rule: Rule) => void
  onDelete: (rule: Rule) => void
}): React.JSX.Element {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="shrink-0 text-muted-foreground">{t.patternPrefix}</span>
        <span className="truncate font-medium">« {rule.pattern} »</span>
        <span className="shrink-0 text-muted-foreground">→</span>
        <Badge variant="secondary" className="shrink-0">
          {categoryName ?? t.deletedCategory}
        </Badge>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t.moveUp}
          disabled={isFirst}
          onClick={() => onMove(rule, -1)}
        >
          <ArrowUpIcon />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t.moveDown}
          disabled={isLast}
          onClick={() => onMove(rule, 1)}
        >
          <ArrowDownIcon />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label={t.edit} onClick={() => onEdit(rule)}>
          <PencilIcon />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label={t.delete} onClick={() => onDelete(rule)}>
          <Trash2Icon />
        </Button>
      </div>
    </li>
  )
}

/**
 * The categorization-rules screen (see issue #13): the rules in application
 * order — imports try them top to bottom and the first match wins — with the
 * actions to create, edit, delete and reorder them. Rules only classify
 * incoming rows at import time; nothing here rewrites the ledger.
 */
export function RulesPanel(): React.JSX.Element {
  const queryClient = useQueryClient()
  const { data: rules, isLoading } = useQuery(orpc.rules.list.queryOptions())
  const { data: categoriesOverview } = useQuery(orpc.categories.overview.queryOptions())

  const [form, setForm] = useState<{ rule?: Rule } | null>(null)
  const [deleting, setDeleting] = useState<Rule | undefined>()

  const reorder = useMutation(orpc.rules.reorder.mutationOptions())

  const categories: Category[] = [
    ...(categoriesOverview?.groups ?? []).flatMap((group) => group.categories),
    ...(categoriesOverview?.ungrouped ?? [])
  ]
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))

  /** Swap the rule with its neighbour and persist the whole new order — the
   * procedure wants every rule exactly once, so a stale screen is refused
   * rather than silently reshuffled. */
  function move(rule: Rule, direction: -1 | 1): void {
    if (!rules) return
    const index = rules.findIndex((r) => r.id === rule.id)
    const target = index + direction
    if (target < 0 || target >= rules.length) return

    const orderedIds = rules.map((r) => r.id)
    ;[orderedIds[index], orderedIds[target]] = [orderedIds[target]!, orderedIds[index]!]

    reorder.mutate(
      { orderedIds },
      {
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: orpc.rules.key() }),
        onError: () => toast.error(t.toast.reorderError)
      }
    )
  }

  const isEmpty = (rules ?? []).length === 0

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-sm font-medium tracking-wide uppercase">{t.title}</h2>
        {!isEmpty && (
          <Button size="sm" onClick={() => setForm({})} disabled={categories.length === 0}>
            <PlusIcon />
            {t.add}
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card className="gap-0 p-0">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </Card>
      ) : isEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WandIcon />
            </EmptyMedia>
            <EmptyTitle>{t.empty}</EmptyTitle>
            <EmptyDescription>
              {categories.length === 0 ? t.emptyNoCategories : t.emptyHint}
            </EmptyDescription>
          </EmptyHeader>
          {categories.length > 0 && (
            <EmptyContent>
              <Button onClick={() => setForm({})}>
                <PlusIcon />
                {t.add}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          <Card className="gap-0 p-0">
            <ul className="divide-y divide-border">
              {(rules ?? []).map((rule, index) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  categoryName={categoryNames.get(rule.categoryId)}
                  isFirst={index === 0}
                  isLast={index === (rules?.length ?? 0) - 1}
                  onMove={move}
                  onEdit={(r) => setForm({ rule: r })}
                  onDelete={setDeleting}
                />
              ))}
            </ul>
          </Card>
          {(rules?.length ?? 0) > 1 && (
            <p className="text-xs text-muted-foreground">{t.orderHint}</p>
          )}
        </div>
      )}

      <RuleFormDialog
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        rule={form?.rule}
        categories={categories}
      />
      <DeleteRuleDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        rule={deleting}
      />
    </section>
  )
}
