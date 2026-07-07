import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import { Card } from '@repo/ui/components/card'
import { Checkbox } from '@repo/ui/components/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@repo/ui/components/empty'
import { Input } from '@repo/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@repo/ui/components/select'
import { Skeleton } from '@repo/ui/components/skeleton'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { toast } from '@repo/ui/components/sonner'
import {
  ArrowLeftRightIcon,
  FileUpIcon,
  FilterXIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon
} from 'lucide-react'

import { formatDate, fromDateInputValue, fromDateInputValueEndOfDay } from '../../lib/datetime'
import { formatEur, parseEurToCents } from '../../lib/money'
import { type Transaction, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'
import {
  CategorySelectOptions,
  NO_CATEGORY,
  flatCategories
} from '../categories/CategorySelectOptions'
import { DeleteTransactionDialog } from './DeleteTransactionDialog'
import { ImportCsvDialog } from './ImportCsvDialog'
import { TransactionFormDialog } from './TransactionFormDialog'
import { TransferFormDialog } from './TransferFormDialog'

const t = strings.transactions
const f = strings.transactions.filters
const s = strings.transactions.selection
const transferStrings = strings.transfers
const importStrings = strings.imports

/** Sentinel filter value meaning "every account, combined". */
const ALL_ACCOUNTS = 'all'
/** Sentinel filter value meaning "any category". */
const ALL_CATEGORIES = 'all'
/** Sentinel filter value for the "non catégorisées" todo-list after an import. */
const UNCATEGORIZED = 'none'

/**
 * The value only after it has stopped changing for `delayMs` — so a query
 * driven by a text field fires once per pause, not once per keystroke.
 */
function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/**
 * Parse an amount-filter field: empty means "no bound" (`undefined`), anything
 * else must read as a non-negative euros amount and yields cents. `invalid`
 * flags text that parses to nothing so the field can show it without applying
 * a wrong bound.
 */
function parseAmountFilter(raw: string): { cents: number | undefined; invalid: boolean } {
  if (raw.trim() === '') return { cents: undefined, invalid: false }
  const cents = parseEurToCents(raw)
  if (cents === null || cents < 0) return { cents: undefined, invalid: true }
  return { cents, invalid: false }
}

/**
 * The transactions screen as a working tool (see issue #9): a chronological
 * list searchable in full text (payee and note) and narrowed by combinable
 * filters — account, category (or « non catégorisées »), period, amount
 * bounds — with the matching rows' count and signed sum always visible. Rows
 * can be multi-selected and refiled under a category in one gesture. All
 * filtering and both aggregates are computed in SQL by `transactions.list`;
 * the renderer only displays.
 */
export function TransactionsPanel(): React.JSX.Element {
  const [accountFilter, setAccountFilter] = useState<string>(ALL_ACCOUNTS)
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(new Set())
  const [bulkCategory, setBulkCategory] = useState<string>('')

  const [formOpen, setFormOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>(undefined)
  const [deleting, setDeleting] = useState<Transaction | undefined>(undefined)

  const queryClient = useQueryClient()

  const accountId = accountFilter === ALL_ACCOUNTS ? undefined : Number(accountFilter)
  const debouncedSearch = useDebouncedValue(search)
  const debouncedMin = useDebouncedValue(minAmount)
  const debouncedMax = useDebouncedValue(maxAmount)
  const min = parseAmountFilter(debouncedMin)
  const max = parseAmountFilter(debouncedMax)

  const { data: accounts } = useQuery(
    orpc.accounts.list.queryOptions({ input: { includeArchived: false } })
  )
  const { data: categories } = useQuery(orpc.categories.overview.queryOptions())
  const { data: list, isLoading } = useQuery(
    orpc.transactions.list.queryOptions({
      input: {
        accountId,
        categoryId:
          categoryFilter === ALL_CATEGORIES
            ? undefined
            : categoryFilter === UNCATEGORIZED
              ? null
              : Number(categoryFilter),
        search: debouncedSearch.trim() || undefined,
        from: fromDate ? fromDateInputValue(fromDate) : undefined,
        to: toDate ? fromDateInputValueEndOfDay(toDate) : undefined,
        minAmount: min.cents,
        maxAmount: max.cents
      }
    })
  )

  const bulkCategorize = useMutation(orpc.transactions.bulkCategorize.mutationOptions())

  const liveAccounts = accounts ?? []
  const hasAccounts = liveAccounts.length > 0
  // A transfer needs a source and a destination, so it takes at least two accounts.
  const canTransfer = liveAccounts.length >= 2
  const showAccountName = accountFilter === ALL_ACCOUNTS

  const rows = list?.transactions ?? []
  const leafCategories = flatCategories(categories)

  const hasActiveFilters =
    accountFilter !== ALL_ACCOUNTS ||
    categoryFilter !== ALL_CATEGORIES ||
    search.trim() !== '' ||
    fromDate !== '' ||
    toDate !== '' ||
    minAmount.trim() !== '' ||
    maxAmount.trim() !== ''

  // Selection is kept as ids and intersected with the rows on screen, so a row
  // filtered out of view is never silently recategorized.
  const selectableIds = rows.filter((tx) => tx.transferId === null).map((tx) => tx.id)
  const selected = selectableIds.filter((id) => selectedIds.has(id))
  const allSelected = selectableIds.length > 0 && selected.length === selectableIds.length

  function resetFilters(): void {
    setAccountFilter(ALL_ACCOUNTS)
    setCategoryFilter(ALL_CATEGORIES)
    setSearch('')
    setFromDate('')
    setToDate('')
    setMinAmount('')
    setMaxAmount('')
  }

  function toggleOne(id: number, checked: boolean): void {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(checked: boolean): void {
    setSelectedIds(checked ? new Set(selectableIds) : new Set())
  }

  function applyBulkCategory(): void {
    if (bulkCategory === '' || selected.length === 0) return
    bulkCategorize.mutate(
      {
        ids: selected,
        categoryId: bulkCategory === NO_CATEGORY ? null : Number(bulkCategory)
      },
      {
        onSuccess: (result) => {
          void queryClient.invalidateQueries({ queryKey: orpc.transactions.key() })
          toast.success(s.toast.done(result.updated))
          setSelectedIds(new Set())
          setBulkCategory('')
        },
        onError: () => toast.error(s.toast.error)
      }
    )
  }

  function openCreate(): void {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(transaction: Transaction): void {
    setEditing(transaction)
    setFormOpen(true)
  }

  // value→label maps so the filter triggers show names, not ids.
  const accountItems: Record<string, string> = {
    [ALL_ACCOUNTS]: t.allAccounts,
    ...Object.fromEntries(liveAccounts.map((a) => [String(a.id), a.name]))
  }
  const categoryItems: Record<string, string> = {
    [ALL_CATEGORIES]: f.allCategories,
    [UNCATEGORIZED]: f.uncategorized,
    ...Object.fromEntries(leafCategories.map((c) => [String(c.id), c.name]))
  }
  const bulkItems: Record<string, string> = {
    [NO_CATEGORY]: t.noCategory,
    ...Object.fromEntries(leafCategories.map((c) => [String(c.id), c.name]))
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium tracking-wide uppercase">{t.title}</h2>
          {/* Shown for an empty filtered result too: « 0 transactions · 0,00 € »
              answers the question the filters ask. Hidden only when the ledger
              itself is empty, where the empty state already says it all. */}
          {list && (list.count > 0 || hasActiveFilters) && (
            <p className="text-sm text-muted-foreground">
              {t.count(list.count)}
              <span aria-hidden> · </span>
              <span className="font-medium tabular-nums">{formatEur(list.sum)}</span>
            </p>
          )}
        </div>
        {hasAccounts && (
          <div className="flex items-center gap-2">
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

      {hasAccounts && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              className="h-8 pl-8"
              aria-label={f.searchLabel}
              placeholder={f.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            items={accountItems}
            value={accountFilter}
            onValueChange={(value) => setAccountFilter(value ?? ALL_ACCOUNTS)}
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
          <Select
            items={categoryItems}
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value ?? ALL_CATEGORIES)}
          >
            <SelectTrigger size="sm" aria-label={f.categoryLabel}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>{f.allCategories}</SelectItem>
              <SelectItem value={UNCATEGORIZED}>{f.uncategorized}</SelectItem>
              <CategorySelectOptions categories={categories} />
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="h-8 w-fit"
            aria-label={f.fromLabel}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            type="date"
            className="h-8 w-fit"
            aria-label={f.toLabel}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <Input
            type="text"
            inputMode="decimal"
            className="h-8 w-24"
            aria-label={f.minAmountLabel}
            aria-invalid={parseAmountFilter(minAmount).invalid}
            placeholder={f.minAmountPlaceholder}
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
          />
          <Input
            type="text"
            inputMode="decimal"
            className="h-8 w-24"
            aria-label={f.maxAmountLabel}
            aria-invalid={parseAmountFilter(maxAmount).invalid}
            placeholder={f.maxAmountPlaceholder}
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
          />
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              <FilterXIcon />
              {f.reset}
            </Button>
          )}
        </div>
      )}

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
      ) : rows.length === 0 && hasActiveFilters ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>{f.noMatch}</EmptyTitle>
            <EmptyDescription>{f.noMatchHint}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={resetFilters}>
              <FilterXIcon />
              {f.reset}
            </Button>
          </EmptyContent>
        </Empty>
      ) : rows.length === 0 ? (
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
          {selectableIds.length > 0 && (
            <div className="flex min-h-11 items-center gap-3 border-b border-border px-4 py-2">
              <Checkbox
                aria-label={s.selectAll}
                checked={allSelected}
                indeterminate={selected.length > 0 && !allSelected}
                onCheckedChange={(checked) => toggleAll(checked === true)}
              />
              {selected.length > 0 ? (
                <>
                  <span className="text-sm text-muted-foreground">{s.count(selected.length)}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <Select
                      items={bulkItems}
                      value={bulkCategory || null}
                      onValueChange={(value) => setBulkCategory(value ?? '')}
                    >
                      <SelectTrigger size="sm" aria-label={f.categoryLabel}>
                        <SelectValue placeholder={s.categoryPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY}>{t.noCategory}</SelectItem>
                        <CategorySelectOptions categories={categories} />
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={bulkCategory === '' || bulkCategorize.isPending}
                      onClick={applyBulkCategory}
                    >
                      {s.apply}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleAll(false)}>
                      {s.clear}
                    </Button>
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">{s.selectAll}</span>
              )}
            </div>
          )}
          <ul className="divide-y divide-border">
            {rows.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {transaction.transferId === null ? (
                    <Checkbox
                      aria-label={s.selectOne(transaction.payee ?? t.noPayee)}
                      checked={selectedIds.has(transaction.id)}
                      onCheckedChange={(checked) => toggleOne(transaction.id, checked === true)}
                    />
                  ) : (
                    // Keeps transfer rows aligned with the selectable ones.
                    <span aria-hidden className="size-4 shrink-0" />
                  )}
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
