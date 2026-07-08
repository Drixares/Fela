import { call } from "@orpc/server";

import { base } from "../../context.js";
import { exportCsvHandler } from "./queries/export-csv.js";
import { exportJsonHandler } from "./queries/export-json.js";

export type { ExportFile } from "./utils/export-file.js";

/**
 * Export procedures — the full database as a downloadable file, so the user
 * always stays owner of their history and can leave the app (see the V1 PRD,
 * #1, and issue #10). Procedures return content only; writing to disk is the
 * main process's job.
 */
export const exportsRouter = base.router({
  json: base.handler(async ({ context }) => {
    return await call(exportJsonHandler, undefined, { context });
  }),

  csv: base.handler(async ({ context }) => {
    return await call(exportCsvHandler, undefined, { context });
  }),
});
