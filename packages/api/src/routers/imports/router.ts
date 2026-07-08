import { ORPCError } from "@orpc/server";
import { accounts, importMappings, transactions } from "@repo/db";
import type { Db } from "@repo/db";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { base } from "../../context.js";
import {
  CsvImportError,
  flagDuplicates,
  mapRows,
  parseCsv,
} from "./csv-import.js";
import type { FlaggedRow, ImportRow } from "./csv-import.js";
import { OfxImportError, flagOfxDuplicates, parseOfx } from "./ofx-import.js";
import type { FlaggedOfxRow, OfxRow } from "./ofx-import.js";

const idSchema = z.int().positive();

/** Column indexes (0-based) for the three values an import needs. */
const mappingSchema = z.object({
  dateColumn: z.int().nonnegative(),
  amountColumn: z.int().nonnegative(),
  labelColumn: z.int().nonnegative(),
});

/** Throw NOT_FOUND unless an account with `id` exists — guards every import. */
function assertAccountExists(db: Db, id: number): void {
  const account = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.id, id))
    .get();
  if (!account) {
    throw new ORPCError("NOT_FOUND", { message: `No account with id ${id}` });
  }
}

/**
 * Run an import computation, converting any import refusal (CSV or OFX) into a
 * BAD_REQUEST whose message tells the user which line or value was refused.
 */
function refusing<T>(compute: () => T): T {
  try {
    return compute();
  } catch (error) {
    if (error instanceof CsvImportError || error instanceof OfxImportError) {
      throw new ORPCError("BAD_REQUEST", { message: error.message });
    }
    throw error;
  }
}

/** Parse + map the file, surfacing refusals as BAD_REQUEST. */
function readRows(
  content: string,
  mapping: z.infer<typeof mappingSchema>
): ImportRow[] {
  return refusing(() => mapRows(parseCsv(content), mapping));
}

/**
 * Anything that can read transaction rows — the top-level {@link Db} or the
 * handle inside `db.transaction(...)`, so commit can re-check duplicates
 * within its own transaction.
 */
type Reader = Pick<Db, "select">;

/** The account's stored column mapping, or `null` before its first import. */
function storedMapping(
  db: Reader,
  accountId: number
): z.infer<typeof mappingSchema> | null {
  const mapping = db
    .select({
      dateColumn: importMappings.dateColumn,
      amountColumn: importMappings.amountColumn,
      labelColumn: importMappings.labelColumn,
    })
    .from(importMappings)
    .where(eq(importMappings.accountId, accountId))
    .get();
  return mapping ?? null;
}

/**
 * The mapping this import runs with: the one sent (first import, or the user
 * re-mapped), else the one memorised for the account. With neither, the import
 * cannot be interpreted and is refused.
 */
function resolveMapping(
  db: Db,
  accountId: number,
  provided: z.infer<typeof mappingSchema> | undefined
): z.infer<typeof mappingSchema> {
  const mapping = provided ?? storedMapping(db, accountId);
  if (!mapping) {
    // French, like the CsvImportError messages: shown verbatim to the user.
    throw new ORPCError("BAD_REQUEST", {
      message: `Aucun mapping de colonnes fourni ni mémorisé pour le compte ${accountId} — associez d'abord les colonnes`,
    });
  }
  return mapping;
}

/**
 * Tag each parsed row as new or probable duplicate against the fingerprints
 * already stored on the account (multiset semantics — see `flagDuplicates`).
 */
function flagAgainstStored(
  db: Reader,
  accountId: number,
  rows: ImportRow[]
): FlaggedRow[] {
  const stored = db
    .select({ fingerprint: transactions.importFingerprint, n: count() })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        isNotNull(transactions.importFingerprint)
      )
    )
    .groupBy(transactions.importFingerprint)
    .all();

  const counts = new Map(stored.map((row) => [row.fingerprint!, row.n]));
  return flagDuplicates(accountId, rows, counts);
}

/** Parse the OFX file, surfacing refusals as BAD_REQUEST. */
function readOfxRows(content: string): OfxRow[] {
  return refusing(() => parseOfx(content));
}

/**
 * Tag each OFX row as new or duplicate against the FITIDs already stored on the
 * account (set semantics — see `flagOfxDuplicates`).
 */
function flagOfxAgainstStored(
  db: Reader,
  accountId: number,
  rows: OfxRow[]
): FlaggedOfxRow[] {
  const stored = db
    .select({ externalId: transactions.importExternalId })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        isNotNull(transactions.importExternalId)
      )
    )
    .all();

  const storedIds = new Set(stored.map((row) => row.externalId!));
  return flagOfxDuplicates(rows, storedIds);
}

/** How many data rows `inspect` returns for the mapping screen's preview. */
const SAMPLE_ROWS = 5;

/**
 * CSV import procedures (see the V1 PRD, #1, and issue #8). The main process
 * reads the chosen file and passes its **content as a string** — never a path.
 * `preview` is pure computation; only `commit` writes, in one SQL transaction.
 */
