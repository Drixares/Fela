import { Button } from '@repo/ui/components/button'
import { Card } from '@repo/ui/components/card'
import { ChevronRightIcon, EyeOffIcon, SparklesIcon } from 'lucide-react'

import { LATEST_TRANSACTIONS } from './mock-data'

/** Carte « LATEST TRANSACTIONS » : 5 lignes de transactions mockées. */
export function LatestTransactionsCard(): React.JSX.Element {
  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Latest transactions
          <ChevronRightIcon className="size-3" />
        </span>
        <Button variant="outline" size="icon-sm" aria-label="AI insights">
          <SparklesIcon className="text-violet-500" />
        </Button>
      </div>

      <ul className="flex flex-col">
        {LATEST_TRANSACTIONS.map((tx) => {
          const Icon = tx.icon
          return (
            <li key={tx.name} className="flex items-center gap-3 py-2">
              <span
                className={
                  tx.tone === 'orange'
                    ? 'flex size-8 items-center justify-center rounded-md bg-orange-100 text-orange-600'
                    : 'flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground'
                }
              >
                <Icon className="size-4" />
              </span>
              <div className={tx.hidden ? 'flex-1 text-muted-foreground' : 'flex-1'}>
                <div className="text-sm font-medium">{tx.name}</div>
                <div className="text-xs text-muted-foreground">{tx.date}</div>
              </div>
              <div className="flex items-center gap-2">
                {tx.hidden && <EyeOffIcon className="size-4 text-muted-foreground" />}
                <span
                  className={tx.hidden ? 'text-sm text-muted-foreground' : 'text-sm font-medium'}
                >
                  {tx.amount}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
