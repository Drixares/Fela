import { Button } from '@repo/ui/components/button'
import { Card } from '@repo/ui/components/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@repo/ui/components/empty'
import { Skeleton } from '@repo/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeftIcon, ChevronRightIcon, PieChartIcon, TriangleAlertIcon } from 'lucide-react'
import { useCallback, useState } from 'react'

import { formatDate } from '../../lib/datetime'
import { formatEur } from '../../lib/money'
import type { Period } from '../../lib/period'
import {
  type ExpenseGroupSegment,
  type ExpensesByGroup,
  type TransactionList,
  orpc
} from '../../lib/orpc'
import { strings } from '../../lib/strings'
import { PeriodSelector } from './PeriodSelector'

const r = strings.reports

/** The emerald chart ramp (see globals.css); segments cycle through it. */
const SEGMENT_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)'
]

/** Which level of the group → category → transactions drill-down is on screen. */
type Drill =
  | { level: 'groups' }
  | { level: 'categories'; group: ExpenseGroupSegment }
  | { level: 'transactions'; categoryId: number | null; name: string; parent: Drill }

/** One row of a ranked breakdown: a labelled bar sized against the biggest slice. */
function BreakdownRow({
  name,
  total,
  share,
  fraction,
  color,
  muted,
  onClick
}: {
  name: string
  total: number
  share: number
  fraction: number
  color: string
  muted?: boolean
  onClick?: () => void
}): React.JSX.Element {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: color }}
          />
          <span className="truncate font-medium">{name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">{r.share(share)}</span>
          <span className="font-medium tabular-nums">{formatEur(-total)}</span>
          {onClick && <ChevronRightIcon className="size-4 text-muted-foreground" />}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(fraction * 100, 2)}%`, backgroundColor: color }}
        />
      </div>
    </>
  )

  const className = `w-full px-4 py-3 text-left ${muted ? 'bg-muted/30' : ''}`
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${className} transition-colors hover:bg-muted/50`}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}

/** The breakdown list plus, when the period has no spending, an empty state. */
function Breakdown({
  segments,
  total
}: {
  segments: { key: string; name: string; total: number; muted?: boolean; onClick?: () => void }[]
  total: number
}): React.JSX.Element {
  if (total === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PieChartIcon />
          </EmptyMedia>
          <EmptyTitle>{r.empty}</EmptyTitle>
          <EmptyDescription>{r.emptyHint}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const max = Math.max(...segments.map((s) => s.total))
  return (
    <Card className="gap-0 p-0">
      <div className="divide-y divide-border">
        {segments.map((segment, index) => (
          <BreakdownRow
            key={segment.key}
            name={segment.name}
            total={segment.total}
            share={total > 0 ? (segment.total / total) * 100 : 0}
            fraction={max > 0 ? segment.total / max : 0}
            color={
              segment.muted
                ? 'var(--color-muted-foreground)'
                : SEGMENT_COLORS[index % SEGMENT_COLORS.length]
            }
            muted={segment.muted}
            onClick={segment.onClick}
          />
        ))}
      </div>
    </Card>
  )
}

/**
 * « Où part mon argent ? » (see the V1 PRD #1, stories 35-40, and issue #14):
 * the expense breakdown by category group over the chosen period, drilling from
 * group to category to the transactions themselves. All aggregation runs in SQL
 * behind `reports.*`; transfers never count, and uncategorized spending shows as
 * a visible « Non classé » segment so an incomplete report is never mistaken for
 * a complete one. The renderer only picks the period and renders what comes back.
 */
export function ReportsPanel(): React.JSX.Element {
  const [period, setPeriod] = useState<Period | null>(null)
  const [drill, setDrill] = useState<Drill>({ level: 'groups' })

  const onPeriodChange = useCallback((next: Period) => {
    setPeriod(next)
    setDrill({ level: 'groups' })
  }, [])

  const bounds = period ?? { from: new Date(0), to: new Date(0) }

  const byGroup = useQuery(
    orpc.reports.byGroup.queryOptions({
      input: bounds,
      enabled: period !== null && drill.level === 'groups'
    })
  )
  const byCategory = useQuery(
    orpc.reports.byCategory.queryOptions({
      input: { ...bounds, groupId: drill.level === 'categories' ? drill.group.groupId : null },
      enabled: period !== null && drill.level === 'categories'
    })
  )
  const txList = useQuery(
    orpc.transactions.list.queryOptions({
      input: {
        from: bounds.from,
        to: bounds.to,
        categoryId: drill.level === 'transactions' ? drill.categoryId : undefined,
        // The report counts spending only, so the leaf list matches the segment
        // that led here — outflows, never a stray inflow filed in the category.
        direction: 'outflow'
      },
      enabled: period !== null && drill.level === 'transactions'
    })
  )

  function groupName(segment: ExpenseGroupSegment): string {
    return segment.name ?? r.ungrouped
  }

  const isLoading =
    (drill.level === 'groups' && byGroup.isLoading) ||
    (drill.level === 'categories' && byCategory.isLoading) ||
    (drill.level === 'transactions' && txList.isLoading)

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium tracking-wide uppercase">{r.title}</h2>
        <p className="text-sm text-muted-foreground">{r.subtitle}</p>
      </div>

      <PeriodSelector onChange={onPeriodChange} />

      {drill.level !== 'groups' && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setDrill(drill.level === 'transactions' ? drill.parent : { level: 'groups' })
            }
          >
            <ChevronLeftIcon />
            {r.back}
          </Button>
          <span className="text-sm font-medium">
            {drill.level === 'categories'
              ? r.drillGroup(groupName(drill.group))
              : r.drillCategory(drill.name)}
          </span>
        </div>
      )}

      {isLoading ? (
        <Card className="gap-0 p-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2 px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </Card>
      ) : drill.level === 'groups' ? (
        <GroupsView byGroup={byGroup.data} groupName={groupName} onDrill={setDrill} />
      ) : drill.level === 'categories' ? (
        <Breakdown
          total={byCategory.data?.total ?? 0}
          segments={(byCategory.data?.categories ?? []).map((cat) => ({
            key: `cat:${cat.categoryId}`,
            name: cat.name,
            total: cat.total,
            onClick: () =>
              setDrill({
                level: 'transactions',
                categoryId: cat.categoryId,
                name: cat.name,
                parent: drill
              })
          }))}
        />
      ) : (
        <TransactionsView data={txList.data} />
      )}
    </section>
  )
}

