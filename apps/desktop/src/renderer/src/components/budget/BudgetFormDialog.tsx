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

import { formatMonthKey } from '../../lib/datetime'
import { centsToInput, positiveEurCentsField } from '../../lib/money'
import { type Budget, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.spending.budget

const budgetFormSchema = z.object({
  income: positiveEurCentsField({
    required: t.form.incomeRequired,
    invalid: t.form.invalidIncome,
    positive: t.form.positiveIncome
  }),
  totalBudget: positiveEurCentsField({
    required: t.form.totalBudgetRequired,
    invalid: t.form.invalidTotalBudget,
    positive: t.form.positiveTotalBudget
  })
})

type BudgetFormInput = z.input<typeof budgetFormSchema>
type BudgetFormOutput = z.output<typeof budgetFormSchema>

interface BudgetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  budget?: Budget
  /** Called after an existing budget is edited — the seam to offer propagation. */
  onEdited?: () => void
}

/**
 * Create or edit the budget for a month. The dialog unmounts its inner form on
 * close (Base UI), so each open starts fresh from `defaultValues` — no manual
 * reset. Presence of `budget` toggles edit mode and pre-fills the fields.
 */
export function BudgetFormDialog({
  open,
  onOpenChange,
  month,
  budget,
  onEdited
}: BudgetFormDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <BudgetForm
          month={month}
          budget={budget}
          onDone={() => onOpenChange(false)}
          onEdited={onEdited}
        />
      </DialogContent>
    </Dialog>
  )
}

function BudgetForm({
  month,
  budget,
  onDone,
  onEdited
}: {
  month: string
  budget?: Budget
  onDone: () => void
  onEdited?: () => void
}): React.JSX.Element {
  const isEdit = budget !== undefined
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<BudgetFormInput, unknown, BudgetFormOutput>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      income: budget ? centsToInput(budget.income) : '',
      totalBudget: budget ? centsToInput(budget.totalBudget) : ''
    }
  })

  const create = useMutation(orpc.budgets.create.mutationOptions())
  const update = useMutation(orpc.budgets.update.mutationOptions())
  const pending = create.isPending || update.isPending

  const onSubmit = (values: BudgetFormOutput): void => {
    const monthLabel = formatMonthKey(month, 'long')
    const onSuccess = (): void => {
      void queryClient.invalidateQueries({ queryKey: orpc.budgets.key() })
      toast.success(isEdit ? t.toast.updated(monthLabel) : t.toast.created(monthLabel))
      onDone()
    }
    if (isEdit) {
      update.mutate(
        { month, income: values.income, totalBudget: values.totalBudget },
        {
          onSuccess: () => {
            onSuccess()
            // Offer to carry this edit forward to later months.
            onEdited?.()
          },
          onError: (error) => {
            console.log(error)
            return toast.error(t.toast.updateError)
          }
        }
      )
    } else {
      create.mutate(
        { month, income: values.income, totalBudget: values.totalBudget },
        {
          onSuccess,
          onError: (error) => {
            console.log(error)
            return toast.error(t.toast.createError)
          }
        }
      )
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
          <Label htmlFor="budget-income">{t.form.incomeLabel}</Label>
          <Input
            id="budget-income"
            type="text"
            inputMode="decimal"
            autoFocus
            placeholder={t.form.incomePlaceholder}
            aria-invalid={errors.income !== undefined}
            {...register('income')}
          />
          {errors.income && <p className="text-xs text-destructive">{errors.income.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget-total">{t.form.totalBudgetLabel}</Label>
          <Input
            id="budget-total"
            type="text"
            inputMode="decimal"
            placeholder={t.form.totalBudgetPlaceholder}
            aria-invalid={errors.totalBudget !== undefined}
            {...register('totalBudget')}
          />
          {errors.totalBudget && (
            <p className="text-xs text-destructive">{errors.totalBudget.message}</p>
          )}
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
