import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'
import { ChartContainer, type ChartConfig } from '@repo/ui/components/chart'
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group'
import { ChevronRightIcon, EllipsisVerticalIcon, SparklesIcon } from 'lucide-react'
import { Area, AreaChart, CartesianGrid } from 'recharts'

import { NET_WORTH_SERIES } from './mock-data'
import { SectionLabel } from './SectionLabel'

const chartConfig = {
  value: { label: 'Net worth', color: 'var(--color-zinc-300)' }
} satisfies ChartConfig

const PERIODS = ['1W', '1M', '3M', 'YTD', 'ALL']

/** Carte net worth : montant, area chart gris, sélecteur de période, Add account. */
export function NetWorthCard(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <SectionLabel>Net worth</SectionLabel>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="More options">
            <EllipsisVerticalIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Ask AI"
            className="rounded-lg text-indigo-500"
          >
            <SparklesIcon />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-4xl font-semibold tracking-tight">$1,072</p>
            <p className="mt-1 text-sm text-muted-foreground">$0 (0%)</p>
          </div>
          <Button variant="outline" className="rounded-lg">
            Forecast
            <ChevronRightIcon />
          </Button>
        </div>
        <div className="relative">
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart data={NET_WORTH_SERIES} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <defs>
                <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={1.5}
                fill="url(#netWorthFill)"
              />
            </AreaChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="max-w-64 rounded-xl bg-card px-5 py-3 text-center text-sm text-muted-foreground shadow-lg ring-1 ring-foreground/5">
              Building wealth takes time. Your net worth graph takes a week to populate.
            </p>
          </div>
        </div>
        <ToggleGroup className="self-center">
          {PERIODS.map((period) => (
            <ToggleGroupItem key={period} value={period} className="px-4">
              {period}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="outline" size="lg" className="w-full rounded-full">
          Add account
        </Button>
      </CardContent>
    </Card>
  )
}
