import { ORPCError } from "@orpc/server";
import type { Db } from "@repo/db";

import { storedMapping } from "./stored-mapping";
import type { Mapping } from "../validators";

/**
 * The mapping this import runs with: the one sent (first import, or the user
 * re-mapped), else the one memorised for the account. With neither, the import
 * cannot be interpreted and is refused.
 */
export function resolveMapping(
  db: Db,
  accountId: number,
  provided: Mapping | undefined
): Mapping {
  const mapping = provided ?? storedMapping(db, accountId);
  if (!mapping) {
    // French, like the CsvImportError messages: shown verbatim to the user.
    throw new ORPCError("BAD_REQUEST", {
      message: `Aucun mapping de colonnes fourni ni mémorisé pour le compte ${accountId} — associez d'abord les colonnes`,
    });
  }
  return mapping;
}
