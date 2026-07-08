import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type AccountType } from '@repo/api/client'
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
import { Skeleton } from '@repo/ui/components/skeleton'
import { ArchiveIcon, PencilIcon, PlusIcon, WalletIcon } from 'lucide-react'

import { formatEur } from '../../lib/money'
import { SECTIONS } from '../../lib/navigation'
import { type Account, orpc } from '../../lib/orpc'
import { strings } from '../../lib/strings'
import { AccountFormDialog } from './AccountFormDialog'
import { ArchiveAccountDialog } from './ArchiveAccountDialog'

const t = strings.accounts

function typeLabel(type: string): string {
  return t.types[type as AccountType] ?? type
}

/**
 * The accounts overview: every live account with its derived balance, the
 * global total, and the actions to create, edit and archive. Archived accounts
 * are hidden here — they stay in the ledger for past reports (see the
 * `accounts.list` procedure, which excludes them by default).
 */
export function AccountsPanel(): React.JSX.Element {
  // The overview shows only live accounts; archived ones stay in the ledger for
  // past reports and are fetched elsewhere.
  const { data: accounts, isLoading } = useQuery(
    orpc.accounts.list.queryOptions({ input: { includeArchived: false } })
  )

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Account | undefined>(undefined)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState<Account | undefined>(undefined)

  function openCreate(): void {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(account: Account): void {
    setEditing(account)
    setFormOpen(true)
  }

  function openArchive(account: Account): void {
    setArchiving(account)
    setArchiveOpen(true)
  }

  const total = accounts?.reduce((sum, account) => sum + account.balance, 0) ?? 0

  return (
    <section id={SECTIONS.accounts} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium tracking-wide uppercase">{t.title}</h2>
          {accounts && accounts.length > 0 && (
            <p className="text-sm text-muted-foreground">{t.count(accounts.length)}</p>
          )}
        </div>
        {accounts && accounts.length > 0 && (
          <Button size="sm" onClick={openCreate}>
            <PlusIcon />
            {t.add}
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card className="gap-0 p-0">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </Card>
      ) : !accounts || accounts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WalletIcon />
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
            {accounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-col items-start gap-1">
                  <span className="w-full truncate font-medium">{account.name}</span>
                  <Badge variant="secondary">{typeLabel(account.type)}</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="mr-1 font-medium tabular-nums">
                    {formatEur(account.balance)}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.edit}
                    onClick={() => openEdit(account)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.archive}
                    onClick={() => openArchive(account)}
                  >
                    <ArchiveIcon />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">{t.total}</span>
            <span className="font-semibold tabular-nums">{formatEur(total)}</span>
          </div>
        </Card>
      )}

      <AccountFormDialog open={formOpen} onOpenChange={setFormOpen} account={editing} />
      <ArchiveAccountDialog open={archiveOpen} onOpenChange={setArchiveOpen} account={archiving} />
    </section>
  )
}
