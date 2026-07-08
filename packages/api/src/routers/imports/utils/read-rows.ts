import { mapRows, parseCsv } from "./csv-import";
import type { ImportRow } from "./csv-import";
import { refusing } from "./refusing";
import type { Mapping } from "../validators";

/** Parse + map the file, surfacing refusals as BAD_REQUEST. */
export function readRows(content: string, mapping: Mapping): ImportRow[] {
  return refusing(() => mapRows(parseCsv(content), mapping));
}