export const importsRouter = base.router({
  /**
   * Split a file into headers and a few sample rows — what the renderer needs
   * to let the user map columns on a first import. Pure computation; the
   * mapping itself is chosen client-side and sent to preview/commit.
   */
  inspect: base
    .input(z.object({ content: z.string() }))
    .handler(async ({ input }) => {
      const parsed = refusing(() => parseCsv(input.content));
      return {
        headers: parsed.headers,
        sampleRows: parsed.rows.slice(0, SAMPLE_ROWS),
      };
    }),

  /**
   * Dry-run an import: parse the file, apply the mapping and report what a
   * commit would do — without writing anything. An invalid file or mapping is
   * refused here with the same error a commit would give.
   */
  preview: base
    .input(
      z.object({
        accountId: idSchema,
        content: z.string(),
        // Omitted after the first import — the memorised mapping takes over.
        mapping: mappingSchema.optional(),
      })
    )
    .handler(async ({ context, input }) => {
      assertAccountExists(context.db, input.accountId);
      const mapping = resolveMapping(
        context.db,
        input.accountId,
        input.mapping
      );
      const rows = readRows(input.content, mapping);

      const flagged = flagAgainstStored(context.db, input.accountId, rows);
      const duplicateCount = flagged.filter((row) => row.duplicate).length;
      return {
        // Explicit payload (not the internal FlaggedRow) — the fingerprint is
        // an implementation detail, and the renderer only renders these.
        rows: flagged.map((row) => ({
          line: row.line,
          date: row.date,
          amount: row.amount,
          label: row.label,
          duplicate: row.duplicate,
        })),
        newCount: flagged.length - duplicateCount,
        duplicateCount,
      };
    }),

  /**
   * Apply an import: insert the file's rows on the account and remember the
   * column mapping for the next import — all inside one SQL transaction, so a
   * failed import leaves the ledger and the mapping exactly as they were.
   */
  commit: base
    .input(
      z.object({
        accountId: idSchema,
        content: z.string(),
        // Omitted after the first import — the memorised mapping takes over.
        mapping: mappingSchema.optional(),
      })
    )
    .handler(async ({ context, input }) => {
      assertAccountExists(context.db, input.accountId);
      const mapping = resolveMapping(
        context.db,
        input.accountId,
        input.mapping
      );
      const rows = readRows(input.content, mapping);

      return context.db.transaction((tx) => {
        // Flag inside the transaction, against the same snapshot the inserts
        // will see, so a commit racing another write can't double-import.
        const flagged = flagAgainstStored(tx, input.accountId, rows);
        const fresh = flagged.filter((row) => !row.duplicate);

        if (fresh.length > 0) {
          tx.insert(transactions)
            .values(
              fresh.map((row) => ({
                accountId: input.accountId,
                amount: row.amount,
                date: row.date,
                payee: row.label,
                importFingerprint: row.fingerprint,
              }))
            )
            .run();
        }

        tx.insert(importMappings)
          .values({ accountId: input.accountId, ...mapping })
          .onConflictDoUpdate({
            target: importMappings.accountId,
            set: { ...mapping, updatedAt: new Date() },
          })
          .run();

        return {
          imported: fresh.length,
          duplicates: flagged.length - fresh.length,
        };
      });
    }),

  /**
   * The column mapping remembered from the account's previous imports, or
   * `null` before the first one — the renderer shows the mapping step only
   * when this is null.
   */
  getMapping: base
    .input(z.object({ accountId: idSchema }))
    .handler(async ({ context, input }) => {
      return storedMapping(context.db, input.accountId);
    }),

  /**
   * Dry-run an OFX import (see issue #11): parse the file and report what a
   * commit would do — without writing anything. No column mapping: OFX carries
   * its own tags. Duplicates are flagged by FITID against the account's stored
   * rows. An unreadable file is refused here with the same error a commit gives.
   */
  previewOfx: base
    .input(z.object({ accountId: idSchema, content: z.string() }))
    .handler(async ({ context, input }) => {
      assertAccountExists(context.db, input.accountId);
      const rows = readOfxRows(input.content);

      const flagged = flagOfxAgainstStored(context.db, input.accountId, rows);
      const duplicateCount = flagged.filter((row) => row.duplicate).length;
      return {
        // Explicit payload (not the internal FlaggedOfxRow) — the FITID is an
        // implementation detail, and the renderer only renders these fields.
        rows: flagged.map((row) => ({
          date: row.date,
          amount: row.amount,
          label: row.label,
          duplicate: row.duplicate,
        })),
        newCount: flagged.length - duplicateCount,
        duplicateCount,
      };
    }),

  /**
   * Apply an OFX import (see issue #11): insert the file's new rows on the
   * account inside one SQL transaction, so a failed import leaves the ledger
   * exactly as it was. Rows whose FITID is already stored are skipped, so
   * re-importing an overlapping period never creates doubles.
   */
  commitOfx: base
    .input(z.object({ accountId: idSchema, content: z.string() }))
    .handler(async ({ context, input }) => {
      assertAccountExists(context.db, input.accountId);
      const rows = readOfxRows(input.content);

      return context.db.transaction((tx) => {
        // Flag inside the transaction, against the same snapshot the inserts
        // will see, so a commit racing another write can't double-import.
        const flagged = flagOfxAgainstStored(tx, input.accountId, rows);
        const fresh = flagged.filter((row) => !row.duplicate);

        if (fresh.length > 0) {
          tx.insert(transactions)
            .values(
              fresh.map((row) => ({
                accountId: input.accountId,
                amount: row.amount,
                date: row.date,
                payee: row.label || null,
                importExternalId: row.fitid,
              }))
            )
            .run();
        }

        return {
          imported: fresh.length,
          duplicates: flagged.length - fresh.length,
        };
      });
    }),
});
