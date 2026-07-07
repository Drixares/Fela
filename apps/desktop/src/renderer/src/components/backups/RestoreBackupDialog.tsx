import { useMutation } from '@tanstack/react-query'
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

import { type BackupEntry } from '../../lib/backups'
import { formatDateTime } from '../../lib/datetime'
import { strings } from '../../lib/strings'

const t = strings.backups

interface RestoreBackupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The backup to restore; `undefined` while the dialog is closed. */
  backup?: BackupEntry
}

/**
 * Confirm restoring a backup. This is the one destructive action here: it
 * overwrites the live database with the snapshot and relaunches the app, so any
 * change made since that snapshot is lost. On success the app restarts (this
 * component never re-renders); only an error path returns control to us.
 */
export function RestoreBackupDialog({
  open,
  onOpenChange,
  backup
}: RestoreBackupDialogProps): React.JSX.Element {
  const restore = useMutation({
    mutationFn: (path: string) => window.api.backups.restore(path),
    onError: () => toast.error(t.toast.restoreError)
  })

  function handleConfirm(): void {
    if (!backup) return
    restore.mutate(backup.path)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.restoreDialog.title}</DialogTitle>
          <DialogDescription>
            {t.restoreDialog.description(backup ? formatDateTime(backup.createdAt) : '')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t.restoreDialog.cancel}
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={restore.isPending}
          >
            {t.restoreDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
