import { Button } from '@repo/ui/components/button'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { formatMonthKey, shiftMonthKey } from '../../lib/datetime'
import { strings } from '../../lib/strings'

const t = strings.spending.budget

interface BudgetMonthSelectorProps {
  month: string
  onChange: (month: string) => void
}

/** Prev / next month stepper heading the Budget tab, keyed by a `YYYY-MM` string. */
export function BudgetMonthSelector({
  month,
  onChange
}: BudgetMonthSelectorProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t.previousMonth}
        onClick={() => onChange(shiftMonthKey(month, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <span className="min-w-40 text-center text-sm font-medium capitalize">
        {formatMonthKey(month, 'long')}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t.nextMonth}
        onClick={() => onChange(shiftMonthKey(month, 1))}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
