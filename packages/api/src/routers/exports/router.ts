import { accounts, categories, categoryGroups, transactions } from "@repo/db";
import type {
  Account,
  Category,
  CategoryGroup,
  Db,
  Transaction,
} from "@repo/db";
import { asc } from "drizzle-orm";

import { base } from "../../context.js";

/**
 * The file an export procedure hands back: a suggested name and the full
 * content as a string. The renderer forwards both, verbatim, to the main
 * process, which shows the native save dialog and writes to disk — the only
 * layer allowed to touch the filesystem (see the V1 PRD, #1, and issue #10).
 * Must stay structurally identical to `ExportFileToSave` in the desktop app's
 * shared/ipc.ts, which redeclares it to stay free of workspace imports.
 */
export interface ExportFile {
  fileName: string;
  content: string;
}

/**
 * The user's whole history — the four tables issue #10 names, read in one shot
 * so the export is a coherent snapshot, each ordered by id so output is
 * stable. Transfers stay identifiable in the flat transaction list through
 * their shared `transferId`. Import mappings are deliberately left out: they
 * are per-account import tooling, not history the user needs to take along.
 */
function readSnapshot(db: Db): {
  accounts: Account[];
  categoryGroups: CategoryGroup[];
  categories: Category[];
  transactions: Transaction[];
} {
  return {
    accounts: db.select().from(accounts).orderBy(asc(accounts.id)).all(),
    categoryGroups: db
      .select()
      .from(categoryGroups)
      .orderBy(asc(categoryGroups.id))
      .all(),
    categories: db.select().from(categories).orderBy(asc(categories.id)).all(),
    transactions: db
      .select()
      .from(transactions)
      .orderBy(asc(transactions.id))
      .all(),
  };
}

/** `fela-export-2026-07-08.json` — dated so successive exports never collide. */
function exportFileName(extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `fela-export-${stamp}.${extension}`;
}

/**
 * One CSV cell (RFC 4180): null → empty, dates → ISO 8601, and any value
 * containing the separator, a quote or a newline is quoted with inner quotes
 * doubled, so free text like payees and notes can never break the row grid.
 */
function csvCell(
  value: string | number | boolean | Date | null | undefined
): string {
  if (value == null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * A titled CSV section: `# name`, the header row, then one row per record with
 * `columns` picked in header order. Sections keep the export a single file
 * while every table stays separately parseable.
 */
function csvSection<
  T extends Record<string, string | number | boolean | Date | null>,
>(name: string, columns: (keyof T & string)[], rows: T[]): string {
  const lines = [
    `# ${name}`,
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => csvCell(row[column])).join(",")
    ),
  ];
  return lines.join("\n");
}

/**
 * Export procedures — the full database as a downloadable file, so the user
 * always stays owner of their history and can leave the app (see the V1 PRD,
 * #1, and issue #10). Procedures return content only; writing to disk is the
 * main process's job.
 */
export const exportsRouter = base.router({
  /**
   * The whole database as one JSON document: accounts, category groups,
   * categories and transactions exactly as stored (amounts in signed cents,
   * dates as ISO 8601 strings, transfer legs linked by `transferId`).
   */
  json: base.handler(async ({ context }): Promise<ExportFile> => {
    const snapshot = readSnapshot(context.db);
    return {
      fileName: exportFileName("json"),
      // JSON.stringify serialises the Date columns to ISO 8601 strings.
      content: JSON.stringify({ exportedAt: new Date(), ...snapshot }, null, 2),
    };
  }),

  /**
   * The same snapshot as one CSV file: a titled section per table (accounts,
   * category groups, categories, transactions), blank-line separated. Values
   * stay as stored — amounts in signed cents, dates ISO 8601 — and transfer
   * legs carry their shared `transferId` column.
   */
  csv: base.handler(async ({ context }): Promise<ExportFile> => {
    const snapshot = readSnapshot(context.db);
    const sections = [
      csvSection(
        "accounts",
        [
          "id",
          "name",
          "type",
          "currency",
          "initialBalance",
          "archived",
          "createdAt",
        ],
        snapshot.accounts
      ),
      csvSection(
        "categoryGroups",
        ["id", "name", "sortOrder", "createdAt"],
        snapshot.categoryGroups
      ),
      csvSection(
        "categories",
        ["id", "name", "kind", "groupId", "createdAt"],
        snapshot.categories
      ),
      csvSection(
        "transactions",
        [
          "id",
          "accountId",
          "categoryId",
          "amount",
          "date",
          "payee",
          "note",
          "transferId",
          "importFingerprint",
          "createdAt",
        ],
        snapshot.transactions
      ),
    ];
    return {
      fileName: exportFileName("csv"),
      content: sections.join("\n\n"),
    };
  }),
});
