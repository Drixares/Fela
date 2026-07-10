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
import { Separator } from '@repo/ui/components/separator'
import { Skeleton } from '@repo/ui/components/skeleton'
import { toast } from '@repo/ui/components/sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilIcon, PlusIcon, Trash2Icon, WalletIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { currentMonthKey } from '../../lib/datetime'
import { formatEur } from '../../lib/money'
import { type Budget, type CategoriesOverview, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'
import { BudgetAutoIncreaseDialog } from './BudgetAutoIncreaseDialog'
import { BudgetFormDialog } from './BudgetFormDialog'
import { BudgetLineDialog, type EditingLine, type ExpenseCategoryOption } from './BudgetLineDialog'
import { BudgetMonthSelector } from './BudgetMonthSelector'

const t = strings.spending.budget

/**
 * Flatten a categories overview into leaf `expense` categories — the only kind
 * a budget line may target (income is a reference, transfers carry no category).
 * Every category is a leaf, so this is simply a kind filter across groups and
 * ungrouped, sorted by name for a stable picker order.
 */
function leafExpenseCategories(overview: CategoriesOverview | undefined): ExpenseCategoryOption[] {
  if (!overview) return []
  const all = [...overview.groups.flatMap((g) => g.categories), ...overview.ungrouped]
  return all
    .filter((c) => c.kind === 'expense')
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/**
 * Budget tab (issues #35, #36) — an Origin-style monthly envelope carved into
 * category lines. Opens on the current month; a month with no budget shows an
 * empty state, and once created the header shows income / total, the assigned
 * category lines, and the derived « Tout le reste » remainder that shrinks as
 * lines are added.
 */
export function BudgetPanel(): React.JSX.Element {
  const [month, setMonth] = useState(currentMonthKey())
  const [formOpen, setFormOpen] = useState(false)
  const [lineDialogOpen, setLineDialogOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<EditingLine | undefined>(undefined)
  const [autoIncreaseTotal, setAutoIncreaseTotal] = useState<number | null>(null)

  const { data, isLoading } = useQuery(orpc.budgets.get.queryOptions({ input: { month } }))
  const { data: categoriesData } = useQuery(orpc.categories.overview.queryOptions())
  const budget = data ?? undefined

  const expenseCategories = useMemo(() => leafExpenseCategories(categoriesData), [categoriesData])
  const nameById = useMemo(
    () => new Map(expenseCategories.map((c) => [c.id, c.name])),
    [expenseCategories]
  )

  // In add mode the picker only offers expense categories not yet budgeted.
  const budgetedIds = new Set((budget?.lines ?? []).map((l) => l.categoryId))
  const addOptions = expenseCategories.filter((c) => !budgetedIds.has(c.id))

  const openAdd = (): void => {
    setEditingLine(undefined)
    setLineDialogOpen(true)
  }
  const openEdit = (line: EditingLine): void => {
    setEditingLine(line)
    setLineDialogOpen(true)
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <BudgetMonthSelector month={month} onChange={setMonth} />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : budget ? (
        <BudgetContent
          budget={budget}
          nameById={nameById}
          canAdd={addOptions.length > 0}
          onEdit={() => setFormOpen(true)}
          onAddLine={openAdd}
          onEditLine={openEdit}
        />
      ) : (
        <BudgetEmptyState onCreate={() => setFormOpen(true)} />
      )}
      <BudgetFormDialog open={formOpen} onOpenChange={setFormOpen} month={month} budget={budget} />
      {budget && (
        <BudgetLineDialog
          open={lineDialogOpen}
          onOpenChange={setLineDialogOpen}
          month={month}
          options={addOptions}
          editing={editingLine}
          previousTotal={budget.totalBudget}
          onAutoIncrease={setAutoIncreaseTotal}
        />
      )}
      <BudgetAutoIncreaseDialog
        open={autoIncreaseTotal !== null}
        onOpenChange={(open) => {
          if (!open) setAutoIncreaseTotal(null)
        }}
        newTotal={autoIncreaseTotal}
      />
    </div>
  )
}

function BudgetContent({
  budget,
  nameById,
  canAdd,
  onEdit,
  onAddLine,
  onEditLine
}: {
  budget: Budget
  nameById: Map<number, string>
  canAdd: boolean
  onEdit: () => void
  onAddLine: () => void
  onEditLine: (line: EditingLine) => void
}): React.JSX.Element {
  const queryClient = useQueryClient()
  const removeLine = useMutation(orpc.budgets.removeLine.mutationOptions())

  const onRemove = (categoryId: number): void => {
    removeLine.mutate(
      { month: budget.month, categoryId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: orpc.budgets.key() })
          toast.success(t.lineToast.removed)
        },
        onError: (error) => {
          console.log(error)
          toast.error(t.lineToast.removeError)
        }
      }
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-10">
          <Stat label={t.incomeLabel} amount={budget.income} />
          <Stat label={t.totalBudgetLabel} amount={budget.totalBudget} />
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <PencilIcon />
          {t.edit}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase">{t.lines.sectionTitle}</span>
        <Button variant="outline" size="sm" onClick={onAddLine} disabled={!canAdd}>
          <PlusIcon />
          {t.lines.addCategory}
        </Button>
      </div>

      <Card className="gap-0 p-0">
        {budget.lines.map((line) => {
          const name = nameById.get(line.categoryId) ?? '—'
          return (
            <div
              key={line.categoryId}
              className="flex items-center justify-between gap-3 border-b px-4 py-2 last:border-b-0"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                />
                <span className="font-medium">{name}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="mr-1 font-medium tabular-nums">{formatEur(line.amount)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t.lines.editLabel(name)}
                  onClick={() =>
                    onEditLine({
                      categoryId: line.categoryId,
                      categoryName: name,
                      amount: line.amount
                    })
                  }
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t.lines.removeLabel(name)}
                  disabled={removeLine.isPending}
                  onClick={() => onRemove(line.categoryId)}
                >
                  <Trash2Icon />
                </Button>
              </span>
            </div>
          )
        })}

        {budget.lines.length > 0 && <Separator />}

        {/* The derived « Tout le reste » line — what remains of the total once
            the category lines are subtracted. Not directly editable. */}
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: 'var(--color-muted-foreground)' }}
            />
            <span className="font-medium">{t.everythingElse}</span>
          </span>
          <span className="font-medium tabular-nums">{formatEur(budget.everythingElse)}</span>
        </div>
      </Card>
    </div>
  )
}

function Stat({ label, amount }: { label: string; amount: number }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{formatEur(amount)}</span>
    </div>
  )
}

function BudgetEmptyState({ onCreate }: { onCreate: () => void }): React.JSX.Element {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WalletIcon />
        </EmptyMedia>
        <EmptyTitle>{t.emptyTitle}</EmptyTitle>
        <EmptyDescription>{t.emptyDescription}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreate}>
          <PlusIcon />
          {t.start}
        </Button>
      </EmptyContent>
    </Empty>
  )
}
