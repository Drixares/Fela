/**
 * The IPC contract for backups — shared, verbatim, by the main process (which
 * registers the handlers), the preload bridge (which forwards to them), and the
 * renderer (which consumes `window.api.backups`). Kept free of any Electron or
 * Node import so all three build targets can pull it in.
 *
 * Backups are orchestrated entirely by the main process, which owns the SQLite
 * file (see the V1 PRD, #1). The renderer never touches the database file — it
 * only drives this thin, typed surface.
 */

/** A backup file on disk, as the settings screen lists it. */
export interface BackupEntry {
  /** Absolute path to the backup file (opaque to the renderer; used to restore). */
  path: string
  /** File name only. */
  name: string
  /** Snapshot time, epoch milliseconds. */
  createdAt: number
  /** Size in bytes. */
  size: number
}

/** Everything the settings screen needs to render the backups section. */
export interface BackupsState {
  /** Configured backup folder, or `null` until the user picks one. */
  backupDir: string | null
  /** When the last successful backup ran (ISO string), or `null`. */
  lastBackupAt: string | null
  /** Existing backups in `backupDir`, newest first (empty if none/unset). */
  backups: BackupEntry[]
}

/** The backups surface exposed on `window.api.backups` in the renderer. */
export interface BackupsApi {
  /** Current folder, last-backup time and the list of existing backups. */
  getState(): Promise<BackupsState>
  /** Prompt for a backup folder (native dialog); persists and returns the new state. */
  chooseDirectory(): Promise<BackupsState>
  /** Take a backup now; returns the refreshed state. Rejects if no folder is set. */
  createNow(): Promise<BackupsState>
  /**
   * Restore the database from `backupPath`, then relaunch the app. Resolves only
   * if the restore could not start (e.g. bad path); otherwise the app restarts.
   */
  restore(backupPath: string): Promise<void>
}

/**
 * A CSV file the user picked for import: its name (shown in the import
 * dialog) and its full decoded content. The import procedures take content as
 * a string — never a path — so reading the file is the main process's job and
 * ends here (see the V1 PRD, #1, and issue #8).
 */
export interface ChosenCsvFile {
  name: string
  content: string
}

/** The imports surface exposed on `window.api.imports` in the renderer. */
export interface ImportsApi {
  /** Prompt for a CSV file (native dialog); `null` if the user cancels. */
  chooseCsvFile(): Promise<ChosenCsvFile | null>
}

/** The full preload API surface bridged to the renderer. */
export interface FelaApi {
  backups: BackupsApi
  imports: ImportsApi
}

/** IPC channel names, shared between the main handlers and the preload bridge. */
export const BACKUP_CHANNELS = {
  getState: 'backups:getState',
  chooseDirectory: 'backups:chooseDirectory',
  createNow: 'backups:createNow',
  restore: 'backups:restore'
} as const

export const IMPORT_CHANNELS = {
  chooseCsvFile: 'imports:chooseCsvFile'
} as const
