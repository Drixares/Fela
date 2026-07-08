import { parseOfx } from "./ofx-import";
import type { OfxRow } from "./ofx-import";
import { refusing } from "./refusing";

/** Parse the OFX file, surfacing refusals as BAD_REQUEST. */
export function readOfxRows(content: string): OfxRow[] {
  return refusing(() => parseOfx(content));
}
