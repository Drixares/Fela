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

import { type Account, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.accounts

interface ArchiveAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The account to archive; `undefined` while the dialog is closed. */
  account?: Account
}

/**
 * Confirm before archiving an account. Archiving is reversible and never
 * touches transactions, but it removes the account from the current overview,
 * so we ask first rather than acting on a single click.
 */
export function ArchiveAccountDialog({
  open,
  onOpenChange,
  account
}: ArchiveAccountDialogProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const archive = useMutation(orpc.accounts.archive.mutationOptions())

  function handleConfirm(): void {
    if (!account) return

    archive.mutate(
      { id: account.id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: orpc.accounts.key() })
          toast.success(t.toast.archived(account.name))
          onOpenChange(false)
        },
        onError: () => toast.error(t.toast.archiveError)
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.archiveDialog.title}</DialogTitle>
          <DialogDescription>{t.archiveDialog.description(account?.name ?? '')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t.archiveDialog.cancel}
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={archive.isPending}
          >
            {t.archiveDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
