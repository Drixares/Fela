import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'
import { cn } from '@repo/ui/lib/utils'
import { ArrowLeftRightIcon, EyeOffIcon, ShoppingBagIcon, SparklesIcon } from 'lucide-react'

import { FEBRUARY_DAYS, RECENT_TRANSACTIONS, type RecentTransaction } from './mock-data'
import { SectionLabel } from './SectionLabel'

function TransactionIcon({ kind }: { kind: RecentTransaction['kind'] }): React.JSX.Element {
  if (kind === 'purchase') {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-orange-100 text-orange-600">
        <ShoppingBagIcon className="size-4" />
      </span>
    )
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <ArrowLeftRightIcon className="size-4" />
    </span>
  )
}

/** Carte dépenses : calendrier de février + transactions récentes. */
export function SpendingCard(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <SectionLabel>Spent in February</SectionLabel>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Ask AI"
          className="rounded-lg text-indigo-500"
        >
          <SparklesIcon />
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-[1fr_1.1fr] gap-8">
        <div>
          <p className="text-4xl font-semibold tracking-tight">$72</p>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {FEBRUARY_DAYS.map(({ day, amount }) => (
              <div
                key={day}
                className={cn(
                  'rounded-md border border-border/60 p-1.5 text-[11px] leading-tight',
                  amount > 0 && 'border-blue-500 bg-blue-500 text-white'
                )}
              >
                <p>{day}</p>
                <p className={cn('text-muted-foreground', amount > 0 && 'text-white')}>${amount}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          <SectionLabel withChevron={false}>Recent transactions</SectionLabel>
          <ul className="mt-2 flex flex-col divide-y divide-border/60">
            {RECENT_TRANSACTIONS.map((tx) => (
              <li key={tx.name} className="flex items-center gap-3 py-3">
                <TransactionIcon kind={tx.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{tx.name}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
                {tx.hidden ? <EyeOffIcon className="size-4 text-muted-foreground" /> : null}
                <p className="text-sm">{tx.amount}</p>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
