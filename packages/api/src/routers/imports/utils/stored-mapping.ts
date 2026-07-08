import { importMappings } from "@repo/db";
import { eq } from "drizzle-orm";

import type { Reader } from "./reader";
import type { Mapping } from "../validators";

/** The account's stored column mapping, or `null` before its first import. */
export function storedMapping(db: Reader, accountId: number): Mapping | null {
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
