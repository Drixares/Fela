import { closeDb, createBackup, listBackups, restoreBackup } from '@repo/db'
import type { BackupFile, Db } from '@repo/db'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'

import { BACKUP_CHANNELS, type BackupEntry, type BackupsState } from '../shared/ipc'
import type { SettingsStore } from './settings'

const DAY_MS = 24 * 60 * 60 * 1000

// Main-process dialog copy. The "no hard-coded strings" rule targets renderer
// components; native dialogs live outside that surface.
const CHOOSE_DIRECTORY_TITLE = 'Choisir le dossier de sauvegarde'

interface SetupBackupsOptions {
  /** Path of the live database file the app has open. */
  dbPath: string
  /** The live database handle — closed before a restore overwrites the file. */
  db: Db
  settings: SettingsStore
}

/** Shape a backup file for the renderer (Date → epoch ms for a plain payload). */
function toEntry(backup: BackupFile): BackupEntry {
  return {
    path: backup.path,
    name: backup.name,
    createdAt: backup.createdAt.getTime(),
    size: backup.size
  }
}

/** Assemble the state the settings screen renders. */
function readState(settings: SettingsStore): BackupsState {
  const { backupDir, lastBackupAt } = settings.get()
  return {
    backupDir,
    lastBackupAt,
    backups: backupDir ? listBackups(backupDir).map(toEntry) : []
  }
}

/**
 * Take a snapshot into `backupDir` and record when it happened. `retention`
 * caps how many backups survive rotation; omit it to use the default.
 */
async function runBackup(
  dbPath: string,
  backupDir: string,
  settings: SettingsStore,
  retention?: number
): Promise<void> {
  await createBackup(dbPath, backupDir, retention === undefined ? undefined : { retention })
  settings.patch({ lastBackupAt: new Date().toISOString() })
}

/**
 * On launch, take a backup if the folder is configured and the newest backup is
 * more than a day old. Failures are swallowed (logged) — a backup hiccup must
 * never block the app from opening.
 */
async function maybeAutoBackup(dbPath: string, settings: SettingsStore): Promise<void> {
  const { backupDir, lastBackupAt } = settings.get()
  if (!backupDir) return

  const last = lastBackupAt ? Date.parse(lastBackupAt) : 0
  if (Number.isFinite(last) && Date.now() - last < DAY_MS) return

  try {
    await runBackup(dbPath, backupDir, settings)
  } catch (error) {
    console.error('Automatic backup failed', error)
  }
}

/**
 * Wire the backups IPC surface and kick off the throttled launch backup. The
 * main process is the sole owner of the database file, so every file operation
 * — snapshot, rotation, restore — happens here (see the V1 PRD, #1).
 */
export function setupBackups({ dbPath, db, settings }: SetupBackupsOptions): void {
  void maybeAutoBackup(dbPath, settings)

  ipcMain.handle(BACKUP_CHANNELS.getState, () => readState(settings))

  ipcMain.handle(BACKUP_CHANNELS.chooseDirectory, async () => {
    const win = BrowserWindow.getFocusedWindow()
    const options: Electron.OpenDialogOptions = {
      title: CHOOSE_DIRECTORY_TITLE,
      properties: ['openDirectory', 'createDirectory']
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)

    const chosen = result.canceled ? undefined : result.filePaths[0]
    if (chosen) {
      settings.patch({ backupDir: chosen })
    }
    return readState(settings)
  })

  ipcMain.handle(BACKUP_CHANNELS.createNow, async () => {
    const { backupDir } = settings.get()
    if (!backupDir) {
      throw new Error('No backup directory configured')
    }
    await runBackup(dbPath, backupDir, settings)
    return readState(settings)
  })

  ipcMain.handle(BACKUP_CHANNELS.restore, async (_event, backupPath: string) => {
    // Only restore a backup we actually listed from the configured folder — never
    // an arbitrary path the renderer hands us — so a bad path can't overwrite the
    // live database with garbage.
    const { backupDir } = settings.get()
    if (!backupDir || !listBackups(backupDir).some((backup) => backup.path === backupPath)) {
      throw new Error(`Unknown backup: ${backupPath}`)
    }

    // Snapshot the current state first, so restoring is itself recoverable — a
    // mis-clicked restore can be undone by restoring this safety copy. Keep every
    // existing backup (retention = current count + 1) so this snapshot can never
    // rotate away the very backup we are about to restore. Best effort: a failure
    // here must not block the recovery the user asked for.
    try {
      await runBackup(dbPath, backupDir, settings, listBackups(backupDir).length + 1)
    } catch (error) {
      console.error('Pre-restore safety backup failed', error)
    }

    // Release the file, overwrite it with the snapshot, then relaunch so every
    // part of the app reopens against the restored database.
    closeDb(db)
    restoreBackup(backupPath, dbPath)
    app.relaunch()
    app.exit(0)
  })
}
