import { base } from "src/context";

import { csvSection } from "../utils/csv";
import type { ExportFile } from "../utils/export-file";
import { exportFileName } from "../utils/export-file";
import { readSnapshot } from "../utils/read-snapshot";

/**
 * The same snapshot as one CSV file: a titled section per table (accounts,
 * category groups, categories, transactions), blank-line separated. Values
 * stay as stored — amounts in signed cents, dates ISO 8601 — and transfer
 * legs carry their shared `transferId` column.
 */
export const exportCsvHandler = base.handler(
  async ({ context }): Promise<ExportFile> => {
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
          "importExternalId",
          "createdAt",
        ],
        snapshot.transactions
      ),
    ];
    return {
      fileName: exportFileName("csv"),
      content: sections.join("\n\n"),
    };
  }
);
