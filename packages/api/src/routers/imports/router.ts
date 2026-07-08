import { ORPCError } from "@orpc/server";
import { accounts, categories, importMappings, transactions } from "@repo/db";
import type { Db } from "@repo/db";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { base } from "../../context.js";
import { categorize, loadApplicableRules } from "../rules/matching.js";
import {
  CsvImportError,
  flagWithMatches,
  mapRows,
  parseCsv,
} from "./csv-import.js";
import type { ExistingMatch, ImportRow, MatchedRow } from "./csv-import.js";
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
 * The user's per-row corrections to the categories the rules announced in the
 * preview (issue #13), keyed by the same row identity the preview reported
 * (CSV line / OFX row index). `categoryId: null` un-classifies a row a rule
 * matched; an id classifies the row under that category instead.
 */
const categoryOverrideSchema = z.object({ categoryId: idSchema.nullable() });

/**
 * Throw NOT_FOUND unless every category named by the overrides exists — a
 * dangling correction would classify rows under a category no report can show.
 * Returns the corrections as a lookup by row key.
 */
function resolveOverrides<K>(
  db: Db,
  overrides: { key: K; categoryId: number | null }[]
): Map<K, number | null> {
  for (const override of overrides) {
    if (override.categoryId === null) continue;
    const category = db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, override.categoryId))
      .get();
    if (!category) {
      throw new ORPCError("NOT_FOUND", {
        message: `No category with id ${override.categoryId}`,
      });
    }
  }
  return new Map(overrides.map((o) => [o.key, o.categoryId]));
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
 * Tag each parsed row as new or probable duplicate against the account's stored
 * rows, pairing every probable duplicate with the stored transaction it
 * collided with (multiset semantics — see `flagWithMatches`). Preview shows the
 * match so the user can judge each collision; commit only reads the verdict.
 */
