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

import { positiveEurCentsField } from '../../lib/money'
import { orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.spending.budget

/** A leaf expense category the picker can offer — id and display name only. */
export interface ExpenseCategoryOption {
  id: number
  name: string
}

/** The line being edited: which category and how much is already allocated. */
export interface EditingLine {
  categoryId: number
  categoryName: string
  amount: number
}

const lineFormSchema = z.object({
  // A category id as a string (Select values are strings); required in add mode.
  categoryId: z.string().min(1, t.lineForm.categoryRequired),
  amount: positiveEurCentsField({
    required: t.lineForm.amountRequired,
    invalid: t.lineForm.invalidAmount,
    positive: t.lineForm.positiveAmount
  })
})

type LineFormInput = z.input<typeof lineFormSchema>
type LineFormOutput = z.output<typeof lineFormSchema>

interface BudgetLineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  /** Expense categories the picker offers (in add mode, those without a line yet). */
  options: ExpenseCategoryOption[]
  /** Present in edit mode: the category is fixed, only its amount changes. */
  editing?: EditingLine
  /** The total the panel currently shows, to detect an auto-increase. */
  previousTotal: number
  /** Called with the raised total when `setLine` pushes the total above `previousTotal`. */
  onAutoIncrease: (newTotal: number) => void
}

/**
 * Add or edit one category line of a month's budget. In add mode the picker
 * lists leaf expense categories not yet budgeted; in edit mode the category is
 * shown read-only and only the amount changes. The dialog unmounts its inner
 * form on close (Base UI), so each open starts fresh from `defaultValues`.
 */
export function BudgetLineDialog({
  open,
  onOpenChange,
  month,
  options,
  editing,
  previousTotal,
  onAutoIncrease
}: BudgetLineDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <BudgetLineForm
          month={month}
          options={options}
          editing={editing}
          previousTotal={previousTotal}
          onAutoIncrease={onAutoIncrease}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function BudgetLineForm({
  month,
  options,
  editing,
  previousTotal,
  onAutoIncrease,
  onDone
}: {
  month: string
  options: ExpenseCategoryOption[]
  editing?: EditingLine
  previousTotal: number
  onAutoIncrease: (newTotal: number) => void
  onDone: () => void
}): React.JSX.Element {
  const isEdit = editing !== undefined
  const queryClient = useQueryClient()

  const {
    control,
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LineFormInput, unknown, LineFormOutput>({
    resolver: zodResolver(lineFormSchema),
    defaultValues: {
      categoryId: editing ? String(editing.categoryId) : '',
      amount: editing ? String(editing.amount / 100) : ''
    }
  })

  const setLine = useMutation(orpc.budgets.setLine.mutationOptions())

  // value→label map so the Select trigger shows names, not ids (Base UI).
  const categoryItems: Record<string, string> = Object.fromEntries(
    options.map((c) => [String(c.id), c.name])
  )
  const noOptions = !isEdit && options.length === 0

  const onSubmit = (values: LineFormOutput): void => {
    setLine.mutate(
      { month, categoryId: Number(values.categoryId), amount: values.amount },
      {
        onSuccess: (result) => {
          void queryClient.invalidateQueries({ queryKey: orpc.budgets.key() })
          toast.success(t.lineToast.saved)
          onDone()
          if (result.totalBudget > previousTotal) {
            onAutoIncrease(result.totalBudget)
          }
        },
        onError: (error) => {
          console.log(error)
          toast.error(t.lineToast.saveError)
        }
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <DialogHeader>
        <DialogTitle>{isEdit ? t.lineForm.editTitle : t.lineForm.addTitle}</DialogTitle>
        <DialogDescription>
          {isEdit ? t.lineForm.editDescription : t.lineForm.addDescription}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="line-category">{t.lineForm.categoryLabel}</Label>
          {isEdit ? (
            <Input id="line-category" type="text" value={editing.categoryName} disabled readOnly />
          ) : noOptions ? (
            <p className="text-sm text-muted-foreground">{t.lineForm.noCategories}</p>
          ) : (
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  items={categoryItems}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? '')}
                >
                  <SelectTrigger
                    id="line-category"
                    className="w-full"
                    aria-invalid={errors.categoryId !== undefined}
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder={t.lineForm.categoryPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
          {errors.categoryId && (
            <p className="text-xs text-destructive">{errors.categoryId.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="line-amount">{t.lineForm.amountLabel}</Label>
          <Input
            id="line-amount"
            type="text"
            inputMode="decimal"
            autoFocus={isEdit}
            placeholder={t.lineForm.amountPlaceholder}
            aria-invalid={errors.amount !== undefined}
            {...register('amount')}
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t.lineForm.cancel}
        </DialogClose>
        <Button type="submit" disabled={setLine.isPending || noOptions}>
          {isEdit ? t.lineForm.submitEdit : t.lineForm.submitAdd}
        </Button>
      </DialogFooter>
    </form>
  )
}
