import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createBackup, listBackups, restoreBackup } from "./backups";
import { closeDb, createDb, migrateToLatest } from "./index";
import { accounts } from "./schema";
import type { Db } from "./index";

/**
 * Backups operate on real files (an online SQLite snapshot copied to disk), so
 * these tests run against a temporary directory with a real on-disk database —
 * not the in-memory context the oRPC seam uses. This is the reproducible
 * verification the backup/restore slice is required to carry (see #5).
 */
let workdir: string;
let dbPath: string;
let backupDir: string;

/** Open a migrated on-disk database and insert `name` as an account. */
function seedAccount(name: string): Db {
  const db = createDb(dbPath);
  migrateToLatest(db);
  db.insert(accounts).values({ name, type: "checking" }).run();
  return db;
}

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "fela-backup-test-"));
  dbPath = join(workdir, "app.db");
  backupDir = join(workdir, "backups");
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe("createBackup", () => {
  it("writes a snapshot of the live database into the backup directory", async () => {
    const db = seedAccount("Courant");

    const result = await createBackup(dbPath, backupDir);
    closeDb(db);

    // A single backup file now exists and carries the committed data.
    expect(listBackups(backupDir)).toHaveLength(1);
    expect(result.backup.path).toBe(listBackups(backupDir)[0]!.path);

    const restored = createDb(result.backup.path);
    const rows = restored.select().from(accounts).all();
    closeDb(restored);
    expect(rows.map((r) => r.name)).toEqual(["Courant"]);
  });

  it("creates the backup directory if it does not exist", async () => {
    const db = seedAccount("Courant");
    await createBackup(dbPath, backupDir);
    closeDb(db);
    expect(listBackups(backupDir)).toHaveLength(1);
  });

  it("keeps only the newest `retention` backups and purges the rest", async () => {
    const db = seedAccount("Courant");

    // Twelve backups at distinct, increasing timestamps.
    for (let i = 0; i < 12; i++) {
      await createBackup(dbPath, backupDir, {
        retention: 10,
        now: new Date(Date.UTC(2026, 0, 1, 0, 0, i)),
      });
    }
    closeDb(db);

    const remaining = listBackups(backupDir);
    expect(remaining).toHaveLength(10);
    // The two oldest (seconds 0 and 1) were purged; the newest is second 11.
    expect(remaining[0]!.name).toContain("00-00-11");
    expect(remaining.at(-1)!.name).toContain("00-00-02");
  });
});

describe("listBackups", () => {
  it("returns an empty list when the directory does not exist", () => {
    expect(listBackups(join(workdir, "nope"))).toEqual([]);
  });

  it("ignores files that are not Fela backups", async () => {
    const db = seedAccount("Courant");
    await createBackup(dbPath, backupDir);
    closeDb(db);
    writeFileSync(join(backupDir, "notes.txt"), "hello");
    expect(listBackups(backupDir)).toHaveLength(1);
  });

  it("orders backups newest first", async () => {
    const db = seedAccount("Courant");
    await createBackup(dbPath, backupDir, {
      now: new Date(Date.UTC(2026, 0, 1, 8, 0, 0)),
    });
    await createBackup(dbPath, backupDir, {
      now: new Date(Date.UTC(2026, 0, 2, 8, 0, 0)),
    });
    closeDb(db);

    const backups = listBackups(backupDir);
    expect(backups[0]!.createdAt.getTime()).toBeGreaterThan(
      backups[1]!.createdAt.getTime()
    );
  });
});

describe("restoreBackup", () => {
  it("brings the database back to the snapshotted state", async () => {
    // Snapshot the database with one account...
    let db = seedAccount("Courant");
    const { backup } = await createBackup(dbPath, backupDir);

    // ...then mutate it (a mistake to recover from) and close it.
    db.insert(accounts).values({ name: "Oups", type: "cash" }).run();
    db.delete(accounts).where(eq(accounts.name, "Courant")).run();
    closeDb(db);

    // Restoring over the (closed) live file rewinds to the snapshot.
    restoreBackup(backup.path, dbPath);

    db = createDb(dbPath);
    const rows = db.select().from(accounts).all();
    closeDb(db);
    expect(rows.map((r) => r.name)).toEqual(["Courant"]);
  });

  it("discards stale WAL/SHM sidecars so the restored file is authoritative", async () => {
    const db = seedAccount("Courant");
    const { backup } = await createBackup(dbPath, backupDir);
    closeDb(db);

    // Simulate leftover sidecar files from the previous database.
    writeFileSync(`${dbPath}-wal`, "stale");
    writeFileSync(`${dbPath}-shm`, "stale");

    restoreBackup(backup.path, dbPath);

    const names = readdirSync(workdir);
    expect(names).not.toContain("app.db-wal");
    expect(names).not.toContain("app.db-shm");
  });
});
