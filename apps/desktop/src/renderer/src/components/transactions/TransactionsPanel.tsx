import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import { Card } from '@repo/ui/components/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@repo/ui/components/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@repo/ui/components/select'
import { Skeleton } from '@repo/ui/components/skeleton'
import { ArrowLeftRightIcon, FileUpIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { formatDate } from '../../lib/datetime'
import { formatEur } from '../../lib/money'
import { type Transaction, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'
import { DeleteTransactionDialog } from './DeleteTransactionDialog'
import { ImportCsvDialog } from './ImportCsvDialog'
import { TransactionFormDialog } from './TransactionFormDialog'
import { TransferFormDialog } from './TransferFormDialog'

const t = strings.transactions
const transferStrings = strings.transfers
const importStrings = strings.imports

/** Sentinel filter value meaning "every account, combined". */
const ALL_ACCOUNTS = 'all'

/**
 * The transactions screen: a chronological list of every movement — all
 * accounts combined or filtered to one — with the actions to add, edit and
 * delete. Every mutation flows through the `transactions.*` procedures and
 * invalidates the accounts list too, so the derived balances shown elsewhere
 * update in step (see issue #6). The renderer only displays.
 */
export function TransactionsPanel(): React.JSX.Element {
  const [filter, setFilter] = useState<string>(ALL_ACCOUNTS)
  const [formOpen, setFormOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>(undefined)
  const [deleting, setDeleting] = useState<Transaction | undefined>(undefined)

  const accountId = filter === ALL_ACCOUNTS ? undefined : Number(filter)

  const { data: accounts } = useQuery(
    orpc.accounts.list.queryOptions({ input: { includeArchived: false } })
  )
  const { data: categories } = useQuery(orpc.categories.overview.queryOptions())
  const { data: transactions, isLoading } = useQuery(
    orpc.transactions.list.queryOptions({ input: { accountId } })
  )

  const liveAccounts = accounts ?? []
  const hasAccounts = liveAccounts.length > 0
  // A transfer needs a source and a destination, so it takes at least two accounts.
  const canTransfer = liveAccounts.length >= 2
  const showAccountName = filter === ALL_ACCOUNTS

  function openCreate(): void {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(transaction: Transaction): void {
    setEditing(transaction)
    setFormOpen(true)
  }

  // value→label map so the filter trigger shows a name, not an id.
  const filterItems: Record<string, string> = {
    [ALL_ACCOUNTS]: t.allAccounts,
    ...Object.fromEntries(liveAccounts.map((a) => [String(a.id), a.name]))
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium tracking-wide uppercase">{t.title}</h2>
          {transactions && transactions.length > 0 && (
            <p className="text-sm text-muted-foreground">{t.count(transactions.length)}</p>
          )}
        </div>
        {hasAccounts && (
          <div className="flex items-center gap-2">
            <Select
              items={filterItems}
              value={filter}
              onValueChange={(value) => setFilter(value ?? ALL_ACCOUNTS)}
            >
              <SelectTrigger size="sm" aria-label={t.filterLabel}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ACCOUNTS}>{t.allAccounts}</SelectItem>
                {liveAccounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <FileUpIcon />
              {importStrings.add}
            </Button>
            {canTransfer && (
              <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
                <ArrowLeftRightIcon />
                {transferStrings.add}
              </Button>
            )}
            <Button size="sm" onClick={openCreate}>
              <PlusIcon />
              {t.add}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Card className="gap-0 p-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </Card>
      ) : !hasAccounts ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ArrowLeftRightIcon />
            </EmptyMedia>
            <EmptyTitle>{t.empty}</EmptyTitle>
            <EmptyDescription>{t.emptyNoAccounts}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : !transactions || transactions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ArrowLeftRightIcon />
            </EmptyMedia>
            <EmptyTitle>{t.empty}</EmptyTitle>
            <EmptyDescription>{t.emptyHint}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <PlusIcon />
              {t.add}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Card className="gap-0 p-0">
          <ul className="divide-y divide-border">
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col items-start gap-1">
                  <span className="w-full truncate font-medium">
                    {transaction.payee ?? t.noPayee}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{formatDate(transaction.date)}</span>
                    {showAccountName && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{transaction.accountName}</span>
                      </>
                    )}
                    {transaction.transferId !== null ? (
                      <Badge variant="outline" className="gap-1">
                        <ArrowLeftRightIcon className="size-3" />
                        {transferStrings.badge}
                      </Badge>
                    ) : (
                      transaction.categoryName && (
                        <Badge variant="secondary">{transaction.categoryName}</Badge>
                      )
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {/* The sign carries the direction (formatEur renders the « - » for
                      outflows), so the amount stays in the plain balance style used
                      across the app rather than reaching outside the design tokens. */}
                  <span className="mr-1 font-medium tabular-nums">
                    {formatEur(transaction.amount)}
                  </span>
                  {transaction.transferId === null && (
                    <>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t.edit}
                        onClick={() => openEdit(transaction)}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t.delete}
                        onClick={() => setDeleting(transaction)}
                      >
                        <Trash2Icon />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        accounts={liveAccounts}
        categories={categories}
        defaultAccountId={accountId}
      />
      <TransferFormDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={liveAccounts}
        defaultAccountId={accountId}
      />
      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        accounts={liveAccounts}
        defaultAccountId={accountId}
      />
      <DeleteTransactionDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        transaction={deleting}
      />
    </section>
  )
}