/** The top level: groups (biggest first) plus the « Non classé » segment. */
function GroupsView({
  byGroup,
  groupName,
  onDrill
}: {
  byGroup: ExpensesByGroup | undefined
  groupName: (segment: ExpenseGroupSegment) => string
  onDrill: (drill: Drill) => void
}): React.JSX.Element {
  const total = byGroup?.total ?? 0
  const groups = byGroup?.groups ?? []
  const uncategorized = byGroup?.uncategorized ?? 0

  const segments = [
    ...groups.map((segment) => ({
      key: `group:${segment.groupId ?? 'none'}`,
      name: groupName(segment),
      total: segment.total,
      onClick: () => onDrill({ level: 'categories', group: segment })
    })),
    ...(uncategorized > 0
      ? [
          {
            key: 'uncategorized',
            name: r.uncategorized,
            total: uncategorized,
            muted: true,
            onClick: () =>
              onDrill({
                level: 'transactions',
                categoryId: null,
                name: r.uncategorized,
                parent: { level: 'groups' }
              })
          }
        ]
      : [])
  ]

  return (
    <div className="flex flex-col gap-2">
      {total > 0 && (
        <p className="text-sm text-muted-foreground">
          {r.total}
          <span aria-hidden> · </span>
          <span className="font-medium tabular-nums text-foreground">{formatEur(-total)}</span>
        </p>
      )}
      <Breakdown segments={segments} total={total} />
      {uncategorized > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TriangleAlertIcon className="size-3.5 shrink-0" />
          {r.uncategorizedHint}
        </p>
      )}
    </div>
  )
}

/** The leaf: the transactions of the drilled-into category over the period. */
function TransactionsView({ data }: { data: TransactionList | undefined }): React.JSX.Element {
  const rows = data?.transactions ?? []

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PieChartIcon />
          </EmptyMedia>
          <EmptyTitle>{r.empty}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Card className="gap-0 p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-sm text-muted-foreground">
        <span>{r.txCount(data?.count ?? rows.length)}</span>
        <span className="font-medium tabular-nums text-foreground">
          {formatEur(data?.sum ?? 0)}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((tx) => (
          <li key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{tx.payee ?? r.noPayee}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(tx.date)}
                <span aria-hidden> · </span>
                {tx.accountName}
              </span>
            </div>
            <span className="shrink-0 font-medium tabular-nums">{formatEur(tx.amount)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
