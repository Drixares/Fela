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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@repo/ui/components/select'
import { toast } from '@repo/ui/components/sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { fromDateInputValue, toDateInputValue } from '../../lib/datetime'
import { centsToInput, positiveEurCentsField } from '../../lib/money'
import { type Account, type CategoriesOverview, type Transaction, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.transactions

/** Sentinel select value for "not filed under any category" (values are strings). */
const NO_CATEGORY = 'none'

type Direction = 'expense' | 'income'

/**
 * The form's validation contract. The user types a *positive* amount in euros
 * and picks a direction; the schema parses the euros to integer cents, and the
 * submit handler applies the sign — so the signed `amount` the API stores is
 * derived in one place. `account` and `category` are ids carried as strings
 * because Select values are strings.
 */
const transactionFormSchema = z.object({
  account: z.string().min(1, t.form.accountRequired),
  direction: z.enum(['expense', 'income']),
  amount: positiveEurCentsField({
    required: t.form.amountRequired,
    invalid: t.form.amountInvalid,
    positive: t.form.amountPositive
  }),
  date: z.string().min(1, t.form.dateRequired),
  payee: z.string(),
  category: z.string(),
  note: z.string()
})

type TransactionFormInput = z.input<typeof transactionFormSchema>
type TransactionFormOutput = z.output<typeof transactionFormSchema>

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The transaction being edited, or `undefined` to create a new one. */
  transaction?: Transaction
  /** Accounts offered in the account picker (the live, non-archived ones). */
  accounts: Account[]
  /** The category tree offered in the category picker. */
  categories?: CategoriesOverview
  /** Pre-selected account when creating (e.g. the account the list is filtered to). */
  defaultAccountId?: number
}

/**
 * Create or edit a manual transaction. The same form serves both: passing a
 * `transaction` switches it to edit mode and pre-fills every field. On success
 * it invalidates the transactions list and the accounts list, so the ledger and
 * the derived balances both refresh.
 *
 * The stateful form lives in {@link TransactionForm}, a child Base UI unmounts
 * when the dialog closes and remounts on the next open — so each open starts
 * from the transaction's own values with no stale state to reset.
 */
export function TransactionFormDialog(props: TransactionFormDialogProps): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <TransactionForm {...props} onDone={() => props.onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function TransactionForm({
  transaction,
  accounts,
  categories,
  defaultAccountId,
  onDone
}: TransactionFormDialogProps & { onDone: () => void }): React.JSX.Element {
  const isEdit = transaction !== undefined
  const queryClient = useQueryClient()

  const initialAccountId = transaction?.accountId ?? defaultAccountId ?? accounts[0]?.id

  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<TransactionFormInput, unknown, TransactionFormOutput>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      account: initialAccountId ? String(initialAccountId) : '',
      direction: transaction && transaction.amount > 0 ? 'income' : 'expense',
      amount: transaction ? centsToInput(Math.abs(transaction.amount)) : '',
      date: toDateInputValue(transaction ? transaction.date : new Date()),
      payee: transaction?.payee ?? '',
      category: transaction?.categoryId != null ? String(transaction.categoryId) : NO_CATEGORY,
      note: transaction?.note ?? ''
    }
  })

  const create = useMutation(orpc.transactions.create.mutationOptions())
  const update = useMutation(orpc.transactions.update.mutationOptions())
  const pending = create.isPending || update.isPending

  const groups = categories?.groups ?? []
  const ungrouped = categories?.ungrouped ?? []

  // value→label maps so the triggers show names, not ids.
  const accountItems: Record<string, string> = Object.fromEntries(
    accounts.map((a) => [String(a.id), a.name])
  )
  const categoryItems: Record<string, string> = {
    [NO_CATEGORY]: t.form.noCategory,
    ...Object.fromEntries(
      [...groups.flatMap((g) => g.categories), ...ungrouped].map((c) => [String(c.id), c.name])
    )
  }

  const onSubmit = (values: TransactionFormOutput): void => {
    const signedAmount = values.direction === 'expense' ? -values.amount : values.amount
    const payload = {
      accountId: Number(values.account),
      amount: signedAmount,
      date: fromDateInputValue(values.date),
      payee: values.payee.trim() || null,
      categoryId: values.category === NO_CATEGORY ? null : Number(values.category),
      note: values.note.trim() || null
    }

    const onSuccess = (): void => {
      void queryClient.invalidateQueries({ queryKey: orpc.transactions.key() })
      void queryClient.invalidateQueries({ queryKey: orpc.accounts.key() })
      toast.success(isEdit ? t.toast.updated : t.toast.created)
      onDone()
    }

    if (transaction) {
      update.mutate(
        { id: transaction.id, ...payload },
        { onSuccess, onError: () => toast.error(t.toast.updateError) }
      )
    } else {
      create.mutate(payload, {
        onSuccess,
        onError: () => toast.error(t.toast.createError)
      })
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
          <Label htmlFor="transaction-account">{t.form.accountLabel}</Label>
          <Controller
            control={control}
            name="account"
            render={({ field }) => (
              <Select
                items={accountItems}
                value={field.value || null}
                onValueChange={(value) => field.onChange(value ?? '')}
              >
                <SelectTrigger
                  id="transaction-account"
                  className="w-full"
                  aria-invalid={errors.account !== undefined}
                  onBlur={field.onBlur}
                >
                  <SelectValue placeholder={t.form.accountPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.account && <p className="text-xs text-destructive">{errors.account.message}</p>}
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="transaction-direction">{t.form.directionLabel}</Label>
            <Controller
              control={control}
              name="direction"
              render={({ field }) => (
                <Select
                  items={t.directions}
                  value={field.value}
                  onValueChange={(value) => value && field.onChange(value as Direction)}
                >
                  <SelectTrigger
                    id="transaction-direction"
                    className="w-full"
                    onBlur={field.onBlur}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">{t.directions.expense}</SelectItem>
                    <SelectItem value="income">{t.directions.income}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="transaction-amount">{t.form.amountLabel}</Label>
            <Input
              id="transaction-amount"
              type="text"
              inputMode="decimal"
              placeholder={t.form.amountPlaceholder}
              aria-invalid={errors.amount !== undefined}
              {...register('amount')}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-date">{t.form.dateLabel}</Label>
          <Input
            id="transaction-date"
            type="date"
            aria-invalid={errors.date !== undefined}
            {...register('date')}
          />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-payee">{t.form.payeeLabel}</Label>
          <Input
            id="transaction-payee"
            placeholder={t.form.payeePlaceholder}
            maxLength={200}
            {...register('payee')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-category">{t.form.categoryLabel}</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select
                items={categoryItems}
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? NO_CATEGORY)}
              >
                <SelectTrigger id="transaction-category" className="w-full" onBlur={field.onBlur}>
                  <SelectValue placeholder={t.form.categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>{t.form.noCategory}</SelectItem>
                  {groups.map(
                    (group) =>
                      group.categories.length > 0 && (
                        <SelectGroup key={group.id}>
                          <SelectLabel>{group.name}</SelectLabel>
                          {group.categories.map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                  )}
                  {ungrouped.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-note">{t.form.noteLabel}</Label>
          <Input
            id="transaction-note"
            placeholder={t.form.notePlaceholder}
            maxLength={1000}
            {...register('note')}
          />
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
