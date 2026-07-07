import { zodResolver } from '@hookform/resolvers/zod'
import { CATEGORY_KINDS, type CategoryKind } from '@repo/api/client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@repo/ui/components/select'
import { toast } from '@repo/ui/components/sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { type Category, type CategoryGroupWithCategories, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.categories

/** Sentinel select value for "belongs to no group" (Select values are strings). */
const NO_GROUP = 'none'

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, t.categoryForm.nameRequired).max(100),
  kind: z.enum(CATEGORY_KINDS, { error: t.categoryForm.kindRequired }),
  // A group id as a string, or NO_GROUP; mapped back to number | null on submit.
  group: z.string()
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The category being edited, or `undefined` to create a new one. */
  category?: Category
  /** Groups offered in the group picker. */
  groups: CategoryGroupWithCategories[]
  /** Pre-selected group when creating from a group's "add" button. */
  defaultGroupId?: number | null
}

/**
 * Create or edit a category. The same form serves both: passing a `category`
 * switches it to edit mode and pre-fills the fields, including its group.
 *
 * On edit the name/kind change and the group change are two distinct backend
 * operations (`update` and `move`), so this only fires `move` when the group
 * actually changed — a rename never disturbs the category's placement, and a
 * move never loses its transactions.
 */
export function CategoryFormDialog(props: CategoryFormDialogProps): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <CategoryForm {...props} onDone={() => props.onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({
  category,
  groups,
  defaultGroupId,
  onDone
}: CategoryFormDialogProps & { onDone: () => void }): React.JSX.Element {
  const isEdit = category !== undefined
  const queryClient = useQueryClient()

  const initialGroupId = category ? category.groupId : (defaultGroupId ?? null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? '',
      kind: category?.kind as CategoryKind | undefined,
      group: initialGroupId === null ? NO_GROUP : String(initialGroupId)
    }
  })

  const create = useMutation(orpc.categories.create.mutationOptions())
  const update = useMutation(orpc.categories.update.mutationOptions())
  const move = useMutation(orpc.categories.move.mutationOptions())
  const pending = create.isPending || update.isPending || move.isPending

  // value→label map so the group trigger shows a name, not an id.
  const groupItems: Record<string, string> = {
    [NO_GROUP]: t.categoryForm.noGroup,
    ...Object.fromEntries(groups.map((g) => [String(g.id), g.name]))
  }

  const onSubmit = async (values: CategoryFormValues): Promise<void> => {
    const groupId = values.group === NO_GROUP ? null : Number(values.group)

    try {
      if (category) {
        const saved = await update.mutateAsync({
          id: category.id,
          name: values.name,
          kind: values.kind
        })
        if (groupId !== category.groupId) {
          await move.mutateAsync({ id: category.id, groupId })
        }
        void queryClient.invalidateQueries({ queryKey: orpc.categories.key() })
        toast.success(t.toast.categoryUpdated(saved.name))
      } else {
        const saved = await create.mutateAsync({ name: values.name, kind: values.kind, groupId })
        void queryClient.invalidateQueries({ queryKey: orpc.categories.key() })
        toast.success(t.toast.categoryCreated(saved.name))
      }
      onDone()
    } catch {
      toast.error(t.toast.categoryError)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <DialogHeader>
        <DialogTitle>{isEdit ? t.categoryForm.editTitle : t.categoryForm.createTitle}</DialogTitle>
        <DialogDescription>
          {isEdit ? t.categoryForm.editDescription : t.categoryForm.createDescription}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-name">{t.categoryForm.nameLabel}</Label>
          <Input
            id="category-name"
            placeholder={t.categoryForm.namePlaceholder}
            maxLength={100}
            autoFocus
            aria-invalid={errors.name !== undefined}
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-kind">{t.categoryForm.kindLabel}</Label>
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <Select
                items={t.kinds}
                value={field.value ?? null}
                onValueChange={(value) => field.onChange(value)}
              >
                <SelectTrigger
                  id="category-kind"
                  className="w-full"
                  aria-invalid={errors.kind !== undefined}
                  onBlur={field.onBlur}
                >
                  <SelectValue placeholder={t.categoryForm.kindPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KINDS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t.kinds[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.kind && <p className="text-xs text-destructive">{errors.kind.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-group">{t.categoryForm.groupLabel}</Label>
          <Controller
            control={control}
            name="group"
            render={({ field }) => (
              <Select
                items={groupItems}
                value={field.value}
                onValueChange={(value) => field.onChange(value)}
              >
                <SelectTrigger id="category-group" className="w-full" onBlur={field.onBlur}>
                  <SelectValue placeholder={t.categoryForm.groupPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>{t.categoryForm.noGroup}</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t.categoryForm.cancel}
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {isEdit ? t.categoryForm.submitEdit : t.categoryForm.submitCreate}
        </Button>
      </DialogFooter>
    </form>
  )
}
