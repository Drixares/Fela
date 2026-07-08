import { base } from "src/context";

import { parseCsv } from "../utils/csv-import";
import { refusing } from "../utils/refusing";
import { inspectSchema } from "../validators";

/** How many data rows `inspect` returns for the mapping screen's preview. */
const SAMPLE_ROWS = 5;

export const inspectBase = base.input(inspectSchema);

/**
 * Split a file into headers and a few sample rows — what the renderer needs
 * to let the user map columns on a first import. Pure computation; the
 * mapping itself is chosen client-side and sent to preview/commit.
 */
export const inspectHandler = inspectBase.handler(async ({ input }) => {
  const parsed = refusing(() => parseCsv(input.content));
  return {
    headers: parsed.headers,
    sampleRows: parsed.rows.slice(0, SAMPLE_ROWS),
  };
});
