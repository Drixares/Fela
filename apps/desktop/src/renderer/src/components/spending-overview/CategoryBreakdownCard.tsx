import { Button } from '@repo/ui/components/button'
import { Card } from '@repo/ui/components/card'
import { ChartContainer } from '@repo/ui/components/chart'
import { SparklesIcon } from 'lucide-react'
import { Pie, PieChart } from 'recharts'

import { EXPENSE_CATEGORIES } from './mock-data'

const donutData = [{ name: 'Shopping', value: 100 }]

/** Carte « CATEGORY BREAKDOWN » : donut du mois + liste des catégories de dépenses. */
export function CategoryBreakdownCard(): React.JSX.Element {
  return (
    <Card className="gap-5 p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Category breakdown
        </span>
        <Button variant="outline" size="icon-sm" aria-label="AI insights">
          <SparklesIcon className="text-violet-500" />
        </Button>
      </div>

      <div className="flex items-center gap-6 border-b text-sm">
        <span className="-mb-px border-b-2 border-foreground pb-2 font-medium text-foreground">
          Expenses
        </span>
        <span className="pb-2 text-muted-foreground">Budget</span>
      </div>

      <div className="relative mx-auto aspect-square w-44">
        <ChartContainer config={{}} className="aspect-square w-full">
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              innerRadius={68}
              outerRadius={86}
              startAngle={90}
              endAngle={-270}
              cornerRadius={10}
              fill="#f97316"
              stroke="none"
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-semibold">$72</div>
          <div className="text-xs text-muted-foreground">Spent this month</div>
        </div>
      </div>

      <ul className="flex flex-col">
        {EXPENSE_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <li key={cat.name} className="flex items-center gap-3 py-2">
              <span
                className={`flex size-8 items-center justify-center rounded-full text-white ${cat.color}`}
              >
                <Icon className="size-4" />
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">{cat.name}</div>
                <div className="text-xs text-muted-foreground">{cat.percent}% of expenses</div>
              </div>
              <span className="text-sm font-medium">{cat.amount}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
