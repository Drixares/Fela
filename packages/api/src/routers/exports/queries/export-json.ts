import { base } from "src/context";

import type { ExportFile } from "../utils/export-file";
import { exportFileName } from "../utils/export-file";
import { readSnapshot } from "../utils/read-snapshot";

/**
 * The whole database as one JSON document: accounts, category groups,
 * categories and transactions exactly as stored (amounts in signed cents,
 * dates as ISO 8601 strings, transfer legs linked by `transferId`).
 */
export const exportJsonHandler = base.handler(
  async ({ context }): Promise<ExportFile> => {
    const snapshot = readSnapshot(context.db);
    return {
      fileName: exportFileName("json"),
      // JSON.stringify serialises the Date columns to ISO 8601 strings.
      content: JSON.stringify({ exportedAt: new Date(), ...snapshot }, null, 2),
    };
  }
);
