import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";

/**
 * Rotating file backups of the local SQLite database.
 *
 * The database file is owned by the Electron main process; this module is the
 * pure, path-based core it drives — it never touches Electron, so it stays
 * testable against real temp files (see `backups.test.ts`, the reproducible
 * verification required by #5). Snapshots are taken with SQLite's online backup
 * API, which produces a single consistent `.db` file even while the app holds
 * the database open in WAL mode.
 */

/** How many rotating backups to keep by default; older ones are purged. */
export const DEFAULT_BACKUP_RETENTION = 10;

const FILE_PREFIX = "fela-backup-";
const FILE_EXT = ".db";

/** A backup file on disk, as surfaced to the settings screen. */
export interface BackupFile {
  /** Absolute path to the backup file. */
  path: string;
  /** File name only, e.g. `fela-backup-2026-01-01T08-00-00.000Z.db`. */
  name: string;
  /** When the snapshot was taken (decoded from the file name). */
  createdAt: Date;
  /** Size in bytes. */
  size: number;
}

export interface CreateBackupOptions {
  /** Keep only the newest N backups; older ones are purged. */
  retention?: number;
  /** Snapshot timestamp; injectable so callers (and tests) stay deterministic. */
  now?: Date;
}

export interface CreateBackupResult {
  /** The backup just written. */
  backup: BackupFile;
  /** Absolute paths of the backups purged by rotation. */
  purged: string[];
}

/** Timestamps go in file names, so swap the colons SQLite/Windows dislike. */
function encodeTimestamp(now: Date): string {
  return now.toISOString().replaceAll(":", "-");
}

/** Recover the snapshot time from a backup file name, or null if unparseable. */
function decodeTimestamp(name: string): Date | null {
  if (!name.startsWith(FILE_PREFIX) || !name.endsWith(FILE_EXT)) {
    return null;
  }
  const stamp = name.slice(FILE_PREFIX.length, -FILE_EXT.length);
  // `2026-01-01T08-00-00.000Z` — the date keeps its hyphens, only the time's
  // hyphens stand in for colons, so restore them on the time half alone.
  const [date, time] = stamp.split("T");
  if (!date || !time) {
    return null;
  }
  const parsed = new Date(`${date}T${time.replaceAll("-", ":")}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Every Fela backup in `backupDir`, newest first. Returns an empty list if the
 * directory does not exist; files that are not Fela backups are ignored.
 */
export function listBackups(backupDir: string): BackupFile[] {
  let entries: string[];
  try {
    entries = readdirSync(backupDir);
  } catch {
    return [];
  }

  return entries
    .map((name): BackupFile | null => {
      const createdAt = decodeTimestamp(name);
      if (!createdAt) {
        return null;
      }
      const path = join(backupDir, name);
      return { path, name, createdAt, size: statSync(path).size };
    })
    .filter((backup): backup is BackupFile => backup !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Snapshot the database at `dbPath` into `backupDir`, then purge every backup
 * beyond the `retention` newest. The directory is created if missing.
 *
 * Uses SQLite's online backup, so it is safe to call while the app has the
 * database open. Returns the new backup and the paths rotation removed.
 */
export async function createBackup(
  dbPath: string,
  backupDir: string,
  options: CreateBackupOptions = {}
): Promise<CreateBackupResult> {
  const retention = options.retention ?? DEFAULT_BACKUP_RETENTION;
  const now = options.now ?? new Date();

  mkdirSync(backupDir, { recursive: true });

  const name = `${FILE_PREFIX}${encodeTimestamp(now)}${FILE_EXT}`;
  const path = join(backupDir, name);

  // Read the live file through its own connection; SQLite's backup copies a
  // consistent snapshot without disturbing the app's connection.
  const source = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    await source.backup(path);
  } finally {
    source.close();
  }

  const purged: string[] = [];
  for (const stale of listBackups(backupDir).slice(retention)) {
    rmSync(stale.path, { force: true });
    purged.push(stale.path);
  }

  const backup: BackupFile = {
    path,
    name,
    createdAt: now,
    size: statSync(path).size,
  };
  return { backup, purged };
}

/**
 * Overwrite the database at `dbPath` with the backup at `backupPath`.
 *
 * The caller MUST close its database connection first — this replaces the file
 * on disk. Stale `-wal`/`-shm` sidecars from the old database are removed so the
 * restored file is the single source of truth; the next connection rebuilds
 * them.
 */
export function restoreBackup(backupPath: string, dbPath: string): void {
  copyFileSync(backupPath, dbPath);
  rmSync(`${dbPath}-wal`, { force: true });
  rmSync(`${dbPath}-shm`, { force: true });
}
