import { ORPCError } from "@orpc/server";

import { CsvImportError } from "./csv-import";
import { OfxImportError } from "./ofx-import";

/**
 * Run an import computation, converting any import refusal (CSV or OFX) into a
 * BAD_REQUEST whose message tells the user which line or value was refused.
 */
export function refusing<T>(compute: () => T): T {
  try {
    return compute();
  } catch (error) {
    if (error instanceof CsvImportError || error instanceof OfxImportError) {
      throw new ORPCError("BAD_REQUEST", { message: error.message });
    }
    throw error;
  }
}
