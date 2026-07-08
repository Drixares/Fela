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

import { type Category, type Rule, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.rules

const ruleFormSchema = z.object({
  pattern: z.string().trim().min(1, t.form.patternRequired).max(100),
  // A category id as a string (Select values are strings); mapped back to a
  // number on submit.
  category: z.string().min(1, t.form.categoryRequired)
})

type RuleFormValues = z.infer<typeof ruleFormSchema>

interface RuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The rule being edited, or `undefined` to create a new one. */
  rule?: Rule
  /** Categories offered as the rule's target. */
  categories: Category[]
}

/**
 * Create or edit a categorization rule (see issue #13). The same form serves
 * both: passing a `rule` switches it to edit mode and pre-fills the fields.
 * New rules are appended at the end of the application order; editing never
 * moves a rule (reordering lives on the panel).
 */
export function RuleFormDialog(props: RuleFormDialogProps): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <RuleForm {...props} onDone={() => props.onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function RuleForm({
  rule,
  categories,
  onDone
}: RuleFormDialogProps & { onDone: () => void }): React.JSX.Element {
  const isEdit = rule !== undefined
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      pattern: rule?.pattern ?? '',
      category: rule ? String(rule.categoryId) : ''
    }
  })

  const create = useMutation(orpc.rules.create.mutationOptions())
  const update = useMutation(orpc.rules.update.mutationOptions())
  const pending = create.isPending || update.isPending

  // value→label map so the category trigger shows a name, not an id.
  const categoryItems: Record<string, string> = Object.fromEntries(
    categories.map((category) => [String(category.id), category.name])
  )

  const onSubmit = async (values: RuleFormValues): Promise<void> => {
    const categoryId = Number(values.category)

    try {
      if (rule) {
        await update.mutateAsync({ id: rule.id, pattern: values.pattern, categoryId })
        toast.success(t.toast.updated)
      } else {
        await create.mutateAsync({ pattern: values.pattern, categoryId })
        toast.success(t.toast.created)
      }
      void queryClient.invalidateQueries({ queryKey: orpc.rules.key() })
      onDone()
    } catch {
      toast.error(t.toast.saveError)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <DialogHeader>
        <DialogTitle>{isEdit ? t.form.editTitle : t.form.createTitle}</DialogTitle>
        <DialogDescription>
          {isEdit ? t.form.editDescription : t.form.createDescription}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-pattern">{t.form.patternLabel}</Label>
          <Input
            id="rule-pattern"
            placeholder={t.form.patternPlaceholder}
            maxLength={100}
            autoFocus
            aria-invalid={errors.pattern !== undefined}
            {...register('pattern')}
          />
          {errors.pattern ? (
            <p className="text-xs text-destructive">{errors.pattern.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t.form.patternHint}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-category">{t.form.categoryLabel}</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select
                items={categoryItems}
                value={field.value || null}
                onValueChange={(value) => field.onChange(value ?? '')}
              >
                <SelectTrigger
                  id="rule-category"
                  className="w-full"
                  aria-invalid={errors.category !== undefined}
                  onBlur={field.onBlur}
                >
                  <SelectValue placeholder={t.form.categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
        </div>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t.form.cancel}
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {isEdit ? t.form.submitEdit : t.form.submitCreate}
        </Button>
      </DialogFooter>
    </form>
  )
}
