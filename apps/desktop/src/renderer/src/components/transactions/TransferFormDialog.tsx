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

import { fromDateInputValue, toDateInputValue } from '../../lib/datetime'
import { positiveEurCentsField } from '../../lib/money'
import { type Account, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.transfers

/**
 * The form's validation contract. The user picks a source and a destination
 * account and types a *positive* amount in euros; the schema parses the euros to
 * integer cents and refuses two identical accounts, so the payload the API
 * receives is always a coherent transfer. Account ids are carried as strings
 * because Select values are strings.
 */
const transferFormSchema = z
  .object({
    from: z.string().min(1, t.form.fromRequired),
    to: z.string().min(1, t.form.toRequired),
    amount: positiveEurCentsField({
      required: t.form.amountRequired,
      invalid: t.form.amountInvalid,
      positive: t.form.amountPositive
    }),
    date: z.string().min(1, t.form.dateRequired),
    payee: z.string(),
    note: z.string()
  })
  .refine((v) => v.from === '' || v.to === '' || v.from !== v.to, {
    message: t.form.sameAccount,
    path: ['to']
  })

type TransferFormInput = z.input<typeof transferFormSchema>
type TransferFormOutput = z.output<typeof transferFormSchema>

interface TransferFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accounts offered in both pickers (the live, non-archived ones). */
  accounts: Account[]
  /** Pre-selected source account (e.g. the account the list is filtered to). */
  defaultAccountId?: number
}

/**
 * Record a transfer between two of the user's own accounts. A transfer is
 * neither income nor expense: it is saved as two linked legs sharing one
 * `transferId`, carrying no category (see issue #7). On success it invalidates
 * the transactions list and the accounts list, so the ledger and the derived
 * balances of both accounts refresh in step.
 *
 * The stateful form lives in {@link TransferForm}, a child Base UI unmounts when
 * the dialog closes and remounts on the next open — so each open starts from
 * fresh defaults with no stale state to reset.
 */
export function TransferFormDialog(props: TransferFormDialogProps): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <TransferForm {...props} onDone={() => props.onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function TransferForm({
  accounts,
  defaultAccountId,
  onDone
}: TransferFormDialogProps & { onDone: () => void }): React.JSX.Element {
  const queryClient = useQueryClient()

  const initialFromId = defaultAccountId ?? accounts[0]?.id
  // Default the destination to the first account that isn't the source, so a
  // two-account setup needs no extra clicks; falls back to unset otherwise.
  const initialToId = accounts.find((a) => a.id !== initialFromId)?.id

  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<TransferFormInput, unknown, TransferFormOutput>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      from: initialFromId ? String(initialFromId) : '',
      to: initialToId ? String(initialToId) : '',
      amount: '',
      date: toDateInputValue(new Date()),
      payee: '',
      note: ''
    }
  })

  const create = useMutation(orpc.transfers.create.mutationOptions())

  // value→label maps so the triggers show names, not ids.
  const accountItems: Record<string, string> = Object.fromEntries(
    accounts.map((a) => [String(a.id), a.name])
  )

  const onSubmit = (values: TransferFormOutput): void => {
    create.mutate(
      {
        fromAccountId: Number(values.from),
        toAccountId: Number(values.to),
        amount: values.amount,
        date: fromDateInputValue(values.date),
        payee: values.payee.trim() || null,
        note: values.note.trim() || null
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: orpc.transactions.key() })
          void queryClient.invalidateQueries({ queryKey: orpc.accounts.key() })
          toast.success(t.toast.created)
          onDone()
        },
        onError: () => toast.error(t.toast.createError)
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <DialogHeader>
        <DialogTitle>{t.form.title}</DialogTitle>
        <DialogDescription>{t.form.description}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="transfer-from">{t.form.fromLabel}</Label>
            <Controller
              control={control}
              name="from"
              render={({ field }) => (
                <Select
                  items={accountItems}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? '')}
                >
                  <SelectTrigger
                    id="transfer-from"
                    className="w-full"
                    aria-invalid={errors.from !== undefined}
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder={t.form.fromPlaceholder} />
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
            {errors.from && <p className="text-xs text-destructive">{errors.from.message}</p>}
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="transfer-to">{t.form.toLabel}</Label>
            <Controller
              control={control}
              name="to"
              render={({ field }) => (
                <Select
                  items={accountItems}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? '')}
                >
                  <SelectTrigger
                    id="transfer-to"
                    className="w-full"
                    aria-invalid={errors.to !== undefined}
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder={t.form.toPlaceholder} />
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
            {errors.to && <p className="text-xs text-destructive">{errors.to.message}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="transfer-amount">{t.form.amountLabel}</Label>
            <Input
              id="transfer-amount"
              type="text"
              inputMode="decimal"
              placeholder={t.form.amountPlaceholder}
              aria-invalid={errors.amount !== undefined}
              {...register('amount')}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="transfer-date">{t.form.dateLabel}</Label>
            <Input
              id="transfer-date"
              type="date"
              aria-invalid={errors.date !== undefined}
              {...register('date')}
            />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transfer-payee">{t.form.payeeLabel}</Label>
          <Input
            id="transfer-payee"
            placeholder={t.form.payeePlaceholder}
            maxLength={200}
            {...register('payee')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transfer-note">{t.form.noteLabel}</Label>
          <Input
            id="transfer-note"
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
        <Button type="submit" disabled={create.isPending}>
          {t.form.submit}
        </Button>
      </DialogFooter>
    </form>
  )
}
