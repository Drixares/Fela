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

import { type CategoryGroupWithCategories, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.categories

interface DeleteGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The group to delete; `undefined` while the dialog is closed. */
  group?: CategoryGroupWithCategories
}

/**
 * Confirm deleting a group. Deleting a group is destructive to the grouping but
 * not to the data: its categories survive and become "sans groupe", and no
 * transaction is touched. We still ask first, because the group and its
 * arrangement disappear.
 */
export function DeleteGroupDialog({
  open,
  onOpenChange,
  group
}: DeleteGroupDialogProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const remove = useMutation(orpc.categories.deleteGroup.mutationOptions())

  function handleConfirm(): void {
    if (!group) return

    remove.mutate(
      { id: group.id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: orpc.categories.key() })
          toast.success(t.toast.groupDeleted(group.name))
          onOpenChange(false)
        },
        onError: () => toast.error(t.toast.groupDeleteError)
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.deleteGroupDialog.title}</DialogTitle>
          <DialogDescription>
            {t.deleteGroupDialog.description(group?.name ?? '')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t.deleteGroupDialog.cancel}
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={remove.isPending}
          >
            {t.deleteGroupDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
