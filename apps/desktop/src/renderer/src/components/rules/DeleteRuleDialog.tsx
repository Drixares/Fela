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

import { type Rule, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.rules

interface DeleteRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The rule to delete; `undefined` while the dialog is closed. */
  rule?: Rule
}

/**
 * Confirm deleting a rule. Deleting a rule only affects future imports — the
 * transactions it already classified keep their category — but the rule
 * itself is gone, so we still ask first.
 */
export function DeleteRuleDialog({
  open,
  onOpenChange,
  rule
}: DeleteRuleDialogProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const remove = useMutation(orpc.rules.delete.mutationOptions())

  function handleConfirm(): void {
    if (!rule) return

    remove.mutate(
      { id: rule.id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: orpc.rules.key() })
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
          <DialogDescription>{t.deleteDialog.description(rule?.pattern ?? '')}</DialogDescription>
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
