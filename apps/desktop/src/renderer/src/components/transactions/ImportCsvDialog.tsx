import { useState } from 'react'
import { Alert, AlertDescription } from '@repo/ui/components/alert'
import { Badge } from '@repo/ui/components/badge'
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
import { Label } from '@repo/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@repo/ui/components/select'
import { toast } from '@repo/ui/components/sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRightIcon, FileUpIcon } from 'lucide-react'

import { formatDate } from '../../lib/datetime'
import { formatEur } from '../../lib/money'
import { type Account, client, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.imports

/** Sentinel select value for "sans catégorie" (Select values are strings). */
const NO_CATEGORY = 'none'

/** The file as the main process hands it over: name + decoded content. */
type ChosenCsvFile = NonNullable<Awaited<ReturnType<typeof window.api.imports.chooseCsvFile>>>

/** What `imports.preview` returns — inferred so it can never drift. */
type ImportPreview = Awaited<ReturnType<typeof client.imports.preview>>

/** Column mapping as the import procedures take it — inferred from the
 * client contract so it can never drift from the server's schema. */
type ColumnMapping = NonNullable<Parameters<typeof client.imports.preview>[0]['mapping']>

/** The flow's screens: pick file+account → map columns (first import) → preview. */
type Step = 'setup' | 'mapping' | 'preview'

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accounts offered as import target (the live, non-archived ones). */
  accounts: Account[]
  /** Pre-selected target (e.g. the account the list is filtered to). */
  defaultAccountId?: number
}

/**
 * The CSV import flow (see issue #8). The main process reads the chosen file
 * and hands its content over as a string; every computation then goes through
 * the `imports.*` procedures — `inspect` to offer the column mapping on a
 * first import, `preview` to announce what a commit would do, and `commit` to
 * write everything in one SQL transaction. The renderer only displays.
 *
 * The stateful flow lives in {@link ImportFlow}, a child Base UI unmounts when
 * the dialog closes and remounts on the next open — so each open starts from a
 * fresh first step with no stale file or preview to reset.
 */
