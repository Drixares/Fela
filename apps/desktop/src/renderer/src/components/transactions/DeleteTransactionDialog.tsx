import { useMutation, useQueryClient } from '@tanstack/react-query'
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

import { formatEur } from '../../lib/money'
import { type Transaction, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.transactions

interface DeleteTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The transaction to delete; `undefined` while the dialog is closed. */
  transaction?: Transaction
}

/**
 * Confirm deleting a transaction. Removing an entry is destructive and changes
 * the account balance, so we ask first. On success both the transactions list
 * and the accounts list are invalidated, so the balance re-derives immediately.
 */
export function DeleteTransactionDialog({
  open,
  onOpenChange,
  transaction
}: DeleteTransactionDialogProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const remove = useMutation(orpc.transactions.delete.mutationOptions())

  function handleConfirm(): void {
    if (!transaction) return

    remove.mutate(
      { id: transaction.id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: orpc.transactions.key() })
          void queryClient.invalidateQueries({ queryKey: orpc.accounts.key() })
          toast.success(t.toast.deleted)
          onOpenChange(false)
        },
        onError: () => toast.error(t.toast.deleteError)
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.deleteDialog.title}</DialogTitle>
          <DialogDescription>
            {t.deleteDialog.description(
              transaction?.payee ?? t.noPayee,
              formatEur(transaction?.amount ?? 0)
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t.deleteDialog.cancel}
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={remove.isPending}
          >
            {t.deleteDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
