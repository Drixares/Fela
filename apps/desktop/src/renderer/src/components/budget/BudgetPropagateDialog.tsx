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
import { toast } from '@repo/ui/components/sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { formatMonthKey } from '../../lib/datetime'
import { orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.spending.budget.propagate

interface BudgetPropagateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The just-edited month whose budget would propagate forward. */
  month: string
}

/**
 * Offered after a month's budget is edited: propagate the change **forward** to
 * every later month that already has a budget. On « oui » it calls
 * `applyToFuture` and switches to a result view that explicitly names the
 * affected months; « non » keeps the change scoped to the edited month. The past
 * is never rewritten — that is enforced server-side.
 *
 * The body is a child of `DialogContent`, which Base UI unmounts on close, so
 * each open starts fresh (the "asked → answered" state resets on its own).
 */
export function BudgetPropagateDialog({
  open,
  onOpenChange,
  month
}: BudgetPropagateDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <PropagateBody month={month} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function PropagateBody({
  month,
  onDone
}: {
  month: string
  onDone: () => void
}): React.JSX.Element {
  const queryClient = useQueryClient()
  const applyToFuture = useMutation(orpc.budgets.applyToFuture.mutationOptions())
  // `null` while asking; a (possibly empty) list once the propagation ran.
  const [affected, setAffected] = useState<string[] | null>(null)

  const onConfirm = (): void => {
    applyToFuture.mutate(
      { month },
      {
        onSuccess: (result) => {
          void queryClient.invalidateQueries({ queryKey: orpc.budgets.key() })
          setAffected(result.affectedMonths)
        },
        onError: (error) => {
          console.log(error)
          toast.error(t.error)
        }
      }
    )
  }

  // Result view — name the months that were overwritten (or none).
  if (affected !== null) {
    const hasAny = affected.length > 0
    const names = affected.map((m) => formatMonthKey(m, 'long')).join(', ')
    return (
      <>
        <DialogHeader>
          <DialogTitle>{hasAny ? t.appliedTitle : t.noneTitle}</DialogTitle>
          <DialogDescription>{hasAny ? t.applied(names) : t.none}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={onDone}>
            {t.done}
          </Button>
        </DialogFooter>
      </>
    )
  }

  // Ask view — offer to propagate forward.
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.title}</DialogTitle>
        <DialogDescription>{t.description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t.cancel}</DialogClose>
        <Button type="button" onClick={onConfirm} disabled={applyToFuture.isPending}>
          {t.confirm}
        </Button>
      </DialogFooter>
    </>
  )
}
