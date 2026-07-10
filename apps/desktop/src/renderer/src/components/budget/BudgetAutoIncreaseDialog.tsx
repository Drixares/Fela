import { Button } from '@repo/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@repo/ui/components/dialog'

import { formatEur } from '../../lib/money'
import { strings } from '../../lib/strings'

const t = strings.spending.budget.autoIncrease

interface BudgetAutoIncreaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The raised total (in cents) to announce, or `null` when nothing to show. */
  newTotal: number | null
}

/**
 * Announces that assigning a category line pushed the sum of lines above the
 * budget total, so the total was raised to match (keeping "everything else" at
 * 0 rather than negative). Purely informational — the raise has already been
 * applied server-side; this just tells the user the new figure.
 */
export function BudgetAutoIncreaseDialog({
  open,
  onOpenChange,
  newTotal
}: BudgetAutoIncreaseDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>
            {newTotal !== null ? t.description(formatEur(newTotal)) : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" />}>{t.confirm}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
