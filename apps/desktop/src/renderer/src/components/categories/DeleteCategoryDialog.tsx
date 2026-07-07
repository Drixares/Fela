import { useState } from 'react'
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
import { Label } from '@repo/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@repo/ui/components/select'
import { toast } from '@repo/ui/components/sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { type Category, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.categories

/** Select value meaning "don't reassign — leave the transactions uncategorised". */
const KEEP_UNCATEGORIZED = 'none'

interface DeleteCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The category to delete; `undefined` while the dialog is closed. */
  category?: Category
  /** Every category, used to offer reassignment targets of the same kind. */
  allCategories: Category[]
}

/**
 * Confirm deleting a category. Deleting a category would orphan the transactions
 * filed under it, so we ask first where they should go: either reassign them to
 * another category of the same kind, or knowingly leave them uncategorised.
 * Either way the ledger keeps every transaction — reports are never silently
 * corrupted.
 *
 * The reassignment state lives in {@link DeleteCategoryForm}, a child Base UI
 * remounts on each open so the target picker never carries over a stale choice.
 */
export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  allCategories
}: DeleteCategoryDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        {category && (
          <DeleteCategoryForm
            category={category}
            allCategories={allCategories}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DeleteCategoryForm({
  category,
  allCategories,
  onDone
}: {
  category: Category
  allCategories: Category[]
  onDone: () => void
}): React.JSX.Element {
  const queryClient = useQueryClient()
  const remove = useMutation(orpc.categories.delete.mutationOptions())

  // Only same-kind categories make sense as a destination — reclassing an
  // expense under an income category (or vice versa) would corrupt reports;
  // never the one being deleted.
  const candidates = allCategories.filter((c) => c.id !== category.id && c.kind === category.kind)

  // Default to proposing a reassignment (the spec's intent) when one is
  // possible; fall back to "leave uncategorised" only when nothing else exists.
  const [target, setTarget] = useState<string>(
    candidates[0] ? String(candidates[0].id) : KEEP_UNCATEGORIZED
  )

  const targetItems: Record<string, string> = {
    [KEEP_UNCATEGORIZED]: t.deleteCategoryDialog.keepUncategorized,
    ...Object.fromEntries(candidates.map((c) => [String(c.id), c.name]))
  }

  function handleConfirm(): void {
    remove.mutate(
      {
        id: category.id,
        reassignToId: target === KEEP_UNCATEGORIZED ? undefined : Number(target)
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: orpc.categories.key() })
          toast.success(t.toast.categoryDeleted(category.name))
          onDone()
        },
        onError: () => toast.error(t.toast.categoryDeleteError)
      }
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.deleteCategoryDialog.title}</DialogTitle>
        <DialogDescription>{t.deleteCategoryDialog.description(category.name)}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reassign-target">{t.deleteCategoryDialog.reassignLabel}</Label>
        <Select
          items={targetItems}
          value={target}
          onValueChange={(value) => setTarget(value ?? KEEP_UNCATEGORIZED)}
        >
          <SelectTrigger id="reassign-target" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={KEEP_UNCATEGORIZED}>
              {t.deleteCategoryDialog.keepUncategorized}
            </SelectItem>
            {candidates.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t.deleteCategoryDialog.cancel}
        </DialogClose>
        <Button
          type="button"
          variant="destructive"
          onClick={handleConfirm}
          disabled={remove.isPending}
        >
          {t.deleteCategoryDialog.confirm}
        </Button>
      </DialogFooter>
    </>
  )
}
