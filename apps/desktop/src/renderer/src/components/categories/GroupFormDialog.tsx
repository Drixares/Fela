import { zodResolver } from '@hookform/resolvers/zod'
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
import { Input } from '@repo/ui/components/input'
import { Label } from '@repo/ui/components/label'
import { toast } from '@repo/ui/components/sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { type CategoryGroupWithCategories, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.categories

const groupFormSchema = z.object({
  name: z.string().trim().min(1, t.groupForm.nameRequired).max(100)
})

type GroupFormValues = z.infer<typeof groupFormSchema>

interface GroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The group being edited, or `undefined` to create a new one. */
  group?: CategoryGroupWithCategories
}

/**
 * Create or rename a category group. The same form serves both: passing a
 * `group` switches it to edit mode. On success it invalidates the categories
 * overview so the panel refreshes.
 *
 * The stateful form lives in {@link GroupForm}, a child Base UI unmounts when
 * the dialog closes and remounts on the next open — so each open starts from the
 * group's own value with no stale state to reset.
 */
export function GroupFormDialog({
  open,
  onOpenChange,
  group
}: GroupFormDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <GroupForm group={group} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function GroupForm({
  group,
  onDone
}: {
  group?: CategoryGroupWithCategories
  onDone: () => void
}): React.JSX.Element {
  const isEdit = group !== undefined
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: group?.name ?? '' }
  })

  const create = useMutation(orpc.categories.createGroup.mutationOptions())
  const rename = useMutation(orpc.categories.renameGroup.mutationOptions())
  const pending = create.isPending || rename.isPending

  const onSubmit = (values: GroupFormValues): void => {
    const onSuccess = (saved: { name: string }): void => {
      void queryClient.invalidateQueries({ queryKey: orpc.categories.key() })
      toast.success(group ? t.toast.groupUpdated(saved.name) : t.toast.groupCreated(saved.name))
      onDone()
    }
    const onError = (): void => void toast.error(t.toast.groupError)

    if (group) {
      rename.mutate({ id: group.id, name: values.name }, { onSuccess, onError })
    } else {
      create.mutate({ name: values.name }, { onSuccess, onError })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <DialogHeader>
        <DialogTitle>{isEdit ? t.groupForm.editTitle : t.groupForm.createTitle}</DialogTitle>
        <DialogDescription>
          {isEdit ? t.groupForm.editDescription : t.groupForm.createDescription}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-name">{t.groupForm.nameLabel}</Label>
        <Input
          id="group-name"
          placeholder={t.groupForm.namePlaceholder}
          maxLength={100}
          autoFocus
          aria-invalid={errors.name !== undefined}
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t.groupForm.cancel}
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {isEdit ? t.groupForm.submitEdit : t.groupForm.submitCreate}
        </Button>
      </DialogFooter>
    </form>
  )
}
