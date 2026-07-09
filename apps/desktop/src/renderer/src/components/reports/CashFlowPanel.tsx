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
import { FileUpIcon, TrendingUpDownIcon, TriangleAlertIcon } from 'lucide-react'
import { useCallback, useState } from 'react'

import { formatMonthKey } from '../../lib/datetime'
import { formatEur } from '../../lib/money'
import { SECTIONS, useNavigateToSection } from '../../lib/navigation'
import { type CashFlowMonthSegment, type MonthlyCashFlow, orpc } from '../../lib/orpc'
import type { Period } from '../../lib/period'
import { strings } from '../../lib/strings'
import { PeriodSelector } from './PeriodSelector'

const c = strings.cashFlow

const INCOME_COLOR = 'var(--color-chart-2)'
const EXPENSE_COLOR = 'var(--color-destructive)'

/** A labelled colour swatch for the chart legend. */
function LegendDot({ color, label }: { color: string; label: string }): React.JSX.Element {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

/** One of the three period totals shown above the chart. */
function Stat({
  label,
  value,
  color
}: {
  label: string
  value: string
  color?: string
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  )
}

/**
 * The diverging monthly bars: income grows up from the centre axis, expenses
 * grow down, both scaled against the single biggest bar so the months stay
 * comparable. Each column carries a native tooltip with the exact figures, and
 * the month labels sit under the axis.
 */
function CashFlowChart({ months }: { months: CashFlowMonthSegment[] }): React.JSX.Element {
  // Scale to the tallest single bar across every month; guard the all-zero case.
  const max = Math.max(1, ...months.map((m) => Math.max(m.income, m.expenses)))

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
        <LegendDot color={INCOME_COLOR} label={c.income} />
        <LegendDot color={EXPENSE_COLOR} label={c.expenses} />
      </div>

      <div className="flex h-48 items-stretch gap-1">
        {months.map((m) => (
          <div
            key={m.month}
            className="flex flex-1 flex-col"
            title={`${formatMonthKey(m.month, 'long')} — ${c.income} ${formatEur(
              m.income
            )}, ${c.expenses} ${formatEur(m.expenses)}, ${c.netLabel} ${formatEur(m.net)}`}
          >
            <div className="flex flex-1 items-end justify-center">
              <div
                className="w-2/3 min-w-1.5 rounded-t-sm"
                style={{ height: `${(m.income / max) * 100}%`, backgroundColor: INCOME_COLOR }}
              />
            </div>
            <div className="border-t border-border" />
            <div className="flex flex-1 items-start justify-center">
              <div
                className="w-2/3 min-w-1.5 rounded-b-sm"
                style={{ height: `${(m.expenses / max) * 100}%`, backgroundColor: EXPENSE_COLOR }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        {months.map((m) => (
          <span
            key={m.month}
            className="flex-1 truncate text-center text-[10px] text-muted-foreground"
          >
            {formatMonthKey(m.month)}
          </span>
        ))}
      </div>
    </Card>
  )
}

/**
 * « Est-ce que je vis au-dessus de mes moyens ? » (see the V1 PRD #1, story 36,
 * and issue #16): the monthly cash flow — income vs expenses — over the chosen
 * period, defaulting to the last 12 months. All aggregation runs in SQL behind
 * `reports.cashFlow`, split by category kind and with internal transfers never
 * counted; the renderer only picks the period and plots what comes back.
 */
export function CashFlowPanel(): React.JSX.Element {
  const [period, setPeriod] = useState<Period | null>(null)
  const onPeriodChange = useCallback((next: Period) => setPeriod(next), [])

  const bounds = period ?? { from: new Date(0), to: new Date(0) }
  const cashFlow = useQuery(
    orpc.reports.cashFlow.queryOptions({ input: bounds, enabled: period !== null })
  )

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium tracking-wide uppercase">{c.title}</h2>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      <PeriodSelector onChange={onPeriodChange} defaultPreset="last12" />

      {cashFlow.isLoading ? (
        <Card className="gap-3 p-4">
          <Skeleton className="h-4 w-40 self-end" />
          <Skeleton className="h-48 w-full" />
        </Card>
      ) : (
        <CashFlowReport data={cashFlow.data} />
      )}
    </section>
  )
}

/** The totals and chart, or the empty state when nothing was categorized. */
function CashFlowReport({ data }: { data: MonthlyCashFlow | undefined }): React.JSX.Element {
  const navigateToSection = useNavigateToSection()
  const months = data?.months ?? []
  const income = data?.income ?? 0
  const expenses = data?.expenses ?? 0
  const net = data?.net ?? 0
  const uncategorizedCount = data?.uncategorizedCount ?? 0

  if (income === 0 && expenses === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrendingUpDownIcon />
          </EmptyMedia>
          <EmptyTitle>{c.empty}</EmptyTitle>
          <EmptyDescription>{c.emptyHint}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={() => navigateToSection(SECTIONS.transactions)}>
            <FileUpIcon />
            {c.emptyAction}
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const netColor = net >= 0 ? INCOME_COLOR : EXPENSE_COLOR
  const netLabel = `${net >= 0 ? c.surplus : c.deficit} · ${formatEur(net)}`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex gap-6">
          <Stat label={c.income} value={formatEur(income)} color={INCOME_COLOR} />
          <Stat label={c.expenses} value={formatEur(expenses)} color={EXPENSE_COLOR} />
        </div>
        <Stat label={c.netLabel} value={netLabel} color={netColor} />
      </div>

      <CashFlowChart months={months} />

      {uncategorizedCount > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TriangleAlertIcon className="size-3.5 shrink-0" />
          {c.incompleteHint(uncategorizedCount)}
        </p>
      )}
    </div>
  )
}
