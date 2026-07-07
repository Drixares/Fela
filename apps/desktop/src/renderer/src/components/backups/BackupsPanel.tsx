import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@repo/ui/components/button'
import { Card } from '@repo/ui/components/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@repo/ui/components/empty'
import { Skeleton } from '@repo/ui/components/skeleton'
import { toast } from '@repo/ui/components/sonner'
import { DatabaseBackupIcon, FolderIcon, RotateCcwIcon, SaveIcon } from 'lucide-react'

import { type BackupEntry, type BackupsState, backupsKey } from '../../lib/backups'
import { formatBytes, formatDateTime } from '../../lib/datetime'
import { strings } from '../../lib/strings'
import { RestoreBackupDialog } from './RestoreBackupDialog'

const t = strings.backups

/**
 * The backups settings section: choose the backup folder, see the last backup
 * and trigger one on demand, and restore from any existing snapshot. Backups are
 * owned by the main process (the sole owner of the database file); this panel
 * only drives the `window.api.backups` bridge and never touches files itself.
 */
export function BackupsPanel(): React.JSX.Element {
  const queryClient = useQueryClient()
  const { data: state, isLoading } = useQuery({
    queryKey: backupsKey,
    queryFn: () => window.api.backups.getState()
  })

  const [restoring, setRestoring] = useState<BackupEntry | undefined>()

  // Both actions return the refreshed state from main, so cache it directly
  // rather than round-tripping another getState.
  const applyState = (next: BackupsState): void => {
    queryClient.setQueryData(backupsKey, next)
  }

  const chooseFolder = useMutation({
    mutationFn: () => window.api.backups.chooseDirectory(),
    onSuccess: applyState,
    onError: () => toast.error(t.toast.chooseError)
  })

  const backupNow = useMutation({
    mutationFn: () => window.api.backups.createNow(),
    onSuccess: (next) => {
      applyState(next)
      toast.success(t.toast.created)
    },
    onError: () => toast.error(t.toast.createError)
  })

  const backups = state?.backups ?? []

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium tracking-wide uppercase">{t.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
      </div>

      {isLoading ? (
        <Card className="p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-64" />
        </Card>
      ) : (
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{t.folderLabel}</span>
              <span className="truncate text-sm text-muted-foreground">
                {state?.backupDir ?? t.noFolder}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => chooseFolder.mutate()}
              disabled={chooseFolder.isPending}
            >
              <FolderIcon />
              {state?.backupDir ? t.changeFolder : t.chooseFolder}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">
              {state?.lastBackupAt
                ? t.lastBackup(formatDateTime(Date.parse(state.lastBackupAt)))
                : t.neverBackedUp}
            </span>
            <Button
              size="sm"
              onClick={() => backupNow.mutate()}
              disabled={!state?.backupDir || backupNow.isPending}
            >
              <SaveIcon />
              {t.backupNow}
            </Button>
          </div>
        </Card>
      )}

      {state?.backupDir &&
        (backups.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <DatabaseBackupIcon />
              </EmptyMedia>
              <EmptyTitle>{t.empty}</EmptyTitle>
              <EmptyDescription>{t.emptyHint}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-end justify-between gap-3">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t.listTitle}
              </span>
              <span className="text-sm text-muted-foreground">{t.count(backups.length)}</span>
            </div>
            <Card className="gap-0 p-0">
              <ul className="divide-y divide-border">
                {backups.map((backup) => (
                  <li
                    key={backup.path}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{formatDateTime(backup.createdAt)}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatBytes(backup.size)}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setRestoring(backup)}>
                      <RotateCcwIcon />
                      {t.restore}
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ))}

      <RestoreBackupDialog
        open={restoring !== undefined}
        onOpenChange={(open) => !open && setRestoring(undefined)}
        backup={restoring}
      />
    </section>
  )
}
