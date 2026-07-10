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
import { useQuery } from '@tanstack/react-query'
import { PencilIcon, PlusIcon, WalletIcon } from 'lucide-react'
import { useState } from 'react'

import { currentMonthKey } from '../../lib/datetime'
import { formatEur } from '../../lib/money'
import { type Budget, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'
import { BudgetFormDialog } from './BudgetFormDialog'
import { BudgetMonthSelector } from './BudgetMonthSelector'

const t = strings.spending.budget

/**
 * Budget tab (issue #35) — an Origin-style monthly envelope. Opens on the
 * current month; a month with no budget shows an empty state with a « Commencer
 * à budgéter » CTA, and once created the header shows income / total plus the
 * derived « Tout le reste » line.
 */
export function BudgetPanel(): React.JSX.Element {
  const [month, setMonth] = useState(currentMonthKey())
  const [formOpen, setFormOpen] = useState(false)
  const { data, isLoading } = useQuery(orpc.budgets.get.queryOptions({ input: { month } }))
  const budget = data ?? undefined

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <BudgetMonthSelector month={month} onChange={setMonth} />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : budget ? (
        <BudgetContent budget={budget} onEdit={() => setFormOpen(true)} />
      ) : (
        <BudgetEmptyState onCreate={() => setFormOpen(true)} />
      )}
      <BudgetFormDialog open={formOpen} onOpenChange={setFormOpen} month={month} budget={budget} />
    </div>
  )
}

function BudgetContent({
  budget,
  onEdit
}: {
  budget: Budget
  onEdit: () => void
}): React.JSX.Element {
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

      {/* The derived « Tout le reste » line — rendered like a category row but
          not directly editable. Equals the whole total until category lines exist. */}
      <Card className="gap-0 p-0">
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
