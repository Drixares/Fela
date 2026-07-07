import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * User settings that must survive a database restore — chiefly the backup
 * folder. They deliberately live in their own JSON file next to the database
 * (under the per-user data directory), NOT inside the database: restoring an old
 * backup must never rewind where future backups are written (see #5).
 */
export interface AppSettings {
  /** Folder rotating backups are written to, or `null` until the user picks one. */
  backupDir: string | null
  /** ISO timestamp of the last successful backup; drives the once-a-day throttle. */
  lastBackupAt: string | null
}

const DEFAULTS: AppSettings = { backupDir: null, lastBackupAt: null }

export interface SettingsStore {
  /** Current settings, falling back to defaults if the file is missing/corrupt. */
  get(): AppSettings
  /** Merge `patch` into the settings and persist; returns the new settings. */
  patch(patch: Partial<AppSettings>): AppSettings
}

/**
 * A tiny JSON-file-backed settings store. Reads are best-effort — a missing or
 * unreadable file yields defaults rather than throwing — so a corrupt settings
 * file can never block startup.
 */
export function createSettingsStore(filePath: string): SettingsStore {
  function get(): AppSettings {
    try {
      return { ...DEFAULTS, ...JSON.parse(readFileSync(filePath, 'utf8')) }
    } catch {
      return { ...DEFAULTS }
    }
  }

  function patch(changes: Partial<AppSettings>): AppSettings {
    const next = { ...get(), ...changes }
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`)
    return next
  }

  return { get, patch }
}
