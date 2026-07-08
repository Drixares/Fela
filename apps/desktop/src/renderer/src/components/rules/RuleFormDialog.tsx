import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@repo/ui/components/button'
import { Checkbox } from '@repo/ui/components/checkbox'
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { type Category, type Rule, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.rules

/**
 * The value only after it has stopped changing for `delayMs` — so the
 * matching-count query fires once the user pauses typing a pattern, not on
 * every keystroke.
 */
function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

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
  /** Pre-fill the pattern when creating — e.g. « SNCF » from a transaction's
   * payee (issue #15). Ignored in edit mode. */
  defaultPattern?: string
  /** Pre-select the target category when creating — e.g. the source
   * transaction's own category. Ignored in edit mode. */
  defaultCategoryId?: number
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
  defaultPattern,
  defaultCategoryId,
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
      pattern: rule?.pattern ?? defaultPattern ?? '',
      category: rule ? String(rule.categoryId) : defaultCategoryId ? String(defaultCategoryId) : ''
    }
  })

  const create = useMutation(orpc.rules.create.mutationOptions())
  const update = useMutation(orpc.rules.update.mutationOptions())
  const applyRetroactive = useMutation(orpc.rules.applyRetroactive.mutationOptions())

  // Retroactive application (issue #15) — offered on create only: how many rows
  // already in the ledger the current pattern + category would reclassify, and
  // whether the user has explicitly opted in to reclassify them.
  const [applyRetro, setApplyRetro] = useState(false)
  const watchedPattern = useWatch({ control, name: 'pattern' }) ?? ''
  const watchedCategory = useWatch({ control, name: 'category' }) ?? ''
  const debouncedPattern = useDebouncedValue(watchedPattern.trim())
  const targetCategoryId = watchedCategory ? Number(watchedCategory) : null
  const canCount = !isEdit && debouncedPattern.length > 0 && targetCategoryId !== null
  const { data: matching } = useQuery(
    orpc.rules.matchingCount.queryOptions({
      input: { pattern: debouncedPattern, categoryId: targetCategoryId ?? 0 },
      enabled: canCount
    })
  )
  const matchCount = canCount ? (matching?.count ?? 0) : 0

  const pending = create.isPending || update.isPending || applyRetroactive.isPending

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
        const created = await create.mutateAsync({ pattern: values.pattern, categoryId })
        toast.success(t.toast.created)
        // Retroactive clean-up happens strictly on explicit opt-in (issue #15):
        // a rule created without the checkbox never rewrites the ledger.
        if (applyRetro) {
          try {
            const result = await applyRetroactive.mutateAsync({ id: created.id })
            void queryClient.invalidateQueries({ queryKey: orpc.transactions.key() })
            toast.success(t.retroactive.toast.applied(result.updated))
          } catch {
            toast.error(t.retroactive.toast.error)
          }
        }
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

        {!isEdit && matchCount > 0 && (
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{t.retroactive.count(matchCount)}</p>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={applyRetro}
                onCheckedChange={(checked) => setApplyRetro(checked === true)}
              />
              {t.retroactive.apply}
            </label>
          </div>
        )}
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