export function ImportCsvDialog(props: ImportCsvDialogProps): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <ImportFlow {...props} onDone={() => props.onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

/** Guess which column holds a value from its header, e.g. "Date" → date. */
function guessColumn(headers: string[], pattern: RegExp): string {
  const index = headers.findIndex((header) => pattern.test(header))
  return index === -1 ? '' : String(index)
}

/** The user-facing reason an import was refused, out of the procedure error. */
function refusalMessage(error: unknown): string {
  return t.dialog.refused(error instanceof Error ? error.message : String(error))
}

/** One movement as `date · amount · label` — a duplicate row and its stored
 * match are shown side by side in this same shape so they read as comparable. */
function formatMovement(m: { date: string | Date; amount: number; label: string }): string {
  return `${formatDate(new Date(m.date))} · ${formatEur(m.amount)} · ${m.label}`
}

function ImportFlow({
  accounts,
  defaultAccountId,
  onDone
}: ImportCsvDialogProps & { onDone: () => void }): React.JSX.Element {
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('setup')
  const [accountValue, setAccountValue] = useState(
    String(defaultAccountId ?? accounts[0]?.id ?? '')
  )
  const [file, setFile] = useState<ChosenCsvFile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mapping step state — filled by `inspect` when the account has no memorised
  // mapping yet. The three selects carry column indexes as strings.
  const [headers, setHeaders] = useState<string[]>([])
  const [sampleRows, setSampleRows] = useState<string[][]>([])
  const [dateValue, setDateValue] = useState('')
  const [amountValue, setAmountValue] = useState('')
  const [labelValue, setLabelValue] = useState('')

  // The mapping this import runs with: undefined means "use the memorised
  // one" — the procedures resolve it server-side.
  const [mapping, setMapping] = useState<ColumnMapping | undefined>(undefined)
  const [preview, setPreview] = useState<ImportPreview | null>(null)

  // Preview-step choices, keyed by CSV line: which probable duplicates the user
  // unfolded to inspect, and which they judged false positives and forced in.
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [forced, setForced] = useState<Set<number>>(new Set())

  // The user's corrections to the categories the rules announced (issue #13),
  // keyed by CSV line. Untouched lines keep the rules' verdict server-side.
  const [categoryOverrides, setCategoryOverrides] = useState<Map<number, number | null>>(new Map())

  // Categories offered by the per-row correction select in the preview.
  const { data: categoriesOverview } = useQuery(orpc.categories.overview.queryOptions())
  const categories = [
    ...(categoriesOverview?.groups ?? []).flatMap((group) => group.categories),
    ...(categoriesOverview?.ungrouped ?? [])
  ]
  const categoryItems: Record<string, string> = {
    [NO_CATEGORY]: t.preview.noCategory,
    ...Object.fromEntries(categories.map((c) => [String(c.id), c.name]))
  }

  /** Show a freshly computed preview, dropping any expand/force/category
   * choices made against the previous one (their line numbers no longer apply). */
  function showPreview(next: ImportPreview): void {
    setPreview(next)
    setExpanded(new Set())
    setForced(new Set())
    setCategoryOverrides(new Map())
  }

  /** Flip one line in a line-keyed set (expand/collapse, force/unforce). */
  function toggleLine(set: Set<number>, line: number, on: boolean): Set<number> {
    const next = new Set(set)
    if (on) next.add(line)
    else next.delete(line)
    return next
  }

  const accountId = Number(accountValue)
  const accountItems: Record<string, string> = Object.fromEntries(
    accounts.map((a) => [String(a.id), a.name])
  )
  const columnItems: Record<string, string> = Object.fromEntries(
    headers.map((header, index) => [String(index), header])
  )

  async function chooseFile(): Promise<void> {
    const chosen = await window.api.imports.chooseCsvFile()
    if (chosen) {
      setFile(chosen)
      setError(null)
    }
  }

  /** Run a flow step, funnelling any refusal into the dialog's error slot. */
  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (cause) {
      setError(refusalMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  /** From setup: straight to preview when a mapping is memorised, else map. */
  function continueFromSetup(): void {
    if (!file) return
    void run(async () => {
      const stored = await client.imports.getMapping({ accountId })
      if (stored) {
        setMapping(undefined)
        showPreview(await client.imports.preview({ accountId, content: file.content }))
        setStep('preview')
        return
      }
      const inspected = await client.imports.inspect({ content: file.content })
      setHeaders(inspected.headers)
      setSampleRows(inspected.sampleRows)
      setDateValue(guessColumn(inspected.headers, /date/i))
      setAmountValue(guessColumn(inspected.headers, /montant|amount|d[ée]bit/i))
      setLabelValue(guessColumn(inspected.headers, /libell|label|description|d[ée]signation/i))
      setStep('mapping')
    })
  }

  function previewFromMapping(): void {
    if (!file) return
    if (dateValue === '' || amountValue === '' || labelValue === '') {
      setError(t.mapping.required)
      return
    }
    const chosen: ColumnMapping = {
      dateColumn: Number(dateValue),
      amountColumn: Number(amountValue),
      labelColumn: Number(labelValue)
    }
    if (new Set([chosen.dateColumn, chosen.amountColumn, chosen.labelColumn]).size !== 3) {
      setError(t.mapping.distinct)
      return
    }
    void run(async () => {
      showPreview(
        await client.imports.preview({ accountId, content: file.content, mapping: chosen })
      )
      setMapping(chosen)
      setStep('preview')
    })
  }

  function commit(): void {
    if (!file) return
    void run(async () => {
      const result = await client.imports.commit({
        accountId,
        content: file.content,
        mapping,
        forceLines: [...forced],
        categoryOverrides: [...categoryOverrides].map(([line, categoryId]) => ({
          line,
          categoryId
        }))
      })
      void queryClient.invalidateQueries({ queryKey: orpc.transactions.key() })
      void queryClient.invalidateQueries({ queryKey: orpc.accounts.key() })
      toast.success(t.toast.imported(result.imported))
      onDone()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>
          {step === 'mapping'
            ? t.mapping.title
            : step === 'preview'
              ? t.preview.title
              : t.dialog.title}
        </DialogTitle>
        <DialogDescription>
          {step === 'mapping' ? t.mapping.description : t.dialog.description}
        </DialogDescription>
      </DialogHeader>

      {step === 'setup' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="import-account">{t.dialog.accountLabel}</Label>
            <Select
              items={accountItems}
              value={accountValue || null}
              onValueChange={(value) => setAccountValue(value ?? '')}
            >
              <SelectTrigger id="import-account" className="w-full">
                <SelectValue placeholder={t.dialog.accountPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => void chooseFile()}>
              <FileUpIcon />
              {t.dialog.chooseFile}
            </Button>
            <span className="truncate text-sm text-muted-foreground">
              {file ? file.name : t.dialog.noFile}
            </span>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            {(
              [
                ['import-date', t.mapping.dateLabel, dateValue, setDateValue],
                ['import-amount', t.mapping.amountLabel, amountValue, setAmountValue],
                ['import-label', t.mapping.labelLabel, labelValue, setLabelValue]
              ] as const
            ).map(([id, label, value, setValue]) => (
              <div key={id} className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Select
                  items={columnItems}
                  value={value || null}
                  onValueChange={(next) => setValue(next ?? '')}
                >
                  <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder={t.mapping.columnPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((header, index) => (
                      <SelectItem key={index} value={String(index)}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t.mapping.sampleTitle}
            </span>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {headers.map((header, index) => (
                      <th key={index} className="px-2 py-1.5 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b last:border-0">
                      {headers.map((_, columnIndex) => (
                        <td key={columnIndex} className="px-2 py-1.5 whitespace-nowrap">
                          {row[columnIndex] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">
            {t.preview.summary(preview.newCount, preview.duplicateCount)}
          </p>
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border">
            {preview.rows.map((row) => {
              const isForced = forced.has(row.line)
              const isExpanded = expanded.has(row.line)
              // Dim only probable duplicates that will be skipped — a forced one
              // is entering the ledger, so it reads at full strength.
              const dimmed = row.duplicate && !isForced
              // The category this row will land under: the user's correction
              // when made, else what the rules announced (issue #13). Only rows
              // that will import get the correction select — a skipped
              // duplicate writes nothing to classify.
              const willImport = !row.duplicate || isForced
              const categoryId = categoryOverrides.has(row.line)
                ? (categoryOverrides.get(row.line) ?? null)
                : (row.category?.id ?? null)
              return (
                <li key={row.line} className="text-sm">
                  <div
                    className={`flex items-center justify-between gap-3 px-3 py-2 ${
                      dimmed ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {row.duplicate ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((set) => toggleLine(set, row.line, !isExpanded))
                          }
                          aria-expanded={isExpanded}
                          className="flex min-w-0 items-center gap-1.5 text-left hover:underline"
                        >
                          <ChevronRightIcon
                            className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                          <span className="truncate">{row.label}</span>
                        </button>
                      ) : (
                        <span className="truncate">{row.label}</span>
                      )}
                      {row.duplicate && (
                        <Badge variant={isForced ? 'default' : 'outline'} className="shrink-0">
                          {isForced ? t.preview.forcedBadge : t.preview.duplicateBadge}
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-muted-foreground">
                      {willImport && (
                        <Select
                          items={categoryItems}
                          value={categoryId === null ? NO_CATEGORY : String(categoryId)}
                          onValueChange={(value) =>
                            setCategoryOverrides((map) =>
                              new Map(map).set(
                                row.line,
                                value === NO_CATEGORY || value === null ? null : Number(value)
                              )
                            )
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className="w-36 text-xs"
                            aria-label={t.preview.categorySelectLabel(row.label)}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_CATEGORY}>{t.preview.noCategory}</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={String(category.id)}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <span>{formatDate(new Date(row.date))}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatEur(row.amount)}
                      </span>
                    </div>
                  </div>

                  {row.duplicate && isExpanded && row.existing && (
                    <div className="flex flex-col gap-2.5 border-t bg-muted/30 px-3 py-2.5 pl-[2.125rem]">
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                        <dt className="text-muted-foreground">{t.preview.importedRowLabel}</dt>
                        <dd className="tabular-nums">{formatMovement(row)}</dd>
                        <dt className="text-muted-foreground">{t.preview.existingRowLabel}</dt>
                        <dd className="tabular-nums">{formatMovement(row.existing)}</dd>
                      </dl>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={isForced}
                          onCheckedChange={(checked) =>
                            setForced((set) => toggleLine(set, row.line, checked === true))
                          }
                        />
                        {t.preview.forceLabel}
                      </label>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {preview.duplicateCount > 0 && (
            <p className="text-xs text-muted-foreground">{t.preview.duplicateHint}</p>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t.dialog.cancel}
        </DialogClose>
        {step === 'mapping' && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => setStep('setup')}>
            {t.dialog.back}
          </Button>
        )}
        {step === 'setup' && (
          <Button
            type="button"
            disabled={busy || file === null || accountValue === ''}
            onClick={continueFromSetup}
          >
            {t.dialog.continue}
          </Button>
        )}
        {step === 'mapping' && (
          <Button type="button" disabled={busy} onClick={previewFromMapping}>
            {t.mapping.submit}
          </Button>
        )}
        {step === 'preview' && preview && (
          <Button type="button" disabled={busy} onClick={commit}>
            {t.preview.submit(preview.newCount + forced.size)}
          </Button>
        )}
      </DialogFooter>
    </div>
  )
}
