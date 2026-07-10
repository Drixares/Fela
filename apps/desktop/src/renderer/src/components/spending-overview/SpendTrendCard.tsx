import { Button } from '@repo/ui/components/button'
import { Card } from '@repo/ui/components/card'
import { type ChartConfig, ChartContainer } from '@repo/ui/components/chart'
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group'
import { CalendarIcon, ChevronDownIcon, LineChartIcon, SparklesIcon } from 'lucide-react'
import { Area, AreaChart, XAxis } from 'recharts'

import { SPEND_SERIES } from './mock-data'

const chartConfig = {
  february: { label: 'February', color: '#3b82f6' },
  january: { label: 'vs January', color: '#9ca3af' }
} satisfies ChartConfig

/** Grande carte « SPEND THIS MONTH » : montant, comparaison, et courbe février vs janvier. */
export function SpendTrendCard(): React.JSX.Element {
  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Spend this month
        </span>
        <div className="flex items-center gap-2">
          <ToggleGroup defaultValue={['line']} size="sm">
            <ToggleGroupItem value="line" aria-label="Line view">
              <LineChartIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Calendar view">
              <CalendarIcon />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="icon-sm" aria-label="AI insights">
            <SparklesIcon className="text-violet-500" />
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="text-4xl font-semibold">$72</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-blue-500" />
            February
          </div>
        </div>
        <Button variant="outline" className="rounded-full">
          vs January
          <ChevronDownIcon />
        </Button>
      </div>

      <ChartContainer config={chartConfig} className="aspect-[16/6] w-full">
        <AreaChart data={SPEND_SERIES} margin={{ left: 12, right: 12, top: 8 }}>
          <defs>
            <linearGradient id="fillFebruary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-february)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-february)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            ticks={[1, 8, 15, 22]}
            tickFormatter={(d) => String(d).padStart(2, '0')}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <Area
            dataKey="january"
            type="stepAfter"
            stroke="var(--color-january)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            fill="none"
            dot={false}
          />
          <Area
            dataKey="february"
            type="stepAfter"
            stroke="var(--color-february)"
            strokeWidth={2}
            fill="url(#fillFebruary)"
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </Card>
  )
}
