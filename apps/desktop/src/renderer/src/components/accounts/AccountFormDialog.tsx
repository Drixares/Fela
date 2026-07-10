import { zodResolver } from '@hookform/resolvers/zod'
import { ACCOUNT_TYPES, type AccountType } from '@repo/api/client'
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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { toast } from '@repo/ui/components/sonner'
import { centsToInput, parseEurToCents } from '../../lib/money'
import { type Account, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.accounts

/** Value→label map so the select trigger shows the French label, not the code. */
const typeItems: Record<AccountType, string> = t.types

/**
 * The form's validation contract. `balance` is typed in euros and parsed to
 * integer cents by the schema itself, so the submit handler receives the exact
 * `initialBalance` the API expects — the euro↔cents crossing stays in one place.
 */
const accountFormSchema = z.object({
  name: z.string().trim().min(1, t.form.nameRequired).max(100),
  type: z.enum(ACCOUNT_TYPES, { error: t.form.typeRequired }),
  balance: z.string().transform((value, ctx) => {
    const cents = parseEurToCents(value)
    if (cents === null) {
      ctx.addIssue({ code: 'custom', message: t.form.invalidBalance })
      return z.NEVER
    }
    return cents
  })
})

type AccountFormInput = z.input<typeof accountFormSchema>
type AccountFormOutput = z.output<typeof accountFormSchema>

interface AccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The account being edited, or `undefined` to create a new one. */
  account?: Account
}

/**
 * Create or edit an account. The same form serves both: passing an `account`
 * switches it to edit mode and pre-fills the fields. On success it invalidates
 * the accounts list so the overview and its total refresh.
 *
 * The stateful form lives in {@link AccountForm}, a child that Base UI unmounts
 * when the dialog closes and remounts on the next open — so each open starts
 * from the account's own values with no stale state to reset.
 */
export function AccountFormDialog({
  open,
  onOpenChange,
  account
}: AccountFormDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <AccountForm account={account} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function AccountForm({
  account,
  onDone
}: {
  account?: Account
  onDone: () => void
}): React.JSX.Element {
  const isEdit = account !== undefined
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<AccountFormInput, unknown, AccountFormOutput>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: account?.name ?? '',
      type: account?.type as AccountType | undefined,
      balance: account ? centsToInput(account.initialBalance) : ''
    }
  })

  const create = useMutation(orpc.accounts.create.mutationOptions())
  const update = useMutation(orpc.accounts.update.mutationOptions())
  const pending = create.isPending || update.isPending

  const onSubmit = (values: AccountFormOutput): void => {
    const onSuccess = (saved: Account): void => {
      void queryClient.invalidateQueries({ queryKey: orpc.accounts.key() })
      toast.success(account ? t.toast.updated(saved.name) : t.toast.created(saved.name))
      onDone()
    }

    if (account) {
      update.mutate(
        { id: account.id, name: values.name, type: values.type, initialBalance: values.balance },
        {
          onSuccess,
          onError: (error) => {
            console.log(error)
            return toast.error(t.toast.updateError)
          }
        }
      )
    } else {
      create.mutate(
        { name: values.name, type: values.type, initialBalance: values.balance },
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
          <Label htmlFor="account-name">{t.form.nameLabel}</Label>
          <Input
            id="account-name"
            placeholder={t.form.namePlaceholder}
            maxLength={100}
            autoFocus
            aria-invalid={errors.name !== undefined}
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-type">{t.form.typeLabel}</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                items={typeItems}
                value={field.value ?? null}
                onValueChange={(value) => field.onChange(value)}
              >
                <SelectTrigger
                  id="account-type"
                  className="w-full"
                  aria-invalid={errors.type !== undefined}
                  onBlur={field.onBlur}
                >
                  <SelectValue placeholder={t.form.typePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t.types[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-balance">{t.form.initialBalanceLabel}</Label>
          <Input
            id="account-balance"
            type="text"
            inputMode="decimal"
            placeholder={t.form.initialBalancePlaceholder}
            aria-invalid={errors.balance !== undefined}
            {...register('balance')}
          />
          <p
            className={
              errors.balance ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'
            }
          >
            {errors.balance ? errors.balance.message : t.form.initialBalanceHint}
          </p>
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
