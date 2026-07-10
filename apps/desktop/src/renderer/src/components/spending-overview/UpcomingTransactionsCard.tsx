import { Button } from '@repo/ui/components/button'
import { Card } from '@repo/ui/components/card'
import { ChevronRightIcon, SparklesIcon } from 'lucide-react'

import { UPCOMING_DAYS } from './mock-data'

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** Carte « UPCOMING TRANSACTIONS » : mini-calendrier avec empty state superposé. */
export function UpcomingTransactionsCard(): React.JSX.Element {
  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Upcoming transactions
          <ChevronRightIcon className="size-3" />
        </span>
        <Button variant="outline" size="icon-sm" aria-label="AI insights">
          <SparklesIcon className="text-violet-500" />
        </Button>
      </div>

      <div className="relative">
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-[10px] font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {UPCOMING_DAYS.map((cell, i) => (
            <div
              key={i}
              className={
                cell.highlighted
                  ? 'flex h-9 items-center justify-center rounded-full bg-muted text-sm font-medium'
                  : cell.muted
                    ? 'flex h-9 items-center justify-center text-sm text-muted-foreground/50'
                    : 'flex h-9 items-center justify-center text-sm text-muted-foreground'
              }
            >
              {cell.day}
            </div>
          ))}
        </div>

        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-lg border bg-background/95 p-3 text-center text-sm text-muted-foreground shadow-sm">
          Add your recurring bills and subscriptions to see what&apos;s coming up.
        </div>
      </div>
    </Card>
  )
}
