import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { toast } from '@repo/ui/components/sonner'

import { centsToInput, parseEurToCents } from '../../lib/money'
import { type Account, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.accounts

/** Value→label map so the select trigger shows the French label, not the code. */
const typeItems: Record<AccountType, string> = t.types

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

  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType | null>(
    (account?.type as AccountType | undefined) ?? null
  )
  const [balance, setBalance] = useState(account ? centsToInput(account.initialBalance) : '')
  const [balanceError, setBalanceError] = useState(false)

  const create = useMutation(orpc.accounts.create.mutationOptions())
  const update = useMutation(orpc.accounts.update.mutationOptions())
  const pending = create.isPending || update.isPending

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()

    const trimmedName = name.trim()
    if (trimmedName === '' || type === null) return

    const initialBalance = parseEurToCents(balance)
    if (initialBalance === null) {
      setBalanceError(true)
      return
    }

    const onSuccess = (saved: Account): void => {
      void queryClient.invalidateQueries({ queryKey: orpc.accounts.key() })
      toast.success(account ? t.toast.updated(saved.name) : t.toast.created(saved.name))
      onDone()
    }

    if (account) {
      update.mutate(
        { id: account.id, name: trimmedName, type, initialBalance },
        { onSuccess, onError: () => toast.error(t.toast.updateError) }
      )
    } else {
      create.mutate(
        { name: trimmedName, type, initialBalance },
        { onSuccess, onError: () => toast.error(t.toast.createError) }
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.form.namePlaceholder}
            maxLength={100}
            autoFocus
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-type">{t.form.typeLabel}</Label>
          <Select
            items={typeItems}
            value={type}
            onValueChange={(value) => setType(value as AccountType)}
          >
            <SelectTrigger id="account-type" className="w-full">
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
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-balance">{t.form.initialBalanceLabel}</Label>
          <Input
            id="account-balance"
            type="text"
            inputMode="decimal"
            value={balance}
            onChange={(e) => {
              setBalance(e.target.value)
              setBalanceError(false)
            }}
            placeholder={t.form.initialBalancePlaceholder}
            aria-invalid={balanceError}
          />
          <p className="text-xs text-muted-foreground">
            {balanceError ? t.form.invalidBalance : t.form.initialBalanceHint}
          </p>
        </div>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t.form.cancel}
        </DialogClose>
        <Button type="submit" disabled={pending || name.trim() === '' || type === null}>
          {isEdit ? t.form.submitEdit : t.form.submitCreate}
        </Button>
      </DialogFooter>
    </form>
  )
}