function matchAgainstStored(
  db: Reader,
  accountId: number,
  rows: ImportRow[]
): MatchedRow[] {
  const stored = db
    .select({
      fingerprint: transactions.importFingerprint,
      date: transactions.date,
      amount: transactions.amount,
      label: transactions.payee,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        isNotNull(transactions.importFingerprint)
      )
    )
    .all();

  const byFingerprint = new Map<string, ExistingMatch[]>();
  for (const row of stored) {
    const match: ExistingMatch = {
      date: row.date,
      amount: row.amount,
      label: row.label ?? "",
    };
    const queue = byFingerprint.get(row.fingerprint!);
    if (queue) queue.push(match);
    else byFingerprint.set(row.fingerprint!, [match]);
  }
  return flagWithMatches(accountId, rows, byFingerprint);
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

      const flagged = matchAgainstStored(context.db, input.accountId, rows);
      const duplicateCount = flagged.filter((row) => row.duplicate).length;
      // Announce the category each rule will assign (issue #13) — id for the
      // commit, name for the screen — so the user corrects the classification
      // before validating rather than after.
      const rules = loadApplicableRules(context.db);
      return {
        // Explicit payload (not the internal MatchedRow) — the fingerprint is
        // an implementation detail, and the renderer only renders these. Each
        // probable duplicate carries the stored transaction it collided with,
        // so the user can unfold it, judge it, and force a false positive in.
        rows: flagged.map((row) => {
          const match = categorize(row.label, rules);
          return {
            line: row.line,
            date: row.date,
            amount: row.amount,
            label: row.label,
            duplicate: row.duplicate,
            existing: row.existing,
            category: match
              ? { id: match.categoryId, name: match.categoryName }
              : null,
          };
        }),
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
        // CSV lines (1-based, as `preview` reports them) the user judged false
        // positives and chose to import despite the probable-duplicate flag.
        forceLines: z.array(z.int().positive()).optional(),
        // Corrections to the categories the preview announced, keyed by the
        // same 1-based CSV lines. Untouched lines keep the rules' verdict.
        categoryOverrides: categoryOverrideSchema
          .extend({ line: z.int().positive() })
          .array()
          .optional(),
      })
    )
    .handler(async ({ context, input }) => {
      assertAccountExists(context.db, input.accountId);
      const overrides = resolveOverrides(
        context.db,
        (input.categoryOverrides ?? []).map((o) => ({
          key: o.line,
          categoryId: o.categoryId,
        }))
      );
      const mapping = resolveMapping(
        context.db,
        input.accountId,
        input.mapping
      );
      const rows = readRows(input.content, mapping);
      const forced = new Set(input.forceLines ?? []);

      return context.db.transaction((tx) => {
        // Flag inside the transaction, against the same snapshot the inserts
        // will see, so a commit racing another write can't double-import.
        const flagged = matchAgainstStored(tx, input.accountId, rows);
        // A row imports when it's new, or when the user forced it despite the
        // duplicate flag. A forced row enters with its fingerprint, so a later
        // re-import sees it stored and skips it — it lands exactly once.
        const toImport = flagged.filter(
          (row) => !row.duplicate || forced.has(row.line)
        );

        if (toImport.length > 0) {
          // Classify each incoming row by the user's rules (issue #13), so
          // matching rows land already categorised — same rules, same order,
          // same result as the preview announced. A correction made on the
          // preview screen takes precedence over the rules' verdict.
          const rules = loadApplicableRules(tx);
          tx.insert(transactions)
            .values(
              toImport.map((row) => ({
                accountId: input.accountId,
                amount: row.amount,
                date: row.date,
                payee: row.label,
                categoryId: overrides.has(row.line)
                  ? (overrides.get(row.line) ?? null)
                  : (categorize(row.label, rules)?.categoryId ?? null),
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
          imported: toImport.length,
          duplicates: flagged.length - toImport.length,
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
      // Announce the category each rule will assign (issue #13) — id for the
      // commit, name for the screen — so the user corrects the classification
      // before validating rather than after.
      const rules = loadApplicableRules(context.db);
      return {
        // Explicit payload (not the internal FlaggedOfxRow) — the FITID is an
        // implementation detail, and the renderer only renders these fields.
        rows: flagged.map((row) => {
          const match = categorize(row.label, rules);
          return {
            date: row.date,
            amount: row.amount,
            label: row.label,
            duplicate: row.duplicate,
            category: match
              ? { id: match.categoryId, name: match.categoryName }
              : null,
          };
        }),
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
    .input(
      z.object({
        accountId: idSchema,
        content: z.string(),
        // Corrections to the categories the preview announced, keyed by the
        // row's 0-based position in the statement — the order `previewOfx`
        // reported. Untouched rows keep the rules' verdict.
        categoryOverrides: categoryOverrideSchema
          .extend({ index: z.int().nonnegative() })
          .array()
          .optional(),
      })
    )
    .handler(async ({ context, input }) => {
      assertAccountExists(context.db, input.accountId);
      const overrides = resolveOverrides(
        context.db,
        (input.categoryOverrides ?? []).map((o) => ({
          key: o.index,
          categoryId: o.categoryId,
        }))
      );
      const rows = readOfxRows(input.content);

      return context.db.transaction((tx) => {
        // Flag inside the transaction, against the same snapshot the inserts
        // will see, so a commit racing another write can't double-import.
        const flagged = flagOfxAgainstStored(tx, input.accountId, rows);
        // Keep each row's position in the full statement before dropping the
        // duplicates: overrides are keyed by that position (the order the
        // preview reported), so they still land right when duplicates are
        // interleaved.
        const fresh = flagged
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => !row.duplicate);

        if (fresh.length > 0) {
          // Classify each incoming row by the user's rules (issue #13); a
          // correction made on the preview screen takes precedence.
          const rules = loadApplicableRules(tx);
          tx.insert(transactions)
            .values(
              fresh.map(({ row, index }) => ({
                accountId: input.accountId,
                amount: row.amount,
                date: row.date,
                payee: row.label || null,
                categoryId: overrides.has(index)
                  ? (overrides.get(index) ?? null)
                  : (categorize(row.label, rules)?.categoryId ?? null),
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
